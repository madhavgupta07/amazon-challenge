export const SECTIONS = [
  { id: "intro", label: "Intro" },
  { id: "problem", label: "Problem & Solution" },
  { id: "features", label: "Features & Tools" },
  { id: "glossary", label: "Glossary" },
  { id: "architecture", label: "Architecture" },
  { id: "flow", label: "Data Flow" },
  { id: "stack", label: "Tech Stack" },
  { id: "code", label: "Code Explorer" },
  { id: "journey", label: "Full Journey" },
] as const;

export const HERO = {
  name: "LifePilot",
  tagline: "A personal AI productivity agent backed by real tools & data",
  purpose:
    "LifePilot plans your day, manages tasks and notes, and computes real progress from natural language — backed by 13 Model Context Protocol tools and verified MongoDB data.",
  problem:
    "Standard chatbots invent tasks and hallucinate calendars. LifePilot strictly executes real tools and verifies observations through a JSON-ReAct loop before answering.",
  audience: "Professionals, engineers, and busy creators who need an AI that acts on their actual records.",
  event: "Built for the Alexa+ Hackathon 2026",
  stats: [
    { label: "MCP Tools", value: "13 Verified", hint: "Streamable HTTP" },
    { label: "Data Models", value: "5 Mongoose", hint: "MongoDB Isolated" },
    { label: "AI Providers", value: "2 Pluggable", hint: "NPMAI + Local" },
    { label: "Hallucinations", value: "Zero Allowed", hint: "Schema Validated" },
  ],
};

export const SAMPLE_PROMPTS = [
  {
    id: "plan",
    label: "Plan my day",
    query: "Plan my day with 6 hours available",
    toolUsed: "create_daily_plan (save: false)",
    targetNode: "agent",
    response:
      "Evaluated 4 open tasks: Allocated 90m for 'Alexa+ submission prep' (urgent), 60m for 'Docker deployment' (high), 45m for 'Team sync note review'. Proposing 3 time blocks starting 09:00. Preview in Planner or save now.",
  },
  {
    id: "add",
    label: "Add interview task",
    query: "Add a task to prepare for my interview tomorrow",
    toolUsed: "create_task (source: agent)",
    targetNode: "mcp",
    response:
      "Created task 'Prepare for my interview' with dueDate set to tomorrow, priority 'high', category 'work', and source 'agent'. Visible across all task views.",
  },
  {
    id: "summary",
    label: "Summarise week",
    query: "Summarise my progress this week",
    toolUsed: "get_productivity_summary (period: week)",
    targetNode: "shared",
    response:
      "Calculated from stored records: 9 tasks completed (82% on-time completion), 1 overdue chore, 14 total tasks active. Top category: Work (62%).",
  },
  {
    id: "delete",
    label: "Delete task (Safety)",
    query: "Delete the task 'Temporary chore'",
    toolUsed: "delete_task [INTERCEPTED → PendingAction]",
    targetNode: "pending",
    response:
      "Destructive action intercepted! Created PendingAction (10 min TTL). LifePilot will NEVER delete without your explicit button click.",
  },
];

export const HIGHLIGHTS = [
  {
    title: "Natural Language to Action",
    body: "Ask to plan, create, complete, or summarize. The agent selects verified tools to fulfill the intent.",
    icon: "Sparkles",
  },
  {
    title: "13 Real MCP Tools",
    body: "Operates over official Model Context Protocol Streamable HTTP. Shares MongoDB services with REST UI.",
    icon: "Wrench",
  },
  {
    title: "Destructive Action Safety",
    body: "Delete requests trigger a short-lived PendingAction token. Nothing is erased without human confirmation.",
    icon: "ShieldCheck",
  },
  {
    title: "Transparent Provenance",
    body: "Every response explicitly displays the provider (NPMAI or Local demo) and audit chips for all tools called.",
    icon: "FileCheck",
  },
];

export const PROBLEM = {
  who: "Busy knowledge workers, students, and software developers juggling tasks, meeting notes, and chaotic daily schedules.",
  pain: [
    {
      title: "Hallucinated Schedules",
      body: "Generic AI chatbots invent plausible-looking calendars that have zero connection to your real to-do list.",
    },
    {
      title: "Fragmented Applications",
      body: "Tasks live in one app, markdown notes in another, analytics in a spreadsheet — none talk to an assistant.",
    },
    {
      title: "Unsafe Automation",
      body: "Giving an autonomous agent unconditional delete access risks catastrophic, unrecoverable data loss.",
    },
    {
      title: "Black-Box Answers",
      body: "Users can't tell whether an AI actually updated an item, made a network call, or merely faked the reply.",
    },
  ],
  solution: [
    {
      title: "Grounded in Real MongoDB Records",
      body: "LifePilot reads and writes through the same shared Mongoose models that power the manual REST screens.",
    },
    {
      title: "Unified Agent + Productivity Suite",
      body: "Assistant, Tasks, Time-Blocked Planner, Markdown Notes, and Insights all share a single source of truth.",
    },
    {
      title: "Human-in-the-Loop Confirmation",
      body: "Destructive tools (delete_task, delete_note) are intercepted into an in-memory TTL store until confirmed.",
    },
    {
      title: "Audit Traces & Honest Attribution",
      body: "Every response itemizes the exact tools executed and declares whether NPMAI or Local demo produced it.",
    },
  ],
};

