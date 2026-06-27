"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { DebateIntensity, RosterEntry } from "@echochamber/shared";
import { getExperts } from "@/lib/api";
import { MOCK_ROOMS } from "@/lib/mockData";
import { loadDeepWikiExperts, loadRoomDraft } from "@/lib/clientStore";
import { useRoom } from "@/lib/useRoom";
import { PushToTalk, speechSupported } from "@/lib/speech";
import { Logo } from "@/components/TopBar";
import { Roundtable } from "@/components/Roundtable";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { CardsSidebar } from "@/components/CardsSidebar";
import { IntensitySlider } from "@/components/IntensitySlider";
import { SummaryModal } from "@/components/SummaryModal";
import { Avatar } from "@/components/Avatar";

interface RoomConfig {
  topic: string;
  panel: string[];
  intensity: DebateIntensity;
}

function resolveConfig(roomId: string): RoomConfig {
  const draft = loadRoomDraft(roomId);
  if (draft) return { topic: draft.topic, panel: draft.panel, intensity: draft.intensity };
  const mock = MOCK_ROOMS.find((r) => r.roomId === roomId);
  if (mock) return { topic: mock.topic, panel: mock.panel, intensity: mock.debateIntensity };
  return { topic: "Open roundtable", panel: [], intensity: 2 };
}

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const [config, setConfig] = useState<RoomConfig | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);

  useEffect(() => {
    setConfig(resolveConfig(roomId));
    getExperts().then((e) => setRoster([...loadDeepWikiExperts(), ...e]));
  }, [roomId]);

  if (!config) return null;
  if (roster.length === 0) {
    return <div className="grid min-h-screen place-items-center text-slate-500">Entering room…</div>;
  }
  return <RoomInner roomId={roomId} config={config} roster={roster} />;
}

function RoomInner({
  roomId,
  config,
  roster,
}: {
  roomId: string;
  config: RoomConfig;
  roster: RosterEntry[];
}) {
  const rosterMap = useMemo(() => new Map(roster.map((e) => [e.id, e])), [roster]);
  // Fall back to a default panel if none was provided.
  const panel = config.panel.length ? config.panel : roster.slice(0, 4).map((e) => e.id);
  const panelExperts = panel.map((id) => rosterMap.get(id)).filter(Boolean) as RosterEntry[];

  const room = useRoom({ roomId, panel, roster, initialIntensity: config.intensity });

  const [userSpeaking, setUserSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const [draft, setDraft] = useState("");
  const [mentionId, setMentionId] = useState<string>("");
  const pttRef = useRef<PushToTalk | null>(null);
  const supported = useMemo(() => speechSupported(), []);

  function startTalking() {
    setUserSpeaking(true);
    setInterim("");
    if (supported) {
      const ptt = new PushToTalk(
        (t) => setInterim(t),
        () => {},
      );
      pttRef.current = ptt;
      ptt.start();
    }
  }

  function stopTalking() {
    setUserSpeaking(false);
    const ptt = pttRef.current;
    pttRef.current = null;
    const spoken = interim.trim();
    if (ptt) ptt.stop();
    if (spoken) {
      room.sendUtterance(spoken);
    } else if (!supported) {
      // No speech recognition — send a sensible prompt so the demo keeps moving.
      room.sendUtterance("Here's my situation — what should I do?");
    }
    setInterim("");
  }

  function sendDraft() {
    const text = draft.trim();
    if (!text) return;
    if (mentionId) room.mention(mentionId, text);
    else room.sendUtterance(text);
    setDraft("");
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      {/* header */}
      <header className="flex items-center justify-between border-b border-white/5 px-6 py-3">
        <div className="flex items-center gap-4">
          <Logo />
          <div className="hidden h-6 w-px bg-white/10 sm:block" />
          <div className="hidden min-w-0 sm:block">
            <div className="truncate text-sm font-semibold text-slate-100">{config.topic}</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> Live · {panelExperts.length} experts
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => room.setMuted(!room.muted)}
            className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5"
            title={room.muted ? "Unmute" : "Mute"}
          >
            {room.muted ? "🔇" : "🔊"}
          </button>
          <button
            onClick={room.endSession}
            className="rounded-full bg-red-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            End session
          </button>
        </div>
      </header>

      {/* body */}
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1fr_360px]">
        {/* left: stage + transcript */}
        <div className="flex min-h-0 flex-col gap-4">
          <div className="flex items-center justify-center rounded-3xl glass p-4">
            <Roundtable
              experts={panelExperts}
              speakerState={room.speakerState}
              activeSpeaker={room.activeSpeaker}
              handRaises={room.handRaises}
              userSpeaking={userSpeaking}
              onAdmit={room.admitHand}
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col rounded-3xl glass p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Live transcript</h3>
              {room.activeSpeaker && (
                <span className="text-xs text-slate-500">
                  {rosterMap.get(room.activeSpeaker)?.name ?? room.activeSpeaker} speaking…
                </span>
              )}
            </div>
            <TranscriptPanel transcript={room.transcript} rosterMap={rosterMap} />
          </div>
        </div>

        {/* right: cards */}
        <aside className="hidden min-h-0 flex-col rounded-3xl glass p-4 lg:flex">
          <CardsSidebar cards={room.cards} rosterMap={rosterMap} />
          <div className="mt-4 border-t border-white/10 pt-4">
            <IntensitySlider value={room.intensity} onChange={room.setIntensity} compact />
          </div>
        </aside>
      </div>

      {/* controls */}
      <footer className="border-t border-white/5 bg-ink-950/60 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3">
          <div className="flex items-center gap-3">
            <select
              value={mentionId}
              onChange={(e) => setMentionId(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-brand-400"
            >
              <option value="">@ mention…</option>
              {panelExperts.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendDraft()}
              placeholder={mentionId ? `Ask ${rosterMap.get(mentionId)?.name ?? ""}…` : "Type to the room…"}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
            />
            <button
              onClick={sendDraft}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/20"
            >
              Send
            </button>
            <button
              onClick={room.continueDebate}
              className="hidden rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 sm:block"
            >
              Continue debate
            </button>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onMouseDown={startTalking}
              onMouseUp={stopTalking}
              onMouseLeave={() => userSpeaking && stopTalking()}
              onTouchStart={(e) => {
                e.preventDefault();
                startTalking();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stopTalking();
              }}
              className={`flex items-center gap-3 rounded-full px-8 py-3.5 text-sm font-semibold transition ${
                userSpeaking
                  ? "bg-emerald-500 text-white shadow-[0_0_40px_rgba(16,185,129,0.6)]"
                  : "bg-gradient-to-r from-brand-400 to-brand-600 text-white shadow-lg shadow-brand/30 hover:brightness-110"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${userSpeaking ? "animate-pulse bg-white" : "bg-white/80"}`} />
              {userSpeaking ? "Listening — release to send" : "Hold to talk"}
            </button>
          </div>
          {userSpeaking && (
            <p className="text-center text-xs text-slate-400">
              {interim || (supported ? "Listening…" : "Speech recognition unavailable — release to send a sample prompt or type below.")}
            </p>
          )}
        </div>
      </footer>

      {room.summary && (
        <SummaryModal
          summary={room.summary}
          topic={config.topic}
          transcript={room.transcript}
          cards={room.cards}
          rosterMap={rosterMap}
        />
      )}
    </main>
  );
}
