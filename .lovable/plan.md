
# 5x More Bold: Crazier Spectacles + Way More Eye Motion

## The Problem
Everything is still too subtle and slow. The eye roll drags, fireworks are underwhelming, and the eyes don't move around the screen enough. The whole system needs to feel alive, energetic, and fun.

## Changes

### 1. FaceCanvas.tsx -- Crank ALL Motion to 5x

**Emotion reactions -- 5x more extreme:**

| Emotion | Current widen | New | Current bounce | New |
|---------|-------------|-----|----------------|-----|
| happy | 0.6 | 1.2 | sin * 12 | sin * 40 |
| laugh | 0.7 | 1.4 | sin * 16 | sin * 50 |
| shock | 0.9 | 1.8 | -8 | -35 |
| curious | 0.45 | 1.0 | sin * 4 | sin * 15 |
| concern | squint 0.5 | squint 0.8 | 3 | 12 |
| proud | 0.55 | 1.2 | -10 | -40 |
| surprise | 0.85 | 1.7 | -14 | -50 |
| cheer | 0.65 | 1.3 | sin * 20 | sin * 60 |

**Faster interpolation:**
- Base lerp `ls`: 0.022 to 0.04 (nearly instant snapping)
- Bounce lerp: `ls * 3` to `ls * 5`
- Widen lerp: `ls * 2.5` to `ls * 4`

**Way more eye looking around:**
- Idle glance range: X from 0.9 to 1.5, Y from 0.7 to 1.2 (eyes look far off to edges)
- Glance frequency: every 1-3 seconds instead of 2-5 seconds
- Glance hold time: 800-1800ms instead of 500-1000ms (longer looks)
- Cursor tracking scale: 0.6 to 1.0 (eyes follow cursor fully)
- New "scanning" bored routine: slow sweep left-to-right-to-left across full range
- Orbit bored routine: X from 0.5 to 1.0, Y from 0.4 to 0.8
- Wiggle bounce: 8 to 25, glance: 0.35 to 0.8

**Speaking/thinking/error states:**
- Speaking bounce: sin * 3 to sin * 10
- Speaking glow: 1.0 to 2.0
- Error shake: 6 to 15 pixels
- Thinking squint: 0.55 to 0.7
- Hover widen: 0.25 to 0.5
- Success widen: 0.5 to 1.0, bounce: -4 to -15

### 2. spectacles.ts -- Way Crazier Spectacles

**Fireworks -- massive:**
- 5-6 launchers instead of 2-3
- 30 sparks per explosion instead of 8-12
- Bigger spark sizes (3-7 instead of 2-4)
- Longer particle life (1500-2500ms instead of 600-1000ms)
- Faster launch speed
- More trail particles (probability 0.7 instead of 0.3)
- Eye reaction: widen 1.5, bounce -20, glow 4.0
- Duration extended to 5000ms so you really see it

**Eye Roll -- fast and wild:**
- Duration: 1500ms to 600ms (super fast)
- 3 full rotations instead of 1
- Wider radius: X 0.5 to 1.2, Y 0.4 to 1.0
- Add a bounce at the end (-10)

**Sparkle Trail -- more particles, longer:**
- Spawn window: 300ms to 800ms
- 4-6 particles per spawn instead of 1-2
- Bigger particles (3-6 instead of 1.5-3)
- Faster spread velocity
- Widen: 0.15 to 0.6
- Glow: 1.4 to 2.5

**Gravity Drop -- bigger, more bounces:**
- Gravity force: 0.02 to 0.06
- Bounce ceiling: 15 to 40 pixels
- 6 bounces instead of 4
- Duration: 2500ms to 4000ms

**Dizzy Spin -- faster, wilder:**
- Duration: 2000ms to 1200ms
- 4 full rotations instead of 2
- Radius: peaks at 1.0 instead of 0.5
- Squint: 0.25 to 0.5
- End widen: 0.2 to 0.8

**Pulse Wave -- more rings, bigger:**
- 6 rings staggered instead of 3
- Rings expand faster (0.15 to 0.4)
- Ring line width: 2 to 4
- Ring glow: shadowBlur 15 to 30
- Glow pulse: 1.5 to 3.0
- Duration extended

**Spectacle frequency -- way more often:**
- High energy interval: 50-90s to 15-30s
- Normal interval: 60-120s to 25-50s

## Files Modified

| File | Changes |
|------|---------|
| `src/components/ping/FaceCanvas.tsx` | 5x emotion multipliers, faster lerps, way more eye movement, more frequent/wider glances, bouncier states |
| `src/lib/spectacles.ts` | All spectacles 5x crazier -- more particles, faster motion, bigger effects, more frequent triggers |

Two file edits, no new dependencies, no backend changes.

## Technical Notes
- `iMult` energy scaling still applies so low-energy users get proportionally calmer versions
- Corner radius clamping (`Math.min(cornerR, h/2)`) prevents visual glitches even with extreme widen values
- Particle counts are bounded by natural lifecycle decay -- no memory leak risk
- The bigger bounce/widen values may clip slightly off-canvas at small window sizes, which actually looks fun and energetic