export const FEATURES = [
  {
    id: "assistant",
    name: "AI Assistant & Orchestrator",
    simple: "You type or speak in plain English. LifePilot analyzes the request, selects tools, and executes them.",
    why: "Personal productivity spans planning, searching notes, checking deadlines, and reporting in a single conversation.",
    how: "AssistantPage issues POST /api/chat. chatController loads the user, recent conversation, and real-time task counts, then runs runAgent.",
    behind:
      "server/src/agent/orchestrator.ts executes a bounded JSON-ReAct loop. Identity is injected via the x-user-id header into the MCP session. Tool traces and provider names are saved on Conversation.",
    files: [
      "client/src/pages/AssistantPage.tsx",
      "server/src/controllers/chatController.ts",
      "server/src/agent/orchestrator.ts",
      "shared/src/models/Conversation.ts",
    ],
    example: '"Plan my day" → orchestrator calls get_today_tasks and create_daily_plan → renders a focused time-block schedule.',
    demo: {
      title: "Chat Turn & Tool Trace (Simulated)",
      lines: [
        { who: "you", text: "Plan my day with 6 hours available" },
        { who: "sys", text: "POST /api/chat  { message, conversationId }" },
        { who: "tool", text: "CALL create_daily_plan { availableHours: 6, save: false }" },
        { who: "agent", text: "Here is your time-blocked plan for today: 3 blocks scheduled, 1 lower-priority item deferred." },
      ],
    },
  },
  {
    id: "react-loop",
    name: "JSON-ReAct Tool Execution Loop",
    simple: "The AI must emit strict JSON: either a tool call with arguments, or a final answer. No silent hallucinations.",
    why: "NPMAI is a text-completion API with no native tool-calling. The JSON-ReAct protocol gives it full tool capability.",
    how: "parseModelOutput parses { tool, arguments } or { final_answer }. Arguments are parsed against the tool's Zod schema before calling MCP.",
    behind:
      "Observations are appended as OBSERVATION <tool>: {…} turns. If JSON or schema validation fails, the error is fed back as an observation so the model can self-correct, capped by AI_MAX_TOOL_ITERATIONS (default 6).",
    files: [
      "server/src/ai/parse.ts",
      "server/src/ai/prompt.ts",
      "server/src/agent/orchestrator.ts",
      "shared/src/tools/definitions.ts",
    ],
    example: "If the model omits a required field, Zod validation returns an error observation; the model corrects itself on the next turn.",
    demo: {
      title: "ReAct Iteration Step (Simulated)",
      lines: [
        { who: "you", text: "Add a task to submit the challenge tonight" },
        { who: "sys", text: "MODEL EMITS: {\"tool\": \"create_task\", \"arguments\": {\"title\": \"Submit challenge\", \"priority\": \"urgent\"}}" },
        { who: "tool", text: "OBSERVATION create_task: { \"success\": true, \"taskId\": \"67ab...\" }" },
        { who: "agent", text: "MODEL EMITS: {\"final_answer\": \"Task 'Submit challenge' created with urgent priority!\"}" },
      ],
    },
  },
  {
    id: "tasks",
    name: "Task Management & Categorization",
    simple: "Create, view, filter, edit, complete, and delete tasks from the web interface or via the AI assistant.",
    why: "Daily planning and productivity summaries require an accurate, persistent database of personal tasks.",
    how: "Manual UI communicates via REST /api/tasks. The AI assistant uses create_task, list_tasks, get_today_tasks, update_task, and complete_task.",
    behind:
      "Task documents store title, description, category (work, personal, health, finance, study, other), priority (low, medium, high, urgent), status (todo, in_progress, completed, cancelled), dueDate, and source (manual vs agent).",
    files: [
      "client/src/pages/TasksPage.tsx",
      "server/src/routes/tasks.ts",
      "shared/src/services/tasks.ts",
      "shared/src/models/Task.ts",
    ],
    example: '"I completed the React interview prep" → AI executes complete_task → sets status to completed and completedAt timestamp.',
    demo: {
      title: "Natural-Language Task Creation (Simulated)",
      lines: [
        { who: "you", text: "Remind me to review PR #42 tomorrow morning" },
        { who: "sys", text: "POST /api/chat → create_task" },
        { who: "tool", text: "Mongo insert → Task { title: 'Review PR #42', dueDate: '2026-10-13T09:00:00Z', source: 'agent' }" },
        { who: "agent", text: "Added 'Review PR #42' for tomorrow at 9:00 AM." },
      ],
    },
  },
  {
    id: "planner",
    name: "Time-Blocked Daily Planner",
    simple: "Constructs an optimized hourly schedule from your open tasks based on priority, duration, and start time.",
    why: "Overwhelmed users need algorithmic schedules that prioritize urgent tasks and fit into available working hours.",
    how: "PlannerPage triggers POST /api/plans/generate or the AI calls create_daily_plan. Durations: urgent (90m), high (60m), medium (45m), low (30m).",
    behind:
      "buildDailyPlan in shared/src/services/plan.ts sorts overdue tasks first, then priority. Persisted DailyPlan models store blocks (title, start, end, category, taskId) with a unique compound index on (user, date).",
    files: [
      "client/src/pages/PlannerPage.tsx",
      "server/src/controllers/planController.ts",
      "shared/src/services/plan.ts",
      "shared/src/models/DailyPlan.ts",
    ],
    example: "Set start hour to 09:00 and available hours to 5 → builds consecutive blocks with breaks; unscheduled tasks are reported as overflow.",
    demo: {
      title: "Plan Generation (Simulated)",
      lines: [
        { who: "you", text: "Plan my day with 4 hours" },
        { who: "sys", text: "create_daily_plan { availableHours: 4, save: false }" },
        { who: "tool", text: "Calculated 3 blocks (90m, 60m, 45m) + 35m overflow" },
        { who: "agent", text: "Generated 3 scheduled blocks from 09:00 to 12:45. Unscheduled overflow: 1 low-priority task." },
      ],
    },
  },
  {
    id: "notes",
    name: "Markdown Notes & Fast Search",
    simple: "Jot down ideas, meeting takeaways, and references with markdown styling, tagging, pinning, and instant search.",
    why: "Productivity context goes beyond simple checklists; users need searchable notes their assistant can consult.",
    how: "REST /api/notes and /api/notes/search. AI tools: create_note, search_notes, list_notes, update_note, delete_note.",
    behind:
      "MongoDB compound text index on title, content, and tags enables full-text search with regex fallback for small partial queries.",
    files: [
      "client/src/pages/NotesPage.tsx",
      "server/src/routes/notes.ts",
      "shared/src/services/notes.ts",
      "shared/src/models/Note.ts",
    ],
    example: '"What did I note down about the API token?" → AI searches notes matching "API token" and quotes the answer.',
  },
  {
    id: "insights",
    name: "Productivity Insights & Analytics",
    simple: "Interactive charts and completion rates calculated directly from stored task data — not guessed.",
    why: "Reflecting on weekly accomplishments requires factual metrics: on-time completion percentage and category breakdowns.",
    how: "GET /api/summary?period=today|week|month|all. AI tool: get_productivity_summary.",
    behind:
      "shared/src/services/summary.ts uses MongoDB aggregation to calculate completedCount, overdueCount, completionRatePct, and category splits.",
    files: [
      "client/src/pages/InsightsPage.tsx",
      "server/src/controllers/summaryController.ts",
      "shared/src/services/summary.ts",
    ],
    example: '"Summarise my progress this week" → AI calls get_productivity_summary → reports 8 tasks finished and 80% on-time rate.',
    demo: {
      title: "Analytics Aggregation (Simulated)",
      lines: [
        { who: "you", text: "How productive was I this week?" },
        { who: "sys", text: "CALL get_productivity_summary { period: 'week' }" },
        { who: "tool", text: "Mongoose aggregation on Task documents for user" },
        { who: "agent", text: "You completed 7 tasks this week with an 85% on-time completion rate! Work was your highest category." },
      ],
    },
  },
  {
    id: "confirm",
    name: "Destructive Action Safety Gate",
    simple: "Deleting a task or note is paused immediately. The AI requests explicit human confirmation before deleting.",
    why: "LLMs can misinterpret queries. Destructive operations must have a guaranteed human-in-the-loop safety barrier.",
    how: "The orchestrator intercepts delete_task and delete_note, creates a PendingAction with a 10-minute TTL, and returns an action token.",
    behind:
      "Client displays a prominent Confirm / Cancel dialog. Clicking confirm sends POST /api/chat/confirm { actionId, decision: 'confirm' }, which re-runs the tool with confirm: true.",
    files: [
      "server/src/agent/pendingActions.ts",
      "server/src/controllers/chatController.ts",
      "client/src/components/ConfirmDialog.tsx",
    ],
    example: '"Delete the old test chore" → Assistant creates pending action card. If you click cancel, no data is touched.',
    demo: {
      title: "Safety Interceptor (Simulated)",
      lines: [
        { who: "you", text: "Delete the task 'Temporary chore'" },
        { who: "sys", text: "INTERCEPT: delete_task flagged destructive → created PendingAction(id: 'act_9f2a')" },
        { who: "tool", text: "DATABASE UNTOUCHED (0 records deleted)" },
        { who: "agent", text: "This action cannot be undone. Please confirm: Delete 'Temporary chore'?" },
      ],
    },
  },
  {
    id: "mcp",
    name: "Stateless MCP Tool Server",
    simple: "Tools are exposed as an isolated microservice using the Model Context Protocol over Streamable HTTP.",
    why: "Separates tool logic, protocol transport, and security boundaries from the main Express API.",
    how: "mcp-server listens on 127.0.0.1:4001/mcp. Requests must include x-internal-token and x-user-id. A fresh transport is instantiated per request.",
    behind:
      "Follows Streamable HTTP spec (2025-11-25): Origin validation prevents DNS-rebinding; identity is strictly extracted from HTTP headers, never client tool arguments.",
    files: [
      "mcp-server/src/app.ts",
      "mcp-server/src/register.ts",
      "server/src/services/mcpClient.ts",
      "shared/src/tools/definitions.ts",
    ],
    example: "The orchestrator opens an MCP client session, discovers tools, calls create_task, and terminates the session cleanly.",
  },
  {
    id: "providers",
    name: "Pluggable AI Engine (NPMAI + Mock)",
    simple: "Switch between live NPMAI text completion with automatic fallback, or an offline deterministic Local demo provider.",
    why: "Demos, offline testing, and continuous integration must work reliably even without internet or third-party API keys.",
    how: "selectProvider() evaluates AI_PROVIDER (auto | npmai | mock). NPMAI posts { prompt, model, temperature } and retries with fallback.",
    behind:
      "MockProvider uses deterministic heuristics to execute the exact same MCP tool calls and write the same MongoDB records.",
    files: [
      "server/src/ai/index.ts",
      "server/src/ai/npmaiProvider.ts",
      "server/src/ai/mockProvider.ts",
    ],
    example: "Offline mode still creates real MongoDB tasks and calculates real time-blocked plans via Local demo.",
  },
];

