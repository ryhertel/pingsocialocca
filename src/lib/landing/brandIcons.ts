import { siDiscord, siGithub, siLinear, siSentry, siStripe, siVercel } from 'simple-icons';

/**
 * The marks the ticker shows beside each service, so a visitor can see at a glance
 * what Ping connects to. Paths and brand colours come from simple-icons (CC0 data;
 * the marks themselves belong to their owners and are used only to name the
 * service they identify).
 *
 * A connector with no entry here (the generic webhook, the local bridge, email)
 * isn't a brand, and keeps Ping's own eyes.
 */
export type BrandIcon =
  | { kind: 'glyph'; path: string; hex: string }
  | { kind: 'image'; src: string };

// simple-icons dropped Slack at its owner's request. This is the same mark from
// v13.0.0 of that package, the last release that carried it.
const SLACK_PATH =
  'M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z';

const glyph = (i: { path: string; hex: string }): BrandIcon => ({ kind: 'glyph', path: i.path, hex: i.hex });

/** Keyed by connector id. */
export const BRAND_ICONS: Record<string, BrandIcon> = {
  github: glyph(siGithub),
  stripe: glyph(siStripe),
  vercel: glyph(siVercel),
  sentry: glyph(siSentry),
  linear: glyph(siLinear),
  discord: glyph(siDiscord),
  slack: { kind: 'glyph', path: SLACK_PATH, hex: '4A154B' },
  // Watchrr's own app icon, from its site.
  watchrr: { kind: 'image', src: '/connectors/watchrr.png' },
};
