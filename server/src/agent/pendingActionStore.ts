import type { PendingAction } from "@lifepilot/shared";

/** How long a confirmation stays valid before it is rejected/expired. */
export const PENDING_ACTION_TTL_MS = 10 * 60 * 1000;

/** A pending action as persisted, including the owner. */
export interface StoredAction extends PendingAction {
  userId: string;
}

export interface CreatePendingActionInput {
  userId: string;
  name: string;
  title: string;
  arguments: Record<string, unknown>;
  summary: string;
}

/**
 * Persistence contract for the destructive-action confirmation gate.
 *
 * Implementations: an in-memory map (default/single-instance) and an
 * Amazon DynamoDB table (multi-instance, survives restarts, native TTL).
 */
export interface PendingActionStore {
  create(input: CreatePendingActionInput): Promise<PendingAction>;
  /** Atomically consume. Returns null if missing, expired, or owned by another user. */
  take(userId: string, id: string): Promise<StoredAction | null>;
  count(): Promise<number>;
  clear(): Promise<void>;
}
