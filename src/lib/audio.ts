let audioCtx: AudioContext | null = null;
let lastBeepTime = 0;
const BEEP_COOLDOWN = 300;

// Shared nodes (created lazily)
let reverbNode: ConvolverNode | null = null;
let warmthNode: WaveShaperNode | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function canBeep(muted: boolean, dnd: boolean): boolean {
  if (muted || dnd) return false;
  if (Date.now() - lastBeepTime < BEEP_COOLDOWN) return false;
  return true;
}

// Pitch variance to avoid fatigue
function pv(): number {
  return 0.97 + Math.random() * 0.06;
}

// ── Shared Infrastructure ──

function getReverb(ctx: AudioContext): ConvolverNode {
  if (reverbNode) return reverbNode;
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * 0.4);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.08));
    }
  }
  reverbNode = ctx.createConvolver();
  reverbNode.buffer = buffer;
  return reverbNode;
}

function getWarmth(ctx: AudioContext): WaveShaperNode {
  if (warmthNode) return warmthNode;
  const samples = 256;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.tanh(x * 1.5);
  }
  warmthNode = ctx.createWaveShaper();
  warmthNode.curve = curve;
  warmthNode.oversample = '2x';
  return warmthNode;
}

/** Route oscillator through optional warmth → gain → dry/wet reverb split */
function buildChain(
  ctx: AudioContext,
  source: AudioNode,
  volume: number,
  opts: { reverb?: number; warmth?: boolean } = {}
): GainNode {
  const gain = ctx.createGain();
  gain.gain.value = volume;

  let chain: AudioNode = source;

  if (opts.warmth) {
    // Clone waveshaper per-chain to avoid shared state issues
    const ws = ctx.createWaveShaper();
    ws.curve = getWarmth(ctx).curve;
    ws.oversample = '2x';
    chain.connect(ws);
    chain = ws;
  }

  chain.connect(gain);

  const wet = opts.reverb ?? 0;
  if (wet > 0) {
    const dryGain = ctx.createGain();
    dryGain.gain.value = 1 - wet;
    gain.connect(dryGain).connect(ctx.destination);

    const wetGain = ctx.createGain();
    wetGain.gain.value = wet;
    gain.connect(wetGain).connect(getReverb(ctx)).connect(ctx.destination);
  } else {
    gain.connect(ctx.destination);
  }

  return gain;
}

/** Short noise burst for percussive transients */
function playNoiseBurst(ctx: AudioContext, volume: number, duration = 0.02, startTime?: number) {
  const start = startTime ?? ctx.currentTime;
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  src.connect(gain).connect(ctx.destination);
  src.start(start);
  src.stop(start + duration);
}

/** Sub-bass thump */
function playSubBass(ctx: AudioContext, volume: number, startTime?: number) {
  const start = startTime ?? ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 70;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + 0.1);
}

/** Create a detuned oscillator pair */
function detunedPair(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  startTime: number,
  endTime: number,
  volume: number,
  opts: { reverb?: number; warmth?: boolean; envelope?: (g: GainNode, t: number) => void } = {}
) {
  const detuneCents = 4;
  for (const detune of [-detuneCents, detuneCents]) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const g = buildChain(ctx, osc, volume * 0.5, { reverb: opts.reverb, warmth: opts.warmth });
    if (opts.envelope) {
      opts.envelope(g, startTime);
    } else {
      g.gain.setValueAtTime(volume * 0.5, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, endTime);
    }
    osc.start(startTime);
    osc.stop(endTime + 0.1);
  }
}

// ── Signature Motif: Power-up chord ──
export function playMotif(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();
  const notes = [440, 554, 660]; // A4 → C#5 → E5
  const spacing = 0.12;

  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * spacing;

    // Detuned layer
    detunedPair(ctx, 'square', freq * p, t, t + 0.25, volume * 0.12, {
      reverb: 0.3,
      warmth: true,
      envelope: (g, st) => {
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(volume * 0.12, st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.25);
      },
    });

    // Sine body
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * p;
    const g = buildChain(ctx, osc, 0, { reverb: 0.25, warmth: false });
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume * 0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t);
    osc.stop(t + 0.3);

    // Sub-bass thump on each note
    playSubBass(ctx, volume * 0.15, t);

    // Final note: add 5th harmony
    if (i === notes.length - 1) {
      const osc5 = ctx.createOscillator();
      osc5.type = 'sine';
      osc5.frequency.value = freq * 1.5 * p; // Perfect 5th
      const g5 = buildChain(ctx, osc5, 0, { reverb: 0.4 });
      g5.gain.setValueAtTime(0, t + 0.02);
      g5.gain.linearRampToValueAtTime(volume * 0.1, t + 0.04);
      g5.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc5.start(t + 0.02);
      osc5.stop(t + 0.4);
    }
  });
}

