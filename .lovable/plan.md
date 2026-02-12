

# Stage 2: Supabase Realtime Push + Connector Gallery + Templates

## Overview

Upgrade Ping so external webhook events appear in the UI instantly via Supabase Realtime, without user accounts. Add a `/connectors` page with connector templates (Generic, Stripe, GitHub) and a "Send Test Event" button on every connector card.

**Security/correctness patches incorporated:**
1. RLS is documented as open-read MVP; Stage 3 will tighten
2. `realtimeConnected` set from subscription status callback, never optimistically
3. `channel_key` validated as 32-char hex (case-insensitive), normalized to lowercase
4. Test events use client-generated UUID (any UUID format accepted, not v4-specific) for deterministic dedup
5. `SUPABASE_SERVICE_ROLE_KEY` used only in edge function, never in frontend
6. DB insert failure returns `{ ok: false, error: 'insert_failed' }` with HTTP 500 -- no lying API

---

## 1. Database Migration

```sql
CREATE TABLE public.ping_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_key text NOT NULL,
  source text NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  body text,
  tags text[],
  severity int2 NOT NULL DEFAULT 1,
  timestamp bigint NOT NULL,
  received_at bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ping_events_channel_created
  ON public.ping_events (channel_key, created_at DESC);

ALTER TABLE public.ping_events ENABLE ROW LEVEL SECURITY;

-- MVP RLS: open read for anon. Events contain only redacted metadata
-- (no PII, no secrets, no raw payloads). Channel keys are random 32-char hex.
-- Client subscribes with channel_key=eq.<key> filter.
-- Stage 3 will tighten RLS with per-channel read tokens or signed JWT claims.
CREATE POLICY "anon_select_ping_events"
  ON public.ping_events FOR SELECT TO anon USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ping_events;
```

---

## 2. Edge Function Updates: `supabase/functions/ingest/index.ts`

### 2A. Channel key
- Read from header `x-ping-channel-key` OR query param `?key=...`
- Validate: `/^[0-9a-fA-F]{32}$/` (accepts upper or lowercase)
- Normalize: `channelKey = channelKey.toLowerCase()`
- Reject 400 if missing or invalid
- Add `x-ping-channel-key` to CORS allowed headers

### 2B. Optional `id` from payload
- If payload includes `id` matching `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`, use it (normalized to lowercase)
- Otherwise generate `crypto.randomUUID()`

### 2C. Insert into `ping_events` via service role
- Create Supabase client using `Deno.env.get('SUPABASE_URL')` + `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`
- Comment: `// SUPABASE_SERVICE_ROLE_KEY is server-side only. Never expose in frontend code.`
- Insert redacted normalized fields: `{ id, channel_key, source, event_type, title, body, tags, severity, timestamp, received_at }`
- **If INSERT fails: return HTTP 500 `{ ok: false, error: 'insert_failed' }`** -- do not report success without storage
- On success: return `{ ok: true, id, event }` as before

### 2D. Field naming
- DB column is `event_type`, frontend type is `eventType`
- Edge function maps `eventType` -> `event_type` on insert
- Realtime mapper in `realtime.ts` maps `event_type` -> `eventType` on receive

---

## 3. Channel Key in `useIngestStore.ts`

Add:
- `channelKey: string` -- generated once on first load via `crypto.getRandomValues(16)` -> 32-char lowercase hex, persisted in localStorage (`ping-channel-key`)
- `setChannelKey(key: string)` -- normalize to lowercase + persist
- `regenerateChannelKey()` -- rotate locally, warn user to update webhook configs
- `realtimeConnected: boolean` -- set ONLY from subscription status callback
- `setRealtimeConnected(value: boolean)`

Update `pushEvent` to **deduplicate by `id`**: skip if event with same id exists in buffer.

Add helper `getIngestUrlWithKey()` returning URL with `?key=<channelKey>`.

---

## 4. Realtime Subscription: `src/lib/ingest/realtime.ts` (new)

- `subscribeToEvents(channelKey)`:
  - `supabase.channel('ping-events:' + channelKey).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ping_events', filter: 'channel_key=eq.' + channelKey }, ...)`
  - Map row: `event_type` -> `eventType`, all other columns direct
  - Push into store (deduped by id), execute reaction
  - `.subscribe(status => setRealtimeConnected(status === 'SUBSCRIBED'))` -- status-driven, not optimistic
- `unsubscribeFromEvents()` -- remove channel, set `realtimeConnected = false`
- `fetchRecentEvents(channelKey, limit = 50)` -- SELECT last N from `ping_events` where `channel_key = channelKey`, map and push (deduped)

Isolation: imports only from `supabase/client`, `useIngestStore`, `reactionRouter`, `reactionExecutor`, `types`. No bridge.ts or usePingStore messages.

---

