

## Plan: Scale Bounce on Face Container When Theme Changes

Single-file change in `src/components/landing/HeroSection.tsx`.

### Approach

Use framer-motion's `animate` prop with a reactive key tied to the current `theme` value. When the theme changes, trigger a subtle scale bounce on the face container (scale 1 → 1.03 → 1) using framer-motion's spring transition.

### Implementation

In `HeroSection.tsx`, convert the face container's `motion.div` to use a `key={theme}` approach won't work cleanly (remounts canvas). Instead, use `useEffect` + `useAnimation` from framer-motion:

1. Import `useAnimation` from framer-motion
2. Create `const faceControls = useAnimation()`
3. Add a `useEffect` watching `theme` that triggers: `faceControls.start({ scale: [1, 1.04, 0.98, 1] }, { duration: 0.5, ease: 'easeInOut' })`
4. Replace the face container's static `animate={{ opacity: 1, scale: 1 }}` with `animate={faceControls}` and trigger the initial entrance via `faceControls.start(...)` in a separate mount effect

This gives a playful "pop" bounce synchronized with the sparkle particles and sound, without remounting the canvas.

### File
- `src/components/landing/HeroSection.tsx` — add `useAnimation` controller + bounce effect on theme change

