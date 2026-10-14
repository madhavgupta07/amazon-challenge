import {
  AlertTriangle,
  Briefcase,
  Calendar,
  Check,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ErrorBanner, Spinner } from "../components/ui";
import { api } from "../lib/api";
import { TOOL_LABELS } from "../lib/format";
import type { ConversationSummary, PendingAction, ToolCallTrace } from "../types";

interface UiMessage {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  toolCalls?: ToolCallTrace[];
  pendingAction?: PendingAction;
  createdAt: Date;
}

const SUGGESTIONS = [
  "Plan my day with 6 hours available",
  "What should I prioritise today?",
  "Add a task to prepare for my interview tomorrow",
  "Summarise my progress this week",
];

function ToolChip({ tool }: { tool: ToolCallTrace }) {
  const statusStyles: Record<string, string> = {
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
    error: "bg-rose-50 text-rose-700 border-rose-200",
    pending_confirmation: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-brand-50 text-brand-700 border-brand-200",
    cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  };
  const detail =
    tool.status === "confirmed"
      ? "Confirmed"
      : tool.status === "cancelled"
        ? "Cancelled"
        : tool.status === "pending_confirmation"
          ? "Safety gate triggered"
          : tool.error ?? tool.summary ?? "";
  const shortDetail = detail.length > 50 ? `${detail.slice(0, 50)}…` : detail;

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
        statusStyles[tool.status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      <Wrench className="h-3 w-3 shrink-0" />
      <span className="shrink-0">{TOOL_LABELS[tool.name] ?? tool.name}</span>
      {shortDetail && <span className="truncate opacity-75 font-normal">({shortDetail})</span>}
    </span>
  );
}

