/**
 * Ping's voice.
 *
 * Everything here models a **struck body** — a bar, a bell, a block of wood —
 * rather than a beeping oscillator. That distinction is the whole difference
 * between "notification" and "1978 arcade cabinet", and it comes down to four
 * things the previous engine got wrong:
 *
 *   1. **Inharmonic partials.** A square wave has harmonics at exact integer
 *      multiples, which is why it reads as electronic. Real struck objects ring
 *      at ratios like 2.76 and 5.40, and each partial decays at its own rate —
 *      the high ones die first. That is what the ear hears as "physical".
 *   2. **A filter.** There was previously no BiquadFilterNode anywhere in the
 *      repo, so nothing tamed the harmonics. Every voice now has a lowpass that
 *      opens on the attack and closes through the decay.
 *   3. **A real tail.** Decays were 100-200ms into a reverb that was inaudible
 *      past 150ms, which is exactly the "staccato" complaint. Rewards now ring
 *      for up to 1.5s into a 2.2s room.
 *   4. **Equal temperament, not just intonation.** 440→660 is a pure 3:2, which
 *      locks phase and sounds hollow and organ-like. Semitone steps beat
 *      slightly against each other, which is what makes intervals sound warm.
 *
 * Alarms use the same engine, tuned in the register of Apple's system sounds:
 * clearly an alert, a little characterful, never harsh.
 *
 * API NOTE: the 12 play* names referenced by SOUND_FN_MAP in
 * src/lib/ingest/reactionExecutor.ts are string literals pinned by
 * reactionRouter.test.ts. Do not rename an exported play* function.
 */

let audioCtx: AudioContext | null = null;
let lastBeepTime = 0;

/**
 * Stays at 300ms deliberately. src/lib/spectacles.ts plays its own sound for 9
 * of the overlays, on top of the one reactionExecutor already played — this gate
 * is the only thing swallowing that duplicate. Long tails are made safe by the
 * limiter on the master bus, not by widening this window.
 */
const BEEP_COOLDOWN = 300;

// ── Graph ──
//
//   voice → filter → panner → ┬─ dry ──────────────→ masterGain → limiter → out
//                             └─ send → convolver → damping ──┘

let masterGain: GainNode | null = null;
let reverbSend: GainNode | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/**
 * Browsers hold an AudioContext suspended until the page sees a gesture.
 *
 * The previous version returned early when audioCtx was still null — which is
 * always true on a cold load, since nothing creates the context until the first
 * sound plays. It silently did nothing. Creating the context here is the fix.
 */
export function resumeAudio(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* audio unavailable */
  }
}

/**
 * A convolution reverb built from noise, but shaped like a room rather than a
 * burst: a short predelay, a long decay, and progressive high-frequency damping
 * so the tail gets darker as it fades. Undamped white noise is what made the
 * old reverb hiss instead of bloom.
 */
function buildImpulse(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const seconds = 2.2;
  const predelay = Math.floor(sr * 0.015);
  const length = Math.floor(sr * seconds);
  const buffer = ctx.createBuffer(2, length, sr);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    // One-pole lowpass whose cutoff falls over time: the tail loses its top end
    // the way a real room does.
    let last = 0;
    for (let i = predelay; i < length; i++) {
      const t = (i - predelay) / (length - predelay);
      const decay = Math.exp(-(i - predelay) / (sr * 0.6));
      const noise = Math.random() * 2 - 1;
      // Damping coefficient climbs from 0.2 to 0.85 across the tail.
      const damp = 0.2 + t * 0.65;
      last = noise * (1 - damp) + last * damp;
      data[i] = last * decay;
    }
  }
  return buffer;
}

function getMaster(ctx: AudioContext): GainNode {
  if (masterGain) return masterGain;

  const gain = ctx.createGain();
  gain.gain.value = 0.9;

  // The limiter is load-bearing. playMotif stacks a dozen voices and the old
  // engine summed them straight into destination and clipped; long overlapping
  // tails would make that worse. This is what makes them safe.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 8;
  limiter.ratio.value = 14;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.15;

  gain.connect(limiter).connect(ctx.destination);
  masterGain = gain;
  return gain;
}