export const TOOL_DETAILS = [
  {
    name: "create_task",
    title: "Create Task",
    category: "Tasks",
    description: "Creates a new task with title, category, priority, dueDate, and tags for the authenticated user.",
    destructive: false,
    mutates: true,
    service: "shared/src/services/tasks.ts:createTask",
    params: [
      { name: "title", type: "string (1-200)", required: true, desc: "Task summary" },
      { name: "category", type: "enum", required: false, desc: "work | personal | health | finance | study | other" },
      { name: "priority", type: "enum", required: false, desc: "low | medium | high | urgent (default: medium)" },
      { name: "dueDate", type: "ISO-8601", required: false, desc: "Due date interpreted against current time" },
    ],
    exampleCall: {
      input: { title: "Prepare slides for demo", priority: "urgent", category: "work" },
      output: { success: true, task: { id: "67ab...1", title: "Prepare slides for demo", status: "todo" } },
    },
  },
  {
    name: "list_tasks",
    title: "List Tasks",
    category: "Tasks",
    description: "Returns open and completed tasks with optional filters for status, category, priority, and search.",
    destructive: false,
    mutates: false,
    service: "shared/src/services/tasks.ts:listTasks",
    params: [
      { name: "status", type: "enum", required: false, desc: "todo | in_progress | completed | cancelled" },
      { name: "category", type: "enum", required: false, desc: "Filter by category" },
      { name: "limit", type: "number (1-50)", required: false, desc: "Max items to return (default 20)" },
    ],
    exampleCall: {
      input: { status: "todo", limit: 5 },
      output: { count: 3, tasks: [{ title: "Submit project" }, { title: "Review tests" }] },
    },
  },
  {
    name: "get_today_tasks",
    title: "Get Today's Tasks",
    category: "Tasks",
    description: "Returns tasks due today plus all overdue open tasks adjusted for the user's local timezone.",
    destructive: false,
    mutates: false,
    service: "shared/src/services/tasks.ts:getTodayTasks",
    params: [],
    exampleCall: {
      input: {},
      output: { todayCount: 2, overdueCount: 1, tasks: [{ title: "Fix bug", overdue: true }] },
    },
  },
  {
    name: "update_task",
    title: "Update Task",
    category: "Tasks",
    description: "Modifies fields of an existing task (title, status, priority, dueDate, tags).",
    destructive: false,
    mutates: true,
    service: "shared/src/services/tasks.ts:updateTask",
    params: [
      { name: "taskId", type: "string (ObjectId)", required: true, desc: "Task ID to update" },
      { name: "status", type: "enum", required: false, desc: "New status" },
      { name: "priority", type: "enum", required: false, desc: "New priority" },
    ],
    exampleCall: {
      input: { taskId: "67ab...1", priority: "urgent" },
      output: { success: true, updatedFields: ["priority"] },
    },
  },
  {
    name: "complete_task",
    title: "Complete Task",
    category: "Tasks",
    description: "Marks a task as finished and records the current completion timestamp.",
    destructive: false,
    mutates: true,
    service: "shared/src/services/tasks.ts:completeTask",
    params: [
      { name: "taskId", type: "string (ObjectId)", required: true, desc: "Target task ID" },
    ],
    exampleCall: {
      input: { taskId: "67ab...1" },
      output: { success: true, completedAt: "2026-10-12T21:00:00Z" },
    },
  },
  {
    name: "delete_task",
    title: "Delete Task (Destructive)",
    category: "Tasks",
    description: "Permanently deletes a task. Intercepted by orchestrator unless confirm=true.",
    destructive: true,
    mutates: true,
    service: "shared/src/services/tasks.ts:deleteTask",
    params: [
      { name: "taskId", type: "string (ObjectId)", required: true, desc: "Task ID to remove" },
      { name: "confirm", type: "boolean", required: false, desc: "Only set on user confirmation" },
    ],
    exampleCall: {
      input: { taskId: "67ab...1", confirm: true },
      output: { success: true, deletedTaskId: "67ab...1" },
    },
  },
  {
    name: "create_note",
    title: "Create Note",
    category: "Notes",
    description: "Saves a markdown note with title, content, tags, and pinned state.",
    destructive: false,
    mutates: true,
    service: "shared/src/services/notes.ts:createNote",
    params: [
      { name: "title", type: "string (1-200)", required: true, desc: "Note title" },
      { name: "content", type: "string", required: true, desc: "Markdown content" },
      { name: "tags", type: "string[]", required: false, desc: "Optional tags" },
    ],
    exampleCall: {
      input: { title: "API Keys Memo", content: "Remember to rotate tokens weekly", tags: ["security"] },
      output: { success: true, noteId: "67ac...2" },
    },
  },
  {
    name: "search_notes",
    title: "Search Notes",
    category: "Notes",
    description: "Searches the user's notes using MongoDB full-text index on title, content, and tags.",
    destructive: false,
    mutates: false,
    service: "shared/src/services/notes.ts:searchNotes",
    params: [
      { name: "query", type: "string", required: true, desc: "Search phrase or keyword" },
    ],
    exampleCall: {
      input: { query: "rotate" },
      output: { matchCount: 1, results: [{ title: "API Keys Memo" }] },
    },
  },
  {
    name: "list_notes",
    title: "List Notes",
    category: "Notes",
    description: "Returns recent notes, with pinned notes automatically sorted to the top.",
    destructive: false,
    mutates: false,
    service: "shared/src/services/notes.ts:listNotes",
    params: [
      { name: "tag", type: "string", required: false, desc: "Optional tag filter" },
      { name: "limit", type: "number", required: false, desc: "Max notes (default 20)" },
    ],
    exampleCall: {
      input: { limit: 10 },
      output: { count: 4, notes: [{ title: "Sprint Goals", pinned: true }] },
    },
  },
  {
    name: "update_note",
    title: "Update Note",
    category: "Notes",
    description: "Updates an existing note's title, markdown body, tags, or pinned status.",
    destructive: false,
    mutates: true,
    service: "shared/src/services/notes.ts:updateNote",
    params: [
      { name: "noteId", type: "string (ObjectId)", required: true, desc: "Target note ID" },
      { name: "content", type: "string", required: false, desc: "Updated body" },
    ],
    exampleCall: {
      input: { noteId: "67ac...2", pinned: true },
      output: { success: true, updated: true },
    },
  },
  {
    name: "delete_note",
    title: "Delete Note (Destructive)",
    category: "Notes",
    description: "Permanently deletes a note. Intercepted by orchestrator unless confirmed.",
    destructive: true,
    mutates: true,
    service: "shared/src/services/notes.ts:deleteNote",
    params: [
      { name: "noteId", type: "string (ObjectId)", required: true, desc: "Note ID to delete" },
      { name: "confirm", type: "boolean", required: false, desc: "Confirmation flag" },
    ],
    exampleCall: {
      input: { noteId: "67ac...2", confirm: true },
      output: { success: true, deletedNoteId: "67ac...2" },
    },
  },
  {
    name: "get_productivity_summary",
    title: "Get Productivity Summary",
    category: "Analytics",
    description: "Computes completion counts, overdue rate, on-time percentage, and category breakdown.",
    destructive: false,
    mutates: false,
    service: "shared/src/services/summary.ts:getSummary",
    params: [
      { name: "period", type: "enum", required: false, desc: "today | week | month | all" },
    ],
    exampleCall: {
      input: { period: "week" },
      output: { totalTasks: 14, completedCount: 8, overdueCount: 1, completionRatePct: 80 },
    },
  },
  {
    name: "create_daily_plan",
    title: "Create Daily Plan",
    category: "Planner",
    description: "Builds a time-blocked schedule from open tasks. Persists only when save=true.",
    destructive: false,
    mutates: true,
    service: "shared/src/services/plan.ts:buildDailyPlan",
    params: [
      { name: "date", type: "YYYY-MM-DD", required: false, desc: "Plan target date" },
      { name: "availableHours", type: "number (1-16)", required: false, desc: "Total daily work budget" },
      { name: "save", type: "boolean", required: false, desc: "Whether to persist to MongoDB (default: false)" },
    ],
    exampleCall: {
      input: { availableHours: 6, save: false },
      output: { scheduledBlocks: 4, scheduledMinutes: 300, overflowCount: 1 },
    },
  },
];

