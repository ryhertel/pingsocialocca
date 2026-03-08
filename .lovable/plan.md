

## Plan: Pulse Animation + Tooltips for Color Swatches

### 1. Add pulse animation to active swatch
On the active swatch, add a subtle pulsing ring effect using a `motion.div` wrapper with `animate={{ scale: [1, 1.15, 1] }}` on a repeating loop, or simpler: use Tailwind's `animate-pulse` but scoped to just the ring glow via a pseudo-element approach. Best approach: wrap each button in a container and add a `motion.div` behind the active one that pulses.

Simplest: add `animate-[pulse_2s_ease-in-out_infinite]` to the active swatch's className.

### 2. Add tooltip on hover showing theme name
Import `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` from `@/components/ui/tooltip`. Wrap each swatch button in a `Tooltip` + `TooltipTrigger`/`TooltipContent` showing `preset.name`.

### File: `src/components/landing/HeroSection.tsx`
- Import tooltip components
- Wrap the swatch row in `TooltipProvider`
- Wrap each button in `Tooltip` > `TooltipTrigger` + `TooltipContent` with `preset.name`
- Add `animate-[pulse_2s_ease-in-out_infinite]` to active swatch class

