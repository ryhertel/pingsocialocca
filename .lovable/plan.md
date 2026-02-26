

# Fix Eye Size Consistency When Docked Chat Is Open

## The Problem
The eye geometry in `FaceCanvas.tsx` calculates size using `Math.min(canvas.width, canvas.height) / 8.5`. When the docked chat panel opens, it steals 320px of width from the canvas. Once `canvas.width` becomes smaller than `canvas.height`, the eyes suddenly shrink -- they "squish" compared to how they look in normal bubble mode.

## The Fix
Use `canvas.height` as the sole reference for eye sizing instead of `Math.min(w, h)`. The viewport height stays constant regardless of whether the docked panel is open, so the eyes will remain the exact same size in both layouts.

This is a single-line change applied in both places where `unit` is calculated (the spectacle pre-compute and the main render section).

## File Changed

| File | Change |
|------|--------|
| `src/components/ping/FaceCanvas.tsx` | Replace `Math.min(w, h)` and `Math.min(cw, ch)` with just `ch` / `h` (canvas height only) in both unit calculations |

## Technical Detail
Two lines change in `FaceCanvas.tsx`:
- Line ~484: spectacle pre-compute `const preUnit = Math.min(cw, ch) / 8.5` becomes `const preUnit = ch / 8.5`
- Line ~517: render section `const unit = Math.min(w, h) / 8.5` becomes `const unit = h / 8.5`

Everything else (corner radius, gap, blink, glow, animations) stays identical since they all derive from `unit`.

