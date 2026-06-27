"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  RosterEntry,
  SessionSummary,
  TranscriptEntry,
  VisualCard,
} from "@echochamber/shared";

export function SummaryModal({
  summary,
  topic,
  transcript,
  cards,
  rosterMap,
}: {
  summary: SessionSummary;
  topic: string;
  transcript: TranscriptEntry[];
  cards: VisualCard[];
  rosterMap: Map<string, RosterEntry>;
}) {
  const [copied, setCopied] = useState(false);
  const name = (id: string) => (id === "user" ? "You" : rosterMap.get(id)?.name ?? id);

  function buildText(): string {
    const lines: string[] = [];
    lines.push(`EchoChamber — Session summary`);
    lines.push(`Topic: ${topic}`, "");
    lines.push("Positions:");
    summary.positions.forEach((p) => lines.push(`  • ${name(p.agentId)}: ${p.summary}`));
    lines.push("", "Agreements:");
    summary.agreements.forEach((a) => lines.push(`  • ${a}`));
    lines.push("", "Disagreements:");
    summary.disagreements.forEach((d) => lines.push(`  • ${d}`));
    lines.push("", "Next steps:");
    summary.nextSteps.forEach((s) => lines.push(`  • ${s}`));
    lines.push("", "Transcript:");
    transcript.forEach((t) => lines.push(`  ${name(t.speaker)}: ${t.text}`));
    return lines.join("\n");
  }

  function copy() {
    navigator.clipboard?.writeText(buildText());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function download() {
    const blob = new Blob([buildText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "echochamber-summary.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="rt-surface rt-text relative flex max-h-[88vh] w-full max-w-3xl flex-col rounded-3xl">
        <div className="flex items-start justify-between border-b rt-divider p-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide rt-accent-text">
              Session summary
            </div>
            <h2 className="mt-1 text-2xl font-bold rt-text">{topic}</h2>
          </div>
          <Link href="/" className="rounded-full p-2 rt-muted rt-hover" aria-label="Close">
            ✕
          </Link>
        </div>

        <div className="transcript-scroll space-y-6 overflow-y-auto p-6">
          <Block title="Where each expert landed">
            <ul className="space-y-2">
              {summary.positions.map((p) => (
                <li key={p.agentId} className="text-sm">
                  <span className="font-semibold" style={{ color: rosterMap.get(p.agentId)?.avatar.color }}>
                    {name(p.agentId)}:
                  </span>{" "}
                  <span className="rt-muted">{p.summary}</span>
                </li>
              ))}
            </ul>
          </Block>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Block title="Points of agreement">
              <List items={summary.agreements} color="#10B981" />
            </Block>
            <Block title="Points of disagreement">
              <List items={summary.disagreements} color="#EF4444" />
            </Block>
          </div>

          <Block title="Recommended next steps">
            <List items={summary.nextSteps} color="var(--rt-accent)" ordered />
          </Block>

          {cards.length > 0 && (
            <Block title="Captured insight cards">
              <div className="flex flex-wrap gap-2">
                {cards.map((c) => (
                  <span key={c.id} className="rounded-full rt-chip rt-muted px-3 py-1 text-xs">
                    {c.text}
                  </span>
                ))}
              </div>
            </Block>
          )}

          <Block title={`Full transcript (${transcript.length} lines)`}>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl rt-chip p-3">
              {transcript.map((t) => (
                <p key={t.id} className="text-xs rt-muted">
                  <span className="font-semibold rt-text">{name(t.speaker)}:</span> {t.text}
                </p>
              ))}
            </div>
          </Block>
        </div>

        <div className="flex items-center justify-between border-t rt-divider p-5">
          <Link href="/" className="text-sm rt-muted transition hover:opacity-80">
            ← Back to lobby
          </Link>
          <div className="flex gap-2">
            <button
              onClick={copy}
              className="rounded-full border rt-divider rt-text rt-hover px-4 py-2 text-sm font-medium transition"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={download}
              className="rt-accent-chip rounded-full px-4 py-2 text-sm font-semibold transition hover:brightness-105"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold rt-text">{title}</h3>
      {children}
    </section>
  );
}

function List({ items, color, ordered }: { items: string[]; color: string; ordered?: boolean }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm rt-muted">
          <span className="mt-0.5 shrink-0 text-xs font-bold" style={{ color }}>
            {ordered ? `${i + 1}.` : "•"}
          </span>
          {it}
        </li>
      ))}
    </ul>
  );
}
