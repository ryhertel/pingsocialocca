

## Problem

The landing page hero uses a basic SVG `EyesPreview` component with thin outlined ellipses and small circles. The actual app renders rich, glowing, near-square rounded rectangles with bloom effects via the `FaceCanvas` canvas component. The preview looks nothing like the real product.

## Solution

Replace the static `EyesPreview` SVG with the actual `FaceCanvas` component embedded directly in the hero card. This gives visitors a true live preview of Ping's animated face.

### Changes

**`src/pages/Landing.tsx`:**
1. Import `FaceCanvas` from `@/components/ping/FaceCanvas`.
2. Remove the `EyesPreview` function entirely.
3. In the hero preview card (line 134), replace `<EyesPreview />` with `<FaceCanvas />`. The card already has `relative`, `overflow-hidden`, and `aspect-video` styling, which will contain the absolutely-positioned canvas correctly.
4. The `FaceCanvas` component uses `ResizeObserver` on its parent and renders at parent dimensions, so it will automatically fill the preview card and scale the eyes proportionally.

This is a minimal change — one import swap and deleting the old SVG component. The face will idle, blink, glance, and glow exactly as it does in the real app since it reads from the same stores and theme.

