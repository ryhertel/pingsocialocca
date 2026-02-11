let audioCtx: AudioContext | null = null;
let lastBeepTime = 0;
const BEEP_COOLDOWN = 300;

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

// ── Signature Motif: 880 → 1046 → 1318 Hz ──
export function playMotif(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();
  const notes = [880, 1046, 1318];
  const spacing = 0.1;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.value = freq * p;
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    gain.gain.setValueAtTime(0, ctx.currentTime + i * spacing);
    gain.gain.linearRampToValueAtTime(volume * 0.25, ctx.currentTime + i * spacing + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * spacing + 0.15);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + i * spacing);
    osc.stop(ctx.currentTime + i * spacing + 0.18);
  });
}

// ── Notify: 660-880Hz bright ping ──
export function playNotify(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(660 * p, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(880 * p, ctx.currentTime + 0.06);
  filter.type = 'lowpass';
  filter.frequency.value = 2500;
  gain.gain.setValueAtTime(volume * 0.28, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

// ── Confirm/Success: 880→1320Hz upward interval ──
export function playConfirm(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();

  // First note
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.value = 880 * p;
  gain1.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start();
  osc1.stop(ctx.currentTime + 0.12);

  // Second note (higher)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = 1320 * p;
  gain2.gain.setValueAtTime(0, ctx.currentTime + 0.08);
  gain2.gain.linearRampToValueAtTime(volume * 0.22, ctx.currentTime + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc2.connect(gain2).connect(ctx.destination);
  osc2.start(ctx.currentTime + 0.08);
  osc2.stop(ctx.currentTime + 0.22);
}

// ── Error: 220→330Hz downward muted tone ──
export function playError(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(330 * p, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(220 * p, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(volume * 0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.28);
}

// ── Thinking: 440-523Hz soft pulse ──
export function playThinking(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440 * p, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(523 * p, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(volume * 0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.18);
}

// ── Excited: 1200Hz+ sparkle accent ──
export function playExcited(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();

  // Sparkle: two quick high notes
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.value = 1200 * p;
  gain1.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start();
  osc1.stop(ctx.currentTime + 0.08);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = 1600 * p;
  gain2.gain.setValueAtTime(0, ctx.currentTime + 0.05);
  gain2.gain.linearRampToValueAtTime(volume * 0.18, ctx.currentTime + 0.06);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc2.connect(gain2).connect(ctx.destination);
  osc2.start(ctx.currentTime + 0.05);
  osc2.stop(ctx.currentTime + 0.14);
}

// ── Idle chirp ──
export function playIdleChirp(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(800 * p, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(1200 * p, ctx.currentTime + 0.05);
  osc.frequency.linearRampToValueAtTime(900 * p, ctx.currentTime + 0.1);
  osc.type = 'sine';
  gain.gain.setValueAtTime(volume * 0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

// ── Send: click + chirp ──
export function playSend(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();

  // Click
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.value = 400 * p;
  gain1.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start();
  osc1.stop(ctx.currentTime + 0.05);

  // Chirp
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(600 * p, ctx.currentTime);
  osc2.frequency.linearRampToValueAtTime(900 * p, ctx.currentTime + 0.08);
  gain2.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc2.connect(gain2).connect(ctx.destination);
  osc2.start();
  osc2.stop(ctx.currentTime + 0.1);
}

// ── Receive: ding + shimmer ──
export function playReceive(volume: number, muted: boolean, dnd: boolean) {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const p = pv();

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.value = 1100 * p;
  gain1.gain.setValueAtTime(volume * 0.22, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start();
  osc1.stop(ctx.currentTime + 0.12);

  // Harmonic shimmer
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = 2200 * p;
  gain2.gain.setValueAtTime(volume * 0.08, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  osc2.connect(gain2).connect(ctx.destination);
  osc2.start();
  osc2.stop(ctx.currentTime + 0.08);
}

// ── Utility: trigger emotion on eyes ──
export function triggerEmotion(emotion: string, duration = 2000) {
  window.dispatchEvent(new CustomEvent('ping:emotion', { detail: { emotion, duration } }));
}
