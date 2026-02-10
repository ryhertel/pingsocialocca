

# Fix Chat Scrolling + Sound on Every Message

## Problems Identified

1. **Scrolling broken**: The Radix `ScrollArea` component uses `overflow: hidden` on its root and relies on an internal viewport element for scrolling. The current setup has `max-h` on the Root but the internal viewport doesn't properly constrain its height, so content overflows without scrolling. This is the root cause of the "chat gets cut off" issue.

2. **Sound only plays once every 20 seconds**: The `BEEP_COOLDOWN` in `audio.ts` is set to 20,000ms, which blocks sounds from firing on rapid messages. The user wants a sound with every single message.

## Plan

### 1. Simplify ChatStack -- replace ScrollArea with a plain div

Drop the Radix `ScrollArea` entirely and use a simple `<div>` with `overflow-y-auto`. This is more reliable and easier to debug. The auto-scroll logic and "Jump to latest" pill stay the same, but the scroll container becomes a straightforward DOM element with a direct ref.

**File: `src/components/ping/ChatStack.tsx`**
- Replace `<ScrollArea>` with `<div ref={scrollContainerRef} className="overflow-y-auto max-h-[50vh] sm:max-h-[60vh]">`
- Attach the `onScroll` handler directly to this div
- Use the div ref directly for `scrollTo()` calls (no more querying for Radix viewport internals)
- Remove the `ScrollArea` import
- Keep everything else: auto-scroll logic, near-bottom detection, jump button, theme-colored bubbles

### 2. Remove the 20-second audio cooldown

**File: `src/lib/audio.ts`**
- Remove or drastically lower the `BEEP_COOLDOWN` constant (from 20,000ms down to 0 or ~300ms just to prevent overlapping oscillators)
- This allows `playSend` and `playReceive` to fire on every message, which is the core experience the user wants

### 3. Keep theme-colored bubbles and all existing styling

No changes to the bubble styling -- it's working correctly based on the screenshot (green tinted backgrounds matching the eye color).

## Technical Details

| Change | File | What |
|--------|------|------|
| Replace ScrollArea with plain div | `ChatStack.tsx` | Fix scrolling by using native `overflow-y-auto` |
| Remove audio cooldown | `audio.ts` | Change `BEEP_COOLDOWN` from 20000 to 300ms |

Two files changed total. The fix is intentionally simple and robust.

