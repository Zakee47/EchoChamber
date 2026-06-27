"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DebateIntensity,
  HandRaise,
  RosterEntry,
  SessionSummary,
  SpeakerState,
  TranscriptEntry,
  VisualCard,
} from "@echochamber/shared";
import { USE_MOCK } from "./config";
import { AudioQueue } from "./audioQueue";
import { createRoomConnection, type RoomConnection } from "./roomConnection";

export interface UseRoomArgs {
  roomId: string;
  panel: string[];
  roster: RosterEntry[];
  initialIntensity: DebateIntensity;
}

export function useRoom({ roomId, panel, roster, initialIntensity }: UseRoomArgs) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [cards, setCards] = useState<VisualCard[]>([]);
  const [handRaises, setHandRaises] = useState<HandRaise[]>([]);
  const [speakerState, setSpeakerState] = useState<Record<string, SpeakerState>>({});
  const [audioSpeaker, setAudioSpeaker] = useState<string | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [intensity, setIntensityState] = useState<DebateIntensity>(initialIntensity);
  const [muted, setMutedState] = useState(false);

  const connRef = useRef<RoomConnection | null>(null);
  const audioRef = useRef<AudioQueue | null>(null);

  useEffect(() => {
    const audio = new AudioQueue();
    audio.onPlay = (id) => setAudioSpeaker(id);
    audioRef.current = audio;

    const conn = createRoomConnection(roomId, {
      panel,
      roster,
      intensity: initialIntensity,
      useMock: USE_MOCK,
    });
    connRef.current = conn;

    const off = conn.onMessage((m) => {
      switch (m.type) {
        case "speaker_state":
          setSpeakerState((s) => ({ ...s, [m.agentId]: m.state }));
          break;
        case "transcript":
          setTranscript((list) => {
            const idx = list.findIndex((e) => e.id === m.entry.id);
            if (idx === -1) return [...list, m.entry];
            const next = list.slice();
            next[idx] = m.entry;
            return next;
          });
          break;
        case "audio":
          audio.enqueue(m);
          break;
        case "card":
          setCards((c) => [...c, m.card]);
          break;
        case "hand_raise":
          setHandRaises((h) =>
            h.some((x) => x.agentId === m.handRaise.agentId) ? h : [...h, m.handRaise],
          );
          break;
        case "summary":
          setSummary(m.summary);
          break;
        case "error":
          // eslint-disable-next-line no-console
          console.warn("[room] error:", m.message);
          break;
      }
    });

    return () => {
      off();
      conn.close();
      audio.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const sendUtterance = useCallback((text: string) => {
    connRef.current?.send({ type: "user_utterance", text });
  }, []);

  const mention = useCallback((agentId: string, text: string) => {
    connRef.current?.send({ type: "mention", agentId, text });
  }, []);

  const admitHand = useCallback((agentId: string) => {
    setHandRaises((h) => h.filter((x) => x.agentId !== agentId));
    connRef.current?.send({ type: "admit_hand", agentId });
  }, []);

  const continueDebate = useCallback(() => {
    connRef.current?.send({ type: "continue_debate" });
  }, []);

  const endSession = useCallback(() => {
    connRef.current?.send({ type: "end_session" });
  }, []);

  const setIntensity = useCallback((level: DebateIntensity) => {
    setIntensityState(level);
    connRef.current?.send({ type: "set_intensity", level });
  }, []);

  const setMuted = useCallback((m: boolean) => {
    setMutedState(m);
    audioRef.current?.setMuted(m);
  }, []);

  const activeSpeaker = useMemo(() => {
    if (audioSpeaker) return audioSpeaker;
    const speaking = Object.entries(speakerState).find(([, st]) => st === "speaking");
    return speaking?.[0] ?? null;
  }, [audioSpeaker, speakerState]);

  return {
    transcript,
    cards,
    handRaises,
    speakerState,
    activeSpeaker,
    summary,
    intensity,
    muted,
    sendUtterance,
    mention,
    admitHand,
    continueDebate,
    endSession,
    setIntensity,
    setMuted,
  };
}
