

# Idle Spectacle System -- Random Visual Events

## Overview

Add a set of rare, delightful idle animations that fire randomly when Ping has been idle for a while. These go beyond the existing subtle bored routines -- they're full visual "moments" with particle effects rendered on the canvas and coordinated eye reactions.

## Spectacle Events (6 total)

| Event | Visual | Eyes | Sound | Avg. Frequency |
|-------|--------|------|-------|----------------|
| **Fireworks** | 2-3 particle bursts rising and exploding around the eyes | Widen + glow bright, then bounce with each burst | `playExcited` | ~90-150s idle |
| **Eye Roll** | Eyes glance hard up-right, sweep clockwise in a full circle, return to center | Smooth circular glance path over ~1.5s | None (silent comedy) | ~120-180s idle |
| **Sparkle Trail** | Tiny glowing dots drift outward from both eyes like fairy dust, fade over 2s | Slight widen + extra glow | Soft chime (reuse `playConfirm` at low volume) | ~60-120s idle |
| **Gravity Drop** | Eyes "fall" downward with bounce physics (drop, bounce smaller, settle) | bounceY driven by simple gravity sim | None | ~100-160s idle |
| **Dizzy Spin** | Glance coordinates trace a tight spiral outward then back in | Squint slightly during spin, widen at end | None | ~130-200s idle |
| **Pulse Wave** | Concentric rings expand outward from center of eyes, fading as they grow | Glow pulses to 2.5x in sync with ring | `playNotify` at 50% volume | ~80-140s idle |

## Technical Approach

### Changes to `src/components/ping/FaceCanvas.tsx`

**New particle system** (lightweight, canvas-native):

```text
Particle {
  x, y        -- position
  vx, vy      -- velocity
  life, maxLife -- lifetime tracking
  size         -- radius
  hue          -- color from theme
  type         -- 'spark' | 'ring' | 'dust'
}
```

- Array of up to 60 particles, managed in the existing animation loop
- Particles are spawned by spectacle triggers, updated each frame, drawn after the eyes
- No new DOM elements or React components -- pure canvas rendering

**New spectacle scheduler**:

- Separate timer from the existing `boredRoutine` system
- Only fires when `persistentState === 'idle'` and no emotion/bored routine is active
- Minimum 60s between spectacles (scales inversely with energy level)
- Each spectacle sets a `spectacleRoutine` string and `spectacleTimer` number
- When a spectacle is active, it drives `targetGX`, `targetGY`, `targetBounceY`, `targetWiden`, `targetGlow`, and spawns particles
- Spectacle is interrupted immediately if state changes away from idle

**Spectacle implementations**:

1. **Fireworks**: Spawn 3 "launcher" particles that rise upward. On reaching peak, spawn 8-12 "spark" particles in a radial burst with randomized velocity. Eyes widen + glow on each burst. Color uses theme glow hue.

2. **Eye Roll**: Over 1.5s, `targetGX` and `targetGY` trace a circle: `cos(t)` and `sin(t)` with radius 0.5. Smooth easing at start/end.

3. **Sparkle Trail**: Spawn 15-20 tiny "dust" particles from left and right eye centers, drifting outward with slight gravity. Eyes get extra glow.

4. **Gravity Drop**: `targetBounceY` follows `y += vy; vy += gravity` with `vy *= -0.6` on bounce. 3-4 bounces over ~2s.

5. **Dizzy Spin**: Like eye roll but spiral -- radius grows from 0.1 to 0.5 then shrinks back. Slight squint during.

6. **Pulse Wave**: Spawn 3 "ring" particles at staggered intervals. Each ring expands outward with decreasing opacity. `glowMult` pulses in sync.

### Changes to `src/lib/audio.ts`

No new sounds needed -- reuses existing `playExcited`, `playConfirm`, and `playNotify` at reduced volume for spectacle events.

### Energy Level Integration

- At energy 0-20: spectacles disabled entirely
- At energy 21-50: only subtle ones (sparkle trail, gravity drop)
- At energy 51-80: all except fireworks
- At energy 81-100: all spectacles, shorter intervals, more particles

## File Summary

| File | Action |
|------|--------|
| `src/components/ping/FaceCanvas.tsx` | Add particle system, spectacle scheduler, 6 spectacle routines, particle rendering after eyes |

Single file change. Everything is canvas-native, no new dependencies, no new components.

