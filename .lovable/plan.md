

# Cursor-Following Eyes with "Notice" Behavior

## Overview

The eyes will smoothly track the user's cursor position, making Ping feel alive and aware. To keep it from feeling robotic, the tracking won't be constant -- instead, the eyes will periodically "notice" the cursor, track it for a while, then drift back to their idle behaviors.

## How it works

### Cursor Tracking (always-on, subtle)

- Track `mousemove` on the canvas to capture normalized cursor position (-1 to 1 range relative to canvas center)
- Convert cursor position into `targetGX` / `targetGY` values (the existing glance system), clamped to a max range of about 0.5 so the eyes don't overextend
- The existing `lerp` interpolation ensures smooth, natural-feeling movement

### "Noticing" the Cursor

Instead of always staring at the cursor (which feels creepy), the eyes use an attention cycle:

- **Idle phase** (2-6s): Eyes do their normal idle glances/bored routines, ignoring the cursor
- **Notice trigger**: After the idle phase ends, OR if the cursor moves quickly (a sudden flick), the eyes "notice" -- a subtle widen reaction (like a slight surprise) followed by tracking
- **Tracking phase** (3-8s): Eyes smoothly follow the cursor. A very subtle glow pulse on initial notice adds life
- **Lose interest**: After the tracking phase, eyes drift back to center and return to idle behaviors

### Priority System

The existing gaze override system already handles priority. Cursor tracking slots in as the lowest priority:

1. New message gaze override (highest)
2. Composer focus gaze
3. Thinking/speaking states
4. Cursor tracking (new)
5. Random idle glances (lowest -- suppressed during cursor tracking)

### Edge Cases

- **Cursor leaves window**: Smoothly drift back to center (existing `onLeave` behavior)
- **Cursor stationary for 3s+**: Lose interest early, return to idle
- **Disconnected state**: No tracking (eyes are dimmed)
- **Low animation intensity**: Reduce tracking range and disable "notice" widen reaction

## Technical Details

### File: `src/components/ping/FaceCanvas.tsx`

All changes are within the existing `useEffect` animation loop:

**New variables** (added alongside existing animation vars):
- `mouseNX`, `mouseNY` -- normalized cursor position (0-1 mapped to -1 to 1)
- `cursorTrackingPhase`: `'idle' | 'tracking'` -- current attention state
- `cursorPhaseTimer` -- countdown for current phase
- `lastCursorMoveTs` -- timestamp of last significant cursor movement
- `prevMouseNX`, `prevMouseNY` -- for detecting fast cursor movement (flick detection)

**New event listener**:
- `mousemove` on `window` (not just canvas) to capture cursor even at edges
- Updates `mouseNX` and `mouseNY` as `(clientX / w - 0.5) * 2` (range -1 to 1)
- Throttled: only updates if cursor moved more than ~2% of screen width since last update

**New logic block** -- "Cursor Attention" (inserted after the existing Glance block, before Bored routines):
- During `idle` phase: decrement timer; on expire OR on fast cursor flick, transition to `tracking` with a brief widen reaction
- During `tracking` phase: set `targetGX` and `targetGY` based on `mouseNX/mouseNY` scaled by ~0.45; decrement timer; if cursor hasn't moved for 3s, end early; on expire, return to `idle`
- Bored routines are suppressed while in `tracking` phase
- Random glances are suppressed while in `tracking` phase

**Notice reaction**: When transitioning from `idle` to `tracking`, briefly set `targetWiden = 0.15 * iMult` and `targetGlow = 1.3` for ~300ms (a subtle "oh, I see you" moment)

No other files need changes. No new dependencies.
