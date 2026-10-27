import { useEffect, useState, type RefObject } from "react";

/** Recompute coordinate-based animation overlays when their containing layout changes size. */
export function useResizeRevision(elementRef: RefObject<Element | null>, active = true): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!active) return;
    const element = elementRef.current;
    if (!element) return;

    let frame = 0;
    const scheduleUpdate = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setRevision((current) => current + 1);
      });
    };

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", scheduleUpdate);
      return () => {
        window.removeEventListener("resize", scheduleUpdate);
        if (frame) window.cancelAnimationFrame(frame);
      };
    }

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [elementRef, active]);

  return revision;
}
