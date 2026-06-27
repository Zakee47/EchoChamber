"use client";

import type { HandRaise, RosterEntry, SpeakerState } from "@echochamber/shared";
import { Avatar } from "./Avatar";

export function Roundtable({
  experts,
  speakerState,
  activeSpeaker,
  handRaises,
  userSpeaking,
  onAdmit,
}: {
  experts: RosterEntry[];
  speakerState: Record<string, SpeakerState>;
  activeSpeaker: string | null;
  handRaises: HandRaise[];
  userSpeaking: boolean;
  onAdmit: (agentId: string) => void;
}) {
  const n = experts.length;
  const raisedSet = new Set(handRaises.map((h) => h.agentId));

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      {/* table */}
      <div className="absolute inset-[16%] rounded-full border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent" />
      <div className="absolute inset-[16%] rounded-full shadow-[inset_0_0_60px_rgba(124,92,255,0.15)]" />

      {/* center: user mic seat */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <div className="relative">
          {userSpeaking && (
            <span className="absolute inset-0 animate-pulse-ring rounded-full shadow-[0_0_0_4px_rgba(16,185,129,0.7)]" />
          )}
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full border-2 transition ${
              userSpeaking
                ? "border-emerald-400 bg-emerald-400/20 shadow-[0_0_30px_rgba(16,185,129,0.6)]"
                : "border-white/20 bg-white/5"
            }`}
          >
            <MicIcon className={userSpeaking ? "text-emerald-300" : "text-slate-300"} />
          </div>
        </div>
        <span className="mt-2 rounded-full bg-white/10 px-3 py-0.5 text-xs font-medium text-slate-200">
          You {userSpeaking ? "· speaking" : ""}
        </span>
      </div>

      {/* experts around the circle */}
      {experts.map((e, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const radius = 42; // percent
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        const state: SpeakerState | undefined = speakerState[e.id];
        const isActive = activeSpeaker === e.id;
        const avatarState = isActive ? "speaking" : state === "thinking" ? "thinking" : "idle";
        const raised = raisedSet.has(e.id);
        return (
          <div
            key={e.id}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <Avatar expert={e} size="xl" state={avatarState} />
            <span
              className={`mt-1.5 max-w-[96px] truncate rounded-full px-2 py-0.5 text-center text-[11px] font-medium transition ${
                isActive ? "bg-white text-ink-950" : "text-slate-300"
              }`}
            >
              {e.name.split(" ")[0]}
            </span>
            {raised && (
              <button
                onClick={() => onAdmit(e.id)}
                className="mt-1 animate-float-in rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-400/40 transition hover:bg-amber-400/30"
                title="Admit to speak"
              >
                ✋ wants to speak
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MicIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-8 w-8 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
