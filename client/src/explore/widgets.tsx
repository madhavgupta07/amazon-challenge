import {
  Pause,
  Play,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useFlowPlayer, useInView, useReducedMotion } from "./hooks";

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`explore-reveal ${inView ? "is-in" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function SimBadge({ label = "Simulated demonstration" }: { label?: string }) {
  return <span className="sim-badge">{label}</span>;
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="explore-kicker">{children}</p>;
}

export function PulseDot({ color = "green" }: { color?: "green" | "blue" | "amber" | "rose" }) {
  const colorMap = {
    green: "bg-emerald-500",
    blue: "bg-brand-600",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };
  const pingMap = {
    green: "bg-emerald-400",
    blue: "bg-brand-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
  };
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${pingMap[color]} opacity-75`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${colorMap[color]}`} />
    </span>
  );
}

export function FlowControls({
  playing,
  mode,
  onPlay,
  onPause,
  onRestart,
  onPrev,
  onNext,
  onMode,
}: {
  playing: boolean;
  mode: "auto" | "manual";
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onMode: (mode: "auto" | "manual") => void;
}) {
  return (
    <div className="flow-controls" role="group" aria-label="Playback controls">
      <button
        type="button"
        onClick={playing ? onPause : onPlay}
        aria-label={playing ? "Pause animation" : "Play animation"}
        className="flow-btn-primary"
      >
        {playing ? (
          <span className="inline-flex items-center gap-1.5">
            <Pause className="h-3.5 w-3.5" /> Pause
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5" /> Play
          </span>
        )}
      </button>
      <button type="button" onClick={onRestart} aria-label="Restart animation" title="Restart">
        <span className="inline-flex items-center gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </span>
      </button>
      <button type="button" onClick={onPrev} aria-label="Previous step" title="Previous step">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" onClick={onNext} aria-label="Next step" title="Next step">
        <ChevronRight className="h-4 w-4" />
      </button>
      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
        Mode
        <select
          value={mode}
          onChange={(e) => onMode(e.target.value as "auto" | "manual")}
          aria-label="Playback mode"
          className="flow-mode-select"
        >
          <option value="auto">Auto-Play</option>
          <option value="manual">Manual Step</option>
        </select>
      </label>
    </div>
  );
}

export function TypeLine({ text, active }: { text: string; active: boolean }) {
  const [shown, setShown] = useState(active ? "" : text);

  useEffect(() => {
    if (!active) {
      setShown(text);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 16);
    return () => window.clearInterval(id);
  }, [text, active]);

  return <span>{shown || "\u00a0"}</span>;
}

export function ChatSim({
  lines,
}: {
  lines: { who: string; text: string }[];
}) {
  const player = useFlowPlayer(lines.length, 2000);

  return (
    <div>
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
      <div className="chat-sim" aria-live="polite">
        {lines.map((line, index) =>
          index <= player.step ? (
            <div key={`${line.who}-${line.text}`} className={`chat-line chat-${line.who}`}>
              <span className="chat-badge">{line.who}</span>
              <p className="chat-bubble">
                <TypeLine text={line.text} active={index === player.step} />
              </p>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

export function HeroType({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? text : "");

  useEffect(() => {
    if (reduced) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 22);
    return () => window.clearInterval(id);
  }, [text, reduced]);

  return <span>{shown}</span>;
}

export function CodeSnippetView({ code, filename }: { code: string; filename: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-viewer">
      <div className="code-viewer-header">
        <span className="font-mono text-xs text-slate-300">{filename}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="code-copy-btn"
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function onTabListKey(
  event: KeyboardEvent<HTMLElement>,
  ids: string[],
  current: string,
  setId: (id: string) => void,
) {
  const index = ids.indexOf(current);
  if (index < 0) return;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    setId(ids[(index + 1) % ids.length]);
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    setId(ids[(index - 1 + ids.length) % ids.length]);
  } else if (event.key === "Home") {
    event.preventDefault();
    setId(ids[0]);
  } else if (event.key === "End") {
    event.preventDefault();
    setId(ids[ids.length - 1]);
  }
}
