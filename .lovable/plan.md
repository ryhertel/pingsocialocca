
# Polish Reactions + Sound Feedback ("Game UI" Vibe)

## A) Stronger Visual Reactions (FaceCanvas.tsx)

### 1. User send -- immediate "thinking" expression
Currently, `Composer.tsx` calls `setPersistentState('thinking')` which triggers squint in FaceCanvas. We'll enhance this by adding a quick micro-glance downward toward the composer area for 150-250ms on transition to thinking state.

- In the FaceCanvas animation loop, detect when `ps` transitions to `'thinking'` (compare against a `prevPersistentState` variable)
- On that transition, set `gazeOverrideTimer = 250` and `targetGY = 0.4` (downward toward composer)
- The existing squint (0.4) and glow shift already provide a good thinking look

### 2. First assistant message -- "notice" reaction
- Detect when a new assistant message arrives (track `lastAssistantMsgCount`)
- Trigger a quick glance toward chat area: `targetGX = 0.4, targetGY = 0.3` for 250ms via `gazeOverrideTimer`
- Add a small glow pulse: `targetGlow = 1.4` briefly
- Then let it fall through to the normal speaking pulse

### 3. Speaking pulse -- increase visibility by ~20%
- Change speaking glow formula from `1 + 0.5 * sin(...)` to `1 + 0.65 * sin(...)` (about 30% more range, feels noticeably richer)

### 4. Assistant message gaze priority
- The new assistant message glance (item 2) uses `gazeOverrideTimer` which is already the highest priority gaze, so this is handled automatically

## B) Sound Effects (audio.ts)

### New: `playSend` -- "click + tiny upward chirp"
- Two-oscillator layered sound: a short click (triangle, 400Hz, 30ms) + upward chirp (sine, 600->900Hz, 80ms)
- Total duration ~100ms
- Volume: `volume * 0.2` (conservative)
- Slight random pitch variance: multiply base frequencies by `0.96 + Math.random() * 0.08` (+-4%)
- Respects mute/DND/20s rate limit via existing `canBeep()`

### New: `playReceive` -- "soft ding/plink"
- Single oscillator: sine wave at ~1100Hz with quick exponential decay
- Add a second harmonic oscillator at 2x frequency, much quieter, for "plink" richness
- Total duration ~120ms
- Volume: `volume * 0.22`
- Same pitch variance +-5%
- Respects all existing audio constraints

### Trigger points
- **Composer.tsx** `handleSend()`: call `playSend()` right after adding the user message
- **bridge.ts** `handleEvent` case `'message'` when `role === 'assistant'`: call `playReceive()`
- **demoEngine.ts** `generateResponse()`: call `playReceive()` when adding assistant message

## C) File Changes Summary

| File | Changes |
|------|---------|
| `src/lib/audio.ts` | Add `playSend()` and `playReceive()` functions |
| `src/components/ping/Composer.tsx` | Import and call `playSend()` on send |
| `src/lib/bridge.ts` | Import and call `playReceive()` on assistant message |
| `src/lib/demoEngine.ts` | Import and call `playReceive()` on assistant message |
| `src/components/ping/FaceCanvas.tsx` | Add thinking-transition glance, assistant-message notice reaction, boost speaking pulse |

## Technical Details

### FaceCanvas.tsx changes (animation loop)
- New variable: `prevPs` to detect persistent state transitions
- New variable: `lastAssistantCount` to detect new assistant messages
- On `ps` transition to `'thinking'` (and `prevPs !== 'thinking'`): set `gazeOverrideTimer = 250`, `targetGY = 0.4`
- On new assistant message detected: set `gazeOverrideTimer = 300`, `targetGX = 0.4`, `targetGY = 0.3`, `targetGlow = max(targetGlow, 1.4)`
- Speaking glow: change `0.5` to `0.65` in the sine multiplier

### audio.ts -- playSend design
```
Two oscillators:
  osc1: triangle, ~400Hz * pitchVar, gain 0.2*vol, decay 30ms (the "click")
  osc2: sine, 600->900Hz * pitchVar, gain 0.15*vol, decay 80ms (the "chirp")
Total: ~100ms, snappy and satisfying
```

### audio.ts -- playReceive design
```
Two oscillators:
  osc1: sine, ~1100Hz * pitchVar, gain 0.22*vol, decay 100ms (the "ding")
  osc2: sine, ~2200Hz * pitchVar, gain 0.08*vol, decay 60ms (harmonic shimmer)
Total: ~120ms, pleasant plink
```
