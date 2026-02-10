

# Fix Welcome Icon + Top-Left Logo/Status Layout

## Two issues to fix

### 1. Welcome dialog icon -- use the square Ping icon
The current `/ping-icon.png` is getting distorted/smushed in the dialog. We'll copy the uploaded square icon (`Ping_PFP_Favicon_Design.png`) into `public/ping-square.png` and use it in the WelcomeDialog instead. The `rounded-2xl` class will give it nice rounded corners matching the icon's own shape.

**File: `src/components/ping/WelcomeDialog.tsx`**
- Change `src="/ping-icon.png"` to `src="/ping-square.png"`

### 2. Logo and StatusChip overlapping -- give them a shared row
Both the Ping logo and the StatusChip are positioned at `absolute top-4 left-4`, causing them to stack on top of each other. Fix: place them side-by-side in a flex row.

**File: `src/pages/Index.tsx`**
- Remove the standalone `<img>` for the logo
- Remove `<StatusChip />` as a standalone element
- Add a new `<div>` container at `absolute top-4 left-4 z-10 flex items-center gap-3` that contains:
  - The clickable Ping logo `<img>` (h-8, cursor-pointer, opacity hover)
  - `<StatusChip />` rendered inline

**File: `src/components/ping/StatusChip.tsx`**
- Remove the outer `<div className="absolute top-4 left-4 z-10">` wrapper (both in the locked and normal returns) since positioning is now handled by the parent container in Index.tsx
- Just return the chip `<div>` directly

This way the logo sits on the left, the status chip sits right next to it, and they don't overlap.

## Files changed

| File | Change |
|------|--------|
| `public/ping-square.png` | Copy uploaded square icon here |
| `src/components/ping/WelcomeDialog.tsx` | Use `/ping-square.png` for the icon |
| `src/pages/Index.tsx` | Wrap logo + StatusChip in a shared flex row container |
| `src/components/ping/StatusChip.tsx` | Remove absolute positioning wrapper, return just the chip |

