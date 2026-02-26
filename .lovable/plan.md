
Goal: address your 3 current issues (eye shape consistency, markdown title rendering, OpenClaw disconnect behavior) and give a clear yes/no on the Stage 4 Docs work.

What I found in your current codebase:
1) Eye shape + layout consistency
- Eyes are rendered in one place: `src/components/ping/FaceCanvas.tsx` (render math near lines ~517+).
- Current shape is rectangular with rounded corners (`eyeW`, `baseH`, `cornerR`), already tuned “slightly more square”.
- There is no explicit “docked mode eye shape” branch, but the request is still valid: we should make the base eye geometry more square and lock it to one shared profile so both chat layouts always use identical dimensions.

2) “### Why t” showing raw # symbols
- `src/components/ping/ChatMarkdown.tsx` currently supports bold/italic/lists/code/links.
- It does not parse markdown headings (`#`, `##`, `###`), so those render as plain text with literal `#`.
- This is exactly why you’re seeing heading markers in chat.

3) OpenClaw “Disconnect” appears broken
- In `src/components/ping/OpenClawSetupModal.tsx`, the Disconnect button calls `disconnectBridge()` + switches mode to demo.
- In `src/lib/bridge.ts`, `disconnectBridge()` sets `ws.onclose = null` before closing.
- Because of that, the normal close handler (which marks bridge status disconnected) does not run, so UI can remain “Connected” even after clicking Disconnect.
- Root cause: local bridge status isn’t forcibly reset during manual disconnect.

4) Stage 4 Docs Mode status
- Not implemented yet.
- Verified gaps:
  - No `/docs` routes in `src/App.tsx`
  - No docs pages in `src/pages/`
  - No docs registry/helpers in `src/lib/docs/`
  - `ConnectorTemplate` has no `docs` field yet
- So yes: those additions are still pending if you want that docs experience.

Implementation plan:
Phase 1 — Fix the 3 active bugs/UX issues first (recommended immediate pass)
A) Make eyes “much squarer” and consistent across chat views
- File: `src/components/ping/FaceCanvas.tsx`
- Introduce named constants for eye profile (width ratio, height ratio, corner radius ratio, gap ratio) so the shape is centralized and stable.
- Adjust ratios toward near-square with rounded corners (not fully square).
- Ensure both bubble and docked layouts always use this same profile by keeping the geometry source singular and removing any implicit drift risk.
- Keep animation behavior (blink/squint/widen) intact while changing only base geometry proportions.

B) Add heading support to chat markdown
- File: `src/components/ping/ChatMarkdown.tsx`
- Extend block parsing to detect ATX headings (`#` through `######`) and render semantic heading elements.
- Keep existing support for lists/inline code/code blocks/links unchanged.
- Ensure heading parsing does not break progressive reveal behavior (partial text during reveal should still render safely).

C) Add heading styles so titles look like titles
- File: `src/index.css`
- Add scoped `.chat-markdown` heading styles (`h1`–`h4` at minimum) with:
  - stronger weight
  - slightly larger size than body
  - compact vertical spacing suited to chat bubbles/panels
- Keep styles restrained so they don’t overwhelm small chat UI.

D) Make OpenClaw Disconnect truly disconnect in UI
- File: `src/lib/bridge.ts` (primary)
- Update `disconnectBridge()` to explicitly reset store connection state immediately (connected false, clear agent/protocol/capabilities) so status banner updates instantly.
- Keep reconnect cancellation logic in place.
- This ensures Disconnect works whether socket close callbacks fire or not.
- Optional tiny reinforcement in `OpenClawSetupModal.tsx`: no logic change needed if bridge utility is fixed centrally.

Phase 2 — Validation checklist after implementation
1) Eye validation
- Compare bubble vs docked mode side-by-side: eye dimensions and corner feel should match.
- Confirm eyes are noticeably squarer but still rounded.

2) Markdown validation
- Send messages containing:
  - `### Heading`
  - bold/italic
  - lists
  - inline + fenced code
- Confirm heading markers no longer show and headings are styled.

3) Disconnect validation
- Connect OpenClaw, confirm Connected banner appears.
- Click Disconnect, confirm:
  - banner immediately leaves connected state
  - composer/bridge-dependent behavior reflects disconnected state
  - no stuck “Connected” badge.

Stage 4 Docs recommendation (answer to your “do we still need this?”):
- Not required for core runtime behavior today.
- Worth doing for product polish, onboarding clarity, and fewer setup errors.
- Practical approach: ship Phase 1 fixes first (fast), then implement Stage 4 as a separate feature pass so docs scope doesn’t block your current UX fixes.

Technical change list (planned):
- `src/components/ping/FaceCanvas.tsx` — squarer eye profile constants + unified geometry usage
- `src/components/ping/ChatMarkdown.tsx` — heading parsing support
- `src/index.css` — heading styles under `.chat-markdown`
- `src/lib/bridge.ts` — hard reset bridge status on manual disconnect
- (No backend/Lovable Cloud schema changes needed for these fixes)

Acceptance criteria:
- Eyes look consistently near-square in both chat layouts.
- Markdown headings render as styled headings, not raw `###`.
- OpenClaw Disconnect reliably updates UI/state to disconnected immediately.
- Stage 4 status is clearly understood as not yet implemented, optional next step.
