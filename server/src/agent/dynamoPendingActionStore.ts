import { randomUUID } from "node:crypto";
import type { PendingAction } from "@lifepilot/shared";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  PENDING_ACTION_TTL_MS,
  type CreatePendingActionInput,
  type PendingActionStore,
  type StoredAction,
} from "./pendingActionStore.js";

/**
 * Minimal shape of the DynamoDB DocumentClient we depend on. Narrowing it lets
 * tests inject a fake without pulling in the whole SDK.
 */
export interface DynamoDocClient {
  send(command: unknown): Promise<Record<string, unknown>>;
}

export interface DynamoStoreOptions {
  table: string;
  client: DynamoDocClient;
}

/**
 * Amazon DynamoDB-backed confirmation store (always-free tier friendly: a tiny
 * item per pending action, with DynamoDB native TTL cleaning up expired rows).
 *
 * Item shape:
 *   { id (PK), userId, name, title, arguments (JSON string), summary,
 *     createdAt (ms), expiresAt (epoch seconds — the table's TTL attribute) }
 *
 * `take` uses DeleteCommand with ReturnValues=ALL_OLD so consuming a
 * confirmation is a single atomic operation (no double-execute race).
 */
export class DynamoPendingActionStore implements PendingActionStore {
  private readonly table: string;
  private readonly client: DynamoDocClient;

  constructor({ table, client }: DynamoStoreOptions) {
    this.table = table;
    this.client = client;
  }

  async create(input: CreatePendingActionInput): Promise<PendingAction> {
    const id = randomUUID();
    const createdAt = Date.now();
    await this.client.send(
      new PutCommand({
        TableName: this.table,
        Item: {
          id,
          userId: input.userId,
          name: input.name,
          title: input.title,
          arguments: JSON.stringify(input.arguments),
          summary: input.summary,
          createdAt,
          // DynamoDB TTL expects epoch SECONDS.
          expiresAt: Math.floor((createdAt + PENDING_ACTION_TTL_MS) / 1000),
        },
      }),
    );
    return {
      id,
      name: input.name,
      title: input.title,
      arguments: input.arguments,
      summary: input.summary,
      createdAt,
    };
  }

  async take(userId: string, id: string): Promise<StoredAction | null> {
    const result = await this.client.send(
      new DeleteCommand({
        TableName: this.table,
        Key: { id },
        ReturnValues: "ALL_OLD",
      }),
    );
    const item = result.Attributes as Record<string, unknown> | undefined;
    if (!item) return null;
    if (item.userId !== userId) return null;
    const createdAt = Number(item.createdAt);
    if (Date.now() - createdAt > PENDING_ACTION_TTL_MS) return null;
    return {
      id: String(item.id),
      userId: String(item.userId),
      name: String(item.name),
      title: String(item.title),
      arguments: parseArguments(item.arguments),
      summary: String(item.summary ?? ""),
      createdAt,
    };
  }

  async count(): Promise<number> {
    const result = await this.client.send(
      new ScanCommand({ TableName: this.table, Select: "COUNT" }),
    );
    return Number(result.Count ?? 0);
  }

  async clear(): Promise<void> {
    const result = await this.client.send(
      new ScanCommand({ TableName: this.table, ProjectionExpression: "id" }),
    );
    const items = (result.Items ?? []) as { id: string }[];
    await Promise.all(
      items.map((item) =>
        this.client.send(new DeleteCommand({ TableName: this.table, Key: { id: item.id } })),
      ),
    );
  }
}

function parseArguments(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return (value as Record<string, unknown>) ?? {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export interface DynamoConnectionOptions {
  table: string;
  region?: string;
  /** Override endpoint, e.g. http://localhost:8000 for DynamoDB Local. */
  endpoint?: string;
}

export function createDynamoPendingActionStore(
  options: DynamoConnectionOptions,
): DynamoPendingActionStore {
  const base = new DynamoDBClient({
    ...(options.region ? { region: options.region } : {}),
    ...(options.endpoint ? { endpoint: options.endpoint } : {}),
  });
  const documentClient = DynamoDBDocumentClient.from(base, {
    marshallOptions: { removeUndefinedValues: true },
  });
  return new DynamoPendingActionStore({
    table: options.table,
    client: documentClient as unknown as DynamoDocClient,
  });
}
