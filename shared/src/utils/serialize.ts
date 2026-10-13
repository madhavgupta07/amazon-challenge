import { PRIORITY_WEIGHT } from "../constants.js";
import type { NoteRecord, PlanBlock, TaskRecord } from "../types.js";

export function serializeTask(task: TaskRecord | Record<string, any>) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const isOpen = task.status !== "completed" && task.status !== "cancelled";
  return {
    id: String(task._id),
    title: task.title,
    description: task.description ?? "",
    category: task.category,
    priority: task.priority,
    status: task.status,
    dueDate: due ? due.toISOString() : null,
    completedAt: task.completedAt ? new Date(task.completedAt).toISOString() : null,
    tags: task.tags ?? [],
    source: task.source,
    overdue: Boolean(due && isOpen && due.getTime() < Date.now()),
    createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : null,
    updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : null,
  };
}

export function serializeNote(note: NoteRecord | Record<string, any>) {
  return {
    id: String(note._id),
    title: note.title,
    content: note.content,
    tags: note.tags ?? [],
    pinned: Boolean(note.pinned),
    createdAt: note.createdAt ? new Date(note.createdAt).toISOString() : null,
    updatedAt: note.updatedAt ? new Date(note.updatedAt).toISOString() : null,
  };
}

export function serializePlanBlock(block: PlanBlock | Record<string, any>) {
  return {
    startTime: block.startTime,
    endTime: block.endTime,
    title: block.title,
    taskId: block.taskId ? String(block.taskId) : null,
    category: block.category,
    priority: block.priority ?? null,
    rationale: block.rationale ?? "",
    status: block.status ?? "planned",
  };
}

export function serializePlan(plan: Record<string, any>) {
  return {
    id: String(plan._id),
    date: plan.date,
    summary: plan.summary ?? "",
    blocks: (plan.blocks ?? []).map(serializePlanBlock),
    generatedBy: plan.generatedBy,
    saved: Boolean(plan.saved),
    createdAt: plan.createdAt ? new Date(plan.createdAt).toISOString() : null,
    updatedAt: plan.updatedAt ? new Date(plan.updatedAt).toISOString() : null,
  };
}

export function priorityWeight(priority: string | null | undefined): number {
  if (!priority) return 0;
  return PRIORITY_WEIGHT[priority as keyof typeof PRIORITY_WEIGHT] ?? 0;
}

/** Sort open tasks: due-date first (soonest/overdue), then priority, then newest. */
export function sortTasks<T extends { dueDate?: Date | null; priority?: string; createdAt?: Date }>(
  tasks: T[],
): T[] {
  return [...tasks].sort((a, b) => {
    const aDue = a.dueDate ? a.dueDate.getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.dueDate ? b.dueDate.getTime() : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    const rank = priorityWeight(b.priority) - priorityWeight(a.priority);
    if (rank !== 0) return rank;
    const aCreated = a.createdAt ? a.createdAt.getTime() : 0;
    const bCreated = b.createdAt ? b.createdAt.getTime() : 0;
    return bCreated - aCreated;
  });
}
