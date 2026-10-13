import { noteToolHandlers } from "./notes.js";
import { planToolHandlers } from "./plan.js";
import { summaryToolHandlers } from "./summary.js";
import { taskToolHandlers } from "./tasks.js";

export const toolHandlers: Record<string, import("./types.js").ToolHandler> = {
  ...taskToolHandlers,
  ...noteToolHandlers,
  ...summaryToolHandlers,
  ...planToolHandlers,
};

export type { ToolContext, ToolHandler, ToolHandlerResult } from "./types.js";
