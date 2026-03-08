

# Onboarding Tour

## Approach
Build a lightweight, self-contained step-by-step tour system — no external library needed. A `TourOverlay` component highlights UI elements one at a time with a spotlight cutout and a tooltip, advancing through steps with Next/Back/Skip buttons.

## Tour Steps (5 steps)
1. **Ping's Face** — "This is Ping — it reacts to events and messages in real time."
2. **Composer** — "Type here to chat with Ping or send commands."
3. **Control Bar** — "Access settings, connections, webhooks, and more from here."
4. **Status Chip** — "This shows Ping's current connection status."
5. **Done** — "You're all set! Press ? anytime for keyboard shortcuts." (centered, no highlight)

## Implementation

### 1. `src/components/ping/OnboardingTour.tsx` — New component
- Accepts `open` and `onComplete` props
- Maintains a `step` index
- Each step defines: `targetSelector` (CSS selector to highlight), `title`, `description`, `position` (tooltip placement)
- Renders a full-screen overlay with a "spotlight" hole around the target element (using `getBoundingClientRect` + CSS clip-path or box-shadow trick)
- Tooltip floats near the highlighted element
- Buttons: Skip (closes tour), Back, Next / Finish
- On finish or skip, sets `localStorage('ping:tourSeen', 'true')` and calls `onComplete`

### 2. `src/pages/Index.tsx` — Wire the tour
- Add `[showTour, setShowTour]` state
- After the WelcomeDialog is dismissed (on `onOpenChange(false)`), if `!localStorage.getItem('ping:tourSeen')`, start the tour
- Add `data-tour="face"`, `data-tour="composer"`, `data-tour="controls"`, `data-tour="status"` attributes to the relevant elements for targeting

### 3. `src/components/ping/WelcomeDialog.tsx` — Trigger tour on dismiss
- Pass an `onDismissed` callback or handle in Index.tsx via `onOpenChange`

### 4. Add `data-tour` attributes
- `FaceCanvas` wrapper div → `data-tour="face"`
- `Composer` wrapper → `data-tour="composer"`  
- ControlBar container → `data-tour="controls"`
- StatusChip → `data-tour="status"`

### 5. `src/components/ping/SettingsPanel.tsx` — "Restart Tour" button
- Add a button that clears `ping:tourSeen` and triggers the tour

## No database changes. No new dependencies.

