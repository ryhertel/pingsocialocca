

## Plan: Staggered Entrance Animation for Theme Swatches

Wrap each swatch button in a `motion.button` (from framer-motion) with a staggered delay based on its index. Each swatch fades in and scales up individually after the parent "Try a color" section appears.

### File: `src/components/landing/HeroSection.tsx`

Replace each swatch `<button>` with `<motion.button>` adding:
- `initial={{ opacity: 0, scale: 0.5 }}`
- `animate={{ opacity: theme === key ? 1 : 0.7, scale: theme === key ? 1.1 : 1 }}`
- `transition={{ duration: 0.4, delay: 1.0 + index * 0.1 }}` (staggers after the parent's 0.8s delay)
- Keep existing `whileHover={{ scale: 1.1 }}` for hover effect
- Move the active glow-pulse to inline `style.animation` so it doesn't conflict with framer-motion's animate prop

This is a single-file change. Each swatch will pop in one after another with a 100ms stagger.