function getReverbSend(ctx: AudioContext): GainNode {
  if (reverbSend) return reverbSend;

  const send = ctx.createGain();
  send.gain.value = 1;

  const convolver = ctx.createConvolver();
  convolver.buffer = buildImpulse(ctx);

  // One lowpass on the wet bus does more for "expensive" than anything else
  // here: it stops the reverb from echoing back the brightest harmonics.
  const damping = ctx.createBiquadFilter();
  damping.type = 'lowpass';
  damping.frequency.value = 3500;

  send.connect(convolver).connect(damping).connect(getMaster(ctx));
  reverbSend = send;
  return send;
}

function canBeep(muted: boolean, dnd: boolean): boolean {
  if (muted || dnd) return false;
  if (Date.now() - lastBeepTime < BEEP_COOLDOWN) return false;
  return true;
}

// ── Tuning ──

/** Equal-tempered semitone ratio. Never use 1.5 or 2.0 directly — see the header. */
function st(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

/** Small global transposition so repeated sounds don't feel mechanical. */
function pv(): number {
  return 0.985 + Math.random() * 0.03;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// ── Voice specifications ──
//
// Exported as data so they can be asserted on without an AudioContext, which
// jsdom does not provide. See src/test/audioVoices.test.ts.

export interface Partial {
  /** Frequency multiple of the fundamental. Inharmonic on purpose. */
  ratio: number;
  gain: number;
  /** Fraction of the voice's tail this partial survives. High partials die first. */
  decay: number;
}

export interface VoiceSpec {
  partials: Partial[];
  /** Seconds. Under 3ms is reserved for alarms. */
  attack: number;
  /** Seconds from peak to silence. */
  tail: number;
  /** Lowpass cutoff in Hz at the peak of the attack. */
  brightness: number;
  /** Amount of filtered noise at contact — the sound of the mallet itself. */
  transient: number;
  /** Reverb send, 0-1. */
  reverb: number;
}

/** A bell or glass: bright, long, strongly inharmonic. */
const BELL: Partial[] = [
  { ratio: 1, gain: 1, decay: 1 },
  { ratio: 2.76, gain: 0.34, decay: 0.55 },
  { ratio: 5.4, gain: 0.14, decay: 0.3 },
  { ratio: 8.93, gain: 0.05, decay: 0.16 },
];

/** A tuned wooden bar. Marimba bars are near 1:4:10; stretched off the integers. */
const MALLET: Partial[] = [
  { ratio: 1, gain: 1, decay: 1 },
  { ratio: 3.93, gain: 0.22, decay: 0.34 },
  { ratio: 9.38, gain: 0.07, decay: 0.15 },
];

/** Low and soft, for thumps and the error bonk. */
const WOOD: Partial[] = [
  { ratio: 1, gain: 1, decay: 1 },
  { ratio: 2.57, gain: 0.18, decay: 0.4 },
  { ratio: 4.62, gain: 0.06, decay: 0.2 },
];

/** Bright but not sizzly: bell character with the topmost partial dropped. */
const COIN: Partial[] = [
  { ratio: 1, gain: 1, decay: 1 },
  { ratio: 2.76, gain: 0.3, decay: 0.5 },
  { ratio: 5.4, gain: 0.1, decay: 0.26 },
];

export const VOICES: Record<string, VoiceSpec> = {
  motif: { partials: BELL, attack: 0.006, tail: 1.4, brightness: 4200, transient: 0.16, reverb: 0.4 },
  send: { partials: MALLET, attack: 0.004, tail: 0.4, brightness: 3200, transient: 0.2, reverb: 0.22 },
  receive: { partials: BELL, attack: 0.005, tail: 1.0, brightness: 4000, transient: 0.14, reverb: 0.4 },
  confirm: { partials: MALLET, attack: 0.005, tail: 0.9, brightness: 3600, transient: 0.18, reverb: 0.34 },
  notify: { partials: BELL, attack: 0.006, tail: 0.85, brightness: 3400, transient: 0.12, reverb: 0.36 },
  thinking: { partials: WOOD, attack: 0.03, tail: 0.7, brightness: 1400, transient: 0, reverb: 0.3 },
  excited: { partials: BELL, attack: 0.004, tail: 1.0, brightness: 4600, transient: 0.16, reverb: 0.38 },
  // Its own partial set: BELL's top partial at 8.93 lands above 9kHz on a root
  // this high, which reads as sizzle rather than sparkle.
  kaching: { partials: COIN, attack: 0.003, tail: 1.2, brightness: 3900, transient: 0.22, reverb: 0.42 },
  levelup: { partials: MALLET, attack: 0.005, tail: 1.2, brightness: 4000, transient: 0.16, reverb: 0.4 },
  fanfare: { partials: BELL, attack: 0.006, tail: 1.5, brightness: 4400, transient: 0.14, reverb: 0.45 },
  heartbeat: { partials: WOOD, attack: 0.008, tail: 0.9, brightness: 900, transient: 0.1, reverb: 0.3 },
  party: { partials: BELL, attack: 0.004, tail: 1.0, brightness: 4800, transient: 0.22, reverb: 0.4 },
  idle: { partials: MALLET, attack: 0.006, tail: 0.3, brightness: 2400, transient: 0.08, reverb: 0.2 },
  swatch: { partials: MALLET, attack: 0.003, tail: 0.25, brightness: 3000, transient: 0.22, reverb: 0.18 },

  // Alarms. Faster attacks are allowed here and nowhere else — that sharpness is
  // what makes them register as "look at this" without needing to be loud.
  error: { partials: WOOD, attack: 0.002, tail: 0.7, brightness: 1600, transient: 0.26, reverb: 0.26 },
  siren: { partials: MALLET, attack: 0.002, tail: 1.1, brightness: 3800, transient: 0.2, reverb: 0.3 },
};

// ── The voice ──

interface StrikeOpts {
  /** Seconds from now. */
  when?: number;
  /** Multiplies the spec's tail, for shorter notes inside a phrase. */
  sustain?: number;
  /** Stereo position, -1 to 1. */
  pan?: number;
}

/**
 * One struck note.
 *
 * Each partial is its own sine with its own decay, detuned a few cents and
 * started a few milliseconds late so the partials never start phase-coherent —
 * coherent partials are what made the old "detuned pair" sound like a single
 * louder oscillator.
 */
function strike(
  ctx: AudioContext,
  spec: VoiceSpec,
  freq: number,
  volume: number,
  opts: StrikeOpts = {},
): void {
  const t0 = ctx.currentTime + (opts.when ?? 0);
  const tail = spec.tail * (opts.sustain ?? 1);
  const master = getMaster(ctx);
  const send = getReverbSend(ctx);

  // Shared per-note filter: opens on the attack, closes as the note decays.
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(Math.max(300, spec.brightness * 0.35), t0);
  filter.frequency.linearRampToValueAtTime(spec.brightness, t0 + spec.attack);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(220, spec.brightness * 0.18),
    t0 + tail,
  );

  const panner = ctx.createStereoPanner();
  panner.pan.value = opts.pan ?? 0;

  const dry = ctx.createGain();
  dry.gain.value = 1 - spec.reverb;
  const wet = ctx.createGain();
  wet.gain.value = spec.reverb;

  filter.connect(panner);
  panner.connect(dry).connect(master);
  panner.connect(wet).connect(send);

  for (const partial of spec.partials) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * partial.ratio;
    // ±12 cents, enough to beat audibly; ±4 was not.
    osc.detune.value = rand(-12, 12);

    const gain = ctx.createGain();
    const peak = volume * partial.gain;
    // A few ms of stagger per partial, so the attack has depth instead of a click.
    const start = t0 + rand(0, 0.005);
    const end = start + tail * partial.decay;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + spec.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    // Ramp to true zero before stopping, so the node never ends on a step.
    gain.gain.linearRampToValueAtTime(0, end + 0.02);

    osc.connect(gain).connect(filter);
    osc.start(start);
    osc.stop(end + 0.05);
  }

  if (spec.transient > 0) {
    malletTransient(ctx, filter, volume * spec.transient, t0, spec.brightness);
  }
}

