# LifePilot — Your Day, Actually Handled

**An agentic AI assistant that turns "plan my day" into real action.**

> Most assistants *talk* about your day. LifePilot *runs* it — reading your real tasks, building time-blocked plans, managing notes, and computing your progress from actual data, then confirming before it ever deletes anything.

## Inspiration

Chatbots are great at sounding helpful and terrible at the follow-through: they describe a plan instead of saving it, suggest a task instead of creating it. We wanted the opposite — an assistant whose every sentence is backed by a real, observable action against real data.

## What it does

You talk to LifePilot in plain language, and it calls real tools to get the job done:

```
"Plan my day"                                 -> reads today's tasks, proposes a time-blocked plan
"Add a task to prepare for my interview tomorrow" -> creates the task
"I completed the React interview prep"        -> finds the task and completes it
"Summarise my progress this week"             -> computes real completion statistics
```

It manages **tasks, notes, daily plans, and progress summaries** across a full web app — and it distinguishes a genuine tool call from a plausible-sounding sentence.

## How we built it

LifePilot is a **four-workspace TypeScript monorepo** with one shared data layer:

| Workspace | Role | Stack |
| --- | --- | --- |
| `client` | Web UI | React 18, Vite, Tailwind, React Router |
| `server` | REST API + AI orchestrator | Express, JWT, Zod, rate limiting |
| `mcp-server` | Tool layer over **MCP** (Streamable HTTP) | `@modelcontextprotocol/sdk` |
| `shared` | Models, services, tool schemas | Mongoose, Zod |

The heart of the system is a **bounded JSON-ReAct loop**. Each turn, the model proposes either a tool call or a final answer as strict JSON:

```json
{ "type": "tool", "tool": "get_today_tasks", "arguments": {} }
```

The orchestrator executes the call against the MCP server, feeds the observation back, and repeats — up to a fixed iteration cap — so the loop is deterministic, inspectable, and safe.

The **planner** is a real scheduler, not a prompt. It fills an available-hours budget with focus blocks sized by priority:

| Priority | Block length |
| --- | --- |
| urgent | 90 min |
| high | 60 min |
| medium | 45 min |
| low | 30 min |

Tasks are packed greedily while the schedule respects the daily budget \\(\sum_i d_i \le H\\), where \\(d_i\\) is a block's duration and \\(H\\) is the user's available hours, inserting short breaks between focus blocks.

Progress is computed from the database, not invented:

$$
\text{completionRate} = \frac{\text{tasksCompleted}}{\text{tasksCreated}} \times 100
$$

**The AI engine is pluggable.** LifePilot runs a local, deterministic engine behind an `AIProvider` interface that makes the *same real tool calls* a hosted model would — so the app works offline, in tests, and on stage without a flaky network. Every reply is labelled with the provider that produced it, and the UI shows exactly which tools fired.

**Ambient AWS state.** Pending destructive-action confirmations are persisted in **Amazon DynamoDB** (always-free tier) with a native TTL, and consumed with a single atomic delete — so an approval survives restarts and works across instances, without a database to run.

## Safety by design

- Identity flows as an `x-user-id` **header** from the API into the MCP server — a user can never inject someone else's id through tool arguments.
- The MCP endpoint requires a shared internal token and binds to `127.0.0.1`.
- **Destructive tools never fire directly.** The orchestrator intercepts `delete_task` / `delete_note`, creates a short-lived *PendingAction*, and asks the user to confirm. Deletion happens only on explicit confirmation.

## Challenges we ran into

- **Text-completion models that narrate instead of act.** Some models will happily *say* "Search get_today_tasks" as their final answer. Fixing it meant hardening the protocol (must start `{`, end `}`, concrete examples) and writing a forgiving parser that accepts OpenAI-style shapes, nested `{function:{...}}` payloads, and alternate keys like `final` / `answer`.
- **Getting MCP right.** Origin validation, protocol-version checks, and stateless transports each needed careful handling — including a fresh server + transport per request and unwrapping Zod effects so optional tool fields were advertised correctly.
- **Faithful summaries.** Computing real statistics (on-time completion, category/priority breakdowns) meant writing aggregation logic rather than asking a model to guess.

## Accomplishments we're proud of

- A genuine **agent -> MCP -> MongoDB** pipeline, end to end, behind a clean REST + web UI.
- A **platform-independent demo mode** that makes identical real tool calls, so the product never depends on a live model to be convincing.
- **39 tests** (integration over HTTP, parser, and provider) with a clean typecheck across all four workspaces.

## What we learned

- A bounded agent loop plus a strict output contract beats a "clever" prompt for reliability.
- Separating the **tool layer** (MCP) from the **orchestration layer** makes both testable and lets the same services power REST and the agent with zero duplicated logic.
- Honest UI signalling — *which provider produced this, which tools ran* — builds far more trust than hiding the machinery.

## What's next

- A marketplace of additional MCP tool packs (calendar, email, notes sync).
- Streaming agent traces directly into the UI.
- Voice-first entry points.

## Built With

`typescript` · `node.js` · `react` · `vite` · `express` · `mongodb` · `mongoose` · `amazon dynamodb` · `zod` · `model context protocol` · `json-reAct` · `tailwindcss` · `jwt` · `vitest`