export const GLOSSARY = [
  {
    id: "frontend",
    term: "Frontend (React SPA)",
    category: "Architecture",
    def: "The browser-rendered React 18 single-page app containing user interfaces, charts, forms, and client routing.",
    why: "Provides immediate, responsive UI interactions with Vite HMR without server-side page reloads.",
    example: "client/src/pages/* routes wrapped by AppLayout and ProtectedRoute.",
    analogy: "The car dashboard and controls — you interact here, while the engine runs under the hood.",
  },
  {
    id: "backend",
    term: "Backend API (Express)",
    category: "Architecture",
    def: "Express HTTP server running on port 4000 handling authentication, request validation, rate limiting, and the agent orchestrator.",
    why: "Single trusted authority that enforces user isolation, verifies JWT tokens, and routes requests.",
    example: "server/src/app.ts configures Helmet, CORS, json parser, and mounts /api routes.",
    analogy: "The bank teller who inspects your credentials before allowing any deposit or withdrawal.",
  },
  {
    id: "rest",
    term: "REST API & Endpoints",
    category: "Architecture",
    def: "Standard HTTP resource paths utilizing GET, POST, PUT, PATCH, and DELETE verbs to interact with resources.",
    why: "Gives both the web client and integration test suites a clean, predictable, standard protocol.",
    example: "GET /api/tasks, POST /api/tasks/:id/complete, GET /api/summary?period=week.",
    analogy: "A library catalog organized by category: ask the desk for book #42 with a specific request ticket.",
  },
  {
    id: "http",
    term: "HTTP Request & Response",
    category: "Architecture",
    def: "Client sends HTTP methods, headers, and JSON payloads. The server processes and returns a status code and JSON response.",
    why: "Universal client-server transport mechanism for web browsers and backend microservices.",
    example: "client/src/lib/api.ts sends Authorization: Bearer <token> and decodes JSON response payloads.",
    analogy: "Sending a registered letter with a return address and receiving an official stamped response envelope.",
  },
  {
    id: "mcp",
    term: "Model Context Protocol (MCP)",
    category: "Agent & MCP",
    def: "An open standard enabling AI models to discover and execute tools securely across processes using Streamable HTTP.",
    why: "Standardizes tool definitions, input schemas, and execution boundaries rather than inventing custom RPC.",
    example: "mcp-server/src/app.ts runs McpServer, exposing 13 tools on 127.0.0.1:4001/mcp.",
    analogy: "A standardized USB-C port for AI: any tool can plug in without custom wiring.",
  },
  {
    id: "react-pattern",
    term: "JSON-ReAct Agent Pattern",
    category: "Agent & MCP",
    def: "Reasoning and Acting loop where the AI proposes a tool call, receives an observation, and iterates until emitting a final answer.",
    why: "Allows text-completion models (like NPMAI) to invoke tools reliably without native function-calling APIs.",
    example: "server/src/agent/orchestrator.ts loop bounded by AI_MAX_TOOL_ITERATIONS.",
    analogy: "A detective looking at a clue, checking a file, evaluating what they learned, and checking the next file until solved.",
  },
  {
    id: "jwt",
    term: "JWT Authentication",
    category: "Security",
    def: "JSON Web Tokens signed cryptographically using a server secret. Carries the authenticated user's ID.",
    why: "Enables stateless authentication across API requests without maintaining session tables on the server.",
    example: "server/src/utils/jwt.ts signs the token; requireAuth middleware validates Bearer header.",
    analogy: "A tamper-evident security wristband stamped with your entrance time and badge ID.",
  },
  {
    id: "authz",
    term: "Tenancy & Header Identity",
    category: "Security",
    def: "Tenant isolation where queries are scoped to req.user. The MCP server trusts x-user-id header injected by the API.",
    why: "Prevents prompt injection or malicious users from accessing or modifying another user's documents.",
    example: "Tool definitions contain no userId argument; handlers pull userId directly from authInfo.extra.userId.",
    analogy: "A safe deposit box that requires the bank manager's key card plus your personal key — you cannot request box #12.",
  },
  {
    id: "pending-action",
    term: "PendingAction (Safety Gate)",
    category: "Security",
    def: "An in-memory TTL token storing a destructive tool call (delete) until the user explicitly confirms or cancels.",
    why: "Guarantees that an autonomous agent can never permanently delete user data without human authorization.",
    example: "server/src/agent/pendingActions.ts stores action with 10m expiry; confirm endpoint validates actionId.",
    analogy: "A nuclear launch key that requires a human turning the second key before execution.",
  },
  {
    id: "middleware",
    term: "Express Middleware",
    category: "Architecture",
    def: "Pipeline functions that intercept incoming HTTP requests to handle CORS, Helmet headers, rate limits, and auth.",
    why: "Ensures cross-cutting concerns like security headers and validation run consistently across all routes.",
    example: "validateBody(createTaskBody) parses request bodies with Zod before the controller is called.",
    analogy: "Security checkpoints and bag scanners at an airport terminal before boarding the plane.",
  },
  {
    id: "db",
    term: "Mongoose & Database Models",
    category: "Data & Infra",
    def: "Object Data Modeling (ODM) library for MongoDB defining strict schemas, indexes, and methods for collections.",
    why: "Provides type safety, document validation, and index definitions (User, Task, Note, DailyPlan, Conversation).",
    example: "TaskSchema defines category enum, indexes { user: 1, status: 1, dueDate: 1 }, and virtuals.",
    analogy: "Pre-printed printed forms with required fields and filing cabinet dividers for rapid retrieval.",
  },
  {
    id: "zod",
    term: "Zod Schema Validation",
    category: "Data & Infra",
    def: "TypeScript-first schema declaration library that validates runtime data and strips unpermitted properties.",
    why: "Validates incoming HTTP bodies and MCP tool arguments at runtime, preventing malformed payloads.",
    example: "shared/src/tools/schemas.ts exports createTaskInput, converted to JSON Schema for the system prompt.",
    analogy: "A coin-sorting slot machine: only coins of exact dimensions pass through; foreign tokens are rejected.",
  },
  {
    id: "async",
    term: "Asynchronous I/O (async/await)",
    category: "Data & Infra",
    def: "Non-blocking JavaScript operations using Promises for MongoDB queries, MCP calls, and network requests.",
    why: "Prevents long-running network requests from freezing the Node.js event loop for other users.",
    example: "createMcpSession() awaits transport connection; callToolOnce awaits execution with timeout.",
    analogy: "Ordering food at a counter and taking a buzzer: you wait for the buzzer while the kitchen cooks, rather than blocking the line.",
  },
  {
    id: "errors",
    term: "Error Handling & AppError",
    category: "Architecture",
    def: "Custom AppError class mapped to HTTP status codes, caught by a global errorHandler returning structured JSON.",
    why: "Eliminates leaked server stack traces while giving the client consistent machine-readable error codes.",
    example: "throw new AppError('Task not found', 404, 'NOT_FOUND'); caught by server/src/middleware/error.ts.",
    analogy: "An automated return receipt explaining clearly why an item was declined rather than an incomprehensible error sheet.",
  },
  {
    id: "env",
    term: "Environment Variables (.env)",
    category: "Data & Infra",
    def: "Configuration settings injected into process.env at startup (PORT, MONGODB_URI, JWT_SECRET, MCP_INTERNAL_TOKEN).",
    why: "Keeps secrets out of git repositories and allows distinct settings for local dev, integration tests, and production.",
    example: "server/src/config/env.ts validates presence of required keys with sensible fallback defaults.",
    analogy: "The electrical breaker box in a building: switches can be configured per room without rebuilding the house.",
  },
];

