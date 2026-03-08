

# Notification History & Chat Persistence

## Current State
- **Ingest events** are already persisted in the `ping_events` DB table and fetched on boot via `fetchRecentEventsSecure` -- no work needed here.
- **Chat messages** (`usePingStore.messages`) are purely in-memory and lost on page refresh.

## Approach: localStorage Persistence for Chat Messages
Given the project's local-first security model (no user accounts, bridge data stays local), persisting chat messages to **localStorage** is the right fit -- not the database. Attachments with base64 `dataBase64` fields will be stripped before serialization to avoid blowing the ~5MB localStorage quota.

## Changes

### 1. `src/stores/usePingStore.ts` — Add localStorage persistence
- Add Zustand `persist` middleware (already used by `useSettingsStore`)
- Persist only the `messages` array (not transient state like `bridgeStatus`, `transientReaction`, etc.)
- Use `partialize` to select only `messages`
- On hydration, mark all messages as `isRevealing: false` (no re-animation on reload)
- Strip `attachments[].dataBase64` and `attachments[].blobUrl` before serializing to keep storage small — keep only metadata (name, mime, size, id)

### 2. `src/stores/usePingStore.ts` — Cap stored messages
- Already caps at 50 in-memory; persist the same ring buffer
- Storage key: `ping-chat-messages`

### 3. `src/components/ping/SettingsPanel.tsx` — Add "Clear Chat History" button
- Add a button in the settings panel that calls `clearMessages()` and shows a toast confirmation

## No database changes needed. No new files needed.

