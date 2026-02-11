

# Sound System Redesign -- Video Game Audio Overhaul

## The Problem

Every sound currently uses bare sine waves with simple envelope curves. They sound clinical and thin -- more like a medical device than a video game. There's no reverb, no harmonic layering, no "body" to the tones.

## What's Possible with Web Audio API (No Libraries Needed)

The Web Audio API is surprisingly powerful. Here's what we can add using only built-in nodes:

- **Convolver reverb**: Creates spatial depth (like sounds happening in a room, not a vacuum)
- **Waveshaping / soft distortion**: Adds warmth and harmonic overtones to make tones feel "chunky"
- **Layered oscillators**: Stack 2-3 detuned oscillators for rich, retro-synth textures
- **Sub-bass layers**: Add a low rumble underneath success sounds for satisfying "thump"
- **Frequency sweeps**: Rapid pitch slides that sound like coin pickups, power-ups, and level-ups
- **Noise bursts**: Short white noise mixed in creates percussive "pops" and "clicks"
- **Delay echoes**: Quick stereo ping-pong for sparkle effects

## Sound-by-Sound Redesign

| Sound | Current | Redesigned |
|-------|---------|-----------|
| **Motif** (app load) | 3 plain sine notes | 3-note power-up chord with detuned layers, sub-bass thump on each note, reverb tail, final note gets a triumphant 5th harmony |
| **Send** | Thin click + chirp | Punchy triangle-wave "boop" with noise transient (like pressing a game button), short reverb |
| **Receive** | Simple ding | Warm two-tone "coin collect" with square-wave body, octave shimmer, and reverb bloom |
| **Confirm** | Two sine notes | Zelda-style "da-DING!" -- ascending perfect 5th with layered square+sine, sub-bass punch, long reverb tail |
| **Error** | Quiet sawtooth | Retro "bonk" -- descending minor 2nd with waveshaper crunch, noise burst, dry (no reverb) for contrast |
| **Notify** | Single sweep | Bright two-note "alert ping" with triangle wave body, detuned chorus effect, medium reverb |
| **Thinking** | Quiet sine pulse | Soft bubbly "bloop" -- sine with pitch wobble (LFO on frequency), gentle reverb, feels like loading |
| **Excited** | Two high sines | Sparkle cascade -- 4 rapid ascending notes with square wave, each slightly detuned, bright reverb |
| **Idle Chirp** | Simple chirp | Playful R2-D2 style "bwee-doo" with rapid frequency modulation, triangle wave, light reverb |

## Technical Architecture

### Shared Audio Infrastructure (new)

```text
ConvolverNode (reverb)
  - Generated impulse response (no audio file needed)
  - Algorithmic IR: exponential decay noise burst, ~0.4s tail
  - Shared across all sounds via a wet/dry mix

WaveShaperNode (warmth)
  - Soft-clip curve for gentle saturation
  - Makes square/triangle waves feel "full" not "harsh"

Routing: oscillators -> waveshaper -> gain -> dry/wet split -> reverb -> destination
```

### Key Techniques Per Sound

**Detuned layers**: Stack 2 oscillators, one +3 cents, one -3 cents. Creates natural "chorus" width without any external effects.

**Noise transients**: Create a short (15-30ms) buffer of white noise, play it at the attack of percussive sounds. Makes clicks feel physical.

**Sub-bass punch**: A 60-80Hz sine that fades in 5ms and out in 80ms. Adds a "chest thump" to success/motif sounds.

**Frequency modulation**: Connect one oscillator's output to another's frequency input for metallic, R2-D2-style tones.

**Algorithmic reverb impulse**: Generate a Float32Array of decaying random noise. Load it into a ConvolverNode once. No external audio files needed.

## Changes

### `src/lib/audio.ts` -- Full rewrite

- Add `createReverb()`: generates impulse response buffer, creates shared ConvolverNode
- Add `createWarmth()`: creates shared WaveShaperNode with soft-clip curve  
- Add `createNoiseBurst(ctx, duration)`: returns a short noise buffer source for percussive attacks
- Add `createSubBass(ctx, volume)`: returns a 70Hz sine with fast attack/decay
- Refactor `buildChain(ctx, osc, options)`: utility that wires oscillator through warmth, gain, dry/wet reverb split. Options: `{ reverb: 0-1, warmth: boolean }`
- Rewrite all 9 sound functions with the new layered approach
- Keep the same function signatures (volume, muted, dnd) so no other files need changes
- Keep pitch variance (`pv()`) and cooldown logic

### Frequency Ranges (shifted to midrange "fun zone")

| Sound | Old Range | New Range | Character |
|-------|-----------|-----------|-----------|
| Motif | 880-1318 Hz | 440-880 Hz | Warmer, more "heroic" |
| Send | 400-900 Hz | 330-660 Hz | Punchier "boop" |
| Receive | 1100-2200 Hz | 520-1040 Hz | Warmer "coin" |
| Confirm | 880-1320 Hz | 440-880 Hz | Satisfying "level up" |
| Error | 220-330 Hz | 180-280 Hz | Crunchy "bonk" |
| Notify | 660-880 Hz | 500-800 Hz | Bright but not shrill |
| Thinking | 440-523 Hz | 330-440 Hz | Bubbly, lower |
| Excited | 1200-1600 Hz | 660-1320 Hz | Sparkly but not piercing |
| Idle | 800-1200 Hz | 400-800 Hz | Playful mid-chirp |

### No Other File Changes

All sound functions keep the same names and signatures. The spectacles, demo engine, and FaceCanvas all call these same functions -- they just sound dramatically better.

## File Summary

| File | Action |
|------|--------|
| `src/lib/audio.ts` | Full rewrite -- add reverb/warmth infrastructure, redesign all 9 sounds with layering, noise transients, sub-bass, and midrange frequencies |

