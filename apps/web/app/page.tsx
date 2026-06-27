"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { RosterEntry } from "@echochamber/shared";
import { getExperts, getRooms } from "@/lib/api";
import type { LobbyRoom } from "@/lib/mockData";
import { CATEGORIES } from "@/lib/config";
import { TopBar } from "@/components/TopBar";
import { RoomCard } from "@/components/RoomCard";

export default function LobbyPage() {
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getRooms(), getExperts()]).then(([r, e]) => {
      if (!active) return;
      setRooms(r);
      setRoster(e);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const rosterMap = useMemo(() => new Map(roster.map((e) => [e.id, e])), [roster]);
  const filtered = useMemo(
    () => (category === "all" ? rooms : rooms.filter((r) => r.category === category)),
    [rooms, category],
  );
  const live = filtered.filter((r) => r.live);
  const upcoming = filtered.filter((r) => !r.live);

  return (
    <main className="min-h-screen">
      <TopBar active="explore" />
      <div className="mx-auto max-w-7xl px-6 pb-24">
        {/* Hero */}
        <section className="py-12">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Grounded AI avatars of real experts
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Walk into a live room where the
              <span className="bg-gradient-to-r from-brand-400 to-pink-400 bg-clip-text text-transparent">
                {" "}
                experts debate your problem.
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-400">
              Open a voice roundtable with grounded AI avatars of Paul Graham, Elena Verna, Keith
              Rabois and more. You set the panel, the debate intensity, and jump in any time.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/create"
                className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:brightness-110"
              >
                Create a room
              </Link>
              <Link
                href="/deepwiki"
                className="rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Index a new expert
              </Link>
            </div>
          </div>
        </section>

        {/* Category strip */}
        <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 pb-2">
          <Chip label="All" active={category === "all"} onClick={() => setCategory("all")} />
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              active={category === c.id}
              onClick={() => setCategory(c.id)}
            />
          ))}
        </div>

        {loading ? (
          <SkeletonGrid />
        ) : (
          <>
            {live.length > 0 && (
              <Section title="Live now" subtitle={`${live.length} rooms in session`}>
                {live.map((r) => (
                  <RoomCard key={r.roomId} room={r} rosterMap={rosterMap} />
                ))}
              </Section>
            )}
            {upcoming.length > 0 && (
              <Section title="Upcoming" subtitle="Scheduled roundtables">
                {upcoming.map((r) => (
                  <RoomCard key={r.roomId} room={r} rosterMap={rosterMap} />
                ))}
              </Section>
            )}
            {filtered.length === 0 && (
              <p className="py-16 text-center text-slate-500">No rooms in this category yet.</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle && <span className="text-sm text-slate-500">{subtitle}</span>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-white text-ink-950"
          : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}
