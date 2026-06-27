"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DeepWikiProgress, DeepWikiStage, RosterEntry } from "@echochamber/shared";
import { getExperts } from "@/lib/api";
import { runDeepWiki } from "@/lib/deepwiki";
import { addDeepWikiExpert, loadDeepWikiExperts } from "@/lib/clientStore";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";

const STAGES: { id: DeepWikiStage; label: string }[] = [
  { id: "searching", label: "Searching the web (Tavily)" },
  { id: "found_sources", label: "Found sources" },
  { id: "parsing", label: "Parsing content (Superlinked SIE)" },
  { id: "building_persona", label: "Building persona" },
  { id: "embedding", label: "Embedding grounding" },
  { id: "ready", label: "Avatar ready" },
];

const ORDER: DeepWikiStage[] = STAGES.map((s) => s.id);

export default function DeepWikiPage() {
  const [name, setName] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<DeepWikiProgress | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [generated, setGenerated] = useState<RosterEntry[]>([]);
  const [justAdded, setJustAdded] = useState<RosterEntry | null>(null);

  useEffect(() => {
    getExperts().then(setRoster);
    setGenerated(loadDeepWikiExperts());
  }, []);

  const currentIdx = progress ? ORDER.indexOf(progress.stage) : -1;
  const picker = useMemo(() => [...generated, ...roster], [generated, roster]);

  async function build() {
    if (!name.trim() || running) return;
    setRunning(true);
    setJustAdded(null);
    setProgress(null);
    await runDeepWiki(name.trim(), {
      onProgress: (p) => setProgress(p),
      onReady: (entry) => {
        addDeepWikiExpert(entry);
        setGenerated((g) => [entry, ...g.filter((x) => x.id !== entry.id)]);
        setJustAdded(entry);
        setRunning(false);
      },
    });
  }

  return (
    <main className="min-h-screen">
      <TopBar active="deepwiki" />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight">Index any expert with DeepWiki</h1>
          <p className="mt-2 text-slate-400">
            Type a name. DeepWiki searches their real published content, builds a grounded persona,
            and drops a new avatar into your picker — usually in under a minute.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && build()}
            placeholder="e.g. Jason Fried, Naval Ravikant, Marc Andreessen…"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-lg outline-none transition placeholder:text-slate-600 focus:border-brand-400 focus:bg-white/10"
          />
          <button
            onClick={build}
            disabled={!name.trim() || running}
            className="rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:brightness-110 disabled:opacity-40"
          >
            {running ? "Indexing…" : "Build persona"}
          </button>
        </div>

        {progress && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="space-y-3">
              {STAGES.map((s, i) => {
                const reached = currentIdx >= i;
                const active = currentIdx === i && progress.stage !== "ready";
                const done = currentIdx > i || progress.stage === "ready";
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition ${
                        done
                          ? "bg-emerald-500 text-white"
                          : active
                            ? "bg-brand text-white"
                            : reached
                              ? "bg-brand/40 text-white"
                              : "bg-white/10 text-slate-500"
                      }`}
                    >
                      {done ? "✓" : active ? <Spinner /> : i + 1}
                    </span>
                    <span className={reached ? "text-slate-100" : "text-slate-500"}>
                      {s.label}
                      {s.id === "found_sources" && progress.found ? ` — ${progress.found}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
            {progress.message && (
              <p className="mt-4 text-sm text-slate-400">{progress.message}</p>
            )}
          </div>
        )}

        {justAdded && (
          <div className="mt-6 flex items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 animate-fade-up">
            <Avatar expert={justAdded} size="lg" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-emerald-300">Added to your picker</div>
              <div className="text-lg font-bold">{justAdded.name}</div>
              <div className="text-xs text-slate-400">Tier 3 · DeepWiki-generated</div>
            </div>
            <Link
              href="/create"
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink-950"
            >
              Use in a room →
            </Link>
          </div>
        )}

        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold">
            Expert picker{" "}
            <span className="text-sm font-normal text-slate-500">({picker.length} available)</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {picker.map((e) => (
              <div
                key={e.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  e.tier === 3 ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/5"
                }`}
              >
                <Avatar expert={e} size="md" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{e.name}</div>
                  <div className="truncate text-xs text-slate-400">
                    {e.tier === 3 ? "DeepWiki" : e.title}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <span className="block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}
