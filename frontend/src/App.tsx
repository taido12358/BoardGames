import { useEffect, useState } from "react";
import { useHelloStore } from "./store/helloStore";
import { useGameHub } from "./hooks/useGameHub";

export default function App() {
  const { latest, source, feed, loading, fetchLatest, createGreeting } =
    useHelloStore();
  const [draft, setDraft] = useState("Hello, World!");

  useGameHub();

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold">🎲 BoardGame — Hello World</h1>
          <p className="text-slate-400 text-sm mt-1">
            ASP.NET Core · SignalR · PostgreSQL · Redis · RabbitMQ · OpenSearch ·
            MinIO
          </p>
        </header>

        <div className="bg-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div>
            <span className="text-slate-400 text-sm">Latest greeting</span>
            <p className="text-2xl font-semibold">{latest || "…"}</p>
            {source && (
              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-emerald-600/30 text-emerald-300">
                served from {source}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg bg-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a greeting…"
            />
            <button
              disabled={loading}
              onClick={() => createGreeting(draft)}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 font-medium"
            >
              Send
            </button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-sm text-slate-400 mb-2">
            Realtime feed (SignalR ← RabbitMQ)
          </h2>
          <ul className="space-y-1 max-h-48 overflow-auto">
            {feed.length === 0 && (
              <li className="text-slate-500 text-sm">No events yet…</li>
            )}
            {feed.map((m, i) => (
              <li key={i} className="text-sm bg-slate-700/50 rounded px-2 py-1">
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
