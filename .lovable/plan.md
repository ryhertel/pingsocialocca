

# Three Features: Dark/Light Mode, Keyboard Shortcuts, PWA

## 1. Dark/Light Mode Toggle

**Current state:** All CSS variables are defined in a single `:root` block — dark only. The comment says `/* Ping — always dark */`. Theme switching (mint/sky/berry/honey) only changes glow/accent colors via JS in `useSettingsStore.ts`.

**Plan:**
- Add a `colorMode` setting to `useSettingsStore` with values `'dark' | 'light' | 'system'`
- Add a `.light` class override block in `index.css` that redefines all shadcn semantic variables (background, foreground, card, muted, border, etc.) with light values while keeping the glow colors dynamic
- Apply the class to `<html>` element from `useSettingsStore` subscriber (same pattern as theme glow application)
- For `'system'`, use `window.matchMedia('(prefers-color-scheme: dark)')` with a listener
- Add a 3-way toggle (Sun/Moon/Monitor icons) in `SettingsPanel.tsx` under the Theme section
- The `FaceCanvas` already reads theme colors from CSS variables, so it will adapt automatically

**Files changed:** `src/lib/types.ts`, `src/stores/useSettingsStore.ts`, `src/index.css`, `src/components/ping/SettingsPanel.tsx`

## 2. Keyboard Shortcuts

**Plan:**
- Create `src/hooks/useKeyboardShortcuts.ts` — a single `useEffect` with a `keydown` listener
- Shortcuts (only fire when no input/textarea is focused):
  - `m` → toggle mute
  - `d` → toggle DND
  - `s` → open settings (dispatch custom event)
  - `/` → focus composer input
  - `Escape` → close any open panel
  - `?` → show shortcuts help overlay
- Create a small `KeyboardShortcutsHelp` dialog component listing all shortcuts
- Wire the hook into `Index.tsx`
- Add a "Keyboard Shortcuts" button in `SettingsPanel` or `ControlBar`

**Files created:** `src/hooks/useKeyboardShortcuts.ts`, `src/components/ping/KeyboardShortcutsHelp.tsx`
**Files changed:** `src/pages/Index.tsx`

## 3. PWA / Installability

**Plan:**
- Create `public/manifest.json` with app name "Ping", theme color matching dark bg (`#0a0e15`), display `standalone`, icons from the existing favicon/png assets
- Create a minimal `public/sw.js` service worker that caches the app shell (network-first for API calls, cache-first for static assets)
- Register the service worker in `src/main.tsx`
- Add `<link rel="manifest">` to `index.html`
- Add `<meta name="theme-color">` and Apple-specific meta tags for iOS home screen support

**Files created:** `public/manifest.json`, `public/sw.js`
**Files changed:** `index.html`, `src/main.tsx`

## Implementation Order
1. Dark/light mode (CSS + store + UI)
2. Keyboard shortcuts (hook + help dialog)
3. PWA manifest + service worker