// ── Send: Punchy "boop" with noise transient ──
export function playSend(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();
  const t = ctx.currentTime;

  // Noise click
  playNoiseBurst(ctx, volume * 0.25, 0.015, t);

  // Triangle boop
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440 * p, t);
  osc.frequency.exponentialRampToValueAtTime(330 * p, t + 0.06);
  const g = buildChain(ctx, osc, 0, { reverb: 0.15, warmth: true });
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volume * 0.22, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.start(t);
  osc.stop(t + 0.12);
}

// ── Receive: Warm "coin collect" ──
export function playReceive(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();
  const t = ctx.currentTime;

  // Square wave body
  const osc1 = ctx.createOscillator();
  osc1.type = 'square';
  osc1.frequency.value = 520 * p;
  const g1 = buildChain(ctx, osc1, 0, { reverb: 0.35, warmth: true });
  g1.gain.setValueAtTime(0, t);
  g1.gain.linearRampToValueAtTime(volume * 0.12, t + 0.005);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc1.start(t);
  osc1.stop(t + 0.12);

  // Second note (octave up)
  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.value = 1040 * p;
  const g2 = buildChain(ctx, osc2, 0, { reverb: 0.4, warmth: true });
  g2.gain.setValueAtTime(0, t + 0.06);
  g2.gain.linearRampToValueAtTime(volume * 0.1, t + 0.065);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc2.start(t + 0.06);
  osc2.stop(t + 0.2);

  // Shimmer (sine octave+5th)
  const osc3 = ctx.createOscillator();
  osc3.type = 'sine';
  osc3.frequency.value = 1560 * p;
  const g3 = buildChain(ctx, osc3, 0, { reverb: 0.5 });
  g3.gain.setValueAtTime(0, t + 0.06);
  g3.gain.linearRampToValueAtTime(volume * 0.05, t + 0.07);
  g3.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc3.start(t + 0.06);
  osc3.stop(t + 0.18);
}

// ── Confirm: Zelda-style "da-DING!" ──
export function playConfirm(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();
  const t = ctx.currentTime;

  // First note: root
  const osc1 = ctx.createOscillator();
  osc1.type = 'square';
  osc1.frequency.value = 440 * p;
  const g1 = buildChain(ctx, osc1, 0, { reverb: 0.3, warmth: true });
  g1.gain.setValueAtTime(0, t);
  g1.gain.linearRampToValueAtTime(volume * 0.12, t + 0.008);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc1.start(t);
  osc1.stop(t + 0.12);

  // Sine layer on first note
  const osc1b = ctx.createOscillator();
  osc1b.type = 'sine';
  osc1b.frequency.value = 440 * p;
  const g1b = buildChain(ctx, osc1b, 0, { reverb: 0.2 });
  g1b.gain.setValueAtTime(0, t);
  g1b.gain.linearRampToValueAtTime(volume * 0.15, t + 0.005);
  g1b.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc1b.start(t);
  osc1b.stop(t + 0.12);

  // Second note: perfect 5th up — the "DING"
  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.value = 660 * p;
  const g2 = buildChain(ctx, osc2, 0, { reverb: 0.5, warmth: true });
  g2.gain.setValueAtTime(0, t + 0.08);
  g2.gain.linearRampToValueAtTime(volume * 0.14, t + 0.088);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc2.start(t + 0.08);
  osc2.stop(t + 0.4);

  // Sine harmony on second note
  const osc2b = ctx.createOscillator();
  osc2b.type = 'sine';
  osc2b.frequency.value = 660 * p;
  const g2b = buildChain(ctx, osc2b, 0, { reverb: 0.45 });
  g2b.gain.setValueAtTime(0, t + 0.08);
  g2b.gain.linearRampToValueAtTime(volume * 0.16, t + 0.085);
  g2b.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc2b.start(t + 0.08);
  osc2b.stop(t + 0.4);

  // Sub-bass punch
  playSubBass(ctx, volume * 0.18, t + 0.08);
}

