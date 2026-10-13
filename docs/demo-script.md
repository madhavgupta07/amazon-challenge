# Demo script

A narrated walkthrough of LifePilot for the Alexa+ Hackathon 2026 demo. ~4 minutes.

## Prepare (before judging)

```bash
npm install
cp .env.example .env                 # MONGODB_URI points at a real MongoDB
npm run seed                          # demo user + ~12 tasks + 4 notes + today's plan
npm run dev                           # mcp-server :4001 · server :4000 · client :5173
```

> Set `AI_PROVIDER=mock` (default `auto` with no NPMAI config behaves the same) so demos are
> instant and deterministic. The UI labels the provider "Local demo".

Open http://localhost:5173 and sign in as **demo@lifepilot.app / demo1234**.

## 1. The agent plans the day (the headline)

> *"The one-line pitch: your agent actually works your app. This is a real model loop calling
> real tools against a real database."*

- Suggested chip: **"Plan my day"**.
- Watch the chips appear under the reply — `Read today's tasks` then `Built a daily plan`.
- The reply lists a time-blocked schedule ordered by overdue/priority.
- Point out the **provider label** ("via Local demo") and the tool chips — transparency.

## 2. Adding a task with natural language

> *"It doesn't just chat — it changes state."*

- Type: **"Add a task to prepare for my interview tomorrow"**.
- One tool chip: `Created a task`.
- Open the **Tasks** page → the new task is there, categorised and dated.

## 3. A destructive action requires confirmation

> *"Safety is a first-class flow, not an afterthought."*

- Type: **"Delete the task Reply to recruiter email"**.
- The agent pauses with a Confirm / Cancel card instead of deleting.
- Cancel (nothing changes) — then ask it to delete a disposable task and **Confirm**.
- Show the trace: `Deleted a task · Confirmed`, and the task is gone from Tasks.

## 4. Self-serve productivity features

- **Tasks**: filter by category/priority/search, mark complete, edit.
- **Notes**: capture a note, then ask the agent *"find my notes about the interview"*.
- **Planner**: set hours/focus areas → *Generate plan* → *Save plan* — a time-blocked schedule
  from live tasks, with breaks and "couldn't fit" overflow.
- **Insights**: completion rate, on-time rate, completed-by-category bars, next-up list.

## 5. Recap + architecture (30s)

- Monorepo: React client → REST API (agent orchestrator) → MCP server over Streamable HTTP →
  shared services → MongoDB.
- Agent works through **13 MCP tools**; every tool call is validated and shown in the chat.
- Users are isolated through headers, identities never flow through tool arguments.
- Providers are pluggable — replace the local demo with **NPMAI** (`NPMAI_BASE_URL`) with no
  client changes.

## Good closing lines

> "You've seen an agent that doesn't just talk — it plans, schedules, remembers and tidies up,
> with real tool calls, real data, and real safety confirmations. Ask it to plan your day."

## Live prompting ideas if the judges want more

- *"Reschedule my unfinished tasks for tomorrow"*
- *"Summarise my study progress this week"*
- *"What should I focus on first today?"*