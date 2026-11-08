/**
 * All sound is synthesised in Web Audio, so the voyage ships no audio files. Off until the
 * visitor opts in. A bed of wind in D runs everywhere; each chapter crossfades its own
 * layer over it; one-shots for the interface. The master bus compresses gently and a
 * high-shelf cut rises with scroll speed, so fast scrolling sounds muffled, not chaotic.
 */
type Layer = { gain: GainNode; stop?: () => void };

export class Sound {
  ctx: AudioContext | null = null;
  master!: GainNode;
  shelf!: BiquadFilterNode;
  layers = new Map<string, Layer>();
  on = false;
  private noiseBuf: AudioBuffer | null = null;
  private timers: number[] = [];

  async enable(on: boolean) {
    this.on = on;
    if (on && !this.ctx) this.init();
    if (!this.ctx) return;
    if (on) await this.ctx.resume();
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(on ? 0.9 : 0, t, 0.4);
    try { localStorage.setItem('arch-sound', on ? '1' : '0'); } catch { /* ignore */ }
  }

  private init() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.3;
    this.shelf = ctx.createBiquadFilter(); this.shelf.type = 'highshelf'; this.shelf.frequency.value = 2500; this.shelf.gain.value = 0;
    this.master = ctx.createGain(); this.master.gain.value = 0;
    this.shelf.connect(comp).connect(this.master).connect(ctx.destination);
    const len = ctx.sampleRate * 3; const b = ctx.createBuffer(1, len, ctx.sampleRate); const d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } // brown noise
    this.noiseBuf = b;
    this.layer('bed', 0.5);
  }

  private noise(filterType: BiquadFilterType, freq: number, q = 0.7) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    src.connect(f); src.start();
    return { src, f };
  }

  /** Builds a chapter layer lazily, returns its gain. */
  private layer(id: string, level = 0) {
    if (this.layers.has(id) || !this.ctx) return this.layers.get(id);
    const ctx = this.ctx; const g = ctx.createGain(); g.gain.value = level; g.connect(this.shelf);
    const stops: (() => void)[] = [];
    const osc = (type: OscillatorType, f: number, v: number, dest: AudioNode = g) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; const gg = ctx.createGain(); gg.gain.value = v; o.connect(gg).connect(dest); o.start(); stops.push(() => o.stop()); return { o, gg }; };
    if (id === 'bed') {
      const w = this.noise('bandpass', 420, 0.6); const wg = ctx.createGain(); wg.gain.value = 0.22; w.f.connect(wg).connect(g);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 180; lfo.connect(lg).connect(w.f.frequency); lfo.start();
      for (const [f, v] of [[73.42, 0.05], [110, 0.03], [146.83, 0.018], [220, 0.008]] as const) osc('sine', f, v);
    }
    if (id === 'worlds') {
      const w = this.noise('lowpass', 900, 0.3); const wg = ctx.createGain(); wg.gain.value = 0.18; w.f.connect(wg).connect(g); // lapping water
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.22; const lg = ctx.createGain(); lg.gain.value = 0.12; lfo.connect(lg).connect(wg.gain); lfo.start();
      const frog = () => { if (!this.ctx || this.layers.get('worlds')!.gain.gain.value < 0.02) return; const t = ctx.currentTime; const o = ctx.createOscillator(); const e = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(380 + Math.random() * 200, t); o.frequency.exponentialRampToValueAtTime(220, t + 0.12); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.05, t + 0.02); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(e).connect(g); o.start(t); o.stop(t + 0.2); };
      this.timers.push(window.setInterval(() => { if (Math.random() < 0.5) { frog(); setTimeout(frog, 160); } }, 1700));
    }
    if (id === 'machines') {
      const h = this.noise('highpass', 3200, 0.5); const hg = ctx.createGain(); hg.gain.value = 0.05; h.f.connect(hg).connect(g); // tyre hiss
      const e1 = osc('sawtooth', 55, 0.025); const e2 = osc('sawtooth', 82.5, 0.015);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; e1.gg.disconnect(); e2.gg.disconnect(); e1.gg.connect(lp); e2.gg.connect(lp); lp.connect(g);
      (g as GainNode & { engine?: OscillatorNode[] }).engine = [e1.o, e2.o];
    }
    if (id === 'monuments') {
      const w = this.noise('bandpass', 1800, 2); const wg = ctx.createGain(); wg.gain.value = 0.04; w.f.connect(wg).connect(g); // waterfall
      for (const [f, v] of [[196, 0.012], [293.66, 0.008]] as const) osc('sine', f, v);
    }
    if (id === 'brands') {
      const w = this.noise('lowpass', 260, 0.4); const wg = ctx.createGain(); wg.gain.value = 0.3; w.f.connect(wg).connect(g); // city hum
      osc('sine', 60, 0.012); osc('sine', 120, 0.006);
    }
    if (id === 'magma') {
      const w = this.noise('lowpass', 140, 0.8); const wg = ctx.createGain(); wg.gain.value = 0.9; w.f.connect(wg).connect(g);
      osc('sine', 36.7, 0.08);
    }
    if (id === 'sea') {
      const w = this.noise('lowpass', 700, 0.4); const wg = ctx.createGain(); wg.gain.value = 0.32; w.f.connect(wg).connect(g);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12; const lg = ctx.createGain(); lg.gain.value = 0.22; lfo.connect(lg).connect(wg.gain); lfo.start();
    }
    const L: Layer = { gain: g, stop: () => stops.forEach((s) => s()) };
    this.layers.set(id, L);
    return L;
  }

  /** Called every frame: chapter mix and scroll speed. */
  mix(levels: Record<string, number>, speed: number, race = 0) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    for (const [id, v] of Object.entries(levels)) { const l = this.layer(id); l?.gain.gain.setTargetAtTime(v, t, 0.6); }
    this.shelf.gain.setTargetAtTime(-Math.min(18, speed * 9), t, 0.2);
    const m = this.layers.get('machines') as (Layer & { gain: GainNode & { engine?: OscillatorNode[] } }) | undefined;
    if (m?.gain.engine) { m.gain.engine[0].frequency.setTargetAtTime(55 + race * 70, t, 0.2); m.gain.engine[1].frequency.setTargetAtTime(82.5 + race * 105, t, 0.2); }
  }

  /** Interface one-shots. */
  play(name: string) {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const tone = (f: number, at: number, dur: number, v: number, type: OscillatorType = 'sine') => {
      const o = ctx.createOscillator(); const e = ctx.createGain(); o.type = type; o.frequency.value = f;
      e.gain.setValueAtTime(0, t + at); e.gain.linearRampToValueAtTime(v, t + at + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(e).connect(this.shelf); o.start(t + at); o.stop(t + at + dur + 0.05);
    };
    if (name === 'tick') tone(2400, 0, 0.03, 0.03, 'square');
    if (name === 'open') { tone(587.33, 0, 0.6, 0.06); tone(880, 0.09, 0.9, 0.05); }
    if (name === 'pin') tone(1318.5, 0, 0.4, 0.04);
    if (name === 'chime') [587.33, 698.46, 880, 1046.5].forEach((f, i) => tone(f, i * 0.12, 1.2, 0.035));
    if (name === 'bell') { tone(146.83, 0, 4, 0.12); tone(293.66 * 1.01, 0, 3, 0.05); tone(440.7, 0, 2.2, 0.03); }
    if (name === 'foghorn') { tone(98, 0, 2.6, 0.12, 'sawtooth'); tone(97, 0, 2.6, 0.08, 'sawtooth'); }
    if (name === 'splash' || name === 'whoosh') {
      const { src, f } = this.noise(name === 'splash' ? 'bandpass' : 'lowpass', name === 'splash' ? 1600 : 600, 0.8);
      const e = ctx.createGain(); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.18, t + 0.05); e.gain.exponentialRampToValueAtTime(0.0001, t + (name === 'splash' ? 0.5 : 1.1));
      if (name === 'whoosh') { f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.8); }
      f.disconnect(); f.connect(e).connect(this.shelf); setTimeout(() => src.stop(), 1500);
    }
  }
}
