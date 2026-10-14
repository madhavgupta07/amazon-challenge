import { DeleteCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DynamoPendingActionStore,
  type DynamoDocClient,
} from "../server/src/agent/dynamoPendingActionStore.js";
import {
  MemoryPendingActionStore,
  PENDING_ACTION_TTL_MS,
  createPendingAction,
  pendingActionCount,
  setPendingActionStore,
  takePendingAction,
} from "../server/src/agent/pendingActions.js";

const input = {
  userId: "user-1",
  name: "delete_task",
  title: "Delete task",
  arguments: { taskId: "abc", confirm: false },
  summary: "Delete task permanently removes data and cannot be undone.",
};

/** In-memory stand-in for DynamoDBDocumentClient that records the commands sent. */
class FakeDocClient implements DynamoDocClient {
  readonly calls: unknown[] = [];
  private readonly items = new Map<string, Record<string, unknown>>();

  async send(command: unknown): Promise<Record<string, unknown>> {
    this.calls.push(command);
    if (command instanceof PutCommand) {
      const item = command.input.Item as Record<string, unknown>;
      this.items.set(String(item.id), item);
      return {};
    }
    if (command instanceof DeleteCommand) {
      const key = String((command.input.Key as { id: string }).id);
      const existing = this.items.get(key);
      this.items.delete(key);
      return command.input.ReturnValues === "ALL_OLD" ? { Attributes: existing } : {};
    }
    if (command instanceof ScanCommand) {
      const items = [...this.items.values()];
      return command.input.Select === "COUNT" ? { Count: items.length } : { Items: items };
    }
    return {};
  }
}

describe("MemoryPendingActionStore", () => {
  it("creates and consumes an action exactly once", async () => {
    const store = new MemoryPendingActionStore();
    const action = await store.create(input);
    expect(action.id).toBeTruthy();
    expect(action.arguments).toEqual(input.arguments);

    const taken = await store.take("user-1", action.id);
    expect(taken?.name).toBe("delete_task");
    expect(taken?.userId).toBe("user-1");

    // Second consume returns null (single-use).
    expect(await store.take("user-1", action.id)).toBeNull();
  });

  it("refuses to hand an action to a different user", async () => {
    const store = new MemoryPendingActionStore();
    const action = await store.create(input);
    expect(await store.take("someone-else", action.id)).toBeNull();
    // Still available to the owner.
    expect(await store.take("user-1", action.id)).not.toBeNull();
  });

  it("expires actions after the TTL", async () => {
    vi.useFakeTimers();
    try {
      const store = new MemoryPendingActionStore();
      const action = await store.create(input);
      vi.advanceTimersByTime(PENDING_ACTION_TTL_MS + 1000);
      expect(await store.take("user-1", action.id)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("DynamoPendingActionStore", () => {
  let client: FakeDocClient;
  let store: DynamoPendingActionStore;

  beforeEach(() => {
    client = new FakeDocClient();
    store = new DynamoPendingActionStore({ table: "lifepilot_pending_actions", client });
  });

  it("writes an item with a DynamoDB TTL in epoch seconds", async () => {
    const before = Math.floor(Date.now() / 1000);
    const action = await store.create(input);

    const put = client.calls[0];
    expect(put).toBeInstanceOf(PutCommand);
    const item = (put as PutCommand).input.Item as Record<string, unknown>;
    expect(item.id).toBe(action.id);
    expect(item.userId).toBe("user-1");
    expect(item.name).toBe("delete_task");
    // Arguments are stored as a JSON string.
    expect(JSON.parse(String(item.arguments))).toEqual(input.arguments);
    // expiresAt is epoch seconds, ~TTL in the future.
    const expiresAt = Number(item.expiresAt);
    expect(expiresAt).toBeGreaterThanOrEqual(before + PENDING_ACTION_TTL_MS / 1000 - 1);
  });

  it("consumes atomically via DeleteCommand with ReturnValues=ALL_OLD", async () => {
    const action = await store.create(input);
    client.calls.length = 0;

    const taken = await store.take("user-1", action.id);
    expect(taken?.id).toBe(action.id);
    expect(taken?.arguments).toEqual(input.arguments);

    const del = client.calls[0];
    expect(del).toBeInstanceOf(DeleteCommand);
    expect((del as DeleteCommand).input.ReturnValues).toBe("ALL_OLD");

    // Already deleted -> next consume returns null.
    expect(await store.take("user-1", action.id)).toBeNull();
  });

  it("returns null when the item is missing or owned by another user", async () => {
    expect(await store.take("user-1", "does-not-exist")).toBeNull();

    const action = await store.create(input);
    expect(await store.take("someone-else", action.id)).toBeNull();
  });

  it("counts with a COUNT scan", async () => {
    await store.create(input);
    await store.create(input);
    const count = await store.count();
    expect(count).toBe(2);
    const scan = client.calls.at(-1);
    expect(scan).toBeInstanceOf(ScanCommand);
    expect((scan as ScanCommand).input.Select).toBe("COUNT");
  });
});

describe("pending action wrapper functions", () => {
  afterEach(() => setPendingActionStore(null));

  it("route to the injected store", async () => {
    setPendingActionStore(new MemoryPendingActionStore());
    const action = await createPendingAction(input);
    expect(await pendingActionCount()).toBe(1);
    const taken = await takePendingAction("user-1", action.id);
    expect(taken?.id).toBe(action.id);
    expect(await pendingActionCount()).toBe(0);
  });
});
