// Minimal, relaxing soundscape synthesised with Web Audio: a wind bed, a slow pad, soft chimes.

// Slow pentatonic-friendly progression (Hz): Dmaj9, Bm11, Gmaj9, A6/9.
const CHORDS = [
  [146.83, 220.0, 329.63, 369.99],
  [123.47, 185.0, 293.66, 329.63],
  [98.0, 146.83, 246.94, 369.99],
  [110.0, 164.81, 246.94, 369.99],
];
// D major pentatonic, two octaves up: chimes always sit inside the pad.
const BELLS = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66, 1318.51];
const CHORD_SECONDS = 11;

export class Soundscape {
  constructor() {
    this.ctx = null;
    this.volume = 0.7;
    this.muted = false;
    this.chordIndex = 0;
    this.chordTimer = 0;
    this.gust = 0;
  }

  get ready() {
    return Boolean(this.ctx);
  }

  /** Must be called from a user gesture (browsers block audio until then). */
  start() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    this.master.connect(comp).connect(ctx.destination);

    // Echo send: a soft feedback delay, darkened on every repeat.
    this.echo = ctx.createGain();
    this.echo.gain.value = 0.5;
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.46;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.42;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 1600;
    this.echo.connect(delay).connect(tone).connect(feedback).connect(delay);
    tone.connect(this.master);

    // Wind: looping brown noise through a moving band-pass filter.
    const seconds = 4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    this.noise = buffer;
    const wind = ctx.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 500;
    this.windFilter.Q.value = 0.7;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    wind.connect(this.windFilter).connect(this.windGain).connect(this.master);
    wind.start();

    // Pad: four voices of two slightly detuned oscillators, gliding between chords.
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 1100;
    this.padBus = ctx.createGain();
    this.padBus.gain.value = 0;
    this.padBus.gain.setTargetAtTime(0.9, ctx.currentTime, 3);
    this.padBus.connect(padFilter).connect(this.master);
    const padSend = ctx.createGain();
    padSend.gain.value = 0.25;
    padFilter.connect(padSend).connect(this.echo);
    const breathe = ctx.createOscillator();
    breathe.frequency.value = 0.06;
    const breatheDepth = ctx.createGain();
    breatheDepth.gain.value = 0.25;
    breathe.connect(breatheDepth).connect(this.padBus.gain);
    breathe.start();
    this.voices = CHORDS[0].map((freq) => {
      const gain = ctx.createGain();
      gain.gain.value = 0.022;
      gain.connect(this.padBus);
      const oscs = [
        ['sine', 0],
        ['triangle', 4],
      ].map(([type, cents]) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        osc.detune.value = cents;
        osc.connect(gain);
        osc.start();
        return osc;
      });
      return oscs;
    });
  }

  /** Called every frame while flying. speed01 and altitude are both 0..1. */
  update(dt, speed01, altitude) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.gust += (Math.random() - 0.5) * dt * 0.8;
    this.gust = Math.max(-0.4, Math.min(0.4, this.gust * (1 - dt * 0.3)));
    const level = (0.05 + 0.13 * speed01 + 0.06 * altitude) * (1 + this.gust);
    this.windGain.gain.setTargetAtTime(level, now, 0.4);
    this.windFilter.frequency.setTargetAtTime(320 + 620 * speed01 + 260 * this.gust, now, 0.6);

    this.chordTimer += dt;
    if (this.chordTimer > CHORD_SECONDS) {
      this.chordTimer = 0;
      this.chordIndex = (this.chordIndex + 1) % CHORDS.length;
      this.voices.forEach((oscs, i) => {
        for (const osc of oscs) osc.frequency.setTargetAtTime(CHORDS[this.chordIndex][i], now, 1.6);
      });
    }
  }

  /** Soft bell for a discovery; `r` (0..1) picks the note so each place has its own. */
  chime(r = Math.random(), gain = 0.12) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freq = BELLS[Math.floor(r * BELLS.length) % BELLS.length];
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(gain, now + 0.015);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
    out.connect(this.master);
    out.connect(this.echo);
    [
      [1, 1],
      [2.01, 0.28],
      [3.98, 0.08],
    ].forEach(([ratio, level]) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.frequency.value = freq * ratio;
      g.gain.value = level;
      osc.connect(g).connect(out);
      osc.start(now);
      osc.stop(now + 3.3);
    });
  }

  /** Two quiet rising notes when a thermal starts lifting you. */
  lift() {
    this.chime(0.0, 0.05);
    setTimeout(() => this.chime(0.43, 0.04), 180);
  }

  /** Camera shutter: a short filtered noise tick. */
  shutter() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.5, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    g.gain.setValueAtTime(0.0001, now + 0.1);
    g.gain.exponentialRampToValueAtTime(0.3, now + 0.104);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    src.connect(hp).connect(g).connect(this.master);
    src.start(now, Math.random() * 3, 0.2);
  }

  setVolume(v) {
    this.volume = v;
    if (this.ctx && !this.muted) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.1);
  }

  suspend() {
    this.ctx?.suspend();
  }

  resume() {
    this.ctx?.resume();
  }
}
