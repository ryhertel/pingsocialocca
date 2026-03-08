

## Two Issues

### 1. Add OpenClaw to the Integrations Section

OpenClaw is the primary local AI agent bridge and the most important connector, but it's completely missing from the landing page integrations grid. It needs to be added as the first (or prominently placed) item.

**Files to change:**

- **`src/components/landing/IntegrationsSection.tsx`**: Add OpenClaw to the `integrations` array as the first entry, using the `Bot` icon from lucide-react (or `Terminal`). Name: "OpenClaw", desc: "Local AI agent bridge. Connect your own agent over WebSocket." Update the subtitle copy to say "9 connectors" instead of "8". Link it to the OpenClaw setup or docs anchor.

- **`src/lib/connectors/connectorTemplates.ts`**: Add an OpenClaw connector template entry at the top of the array with id `openclaw`, appropriate setup steps referencing the WebSocket bridge at `ws://127.0.0.1:3939/ping`, and a test event. This ensures it also appears on the `/connectors` page.

- **`src/pages/Connectors.tsx`**: Ensure the ICON_MAP includes the icon used for OpenClaw so it renders correctly on that page too.

### 2. Remove All Emdashes from User-Facing Copy

Replace every `—` (emdash) with either `. ` (period + space), `,` (comma), or `-` (hyphen) depending on context across the entire site. Files with emdashes in user-facing copy:

| File | Emdash locations |
|------|-----------------|
| `src/components/landing/HeroSection.tsx` | Line 30: "webhook, or automation —" |
| `src/components/landing/HeroSection.tsx` | Line 52: "Live preview —" |
| `src/components/landing/IntegrationsSection.tsx` | Line 31: "events —" |
| `src/components/landing/FeaturesSection.tsx` | Line 6: "happen —" |
| `src/components/landing/FeaturesSection.tsx` | Line 9: "do-not-disturb —" (keep the hyphens in "do-not-disturb", remove emdash) |
| `src/components/landing/HowItWorksSection.tsx` | Line 4: "app —" |
| `src/components/ping/WelcomeDialog.tsx` | Line 30: "companion —" |
| `src/components/ping/OnboardingTour.tsx` | Line 18: "Ping —" |
| `src/components/ping/DiagnosticsPanel.tsx` | Lines 87, 112, 198, 199 |
| `src/components/ping/WebhookPanel.tsx` | Line 125: "Order #1234 —" |
| `src/components/ping/FaceCanvas.tsx` | Lines 226, 240 (code comments only, not user-facing) |
| `src/components/ErrorBoundary.tsx` | Line 26: "reloading —" |
| `src/pages/Index.tsx` | Line 207 (tooltip copy) |
| `src/lib/connectors/connectorTemplates.ts` | Multiple descriptions and notes fields |
| `src/lib/bridge.ts` | Code comments only |
| `src/lib/spectacles.ts` | Code comments only |
| `src/stores/useIngestStore.ts` | Code comment only |
| `src/lib/ingest/realtime.ts` | Code comment only |

Code comments will be left as-is. Only user-visible strings (JSX text, template data strings) will be updated. Each emdash will be replaced with the most natural alternative for its context (typically ". " or ", " or " - ").