export const ARCH_NODES = [
  {
    id: "user",
    label: "User (Browser)",
    kind: "concept" as const,
    x: 40,
    y: 120,
    files: ["client/src/pages/*"],
    body: "The human user interacting with the UI. Types natural-language prompts, clicks task checkboxes, or approves daily plans.",
  },
  {
    id: "client",
    label: "React 18 SPA (:5173)",
    kind: "actual" as const,
    x: 220,
    y: 120,
    files: ["client/src/App.tsx", "client/src/lib/api.ts", "client/vite.config.ts"],
    body: "Vite + React 18 + TailwindCSS. Uses typed api client over /api proxy. Persists JWT in localStorage.",
  },
  {
    id: "api",
    label: "Express API (:4000)",
    kind: "actual" as const,
    x: 430,
    y: 120,
    files: ["server/src/app.ts", "server/src/routes/index.ts", "server/src/middleware/auth.ts"],
    body: "Central HTTP gateway with Helmet, CORS, JSON parsing, rate limits, and JWT authentication middleware.",
  },
  {
    id: "agent",
    label: "Agent Orchestrator",
    kind: "actual" as const,
    x: 430,
    y: 260,
    files: ["server/src/agent/orchestrator.ts", "server/src/ai/prompt.ts", "server/src/ai/parse.ts"],
    body: "Runs the bounded JSON-ReAct loop. Assembles system prompt with live task snapshots. Intercepts destructive actions.",
  },
  {
    id: "ai",
    label: "AI Engine (NPMAI / Mock)",
    kind: "actual" as const,
    x: 650,
    y: 260,
    files: ["server/src/ai/index.ts", "server/src/ai/npmaiProvider.ts", "server/src/ai/mockProvider.ts"],
    body: "Pluggable provider: NPMAI text completion with automatic fallback URL, or deterministic Local demo heuristics.",
  },
  {
    id: "mcp",
    label: "MCP Server (:4001)",
    kind: "actual" as const,
    x: 650,
    y: 120,
    files: ["mcp-server/src/app.ts", "mcp-server/src/register.ts", "server/src/services/mcpClient.ts"],
    body: "Internal Streamable HTTP server exposing 13 tools. Stateless per request. Protected by x-internal-token and Origin guard.",
  },
  {
    id: "shared",
    label: "Shared Services Layer",
    kind: "actual" as const,
    x: 430,
    y: 400,
    files: ["shared/src/services/*.ts", "shared/src/tools/definitions.ts", "shared/src/models/*.ts"],
    body: "Single DRY data layer invoked by BOTH REST controllers and MCP tool handlers. Single source of truth.",
  },
  {
    id: "mongo",
    label: "MongoDB Database",
    kind: "actual" as const,
    x: 220,
    y: 400,
    files: ["server/src/config/db.ts", "shared/src/models/*"],
    body: "Stores User accounts, Tasks, Notes, DailyPlans, and Conversations. Tests use mongodb-memory-server.",
  },
  {
    id: "pending",
    label: "PendingAction Store",
    kind: "actual" as const,
    x: 220,
    y: 260,
    files: ["server/src/agent/pendingActions.ts"],
    body: "In-memory TTL security cache holding pending destructive operations (10 min lifetime) awaiting human confirmation.",
  },
];

export const ARCH_EDGES = [
  { from: "user", to: "client", label: "clicks / types", flow: "all" },
  { from: "client", to: "api", label: "HTTPS /api + Bearer JWT", flow: "all" },
  { from: "api", to: "agent", label: "POST /api/chat", flow: "chat" },
  { from: "agent", to: "ai", label: "prompt / JSON completion", flow: "chat" },
  { from: "agent", to: "mcp", label: "MCP tools/* + x-user-id", flow: "chat" },
  { from: "agent", to: "pending", label: "destructive intercept", flow: "safety" },
  { from: "mcp", to: "shared", label: "tool handler calls", flow: "chat" },
  { from: "api", to: "shared", label: "REST CRUD controllers", flow: "rest" },
  { from: "shared", to: "mongo", label: "Mongoose queries", flow: "all" },
];

