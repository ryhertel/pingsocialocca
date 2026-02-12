

# Stage 3: Private Read Plane (Final — with all patches)

## Overview

Remove public reads of `ping_events`. All event reading goes through authenticated edge functions using a per-install read token. No user accounts. Incorporates ChatGPT's 5 patches plus 2 final fixes.

---

## 1. Database Migration

- Create `ping_channels` table: `channel_key text PRIMARY KEY`, `read_token_hash text NOT NULL`, `created_at timestamptz DEFAULT now()`, `rotated_at timestamptz`
- Enable RLS on `ping_channels` with no policies (no anon access)
- Drop `anon_select_ping_events` policy on `ping_events`

---

## 2. Edge Function: `supabase/functions/issue_read_token/index.ts` (New)

- Auth: `x-ping-secret` header validated against `PING_INGEST_SECRET`
- Channel key from `?key=` or `x-ping-channel-key`, validated 32-char hex
- Generate 32 random bytes as 64-char hex token
- SHA-256 hash, upsert into `ping_channels` via REST (service role)
- Return `{ ok: true, readToken, channelKey }` -- token returned once, never logged
- On failure: don't retry-spam; return clear error so frontend degrades gracefully

---

## 3. Edge Function: `supabase/functions/events_read/index.ts` (New)

- Headers: `x-ping-channel-key` (32 hex), `x-ping-read-token` (64 hex)
- Query: `?limit=50&since=<epoch_ms>`
- Hash token with SHA-256, fetch stored hash from `ping_channels`
- **Fix 1 -- Constant-time compare without branching:** Both hashes are SHA-256 (always 32 bytes). Enforce length == 32 at parse time. XOR loop over all 32 bytes, no early return, no length branch.
- **Fix 2 -- Use `received_at` consistently:** Order by `received_at DESC`, filter `since` on `received_at > value`
- Return `{ ok: true, events }` with `event_type` mapped to `eventType`
- 401 on invalid/missing token

---

## 4. Edge Function: `supabase/functions/events_stream/index.ts` (New, SSE)

- Auth via query params (EventSource can't send headers): `?key=<channelKey>&token=<readToken>`
- Same token validation as `events_read` (Fix 1: no-branch constant-time compare)
- SSE connection: poll every 2s for rows where `received_at > lastSeen` (Fix 2: consistent field)
- Order poll results by `received_at ASC` so events stream in chronological order
- Send as `event: ping\ndata: <json>\n\n`, keepalive every 15s
- Token in URL mitigated by: memory-only, rotated each boot, never in toasts/logs

---

## 5. Constant-Time Compare Implementation (Fix 1 detail)

Both hex hash strings are decoded to `Uint8Array(32)`. If either doesn't decode to exactly 32 bytes, reject immediately (this is not a timing leak -- it's a format error, not a secret-dependent branch). The compare loop:

```text
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  // Both must be 32 bytes (SHA-256). Callers enforce this before calling.
  let diff = 0;
  for (let i = 0; i < 32; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
```

No length check inside the function. Length is enforced at parse time (reject non-32-byte inputs before reaching compare).

---

## 6. New Module: `src/lib/ingest/privateReadClient.ts`

- `issueReadToken(channelKey, ingestSecret)` -- POST to `issue_read_token`, returns token or null on failure (no retry spam)
- `fetchEventsSecure(channelKey, readToken, limit?, since?)` -- GET `events_read` with headers
- `openSecureStream(channelKey, readToken, onEvent, onStatus)` -- EventSource to `events_stream?key=...&token=...`; on error, falls back to polling `fetchEventsSecure` every 3s; returns cleanup function; never includes token in error strings

---

## 7. Rewrite `src/lib/ingest/realtime.ts` (keep filename)

Remove Supabase Realtime subscription and direct SELECT. New exports:
- `startSecureStream(channelKey, readToken)` -- uses `openSecureStream`, pushes events to store, executes reactions
- `stopSecureStream()` -- cleanup, sets `secureStreamConnected = false`
- `fetchRecentEventsSecure(channelKey, readToken, limit?)` -- uses `fetchEventsSecure`, pushes to store

---

## 8. Store: `src/stores/useIngestStore.ts`

Add: `readToken: string | null` (memory-only), `secureStreamConnected: boolean`, `setReadToken()`, `setSecureStreamConnected()`

---

## 9. Boot: `src/pages/Index.tsx`

When `channelKey` + `ingestSecret` exist:
1. Call `issueReadToken` -- if it fails, degrade cleanly (show message, don't retry)
2. `fetchRecentEventsSecure` for initial load
3. `startSecureStream` for live updates
4. On unmount/change: `stopSecureStream`, `setReadToken(null)`

Without secret: "Set your ingest secret to enable the secure event feed"

---

## 10. UI Label Changes

All "Realtime" becomes "Secure stream" in: WebhookPanel, EventFeed, DiagnosticsPanel, ConnectorPanel, Connectors page. Status reads `secureStreamConnected`. Add note in WebhookPanel: "Events are private; this device must be authorized to read."

---

## 11. Config: `supabase/config.toml`

Add 3 entries with `verify_jwt = false` for `issue_read_token`, `events_read`, `events_stream`.

---

## File Summary

| File | Action |
|------|--------|
| Migration SQL | New |
| `supabase/functions/issue_read_token/index.ts` | New |
| `supabase/functions/events_read/index.ts` | New |
| `supabase/functions/events_stream/index.ts` | New |
| `supabase/config.toml` | Edit |
| `src/lib/ingest/privateReadClient.ts` | New |
| `src/lib/ingest/realtime.ts` | Rewrite |
| `src/stores/useIngestStore.ts` | Edit |
| `src/pages/Index.tsx` | Edit |
| `src/components/ping/WebhookPanel.tsx` | Edit |
| `src/components/ping/EventFeed.tsx` | Edit |
| `src/components/ping/DiagnosticsPanel.tsx` | Edit |
| `src/components/ping/ConnectorPanel.tsx` | Edit |
| `src/pages/Connectors.tsx` | Edit |

14 files (5 new, 9 edited) + 1 migration. No new secrets.

**Key fixes baked in:**
- Fix 1: Constant-time compare enforces 32-byte length at parse time, no branching in compare loop
- Fix 2: All ordering and `since` filters use `received_at`, not `created_at`
- Graceful degradation: if `issue_read_token` fails, UI shows clear message without retry spam

