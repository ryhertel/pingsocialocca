import { describe, it, expect } from 'vitest';
import { VOICES } from '@/lib/audio';
import type { VoiceSpec } from '@/lib/audio';

/**
 * jsdom has no AudioContext, so none of this renders sound. It asserts on the
 * voice specification instead — which is where the "Space Invaders" problem
 * actually lived, and where a regression would reappear.
 */

const ALARMS = ['error', 'siren'];
const AMBIENT = ['idle', 'swatch'];
const REWARDS = ['motif', 'receive', 'confirm', 'excited', 'kaching', 'levelup', 'fanfare', 'party'];

const entries = Object.entries(VOICES);

/** Ratios that make a sound read as electronic rather than physical. */
const HARMONIC_TRAPS = [2, 3, 1.5, 4, 5, 6, 8];

describe('voice specs — no chiptune ratios', () => {
  it('never uses an exact small-integer partial ratio', () => {
    for (const [name, spec] of entries) {
      for (const partial of spec.partials) {
        if (partial.ratio === 1) continue; // the fundamental is allowed to be 1
        for (const trap of HARMONIC_TRAPS) {
          expect(
            Math.abs(partial.ratio - trap),
            `${name} has a partial at exactly ${trap} — that is the harmonic series, which is what makes a square wave sound like an arcade cabinet`,
          ).toBeGreaterThan(0.02);
        }
      }
    }
  });

  it('gives every voice at least one partial above the fundamental', () => {
    for (const [name, spec] of entries) {
      expect(spec.partials.length, name).toBeGreaterThan(1);
      expect(spec.partials.some((p) => p.ratio > 1), name).toBe(true);
    }
  });

  it('decays upper partials faster than the fundamental, like a struck body', () => {
    for (const [name, spec] of entries) {
      const sorted = [...spec.partials].sort((a, b) => a.ratio - b.ratio);
      for (let i = 1; i < sorted.length; i++) {
        expect(
          sorted[i].decay,
          `${name}: partial at ${sorted[i].ratio} should die before the one at ${sorted[i - 1].ratio}`,
        ).toBeLessThan(sorted[i - 1].decay);
      }
    }
  });

  it('makes upper partials quieter than the fundamental', () => {
    for (const [name, spec] of entries) {
      const fundamental = spec.partials.find((p) => p.ratio === 1);
      expect(fundamental, `${name} has no fundamental`).toBeDefined();
      for (const partial of spec.partials) {
        if (partial.ratio === 1) continue;
        expect(partial.gain, `${name} at ratio ${partial.ratio}`).toBeLessThan(fundamental!.gain);
      }
    }
  });
});

describe('voice specs — tails, not staccato', () => {
  it('gives reward sounds a tail long enough to ring', () => {
    for (const name of REWARDS) {
      const spec = VOICES[name] as VoiceSpec | undefined;
      expect(spec, `${name} is missing from VOICES`).toBeDefined();
      // The old engine decayed these in 0.1-0.2s, which is the "staccato" complaint.
      expect(spec!.tail, name).toBeGreaterThanOrEqual(0.6);
    }
  });

  it('keeps ambient sounds short so a chatty source stays bearable', () => {
    for (const name of AMBIENT) {
      expect(VOICES[name].tail, name).toBeLessThanOrEqual(0.45);
    }
  });

  it('never leaves a voice without reverb', () => {
    // playError used to be deliberately dry, which is part of why it sounded
    // like it came from a different, cheaper machine than everything else.
    for (const [name, spec] of entries) {
      expect(spec.reverb, name).toBeGreaterThan(0);
      expect(spec.reverb, name).toBeLessThan(0.6);
    }
  });
});

describe('voice specs — attack', () => {
  it('reserves the sharpest attacks for alarms', () => {
    for (const [name, spec] of entries) {
      if (ALARMS.includes(name)) continue;
      expect(
        spec.attack,
        `${name} attacks in under 3ms, which is alarm territory and reads as a click`,
      ).toBeGreaterThanOrEqual(0.003);
    }
  });

  it('lets alarms cut through with a faster attack than everything else', () => {
    const slowestAlarm = Math.max(...ALARMS.map((n) => VOICES[n].attack));
    const fastestOther = Math.min(
      ...entries.filter(([n]) => !ALARMS.includes(n)).map(([, s]) => s.attack),
    );
    expect(slowestAlarm).toBeLessThanOrEqual(fastestOther);
  });

  it('keeps alarms darker than the celebratory voices, so they alert without being shrill', () => {
    const brightestAlarm = Math.max(...ALARMS.map((n) => VOICES[n].brightness));
    const brightestReward = Math.max(...REWARDS.map((n) => VOICES[n].brightness));
    expect(brightestAlarm).toBeLessThan(brightestReward);
  });
});

describe('voice specs — coverage', () => {
  it('defines a voice for every sound the reaction router can ask for', () => {
    // Mirrors SOUND_FN_MAP in reactionExecutor.ts, which reactionRouter.test.ts pins.
    const required = [
      'motif', 'send', 'receive', 'confirm', 'error', 'notify', 'thinking',
      'excited', 'kaching', 'levelup', 'fanfare', 'heartbeat', 'siren',
      'party', 'idle', 'swatch',
    ];
    for (const name of required) {
      expect(VOICES[name], `VOICES.${name} is missing`).toBeDefined();
    }
  });

  it('keeps every spec internally sane', () => {
    for (const [name, spec] of entries) {
      expect(spec.tail, name).toBeGreaterThan(0);
      expect(spec.brightness, name).toBeGreaterThan(200);
      expect(spec.transient, name).toBeGreaterThanOrEqual(0);
      expect(spec.transient, name).toBeLessThanOrEqual(1);
    }
  });
});