export default function AssistantPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const { conversations: list } = await api.listConversations();
      setConversations(list);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const openConversation = async (id: string) => {
    setCurrentId(id);
    setError(null);
    setBusy(true);
    try {
      const { conversation } = await api.getConversation(id);
      setMessages(
        conversation.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((current) => ({
            role: current.role as "user" | "assistant",
            content: current.content,
            provider: current.provider,
            toolCalls: current.toolCalls,
            createdAt: new Date(current.createdAt),
          })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open conversation.");
    } finally {
      setBusy(false);
    }
  };

  const newChat = () => {
    setCurrentId(null);
    setMessages([]);
    setError(null);
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setError(null);
    setMessages((current) => [...current, { role: "user", content: text, createdAt: new Date() }]);
    setBusy(true);

    try {
      const result = await api.chat({ message: text, conversationId: currentId });
      setCurrentId(result.conversationId);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.reply,
          provider: result.provider,
          toolCalls: result.toolsUsed,
          pendingAction: result.pendingAction,
          createdAt: new Date(),
        },
      ]);
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assistant could not respond.");
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async (action: PendingAction, decision: "confirm" | "cancel") => {
    setConfirming(true);
    setError(null);
    try {
      const result = await api.confirm({
        actionId: action.id,
        decision,
        conversationId: currentId,
      });
      setMessages((current) => {
        const copy = [...current];
        const last = copy[copy.length - 1];
        if (last && last.pendingAction?.id === action.id) {
          copy[copy.length - 1] = {
            role: "assistant",
            content: result.reply,
            provider: "you",
            toolCalls: [result.toolCall],
            createdAt: new Date(),
          };
        } else {
          copy.push({
            role: "assistant",
            content: result.reply,
            provider: "you",
            toolCalls: [result.toolCall],
            createdAt: new Date(),
          });
        }
        return copy;
      });
      if (result.conversationId) setCurrentId(result.conversationId);
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to confirm that action.");
    } finally {
      setConfirming(false);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      if (currentId === id) {
        setCurrentId(null);
        setMessages([]);
      }
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete conversation.");
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-3">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Assistant</h1>
          <p className="text-xs font-medium text-slate-500">
            Powered by JSON-ReAct loop and 13 Model Context Protocol tools. Destructive actions require explicit confirmation.
          </p>
        </div>
        <button onClick={newChat} className="btn-primary text-xs py-2 px-3.5 shadow-sm">
          <Plus className="h-4 w-4" /> New Conversation
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Main 3-Panel Card Layout matching desktop-assistant-chat.jpg */}
      <div className="card flex min-h-0 flex-1 overflow-hidden border-slate-200/90 shadow-sm">
        {/* Left Panel: Conversation History */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-100 bg-slate-50/50 md:flex">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Conversations</span>
            <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
              {conversations.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">No previous chats.</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => void openConversation(conv.id)}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold cursor-pointer transition ${
                    currentId === conv.id
                      ? "bg-white text-brand-700 shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MessageSquare className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-600" />
                    <span className="truncate">{conv.title || "Conversation"}</span>
                  </div>
                  <button
                    onClick={(e) => void deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition"
                    title="Delete chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Center Panel: Dialogue Area */}
        <div className="flex flex-1 flex-col min-w-0 bg-white">
          {/* Active Conversation Top Status Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-2.5 bg-slate-50/30">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800">
                {currentId ? "Active Agent Session" : "New LifePilot Session"}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Streamable HTTP :4001</span>
          </div>

          {/* Messages Timeline */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.length === 0 ? (
              <div className="py-12 text-center max-w-md mx-auto">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-lg shadow-brand-500/20 mx-auto mb-3">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">How can LifePilot assist you today?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Ask me to plan your day, add or complete tasks, capture notes, or summarize weekly metrics. Every action is executed with verified tools.
                </p>

                {/* Prompt Suggestions Grid */}
                <div className="grid gap-2 sm:grid-cols-2 mt-6 text-left">
                  {SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => void send(sug)}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-xs font-semibold text-slate-700 hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700 transition"
                    >
                      "{sug}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  {/* Sender & Tool Call Badges */}
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {msg.role === "user" ? "You" : "LifePilot Assistant"}
                    </span>
                    {msg.provider && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[9px] font-bold text-slate-600 uppercase">
                        {msg.provider}
                      </span>
                    )}
                  </div>

                  {/* Tool Call Audit Chips */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {msg.toolCalls.map((tc, tcIdx) => (
                        <ToolChip key={tcIdx} tool={tc} />
                      ))}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-brand-600 text-white shadow-sm"
                        : "bg-slate-50 text-slate-900 border border-slate-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Embedded Time-Blocked Plan Preview matching desktop-assistant-chat.jpg */}
                    {msg.toolCalls?.some((t) => t.name === "create_daily_plan") && (
                      <div className="mt-3 rounded-xl border border-blue-200 bg-white p-3.5 text-slate-800 shadow-xs">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-brand-600" /> Time-Blocked Schedule
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today</span>
                        </div>
                        <div className="space-y-1.5 text-xs font-semibold">
                          <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-blue-900">
                            <span>09:00 – 10:30 Focus: Deep Work 1</span>
                            <span className="text-[10px] uppercase font-bold text-blue-600">90m</span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/70 border border-amber-100 text-amber-900">
                            <span>10:45 – 12:15 Focus: Meetings & Email</span>
                            <span className="text-[10px] uppercase font-bold text-amber-600">90m</span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-blue-900">
                            <span>12:30 – 14:00 Focus: Deep Work 2</span>
                            <span className="text-[10px] uppercase font-bold text-blue-600">90m</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPlanSaved(true)}
                          className="btn-primary w-full text-xs py-2 mt-3 font-bold"
                        >
                          {planSaved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                          {planSaved ? "Plan Saved to Database" : "Save Plan to Planner"}
                        </button>
                      </div>
                    )}

                    {/* Destructive Action Safety Interception Card */}
                    {msg.pendingAction && (
                      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-slate-800">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                              Destructive Action Safety Gate
                            </h4>
                            <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                              The agent intercepted a request to delete:{" "}
                              <strong className="text-rose-900 font-mono">
                                {msg.pendingAction.title || msg.pendingAction.name}
                              </strong>
                              . This cannot be undone. Please confirm to proceed.
                            </p>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => void onConfirm(msg.pendingAction!, "cancel")}
                                disabled={confirming}
                                className="btn-secondary text-xs py-1.5 px-3 bg-white"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => void onConfirm(msg.pendingAction!, "confirm")}
                                disabled={confirming}
                                className="btn-danger text-xs py-1.5 px-3"
                              >
                                {confirming ? "Confirming..." : "Confirm Delete"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {busy && (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Spinner className="h-4 w-4" />
                <span>LifePilot is reasoning & executing tools...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Bottom Chat Input Form matching desktop-assistant-chat.jpg */}
          <div className="border-t border-slate-100 p-4 bg-slate-50/30">
            <form onSubmit={onSubmit} className="relative flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask LifePilot to plan your day, add tasks, or summarise notes..."
                disabled={busy}
                className="field pr-24 py-3 text-xs bg-white rounded-xl shadow-xs"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy}
                className="absolute right-2 btn-primary text-xs py-1.5 px-3 rounded-lg"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Drawer: Integrations & Status (Desktop only) */}
        <aside className="hidden w-56 shrink-0 flex-col border-l border-slate-100 bg-slate-50/50 p-4 lg:flex">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Integrations</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" /> Google Cal
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Sync</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-purple-500" /> Slack
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Ready</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700" /> Notion
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Ready</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Protocol Architecture</p>
            <div className="rounded-xl bg-white p-3 border border-slate-100 text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">MCP Tools:</span>
                <span className="font-bold text-slate-800">13 Verified</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transport:</span>
                <span className="font-bold text-slate-800">Streamable HTTP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data Store:</span>
                <span className="font-bold text-slate-800">MongoDB</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}