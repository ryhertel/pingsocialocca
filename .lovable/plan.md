

# Make the Eyes Rounder, Bouncier, and More Exaggerated

## What Changes

### 1. Rounder Eye Shape
- Increase the corner radius from `baseH * 0.28` to `baseH * 0.45` -- this makes the eyes much closer to pill/capsule shapes instead of slightly-rounded rectangles
- Make the eye height taller relative to width (change aspect ratio from `0.95` to `1.1`) so they feel more like big round orbs

### 2. Bigger, Bouncier Emotion Reactions
All emotion multipliers are currently quite tame. Roughly double or triple the key values:

| Emotion | Current widen | New widen | Current bounceY | New bounceY |
|---------|--------------|-----------|----------------|-------------|
| happy | 0.3 | 0.6 | sin * 4 | sin * 12 |
| laugh | 0.35 | 0.7 | sin * 6 | sin * 16 |
| shock | 0.5 | 0.9 | none | -8 (jump back) |
| curious | 0.2 | 0.45 | none | sin * 4 (head tilt bob) |
| concern | squint 0.35 | squint 0.5 | none | 3 (droop) |
| proud | 0.25 | 0.55 | -3 | -10 (puff up) |
| surprise | 0.4 | 0.85 | -5 | -14 (big jump) |
| cheer | 0.3 | 0.65 | abs(sin) * 8 | abs(sin) * 20 |

### 3. Faster, Snappier Interpolation
- Increase the base lerp speed (`ls`) from `0.012` to `0.022` -- everything responds ~2x faster, making movements feel springy rather than sluggish
- Increase bounce lerp multiplier from `ls * 2` to `ls * 3` so vertical bounces are extra snappy
- Increase widen lerp from `ls * 1.5` to `ls * 2.5` so eye-pops happen instantly

### 4. More Exaggerated Persistent States
- **Thinking:** Increase squint from `0.4` to `0.55`, speed up scanline
- **Speaking:** Increase glow pulse amplitude from `0.65` to `1.0`, add a subtle bounce (`sin * 3`)
- **Error:** Increase shake amplitude from `3` to `6` pixels, shake faster
- **Success reaction:** widen from `0.25` to `0.5`, add a small bounce pop (`-4`)
- **Hover:** widen from `0.12` to `0.25`

### 5. Bouncier Bored Routines
- **Wiggle:** Increase bounce amplitude from `3` to `8`, glance from `0.15` to `0.35`
- **Orbit:** Increase X range from `0.3` to `0.5`, Y from `0.2` to `0.4`

### 6. Wider Glance Range
- Idle glances: X range from `0.6` to `0.9`, Y from `0.4` to `0.7`
- Cursor tracking scale from `0.45` to `0.6`
- Notice reaction widen from `0.15` to `0.3`

## Files Modified

| File | Changes |
|------|---------|
| `src/components/ping/FaceCanvas.tsx` | All changes above -- eye shape, emotion multipliers, lerp speeds, state animations, bored routines, glance ranges |

Single file edit, no new dependencies, no backend changes.

## Technical Notes
- All changes are to numeric constants within the existing animation loop
- No structural changes to the animation system -- just turning up the dials
- The `iMult` (energy level) scaling is preserved so users with low energy settings still get proportionally tamer animations
- Corner radius is clamped by `Math.min(cornerR, h/2)` so it can never exceed half the eye height (stays visually correct during squint/blink)
