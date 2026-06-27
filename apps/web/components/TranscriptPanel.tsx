"use client";

import { useEffect, useRef } from "react";
import type { RosterEntry, TranscriptEntry } from "@echochamber/shared";

export function TranscriptPanel({
  transcript,
  rosterMap,
}: {
  transcript: TranscriptEntry[];
  rosterMap: Map<string, RosterEntry>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [transcript]);

  return (
    <div ref={ref} className="transcript-scroll flex-1 space-y-4 overflow-y-auto pr-2">
      {transcript.length === 0 && (
        <p className="pt-8 text-center text-sm rt-soft">
          The room is warming up… hold the mic to jump in.
        </p>
      )}
      {transcript.map((entry) => {
        const isUser = entry.speaker === "user";
        const expert = rosterMap.get(entry.speaker);
        const nameColor = isUser ? undefined : expert?.avatar.color;
        const refersTo = entry.refersTo
          ? transcript.find((t) => t.id === entry.refersTo)
          : undefined;
        const refName = refersTo ? rosterMap.get(refersTo.speaker)?.name ?? "" : "";
        return (
          <div key={entry.id} className="animate-fade-up">
            <div className="mb-1 flex items-center gap-2">
              <span
                className={`text-sm font-semibold ${isUser ? "rt-text" : ""}`}
                style={nameColor ? { color: nameColor } : undefined}
              >
                {isUser ? "You" : expert?.name ?? entry.speaker}
              </span>
              {refName && (
                <span className="rounded-full rt-chip rt-muted px-2 py-0.5 text-[10px]">
                  ↳ replying to {refName.split(" ")[0]}
                </span>
              )}
            </div>
            <p
              className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed rt-text ${
                isUser ? "ml-6 rt-accent-soft-bg" : "rt-chip"
              }`}
            >
              {entry.text}
              {entry.partial && <span className="ml-0.5 inline-block animate-pulse">▍</span>}
            </p>
          </div>
        );
      })}
    </div>
  );
}
