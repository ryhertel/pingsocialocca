

# Phase 1: Scripted Demo Engine + Interactive Chat + Demo Badge

## What's included in Phase 1

- Scripted state-machine demo engine replacing the random message picker
- Intent/topic keyword router (no AI)
- Opening flow with auto-message on load
- Modular response map (What Is Ping, Notifications, Integrations, Privacy)
- Quick-reply buttons rendered as a row below the last assistant message
- "Demo Mode (scripted)" badge + subtext in header
- Persistent CTAs (Connect OpenClaw, Discord coming soon, Keep exploring)
- Restart Demo button always visible
- Fallback for unknown input (never dead-ends)
- Demo actions: trigger eye states + sounds from response nodes

## What's deferred to Phase 2

- Eye redesign (30-40% larger, new states like laugh, shock, etc.)
- Video game sound system overhaul (signature motif, frequency mapping)
- Liveliness/Energy Level slider (0-100)
- OpenClaw setup UI with copy button + setup steps modal

---

## Files to create

### `src/lib/demoScriptEngine.ts` -- New scripted demo engine

Replaces the current `demoEngine.ts` random message system with a deterministic router.

**demoState** tracks:
- `currentModule`: `'idle' | 'welcome' | 'whatIsPing' | 'notifications' | 'integrations' | 'privacy'`
- `stepsCompleted`: number
- `lastIntegration`: string or null
- `sawNotificationDemo`: boolean
- `turnsSinceCtaSurface`: number (surfaces CTA every 2-3 turns)

**Intent router** -- keyword scoring + regex, not AI:
- Maps typed input to intents: `learn`, `see_demo`, `integrate`, `pricing`, `security`, `troubleshooting`
- Maps to topics: `openclaw`, `discord`, `notifications`, `sound`, `eyes`, `privacy`
- If input matches a button label exactly, route to that module
- Unknown input returns a friendly fallback with 3 buttons

**Response nodes** -- each returns:
- `text`: 1-3 sentences
- `buttons`: array of `{ label: string, action: string }` (required, never empty)
- `demoActions`: optional array of `{ type: 'triggerEyes' | 'triggerSound', payload: string }`

**Module responses:**

| Module | Key responses |
|--------|-------------|
| Welcome (auto on load) | "Hey, I'm Ping. I turn AI agent activity into expressive eyes + notification moments. Want to see a quick demo?" Buttons: Yes - show me, Tell me what Ping does, Connect OpenClaw |
| What Is Ping | Explanation of visual feedback. Buttons: Notifications, Integrations, Privacy |
| Notifications | Triggers sound + eye reaction. Buttons: Trigger another, Connect your agent, Back to menu |
| Integrations | Options: OpenClaw, Discord, Other, Just exploring. OpenClaw shows local-first explanation. Discord says "coming soon" |
| Privacy | Security reassurance. Buttons: Back to demo, Connect OpenClaw |
| Fallback | "I'm in Demo Mode (scripted), but I can show you the experience." Buttons: Notifications, Integrations, Privacy |

Every 2-3 turns, append a CTA: "Ready to connect your real agent?" with Connect button.

**Exported functions:**
- `startScriptedDemo()` -- clears messages, sends welcome message with buttons
- `stopScriptedDemo()` -- clears timers
- `handleDemoInput(text: string)` -- routes input through intent router, returns response
- `handleDemoButtonClick(action: string)` -- routes button action to module

### `src/lib/demoIntentRouter.ts` -- Intent + topic keyword matcher

Simple keyword scoring:
```
const INTENT_KEYWORDS = {
  learn: ['what', 'how', 'explain', 'tell', 'about', 'info'],
  see_demo: ['demo', 'show', 'try', 'see', 'yes', 'cool'],
  integrate: ['connect', 'setup', 'openclaw', 'discord', 'bridge', 'agent'],
  pricing: ['price', 'cost', 'free', 'pay'],
  security: ['security', 'privacy', 'safe', 'token', 'local', 'data'],
  troubleshooting: ['error', 'help', 'broken', 'not working', 'issue'],
};
```

Exported: `routeInput(text: string): { intent: string, topic: string | null }`

---

## Files to modify

### `src/lib/types.ts`

