import { randomUUID } from "node:crypto";
import type { PendingAction } from "@lifepilot/shared";

export const PENDING_ACTION_TTL_MS = 10 * 60 * 1000;

interface StoredAction extends PendingAction {
  userId: string;
}

/**
 * In-memory confirmation store for destructive actions.
 *
 * Single-instance only: on a multi-instance deployment this should move to a
 * shared store (e.g. Redis) so a confirmation can be answered by any instance.
 */
const store = new Map<string, StoredAction>();

function sweep(): void {
  const cutoff = Date.now() - PENDING_ACTION_TTL_MS;
  for (const [id, action] of store) {
    if (action.createdAt < cutoff) store.delete(id);
  }
}

export function createPendingAction(input: {
  userId: string;
  name: string;
  title: string;
  arguments: Record<string, unknown>;
  summary: string;
}): PendingAction {
  sweep();
  const id = randomUUID();
  const createdAt = Date.now();
  store.set(id, { id, createdAt, ...input });
  return {
    id,
    name: input.name,
    title: input.title,
    arguments: input.arguments,
    summary: input.summary,
    createdAt,
  };
}

/** Atomically consume a pending action. Returns null if missing, expired or owned by another user. */
export function takePendingAction(userId: string, id: string): StoredAction | null {
  const action = store.get(id);
  if (!action) return null;
  if (action.userId !== userId) return null;
  store.delete(id);
  if (Date.now() - action.createdAt > PENDING_ACTION_TTL_MS) return null;
  return action;
}

export function pendingActionCount(): number {
  return store.size;
}

export function clearPendingActions(): void {
  store.clear();
}
