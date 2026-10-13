import {
  Bot,
  Check,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ErrorBanner, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatDateTime, TOOL_LABELS } from "../lib/format";
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
  "Plan my day",
  "What should I prioritise today?",
  "Add a task to prepare for my interview tomorrow",
  "Summarise my progress this week",
];

function ToolChip({ tool }: { tool: ToolCallTrace }) {
  const statusStyles: Record<string, string> = {
    ok: "bg-emerald-50 text-emerald-700",
    error: "bg-rose-50 text-rose-700",
    pending_confirmation: "bg-amber-50 text-amber-700",
    confirmed: "bg-brand-50 text-brand-700",
    cancelled: "bg-slate-100 text-slate-500",
  };
  const detail =
    tool.status === "confirmed"
      ? "Confirmed"
      : tool.status === "cancelled"
        ? "Cancelled"
        : tool.status === "pending_confirmation"
          ? "Awaiting your confirmation"
          : tool.error ?? tool.summary ?? "";
  const shortDetail = detail.length > 64 ? `${detail.slice(0, 64)}…` : detail;
  return (
    <span
      title={detail || undefined}
      className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs ${statusStyles[tool.status] ?? ""}`}
    >
      <Wrench className="h-3 w-3 shrink-0" />
      <span className="shrink-0">{TOOL_LABELS[tool.name] ?? tool.name}</span>
      {shortDetail && <span className="truncate opacity-70">· {shortDetail}</span>}
    </span>
  );
}

export default function AssistantPage() {
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

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
    setMessages((current) => [
      ...current,
      { role: "user", content: text, createdAt: new Date() },
    ]);
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

  const deleteConversation = async (id: string) => {
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
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-4 lg:h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Assistant</h1>
          <p className="text-sm text-slate-500">
            Your agent plans days, manages tasks and notes, and works with real data — read-only until you approve destructive actions.
          </p>
        </div>
        <button className="btn-secondary shrink-0" onClick={newChat}>
          <Plus className="h-4 w-4" /> New chat
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="card flex min-h-0 flex-1 overflow-hidden">
        {conversations.length > 0 && (
          <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-slate-200 p-2 md:block">
            <p className="px-2 pb-2 pt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Conversations
            </p>
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                  currentId === conversation.id
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <button className="min-w-0 flex-1 truncate" onClick={() => void openConversation(conversation.id)}>
                  <MessageSquare className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />
                  {conversation.title}
                </button>
                <button
                  className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                  onClick={() => void deleteConversation(conversation.id)}
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && !busy && (
              <div className="mx-auto mt-6 max-w-md space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <Sparkles className="h-7 w-7" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Hi {userRef.current?.name?.split(" ")[0]} — what should we organise?
                </h2>
                <p className="text-sm text-slate-500">
                  Try one of these to see the agent plan your day from real tasks.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-brand-300 hover:text-brand-600"
                      onClick={() => void send(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) =>
              message.role === "user" ? (
                <div key={index} className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div key={index} className="flex gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="max-w-[85%] space-y-2">
                    <div className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-slate-700">
                      {message.content}
                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {message.toolCalls.map((tool, toolIndex) => (
                            <ToolChip key={toolIndex} tool={tool} />
                          ))}
                        </div>
                      )}
                    </div>

                    {message.pendingAction && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm font-medium text-amber-800">
                          Confirm this action?
                        </p>
                        <p className="mt-0.5 text-xs text-amber-700">
                          {message.pendingAction.summary}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            className="btn-primary !bg-emerald-600 hover:!bg-emerald-700"
                            disabled={confirming}
                            onClick={() => void onConfirm(message.pendingAction!, "confirm")}
                          >
                            {confirming ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                            Confirm
                          </button>
                          <button
                            className="btn-secondary"
                            disabled={confirming}
                            onClick={() => void onConfirm(message.pendingAction!, "cancel")}
                          >
                            <X className="h-3.5 w-3.5" /> Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {message.provider && message.provider !== "you" && (
                      <p className="px-1 text-xs text-slate-400">
                        via {message.provider} · {formatDateTime(message.createdAt.toISOString())}
                      </p>
                    )}
                  </div>
                </div>
              ),
            )}

            {busy && (
              <div className="flex gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  <Spinner />
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-slate-200 p-3">
            <input
              className="field flex-1"
              placeholder={`Ask ${userRef.current?.name?.split(" ")[0] ?? "your"} assistant…`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <button type="submit" className="btn-primary !px-3" disabled={busy || !input.trim()}>
              {busy ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="btn-secondary"
              title="New chat"
              onClick={newChat}
              disabled={busy}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}