

# Ping Pre-Launch Plan — 8 Tasks in Order

This is a large body of work. I'll implement each task sequentially across multiple messages. Here's the full plan:

---

## 1. Landing Page at `/`

**What:** Create a marketing landing page at `/` and move the current app to `/app`.

- New `src/pages/Landing.tsx` — hero section with animated Ping eyes preview, value props, "Launch App" CTA button, brief feature highlights, and a footer.
- Style with the existing dark theme (Ping's `--ping-bg` palette).
- Update `App.tsx` routing: `/` → Landing, `/app` → current Index.
- Update internal navigation links (e.g., logo click, 404 "return home").

---

## 2. Error Boundary

**What:** Add a React error boundary so crashes show a branded fallback instead of a white screen.

- New `src/components/ErrorBoundary.tsx` — class component catching render errors.
- Fallback UI: Ping logo, "Something went wrong" message, Reload button, dark-themed.
- Wrap `<App />` in `main.tsx` with the boundary.

---

## 3. Loading / Splash Screen

**What:** Show a branded splash while JS hydrates.

- Add inline CSS + HTML splash in `index.html` inside `#root` (pre-React).
- Ping logo centered, subtle pulse animation, dark background matching `--ping-bg`.
- React will replace it on mount automatically.

---

## 4. Accessibility Audit Fixes

**What:** Improve a11y across canvas, controls, and 404.

- `FaceCanvas.tsx`: Add `role="img"` and `aria-label` to the canvas element.
- `ControlBar.tsx`: Ensure all icon buttons have `aria-label` attributes.
- `NotFound.tsx`: Restyle to match Ping's dark theme with proper heading hierarchy.
- Add a visually-hidden skip-to-content link in `Index.tsx`.

---

## 5. Analytics / Usage Tracking

**What:** Lightweight, privacy-friendly analytics.

- Create `src/lib/analytics.ts` with a simple event tracking abstraction.
- Track key events: page views (route changes), CTA clicks, demo command usage, feature panel opens.
- Use a custom event approach that logs to the database (`ping_analytics` table) via an edge function, keeping it self-hosted.
- DB migration: create `ping_analytics` table (event_name, properties jsonb, created_at, session_id).
- Edge function `supabase/functions/analytics/index.ts` to receive events.

---

## 6. Rate Limit Feedback in UI

**What:** Surface throttling state to the user.

- Update `src/stores/useIngestStore.ts` to track a `rateLimited` boolean.
- When the ingest endpoint returns 429, set the flag and show a toast via Sonner.
- Add a subtle warning badge/chip near the StatusChip when rate-limited.
- Auto-clear after a cooldown period.

---

## 7. Mobile Polish

**What:** Improve mobile experience.

- `NotFound.tsx`: Match Ping's dark theme, add Ping logo, playful copy.
- Add pull-to-refresh support on the main view (listen for overscroll gesture, trigger event refresh).
- Add a `useHaptics.ts` hook that calls `navigator.vibrate()` on supported devices for key interactions (send message, notification received).
- Ensure landscape drawer and mobile menu have proper safe-area padding.

---

## 8. SEO / Structured Data

**What:** Improve discoverability.

- Add JSON-LD `SoftwareApplication` structured data in `index.html`.
- Add `<link rel="canonical">` to `index.html`.
- Create `public/sitemap.xml` with `/`, `/app`, `/docs`, `/connectors`.
- Update `robots.txt` with sitemap reference.
- Add structured data to the new Landing page via a `<script type="application/ld+json">` tag.

---

## Implementation Order

I'll tackle these one message at a time, starting with **Task 1 (Landing Page)**. Each task is self-contained and testable before moving to the next.

