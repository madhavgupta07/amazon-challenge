export interface ToolHandlerResult {
  summary: string;
  data: unknown;
}

export interface ToolContext {
  userId: string;
}

export type ToolHandler = (args: unknown, ctx: ToolContext) => Promise<ToolHandlerResult>;
