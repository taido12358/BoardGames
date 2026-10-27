import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotionPreference } from "../hooks/useReducedMotionPreference";

interface Props {
  value: number;
  durationMs?: number;
  delayMs?: number;
  className?: string;
  style?: CSSProperties;
}

/** Smoothly count toward server state without animating the first render. */
export default function AnimatedNumber({ value, durationMs = 360, delayMs = 0, className, style }: Props) {
  const reducedMotion = useReducedMotionPreference();
  const displayedRef = useRef(value);
  const [displayed, setDisplayed] = useState(value);

  useLayoutEffect(() => {
    const from = displayedRef.current;
    if (from === value) return;
    if (
      reducedMotion ||
      !Number.isFinite(durationMs) ||
      durationMs <= 0 ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      displayedRef.current = value;
      setDisplayed(value);
      return;
    }

    let frame = 0;
    let delayTimer = 0;
    let startTime = 0;
    const tick = (now: number) => {
      if (startTime === 0) startTime = now;
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (value - from) * eased);
      displayedRef.current = next;
      // Avoid re-rendering every frame when the rounded value has not changed.
      setDisplayed((current) => current === next ? current : next);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
      else displayedRef.current = value;
    };

    const start = () => { frame = window.requestAnimationFrame(tick); };
    if (delayMs > 0) delayTimer = window.setTimeout(start, delayMs);
    else start();
    return () => {
      window.clearTimeout(delayTimer);
      window.cancelAnimationFrame(frame);
    };
  }, [value, durationMs, delayMs, reducedMotion]);

  return <span className={className} style={style}>{displayed}</span>;
}
