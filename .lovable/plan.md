

# Ping — Presence UI for AI Agents

## Overview
A PWA-ready single-page app that shows an animated "eyes-only" face reflecting an AI agent's state, with a lightweight chat surface. Runs in Demo Mode by default and can connect to a local bridge via WebSocket. Dark, premium aesthetic with Sora font throughout.

---

## 1. Foundation & Design System
- Load **Sora** from Google Fonts as the primary typeface
- **Font weights**: Sora SemiBold (600) for headings and status chips; Regular (400) / Medium (500) for body text, chat messages, and UI labels
- **Marketing wordmark** (on white/light backgrounds): `#111827`
- **In-app text** (on dark backgrounds): `#F5F7FA`
- Dark theme tokens: background `#080B10`, surface `#0D121A`, stroke `#1A2233`, text primary `#F5F7FA`, text secondary `#AAB4C2`
- Four switchable theme presets (Emerald/Mint, Cyan/Sky, Magenta/Berry, Amber/Honey) each defining `glowPrimary`, `glowSecondary`, and `accent` colors
- Status colors: error `#FF3B3B`, success `#00FF52`, warning `#FFB020`
- Store selected theme and all settings in localStorage

## 2. PWA Setup
- Configure `vite-plugin-pwa` with app manifest, Ping icons (from provided logos), and offline support
- Mobile-optimized meta tags and installability

## 3. Home Page Layout
- **Center**: Full canvas-rendered animated eyes (the hero)
- **Top-left**: Status chip showing current persistent state only: **Disconnected / Idle / Thinking / Speaking / Error**. When notifications are coalesced, show a small badge counter on the chip (e.g. "3")
- **Top-right**: Control buttons — Connect, Settings, Diagnostics, Demo toggle, Mute, DND
- **Bottom-right**: Chat stack showing the last 20 messages with timestamps
- **Bottom**: Composer bar (text input + send button)
- Mobile responsive: chat becomes a slide-up drawer; face remains primary

## 4. Face Canvas Renderer
- Two glowing rounded-rectangle eyes rendered on HTML Canvas
- **Idle**: randomized blinks (3–7s), micro-glances (2–5s), subtle glow
- **Bored routines**: after 45–90s of inactivity, occasional scan sweep, orbit, sleep drift, or double blink
- **Thinking**: squint + shimmer scanline effect
- **Speaking**: glow pulse synced to text chunk reveals
- **Success reaction** (transient only, 0.8–1.2s): gentle eye widen + soft double glow pulse, then returns to previous persistent state — this is an overlay animation, NOT a persistent state
- **Error**: red tint + double blink + tiny shake
- **Notify**: brief glow flare (coalesced — see §7)
- **Disconnected**: dimmed, static eyes
- Gaze targets: glance toward chat on new messages, toward composer when user types
- On hover/tap: "curious" widen expression
- Reduce animation FPS when tab is not focused (CPU optimization)
- Animation intensity setting (Low/Medium/High) controls motion amount; Low also serves as Reduce Motion

## 5. Text Reveal System
- Never character-by-character typing
- Streaming chunks from bridge: reveal each chunk as it arrives
- Full message (demo mode or non-streaming): split into 12–22 word phrases, reveal every 220–420ms (intensity-dependent)
- Speaking state ends 1.5s after last chunk

## 6. Chat Stack & Composer
- Display last 20 messages (store last 50 in memory)
- Messages show role (user/assistant), text, and relative timestamp
- Composer bar: text input with send button
- Sending a message transitions state to "thinking"

## 7. Notification Coalescing & Audio System

### Coalescing Rules
- If multiple notify events arrive within a 6–10 second window, coalesce into a single notify animation instead of firing each one independently
- Show a small badge counter on the status chip indicating how many notifications were coalesced (e.g. "3")
- Badge counter fades after the coalesced window closes

### Audio (Web Audio API)
- Four beep types: notify (1046Hz, 70ms), confirm/success (660→880Hz), error (220Hz buzz), idle chirp
- Soft oscillator envelopes with lowpass filter
- **Beep rate limit**: max 1 beep every 20 seconds regardless of how many events arrive; coalesced sounds follow the same cap
- Mute toggle, volume slider, idle chirps toggle (default OFF, rate-limited to 1 per 4 min)
- DND mode disables ALL sounds completely
- Success confirm beep plays on success/confirmation events (respecting mute/DND and the 20s rate limit)

## 8. Demo Mode
- Active by default on first launch
- Generates simulated assistant messages every 10–40 seconds
- Simulates thinking delay (1.5–3.5s) before each response
- Occasionally triggers the transient success reaction to demonstrate it
- Triggers state transitions and notify beeps (respecting mute/DND and coalescing rules)
- Runs stably for 15+ minutes

## 9. Bridge Mode (WebSocket Client)

### Security Defaults
- UI never stores tokens, keys, or secrets — the bridge holds all credentials
- Bridge is expected to bind to localhost only (`127.0.0.1`); no remote access by default
- UI does not expose or relay any authentication material

### Connection
- Connect to configurable WebSocket URL (default `ws://127.0.0.1:3939/ping`)
- Agent-agnostic protocol — UI only knows the Ping Protocol, not OpenClaw specifics
- Auto-reconnect on disconnect without freezing UI
- Heartbeat ping to detect connection health

### Ping Protocol
- **Incoming events**: `status`, `message`, `state`, `error`
- **Outgoing events**: `send`, `setAgent`, `ping`
- `status` payload includes optional `protocolVersion` field (e.g. `"ping/0.1"`) for future compatibility checks
- **Unknown event handling**: if the UI receives a WebSocket event with an unrecognized `type`, silently ignore it, do not crash, and log it to the Diagnostics panel with timestamp
- State inference when bridge doesn't send explicit state events:
  - On outgoing `send` → state = thinking
  - On first assistant message chunk → state = speaking
  - After 1.5s no assistant output → state = idle
  - On error → state = error

## 10. Connect Modal
- Mode selector: Demo / Local Bridge
- Bridge WS URL input field
- Connect + Verify buttons
- On verify: show connected status, protocol version (if reported), and available agents list
- Agent dropdown if bridge reports multiple agents (sends `setAgent`)

## 11. Settings Panel
- Display name (default "Ping")
- Theme preset selector with friendly names (Mint, Sky, Berry, Honey)
- Animation intensity: Low / Medium / High
- Sound controls: mute toggle, volume slider, idle chirps toggle
- DND toggle
- All settings persist to localStorage

## 12. Diagnostics Panel
- Bridge connected status
- Protocol version reported by bridge (if any)
- Current agentId + agentName
- Last event timestamp
- Current inferred state
- Unknown events log (collapsed list with timestamps and raw payloads)
- Last error message (collapsible)

