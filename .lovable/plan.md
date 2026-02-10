

# Scrollable Chat with Auto-Follow, Jump Button, and Theme Bubbles

## Summary

Rewrite `ChatStack.tsx` to add smart auto-scroll, a "Jump to latest" pill, and theme-tinted assistant bubbles -- with the two polish notes applied.

## All changes in one file: `src/components/ping/ChatStack.tsx`

### 1. Smart auto-scroll (with polish note A)

- Add a `isNearBottom` ref, updated via `onScroll` handler on the scroll container (threshold: 120px).
- **New message arrives** (detected by `displayed.length` change): smooth-scroll to bottom if near bottom.
- **Reveal tick** (detected by last message's `revealedText` change): use `behavior: 'auto'` (instant) instead of smooth, so rapid 220-420ms ticks don't cause stuttery smooth-scrolling.
- Both scroll calls are gated by `isNearBottom.current` -- if user has scrolled up, neither fires.

### 2. "Jump to latest" pill (with polish note B)

- Add `showJumpButton` state, set to `true` when user scrolls away from bottom, `false` when near bottom.
- Render a small pill button with `ArrowDown` icon, text "Jump to latest".
- **Positioning**: Place it at `bottom-2` inside a relative wrapper, with `mb-2` so it sits above the last message and doesn't overlap the composer area below.
- Clicking it scrolls to bottom (smooth) and hides the button.

### 3. Theme-colored assistant bubbles (high contrast)

- Import `themePresets` from `@/lib/themes` and read `theme` from `useSettingsStore`.
- Assistant messages get inline styles:
  - `backgroundColor: hsla(glowPrimary, 0.10)` -- subtle tint
  - `borderLeft: 2px solid hsla(glowPrimary, 0.5)` -- accent stripe
- Text stays `text-foreground` (no color tinting) for full readability.
- User messages unchanged: `bg-muted/50 ml-10 text-foreground`.

### 4. Responsive height

- Container: `max-h-[50vh] sm:max-h-[60vh]`

### New imports

- `useState, useCallback` from React
- `ArrowDown` from `lucide-react`
- `ScrollArea` from `@/components/ui/scroll-area`
- `themePresets` from `@/lib/themes`

### Structure sketch

```text
<div className="absolute bottom-20 right-4 w-72 sm:w-80 max-h-[50vh] sm:max-h-[60vh] z-10">
  <div className="relative">           <!-- relative wrapper for jump button positioning -->
    <ScrollArea onScroll={handleScroll}>
      <div className="space-y-1.5 pr-1 pb-2">   <!-- pb-2 so jump pill doesn't cover last msg -->
        {messages...}
        <div ref={bottomRef} />          <!-- scroll anchor -->
      </div>
    </ScrollArea>
    {showJumpButton && (
      <button className="absolute bottom-2 left-1/2 -translate-x-1/2 ..."
              onClick={jumpToLatest}>
        <ArrowDown size={12} /> Jump to latest
      </button>
    )}
  </div>
</div>
```

### Scroll behavior summary

| Trigger | Near bottom? | Behavior |
|---------|-------------|----------|
| New message appended | Yes | `scrollTo` smooth |
| New message appended | No | Show jump pill, don't scroll |
| Reveal tick update | Yes | `scrollTo` auto (instant) |
| Reveal tick update | No | No action |
| User clicks jump pill | n/a | `scrollTo` smooth, hide pill |