/**
 * The sound of the mallet touching the bar: a few milliseconds of bandpassed
 * noise. Unfiltered noise — which is what the old engine used — reads as a
 * static tick; filtered, it reads as contact.
 */
function malletTransient(
  ctx: AudioContext,
  dest: AudioNode,
  volume: number,
  when: number,
  brightness: number,
): void {
  const duration = 0.012;
  const sr = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sr * duration));
  const buffer = ctx.createBuffer(1, length, sr);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = Math.min(6000, brightness * 1.1);
  band.Q.value = 0.9;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(volume, when + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

  src.connect(band).connect(gain).connect(dest);
  src.start(when);
  src.stop(when + duration + 0.01);
}

/** A low sine with no partials, for weight under a strike. */
function thump(ctx: AudioContext, freq: number, volume: number, when = 0): void {
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * 1.6, t0);
  // Real low hits drop in pitch; a fixed frequency reads as a test tone.
  osc.frequency.exponentialRampToValueAtTime(freq, t0 + 0.09);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
  gain.gain.linearRampToValueAtTime(0, t0 + 0.34);

  osc.connect(gain).connect(getMaster(ctx));
  osc.start(t0);
  osc.stop(t0 + 0.4);
}

/** Play an ascending or descending figure on one voice. */
function phrase(
  ctx: AudioContext,
  spec: VoiceSpec,
  root: number,
  steps: number[],
  volume: number,
  spacing: number,
  sustain = 1,
): void {
  steps.forEach((semitone, i) => {
    strike(ctx, spec, root * st(semitone), volume, {
      when: i * spacing,
      sustain: i === steps.length - 1 ? sustain : sustain * 0.7,
      // Gentle spread across the phrase, so it moves in the stereo field.
      pan: steps.length > 1 ? -0.22 + (i / (steps.length - 1)) * 0.44 : 0,
    });
  });
}

