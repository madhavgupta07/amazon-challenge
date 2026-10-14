# Architecture

## Components

| Package | Role |
| --- | --- |
| `client/` | React 18 + Vite + Tailwind single-page app. Calls the REST API under `/api` (dev-proxied to `:4000`). Shows every provider label and tool call to stay transparent. |
| `server/` | Express REST API: auth (bcrypt + JWT), validation (zod), rate limiting, conversations, and the **agent orchestrator** that drives the LLM. |
| `mcp-server/` | The tool layer exposed as an MCP server over Streamable HTTP. The REST API never touches the database for agent actions — it calls these tools. |
| `shared/` | The single source of truth for schemas, models, and data operations used by both the REST API and the MCP server. |

## Data flow for a chat turn

1. `POST /api/chat { message, conversationId? }` arrives with a JWT.
2. The orchestrator loads the user (for time zone), the conversation, and a **live snapshot** of
   task counts from the DB.
3. It builds a prompt:
   - system prompt: JSON protocol (`{"tool": "...", "arguments": {...}}` or `{"final_answer": "..."}`)
     plus every registered tool's zod-derived JSON Schema;
   - context: current date/time, time zone, user name, live counts;
   - the user message.
4. Each iteration the provider replies with one JSON object. The orchestrator:
   - **validates** arguments with the tool's zod schema (errors feed back as an observation);
   - **executes** the tool over the MCP session (identity injected server-side);
   - appends the result as an `OBSERVATION <tool>: {…}` turn and loops (bounded to
     `AI_MAX_TOOL_ITERATIONS`);
   - **does not execute** destructive tools — it stores a `PendingAction` and asks the user
     to confirm.
5. The loop stops on `final_answer` and the reply (plus every tool call trace) is persisted to
   the conversation and returned to the client.

## Identity model

- Users authenticate to the API with JWT.
- The MCP server is an *internal* service: requests must carry `x-internal-token` (matches
  `MCP_INTERNAL_TOKEN`) and `x-user-id`.
- `x-user-id` becomes `authInfo.extra.userId` inside each tool handler (`ToolContext`).
- Tool input schemas contain **no** user id field — identity is never client-controlled.

## Stateless MCP transport

The MCP SDK's `StreamableHTTPServerTransport` running without a `sessionIdGenerator` is
stateless and **must not be reused**. `mcp-server/src/app.ts` therefore creates a fresh
`McpServer` + transport for every request and closes both when the response ends. This keeps
the tool layer horizontal-scale friendly at the cost of session-less handshakes.

The server follows the Streamable HTTP transport spec (2025-11-25) security guidance: it
validates the `Origin` header and returns `403` for disallowed browser origins (DNS-rebinding
defence; non-browser clients send no `Origin` and are unaffected), relies on the SDK to
enforce `MCP-Protocol-Version` (unsupported versions → `400`), binds to `127.0.0.1`, and
requires the `x-internal-token` shared secret on every request. Tools wrapped in a top-level
`.refine()` (e.g. `update_task`, `update_note`) are unwrapped when advertising their JSON
schema, because the SDK's zod→JSON conversion cannot introspect `ZodEffects` — the handler
still validates with the full, refined schema.

## Confirmation flow for destructive actions

```
user: delete the task "Temporary chore"
   │
   ▼ orchestrator sees tool=delete_task (destructive flag)
   ├─ stores PendingAction in the confirmation store (10-min TTL)
   ├─ replies: "…that can't be undone. Confirm and I'll go ahead."
   │
   ▼ client renders a Confirm / Cancel card from pendingAction
   ├─ POST /api/chat/confirm { actionId, decision }
   │   ├─ confirm → re-runs the tool with confirm:true (only path that deletes)
   │   └─ cancel  → nothing changes
   └─ trace recorded as confirmed/cancelled in the conversation
```

The confirmation store has two backends behind one interface (`PendingActionStore`):
an in-memory map (default, single-instance) and **Amazon DynamoDB** (`PENDING_ACTION_STORE=auto`
with `AWS_REGION` set) which persists confirmations across restarts and instances, uses a native
TTL, and consumes confirmations with a single atomic `DeleteCommand`. See
`server/src/agent/pendingActionStore.ts`.

## AI engine

`selectProvider()` (`server/src/ai/index.ts`) returns the app's single local provider behind the
pluggable `AIProvider` interface:

- **Local demo** (`MockProvider`) — deterministic heuristics that emit the exact same JSON tool
  protocol a model would, so the full retrieve → decide → act loop runs offline against real data.
- **Pluggable** — add an `AIProvider` implementation and return it from `selectProvider()`; the
  agent loop and MCP tool layer are unchanged. Because text-completion engines have no native
  tool-calling, tool use goes through the JSON-ReAct protocol, not native function calling.

## DRY data layer

`shared/src/services/*` (`tasks.ts`, `notes.ts`, `summary.ts`, `plan.ts`) hold every Mongoose
operation. `mcp-server/src/tools/*` are thin wrappers that call them; REST controllers call
them directly for manual CRUD. This is what keeps "the agent's view" and "the app's view" of
the same data identical.

## Testing

- `tests/mcp.integration.test.ts` — the MCP server over real Streamable HTTP clients:
  auth rejection, tool discovery, cross-user isolation, validation errors, delete-without-confirm.
- `tests/server.integration.test.ts` — boots MongoMemoryServer + the MCP app on a random port,
  then drives the real REST → agent → MCP → Mongo path with the deterministic local provider:
  plan proposal, natural-language task creation, destructive-confirmation round trip, summaries,
  and plan generation/saving.
- `tests/setup.ts` pins `JWT_SECRET` and `MCP_INTERNAL_TOKEN`.

## Key decisions

- **No native tool-calling in the engine** → JSON-ReAct orchestration with strict zod validation per step.
- **Headers carry identity** so tools never accept a `userId` argument.
- **Stateless MCP transport per request** — required by the SDK, keeps it deployable.
- **In-memory pending-actions store** — fast and correct for single instance; documented swap path.
- **Shared services** so REST and MCP can't drift.