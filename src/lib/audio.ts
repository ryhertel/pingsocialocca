let audioCtx: AudioContext | null = null;
let lastBeepTime = 0;
const BEEP_COOLDOWN = 300; // 300ms to prevent overlapping oscillators

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function canBeep(muted: boolean, dnd: boolean): boolean {
  if (muted || dnd) return false;
  if (Date.now() - lastBeepTime < BEEP_COOLDOWN) return false;
  return true;
}

export function playNotify(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.frequency.value = 1046;
  osc.type = 'sine';
  filter.type = 'lowpass';
  filter.frequency.value = 2000;
  gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
}

export function playConfirm(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(660, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.12);
  osc.type = 'sine';
  gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.18);
}

export function playError(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 220;
  osc.type = 'sawtooth';
  gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

export function playIdleChirp(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.05);
  osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.1);
  osc.type = 'sine';
  gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export function playSend(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const pv = 0.96 + Math.random() * 0.08;

  // Click: triangle, ~400Hz, 30ms
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.value = 400 * pv;
  gain1.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start();
  osc1.stop(ctx.currentTime + 0.05);

  // Chirp: sine, 600->900Hz, 80ms
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(600 * pv, ctx.currentTime);
  osc2.frequency.linearRampToValueAtTime(900 * pv, ctx.currentTime + 0.08);
  gain2.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc2.connect(gain2).connect(ctx.destination);
  osc2.start();
  osc2.stop(ctx.currentTime + 0.1);
}

export function playReceive(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const pv = 0.95 + Math.random() * 0.1;

  // Ding: sine, ~1100Hz
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.value = 1100 * pv;
  gain1.gain.setValueAtTime(volume * 0.22, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start();
  osc1.stop(ctx.currentTime + 0.12);

  // Harmonic shimmer: 2x freq, quieter
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = 2200 * pv;
  gain2.gain.setValueAtTime(volume * 0.08, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  osc2.connect(gain2).connect(ctx.destination);
  osc2.start();
  osc2.stop(ctx.currentTime + 0.08);
}