export const ARCH_FLOWS = [
  { id: "all", label: "All Connections", desc: "Complete system topology and communications" },
  { id: "chat", label: "Agentic Chat Loop", desc: "User → React → Express → Orchestrator → MCP → Shared → Mongo" },
  { id: "rest", label: "Direct REST CRUD", desc: "User → React → Express → Shared Services → Mongo (Manual UI)" },
  { id: "safety", label: "Safety / Confirm Flow", desc: "Orchestrator → PendingAction → Confirm Card → Execution" },
];

export const JOURNEYS = [
  {
    id: "plan",
    name: "Plan My Day",
    summary: "From natural language prompt to a time-blocked schedule aligned with personal priorities.",
    steps: [
      {
        title: "User prompt in Assistant",
        detail: "User enters 'Plan my day with 6 hours available' in the Assistant chat input.",
        layer: "User",
        endpoint: "client/src/pages/AssistantPage.tsx",
      },
      {
        title: "Client issues authenticated POST",
        detail: "api.chat({ message }) sends HTTP POST to /api/chat with Authorization: Bearer <jwt>.",
        layer: "Client",
        endpoint: "POST /api/chat",
      },
      {
        title: "API validates and initializes orchestrator",
        detail: "chatBody schema validates input. Orchestrator fetches user timezone and live task counts snapshot.",
        layer: "Backend",
        endpoint: "server/src/agent/orchestrator.ts",
      },
      {
        title: "System prompt & JSON-ReAct loop starts",
        detail: "Model receives tool definitions and user prompt. Emits: {\"tool\": \"create_daily_plan\", \"arguments\": {\"availableHours\": 6, \"save\": false}}.",
        layer: "AI Provider",
        endpoint: "server/src/ai/prompt.ts",
      },
      {
        title: "MCP server runs buildDailyPlan",
        detail: "mcpClient invokes create_daily_plan over Streamable HTTP with x-user-id header. Service pulls open tasks and orders by priority.",
        layer: "MCP Server",
        endpoint: "mcp-server/src/tools/plan.ts",
      },
      {
        title: "Shared service constructs time blocks",
        detail: "buildDailyPlan allocates 90m for urgent tasks, 60m for high, 45m for medium. Assembles 3 scheduled blocks starting at 09:00.",
        layer: "Shared Services",
        endpoint: "shared/src/services/plan.ts",
      },
      {
        title: "Model generates final response",
        detail: "Orchestrator injects observation. Model emits {\"final_answer\": \"Here is your time-blocked plan...\"}. Conversation saved to DB.",
        layer: "Backend",
        endpoint: "shared/src/models/Conversation.ts",
      },
      {
        title: "UI displays response and tool audit chips",
        detail: "AssistantPage renders the AI message with NPMAI / Local demo label and tool chip. Planner page reflects the plan.",
        layer: "Client",
        endpoint: "client/src/pages/AssistantPage.tsx",
      },
    ],
  },
  {
    id: "add",
    name: "Add Task in Natural Language",
    summary: "Natural language parsed into a typed task with relative date resolution and database persistence.",
    steps: [
      {
        title: "User requests task creation",
        detail: "User asks 'Add a task to prepare for my interview tomorrow morning' in Assistant.",
        layer: "User",
        endpoint: "client/src/pages/AssistantPage.tsx",
      },
      {
        title: "Message dispatched to server",
        detail: "Client posts to /api/chat. JWT middleware validates session and attaches req.user.",
        layer: "HTTP",
        endpoint: "POST /api/chat",
      },
      {
        title: "Model interprets relative date",
        detail: "AI checks current date context and resolves 'tomorrow' into an ISO-8601 timestamp (e.g. 2026-10-13T09:00:00Z).",
        layer: "AI Provider",
        endpoint: "server/src/ai/parse.ts",
      },
      {
        title: "Arguments validated with Zod schema",
        detail: "createTaskInput verifies title length (1-200), category enum, priority, and date format.",
        layer: "Backend",
        endpoint: "shared/src/tools/schemas.ts",
      },
      {
        title: "MCP executes shared task creation",
        detail: "shared/src/services/tasks.ts inserts new Task document with source: 'agent' and user set from headers.",
        layer: "Database",
        endpoint: "shared/src/models/Task.ts",
      },
      {
        title: "Assistant confirms creation in chat",
        detail: "Model outputs final response: 'Added task Prepare for interview due tomorrow!'. Tasks screen updates.",
        layer: "Client",
        endpoint: "client/src/pages/TasksPage.tsx",
      },
    ],
  },
  {
    id: "delete",
    name: "Delete with Safety Confirmation",
    summary: "Destructive action intercepted by orchestrator, creating a PendingAction token for user confirmation.",
    steps: [
      {
        title: "User requests deletion",
        detail: "User sends: 'Delete the task Temporary chore' in chat.",
        layer: "User",
        endpoint: "client/src/pages/AssistantPage.tsx",
      },
      {
        title: "Orchestrator detects destructive tool",
        detail: "isDestructive('delete_task') evaluates true. Tool execution is immediately intercepted and blocked.",
        layer: "Backend",
        endpoint: "server/src/agent/orchestrator.ts",
      },
      {
        title: "PendingAction token created in memory",
        detail: "createPendingAction generates an action ID with 10-minute TTL storing { tool: 'delete_task', arguments: { taskId } }.",
        layer: "Security",
        endpoint: "server/src/agent/pendingActions.ts",
      },
      {
        title: "Client displays ConfirmDialog card",
        detail: "AssistantPage receives pendingAction in JSON response and renders an action card with Confirm and Cancel buttons.",
        layer: "Client",
        endpoint: "client/src/components/ConfirmDialog.tsx",
      },
      {
        title: "User clicks Confirm",
        detail: "Client posts to POST /api/chat/confirm { actionId: 'act_...', decision: 'confirm' }.",
        layer: "HTTP",
        endpoint: "POST /api/chat/confirm",
      },
      {
        title: "Tool runs with confirm: true and deletes",
        detail: "Orchestrator invokes delete_task over MCP with confirm: true. Task document permanently removed from MongoDB.",
        layer: "Database",
        endpoint: "shared/src/services/tasks.ts",
      },
      {
        title: "Audit trace updated in conversation",
        detail: "Tool trace marked 'confirmed' and assistant responds confirming permanent removal.",
        layer: "Client",
        endpoint: "client/src/pages/AssistantPage.tsx",
      },
    ],
  },
  {
    id: "complete",
    name: "Complete Task from Dashboard (REST)",
    summary: "Direct manual CRUD operation without agent loop, updating MongoDB and reflecting in Insights.",
    steps: [
      {
        title: "User clicks checkbox",
        detail: "User clicks the completion circle on a task item on the Dashboard or Tasks screen.",
        layer: "User",
        endpoint: "client/src/components/TaskRow.tsx",
      },
      {
        title: "Direct REST endpoint called",
        detail: "Client issues POST /api/tasks/:id/complete with Authorization: Bearer <token>.",
        layer: "HTTP",
        endpoint: "POST /api/tasks/:id/complete",
      },
      {
        title: "Controller runs shared service directly",
        detail: "taskController calls shared completeTask(userId, taskId) — no MCP overhead needed for direct UI actions.",
        layer: "Backend",
        endpoint: "server/src/controllers/taskController.ts",
      },
      {
        title: "MongoDB sets status & completedAt",
        detail: "Task document updated with status: 'completed' and completedAt: new Date().",
        layer: "Database",
        endpoint: "shared/src/models/Task.ts",
      },
      {
        title: "UI updates optimistically",
        detail: "Row displays green completion styling, and Insights page recalculates completion rate on next load.",
        layer: "Client",
        endpoint: "client/src/pages/DashboardPage.tsx",
      },
    ],
  },
  {
    id: "summary",
    name: "Productivity Summary & Insights",
    summary: "MongoDB aggregation pipeline calculating completion stats, on-time percentage, and category metrics.",
    steps: [
      {
        title: "User requests weekly summary",
        detail: "User navigates to Insights tab or asks 'Summarise my progress this week' in Assistant.",
        layer: "User",
        endpoint: "client/src/pages/InsightsPage.tsx",
      },
      {
        title: "API triggers getSummary service",
        detail: "summaryController or MCP get_productivity_summary calls getSummary(userId, { period: 'week' }).",
        layer: "Backend",
        endpoint: "shared/src/services/summary.ts",
      },
      {
        title: "Mongoose runs aggregation query",
        detail: "Queries user tasks created or completed within the week. Computes completedCount, overdueCount, and completionRatePct.",
        layer: "Database",
        endpoint: "shared/src/models/Task.ts",
      },
      {
        title: "Category breakdown computed",
        detail: "Groups completed tasks by category (work, personal, study) and computes percentage shares.",
        layer: "Shared Services",
        endpoint: "shared/src/services/summary.ts",
      },
      {
        title: "Client renders visual charts",
        detail: "InsightsPage renders progress bars, category distribution, and on-time statistics.",
        layer: "Client",
        endpoint: "client/src/pages/InsightsPage.tsx",
      },
    ],
  },
];

