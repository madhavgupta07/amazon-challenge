import { buildDailyPlan, createDailyPlanInput } from "@lifepilot/shared";
import type { ToolContext, ToolHandlerResult } from "./types.js";

export async function createDailyPlan(args: unknown, ctx: ToolContext): Promise<ToolHandlerResult> {
  const input = createDailyPlanInput.parse(args ?? {});
  const result = await buildDailyPlan(ctx.userId, input);
  return {
    summary: result.persisted
      ? `${result.summary} Saved to your plans.`
      : `${result.summary} Not saved yet — awaiting approval.`,
    data: result,
  };
}

export const planToolHandlers = {
  create_daily_plan: createDailyPlan,
};
