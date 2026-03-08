

## Plan: Add Theme Color Picker Below Hero Preview

### What
Add a row of colored circle buttons below the live FaceCanvas preview in the hero section. Clicking one changes the global theme (via `useSettingsStore.setTheme`), which the FaceCanvas already reads every animation frame — so the eye colors update instantly.

### Implementation

**File: `src/components/landing/HeroSection.tsx`**

1. Import `useSettingsStore` and `themePresets` from existing files
2. Below the preview `motion.div` (after the badge overlay), add a row of 4 circular buttons — one per theme preset (Mint, Sky, Berry, Honey)
3. Each button is a small circle filled with `hsl(preset.glowPrimary)`, with a ring/border highlight on the currently active theme
4. On click, call `setTheme(presetKey)` which updates the store → FaceCanvas picks it up on the next frame
5. Wrap the row in a `motion.div` with a subtle fade-in animation matching the preview's entrance
6. Add a small label like "Try a color" above or beside the swatches

### Visual Design
- 4 circles (~28px), centered, spaced with `gap-3`, placed directly below the preview card
- Active swatch gets a `ring-2 ring-offset-2 ring-offset-background` highlight
- Smooth `scale` hover effect via Tailwind `hover:scale-110 transition-transform`

### No other files need changes
FaceCanvas already reads the theme from the settings store on every frame, and the hero's glow background already uses `var(--glow-primary)` which `applyThemeToCSS` updates automatically. Everything will react.

