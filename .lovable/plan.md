
# Polish Tweaks: Logo + Welcome + About

Since the WelcomeDialog and About button were planned previously but never created, this plan covers creating them fresh with all three tweaks baked in.

## Changes

### 1. New file: `src/components/ping/WelcomeDialog.tsx`
- Dialog with Ping icon (`/ping-icon.png`), "Meet Ping" heading, friendly description
- Includes a Bridge Mode instruction line: *"To connect to a local agent bridge, click Bridge and enter `ws://127.0.0.1:3939/ping`."*
- "Get Started" button dismisses and writes `ping:welcomeSeen` to localStorage
- Accepts `open` / `onOpenChange` props

### 2. Update: `src/pages/Index.tsx`
- Import `WelcomeDialog` and the white logo asset
- Add `showAbout` state
- On mount, check `localStorage.getItem('ping:welcomeSeen')` -- if not set, auto-open
- Add the logo as a clickable `<img>` in top-left (`absolute top-4 left-4 z-10 cursor-pointer select-none opacity-90 hover:opacity-100`) with `onClick={() => setShowAbout(true)}`
- Render `<WelcomeDialog>` with open/onOpenChange
- Pass `onAbout={() => setShowAbout(true)}` to ControlBar

### 3. Update: `src/components/ping/ControlBar.tsx`
- Add `onAbout` to props interface
- Import `Info` from lucide-react
- Add Info button after Diagnostics button

### localStorage key
- Uses `ping:welcomeSeen` (namespaced with colon) everywhere
