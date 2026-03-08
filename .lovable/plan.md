

## Plan: Glow Border Transition on Face Container

Single-file change in `src/components/landing/HeroSection.tsx`.

The face container `motion.div` already has `border-border/30` and a `box-shadow` using `--glow-primary`. Since `--glow-primary` is a registered CSS `@property` with a `0.4s` transition in `index.css`, the box-shadow already transitions. The border color just needs to reference the glow color too.

### Change

On the face container `motion.div`, replace the static `border-border/30` with an inline `borderColor` using `hsl(var(--glow-primary) / 0.3)` and add `transition-[border-color,box-shadow] duration-[400ms] ease-in-out` classes so the border color smoothly morphs alongside the shadow when the theme changes.

### File
- `src/components/landing/HeroSection.tsx` — update the face container's border styling to track `--glow-primary`

