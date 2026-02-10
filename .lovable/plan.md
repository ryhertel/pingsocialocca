

# Bridge Mode Testing — UX Helpers

## What already works (no code changes needed)

The bridge client in `bridge.ts` passes the full URL to `new WebSocket(url)`, so `ws://127.0.0.1:3939/ping` (with the `/ping` path) already works out of the box. No client-side changes are required.

## Code Changes

### 1. Connect Modal — helper note
**File: `src/components/ping/ConnectModal.tsx`**

Update the helper text below the URL input to include a fallback tip:

> "Bridge must bind to 127.0.0.1 only. UI never stores tokens.
> Tip: If your server doesn't support URL paths, use ws://127.0.0.1:3939"

### 2. Diagnostics Panel — Bridge Test Checklist
**File: `src/components/ping/DiagnosticsPanel.tsx`**

Add a collapsible "Bridge Test Checklist" section at the bottom of the diagnostics panel (only visible when in Bridge mode). Contains four items with auto-detected pass/fail status:

| Check | Auto-detected via |
|-------|-------------------|
| Status chip shows Idle | `persistentState === 'idle'` |
| Protocol version received | `bridgeStatus.protocolVersion` exists |
| Agent name received | `bridgeStatus.agentName` exists |
| Message round-trip works | At least one assistant message in `messages[]` |

Each item shows a green checkmark or gray circle based on current state. This gives instant visual feedback during testing.

### 3. Copy-paste test server (not a code change — instructions for you)

Create a folder anywhere on your machine and run these commands:

```
mkdir ping-bridge-test
cd ping-bridge-test
npm init -y
npm i ws
```

Then create `ping-bridge.mjs` with this content:

```javascript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({
  host: '127.0.0.1',
  port: 3939,
  path: '/ping',
});

const replies = [
  "Hello! I'm your test bridge agent.",
  "Everything looks good from here.",
  "Ping protocol is working correctly.",
  "That's a great question — let me think about it.",
  "All systems nominal.",
];

wss.on('connection', (ws) => {
  console.log('[bridge] client connected');

  // Send status on connect
  ws.send(JSON.stringify({
    type: 'status',
    connected: true,
    agentName: 'Test Bridge',
    agentId: 'test-001',
    protocolVersion: 'ping/0.1',
  }));

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);
      console.log('[bridge] received:', data);

      if (data.type === 'send') {
        // Send thinking state
        ws.send(JSON.stringify({ type: 'state', state: 'thinking' }));

        // Reply after 1.5-3s delay
        const delay = 1500 + Math.random() * 1500;
        setTimeout(() => {
          const text = replies[Math.floor(Math.random() * replies.length)];
          ws.send(JSON.stringify({
            type: 'message',
            role: 'assistant',
            text,
            ts: Date.now(),
          }));
        }, delay);
      }

      if (data.type === 'ping') {
        // Heartbeat — no response needed
      }
    } catch {
      // ignore malformed
    }
  });

  ws.on('close', () => console.log('[bridge] client disconnected'));
});

console.log('[bridge] listening on ws://127.0.0.1:3939/ping');
```

Run it:
```
node ping-bridge.mjs
```

Then in Ping: open Connect modal, switch to Bridge, click Connect. The default URL `ws://127.0.0.1:3939/ping` will work immediately.

### Verification checklist (manual)

1. Status chip turns green (Idle)
2. Open Diagnostics -- shows Protocol: ping/0.1, Agent: Test Bridge
3. Type a message -- status goes to Thinking, then reply appears, then back to Idle
4. Stop the server (Ctrl+C) -- status goes to Disconnected
5. Restart server -- auto-reconnects within 3 seconds

## Technical summary

| File | Change |
|------|--------|
| `src/components/ping/ConnectModal.tsx` | Add fallback URL tip text |
| `src/components/ping/DiagnosticsPanel.tsx` | Add collapsible Bridge Test Checklist with auto-detected status |

