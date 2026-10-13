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

**AI providers** are pluggable (`server/src/ai`):

| Provider | When | Notes |
| --- | --- | --- |
| `NPMAI` | `AI_PROVIDER=npmai`, or `auto` with `NPMAI_BASE_URL` set | Text-completion API (`POST {prompt, model, temperature}` → `{response}`); orchestrated with the JSON-ReAct protocol because it has no native tool calling. Retries, then fails over to a fallback endpoint. Free tier needs no key. |
| `Local demo` | `AI_PROVIDER=mock`, or `auto` with no NPMAI config | Deterministic heuristic agent that makes the **same real tool calls** — great for offline demos and tests. Labeled `"Local demo"` in the UI so the user always knows. |

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
  confirm. Deletes only happen on explicit confirmation.

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
| `npm test` | Integration tests (MCP over HTTP, and full REST → agent → MCP → Mongo) plus parser and mock-provider unit tests — 31 tests across 4 files |
| `npm run typecheck` | Type-check all four workspaces |
| `npm run build` | Production build of client + server type-checks |

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
- [`demo/lifepilot-demo.mp4`](demo/lifepilot-demo.mp4) — 48s captioned demo video