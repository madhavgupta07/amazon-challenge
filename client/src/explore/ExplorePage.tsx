import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Code2,
  Compass,
  Layers,
  Lock,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ARCH_EDGES,
  ARCH_FLOWS,
  ARCH_NODES,
  CODE_FILES,
  FEATURES,
  GLOSSARY,
  HERO,
  HIGHLIGHTS,
  JOURNEYS,
  PROBLEM,
  SAMPLE_PROMPTS,
  SECTIONS,
  STACK,
  TOOL_DETAILS,
} from "./content";
import "./explore.css";
import { useFlowPlayer, useReducedMotion } from "./hooks";
import {
  ChatSim,
  CodeSnippetView,
  FlowControls,
  HeroType,
  Kicker,
  PulseDot,
  Reveal,
  SimBadge,
  onTabListKey,
} from "./widgets";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function ExplorePage() {
  const [activeSection, setActiveSection] = useState("intro");
  const reduced = useReducedMotion();
  const { user } = useAuth();

  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.2, 0.5] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="explore min-h-screen" data-motion={reduced ? "reduce" : "ok"}>
      <a className="explore-skip" href="#intro">
        Skip to content
      </a>

      {/* Sticky Glass Navigation */}
      <header className="explore-nav" role="banner">
        <div className="explore-nav-inner">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 text-sm font-bold text-slate-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>LifePilot</span>
            <span className="hidden sm:inline-block rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
              Interactive Explainer
            </span>
          </Link>

          {/* Mobile Select */}
          <label className="explore-nav-select-wrap">
            <span className="sr-only">Jump to section</span>
            <select
              className="explore-nav-select"
              value={activeSection}
              onChange={(e) => scrollToId(e.target.value)}
              aria-label="Jump to section"
            >
              {SECTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {/* Desktop Nav Links */}
          <nav className="explore-nav-links" aria-label="Explainer sections">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                aria-current={activeSection === s.id ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId(s.id);
                }}
              >
                {s.label}
              </a>
            ))}
          </nav>

          <Link to={user ? "/" : "/login"} className="btn-secondary shrink-0 text-xs py-1.5 px-3">
            {user ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="explore-shell">
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <GlossarySection />
        <ArchitectureSection />
        <DataFlowSection />
        <StackSection />
        <CodeExplorerSection />
        <JourneySection />
      </main>
    </div>
  );
}

/* =========================================================================
   Section 1: Hero & Opening Visual
   ========================================================================= */