export const STACK = [
  {
    id: "react",
    name: "React 18",
    category: "Client",
    role: "User Interface & Component Tree",
    why: "Declarative component model with hooks and React Context for responsive client-side state management.",
    files: ["client/src/App.tsx", "client/src/context/AuthContext.tsx"],
    talks: "Renders DOM elements; initiates HTTP requests via fetch through api.ts.",
  },
  {
    id: "vite",
    name: "Vite 7",
    category: "Client",
    role: "Build Tooling & Fast Dev Server",
    why: "Native ESM hot module replacement (HMR) and optimized Rollup production bundling.",
    files: ["client/vite.config.ts"],
    talks: "Serves client assets; dev server reverse-proxies /api to Express backend at localhost:4000.",
  },
  {
    id: "rrd",
    name: "React Router 7",
    category: "Client",
    role: "Client-Side Routing",
    why: "Nested layout routing supporting protected user views and public /explore and /login routes.",
    files: ["client/src/App.tsx", "client/src/main.tsx"],
    talks: "Inspects browser URL path and renders corresponding route components.",
  },
  {
    id: "tw",
    name: "Tailwind CSS 3",
    category: "Client",
    role: "Utility-First Styling System",
    why: "Ensures clean, responsive layouts, consistent color tokens, and rapid UI development without stylesheet bloat.",
    files: ["client/tailwind.config.js", "client/src/index.css"],
    talks: "Compiles CSS utility classes used by all components and pages.",
  },
  {
    id: "lucide",
    name: "Lucide React",
    category: "Client",
    role: "Iconography System",
    why: "Clean, consistent, lightweight SVG icons that visually communicate actions and states.",
    files: ["client/src/components/AppLayout.tsx", "client/src/explore/ExplorePage.tsx"],
    talks: "Embedded SVG icons in buttons, navigation links, and badges.",
  },
  {
    id: "express",
    name: "Express 4",
    category: "API",
    role: "REST API & HTTP Server",
    why: "Battle-tested, lightweight Node.js web framework with straightforward middleware composition.",
    files: ["server/src/app.ts", "server/src/index.ts"],
    talks: "Listens on port 4000; handles HTTP requests from client; interfaces with MongoDB and MCP server.",
  },
  {
    id: "helmet",
    name: "Helmet & CORS",
    category: "API",
    role: "Security Headers & Origin Filtering",
    why: "Sets defensive HTTP headers (CSP, X-Frame-Options) and restricts API access to authorized client origins.",
    files: ["server/src/app.ts"],
    talks: "Wraps every incoming and outgoing Express response.",
  },
  {
    id: "jwt",
    name: "jsonwebtoken & bcryptjs",
    category: "API",
    role: "Authentication & Password Hashing",
    why: "Bcrypt securely hashes user passwords with salt; JWT provides stateless signed session tokens.",
    files: ["server/src/utils/jwt.ts", "server/src/services/authService.ts"],
    talks: "Validates Authorization: Bearer headers on all protected API routes.",
  },
  {
    id: "zod",
    name: "Zod 3",
    category: "API",
    role: "Runtime Schema Validation",
    why: "Guarantees strict runtime validation and automatic TypeScript type inference across client, server, and MCP.",
    files: ["server/src/schemas/api.ts", "shared/src/tools/schemas.ts"],
    talks: "Converts Zod schemas to JSON Schema for the system prompt; validates tool call arguments.",
  },
  {
    id: "mcp-sdk",
    name: "@modelcontextprotocol/sdk",
    category: "AI & MCP",
    role: "Model Context Protocol Tool Transport",
    why: "Official MCP SDK implementing Streamable HTTP protocol for standard tool discovery and execution.",
    files: ["mcp-server/src/app.ts", "server/src/services/mcpClient.ts"],
    talks: "Express server acts as client; mcp-server acts as host over Streamable HTTP.",
  },
  {
    id: "npmai",
    name: "NPMAI Provider",
    category: "AI & MCP",
    role: "Remote Text Completion LLM",
    why: "Hackathon-friendly completion endpoint with automatic fallback URL and retry logic.",
    files: ["server/src/ai/npmaiProvider.ts"],
    talks: "Receives system/user messages from orchestrator; returns JSON tool calls or answers.",
  },
  {
    id: "mongo",
    name: "MongoDB & Mongoose 8",
    category: "Data & Test",
    role: "Document Database & ODM",
    why: "High-performance document store ideal for hierarchical data like time-blocked plans and chat histories.",
    files: ["server/src/config/db.ts", "shared/src/models/*"],
    talks: "Connected by both server and mcp-server processes using shared Mongoose models.",
  },
  {
    id: "vitest",
    name: "Vitest 3 & Supertest",
    category: "Data & Test",
    role: "Integration & Unit Testing Suite",
    why: "Blazing-fast Vite-native test runner with mongodb-memory-server for isolated, deterministic integration tests.",
    files: ["tests/*.ts", "vitest.config.ts"],
    talks: "Executes 31 comprehensive integration tests covering auth, agent loop, and MCP tools.",
  },
  {
    id: "tsx",
    name: "tsx",
    category: "Data & Test",
    role: "Zero-Config TypeScript Execution",
    why: "Executes TypeScript files directly with instant startup and watch mode without manual precompilation steps.",
    files: ["server/package.json", "mcp-server/package.json"],
    talks: "Powers npm run dev and npm run start across server workspaces.",
  },
];

