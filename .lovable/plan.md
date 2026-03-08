

## Bugs Found & Fix Plan

### Bug 1: "Features" nav tab unresponsive / underline skips to Integrations
The `IntersectionObserver` uses `rootMargin: '-20% 0px -60% 0px'` which creates a very narrow detection band (only 20% of viewport height). The Features section is relatively short, so when you scroll to it, the observer often picks up Integrations instead because it enters that narrow band first or simultaneously. Additionally, clicking "Features" scrolls to it, but the observer immediately overrides `activeSection` to `integrations`.

**Fix in `LandingNav.tsx`:**
- Widen the observer rootMargin to `-10% 0px -40% 0px` so shorter sections are detected properly
- When a nav button is clicked, temporarily force `activeSection` to that section (bypassing the observer for ~1 second) so the underline moves immediately and stays

### Bug 2: Docs back button navigates to `/app` instead of `/`
Line 214 in `Docs.tsx` has `navigate('/app')`. It should be `navigate('/')`.

**Fix in `src/pages/Docs.tsx`:**
- Change `onClick={() => navigate('/app')}` to `onClick={() => navigate('/')}`

### Bug 3: Footer logo invisible in light mode
The footer uses `ping-logo-white.png` which is white text on transparent — invisible on a light background.

**Fix in `src/components/landing/LandingFooter.tsx`:**
- Add a CSS class that inverts/darkens the logo in light mode: `dark:opacity-60 opacity-60 .light &` or use a `dark:invert-0 invert` filter approach
- Specifically: add `className="h-5 opacity-60 dark:invert-0 invert"` — since the default is dark mode (no `.light` class = dark), we use the `.light` class presence to apply `invert`. The simplest approach: use Tailwind's `dark:` variant or check for `.light` class. Since this project uses `.light` on `<html>`, we can add a small conditional class or just use CSS filter: `filter: brightness(0)` in light mode via the `.light` selector.

**Approach:** Add a utility class to the footer logo image that applies `filter: invert(1)` when `.light` class is active. In Tailwind terms, since this project doesn't use Tailwind's `dark:` mode (it uses a custom `.light` class), we'll handle it inline or via a small index.css rule. Simplest: add a class like `[.light_&]:invert` to the `<img>`.

Also apply the same fix to the nav logo at the top for consistency.

### Files Changed
1. `src/components/landing/LandingNav.tsx` — Fix observer rootMargin, add click-to-force-active logic
2. `src/pages/Docs.tsx` — Change back button from `/app` to `/`
3. `src/components/landing/LandingFooter.tsx` — Add light-mode invert filter to logo

