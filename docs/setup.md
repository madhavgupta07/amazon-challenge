# Setup

## Prerequisites

- **Node.js 20+** (developed on 24)
- **npm** 10+
- **MongoDB** — either a local/server instance, or MongoDB Atlas. Not strictly required for
  tests (they use `mongodb-memory-server`), but needed for multi-process `npm run dev`.

## Install

```bash
npm install
cp .env.example .env
```

Edit `.env`: set `MONGODB_URI` to your MongoDB (or leave it as the local default), and change
`JWT_SECRET`… `MCP_INTERNAL_TOKEN` before anything exposed to the network.

## Run (local dev, real MongoDB)

```bash
npm run seed        # demo user + sample data
npm run dev         # mcp-server :4001 · server :4000 · client :5173
```

Open http://localhost:5173 → sign in as **demo@lifepilot.app / demo1234** (or register).

### Run without MongoDB (ephemeral)

```bash
MONGODB_URI=memory npm run seed    # note: memory resets when a process exits
MONGODB_URI=memory npm run dev
```

Because the API server and MCP server are separate processes, they need the **same** database.
In-memory mode doesn't share between processes after restart — fine for a quick tour, use a
real MongoDB for continuous work.

## AI engine

LifePilot runs a **local deterministic provider** (`Local demo`) — no keys, fully offline, and it
still makes real MCP tool calls against the real database. That's what demos and tests use.

The provider is **pluggable**: implement the `AIProvider` interface and return it from
`selectProvider()` (`server/src/ai/index.ts`). Because text-completion engines have no native
tool-calling, any engine plugs into the JSON-ReAct protocol — the agent loop, tools, and client
are unchanged.

The client only ever needs the API server, so nothing changes in the browser.

## AWS (DynamoDB confirmation store)

Destructive actions are intercepted into a short-lived `PendingAction` the user must confirm.
By default these live in memory (`PENDING_ACTION_STORE=auto` with no AWS region). For a durable,
multi-instance store, use **Amazon DynamoDB** (always-free tier):

```bash
export AWS_REGION=us-east-1          # plus credentials (env, ~/.aws, SSO, or a role)
npm run dynamo:setup -w server        # create the table + enable TTL (one time)
# PENDING_ACTION_STORE=auto (default) picks DynamoDB once AWS_REGION is set
```

`take` consumes a confirmation with a single atomic `DeleteCommand` (`ReturnValues=ALL_OLD`), and
the table's native TTL (`expiresAt`) sweeps expired rows. The table is created in **provisioned**
mode at 25 WCU / 25 RCU to stay within DynamoDB's **permanent always-free tier** (25 GB + 25 WCU/25
RCU — available on every account, paid or not; it covers provisioned capacity only). For offline
development, point `DYNAMODB_ENDPOINT` at DynamoDB Local. Set `PENDING_ACTION_STORE=memory` to force
the in-memory store regardless of AWS config.

## Configuration reference

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` forces `JWT_SECRET` to be set |
| `SERVER_PORT` | `4000` | REST API port |
| `CLIENT_URL` | `http://localhost:5173` | CORS allow-list (comma separated) |
| `MONGODB_URI` | — | Mongo connection string, or `memory` for in-memory |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | dev default / `7d` | JWT signing |
| `MCP_SERVER_URL` | `http://127.0.0.1:4001/mcp` | Where the API calls tools |
| `MCP_INTERNAL_TOKEN` | dev default | Shared secret for the MCP endpoint |
| `MCP_SERVER_PORT` / `MCP_HOST` | `4001` / `127.0.0.1` | MCP listener (mcp-server reads these) |
| `MCP_TIMEOUT_MS` | `15000` | Per-tool-call timeout |
| `MCP_ALLOWED_ORIGINS` | localhost:5173 | Browser origins allowed to call MCP (DNS-rebinding defence) |
| `AI_MAX_TOOL_ITERATIONS` | `6` | Bounded tool loop |
| `AI_REQUEST_TIMEOUT_MS` | `45000` | Single LLM request timeout |
| `AI_TEMPERATURE` | `0.3` | Sampling temperature |
| `PENDING_ACTION_STORE` | `auto` | `memory` \| `dynamodb` \| `auto` (DynamoDB when a region/endpoint is set) |
| `AWS_REGION` | — | Region for the DynamoDB client (standard AWS credential chain) |
| `DYNAMODB_PENDING_ACTIONS_TABLE` | `lifepilot_pending_actions` | Confirmation table name |
| `DYNAMODB_ENDPOINT` | — | Override endpoint (e.g. `http://localhost:8000` for DynamoDB Local) |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` / `RATE_LIMIT_CHAT_MAX` | `60000` / `300` / `30` | Rate limiting incl. a tighter chat limit |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `DEMO_*` | — | Demo account used by `npm run seed` |

## Tests

```bash
npm test                 # 39 tests (MCP + full-stack integration, parser, provider, store)
npm run typecheck        # all workspaces
```

Tests require no local MongoDB and no AI keys.

## Troubleshooting

- **`MONGODB_URI is not set`** — copy `.env.example` to `.env`, or use `MONGODB_URI=memory`.
- **Chat replies instantly with "Local demo"** — that's expected: the app uses the bundled
  deterministic provider.
- **`delete task` asks for confirmation** — by design; only `confirm` runs the deletion.
- **Data vanishes on restart with `MONGODB_URI=memory`** — expected; use a real MongoDB.
- **Port already in use** — change `SERVER_PORT`, `MCP_SERVER_PORT`, or the Vite port in
  `client/vite.config.ts`.