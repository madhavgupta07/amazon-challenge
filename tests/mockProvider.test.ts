import { describe, expect, it } from "vitest";
import { MockProvider } from "../server/src/ai/mockProvider.js";

const provider = new MockProvider();

function contextMessage(userMessage: string): { role: string; content: string } {
  return {
    role: "user",
    content: [
      "CURRENT DATE/TIME: 2026-10-12T09:00:00.000Z (time zone: UTC).",
      "USER: Demo.",
      "LIVE SNAPSHOT (from the database): 3 pending, 0 in progress, 1 completed, 2 due today, 1 overdue.",
      "Use tools to retrieve the actual details before acting.",
      "",
      `User message: ${userMessage}`,
    ].join("\n"),
  };
}

async function decide(userMessage: string, extra: { role: string; content: string }[] = []) {
  const raw = await provider.complete([
    { role: "system", content: "system" },
    contextMessage(userMessage),
    ...extra,
  ] as never);
  return JSON.parse(raw) as { tool?: string; arguments?: Record<string, unknown>; final_answer?: string };
}

function observation(tool: string, data: unknown): { role: string; content: string } {
  return { role: "user", content: `OBSERVATION ${tool}: ${JSON.stringify({ summary: "", data })}` };
}

function assistant(tool: string, args: Record<string, unknown>): { role: string; content: string } {
  return { role: "assistant", content: JSON.stringify({ thought: "", tool, arguments: args }) };
}

describe("MockProvider intent routing", () => {
  it("treats 'write a note on javascript and save it' as a note, not a plan save", async () => {
    const decision = await decide("write a note on javascript and save it");
    expect(decision.tool).toBe("create_note");
    expect(String(decision.arguments?.title)).toMatch(/javascript/i);
    expect(String(decision.arguments?.content)).toMatch(/hoisting|closures|event loop/i);
  });

  it("extracts the topic for 'write a note on javascript'", async () => {
    const decision = await decide("write a note on javascript");
    expect(decision.tool).toBe("create_note");
    expect(decision.arguments?.title).toBe("Javascript");
  });

  it("routes 'add some javascript content in it' to editing a note", async () => {
    const decision = await decide("add some javascript content in it to help me prepare");
    expect(decision.tool).toBe("list_notes");
  });

  it("does not loop when saving a plan", async () => {
    const calls = [assistant("create_daily_plan", { save: true })];
    const obs = [observation("create_daily_plan", { persisted: true, date: "2026-10-12", blocks: [], totalFocusMinutes: 120 })];
    const decision = await decide("save it", [...calls, ...obs]);
    expect(decision.tool).toBeUndefined();
    expect(decision.final_answer).toMatch(/saved/i);
  });

  it("still treats a bare 'save it' as a plan save", async () => {
    const decision = await decide("save it");
    expect(decision.tool).toBe("create_daily_plan");
    expect(decision.arguments?.save).toBe(true);
  });
});