// ── Public voices ──

export function playMotif(volume: number, muted: boolean, dnd: boolean): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const root = 440 * pv();
  phrase(ctx, VOICES.motif, root, [0, 4, 7], volume * 0.3, 0.13);
  // Octave above on the last note, a touch stretched so it shimmers.
  strike(ctx, VOICES.motif, root * st(12) * 1.002, volume * 0.14, { when: 0.26, pan: 0.18 });
  thump(ctx, 110, volume * 0.16);
}

export function playSend(volume: number, muted: boolean, dnd: boolean): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  strike(ctx, VOICES.send, 520 * pv(), volume * 0.34, { pan: -0.15 });
}

export function playReceive(volume: number, muted: boolean, dnd: boolean): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const root = 587 * pv();
  // A rising major second — the classic two-note "you have a message".
  phrase(ctx, VOICES.receive, root, [0, 5], volume * 0.26, 0.11);
}

export function playConfirm(volume: number, muted: boolean, dnd: boolean): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const root = 523 * pv();
  phrase(ctx, VOICES.confirm, root, [0, 7], volume * 0.26, 0.1);
  thump(ctx, 130, volume * 0.12);
}

export function playError(volume: number, muted: boolean, dnd: boolean): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const root = 196 * pv();
  // A soft wooden bonk that falls a minor third. In the register of Apple's
  // "Basso": unmistakably "that didn't work", with nothing sharp about it.
  strike(ctx, VOICES.error, root, volume * 0.3, { pan: -0.1 });
  strike(ctx, VOICES.error, root * st(-3), volume * 0.26, { when: 0.1, pan: 0.1 });
  thump(ctx, 82, volume * 0.2);
}

export function playNotify(volume: number, muted: boolean, dnd: boolean): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  strike(ctx, VOICES.notify, 698 * pv(), volume * 0.36);
}

export function playThinking(volume: number, muted: boolean, dnd: boolean): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  // Two soft pulses, low and unhurried — the sound of something working.
  strike(ctx, VOICES.thinking, 330 * pv(), volume * 0.24, { pan: -0.12 });
  strike(ctx, VOICES.thinking, 330 * pv(), volume * 0.18, { when: 0.19, pan: 0.12 });
}