export const CODE_FILES = [
  {
    path: "server/src/agent/orchestrator.ts",
    layer: "Backend Agent",
    purpose: "Executes the bounded JSON-ReAct loop, intercepts destructive actions into PendingAction tokens, and persists conversation traces.",
    symbols: ["runAgent", "confirmPendingAction"],
    deps: ["selectProvider", "createMcpSession", "parseModelOutput", "ConversationModel"],
    related: "POST /api/chat, POST /api/chat/confirm",
    codeSnippet: `export async function runAgent(options: RunAgentOptions): Promise<AgentTurnResult> {
  const { userId, userMessage, conversationId, liveSnapshot } = options;
  const provider = selectProvider();
  const session = await createMcpSession(userId);

  let iterations = 0;
  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const output = await provider.generate(prompt);
    const parsed = parseModelOutput(output);

    if (parsed.type === "final_answer") {
      return { reply: parsed.text, toolsUsed, conversationId };
    }

    if (isDestructive(parsed.tool)) {
      const action = createPendingAction(userId, parsed.tool, parsed.args);
      return { reply: "Destructive action requires confirmation.", pendingAction: action };
    }

    const observation = await session.callTool(parsed.tool, parsed.args);
    prompt.appendObservation(parsed.tool, observation);
  }
}`,
  },
  {
    path: "mcp-server/src/app.ts",
    layer: "MCP Server",
    purpose: "Stateless Streamable HTTP transport listener with Origin guard, DNS-rebinding defense, and header token validation.",
    symbols: ["createApp", "StreamableHTTPServerTransport"],
    deps: ["@modelcontextprotocol/sdk", "express", "createMcpServer"],
    related: "127.0.0.1:4001/mcp",
    codeSnippet: `export function createApp() {
  const app = express();
  app.post("/mcp", async (req, res) => {
    // 1. Verify internal shared secret
    if (req.headers["x-internal-token"] !== env.mcp.internalToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // 2. DNS-rebinding Origin guard
    const origin = req.headers.origin;
    if (origin && !isAllowedOrigin(origin)) {
      return res.status(403).json({ error: "Forbidden origin" });
    }
    // 3. Stateless transport per request
    const server = createMcpServer({ userId: req.headers["x-user-id"] });
    const transport = new StreamableHTTPServerTransport();
    await server.connect(transport);
    await transport.handlePostMessage(req, res);
  });
  return app;
}`,
  },
  {
    path: "shared/src/services/plan.ts",
    layer: "Shared Services",
    purpose: "Algorithms for generating time-blocked daily plans: prioritizes overdue tasks, allocates duration by priority, schedules breaks.",
    symbols: ["buildDailyPlan", "saveDailyPlan"],
    deps: ["TaskModel", "DailyPlanModel"],
    related: "POST /api/plans/generate, create_daily_plan tool",
    codeSnippet: `export async function buildDailyPlan(userId: string, options: PlanOptions) {
  const { date = todayString(), availableHours = 8 } = options;
  const openTasks = await TaskModel.find({ user: userId, status: { $ne: "completed" } });

  // Priority sorting: Overdue first, then Urgent > High > Med > Low
  const sorted = sortTasksByPriorityAndDueDate(openTasks);
  const blocks: PlanBlock[] = [];
  let currentMinutes = startHour * 60;
  const maxMinutes = currentMinutes + availableHours * 60;

  for (const task of sorted) {
    const duration = DURATION_BY_PRIORITY[task.priority]; // 90m, 60m, 45m, 30m
    if (currentMinutes + duration <= maxMinutes) {
      blocks.push({ title: task.title, start: toTime(currentMinutes), end: toTime(currentMinutes + duration), taskId: task._id });
      currentMinutes += duration;
    }
  }
  return { date, blocks, overflowCount: sorted.length - blocks.length };
}`,
  },
  {
    path: "client/src/lib/api.ts",
    layer: "Frontend API",
    purpose: "Type-safe client API wrapper: injects Bearer JWT, parses error envelopes, and exposes typed endpoints for all features.",
    symbols: ["api", "ApiError", "getToken", "setToken"],
    deps: ["fetch"],
    related: "All frontend pages",
    codeSnippet: `export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", \`Bearer \${token}\`);
  headers.set("Content-Type", "application/json");

  const res = await fetch(\`/api\${path}\`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error?.code ?? "ERROR", data.error?.message ?? "Request failed", res.status);
  }
  return data as T;
}`,
  },
  {
    path: "shared/src/tools/definitions.ts",
    layer: "Shared Tools",
    purpose: "Canonical catalog of 13 MCP tools: defines input Zod schemas, human descriptions, destructive flags, and JSON Schema converters.",
    symbols: ["toolDefinitions", "toolDefinitionMap", "isDestructive"],
    deps: ["schemas.ts", "zod-to-json-schema"],
    related: "System prompt & MCP server tool registration",
    codeSnippet: `export const toolDefinitions: ToolDefinition[] = [
  {
    name: "create_task",
    title: "Create task",
    description: "Create a new task with title, category, priority, and dueDate.",
    schema: createTaskInput,
    destructive: false,
    mutates: true,
  },
  {
    name: "delete_task",
    title: "Delete task",
    description: "Permanently delete a task. Intercepted by orchestrator unless confirmed.",
    schema: deleteTaskInput,
    destructive: true,
    mutates: true,
  },
  {
    name: "create_daily_plan",
    title: "Create daily plan",
    description: "Build a time-blocked plan from open tasks with priority durations.",
    schema: createDailyPlanInput,
    destructive: false,
    mutates: true,
  },
  // ...10 more tools
];`,
  },
  {
    path: "server/src/middleware/auth.ts",
    layer: "Backend Auth",
    purpose: "Bearer JWT token verification middleware. Decodes token and attaches authenticated user payload to req.user.",
    symbols: ["requireAuth", "currentUser"],
    deps: ["jwt.ts", "AppError"],
    related: "Protected /api routes",
    codeSnippet: `export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, timezone: payload.timezone };
    next();
  } catch (err) {
    throw new AppError("Invalid or expired session token", 401, "INVALID_TOKEN");
  }
}`,
  },
  {
    path: "shared/src/services/summary.ts",
    layer: "Shared Analytics",
    purpose: "MongoDB aggregation calculating on-time rates, overdue tasks, category distribution, and completed counts.",
    symbols: ["getSummary"],
    deps: ["TaskModel"],
    related: "GET /api/summary, get_productivity_summary tool",
    codeSnippet: `export async function getSummary(userId: string, options: SummaryOptions) {
  const range = resolveDateRange(options.period);
  const tasks = await TaskModel.find({ user: userId, createdAt: { $gte: range.start, $lte: range.end } });

  const completed = tasks.filter(t => t.status === "completed");
  const overdue = tasks.filter(t => t.status !== "completed" && t.dueDate && t.dueDate < new Date());
  const onTime = completed.filter(t => !t.dueDate || t.completedAt <= t.dueDate);

  return {
    period: options.period,
    totalTasks: tasks.length,
    completedCount: completed.length,
    overdueCount: overdue.length,
    completionRatePct: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
    onTimeRatePct: completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 100,
  };
}`,
  },
];

export const TOOLS = [
  "create_task",
  "list_tasks",
  "get_today_tasks",
  "update_task",
  "complete_task",
  "delete_task",
  "create_note",
  "search_notes",
  "list_notes",
  "update_note",
  "delete_note",
  "get_productivity_summary",
  "create_daily_plan",
];
