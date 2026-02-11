

# Inbound Webhook Ingest + Reaction Engine + Event Feed (Final)

## Overview

Stage 1 establishes secure inbound ingest, schema normalization, reaction routing, and local event visualization. Realtime push and provider-specific connectors are implemented in later stages.

**Stage 1 does NOT implement realtime push.** External webhook calls hit the edge function and return 200. The UI receives events only via the "Send Test Event" flow (local injection). Stage 2 will add Supabase Realtime subscriptions. There is no polling, no SSE, no broadcast in Stage 1.

## Architecture: Isolated Pipelines

```text
Pipeline A (Local-Only / OpenClaw)       Pipeline B (Internet-Inbound / Webhooks)
-----------------------------------      ----------------------------------------
src/lib/bridge.ts                        supabase/functions/ingest/index.ts
src/stores/usePingStore.ts               src/lib/ingest/reactionRouter.ts
                                         src/lib/ingest/reactionExecutor.ts
                                         src/stores/useIngestStore.ts

RULES:
- Pipeline B code NEVER imports from bridge.ts or usePingStore messages
- Webhook ingest pipeline cannot forward events to external services
- OpenClaw pipeline cannot forward events to webhook ingest
- Cross-forwarding is disabled in MVP (hardcoded)
- No shared event bus between pipelines
```

## Step 0: Enable Lovable Cloud

Connect the project to Lovable Cloud (Supabase) to get a backend. Then store `PING_INGEST_SECRET` as a Supabase secret.

---

## 1. Edge Function: `supabase/functions/ingest/index.ts`

Config in `supabase/config.toml`:
```text
[functions.ingest]
verify_jwt = false
```

**CORS**: Standard headers, OPTIONS passthrough.

**Authentication** (choose one, prefer HMAC):
- Primary: `x-ping-signature` header with HMAC-SHA256 of raw body using `PING_INGEST_SECRET`
- Fallback: `x-ping-secret` header matching `PING_INGEST_SECRET`
- Reject 401 if both missing or invalid

**Rate Limiting**:
- Best-effort MVP rate limiting using in-memory Map keyed by IP
- 30 requests/minute per IP, returns 429 on exceed
- Code comment: "In-memory Map resets on cold start. Not distributed across instances. To be replaced in Stage 2/3 with persistent throttling."

**Schema Validation** (strict but future-proof):
- `source`: string, required, max 40 chars
- `eventType`: required, must be one of: `success`, `error`, `message`, `thinking`, `warning`, `incident`, `deploy` -- reject unknown values
- `title`: string, required, max 80 chars
- `body`: optional string, max 280 chars
- `tags`: optional string array, max 8 items, each max 30 chars
- `severity`: optional number 0-3, default 1
- `timestamp`: optional number, default to server time
- Reject oversized payloads (cap raw body at 2KB)
- **Ignore unknown fields.** Only extract allow-listed normalized fields. Reject payloads that exceed 2KB or contain unexpected top-level structure. This keeps security strict while allowing future provider-specific connectors (Stripe, GitHub) that send large nested payloads -- Stage 1 simply discards fields it doesn't recognize.
- Store only normalized fields

**Redaction -- applied at normalization time**:
- Redaction is applied to the normalized event object itself before any logging or response return. Only redacted normalized fields are ever returned to the client. There is no code path where raw title/body exists in a returnable or loggable form.
- Strip URLs from title/body (replace with `[link]`)
- Strip token-like strings (hex/base64 patterns >20 chars)
- Strip code blocks (backtick-fenced content)

**Logging hygiene** -- log only:
- `source`, `eventType`, `timestamp`, truncated IP (first 2 octets + `x.x`)
- Never log: `body`, secret, raw request body

**Response**:
- 200 `{ ok: true, id: <uuid>, event: <redacted normalized event> }`
- 4xx `{ ok: false, error: <reason> }`

The returned `event` object allows the "Send Test Event" UI flow to inject the event locally. This is NOT realtime -- it only works for test events where the frontend makes the call and reads the response.

