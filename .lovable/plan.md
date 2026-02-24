
# Webhook Notification Reactions -- Animated Pop-up Badges, New Sounds, and Category-Specific Spectacles

## Overview

When Ping receives webhook events about subscribers, messages, or money/revenue, the eyes and UI will burst with category-specific animated reactions. This adds four new visual notification systems on top of the existing eye emotions and spectacles.

## New Notification Categories

| Category | Trigger Keywords | Eye Reaction | Spectacle | Sound | Floating Icon |
|----------|-----------------|-------------|-----------|-------|---------------|
| **Money/Revenue** | paid, payment, purchase, sale, subscription, charge, $, revenue, invoice | Huge cheer bounce + golden glow | Gold coin rain (new) | `playKaChing` (new) | Dollar sign ($) floating up |
| **New Subscriber** | subscriber, signup, sign up, registered, new user, joined, follower, follow | Proud puff-up + sparkle eyes | Confetti burst (new) | `playLevelUp` (new) | Heart/person icon floating up |
| **New Message** | message, comment, reply, mention, DM, chat | Surprise pop + curious look-around | Sparkle trail (existing) | `playReceive` (existing) | Chat bubble floating up |
| **Deploy/Ship** | (unchanged) | Proud + excited | Fireworks (existing) | `playExcited` (existing) | Rocket floating up |

## What Gets Built

### 1. Floating Notification Icons (FaceCanvas.tsx)

A new canvas-rendered notification system that draws animated icons that float upward from near the eyes when webhook events arrive:

- Icons are drawn as simple geometric shapes on canvas (no DOM elements)
- They float upward with a gentle sine-wave wobble
- They scale up with a bouncy ease-in, hold, then fade out
- Each category has a unique color: gold for money, pink for subscribers, cyan for messages
- Duration: ~2.5 seconds per icon
- Multiple icons can stack if events arrive rapidly
- Triggered via a new custom event `ping:notificationIcon`

### 2. Two New Sounds (audio.ts)

**`playKaChing`** -- Cash register / coin sound for money events:
- Short metallic "ting" using triangle wave at ~1200Hz
- Followed by a descending shimmer (harmonics cascading down)
- Sub-bass thump for satisfying weight
- Duration: ~250ms

**`playLevelUp`** -- Ascending chime for new subscribers:
- Three-note ascending arpeggio (C5-E5-G5)
- Bright square wave with warmth filter
- Quick reverb tail
- Duration: ~300ms

### 3. Two New Spectacles (spectacles.ts)

**`coinRain`** -- Gold coins falling from above for money events:
- 15-25 golden "dust" particles spawn across the top
- They fall with slight gravity and wobble side to side
- Golden hue (45-55 range)
- Eye reaction: wide + golden glow (3.5)
- Duration: ~3 seconds

**`confettiBurst`** -- Multi-colored confetti for subscriber events:
- 40-60 small particles in rainbow hues exploding outward from center
- Mix of "spark" and "dust" types for variety
- Slow gravity so they float longer
- Eye reaction: proud + big bounce
- Duration: ~4 seconds

### 4. Updated Reaction Router (reactionRouter.ts)

Add two new keyword sets:

- `SUBSCRIBER_WORDS`: subscriber, signup, sign up, registered, new user, joined, follower, follow, member
- `MESSAGE_WORDS`: message, comment, reply, mention, DM, chat, inbox

Updated routing priority:
1. Money words -> cheer + coinRain + playKaChing + dollar icon
2. Subscriber words -> proud + confettiBurst + playLevelUp + heart icon
3. Error words -> error + pulseWave (unchanged)
4. Deploy words -> proud + fireworks (unchanged)
5. Message words -> surprise + sparkleTrail + playReceive + chat icon (new)
6. Fall back to base eventType map

### 5. Updated Reaction Executor (reactionExecutor.ts)

Add `notificationIcon` field to ReactionOutput type. When present, the executor dispatches a `ping:notificationIcon` custom event with the icon type, which FaceCanvas listens to and renders.

### 6. Updated Ingest Types (types.ts)

Add optional `notificationIcon` field to `ReactionOutput`:
```
notificationIcon?: 'dollar' | 'heart' | 'chat' | 'rocket';
```

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/ingest/types.ts` | Add `notificationIcon` field to `ReactionOutput` |
| `src/lib/ingest/reactionRouter.ts` | Add SUBSCRIBER_WORDS, MESSAGE_WORDS keyword sets; new routing entries with spectacle + icon assignments |
| `src/lib/ingest/reactionExecutor.ts` | Dispatch `ping:notificationIcon` event; register new sound functions |
| `src/lib/audio.ts` | Add `playKaChing` and `playLevelUp` sound functions |
| `src/lib/spectacles.ts` | Add `coinRain` and `confettiBurst` routines; register in valid routines list |
| `src/components/ping/FaceCanvas.tsx` | Add floating icon renderer: listen for `ping:notificationIcon`, draw/animate icons on canvas |

## Animation Smoothness

All new animations use the same buttery `ls = 0.015` lerp system. Floating icons use eased curves (`1 - Math.pow(1 - t, 3)`) for smooth scale-up and gentle fade-out. Particle physics use the same gravity/velocity model as existing spectacles. No sharp snapping anywhere.

## Technical Notes

- No new dependencies
- No backend changes
- All rendering is canvas-native (no DOM popup elements that could cause layout thrash)
- Icon shapes are drawn with basic canvas paths (circles, arcs, lines) -- no images needed
- The floating icons are tracked in a simple array inside the FaceCanvas animation loop and cleaned up when their lifetime expires
- New sounds follow the same `canBeep(muted, dnd)` guard as all existing sounds