## 5. Connector Templates

### `src/lib/connectors/types.ts` (new)
```text
ConnectorTemplate {
  id: string
  name: string
  description: string
  icon: string
  setupSteps: string[]
  testEvent: { source, eventType, title, body? }
  keywordsSupported: string[]
  notes: string
  securityCopy: string
}
```

### `src/lib/connectors/connectorTemplates.ts` (new)
Three templates:
1. **Generic Webhook** -- shows URL with `?key=`, headers, payload schema. Test event: generic success.
2. **Stripe** -- two paths (direct / Zapier-Make). Test event uses `$` keyword to trigger money reaction.
3. **GitHub** -- webhook config to Ping URL. Test event uses "deploy" keyword.

---

## 6. Connectors Page: `src/pages/Connectors.tsx` (new)

- Route `/connectors` (added to `App.tsx`)
- Grid of connector cards from templates
- Each card: icon, name, description, "Setup" button (opens ConnectorPanel), "Send Test Event" button
- Header with channel key display (masked + copy) and back navigation

---

## 7. Connector Panel: `src/components/ping/ConnectorPanel.tsx` (new)

Sheet rendered from ConnectorTemplate:
- Numbered setup steps
- Ingest URL with `?key=<channelKey>` (copyable)
- Required headers
- Example curl (populated)
- Example JSON payload (copyable)
- "Send Test Event" button
- Security notes

---

## 8. Test Event Logic

Every "Send Test Event" button:
- Generates UUID client-side (`crypto.randomUUID()`)
- POSTs with `?key=<channelKey>`, `x-ping-secret` header, UUID in payload `id` field
- If `realtimeConnected`: wait up to 3s for Realtime delivery (same UUID dedupes). Toast: "Event received via Realtime!"
- If not connected: inject from response. Toast: "Realtime disconnected: showing local preview only"
- On error: error toast

---

## 9. UI Updates

### WebhookPanel
- Add channelKey masked display + copy
- Update URL/curl examples with `?key=<channelKey>`
- Add Realtime indicator (green/red dot)
- Add "Browse connector templates" link to `/connectors`

### EventFeed
- Remove "Stage 2" note
- Add Realtime indicator at top
- Fetch recent events on mount via `fetchRecentEvents()`

### DiagnosticsPanel
- Add "Realtime" row: Connected/Disconnected from `realtimeConnected`
- Add "Channel Key" row: masked display
- Update webhook badge to "Inbound-only (Realtime)" when connected

### ControlBar
- Add "Connectors" button navigating to `/connectors`

---

## 10. Index.tsx

- `useEffect`: subscribe to Realtime when `channelKey` exists, fetch recent events, unsubscribe on unmount, re-subscribe on key change

---

## 11. Demo Script Updates

- Update webhook response to mention `/connectors`
- Add `connectors` keyword to intent router
- Add `open_connectors` action navigating to `/connectors`

---

## File Summary

| File | Action |
|------|--------|
| Migration SQL | New |
| `supabase/functions/ingest/index.ts` | Edit |
| `src/lib/ingest/realtime.ts` | New |
| `src/lib/connectors/types.ts` | New |
| `src/lib/connectors/connectorTemplates.ts` | New |
| `src/stores/useIngestStore.ts` | Edit |
| `src/pages/Connectors.tsx` | New |
| `src/components/ping/ConnectorPanel.tsx` | New |
| `src/components/ping/WebhookPanel.tsx` | Edit |
| `src/components/ping/EventFeed.tsx` | Edit |
| `src/components/ping/DiagnosticsPanel.tsx` | Edit |
| `src/components/ping/ControlBar.tsx` | Edit |
| `src/pages/Index.tsx` | Edit |
| `src/App.tsx` | Edit |
| `src/lib/demoScriptEngine.ts` | Edit |
| `src/lib/demoIntentRouter.ts` | Edit |

16 files (6 new, 10 edited) + 1 migration. No new secrets required.

## Technical Details: Security Summary

- **RLS**: Open-read MVP. Events are redacted. Stage 3 tightens with per-channel read tokens or signed JWT claims.
- **Channel key**: Validated `/^[0-9a-fA-F]{32}$/`, normalized to lowercase. Garbage keys rejected 400.
- **UUID**: Any UUID format accepted (case-insensitive), not v4-specific. Normalized to lowercase.
- **Insert failure**: Returns HTTP 500 `{ ok: false, error: 'insert_failed' }`. No silent success without storage.
- **Realtime status**: Set from `.subscribe(status => ...)` callback. `true` only on `SUBSCRIBED`.
- **Service role key**: Edge function only. Explicit code comment. Never in `src/`.
- **Field mapping**: DB `event_type` <-> frontend `eventType`, mapped consistently in edge function (write) and `realtime.ts` (read).