// ── Error: Retro "bonk" ──
export function playError(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();
  const t = ctx.currentTime;

  // Noise burst
  playNoiseBurst(ctx, volume * 0.3, 0.025, t);

  // Crunchy descending tone
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(280 * p, t);
  osc.frequency.exponentialRampToValueAtTime(180 * p, t + 0.12);
  // Use warmth for crunch, NO reverb for dry contrast
  const g = buildChain(ctx, osc, 0, { reverb: 0, warmth: true });
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volume * 0.18, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.start(t);
  osc.stop(t + 0.22);

  // Second "bonk" note (minor 2nd down)
  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(200 * p, t + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(170 * p, t + 0.15);
  const g2 = buildChain(ctx, osc2, 0, { reverb: 0, warmth: true });
  g2.gain.setValueAtTime(0, t + 0.05);
  g2.gain.linearRampToValueAtTime(volume * 0.1, t + 0.055);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc2.start(t + 0.05);
  osc2.stop(t + 0.2);
}

// ── Notify: Bright two-note "alert ping" ──
export function playNotify(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();
  const t = ctx.currentTime;

  // First note with detuned chorus
  detunedPair(ctx, 'triangle', 500 * p, t, t + 0.1, volume * 0.14, {
    reverb: 0.3,
    warmth: false,
    envelope: (g, st) => {
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(volume * 0.14, st + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.1);
    },
  });

  // Second note higher
  detunedPair(ctx, 'triangle', 750 * p, t + 0.07, t + 0.18, volume * 0.12, {
    reverb: 0.35,
    warmth: false,
    envelope: (g, st) => {
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(volume * 0.12, st + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.11);
    },
  });
}

// ── Thinking: Bubbly "bloop" with LFO ──
export function playThinking(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 360 * p;

  // LFO for pitch wobble
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 8;
  lfoGain.gain.value = 25;
  lfo.connect(lfoGain).connect(osc.frequency);
  lfo.start(t);
  lfo.stop(t + 0.2);

  const g = buildChain(ctx, osc, 0, { reverb: 0.25, warmth: false });
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volume * 0.1, t + 0.01);
  g.gain.setValueAtTime(volume * 0.1, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.start(t);
  osc.stop(t + 0.2);
}

// ── Excited: Sparkle cascade ──
export function playExcited(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();
  const notes = [660, 830, 990, 1320]; // ascending sparkle
  const spacing = 0.045;

  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * spacing;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq * p;
    osc.detune.value = (Math.random() - 0.5) * 8;
    const g = buildChain(ctx, osc, 0, { reverb: 0.4, warmth: true });
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume * 0.1, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}

// ── Idle chirp: R2-D2 style "bwee-doo" ──
export function playIdleChirp(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();
  const t = ctx.currentTime;

  // Carrier with FM for metallic chirp
  const carrier = ctx.createOscillator();
  carrier.type = 'triangle';
  carrier.frequency.setValueAtTime(500 * p, t);
  carrier.frequency.linearRampToValueAtTime(800 * p, t + 0.04);
  carrier.frequency.linearRampToValueAtTime(400 * p, t + 0.1);

  // Modulator for FM
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  mod.type = 'sine';
  mod.frequency.value = 120;
  modGain.gain.value = 80;
  mod.connect(modGain).connect(carrier.frequency);
  mod.start(t);
  mod.stop(t + 0.15);

  const g = buildChain(ctx, carrier, 0, { reverb: 0.2, warmth: false });
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volume * 0.12, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  carrier.start(t);
  carrier.stop(t + 0.15);
}

// ── Utility: trigger emotion on eyes ──
export function triggerEmotion(emotion: string, duration = 2000) {
  window.dispatchEvent(new CustomEvent('ping:emotion', { detail: { emotion, duration } }));
}
