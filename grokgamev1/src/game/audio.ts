/** Tiny Web Audio mixer. Unlock from the first gesture. */

type Bus = { master: GainNode; sfx: GainNode; music: GainNode };

export class GameAudio {
  ctx: AudioContext | null = null;
  bus: Bus | null = null;
  muted = false;
  unlocked = false;

  unlock() {
    if (!this.ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new C({ latencyHint: "interactive" });
      const master = this.ctx.createGain();
      const sfx = this.ctx.createGain();
      const music = this.ctx.createGain();
      sfx.gain.value = 0.7;
      music.gain.value = 0.22;
      sfx.connect(master);
      music.connect(master);
      master.connect(this.ctx.destination);
      this.bus = { master, sfx, music };
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.unlocked = true;
    this.applyMute();
  }

  resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.applyMute();
  }

  private applyMute() {
    if (!this.bus || !this.ctx) return;
    const g = this.muted ? 0 : 1;
    this.bus.master.gain.setTargetAtTime(g, this.ctx.currentTime, 0.02);
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain = 0.12,
    slide = 0,
    dest: "sfx" | "music" = "sfx",
  ) {
    if (!this.ctx || !this.bus || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.bus[dest]);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain = 0.08, hp = 400) {
    if (!this.ctx || !this.bus || this.muted) return;
    const n = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = n;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = hp;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.bus.sfx);
    src.start(t);
  }

  jump() {
    this.tone(520 + Math.random() * 30, 0.12, "square", 0.07, 1.6);
  }
  land() {
    this.noise(0.08, 0.06, 200);
    this.tone(140, 0.08, "sine", 0.05, 0.5);
  }
  coin() {
    this.tone(880, 0.08, "sine", 0.07, 1.4);
    this.tone(1320, 0.14, "sine", 0.05, 1.1);
  }
  checkpoint() {
    this.tone(392, 0.16, "triangle", 0.07);
    this.tone(523, 0.22, "triangle", 0.05);
  }
  hurt() {
    this.tone(220, 0.22, "sawtooth", 0.08, 0.4);
    this.noise(0.12, 0.05, 120);
  }
  win() {
    this.tone(523, 0.18, "triangle", 0.08);
    this.tone(659, 0.22, "triangle", 0.07);
    this.tone(784, 0.4, "triangle", 0.07);
  }
  step() {
    this.noise(0.04, 0.03, 600);
  }
}
