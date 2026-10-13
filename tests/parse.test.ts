import { describe, expect, it } from "vitest";
import { parseModelOutput } from "../server/src/ai/parse.js";

describe("parseModelOutput", () => {
  it("parses the canonical tool protocol", () => {
    const out = parseModelOutput('{"thought":"look up tasks","tool":"get_today_tasks","arguments":{}}');
    expect(out).toEqual({ type: "tool", tool: "get_today_tasks", arguments: {}, thought: "look up tasks" });
  });

  it("parses the canonical final answer", () => {
    const out = parseModelOutput('{"final_answer":"You have 2 tasks due today."}');
    expect(out).toEqual({ type: "final", text: "You have 2 tasks due today." });
  });

  it("strips code fences and surrounding prose", () => {
    const out = parseModelOutput(
      'Sure!\n```json\n{"tool":"list_tasks","arguments":{"status":"pending"}}\n```\n',
    );
    expect(out).toMatchObject({ type: "tool", tool: "list_tasks" });
    if (out.type === "tool") expect(out.arguments).toEqual({ status: "pending" });
  });

  it("accepts OpenAI-style {name, parameters}", () => {
    const out = parseModelOutput('{"name":"create_task","parameters":{"title":"Ship it"}}');
    expect(out).toMatchObject({ type: "tool", tool: "create_task" });
    if (out.type === "tool") expect(out.arguments).toEqual({ title: "Ship it" });
  });

  it("accepts nested {function:{name,arguments}} with stringified arguments", () => {
    const out = parseModelOutput(
      '{"function":{"name":"update_task","arguments":"{\\"priority\\":\\"high\\"}"}}',
    );
    expect(out).toMatchObject({ type: "tool", tool: "update_task" });
    if (out.type === "tool") expect(out.arguments).toEqual({ priority: "high" });
  });

  it("accepts alternate final-answer keys", () => {
    expect(parseModelOutput('{"answer":"done"}')).toEqual({ type: "final", text: "done" });
  });

  it("returns unknown for non-JSON text", () => {
    const out = parseModelOutput("I am not sure what you mean.");
    expect(out.type).toBe("unknown");
  });

  it("returns unknown for JSON without a tool or answer", () => {
    expect(parseModelOutput('{"thought":"hmm"}').type).toBe("unknown");
  });
});
