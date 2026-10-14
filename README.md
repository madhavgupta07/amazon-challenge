# LifePilot

A personal AI productivity agent for the **Alexa+ Hackathon 2026**. LifePilot plans your day, manages tasks and notes, and summarises your progress — from natural language, backed by real tools and real data.

```
"Plan my day"                          → reads today's tasks, proposes a time-blocked plan
"Add a task to prepare for my interview tomorrow" → creates the task
"Summarise my progress this week"      → computes real completion statistics
"I completed the React interview prep" → finds and completes the task
```

## Architecture

Four npm workspaces behind one entry point:

```
┌──────────────┐   REST    ┌───────────────┐   MCP (Streamable HTTP)   ┌─────────────┐
│ React client │ ────────▶ │  API server   │ ────────────────────────▶ │  MCP server │
│  (Vite/TS)    │   (JWT)   │  Express/AI   │   x-internal-token        │    tools    │
└──────────────┘           │   orchestrator│   x-user-id header        └──────┬──────┘
                           └───────┬───────┘                                 │
                                   │ shared services (mongoose models)       │
                                   └─────────────────────────────────────────┘
```

- **client** — React 18 + Vite + Tailwind, type-safe API layer over `/api`.
- **server** — Express REST API, JWT auth, rate limiting. Its **agent orchestrator** runs a
  bounded JSON-ReAct loop: the model proposes a tool call or a final answer each turn.
- **mcp-server** — the tool layer as an MCP `tools/*` server over Streamable HTTP
  (SDK `@modelcontextprotocol/sdk`), running the same shared services the REST API uses.
- **shared** — zod tool schemas, Mongoose models, time/date utilities, and the data
  services used by **both** the REST API and the MCP tools (no duplicated logic).

**AI engine** (`server/src/ai`) runs a single **local, deterministic provider** behind a pluggable
`AIProvider` interface:

- **Local demo** — a deterministic heuristic agent that makes the **same real MCP tool calls** and
  writes the same records a hosted model would. Fully offline, so demos and tests are instant and
  reproducible. Labeled `"Local demo"` in the UI so the user always knows.
- **Pluggable** — another engine can be dropped in by adding an `AIProvider` and returning it from
  `selectProvider()` (`server/src/ai/index.ts`); the agent loop and MCP layer are unchanged.

Every assistant reply is labelled with the provider that produced it, and every tool call it
made is shown in the chat UI (task created, task completed, plan built, …).

## Interactive explainer

`/explore` is a self-contained, animated walk-through of how LifePilot works — hero intro,
problem/solution, the 13 MCP tools, an interactive architecture diagram with animated data
packets, a step-by-step data-flow player, the tech-stack map, a code explorer, and a journey
recap. It is public (no login) and lives in `client/src/explore/`.

## Security highlights

- Identity flows as `x-user-id` **header** from the API server into the MCP server
  (`authInfo.extra.userId`) — users can never inject another user's id via tool arguments.
- The MCP endpoint requires a shared `MCP_INTERNAL_TOKEN` and binds to `127.0.0.1`.
- **Destructive tools** (`delete_task`, `delete_note`) never run directly from the agent: the
  orchestrator intercepts them, creates a short-lived `PendingAction`, and asks the user to
  confirm. Deletes only happen on explicit confirmation. Pending actions live in memory by
  default, or in **Amazon DynamoDB** (with native TTL) when AWS is configured — so a confirmation
  survives restarts and works across instances.

## Quick start

Requires Node 20+ and MongoDB (or use `MONGODB_URI=memory` for an ephemeral in-process DB).

```bash
npm install
cp .env.example .env            # then edit MONGODB_URI (and secrets if not local) 
npm run seed                    # creates demo@lifepilot.app / demo1234 + sample data
npm run dev                     # starts mcp-server (:4001), server (:4000), client (:5173)
```

Open http://localhost:5173, sign in with the demo account (or register), and try
"Plan my day".

> `MONGODB_URI=memory` is for local/single-process use and tests only — the two Node
> processes share the database via MongoDB, so multi-process dev needs a real instance.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Run mcp-server, API server and client concurrently with watch mode |
| `npm run seed` | Create the demo user, ~12 tasks, 4 notes, and today's saved plan |
| `npm run dynamo:setup -w server` | Create the DynamoDB confirmation table + TTL (AWS integration) |
| `npm test` | Integration tests (MCP over HTTP, and full REST → agent → MCP → Mongo) plus parser, mock-provider, and confirmation-store tests — 39 tests across 5 files |
| `npm run typecheck` | Type-check all four workspaces |
| `npm run build` | Production build of client + server type-checks |

## AWS integration (Amazon DynamoDB)

Destructive-action confirmations can be persisted in **Amazon DynamoDB** instead of process
memory, so approvals survive restarts and are shared across instances. Table spec:

| | |
| --- | --- |
| Table name | `lifepilot_pending_actions` (override with `DYNAMODB_PENDING_ACTIONS_TABLE`) |
| Partition key | `id` (String) |
| Capacity | **Provisioned 25 WCU / 25 RCU** (DynamoDB's permanent always-free allowance) |
| TTL | attribute `expiresAt` |

Create it either way:

```bash
# A) script — creates the table and enables TTL
export AWS_REGION=us-east-1           # plus credentials (env, ~/.aws, or a role)
npm run dynamo:setup -w server

# B) AWS Console — DynamoDB → Create table using the spec above, then
#    Additional settings → Time to Live → enable on `expiresAt`.
```

Credentials use the standard AWS chain; set them in `.env`:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
# PENDING_ACTION_STORE=auto (default) selects DynamoDB once AWS_REGION is set
```

`PENDING_ACTION_STORE` may be `memory`, `dynamodb`, or `auto` (DynamoDB when `AWS_REGION` or
`DYNAMODB_ENDPOINT` is set, else memory). For offline development run **DynamoDB Local** and set
`DYNAMODB_ENDPOINT=http://localhost:8000`. To stay strictly free, keep the table **provisioned**
at ≤25/25 — DynamoDB's always-free allowance (25 GB + 25 WCU/25 RCU) is permanent, applies to every
account, and covers *provisioned* capacity only; on-demand tables are billed per request.

## API surface (selected)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` · `/api/auth/login` | Auth (JWT) |
| `GET/POST` | `/api/tasks` · `/api/tasks/:id` | Task CRUD |
| `GET` | `/api/tasks/today` | Today's + overdue tasks |
| `POST` | `/api/tasks/:id/complete` | Complete a task |
| `GET/POST/PUT` | `/api/notes` · `/api/notes/:id` | Note CRUD + `/search` |
| `GET` | `/api/summary?period=today\|week\|month\|all` | Productivity summary |
| `POST` | `/api/plans/generate` | Build a time-blocked daily plan (`save: true` persists) |
| `GET/PUT/DELETE` | `/api/plans/:date` | Saved plans |
| `POST` | `/api/chat` | Send a message to the agent → `{ reply, provider, toolsUsed, pendingAction?, conversationId }` |
| `POST` | `/api/chat/confirm` | `{ actionId, decision: 'confirm'\|'cancel' }` for destructive actions |
| `GET` | `/api/chat/conversations` | Conversation history |

See `server/src/routes` for the full surface.

## Docs

- [`docs/architecture.md`](docs/architecture.md) — design decisions and data flow
- [`docs/setup.md`](docs/setup.md) — full install, configuration reference and troubleshooting
- [`docs/demo-script.md`](docs/demo-script.md) — narrated demo walk-through