function HeroSection() {
  const { user } = useAuth();
  const [selectedPrompt, setSelectedPrompt] = useState(SAMPLE_PROMPTS[0]);

  return (
    <section id="intro" className="explore-hero explore-section" aria-labelledby="hero-title">
      <div className="explore-hero-bg" aria-hidden="true" />
      <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <Kicker>
            <Compass className="h-3.5 w-3.5" />
            {HERO.event}
          </Kicker>
          <h1 id="hero-title" className="explore-title">
            <span>{HERO.name}</span>
          </h1>
          <p className="text-lg font-semibold text-slate-700">
            <HeroType text={HERO.tagline} />
          </p>
          <p className="explore-lead mt-3.5">{HERO.purpose}</p>
          <p className="mt-3 max-w-xl text-sm text-slate-600 leading-relaxed">{HERO.problem}</p>

          <div className="explore-cta-row">
            <button
              type="button"
              className="explore-cta"
              onClick={() => scrollToId("problem")}
            >
              Explore the Project <ArrowRight className="h-4 w-4" />
            </button>
            <Link className="explore-cta explore-cta-ghost" to={user ? "/" : "/login"}>
              {user ? "Open Dashboard" : "Open Application"}
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hero-stats-grid">
            {HERO.stats.map((st) => (
              <div key={st.label} className="hero-stat-card">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{st.label}</p>
                <p className="text-base font-extrabold text-slate-800 mt-0.5">{st.value}</p>
                <p className="text-[11px] font-medium text-brand-600 mt-0.5">{st.hint}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Live Prompt Sandbox in Hero */}
        <div className="hero-simulator-wrap">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PulseDot color="blue" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Live Orchestrator Sandbox</span>
            </div>
            <SimBadge label="Live Simulation" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Click a sample prompt to see how LifePilot resolves natural language into verified tools:
          </p>

          <div className="prompt-chips">
            {SAMPLE_PROMPTS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`prompt-chip ${selectedPrompt.id === p.id ? "is-active" : ""}`}
                onClick={() => setSelectedPrompt(p)}
              >
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          <div className="hero-sim-output">
            <div className="hero-sim-header">
              <span className="flex items-center gap-1.5 text-blue-400">
                <Sparkles className="h-3.5 w-3.5" /> Prompt Input
              </span>
              <span className="text-slate-400">Tool: {selectedPrompt.toolUsed}</span>
            </div>
            <p className="text-amber-300 font-medium">"{selectedPrompt.query}"</p>
            <div className="mt-3 pt-2.5 border-t border-slate-700 text-slate-200">
              <span className="text-emerald-400 font-bold block text-[11px] uppercase tracking-wider mb-1">
                Grounded Assistant Response
              </span>
              <p className="text-slate-300 text-xs leading-relaxed">{selectedPrompt.response}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Highlights Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-10">
        {HIGHLIGHTS.map((h) => (
          <Reveal key={h.title}>
            <article className="explore-card h-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-800">{h.title}</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{h.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* =========================================================================
   Section 2: Problem & Solution
   ========================================================================= */
function ProblemSection() {
  return (
    <section id="problem" className="explore-section" aria-labelledby="problem-title">
      <Kicker>The Problem and the Solution</Kicker>
      <h2 id="problem-title" className="explore-h2">
        Chat That Files Real Records, Not Hallucinations
      </h2>
      <p className="max-w-2xl text-sm text-slate-600">
        Target audience: {PROBLEM.who}
      </p>

      <div className="compare-container">
        {/* Left: Traditional Chatbot Flaws */}
        <Reveal>
          <div className="explore-card h-full border-rose-200 bg-rose-50/30">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Generic AI Chatbots</p>
            </div>
            <ul className="space-y-3.5">
              {PROBLEM.pain.map((p) => (
                <li key={p.title} className="text-xs">
                  <p className="font-bold text-slate-800 text-sm">{p.title}</p>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* Center Divider */}
        <div className="compare-divider" aria-hidden="true">
          <div className="compare-vs-badge">VS</div>
        </div>

        {/* Right: LifePilot Solution */}
        <Reveal>
          <div className="explore-card h-full border-emerald-200 bg-emerald-50/30">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">LifePilot Grounded Agent</p>
            </div>
            <ul className="space-y-3.5">
              {PROBLEM.solution.map((p) => (
                <li key={p.title} className="text-xs">
                  <p className="font-bold text-slate-800 text-sm">{p.title}</p>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* =========================================================================
   Section 3: Feature Showcase & 13 MCP Tools Explorer
   ========================================================================= */
function FeaturesSection() {
  const [featureId, setFeatureId] = useState(FEATURES[0].id);
  const feature = FEATURES.find((f) => f.id === featureId) ?? FEATURES[0];

  const [toolCategory, setToolCategory] = useState<string>("All");
  const [selectedToolName, setSelectedToolName] = useState<string>(TOOL_DETAILS[0].name);
  const selectedTool = TOOL_DETAILS.find((t) => t.name === selectedToolName) ?? TOOL_DETAILS[0];

  const filteredTools = useMemo(() => {
    if (toolCategory === "All") return TOOL_DETAILS;
    return TOOL_DETAILS.filter((t) => t.category === toolCategory);
  }, [toolCategory]);

  return (
    <section id="features" className="explore-section" aria-labelledby="features-title">
      <Kicker>Every Major Feature</Kicker>
      <h2 id="features-title" className="explore-h2">
        What the Product Actually Implements
      </h2>
      <p className="text-sm text-slate-500">
        Select a feature below. Each corresponds to verified routes, database models, and components in the codebase.
      </p>

      {/* Feature Tabs */}
      <div
        className="feature-tabs mt-4"
        role="tablist"
        aria-label="Features"
        onKeyDown={(e) => onTabListKey(e, FEATURES.map((f) => f.id), featureId, setFeatureId)}
      >
        {FEATURES.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={f.id === featureId}
            className="feature-tab"
            tabIndex={f.id === featureId ? 0 : -1}
            onClick={() => setFeatureId(f.id)}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Feature Detail Card */}
      <Reveal>
        <article className="explore-card mt-4" role="tabpanel">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-slate-900">{feature.name}</h3>
            <span className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
              Feature Specification
            </span>
          </div>

          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">In Plain English</dt>
              <dd className="mt-1 text-sm text-slate-800">{feature.simple}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Why It Exists</dt>
              <dd className="mt-1 text-sm text-slate-800">{feature.why}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">How It Works</dt>
              <dd className="mt-1 text-sm text-slate-800">{feature.how}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Behind The Scenes</dt>
              <dd className="mt-1 text-sm text-slate-800">{feature.behind}</dd>
            </div>
          </dl>

          <div className="mt-4 p-3 rounded-xl bg-brand-50/50 border border-brand-100 text-xs">
            <strong className="text-brand-900">Realistic User Interaction: </strong>
            <span className="text-slate-700">{feature.example}</span>
          </div>

          <p className="mt-3 text-xs font-mono text-slate-500">
            Source Files: {feature.files.join(" · ")}
          </p>

          {"demo" in feature && feature.demo ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-4 bg-slate-50/50">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">{feature.demo.title}</p>
                <SimBadge label="Simulated Turn" />
              </div>
              <ChatSim key={feature.id} lines={feature.demo.lines} />
            </div>
          ) : null}
        </article>
      </Reveal>

      {/* 13 MCP Tools Catalog */}
      <div className="mt-10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <Kicker>Model Context Protocol Layer</Kicker>
            <h3 className="text-base font-bold text-slate-800">13 Verified MCP Tools Explorer</h3>
          </div>
          {/* Category Filter */}
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            {["All", "Tasks", "Notes", "Planner", "Analytics"].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`px-2.5 py-1 rounded-md transition ${
                  toolCategory === cat ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setToolCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        <div className="mcp-tools-grid">
          {filteredTools.map((t) => (
            <button
              key={t.name}
              type="button"
              className={`mcp-tool-pill ${selectedToolName === t.name ? "is-active" : ""}`}
              onClick={() => setSelectedToolName(t.name)}
            >
              <span className="truncate">{t.name}</span>
              {t.destructive ? (
                <span className="badge-destructive">Destructive</span>
              ) : t.mutates ? (
                <span className="badge-mutates">Mutates</span>
              ) : (
                <span className="badge-read">Read-only</span>
              )}
            </button>
          ))}
        </div>

        {/* Selected Tool Inspector */}
        <article className="explore-card mt-3 border-brand-200 bg-brand-50/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-mono font-bold text-brand-600">{selectedTool.name}</span>
              <h4 className="text-base font-bold text-slate-900">{selectedTool.title}</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Category: {selectedTool.category}</span>
              {selectedTool.destructive ? (
                <span className="badge-destructive">Intercepted for Safety</span>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-slate-700 mt-2 leading-relaxed">{selectedTool.description}</p>
          <p className="text-xs font-mono text-slate-500 mt-1">Shared Service: {selectedTool.service}</p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-white p-3 border border-slate-200">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Input Parameters (Zod)</p>
              {selectedTool.params.length === 0 ? (
                <p className="text-xs text-slate-500 mt-1 italic">No required parameters (context derived)</p>
              ) : (
                <ul className="mt-1 space-y-1 text-xs">
                  {selectedTool.params.map((pm) => (
                    <li key={pm.name} className="font-mono text-[11px]">
                      <span className="font-bold text-slate-800">{pm.name}</span>
                      <span className="text-slate-400"> ({pm.type})</span>:{" "}
                      <span className="text-slate-600 font-sans">{pm.desc}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg bg-slate-900 text-slate-200 p-3 font-mono text-[11px] overflow-x-auto">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Sample Invocation Result</p>
              <pre>{JSON.stringify(selectedTool.exampleCall, null, 2)}</pre>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

/* =========================================================================
   Section 4: Interactive Technical Glossary
   ========================================================================= */
function GlossarySection() {
  const [selectedId, setSelectedId] = useState<string>(GLOSSARY[0].id);
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState<string>("");

  const filteredGlossary = useMemo(() => {
    return GLOSSARY.filter((t) => {
      const matchCat = category === "All" || t.category === category;
      const matchQ =
        !query.trim() ||
        t.term.toLowerCase().includes(query.toLowerCase()) ||
        t.def.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQ;
    });
  }, [category, query]);

  const activeTerm = GLOSSARY.find((t) => t.id === selectedId) ?? GLOSSARY[0];

  return (
    <section id="glossary" className="explore-section" aria-labelledby="glossary-title">
      <Kicker>Technical Terms Decoded</Kicker>
      <h2 id="glossary-title" className="explore-h2">
        An Interactive Glossary Pointing at Real Code
      </h2>
      <p className="text-sm text-slate-500">
        Plain English explanations, implementation details, real-world analogies, and animated visuals for every concept.
      </p>

      {/* Filter and Search Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          {["All", "Architecture", "Agent & MCP", "Security", "Data & Infra"].map((c) => (
            <button
              key={c}
              type="button"
              className={`px-3 py-1.5 rounded-md transition ${
                category === c ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative min-w-[14rem]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-brand-500 focus:outline-none"
            placeholder="Search glossary terms..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Term Grid */}
      <div className="term-grid">
        {filteredGlossary.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`explore-card text-left cursor-pointer transition ${
              t.id === selectedId ? "explore-card-active" : ""
            }`}
            onClick={() => setSelectedId(t.id)}
            aria-pressed={t.id === selectedId}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-800">{t.term}</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t.category}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500 leading-relaxed">{t.def}</p>
          </button>
        ))}
      </div>

      {/* Selected Term Deep-Dive */}
      <article className="explore-card mt-4 border-brand-200 bg-white" aria-live="polite">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-lg font-bold text-slate-900">{activeTerm.term}</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            {activeTerm.category}
          </span>
        </div>

        <p className="mt-3 text-sm text-slate-700 leading-relaxed">{activeTerm.def}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <strong className="text-slate-800 block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
              Why In LifePilot
            </strong>
            <span className="text-slate-600 leading-relaxed">{activeTerm.why}</span>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <strong className="text-slate-800 block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
              Code Implementation
            </strong>
            <span className="font-mono text-slate-600 text-[11px]">{activeTerm.example}</span>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <strong className="text-slate-800 block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
              Real-World Analogy
            </strong>
            <span className="text-slate-600 leading-relaxed">{activeTerm.analogy}</span>
          </div>
        </div>

        <TermVisual id={activeTerm.id} />
      </article>
    </section>
  );
}

const TERM_STEPS: Record<string, string[]> = {
  jwt: ["Email + Password", "bcrypt hash verification", "Sign JWT Token", "Authorization Bearer header", "req.user attached"],
  mcp: ["Express opens MCP session", "x-internal-token + x-user-id header", "Streamable HTTP handshake", "Shared service execution", "Clean session close"],
  frontend: ["React Route render", "api.ts typed request", "Vite proxy /api", "JSON state update", "Optimistic DOM render"],
  backend: ["Helmet + CORS checks", "Rate limit window check", "requireAuth token check", "Controller action", "Global error handler"],
  rest: ["Client HTTP verb", "Router match", "Zod body validation", "Controller execution", "Standard JSON envelope"],
  http: ["HTTP Method + Path", "Headers & JSON payload", "Status Code (200 / 400 / 500)", "ApiError parsing on client"],
  authz: ["req.user.id extracted", "All Mongo queries scoped to user", "MCP header x-user-id injection", "Zero userId in client tools"],
  middleware: ["Helmet security", "CORS policy", "express.json() parser", "express-rate-limit", "validateBody(zod)"],
  db: ["Mongoose Schema index", "Connection pool (:27017)", "Compound unique index (user, date)", "Aggregation pipeline"],
  zod: ["Runtime schema declaration", "safeParse validation", "Strip unpermitted keys", "JSON Schema conversion"],
  async: ["asyncHandler wrapper", "await MongoDB promise", "await MCP transport", "await Provider completion", "Non-blocking event loop"],
  errors: ["throw AppError(code, status)", "errorHandler middleware", "Format { error: { code, message } }", "ApiError in client UI"],
  env: [".env configuration", "validateEnv() on boot", "Fail fast on missing secrets", "Zero secrets exposed to client"],
};

function TermVisual({ id }: { id: string }) {
  const steps = TERM_STEPS[id] ?? ["Request Dispatched", "Validation Check", "Process Logic", "Database Record", "Response Envelope"];
  return (
    <div className="term-visual" aria-hidden="true">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-2">Execution Flow:</span>
      {steps.map((s, i) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className="journey-pill">{s}</span>
          {i < steps.length - 1 ? <ArrowRight className="h-3 w-3 text-slate-300" /> : null}
        </span>
      ))}
    </div>
  );
}

/* =========================================================================
   Section 5: Interactive System Architecture
   ========================================================================= */
function ArchitectureSection() {
  const [selected, setSelected] = useState(ARCH_NODES[1].id);
  const [flowFilter, setFlowFilter] = useState("all");
  const [zoom, setZoom] = useState(1);
  const reduced = useReducedMotion();

  const node = ARCH_NODES.find((n) => n.id === selected) ?? ARCH_NODES[1];
  const byId = useMemo(() => Object.fromEntries(ARCH_NODES.map((n) => [n.id, n])), []);

  const visibleEdges = useMemo(() => {
    if (flowFilter === "all") return ARCH_EDGES;
    return ARCH_EDGES.filter((e) => e.flow === flowFilter || e.flow === "all");
  }, [flowFilter]);

  return (
    <section id="architecture" className="explore-section" aria-labelledby="arch-title">
      <Kicker>
        <Workflow className="h-3.5 w-3.5" /> System Architecture
      </Kicker>
      <h2 id="arch-title" className="explore-h2">
        How the Workspaces & Services Connect
      </h2>
      <p className="text-sm text-slate-500">
        Click any component below to view its responsibilities and source files. Filter connections to inspect specific data flows.
      </p>

      {/* Flow Filter Presets & Zoom Controls */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg">
          {ARCH_FLOWS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                flowFilter === f.id ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setFlowFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-500 font-medium">
            <span className="h-2 w-2 rounded-full bg-brand-600 animate-pulse" /> Animated Data Packet
          </span>
          <div className="arch-zoom" role="group" aria-label="Diagram zoom">
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.15).toFixed(2)))}>
              <Minus className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setZoom(1)} className="px-2">
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.15).toFixed(2)))}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas & Node Inspector */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="arch-wrap" tabIndex={0} aria-label="Architecture diagram, scroll to pan">
          <svg
            className="arch-svg"
            viewBox="0 0 800 480"
            role="img"
            style={{ width: `${100 * zoom}%`, minWidth: `${40 * zoom}rem` }}
          >
            <title>LifePilot System Architecture</title>
            <defs>
              <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>

            {/* Connecting Edges */}
            {visibleEdges.map((edge) => {
              const a = byId[edge.from];
              const b = byId[edge.to];
              if (!a || !b) return null;
              const x1 = a.x + 75;
              const y1 = a.y + 24;
              const x2 = b.x + 75;
              const y2 = b.y + 24;
              const id = `edge-${edge.from}-${edge.to}`;
              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2;

              return (
                <g key={id}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth="2.5" />
                  <text x={mx} y={my - 7} textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b">
                    {edge.label}
                  </text>
                  {!reduced ? (
                    <circle className="arch-packet" r="4.5">
                      <animateMotion dur="2.8s" repeatCount="indefinite" path={`M${x1},${y1} L${x2},${y2}`} />
                    </circle>
                  ) : null}
                </g>
              );
            })}

            {/* Architecture Nodes */}
            {ARCH_NODES.map((n) => {
              const isSelected = selected === n.id;
              return (
                <g
                  key={n.id}
                  className="arch-node"
                  tabIndex={0}
                  role="button"
                  aria-label={n.label}
                  aria-pressed={isSelected}
                  onClick={() => setSelected(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(n.id);
                    }
                  }}
                >
                  <rect
                    x={n.x}
                    y={n.y}
                    width="150"
                    height="48"
                    rx="12"
                    fill={isSelected ? "#eff6ff" : "#ffffff"}
                    stroke={isSelected ? "#2563eb" : n.kind === "concept" ? "#94a3b8" : "#cbd5e1"}
                    strokeDasharray={n.kind === "concept" ? "5 4" : undefined}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <text
                    x={n.x + 75}
                    y={n.y + 29}
                    textAnchor="middle"
                    fontSize="12.5"
                    fontWeight="700"
                    fill={isSelected ? "#1d4ed8" : "#0f172a"}
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Component Inspector Panel */}
        <aside className="explore-card flex flex-col justify-between" aria-live="polite">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                {node.kind === "actual" ? "Running Process" : "Conceptual User Layer"}
              </span>
              <PulseDot color={node.kind === "actual" ? "green" : "blue"} />
            </div>
            <h3 className="mt-1 text-base font-bold text-slate-900">{node.label}</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">{node.body}</p>

            <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Implementation Files</p>
            <ul className="mt-1.5 space-y-1 font-mono text-xs text-slate-700">
              {node.files.map((f) => (
                <li key={f} className="rounded bg-slate-50 px-2 py-1 border border-slate-100">
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            Click another node in the diagram or choose a flow preset above to explore connections.
          </div>
        </aside>
      </div>

      {/* Mobile Simplified Linear Flow */}
      <div className="mt-4 lg:hidden">
        <p className="mb-2 text-xs font-semibold text-slate-500">Simplified Request Flow:</p>
        <ol className="flex flex-wrap gap-2 text-xs">
          {["User", "React SPA", "Express API", "Orchestrator", "MCP Tools", "Shared Services", "MongoDB"].map(
            (label, i) => (
              <li key={label} className="inline-flex items-center gap-1.5">
                <span className="journey-pill">{label}</span>
                {i < 6 ? <ArrowRight className="h-3 w-3 text-slate-300" /> : null}
              </li>
            ),
          )}
        </ol>
      </div>
    </section>
  );
}

/* =========================================================================
   Section 6: Step-by-Step Data Flow Player
   ========================================================================= */
function DataFlowSection() {
  const [journeyId, setJourneyId] = useState(JOURNEYS[0].id);
  const journey = JOURNEYS.find((j) => j.id === journeyId) ?? JOURNEYS[0];

  return (
    <section id="flow" className="explore-section" aria-labelledby="flow-title">
      <Kicker>Step-by-Step Data Flow</Kicker>
      <h2 id="flow-title" className="explore-h2">
        Five Real User Journeys Animated
      </h2>
      <p className="text-sm text-slate-500">
        Trace exactly how requests travel across HTTP routes, orchestrator loops, tool invocations, and Mongoose storage.
      </p>

      {/* Journey Tabs */}
      <div
        className="feature-tabs mt-4"
        role="tablist"
        aria-label="User Journeys"
        onKeyDown={(e) => onTabListKey(e, JOURNEYS.map((j) => j.id), journeyId, setJourneyId)}
      >
        {JOURNEYS.map((j) => (
          <button
            key={j.id}
            type="button"
            role="tab"
            className="feature-tab"
            aria-selected={j.id === journeyId}
            tabIndex={j.id === journeyId ? 0 : -1}
            onClick={() => setJourneyId(j.id)}
          >
            {j.name}
          </button>
        ))}
      </div>

      <JourneyPlayer key={journey.id} journey={journey} />
    </section>
  );
}

function JourneyPlayer({
  journey,
}: {
  journey: (typeof JOURNEYS)[number];
}) {
  const player = useFlowPlayer(journey.steps.length, 2500);
  const currentStep = journey.steps[player.step] ?? journey.steps[0];

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <p className="text-xs font-semibold text-slate-600">{journey.summary}</p>
        <SimBadge label={`Step ${player.step + 1} of ${journey.steps.length}`} />
      </div>

      <FlowControls
        playing={player.playing}
        mode={player.mode}
        onPlay={player.play}
        onPause={player.pause}
        onRestart={player.restart}
        onPrev={player.previous}
        onNext={player.next}
        onMode={(m) => {
          player.setMode(m);
          if (m === "manual") player.pause();
          else player.play();
        }}
      />

      {/* Active Step Highlight Card */}
      <article className="explore-card my-3 border-brand-300 bg-brand-50/20">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
            Layer: {currentStep.layer}
          </span>
          <span className="font-mono text-xs text-slate-500">{currentStep.endpoint}</span>
        </div>
        <h4 className="text-base font-bold text-slate-900 mt-1">{currentStep.title}</h4>
        <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">{currentStep.detail}</p>
      </article>

      {/* Step Sequence Timeline */}
      <ol className="flow-steps">
        {journey.steps.map((step, index) => (
          <li key={step.title}>
            <button
              type="button"
              className={`flow-step w-full text-left ${index === player.step ? "is-active" : ""}`}
              onClick={() => player.goTo(index)}
            >
              <span className="flow-dot">{index + 1}</span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{step.layer}</span>
                <span className="block font-bold text-sm text-slate-900">{step.title}</span>
                <span className="block text-xs text-slate-600 mt-0.5">{step.detail}</span>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* =========================================================================
   Section 7: Technology Stack
   ========================================================================= */
const STACK_LANES = [
  { title: "Client", ids: ["react", "vite", "rrd", "tw", "lucide"] },
  { title: "Backend API", ids: ["express", "helmet", "jwt", "zod"] },
  { title: "Agent & MCP", ids: ["mcp-sdk", "npmai"] },
  { title: "Data & Testing", ids: ["mongo", "vitest", "tsx"] },
];

function StackSection() {
  const [selectedId, setSelectedId] = useState(STACK[0].id);
  const tech = STACK.find((t) => t.id === selectedId) ?? STACK[0];

  return (
    <section id="stack" className="explore-section" aria-labelledby="stack-title">
      <Kicker>
        <Layers className="h-3.5 w-3.5" /> Technology Stack
      </Kicker>
      <h2 id="stack-title" className="explore-h2">
        Only What This Repository Installs
      </h2>
      <p className="text-sm text-slate-500">
        Every technology listed below is installed in package.json and utilized across the 4 workspaces.
      </p>

      {/* Categorized Lanes */}
      <div className="stack-lanes">
        {STACK_LANES.map((lane) => (
          <div key={lane.title} className="stack-lane">
            <p className="stack-lane-title">{lane.title}</p>
            {lane.ids.map((tid) => {
              const item = STACK.find((t) => t.id === tid);
              if (!item) return null;
              return (
                <button
                  key={tid}
                  type="button"
                  className={`feature-tab w-full text-left justify-start ${tid === selectedId ? "is-active" : ""}`}
                  aria-pressed={tid === selectedId}
                  onClick={() => setSelectedId(tid)}
                >
                  <span className="font-semibold">{item.name}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Technology Detail Card */}
      <article className="explore-card mt-4 border-brand-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{tech.name}</h3>
          <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {tech.category}
          </span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <strong className="text-slate-800 block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
              Role in LifePilot
            </strong>
            <span className="text-slate-700 leading-relaxed">{tech.role}</span>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <strong className="text-slate-800 block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
              Why Chosen
            </strong>
            <span className="text-slate-700 leading-relaxed">{tech.why}</span>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <strong className="text-slate-800 block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
              Communicates With
            </strong>
            <span className="text-slate-700 leading-relaxed">{tech.talks}</span>
          </div>
        </div>

        <p className="mt-3 text-xs font-mono text-slate-500">
          Source Files: {tech.files.join(" · ")}
        </p>
      </article>
    </section>
  );
}

/* =========================================================================
   Section 8: Code Explorer with Real Snippets
   ========================================================================= */
function CodeExplorerSection() {
  const [selectedPath, setSelectedPath] = useState(CODE_FILES[0].path);
  const [filterQuery, setFilterQuery] = useState("");

  const file = CODE_FILES.find((f) => f.path === selectedPath) ?? CODE_FILES[0];
  const filtered = CODE_FILES.filter(
    (f) =>
      !filterQuery.trim() ||
      f.path.toLowerCase().includes(filterQuery.toLowerCase()) ||
      f.purpose.toLowerCase().includes(filterQuery.toLowerCase()) ||
      f.symbols.some((s) => s.toLowerCase().includes(filterQuery.toLowerCase())),
  );

  return (
    <section id="code" className="explore-section" aria-labelledby="code-title">
      <Kicker>
        <Code2 className="h-3.5 w-3.5" /> Interactive Code Explorer
      </Kicker>
      <h2 id="code-title" className="explore-h2">
        Core Repository Source Files & Implementations
      </h2>
      <p className="text-sm text-slate-500">
        Browse key files, exported symbols, architectural roles, and inspected code excerpts without exposing any secrets.
      </p>

      {/* Filter Bar */}
      <div className="mt-4 relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
        <input
          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-brand-500 focus:outline-none"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter by path, symbol, or purpose..."
        />
      </div>

      {/* Split Explorer */}
      <div className="code-split mt-4">
        <div className="code-list" role="listbox" aria-label="Project source files">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-xs text-slate-400">No matching files found.</p>
          ) : (
            filtered.map((f) => (
              <button
                key={f.path}
                type="button"
                role="option"
                aria-current={f.path === selectedPath}
                onClick={() => setSelectedPath(f.path)}
              >
                <span className="block font-semibold text-slate-800">{f.path}</span>
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{f.layer}</span>
              </button>
            ))
          )}
        </div>

        <article className="explore-card">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">{file.layer}</span>
            <span className="text-xs text-slate-400">Related: {file.related}</span>
          </div>

          <h3 className="mt-1 font-mono text-sm font-bold text-slate-900 break-all">{file.path}</h3>
          <p className="mt-2 text-xs text-slate-700 leading-relaxed">{file.purpose}</p>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-700 font-mono text-[11px]">
              Symbols: {file.symbols.join(", ")}
            </span>
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-700 font-mono text-[11px]">
              Deps: {file.deps.join(", ")}
            </span>
          </div>

          {file.codeSnippet ? (
            <CodeSnippetView code={file.codeSnippet} filename={file.path} />
          ) : null}
        </article>
      </div>
    </section>
  );
}

/* =========================================================================
   Section 9: Complete Project Journey & Recap
   ========================================================================= */
const JOURNEY_PILLS = [
  "1. User Sign In (JWT)",
  "2. Natural Language Prompt",
  "3. Orchestrator ReAct Loop",
  "4. MCP Tool Execution",
  "5. Safety Interception",
  "6. Shared Mongoose Services",
  "7. Verified Data Response",
];

function JourneySection() {
  const { user } = useAuth();
  const player = useFlowPlayer(JOURNEY_PILLS.length, 1800);

  return (
    <section id="journey" className="explore-section pb-20" aria-labelledby="journey-title">
      <Kicker>
        <Lock className="h-3.5 w-3.5" /> Full Project Journey
      </Kicker>
      <h2 id="journey-title" className="explore-h2">
        From Natural Language to Durable, Grounded Data
      </h2>

      <Reveal>
        <div className="explore-card">
          <p className="text-sm text-slate-700 leading-relaxed">
            LifePilot is a personal AI productivity agent designed for the Alexa+ Hackathon 2026.
            Instead of hallucinating schedules or fabricating facts, LifePilot guarantees that every assistant response
            is grounded in your actual MongoDB records through 13 Model Context Protocol tools.
            When deleting, it creates short-lived PendingAction security tokens to preserve data integrity.
            When planning, it uses your genuine tasks and priority durations to build an achievable, time-blocked day.
          </p>

          <div className="mt-6">
            <FlowControls
              playing={player.playing}
              mode={player.mode}
              onPlay={player.play}
              onPause={player.pause}
              onRestart={player.restart}
              onPrev={player.previous}
              onNext={player.next}
              onMode={(m) => {
                player.setMode(m);
                if (m === "manual") player.pause();
                else player.play();
              }}
            />
          </div>

          <div className="journey-path mt-3">
            {JOURNEY_PILLS.map((label, i) => (
              <span key={label} className="inline-flex items-center gap-2">
                <button
                  type="button"
                  className={`journey-pill ${i === player.step ? "is-active" : ""}`}
                  onClick={() => player.goTo(i)}
                >
                  {label}
                </button>
                {i < JOURNEY_PILLS.length - 1 ? <ArrowRight className="h-3 w-3 text-slate-300" /> : null}
              </span>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 text-xs">
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
              <strong className="text-slate-900 block text-sm mb-1">What It Does</strong>
              <p className="text-slate-600 leading-relaxed">
                Plans days algorithmically, manages tasks and markdown notes, and computes real productivity statistics
                from natural language prompts.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
              <strong className="text-slate-900 block text-sm mb-1">Who Benefits</strong>
              <p className="text-slate-600 leading-relaxed">
                Busy professionals, engineers, and creators who need an assistant that accurately reflects and updates their real records.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
              <strong className="text-slate-900 block text-sm mb-1">Architecture Summary</strong>
              <p className="text-slate-600 leading-relaxed">
                React 18 SPA → Express API (port 4000) → JSON-ReAct Orchestrator → Stateless MCP Tools (port 4001) → Shared Mongoose Services → MongoDB.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
              <strong className="text-slate-900 block text-sm mb-1">Safety & Transparency</strong>
              <p className="text-slate-600 leading-relaxed">
                Destructive tools require explicit confirmation cards. Every turn displays tool execution chips and provider provenance tags.
              </p>
            </div>
          </div>

          <div className="explore-cta-row mt-8">
            <button type="button" className="explore-cta" onClick={() => scrollToId("intro")}>
              Replay Explainer from Top
            </button>
            <Link to={user ? "/" : "/login"} className="explore-cta explore-cta-ghost">
              {user ? "Open LifePilot Dashboard" : "Get Started with LifePilot"}
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
