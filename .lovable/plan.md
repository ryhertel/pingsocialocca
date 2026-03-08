

## Plan: Sparkle Burst on Theme Swatch Click

Add a small particle burst effect when clicking a theme swatch. Particles will emit from the clicked swatch's position, colored to match the selected theme, and fade out quickly.

### Approach

Create a lightweight sparkle system using `useState` + CSS animations (no canvas overhead). On click, spawn 8-12 tiny particles at the swatch position that fly outward and fade.

### File: `src/index.css`
Add a `@keyframes sparkle-burst` animation that scales up, translates outward, and fades out over ~600ms.

```css
@keyframes sparkle-burst {
  0% { opacity: 1; transform: translate(0, 0) scale(1); }
  100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0); }
}
```

### File: `src/components/landing/HeroSection.tsx`
1. Add a `particles` state array: `{ id, x, y, color, dx, dy }[]`
2. On swatch click, generate 8-12 particles with random directions (using `Math.cos/sin` with evenly spaced angles + jitter) positioned at the swatch center
3. Render particles as tiny absolute-positioned `<span>`s with the sparkle-burst animation, using CSS custom properties `--sx` and `--sy` for direction
4. Clean up particles after animation ends (600ms timeout)
5. Wrap the swatch row in a `position: relative` container so particles are positioned correctly

Each particle: 4px circle, theme-colored, with the burst keyframe. Total addition is ~40 lines.

### Files
1. `src/index.css` — add `@keyframes sparkle-burst`
2. `src/components/landing/HeroSection.tsx` — particle state + spawn logic + render

