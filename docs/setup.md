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

## AI provider

LifePilot works out of the box with the **local deterministic provider** (`Local demo`) — no
keys, fully offline, and still makes real tool calls.

To try **NPMAI** (free tier, no API key), set a primary URL so `auto` selects it:

```bash
AI_PROVIDER=npmai
# The "_" primary load balancer is offline; the fallback LB is the one that
# serves requests. Backend model spaces sleep on the HF free tier and are often
# unreachable, so a message can take minutes before failing over.
NPMAI_BASE_URL=https://npmaiecosystem-loadbalancerfallback.hf.space/load_balancer
NPMAI_FALLBACK_BASE_URL=https://npmaiecosystem-load_balancer.hf.space/load_balancer
NPMAI_MODEL=llama3.2
```

Leave `NPMAI_BASE_URL` empty to use the local demo provider (recommended — fast and
reliable). Available model names include `llama3.2`, `gemma3:12b`, `qwen3.5:9b`, `gemma2:9b`.
Note the Node `npmai` global endpoint `https://npmai-api.onrender.com` documented in
the package README currently returns 404 — use the load-balancer endpoint above.
Because NPMAI is text-completion only, the model must emit the JSON tool protocol; weaker
models (e.g. `llama3.2`) may not, in which case the agent returns a generic reply.
As of writing, the free-tier model spaces sleep and error out, and the only reachable model
(`llama3.2`) narrates tool names instead of emitting tool calls, so NPMAI is best presented as
a drop-in provider while the local demo provider handles the live demo.

The client only ever needs the API server, so nothing changes in the browser.

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
| `AI_PROVIDER` | `auto` | `auto` \| `npmai` \| `mock` |
| `ALLOW_MOCK_FALLBACK` | `true` | Degrade to the local provider on NPMAI errors |
| `AI_MAX_TOOL_ITERATIONS` | `6` | Bounded tool loop |
| `AI_REQUEST_TIMEOUT_MS` | `45000` | Single LLM request timeout |
| `AI_TEMPERATURE` | `0.3` | Sampling temperature |
| `NPMAI_BASE_URL` | — | Primary NPMAI endpoint (empty = local provider in `auto`) |
| `NPMAI_FALLBACK_BASE_URL` | HF fallback | Fail-over endpoint (used when base is set) |
| `NPMAI_API_KEY` | — | Optional bearer token (self-hosted gateway only) |
| `NPMAI_MODEL` | `llama3.2` | Model name sent to NPMAI |
| `NPMAI_RETRIES` | `1` | Retries per endpoint |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` / `RATE_LIMIT_CHAT_MAX` | `60000` / `300` / `30` | Rate limiting incl. a tighter chat limit |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `DEMO_*` | — | Demo account used by `npm run seed` |

## Tests

```bash
npm test                 # 13 integration tests (MCP + full-stack)
npm run typecheck        # all workspaces
```

Tests require no local MongoDB and no AI keys.

## Troubleshooting

- **`MONGODB_URI is not set`** — copy `.env.example` to `.env`, or use `MONGODB_URI=memory`.
- **Chat replies instantly with "Local demo"** — that's expected: either `AI_PROVIDER=mock` is
  set or NPMAI is not configured. Set `NPMAI_BASE_URL` to use NPMAI.
- **Chat takes ~45s then responds** — NPMAI endpoints were slow/unreachable; the fallback
  provider was used. Lower `AI_REQUEST_TIMEOUT_MS` / `NPMAI_RETRIES`, or set `AI_PROVIDER=mock`.
- **`delete task` asks for confirmation** — by design; only `confirm` runs the deletion.
- **Data vanishes on restart with `MONGODB_URI=memory`** — expected; use a real MongoDB.
- **Port already in use** — change `SERVER_PORT`, `MCP_SERVER_PORT`, or the Vite port in
  `client/vite.config.ts`.