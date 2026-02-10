

# Privacy Lock v1 — Implementation Plan

## All Changes

### 1. Fix: `resetIdleTimer` null assignment
**File: `src/lib/bridge.ts`**
- In `resetIdleTimer()`, add `idleTimer = null` after `clearTimeout(idleTimer)`

### 2. Add types
**File: `src/lib/types.ts`**
- Add `AutoLockMinutes` type: `5 | 15 | 30 | 60`

### 3. Settings store updates
**File: `src/stores/useSettingsStore.ts`**
- Add persisted settings: `privacyLock` (boolean, default `false`), `autoLockMinutes` (AutoLockMinutes, default `15`)
- Add runtime state (not persisted): `isLocked` (boolean, default `false`)
- Add actions: `setPrivacyLock`, `setAutoLockMinutes`, `lock`, `unlock`

### 4. Inactivity timer with throttled mousemove
**File: `src/pages/Index.tsx`**
- Add `useEffect` that runs when `privacyLock` is enabled
- Listen for `mousemove`, `keydown`, `touchstart` to reset an inactivity timer
- Mousemove resets are throttled to max once every 3 seconds via a `lastResetTs` ref
- Keydown and touchstart reset immediately
- On timeout (matching `autoLockMinutes`), call `lock()`
- Cleanup on unmount or when `privacyLock` is toggled off

### 5. Composer: hidden when locked
**File: `src/components/ping/Composer.tsx`**
- Read `isLocked` from `useSettingsStore`
- When `isLocked === true`, return `null` (hide entirely) — no messages can be sent

### 6. ChatStack: locked overlay
**File: `src/components/ping/ChatStack.tsx`**
- Read `isLocked` from `useSettingsStore`
- When locked, render a blurred overlay with "Session Locked" text and an "Unlock" button
- Clicking Unlock calls `unlock()` on the settings store

### 7. StatusChip: hide detail when locked
**File: `src/components/ping/StatusChip.tsx`**
- Read `isLocked` from `useSettingsStore`
- When locked, show "Locked" label instead of the current state label

### 8. DiagnosticsPanel: locked placeholder
**File: `src/components/ping/DiagnosticsPanel.tsx`**
- Read `isLocked` from `useSettingsStore`
- When locked, show a single "Session is locked" message instead of diagnostic rows

### 9. SettingsPanel: Privacy section
**File: `src/components/ping/SettingsPanel.tsx`**
- Add a "Privacy" section below the DND toggle
- Toggle: "Privacy Lock" (controls `privacyLock`)
- When enabled, show a select dropdown for "Auto-lock after" with options: 5 / 15 / 30 / 60 minutes

