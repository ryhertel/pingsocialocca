

# Let Users Sample Idle Spectacles via Demo Commands

## Overview

Add a new demo module that lets users trigger each of the 6 idle spectacles on demand via chat buttons. This connects the existing spectacle system to the demo engine through a custom event.

## How It Works

1. A new custom event `ping:triggerSpectacle` carries the routine name (e.g., `fireworks`, `eyeRoll`)
2. FaceCanvas listens for this event and force-starts that spectacle immediately
3. The demo engine gets a new "Animations" menu with buttons for each spectacle
4. Users can also type words like "animations", "fireworks", "sparkle" to reach this menu

## Changes

### 1. `src/lib/spectacles.ts`

- Export a `forceStartSpectacle(ss: SpectacleState, routineName: string)` function that sets `ss.routine`, resets `ss.timer`, and clears launcher state -- allowing external code to kick off any spectacle instantly

### 2. `src/components/ping/FaceCanvas.tsx`

- Inside the existing `useEffect`, add a listener for `ping:triggerSpectacle` custom events
- On receiving the event, call `forceStartSpectacle(spectacle, event.detail)` to immediately start the named routine
- Also temporarily force `persistentState` to idle so the spectacle isn't cancelled by state checks

### 3. `src/lib/demoScriptEngine.ts`

- Add new response functions:
  - `getAnimationsResponse()` -- menu with 6 buttons, one per spectacle (Fireworks, Eye Roll, Sparkle Trail, Gravity Drop, Dizzy Spin, Pulse Wave)
  - `getSpectacleTriggeredResponse(name)` -- confirmation message with "Try another" and "Back to menu" buttons
- Add a new `DemoAction` type: `{ type: 'triggerSpectacle', payload: string }` 
- Wire `executeDemoActions` to dispatch the `ping:triggerSpectacle` event for this action type
- Register new actions in `ACTION_MAP`: `animations`, `spectacle_fireworks`, `spectacle_eyeroll`, etc.
- Add "Animations" button to the main demo menu (`getSeeDemoResponse`) and the "What is Ping?" response

### 4. `src/lib/demoIntentRouter.ts`

- Add keywords to `TOPIC_KEYWORDS`: new `animations` topic with words like `animation`, `idle`, `spectacle`, `fireworks`, `sparkle`, `particle`
- Add mapping in `topicActionMap` in `demoScriptEngine.ts` so typing these words routes to the animations menu

### 5. `src/lib/types.ts`

- Add `'triggerSpectacle'` to the `DemoAction.type` union if it's defined there (or handle inline)

## File Summary

| File | Action |
|------|--------|
| `src/lib/spectacles.ts` | Add `forceStartSpectacle` export |
| `src/components/ping/FaceCanvas.tsx` | Add `ping:triggerSpectacle` event listener |
| `src/lib/demoScriptEngine.ts` | Add animations menu, 6 spectacle trigger actions, wire to action map |
| `src/lib/demoIntentRouter.ts` | Add animation-related keywords |
| `src/lib/types.ts` | Extend DemoAction type if needed |

