

## Fixes

### 1. Tour tooltip clipping off-screen
The onboarding tour tooltip for "Ping's Face" positions itself based on the target element's center X. When the face area is wide, `centerX` can push the tooltip past the right edge. The tooltip is 288px wide (`w-72`), but the `left` clamping only accounts for 16px margin, not the tooltip's own width.

**Fix in `OnboardingTour.tsx`:** Clamp `left` to `max(16, min(centerX, window.innerWidth - 160))` so the 288px-wide tooltip (half = 144px) stays on screen. Apply the same logic for all positioned steps.

### 2. Logo should navigate to homepage
Currently the logo `onClick` opens the Welcome dialog (`setShowAbout(true)`). It should navigate to `/` instead.

**Fix in `Index.tsx`:** Change the logo's `onClick` from `setShowAbout(true)` to `navigate('/')`.

