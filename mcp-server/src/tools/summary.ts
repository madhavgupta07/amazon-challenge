import { computeProductivitySummary, getProductivitySummaryInput } from "@lifepilot/shared";
import type { ToolContext, ToolHandlerResult } from "./types.js";

export async function getProductivitySummary(
  args: unknown,
  ctx: ToolContext,
): Promise<ToolHandlerResult> {
  const input = getProductivitySummaryInput.parse(args ?? {});
  const data = await computeProductivitySummary(ctx.userId, input);
  return {
    summary: `${data.periodLabel}: ${data.tasksCompletedInPeriod} completed, ${data.openTasksNow} open, ${data.overdueTasksNow} overdue (${data.completionRatePct}% of created tasks completed).`,
    data,
  };
}

export const summaryToolHandlers = {
  get_productivity_summary: getProductivitySummary,
};