---

## 2. Store: `src/stores/useIngestStore.ts`

Zustand store, completely separate from `usePingStore`:

- `events: NormalizedEvent[]` -- ring buffer, last 200
- `lastEventAt: number | null`
- `ingestSecret: string` -- in-memory only by default
- `rememberSecret: boolean` -- default false; if true, persists secret to localStorage
- `ingestUrl: string` -- derived from Supabase project URL
- `connected: boolean`
- `showBodyPreview: boolean` -- display-only toggle, does not affect ingest behavior

**Methods**:
- `pushEvent(event)` -- prepends to ring buffer
- `clearEvents()`
- `setSecret(secret)` -- stores in memory; if `rememberSecret` is true, also persists
- `setRememberSecret(value)` -- toggles persistence; if turned off, clears from localStorage
- `clearSecret()` -- wipes from memory and localStorage
- `regenerateSecret()` -- generates a new random value client-side and displays it with instructions (see below)
- `disconnect()` -- clears secret + events

**Secret handling rules**:
- Secret does NOT automatically persist in localStorage
- "Remember secret on this device" toggle (default off)
- "Clear Secret" button always available
- **"Regenerate Secret" button**: The frontend cannot regenerate Supabase secrets automatically. This button generates a new random 32-char hex value client-side, displays it to the user, and shows an instruction: "Copy this value and update it in your Supabase project secrets as PING_INGEST_SECRET." Includes a direct link to the Supabase dashboard secrets page. The new value is set locally so test events use it, but the user must manually update the server-side secret for it to work with external webhooks.
- Masked display: `••••••` + last 6 characters

---

## 3. Ingest Types: `src/lib/ingest/types.ts`

```text
NormalizedEvent {
  id: string
  source: string
  eventType: 'success' | 'error' | 'message' | 'thinking' | 'warning' | 'incident' | 'deploy'
  title: string
  body?: string
  tags?: string[]
  severity: number     // 0-3
  timestamp: number
  receivedAt: number
}

ReactionOutput {
  eyeState: PersistentState
  emotionType?: string
  soundFn: string
  overlayType?: string
  pulseLevel?: number
}
```

---

## 4. Reaction Router: `src/lib/ingest/reactionRouter.ts`

Pure function: `routeEvent(event: NormalizedEvent): ReactionOutput`

**Base mapping by eventType**:

| eventType | Eyes | Sound | Overlay |
|-----------|------|-------|---------|
| thinking | thinking | playThinking | -- |
| success | idle + proud emotion | playConfirm | -- |
| error | error | playError | -- |
| message | idle + surprise emotion | playReceive | -- |
| warning | idle + concern emotion | playNotify | -- |
| incident | error + pulse | playError | pulseWave |
| deploy | idle + proud emotion | playExcited | fireworks |

**Keyword/tag routing** (scans title + body + tags, overrides base mapping):

- Money words: `paid`, `payment`, `purchase`, `sale`, `invoice`, `subscription`, `charge`, `$`, `usd`, `eur`, `money` -- cheer emotion, playExcited, sparkleTrail overlay
- Deploy words: `deploy`, `shipped`, `released`, `build succeeded`, `pipeline green` -- proud emotion, playExcited, fireworks overlay
- Error words: `failed`, `exception`, `panic`, `downtime`, `incident`, `crash`, `500` -- error eyes, playError, pulseWave overlay

All rules in one file. Keyword matches override base eventType mapping.

**Guardrails**:
- Sound cooldown: 300-1500ms
- Mute/DND respected (read from useSettingsStore)
- Reduced motion respected (skip overlays if animation intensity is "low")
- One reaction per event (no chaining)

---

## 5. Reaction Executor: `src/lib/ingest/reactionExecutor.ts`

Takes `ReactionOutput` and dispatches side effects:
- Eye state via `usePingStore.getState().setPersistentState()`
- Emotions via `triggerEmotion()` from audio.ts
- Sounds via appropriate `play*()` from audio.ts
- Overlays via `ping:triggerSpectacle` custom event

