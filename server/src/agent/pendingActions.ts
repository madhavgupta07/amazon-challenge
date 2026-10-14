import { randomUUID } from "node:crypto";
import type { PendingAction } from "@lifepilot/shared";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { createDynamoPendingActionStore } from "./dynamoPendingActionStore.js";
import {
  PENDING_ACTION_TTL_MS,
  type CreatePendingActionInput,
  type PendingActionStore,
  type StoredAction,
} from "./pendingActionStore.js";

export { PENDING_ACTION_TTL_MS };
export type { CreatePendingActionInput, PendingActionStore, StoredAction };

/**
 * In-memory confirmation store for destructive actions.
 *
 * Single-instance only: state is lost on restart and not shared across
 * instances. Use the DynamoDB-backed store (PENDING_ACTION_STORE=dynamodb) for
 * multi-instance deployments.
 */
export class MemoryPendingActionStore implements PendingActionStore {
  private readonly store = new Map<string, StoredAction>();

  private sweep(): void {
    const cutoff = Date.now() - PENDING_ACTION_TTL_MS;
    for (const [id, action] of this.store) {
      if (action.createdAt < cutoff) this.store.delete(id);
    }
  }

  async create(input: CreatePendingActionInput): Promise<PendingAction> {
    this.sweep();
    const id = randomUUID();
    const createdAt = Date.now();
    this.store.set(id, { id, createdAt, ...input });
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
    const action = this.store.get(id);
    if (!action) return null;
    if (action.userId !== userId) return null;
    this.store.delete(id);
    if (Date.now() - action.createdAt > PENDING_ACTION_TTL_MS) return null;
    return action;
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

let activeStore: PendingActionStore | null = null;

function resolveStoreKind(): "memory" | "dynamodb" {
  const kind = env.aws.pendingActionStore;
  if (kind === "dynamodb") return "dynamodb";
  if (kind === "memory") return "memory";
  // auto: use DynamoDB when an AWS region or endpoint is configured.
  return env.aws.region || env.aws.dynamoEndpoint ? "dynamodb" : "memory";
}

export function getPendingActionStore(): PendingActionStore {
  if (activeStore) return activeStore;
  if (resolveStoreKind() === "dynamodb") {
    logger.info("pending_action_store.selected", {
      kind: "dynamodb",
      table: env.aws.pendingActionsTable,
      region: env.aws.region || "(sdk default)",
    });
    activeStore = createDynamoPendingActionStore({
      table: env.aws.pendingActionsTable,
      region: env.aws.region || undefined,
      endpoint: env.aws.dynamoEndpoint || undefined,
    });
  } else {
    logger.info("pending_action_store.selected", { kind: "memory" });
    activeStore = new MemoryPendingActionStore();
  }
  return activeStore;
}

/** Test seam: replace (or reset) the active store. */
export function setPendingActionStore(store: PendingActionStore | null): void {
  activeStore = store;
}

export async function createPendingAction(input: CreatePendingActionInput): Promise<PendingAction> {
  return getPendingActionStore().create(input);
}

/** Atomically consume a pending action. Returns null if missing, expired or owned by another user. */
export async function takePendingAction(userId: string, id: string): Promise<StoredAction | null> {
  return getPendingActionStore().take(userId, id);
}

export async function pendingActionCount(): Promise<number> {
  return getPendingActionStore().count();
}

export async function clearPendingActions(): Promise<void> {
  return getPendingActionStore().clear();
}
