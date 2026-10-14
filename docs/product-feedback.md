# Product Feedback — LifePilot

**Project:** LifePilot — Your Day, Actually Handled
**Track:** Alexa+
**Builder:** Madhav Gupta

This feedback covers every developer tool, API, and SDK used in LifePilot, as required for
submission.

---

## 1. Model Context Protocol TypeScript SDK (`@modelcontextprotocol/sdk`) — v1.32.1

**What we used it for.** This is the backbone of our Alexa+ track entry. `mcp-server/` is a
self-hosted MCP server exposing 13 tools (`create_task`, `get_today_tasks`, `create_daily_plan`,
`get_productivity_summary`, `delete_task`, …) over **Streamable HTTP**, implementing MCP spec
version **2025-11-25**. The LifePilot API server calls these tools at runtime via
`StreamableHTTPClientTransport` (`server/src/services/mcpClient.ts`), so every agent action is a
real MCP call.

**What worked well.**
- The transport abstraction is excellent — swapping between stdio and Streamable HTTP is nearly
  transparent, and `enableJsonResponse: true` made the server simple to test with plain HTTP.
- The spec's 2025-11-25 security guidance (Origin validation to prevent DNS-rebinding, the
  `MCP-Protocol-Version` header check, binding to loopback) maps cleanly onto Express middleware.
- Tool registration with Zod schemas + `server.tool(...)` is ergonomic, and the SDK surfaces
  structured tool results in a way that serializes predictably over the wire.
- `extra.authInfo.extra.userId` is a clean channel for propagating identity out-of-band, which let
  us keep user identity **out** of tool arguments entirely.

**What needs work / friction.**
- **Stateless transports can't be reused.** With `sessionIdGenerator: undefined`, a single
  `StreamableHTTPServerTransport` + `McpServer` cannot serve more than one request — you must
  construct a fresh server and transport per incoming request. This isn't obvious from the docs and
  produces confusing errors if you cache them. A first-class "stateless handler" helper, or a clear
  warning, would save real time.
- **Zod `.effects` are hidden from the advertised tool schema.** Our `update_task` / `update_note`
  inputs use `.partial()` + `.refine(...)`, which wrap the schema in a `ZodEffects`. Passed
  directly, the SDK advertised an input schema with **no properties**, so clients couldn't see the
  optional fields. We worked around it with an `advertisedSchema()` helper that unwraps
  `ZodEffects._def.schema` before advertising. The SDK would benefit from handling `ZodEffects`
  natively.
- Documentation examples skew heavily toward stdio; the Streamable HTTP stateless pattern is
  under-documented relative to how commonly it's needed for servers behind a load balancer.

**Onboarding.** Very smooth for the happy path — `npx @modelcontextprotocol/inspector` had us
calling a hello-world tool within minutes. Going from "hello world" to a spec-compliant stateless
HTTP server took noticeably longer, mostly due to the two friction points above.

**Would we build with it again?** **Yes.** It's the most direct path to a compliant, spec-versioned
MCP server, and the security primitives line up with the track's requirements. We'd just budget
time for the stateless-transport and Zod-effects gotchas.

---

## 2. MongoDB + Mongoose — v8 (mongoose), MongoDB 6.0

**What we used it for.** All persistence: users, tasks, notes, daily plans, and conversations. A
single `shared/` service layer (Mongoose models + queries) is consumed by **both** the REST API and
the MCP tools, so there is no duplicated data logic.

**What worked well.** Schema definitions, aggregation pipelines for the productivity summary
(category/priority breakdowns, on-time completion), and `findOneAndUpdate(..., { upsert: true })`
for "today's plan" made the model layer compact and type-safe with TypeScript.

**What needs work.** Nothing significant — reliable and well-documented. The only wrinkle was in
**testing**: `mongodb-memory-server` is a great tool, but an in-memory instance is single-process,
so our two-process dev topology can't share it. We documented that `MONGODB_URI=memory` is for
local/tests only.

**Onboarding.** Zero-to-hello-world was fast; Mongoose's docs are excellent.

**Would we build again?** **Yes.**

---

## 3. Express — v4 (REST API)

**What we used it for.** The `/api/*` surface (auth, tasks, notes, plans, summary, chat) plus
middleware: `helmet`, `cors`, `express.json` (1 MB cap), `trust proxy`, rate limiters, and a central
error handler.

**What worked well.** Predictable, minimal, and easy to layer middleware. Pairing Express with Zod
validation middleware (`server/src/middleware/validate.ts`) kept controllers thin.

**What needs work.** Not much — for a project of this size Express is the right amount of
framework.

**Onboarding.** Instant; effectively zero-learning-curve for anyone who knows Node.

**Would we build again?** **Yes.**

---

## 4. Zod — v3

**What we used it for.** Runtime validation for REST payloads **and** as the single source of truth
for MCP tool input schemas (`shared/src/tools/schemas.ts`).

**What worked well.** One schema definition validated both the API boundary and the tool layer —
a huge consistency win.

**What needs work.** The Zod→JSON-Schema bridge inside the MCP SDK doesn't unwrap `ZodEffects`
(see above); we worked around it. Not a Zod problem per se, but worth knowing when composing
`.refine()` schemas.

**Onboarding.** Trivial and delightful.

**Would we build again?** **Yes.**

---

## 5. React 18 + Vite + TypeScript (web client)

**What we used it for.** The entire UI: auth, dashboard, tasks, planner, notes, assistant chat,
insights, and the public animated `/explore` explainer.

