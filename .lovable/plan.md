

## Plan: Smooth Color Transition When Switching Themes

### What
Add a CSS `transition` on the root element so that when `applyThemeToCSS` updates the `--glow-primary`, `--primary`, etc. custom properties, the colors morph smoothly instead of snapping.

### Problem
CSS custom properties don't transition natively. We need to use `transition` on the elements that consume these variables, or use a broader approach.

### Approach
Add a global CSS transition rule targeting the properties that change:

**File: `src/index.css`** — Add a rule that applies a color transition to key elements:

```css
:root {
  transition: --glow-primary 0.4s ease, --primary 0.4s ease;
}
```

However, CSS custom properties can't be transitioned directly unless registered with `@property`. So the better approach:

1. **Register CSS custom properties** using `@property` at the top of `src/index.css` for `--glow-primary`, `--glow-secondary`, `--ping-accent`, `--primary`, `--ring`, `--accent`. This enables the browser to interpolate them.

2. **Add transition on `:root`** for those registered properties with `0.4s ease`.

Alternatively, simpler: add `transition: background-color 0.4s, color 0.4s, border-color 0.4s, box-shadow 0.4s` to key elements (the hero glow div, the swatches, etc.) so the visual effect of the variable change transitions smoothly on the consuming elements.

### Recommended: Hybrid approach
- Add `@property` declarations for `--glow-primary` and `--primary` (syntax: `"<color>"`) in `src/index.css`
- Add `transition: 0.4s ease` on `:root` for these properties
- Add `transition: background-color 0.4s, box-shadow 0.4s, color 0.4s` on the hero section's glow div and the FaceCanvas container border/shadow

### Files
1. **`src/index.css`** — Add `@property` declarations and transition rules

