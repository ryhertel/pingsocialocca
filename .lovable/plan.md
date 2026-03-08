

## Plan: Swatch Click Sound + Landing Page Background Transition

### 1. Add a `playSwatchPop` sound to `src/lib/audio.ts`

A short, bright "pop" sound — a quick sine oscillator sweep (800→1200Hz over ~80ms) with a tiny noise burst transient. Lightweight, matches the existing audio aesthetic. Exported as a standalone function that doesn't require muted/dnd checks (hero page context).

### 2. Play sound on swatch click in `src/components/landing/HeroSection.tsx`

In the swatch `onClick` handler, call `playSwatchPop()` alongside the existing `spawnParticles` and `setTheme` calls.

### 3. Smooth background transition on `Landing.tsx`

Add `transition-colors duration-[400ms] ease-in-out` to the root `<div>` in `src/pages/Landing.tsx` so when theme variables change, the `bg-background` and `text-foreground` morph smoothly.

### Files
1. **`src/lib/audio.ts`** — Add ~15-line `playSwatchPop` export
2. **`src/components/landing/HeroSection.tsx`** — Import and call `playSwatchPop` in click handler
3. **`src/pages/Landing.tsx`** — Add transition classes to root div

