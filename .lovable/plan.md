

## Plan: Subtle Glow Pulse on Active Swatch

Replace the Tailwind `animate-[pulse_2s_ease-in-out_infinite]` (which pulses opacity) with a custom `box-shadow` glow pulse using the swatch's own color.

### Change in `src/components/landing/HeroSection.tsx`

Replace the active swatch className from:
```
ring-2 ring-offset-2 ring-offset-background ring-primary scale-110 animate-[pulse_2s_ease-in-out_infinite]
```
To:
```
ring-2 ring-offset-2 ring-offset-background ring-primary scale-110
```

And add an inline `animation` + `boxShadow` style on the active swatch using a CSS keyframe defined inline via the `style` prop, or better — add a small `@keyframes glow-pulse` in `src/index.css`:

```css
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 6px 2px currentColor; }
  50% { box-shadow: 0 0 16px 6px currentColor; }
}
```

Then apply `animate-[glow-pulse_2s_ease-in-out_infinite]` and set `color` to the preset's glow color so `currentColor` picks it up. This creates a soft expanding/contracting glow halo instead of the jarring opacity flash.

### Files
1. `src/index.css` — add `@keyframes glow-pulse`
2. `src/components/landing/HeroSection.tsx` — swap animation class and add inline `color` style