**Strict import boundary**:
```text
// ISOLATION RULE: This module is write-only into UI state.
// It may import: audio.ts (sounds + triggerEmotion), usePingStore (setPersistentState, triggerReaction)
// It may NOT import: bridge.ts, OpenClaw session data, message history
// ReactionExecutor must not access OpenClaw data under any circumstance.
```

---

## 6. Redaction Utility: `src/lib/ingest/redact.ts`

Used server-side in the edge function (primary) and available client-side for display.
- Strip URLs (replace with `[link]`)
- Strip token-like strings (hex/base64 patterns >20 chars)
- Strip code blocks (backtick fences)
- Hard cap at 120 characters
- Drop attachment references

---

## 7. Webhook Panel: `src/components/ping/WebhookPanel.tsx`

Sheet panel UI:
- **Ingest URL**: Full URL with copy button
- **Secret**: Masked display, copy, clear, regenerate (with manual update instructions + Supabase dashboard link)
- **"Remember secret on this device"** toggle (default OFF)
- **Warning**: "Your ingest secret is sensitive. Anyone with it can send events to Ping."
- **"Send Test Event"** button with local injection on success
- **Example curl command** (copyable)
- **Quick Payload Example** JSON block (copyable, for Zapier/Make)
- **"Show body preview"** toggle (display-only)
- **Disconnect** button

---

## 8. Event Feed: `src/components/ping/EventFeed.tsx`

Collapsible panel:
- Last 20 events with source label, eventType badge, title, relative timestamp
- Click to replay reaction
- Clear button
- Note: "Events from external webhooks will appear here in a future update (Stage 2)."

---

## 9. Diagnostics Panel Updates: `src/components/ping/DiagnosticsPanel.tsx`

Add "Isolation Status" section:
- OpenClaw: "Local-only" (green badge)
- Webhook ingest: "Inbound-only" (blue badge) or "Not connected"
- Cross-forwarding: "Disabled" (always, hardcoded)
- Token storage: "No" (OpenClaw), "Memory-only" or "Stored locally" (webhook secret)

"View data handling" modal with 3 bullets.

---

## 10. ConnectModal + ControlBar + Index Updates

- Add "Webhooks" tab to ConnectModal
- Add webhook icon button to ControlBar (desktop + mobile)
- Add `showWebhookPanel` and `showEventFeed` state to Index.tsx
- Listen for `ping:openWebhookPanel` custom event

---

## 11. Demo Script Updates

- Replace `getDiscordResponse()` with `getWebhooksResponse()`
- Update integrations button from "Discord (coming soon)" to "Webhooks"
- Add `integrate_webhooks` action dispatching `ping:openWebhookPanel`
- Add keywords: `webhook`, `ingest`, `zapier`, `make`, `event`, `feed`, `endpoint`
- Route `discord` keyword to webhooks response

---

## File Summary

| File | Action |
|------|--------|
| `supabase/config.toml` | New |
| `supabase/functions/ingest/index.ts` | New |
| `src/lib/ingest/types.ts` | New |
| `src/lib/ingest/reactionRouter.ts` | New |
| `src/lib/ingest/reactionExecutor.ts` | New |
| `src/lib/ingest/redact.ts` | New |
| `src/stores/useIngestStore.ts` | New |
| `src/components/ping/WebhookPanel.tsx` | New |
| `src/components/ping/EventFeed.tsx` | New |
| `src/components/ping/DiagnosticsPanel.tsx` | Edit |
| `src/components/ping/ConnectModal.tsx` | Edit |
| `src/components/ping/ControlBar.tsx` | Edit |
| `src/pages/Index.tsx` | Edit |
| `src/lib/demoScriptEngine.ts` | Edit |
| `src/lib/demoIntentRouter.ts` | Edit |
| `src/lib/types.ts` | Edit |

16 files (9 new, 7 edited). Requires Lovable Cloud + 1 secret (`PING_INGEST_SECRET`).