export function playExcited(volume: number, muted: boolean, dnd: boolean): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  phrase(ctx, VOICES.excited, 523 * pv(), [0, 4, 7, 12], volume * 0.2, 0.065);
}

export function playKaChing(volume: number, muted: boolean, dnd: boolean): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const root = 880 * pv();
  // Two bright strikes a fourth apart, plus a shimmer above: coins, not a buzzer.
  // The shimmer sits a fifth up rather than an octave — an octave above this root
  // pushes the upper partials past 11kHz, which reads as sizzle, not sparkle.
  strike(ctx, VOICES.kaching, root, volume * 0.2, { pan: -0.2 });
  strike(ctx, VOICES.kaching, root * st(5), volume * 0.22, { when: 0.075, pan: 0.2 });
  strike(ctx, VOICES.kaching, root * st(7) * 1.003, volume * 0.09, { when: 0.1, pan: 0 });
  thump(ctx, 140, volume * 0.1);
}

export function playLevelUp(volume: number, muted: boolean, dnd: boolean): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  phrase(ctx, VOICES.levelup, 523 * pv(), [0, 4, 7], volume * 0.24, 0.085);
  strike(ctx, VOICES.levelup, 523 * st(12), volume * 0.13, { when: 0.17, pan: 0.2 });
}

export function playIdleChirp(volume: number, muted: boolean, dnd: boolean): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  // The ambient voice for severity 0: present, but barely. Nothing to look up for.
  strike(ctx, VOICES.idle, 784 * pv(), volume * 0.15, { pan: rand(-0.3, 0.3) });
}

export function playFanfare(volume: number, muted: boolean, dnd: boolean): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const root = 440 * pv();
  phrase(ctx, VOICES.fanfare, root, [0, 4, 7, 12], volume * 0.22, 0.1);
  strike(ctx, VOICES.fanfare, root * st(16), volume * 0.12, { when: 0.3, pan: -0.2 });
  thump(ctx, 110, volume * 0.16);
}

export function playHeartbeat(volume: number, muted: boolean, dnd: boolean): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const root = 165 * pv();
  strike(ctx, VOICES.heartbeat, root, volume * 0.26);
  thump(ctx, 72, volume * 0.24);
  strike(ctx, VOICES.heartbeat, root, volume * 0.18, { when: 0.21 });
  thump(ctx, 72, volume * 0.16, 0.21);
}

export function playSiren(volume: number, muted: boolean, dnd: boolean): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const root = 660 * pv();
  // Three insistent strikes alternating a minor second — the interval does the
  // work of grabbing you, so the timbre does not have to be unpleasant.
  for (let i = 0; i < 3; i++) {
    strike(ctx, VOICES.siren, root * (i % 2 === 0 ? 1 : st(1)), volume * 0.26, {
      when: i * 0.13,
      sustain: i === 2 ? 1 : 0.45,
      pan: i % 2 === 0 ? -0.18 : 0.18,
    });
  }
  thump(ctx, 98, volume * 0.18);
}

export function playPartyHorn(volume: number, muted: boolean, dnd: boolean): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  const root = 392 * pv();
  phrase(ctx, VOICES.party, root, [0, 2, 4, 7, 11], volume * 0.16, 0.05);
  strike(ctx, VOICES.party, root * st(12), volume * 0.14, { when: 0.24, pan: 0.25 });
}

/**
 * Note the muted/dnd parameters: this was previously the one sound that bypassed
 * canBeep entirely, so it played over Do Not Disturb and ignored the volume
 * setting. Defaults keep the old zero-argument call site working.
 */
export function playSwatchPop(volume = 0.5, muted = false, dnd = false): void {
  if (!canBeep(muted, dnd)) return;
  lastBeepTime = Date.now();
  const ctx = getCtx();
  strike(ctx, VOICES.swatch, 880 * pv(), volume * 0.24, { pan: rand(-0.4, 0.4) });
}

/** Not audio — the face listens for this. Kept here because callers expect it. */
export function triggerEmotion(emotion: string, duration = 2000): void {
  window.dispatchEvent(new CustomEvent('ping:emotion', { detail: { emotion, duration } }));
}
