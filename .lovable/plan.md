

# Mobile-First Responsive Layout + Landscape Mode

## Overview

Restructure the entire page from absolute-positioned elements to a proper flexbox column layout using `h-[100svh]`. Add a mobile hamburger menu, iOS safe-area support, and a landscape-specific chat mode.

## Files Changed

### 1. `index.html` -- viewport-fit=cover

Add `viewport-fit=cover` to the viewport meta tag so `env(safe-area-inset-*)` values are available on iOS.

### 2. `src/hooks/use-landscape.tsx` -- New file

Small hook that returns `true` when the device is in landscape orientation AND the viewport height is short (under 500px). Uses `window.matchMedia('(orientation: landscape) and (max-height: 500px)')`.

### 3. `src/components/ping/ControlBar.tsx` -- Add MobileMenu export

- Keep the existing `ControlBar` component unchanged (used on desktop `sm+`)
- Add a new `MobileMenu` component export that renders a `Sheet` (from the bottom) triggered by a `Menu` (hamburger) icon button
- The sheet contains all controls as labeled list items: Demo toggle, Mute, DND, Connect, Settings, Diagnostics, About
- Each item shows the icon + label text, making it touch-friendly

### 4. `src/pages/Index.tsx` -- Flexbox layout restructure

Replace the current `relative w-screen h-screen overflow-hidden` with:

```
h-[100svh] flex flex-col overflow-hidden bg-background select-none
```

Structure becomes:

| Section | Classes | Content |
|---------|---------|---------|
| Header | `flex-none`, safe-area top padding | Logo + StatusChip (left), ControlBar on `sm+` or MobileMenu hamburger on mobile (right) |
| Main | `flex-1 min-h-0 relative` | FaceCanvas (absolute inset-0) + ChatStack (positioned overlay) |
| Footer | `flex-none`, safe-area bottom padding | Composer (no longer absolute) |

- Import `useIsMobile` and `useLandscape` hooks
- On mobile: render `MobileMenu` (hamburger) instead of full `ControlBar`
- On desktop: render `ControlBar` as-is
- Add landscape chat toggle state (`showChat` / `setShowChat`)
- In landscape mode: show a small floating `MessageCircle` button in main area to toggle chat visibility via a bottom Sheet/Drawer

### 5. `src/components/ping/Composer.tsx` -- Remove absolute positioning

- Remove `absolute bottom-0 left-0 right-0` from the outer div
- Keep `p-4` and inner flex layout unchanged
- Positioning is now handled by the parent flex layout

### 6. `src/components/ping/ChatStack.tsx` -- Responsive + landscape

- Remove `absolute bottom-20 right-4` positioning
- Position as `absolute bottom-0 right-4` inside the `<main>` area (so it sits above the face but can never overlap the footer/composer which is outside `<main>`)
- Keep native `div overflow-y-auto` scrolling (no Radix ScrollArea)
- Responsive max-heights:
  - Default (mobile portrait): `max-h-[40vh]`
  - `sm+`: `max-h-[60vh]`
- Mobile bubble width clamp: `max-w-[78vw] sm:max-w-none`
- Mobile text size: `text-sm` on bubbles
- Keep all existing auto-scroll logic, jump-to-latest pill, theme-tinted bubbles
- Accept an optional `landscape` prop; when true and on small screens, render nothing (chat handled by parent's Sheet)
- The locked state view also updates to non-absolute positioning

### 7. `src/components/ping/FaceCanvas.tsx` -- No changes needed

Canvas already uses `absolute inset-0 w-full h-full`. It will now fill the `<main>` flex area instead of the full screen. The resize handler uses `window.innerWidth/Height` which is fine since the canvas is full-bleed within main.

## Landscape Chat Behavior

In landscape on small screens:
- ChatStack is hidden from the main area
- A floating `MessageCircle` button appears in the bottom-right of `<main>`
- Tapping it opens a `Drawer` (vaul) from the bottom containing the ChatStack content
- This keeps face + composer always visible and prioritized

## iOS Safe Areas

- Header gets `style={{ paddingTop: 'env(safe-area-inset-top)' }}`
- Footer gets `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}`
- These only have effect on devices with notches/home indicators when `viewport-fit=cover` is set

## Key Constraint: Chat Never Covers Composer

Since `<main>` and `<footer>` (Composer) are siblings in the flex column:
- ChatStack is absolutely positioned inside `<main>` with `bottom-0`
- It can never extend below `<main>`'s boundary
- The Composer lives in `<footer>` which is a separate flex item
- Zero overlap is guaranteed by the flex layout itself

## Summary of All Files

| File | Action |
|------|--------|
| `index.html` | Add `viewport-fit=cover` to viewport meta |
| `src/hooks/use-landscape.tsx` | New hook |
| `src/components/ping/ControlBar.tsx` | Add `MobileMenu` export |
| `src/pages/Index.tsx` | Restructure to flexbox layout |
| `src/components/ping/Composer.tsx` | Remove absolute positioning |
| `src/components/ping/ChatStack.tsx` | Responsive sizing, landscape prop |

