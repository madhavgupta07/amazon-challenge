# Friction Log & Feature Requests — LifePilot

Optional submissions worth up to a **10% judging bonus**. Each friction log entry lists: the task
attempted, steps taken, expected vs. actual result, severity, workaround, and an actionable
suggestion.

---

## Friction Log Entries

### FL-1 — MCP stateless transport cannot be reused across requests

- **Task attempted:** Serve a stateless MCP endpoint (no session ids) over Streamable HTTP for the
  Alexa+ track.
- **Steps taken:** Created one `McpServer` + one `StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })` at startup and reused it for every `POST /mcp`.
- **Expected vs. actual:** Expected the transport to handle concurrent, session-less requests (the
  documented stateless mode). Actual: the second and subsequent requests failed / behaved
  incorrectly, because the server+transport pair holds per-connection state internally.
- **Severity:** High (blocked the track's required surface until understood).
- **Workaround:** Construct a **fresh** `McpServer` + `StreamableHTTPServerTransport` per incoming
  request using a factory, so each request is fully isolated.
- **Suggestion:** Ship a first-class `createStatelessHandler()` helper (or a doc warning + example)
  for the stateless/behind-a-load-balancer case — it is common and currently under-documented.

### FL-2 — Zod `.effects` schemas advertise as empty tool inputs

- **Task attempted:** Advertise `update_task` / `update_note` tool inputs that allow partial updates.
- **Steps taken:** Defined inputs with `z.object({...}).partial()` plus a `.refine(...)` cross-field
  rule, then registered them with `server.tool(...)`.
- **Expected vs. actual:** Expected the advertised JSON Schema to list the optional properties.
  Actual: because `.refine()` wraps the object in a `ZodEffects`, the SDK advertised an input with
  **no properties**, so MCP clients saw an argument-less tool.
- **Severity:** Medium (tools still ran, but their advertised contract was wrong / undiscoverable).
- **Workaround:** Added an `advertisedSchema()` helper that unwraps `ZodEffects._def.schema` before
  passing the schema to the SDK for advertisement.
- **Suggestion:** Unwrap `ZodEffects` (and other wrapper types) when converting Zod → JSON Schema,
  or document the limitation and the unwrap pattern.

### FL-3 — Config read at import time makes testing order-sensitive

- **Task attempted:** Point the app at an in-memory database and test token during test runs.
- **Steps taken:** Set `MONGODB_URI` / `MCP_INTERNAL_TOKEN` inside the test body.
- **Expected vs. actual:** Expected env to be read when the connection is opened. Actual: the config
  module reads `process.env` at import time, so values set after import were ignored.
- **Severity:** Low (test-only), but confusing.
- **Workaround:** Set all env vars in `tests/setup.ts`, which Vitest loads **before** any app module
  is imported.
- **Suggestion:** Document "env is read at import — set it in a setup file first," or provide a
  `loadEnv()` that can be re-invoked.

### FL-4 — `mongodb-memory-server` is single-process only

- **Task attempted:** Use an in-memory Mongo for the multi-process dev topology (API server separate
  from MCP server).
- **Steps taken:** Set `MONGODB_URI=memory` and started both processes.
- **Expected vs. actual:** Expected both processes to share one in-memory database. Actual: each
  process starts its own private instance, so they can't see each other's data.
- **Severity:** Low.
- **Workaround:** Documented that `MONGODB_URI=memory` is for local/single-process and tests only;
  multi-process dev needs a real MongoDB.
- **Suggestion:** Clearer docs on the single-process constraint (it is documented, but easy to miss
  when designing a two-process architecture).

### FL-5 — Model narrated tool names instead of emitting tool calls

- **Task attempted:** Get the text-completion model to return a machine-parseable tool call.
- **Steps taken:** Prompted the model to reply with **only** strict JSON, then parsed
  `response` into `{type, tool, arguments}`.
- **Expected vs. actual:** Expected `{"type":"tool","tool":"get_today_tasks","arguments":{}}`.
  Actual: the model returned prose such as `"Search get_today_tasks"` as a final answer, after a
  long delay.
- **Severity:** High for the live path.
- **Workaround:** (1) Hardened the protocol prompt — output must start with `{` and end with `}`,
  with worked examples and explicit "never describe a tool, call it" rules. (2) Wrote a tolerant
  parser accepting OpenAI-style shapes, nested `{function:{...}}`, stringified arguments, and
  alternate keys. (3) Shipped a deterministic local provider that issues the same real tool calls.
- **Suggestion:** Providers targeting agentic use should expose **native tool/function calling**
  and a strict JSON mode; text-completion-only endpoints make tool use brittle by design.

### FL-6 — Free-tier inference endpoint flapped and rate-limited

- **Task attempted:** Run the full agent end to end against the live provider.
- **Steps taken:** Called the provider's `POST {prompt, model, temperature}` endpoint.
- **Expected vs. actual:** Expected a model response within a few seconds. Actual: saw HTTP **502**,
  **503** (cold/sleeping spaces), a **404** (misrouted model), multi-minute latencies, and **429**
  rate limits.
- **Severity:** High (made the "live" demo unreliable).
- **Workaround:** Request timeout (45 s), one retry, a fallback endpoint, automatic fail-over to the
  local provider, and **honest UI labelling** of which provider answered.
- **Suggestion:** Free tiers should document cold-start behavior/model routing, return consistent
  model identifiers, and expose a health/readiness signal so clients can fail fast.

---

## Feature Requests

| # | Feature | Why it matters | Priority |
| --- | --- | --- | --- |
| FR-1 | Reusable / built-in stateless MCP HTTP transport helper | The stateless, load-balanced case is common yet requires a per-request factory workaround today | **Critical** |
| FR-2 | Zod→JSON-Schema conversion that unwraps `ZodEffects` | Partial/refined tool inputs currently advertise zero properties, breaking discoverability | **Important** |
| FR-3 | Native tool/function calling in the inference API | Removes the need to reinvent a JSON-ReAct contract and a tolerant parser | **Critical** |
| FR-4 | A provider readiness/health endpoint + stable model ids | Lets clients fail fast instead of waiting 45–90 s on a sleeping space | **Important** |
| FR-5 | Cross-process in-memory Mongo sharing for local dev | Would let a multi-process architecture use an ephemeral DB without a real server | **Nice-to-have** |
| FR-6 | First-class "stateless mode" examples in the MCP docs | Cuts the biggest onboarding cliff we hit | **Important** |
