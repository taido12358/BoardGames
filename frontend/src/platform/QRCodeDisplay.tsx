import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    QRCode: new (
      el: HTMLElement,
      options: { text: string; width: number; height: number; colorDark: string; colorLight: string },
    ) => void;
  }
}

let loaded = false;
let loading = false;
const waiters: (() => void)[] = [];

function loadLib(cb: () => void) {
  if (loaded) { cb(); return; }
  waiters.push(cb);
  if (loading) return;
  loading = true;
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
  s.crossOrigin = "anonymous";
  s.referrerPolicy = "no-referrer";
  s.onload = () => { loaded = true; waiters.forEach((fn) => fn()); waiters.length = 0; };
  s.onerror = () => { loading = false; waiters.length = 0; };
  document.head.appendChild(s);
}

export default function QRCodeDisplay({ url, size = 128 }: { url: string; size?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(loaded);

  useEffect(() => {
    if (!loaded) loadLib(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const el = containerRef.current;
    el.innerHTML = "";
    new window.QRCode(el, { text: url, width: size, height: size, colorDark: "#000000", colorLight: "#fffbeb" });
  }, [ready, url, size]);

  if (!ready) {
    return <div style={{ width: size, height: size }} className="animate-pulse rounded-sm bg-amber-900/20" />;
  }

  return <div ref={containerRef} style={{ width: size, height: size }} />;
}
