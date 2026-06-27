"use client";

// Minimal Web Speech API wrapper for push-to-talk. Falls back gracefully when
// the browser has no SpeechRecognition (the Room view exposes a text input too).

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): SR | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SR;
    webkitSpeechRecognition?: new () => SR;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = true;
  return rec;
}

export const speechSupported = () => getRecognition() !== null;

export class PushToTalk {
  private rec: SR | null = null;
  private finalText = "";

  constructor(
    private onInterim: (text: string) => void,
    private onFinal: (text: string) => void,
  ) {}

  start(): boolean {
    this.rec = getRecognition();
    if (!this.rec) return false;
    this.finalText = "";
    this.rec.onresult = (e) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i]?.[0]?.transcript ?? "";
        // Heuristic: treat all as accumulating text for the MVP.
        final += t;
      }
      this.finalText = final.trim();
      interim = this.finalText;
      this.onInterim(interim);
    };
    this.rec.onerror = () => {};
    try {
      this.rec.start();
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    if (!this.rec) return;
    try {
      this.rec.stop();
    } catch {
      /* noop */
    }
    if (this.finalText) this.onFinal(this.finalText);
    this.rec = null;
  }
}
