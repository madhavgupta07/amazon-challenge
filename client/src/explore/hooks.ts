import { useCallback, useEffect, useRef, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px", ...options },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [options?.threshold, options?.rootMargin]);

  return { ref, inView };
}

export function useFlowPlayer(stepCount: number, intervalMs = 2200) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const [mode, setMode] = useState<"auto" | "manual">(reduced ? "manual" : "auto");

  useEffect(() => {
    if (reduced) {
      setPlaying(false);
      setMode("manual");
    }
  }, [reduced]);

  useEffect(() => {
    if (!playing || mode !== "auto" || stepCount < 1) return;
    const id = window.setTimeout(() => {
      setStep((current) => (current + 1) % stepCount);
    }, intervalMs);
    return () => window.clearTimeout(id);
  }, [playing, mode, step, stepCount, intervalMs]);

  const play = useCallback(() => {
    setMode("auto");
    setPlaying(true);
  }, []);
  const pause = useCallback(() => setPlaying(false), []);
  const restart = useCallback(() => {
    setStep(0);
    if (mode === "auto" && !reduced) setPlaying(true);
  }, [mode, reduced]);
  const previous = useCallback(() => {
    setMode("manual");
    setPlaying(false);
    setStep((current) => (current - 1 + stepCount) % stepCount);
  }, [stepCount]);
  const next = useCallback(() => {
    setMode("manual");
    setPlaying(false);
    setStep((current) => (current + 1) % stepCount);
  }, [stepCount]);
  const goTo = useCallback(
    (index: number) => {
      setMode("manual");
      setPlaying(false);
      setStep(Math.max(0, Math.min(stepCount - 1, index)));
    },
    [stepCount],
  );

  return { step, playing, mode, play, pause, restart, previous, next, goTo, setMode, reduced };
}
