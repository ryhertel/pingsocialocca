

# Fix Eye Squishing When Dock Is Open

## Root Cause
In `FaceCanvas.tsx`, the `handleResize` function sets `canvas.width = window.innerWidth` and `canvas.height = window.innerHeight`. But the canvas element is inside a flex container that shrinks when the dock panel opens (from `w-full` to `flex-1`). The CSS (`absolute inset-0 w-full h-full`) visually constrains the canvas to that smaller container, but the internal resolution still thinks it's full-window-sized. This mismatch causes the browser to scale down the entire canvas rendering, making the eyes appear smaller.

## The Fix
Change `handleResize` to use the canvas element's actual display dimensions (`clientWidth` / `clientHeight`) instead of `window.innerWidth/Height`. This way the canvas pixel buffer always matches its CSS display size, and the eyes render at the correct scale regardless of dock state.

## File Changed

| File | Change |
|------|--------|
| `src/components/ping/FaceCanvas.tsx` | Update `handleResize` to use container dimensions instead of window dimensions |

## Technical Detail
One function changes in `FaceCanvas.tsx`:

```js
// Before
const handleResize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};

// After
const handleResize = () => {
  const parent = canvas.parentElement;
  canvas.width = parent ? parent.clientWidth : window.innerWidth;
  canvas.height = parent ? parent.clientHeight : window.innerHeight;
};
```

This also adds a `ResizeObserver` on the parent element so the canvas re-measures when the flex layout changes (dock open/close), not just on window resize.

The eye geometry code (`unit = h / 8.5`) remains unchanged -- it already uses canvas height correctly. The only problem was that the canvas resolution didn't match the visual container size.
