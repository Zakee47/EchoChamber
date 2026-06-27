import type { AudioMsg } from "@echochamber/shared";

/**
 * Sequential audio playback queue — only one speaker is audible at a time,
 * ordered by `audio.seq`. Mock turns ship a `tone:<freq>:<ms>` url which we
 * synthesize with the Web Audio API; real turns ship a normal audio url which
 * we play through an <audio> element.
 */
export class AudioQueue {
  private pending: AudioMsg[] = [];
  private playing = false;
  private ctx: AudioContext | null = null;
  private muted = false;

  /** Called with the agentId currently audible, or null when silent. */
  onPlay?: (agentId: string | null) => void;

  enqueue(msg: AudioMsg) {
    this.pending.push(msg);
    this.pending.sort((a, b) => a.seq - b.seq);
    void this.pump();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  private getCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private async pump() {
    if (this.playing) return;
    this.playing = true;
    while (this.pending.length > 0) {
      const msg = this.pending.shift()!;
      this.onPlay?.(msg.agentId);
      try {
        await this.playOne(msg);
      } catch {
        /* skip a bad clip rather than stalling the queue */
      }
    }
    this.onPlay?.(null);
    this.playing = false;
  }

  private playOne(msg: AudioMsg): Promise<void> {
    if (msg.url.startsWith("tone:")) {
      const [, freqStr, durStr] = msg.url.split(":");
      return this.playTone(Number(freqStr) || 220, Number(durStr) || 1400);
    }
    return this.playUrl(msg.url);
  }

  private playUrl(url: string): Promise<void> {
    return new Promise((resolve) => {
      const el = new Audio(url);
      el.muted = this.muted;
      el.onended = () => resolve();
      el.onerror = () => resolve();
      void el.play().catch(() => resolve());
    });
  }

  private playTone(freq: number, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const ctx = this.getCtx();
      if (!ctx || this.muted) {
        setTimeout(resolve, durationMs);
        return;
      }
      const now = ctx.currentTime;
      const dur = durationMs / 1000;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      // Soft, speech-like wobble so it reads as "talking" rather than a beep.
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5.5;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = freq * 0.04;
      lfo.connect(lfoGain).connect(osc.frequency);
      osc.connect(gain);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.05);
      // gentle tremolo envelope
      for (let t = 0.1; t < dur; t += 0.18) {
        gain.gain.exponentialRampToValueAtTime(0.025, now + t);
        gain.gain.exponentialRampToValueAtTime(0.06, now + t + 0.09);
      }
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.start(now);
      lfo.start(now);
      osc.stop(now + dur);
      lfo.stop(now + dur);
      osc.onended = () => resolve();
    });
  }

  close() {
    this.pending = [];
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
