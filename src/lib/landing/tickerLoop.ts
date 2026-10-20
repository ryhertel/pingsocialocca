/**
 * Pure maths for the connect ticker, kept apart from the component so the parts
 * that make a marquee glitch — the wrap point and the copy count — are tested.
 *
 * The track holds three identical copies of the item list. The scroller lives in
 * the middle copy, [groupWidth, 2 * groupWidth), and jumps by exactly one copy
 * whenever it leaves that band. Because the copies are identical, the jump lands
 * on the same pixels and is invisible. Three copies rather than two is what lets a
 * person swipe backwards as well as forwards without hitting an edge.
 */

/** How many copies of the item list sit side by side in the track. */
export const TRACK_COPIES = 3;

/** Bring a scroll position back into the middle copy without changing what is on screen. */
export function wrapPosition(pos: number, groupWidth: number): number {
  if (!(groupWidth > 0) || !Number.isFinite(pos)) return pos;
  const offset = (pos - groupWidth) % groupWidth;
  // `%` keeps the sign of the dividend, so a backwards swipe gives a negative offset.
  return groupWidth + (offset < 0 ? offset + groupWidth : offset);
}

/**
 * How many times the item list must repeat inside one copy so that a copy is at
 * least as wide as the viewport. Short of that, a wide screen shows the end of the
 * track and the loop has a visible gap.
 */
export function repeatsNeeded(viewportWidth: number, singleListWidth: number): number {
  if (!(singleListWidth > 0) || !(viewportWidth > 0)) return 1;
  return Math.max(1, Math.ceil(viewportWidth / singleListWidth));
}

/**
 * Advance the auto-scroll by one frame. `elapsedMs` is clamped so a tab that was
 * hidden, or a long frame, cannot fling the ticker forward by seconds of travel.
 */
export const MAX_FRAME_MS = 50;
export function advance(pos: number, speedPxPerSec: number, elapsedMs: number): number {
  const dt = Math.min(Math.max(elapsedMs, 0), MAX_FRAME_MS) / 1000;
  return pos + speedPxPerSec * dt;
}