Add new types:
```typescript
export interface DemoButton {
  label: string;
  action: string;
}

export interface DemoAction {
  type: 'triggerEyes' | 'triggerSound';
  payload: string;
}

// Extend ChatMessage to optionally carry buttons
export interface ChatMessage {
  // ... existing fields
  buttons?: DemoButton[];
}
```

### `src/components/ping/ChatStack.tsx`

- After the last assistant message, if it has `buttons` array, render a row of pill-shaped quick-reply buttons
- Buttons styled as small rounded pills with theme-tinted border, text-sm
- On click, call `handleDemoButtonClick(action)` from the demo engine
- Only show buttons on the most recent assistant message
- Buttons disappear once the user sends a new message or clicks one

### `src/components/ping/Composer.tsx`

- When in demo mode, route input through `handleDemoInput()` from the scripted engine instead of `triggerDemoResponse()`
- Still adds the user message to the chat store
- Still plays send sound

### `src/pages/Index.tsx`

- Add "Demo Mode (scripted)" badge in header area (between logo/status and controls)
- Badge: small pill with text "Demo Mode (scripted)" using Badge component
- Below it (or as tooltip): "This demo is scripted to show the experience -- not a real AI."
- Add "Restart Demo" button visible when in demo mode (in header or control bar area)
- Replace `startDemo`/`stopDemo` imports with `startScriptedDemo`/`stopScriptedDemo`

### `src/components/ping/ControlBar.tsx`

- Add "Restart Demo" item to both desktop ControlBar and MobileMenu when `connectionMode === 'demo'`
- Icon: `RotateCcw` from lucide

### `src/lib/demoEngine.ts`

- Keep file but mark as legacy / remove the random message logic
- Or: delete entirely and replace all imports with `demoScriptEngine`

### `src/stores/usePingStore.ts`

- No changes needed -- the existing `addMessage` and `ChatMessage` flow works. The `buttons` field is added to the type.

### `src/lib/audio.ts`

- No changes in Phase 1 (existing sounds are triggered via demoActions)

### `src/components/ping/FaceCanvas.tsx`

- No changes in Phase 1 (existing eye states are triggered via `setPersistentState` and `triggerReaction` from demoActions)

---

## Quick-reply button behavior

- Rendered as a horizontal flex-wrap row of pill buttons below the last assistant bubble
- Each pill: `rounded-full px-3 py-1.5 text-xs border border-primary/30 bg-primary/5 hover:bg-primary/15 text-foreground`
- Clicking a button:
  1. Adds a user message with the button label text
  2. Hides all buttons
  3. Routes through `handleDemoButtonClick(action)`
  4. Shows thinking state briefly (1-2s)
  5. Shows assistant response with new buttons

## Demo flow example

```
[Auto on load]
Assistant: "Hey, I'm Ping. I turn AI agent activity into expressive eyes + notification moments. Want to see a quick demo?"
Buttons: [Yes - show me] [Tell me what Ping does] [Connect OpenClaw]

[User clicks "Yes - show me"]
User: "Yes - show me"
[Eyes: thinking, 1.5s delay]
Assistant: "Watch Ping's eyes react to different events. Here's a notification..."
[DemoAction: triggerSound('notify'), triggerEyes('speaking')]
Buttons: [Trigger another] [What is Ping?] [Connect your agent]

[User types "privacy"]
[Intent router matches: security topic]
User: "privacy"
Assistant: "Ping never stores tokens in the browser. OpenClaw runs locally on your machine. This demo is fully sandboxed."
Buttons: [Back to demo] [Connect OpenClaw]
```

## Summary of all file changes

| File | Action |
|------|--------|
| `src/lib/demoScriptEngine.ts` | Create -- scripted state machine + response map |
| `src/lib/demoIntentRouter.ts` | Create -- keyword router |
| `src/lib/types.ts` | Modify -- add DemoButton, DemoAction, buttons field on ChatMessage |
| `src/lib/demoEngine.ts` | Delete (replaced by demoScriptEngine) |
| `src/components/ping/ChatStack.tsx` | Modify -- render quick-reply buttons below last message |
| `src/components/ping/Composer.tsx` | Modify -- route demo input through scripted engine |
| `src/pages/Index.tsx` | Modify -- add demo badge, restart button, swap engine imports |
| `src/components/ping/ControlBar.tsx` | Modify -- add Restart Demo item |

