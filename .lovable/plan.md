

## Plan: Haptic Feedback on Theme Swatch Click

Single-file change in `src/components/landing/HeroSection.tsx`:

1. Import `useHaptics` from `@/hooks/useHaptics`
2. Call `const { vibrate } = useHaptics()` in the component
3. Add `vibrate('tap')` in the swatch `onClick` handler alongside the existing `spawnParticles`, `playSwatchPop`, and `setTheme` calls

The project already has a `useHaptics` hook with a `tap` pattern (10ms vibration) that silently falls back on unsupported browsers.

