

# Smooth, Bubbly, Stutter-Free Eye Animations

## The Problems

1. **Sharp/stiff motion**: The lerp speed (`ls = 0.04`) is too fast, making everything snap rather than glide. Movements feel robotic instead of organic.

2. **Blinks are too quick and subtle**: The blink closing/opening interpolation is extremely fast (`ls * 3 = 0.12`), and the "closed" hold is only 60ms. Eyes barely close before popping open.

3. **Idle stuttering**: The idle glance system triggers a new look direction every 1-3 seconds, but each time a glance ends, the target snaps to `(0, 0)` before immediately picking a new random direction. Combined with the fast lerp, this creates rapid oscillation/jittering. This is the "crazy stuttering eye thing."

## Changes (Single File: FaceCanvas.tsx)

### 1. Slower, Buttery Lerp Speeds

Reduce the base lerp speed and tune each channel for smooth, organic feel:

| Channel | Current speed | New speed | Effect |
|---------|--------------|-----------|--------|
| Base `ls` | 0.04 | 0.015 | Everything glides instead of snapping |
| Blink | ls * 3 (0.12) | 0.06 | Slow, visible close/open |
| Glance X/Y | ls (0.04) | ls (0.015) | Smooth eye drift |
| Squint | ls (0.04) | ls (0.015) | Gradual squint |
| Widen | ls * 4 (0.16) | ls * 2 (0.03) | Still quick pop but not instant |
| Glow | ls * 3 (0.12) | ls * 2 (0.03) | Smooth glow ramp |
| Bounce | ls * 5 (0.20) | ls * 2.5 (0.0375) | Bubbly bounce, not jerky |

### 2. Slower, More Cinematic Blinks

- Increase "closed" hold from 60ms to 150ms (eyes stay shut for a visible beat)
- The slower blink lerp (0.06 instead of 0.12) means the eyelid closing/opening takes about 3x longer, creating a real, satisfying blink motion
- Keep blink frequency the same (every 2-8 seconds)

### 3. Fix Idle Stuttering

The root cause is glances firing too frequently (every 1-3s) and snapping targets to (0,0) between each glance. Fix:

- Increase glance interval from 1-3s to 3-6s (less frantic)
- When a glance ends, pick the NEXT target immediately instead of resetting to (0,0) first -- this eliminates the snap-back-then-dart pattern
- Keep the wide glance range (1.5x, 1.2y) since user likes how far the eyes look

### 4. Smooth Out Bored Routines

- The "wiggle" routine oscillates rapidly (`sin(timer * 0.01)`). Slow the frequency to `sin(timer * 0.005)` for a gentler bob
- The "orbit" routine spins too fast (`timer * 0.003`). Slow to `timer * 0.0015` for a dreamy float
- The "scan" routine sweeps too fast. Slow from `timer * 0.0015` to `timer * 0.001`

### 5. Keep All Big Effects

All the emotion multipliers (widen 1.2-1.8, bounce 40-60px, glow 2.0-4.0) stay exactly the same. The spectacles stay exactly the same. Only the transition smoothness changes -- the eyes still get huge and bouncy during reactions, they just get there with a smooth curve instead of a sharp snap.

## What This Will Feel Like

- **Idle**: Eyes drift lazily around the screen in smooth arcs, with slow satisfying blinks. No jitter or stutter.
- **Emotions**: Eyes still go huge and bouncy, but they "balloon" into position smoothly rather than jerking.
- **Blinks**: Visible, characterful close-hold-open motion. Like a real blink with personality.
- **Spectacles**: Unchanged -- fireworks, eye roll, sparkles all stay big and wild.

## Technical Details

| File | Changes |
|------|---------|
| `src/components/ping/FaceCanvas.tsx` | Lerp speeds, blink hold duration, glance timing/transition logic, bored routine frequencies |

Single file, ~8 line-level edits to numeric constants and one small logic change in the glance system.

