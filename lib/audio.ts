'use client';

class ChiptuneAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Plays a soft, warm 8-bit chiptune syllable blip as Professor Barnaby's scroll streams characters.
   */
  public playSyllableBlip(charIndex: number, char: string) {
    if (this.isMuted) return;
    if (char === ' ' || char === '\n') return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Warm pentatonic chiptune frequencies (C5, D5, E5, G5, A5, C6)
      const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      const charCode = char.charCodeAt(0);
      const baseFreq =
        pentatonic[(charCode + charIndex) % pentatonic.length];

      osc.type = charIndex % 3 === 0 ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.06, now + 0.032);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.025, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.038);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.042);
    } catch {
      // Ignore audio errors if user hasn't interacted yet
    }
  }

  /**
   * Tactile paper flip sound when flipping 3D sticky notes or changing workbook modes.
   */
  public playPaperFlip() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.055);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.035, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // Ignore
    }
  }

  /**
   * Snappy Persona-inspired dramatic menu slash chime when transitioning between primary stations.
   */
  public playMenuSlash() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Swift upward sweep
      const sweepOsc = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweepOsc.type = 'triangle';
      sweepOsc.frequency.setValueAtTime(240, now);
      sweepOsc.frequency.exponentialRampToValueAtTime(980, now + 0.09);
      sweepGain.gain.setValueAtTime(0.001, now);
      sweepGain.gain.linearRampToValueAtTime(0.045, now + 0.015);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      sweepOsc.connect(sweepGain);
      sweepGain.connect(ctx.destination);
      sweepOsc.start(now);
      sweepOsc.stop(now + 0.12);

      // Crisp harmonic snap accent
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = 'sine';
      snapOsc.frequency.setValueAtTime(880, now + 0.05);
      snapOsc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15);
      snapGain.gain.setValueAtTime(0.001, now + 0.05);
      snapGain.gain.linearRampToValueAtTime(0.035, now + 0.065);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start(now + 0.05);
      snapOsc.stop(now + 0.19);
    } catch {
      // Ignore
    }
  }

  /**
   * Warm 2-tone classroom bell chime when switching school subjects/periods.
   */
  public playSchoolBellChime() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const notes = [659.25, 523.25]; // E5 -> C5 classic school chime
      notes.forEach((freq, idx) => {
        const start = ctx.currentTime + idx * 0.11;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.045, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.24);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Celebratory 8-bit arpeggio when unlocking a topic node or answering a diagnostic quiz.
   */
  public playMasteryFanfare() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6
      notes.forEach((freq, idx) => {
        const start = ctx.currentTime + idx * 0.065;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.045, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.15);
      });
    } catch {
      // Ignore
    }
  }
}

export const chiptuneAudio = new ChiptuneAudioEngine();
