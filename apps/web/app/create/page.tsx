"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DebateIntensity, RosterEntry } from "@echochamber/shared";
import { getExperts, postCreateRoom, postSuggestPanel } from "@/lib/api";
import { loadDeepWikiExperts, saveRoomDraft } from "@/lib/clientStore";
import { CATEGORIES } from "@/lib/config";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";
import { IntensitySlider } from "@/components/IntensitySlider";

type Step = "topic" | "panel";

const EXAMPLES = [
  "Should we move from a free trial to freemium for our PLG motion?",
  "Our activation is strong but week-4 retention is leaking. Where do we look first?",
  "Raise a round now or bootstrap to profitability?",
];

export default function CreateRoomPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("topic");
  const [topic, setTopic] = useState("");
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [panel, setPanel] = useState<string[]>([]);
  const [rationale, setRationale] = useState("");
  const [intensity, setIntensity] = useState<DebateIntensity>(2);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    getExperts().then((e) => setRoster([...loadDeepWikiExperts(), ...e]));
  }, []);

  const rosterMap = useMemo(() => new Map(roster.map((e) => [e.id, e])), [roster]);
  const panelExperts = panel.map((id) => rosterMap.get(id)).filter(Boolean) as RosterEntry[];

  async function suggest() {
    if (!topic.trim()) return;
    setLoading(true);
    const res = await postSuggestPanel(topic.trim(), roster);
    setPanel(res.panel);
    setRationale(res.rationale);
    setStep("panel");
    setLoading(false);
  }

  function toggleExpert(id: string) {
    setPanel((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length >= 6) return p;
      return [...p, id];
    });
  }

  async function start() {
    if (panel.length < 2) return;
    setStarting(true);
    const { roomId } = await postCreateRoom({ topic: topic.trim(), panel, intensity });
    saveRoomDraft({ roomId, topic: topic.trim(), panel, intensity });
    router.push(`/room/${roomId}`);
  }

  return (
    <main className="min-h-screen">
      <TopBar />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Steps step={step} />

        {step === "topic" && (
          <section className="mt-10 animate-fade-up">
            <h1 className="text-3xl font-bold tracking-tight">What do you want the room to debate?</h1>
            <p className="mt-2 text-slate-400">
              Describe your problem in a sentence or two. We&apos;ll assemble a panel of experts who
              will genuinely disagree about it.
            </p>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={4}
              placeholder="e.g. Should we move from a free trial to freemium for our PLG motion?"
              className="mt-6 w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-5 text-lg text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-brand-400 focus:bg-white/10"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setTopic(ex)}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                >
                  {ex}
                </button>
              ))}
            </div>
            <button
              onClick={suggest}
              disabled={!topic.trim() || loading}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:brightness-110 disabled:opacity-40"
            >
              {loading ? "Assembling panel…" : "Suggest a panel →"}
            </button>
          </section>
        )}

        {step === "panel" && (
          <section className="mt-10 animate-fade-up">
            <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-400">
                Why these experts
              </div>
              <p className="text-sm leading-relaxed text-slate-300">{rationale}</p>
            </div>

            <div className="mt-7 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your panel ({panel.length})</h2>
              <button
                onClick={() => setPickerOpen(true)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5"
              >
                + Swap / add experts
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {panelExperts.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <Avatar expert={e} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{e.name}</div>
                    <div className="truncate text-xs text-slate-400">{e.title}</div>
                  </div>
                  <button
                    onClick={() => toggleExpert(e.id)}
                    className="rounded-full px-2 py-1 text-xs text-slate-400 transition hover:bg-white/10 hover:text-red-400"
                    aria-label={`Remove ${e.name}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
              <IntensitySlider value={intensity} onChange={setIntensity} />
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setStep("topic")}
                className="rounded-full px-4 py-2 text-sm text-slate-400 transition hover:text-slate-200"
              >
                ← Back
              </button>
              <button
                onClick={start}
                disabled={panel.length < 2 || starting}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:brightness-110 disabled:opacity-40"
              >
                {starting ? "Starting…" : "Start session →"}
              </button>
            </div>
          </section>
        )}
      </div>

      {pickerOpen && (
        <ExpertPicker
          roster={roster}
          selected={panel}
          onToggle={toggleExpert}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </main>
  );
}

function Steps({ step }: { step: Step }) {
  const items = [
    { id: "topic", label: "Describe problem" },
    { id: "panel", label: "Pick panel & intensity" },
  ];
  return (
    <div className="flex items-center gap-3 text-sm">
      {items.map((it, i) => {
        const active = it.id === step;
        const done = step === "panel" && it.id === "topic";
        return (
          <div key={it.id} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                active || done ? "bg-brand text-white" : "bg-white/10 text-slate-400"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={active ? "font-medium text-white" : "text-slate-500"}>{it.label}</span>
            {i < items.length - 1 && <span className="text-slate-700">———</span>}
          </div>
        );
      })}
    </div>
  );
}

function ExpertPicker({
  roster,
  selected,
  onToggle,
  onClose,
}: {
  roster: RosterEntry[];
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const filtered = roster.filter(
    (e) =>
      (cat === "all" || e.category === cat) &&
      (q === "" || e.name.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-strong relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Swap or add experts</h3>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-white/10">
            ✕
          </button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search experts…"
          className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
        />
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          <PickChip label="All" active={cat === "all"} onClick={() => setCat("all")} />
          {CATEGORIES.map((c) => (
            <PickChip key={c.id} label={c.label} active={cat === c.id} onClick={() => setCat(c.id)} />
          ))}
        </div>
        <div className="transcript-scroll mt-3 grid grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {filtered.map((e) => {
            const on = selected.includes(e.id);
            return (
              <button
                key={e.id}
                onClick={() => onToggle(e.id)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                  on ? "border-brand bg-brand/10" : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <Avatar expert={e} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{e.name}</div>
                  <div className="truncate text-xs text-slate-400">{e.title}</div>
                </div>
                <span className={`text-lg ${on ? "text-brand-400" : "text-slate-600"}`}>
                  {on ? "✓" : "+"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink-950"
          >
            Done ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}

function PickChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active ? "bg-white text-ink-950" : "bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}