**What worked well.** Vite's dev server is instant, HMR is reliable, and the TypeScript story is
first-class. React 18 + a small custom context for auth needed no extra state library.

**What needs work.** Vite 7 is very new; a couple of plugins lagged slightly, but nothing blocked us.

**Onboarding.** `npm create vite` → productive in minutes.

**Would we build again?** **Yes.**

---

## 6. Tailwind CSS — v3

**What we used it for.** Styling the app and the `/explore` explainer (paired with a scoped CSS
design-token file).

**What worked well.** Utility-first iteration is fast, and a custom `brand` palette kept the product
consistent.

**What needs work.** The v3 → v4 migration is a sizable change; staying on v3 was the pragmatic
choice for the hackathon.

**Onboarding.** Standard.

**Would we build again?** **Yes.**

---

## 7. jsonwebtoken (JWT auth)

**What we used it for.** Stateless auth — issue on login/register, verify via `requireAuth`
middleware; the verified user id flows to the MCP server as an `x-user-id` header.

**What worked well.** Dead simple and well understood.

**What needs work.** Nothing notable.

**Onboarding.** Minutes.

**Would we build again?** **Yes.**

---

## 8. Vitest + Supertest + mongodb-memory-server (testing)

**What we used it for.** 31 tests: full HTTP integration (REST → agent → MCP → Mongo), MCP
transport behavior, the ReAct response parser, and the provider layer.

**What worked well.** Vitest's speed and API are excellent; `mongodb-memory-server` gives each run a
clean database; Supertest makes HTTP assertions painless.

**What needs work.** Because our config reads `process.env` at import time, tests must set env in a
setup file **before** importing the app — a minor footgun. `mongodb-memory-server` is
single-process only (documented), so it can't back the multi-process dev topology.

**Onboarding.** Fast; Vitest is close enough to Jest that there was no real learning curve.

**Would we build again?** **Yes.**

---

## 9. Amazon DynamoDB (AWS) — *AWS Builder mini challenge*

**What we used it for.** Destructive actions in LifePilot (deleting a task or note) never run
directly — the orchestrator intercepts them and creates a short-lived `PendingAction` the user must
confirm. We persist those pending actions in **Amazon DynamoDB**. Each item is keyed by the action
id and carries a **native DynamoDB TTL** (`expiresAt`, epoch seconds) so expired confirmations are
cleaned up automatically. `takePendingAction` consumes a confirmation with a single `DeleteCommand`
using `ReturnValues: "ALL_OLD"`, making the consume step atomic (no double-execute race). This
replaces the default in-memory map when `PENDING_ACTION_STORE=dynamodb`, so approvals survive
process restarts and work across multiple instances. Code: `server/src/agent/dynamoPendingActionStore.ts`.

**What worked well.**
- The `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` DocumentClient combo is pleasant: no
  manual marshalling, typed inputs, and small, clear command classes (`Put`, `Delete`, `Scan`).
- **Native TTL** is exactly the primitive a "pending confirmation" store wants — expiry is free and
  automatic, no cron job.
- `DeleteCommand` with `ReturnValues: "ALL_OLD"` gives atomic take-once semantics in one round trip.
- Billing sits inside DynamoDB's **permanent always-free allowance** (25 GB storage + 25 WCU / 25
  RCU), which applies to *every* account and never expires. Note this allowance covers **provisioned**
  capacity mode only — so the table is created provisioned at 25/25 rather than on-demand.
- The standard credential chain (env, `~/.aws`, SSO, or an instance role) means zero code changes
  between local and deployed environments.

**What needs work.**
- **Local development and testing need DynamoDB Local** (or a mock). We made the endpoint
  configurable (`DYNAMODB_ENDPOINT`) and wrote the store against a narrow `DynamoDocClient`
  interface, so unit tests inject a fake client and assert the exact commands — no network needed.
- **TTL is eventually consistent** (items can linger after expiry), so the store still enforces the
  TTL in code rather than trusting DynamoDB alone. Worth knowing; not a blocker.
- `count()` is a `Scan` with `Select: "COUNT"` — fine for a tiny operational table, not a design to
  scale to large collections.

**Onboarding (zero → hello world).** Very fast. Install the two SDK packages, create a table (we
added `npm run dynamo:setup -w server`), and a `PutCommand` works in minutes. Running against
**DynamoDB Local** avoided any cloud setup during development.

**Would we build again?** **Yes.** It's the cheapest way to add durable, multi-instance state to a
serverless-shaped app, and the TTL + atomic-delete primitives fit this use case almost perfectly.

---

## Summary

| Tool / API / SDK | Used for | Build again? |
| --- | --- | --- |
| `@modelcontextprotocol/sdk` 1.32.1 | Self-hosted MCP server over Streamable HTTP (Alexa+ track) | ✅ Yes |
| MongoDB + Mongoose | All persistence, shared by REST + MCP | ✅ Yes |
| **Amazon DynamoDB (AWS)** | Durable pending-action confirmation store (AWS Builder) | ✅ Yes |
| Express | REST API + middleware | ✅ Yes |
| Zod | Validation + tool schemas | ✅ Yes |
| React 18 + Vite + TS | Web client + `/explore` explainer | ✅ Yes |
| Tailwind CSS | Styling | ✅ Yes |
| jsonwebtoken | JWT auth | ✅ Yes |
| Vitest + Supertest + mongodb-memory-server | 39 tests | ✅ Yes |
