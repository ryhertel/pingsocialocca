

## More Fun Keyword-Triggered Effects for Ping

### Current State
Ping already has 5 keyword categories triggering reactions: **money**, **subscribers**, **messages**, **deploys**, and **errors**. Each maps to a unique sound, eye state, spectacle overlay, and floating icon. The system is well-architected across `reactionRouter.ts` (keyword matching), `spectacles.ts` (particle animations), `reactionExecutor.ts` (dispatching), and `audio.ts` (sounds).

### Proposed New Keyword Categories + Effects

| Category | Keywords | Sound | Spectacle | Icon | Eye Reaction |
|---|---|---|---|---|---|
| **Milestone / Achievement** | `milestone`, `100`, `1000`, `10k`, `goal`, `achieved`, `record`, `🎯` | New `playFanfare` — triumphant brass-style ascending chord | New `starBurst` — golden stars explode outward then orbit | `star` | Huge bounce + max glow |
| **Thank You / Love** | `thank`, `thanks`, `love`, `appreciate`, `❤️`, `🙏`, `awesome`, `great job` | New `playHeartbeat` — warm double-thump pulse | New `heartFloat` — pink/red hearts float upward with gentle sway | `heart` (reuse) | Slow wide + warm glow |
| **Alert / Urgent** | `urgent`, `critical`, `alert`, `emergency`, `pager`, `on-call`, `p0`, `sev1` | New `playSiren` — two-tone alternating alert | New `shockwave` — single large ring + screen-edge red flash particles | `alert` | Rapid shake + error tint |
| **Party / Celebration** | `party`, `celebrate`, `congrats`, `birthday`, `launch`, `anniversary`, `🎉`, `🥳` | New `playPartyHorn` — ascending toot with noise burst | New `balloonRise` — colorful balloons float up and pop into sparks | `party` | Dizzy spin + max widen |

### Changes Required

**1. `src/lib/ingest/types.ts`**
- Extend `notificationIcon` union with `'star' | 'alert' | 'party'`

**2. `src/lib/ingest/reactionRouter.ts`**
- Add 4 new keyword arrays + matching blocks in `routeEvent()` (inserted before the existing fallback)

**3. `src/lib/audio.ts`**
- Add 4 new sound functions: `playFanfare`, `playHeartbeat`, `playSiren`, `playPartyHorn` using existing Web Audio patterns (detuned oscillators, noise bursts, buildChain)

**4. `src/lib/ingest/reactionExecutor.ts`**
- Register the 4 new sound functions in `SOUND_FN_MAP`

**5. `src/lib/spectacles.ts`**
- Add 4 new spectacle routines: `starBurst`, `heartFloat`, `shockwave`, `balloonRise`
- Register them in `forceStartSpectacle`'s valid list and in `getAvailableRoutines`
- Add runner functions + wire into the `updateSpectacle` switch

**6. `src/components/ping/FaceCanvas.tsx`**
- Add rendering for the 3 new notification icon types (`star`, `alert`, `party`) in the floating icon drawing section

