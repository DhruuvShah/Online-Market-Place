# Motion

Built on `.claude/skills/apple-design`. Terms are from
`.claude/skills/animation-vocabulary` so we can name things precisely instead of
saying "make it pop."

## House rules

1. **Springs, not durations**, for anything the user can touch. Default
   `damping 1.0`, `response 0.3–0.4` — critically damped, no overshoot.
2. **Bounce only after momentum.** `damping ~0.8` is earned by a flick, a drag
   release or a throw. A menu that faded in has not earned it.
3. **Feedback on pointer-down**, never on release.
4. **Animate `transform` and `opacity` only.** Anything else costs layout.
5. **Every animation is interruptible** and starts from the live on-screen
   value, not the target.
6. **`prefers-reduced-motion` is a first-class path**, not an afterthought —
   cross-fade instead of slide, drop overshoot, keep the feedback.
7. **Frequency governs subtlety.** The add-to-cart animation fires fifty times
   a session; the checkout celebration fires once. Budget accordingly.

`components/motion/springs.ts` holds the presets. Nothing hardcodes a value.

```ts
export const spring = {
  ui:       { type: "spring", bounce: 0,    duration: 0.35 },
  momentum: { type: "spring", bounce: 0.2,  duration: 0.4  },
  sheet:    { type: "spring", bounce: 0.15, duration: 0.3  },
  celebrate:{ type: "spring", bounce: 0.35, duration: 0.6  },
};
```

---

## The add-to-cart moment

Fires most often, so it must be fast and never block. Four things happen at
once, and the whole sequence is under 700ms.

**1. Press feedback — *Press / Tap feedback*.** `scale: 0.97` on pointer-down,
100ms ease-out. Instant, before any network call.

**2. Flying image — *Shared element transition*.** The product image detaches,
travels to the cart icon, and shrinks. This is the effect people mean when they
say "like Zomato."

Implementation: clone the `<img>` into a `position: fixed` layer at its
`getBoundingClientRect()`, animate to the cart icon's rect, then remove. Use
independent X and Y springs — **a single spring across a 2D distance desyncs**
when the axes have different velocities.

Give the arc character: X eases out, Y follows a slight overshoot, so the path
curves rather than running diagonally. Scale `1 → 0.25` and fade the last 20%.

**3. Cart badge — *Number ticker* + *Pop in*.** The count rolls with tabular
numerals so the badge does not reflow, and the badge pops `1 → 1.3 → 1` on
`spring.momentum`. Fire this on the *arrival* frame of the flying image, not on
the API response — causality is what sells the effect.

**4. Optimistic, then reconciled.** The badge increments immediately. On
failure, it rolls back with a *Shake* and a toast. Waiting for the round trip
makes it feel broken.

Reduced motion: no flight. The badge tickers and pops. The information survives;
the theatre does not.

---

## The checkout celebration

The one moment that gets real spend. It fires once per purchase.

Sequence — total ~1.8s, skippable by any interaction:

| ms | What | Term |
| --- | --- | --- |
| 0 | Card materialises: blur 20→0, scale 0.94→1 | *Materialize* |
| 120 | Circle stroke draws, 360° | *Line drawing* |
| 380 | Checkmark path draws | *Line drawing* |
| 520 | Whole mark settles with slight overshoot | *Pop in* |
| 600 | Particle burst, 12 pieces, radial | — |
| 700 | "Order confirmed" fades up 8px | *Slide in* |
| 850 | Order number tickers in | *Number ticker* |
| 1000 | Summary rows cascade, 60ms apart | *Stagger* |
| 1400 | Two CTAs fade in | — |

**Build this by hand in SVG, not as a Lottie file and not as a video.**

- It is two paths and a circle. `stroke-dasharray` + `stroke-dashoffset` draws
  them, and Motion animates `pathLength` directly.
- It inherits `currentColor`, so it themes light/dark for free. A Lottie JSON
  has baked colours.
- It costs ~2KB against ~40KB for Lottie plus a 60KB player.
- It can be interrupted and it respects reduced motion.

A video is the wrong medium: no transparency, fixed resolution, cannot inherit
theme, cannot be interrupted, and 2MB for 1.8 seconds.

Reduced motion: the mark appears at full opacity with no draw, the text
cross-fades, no particles.

**Restraint:** 12 particles, one burst, no loop, no sound. Confetti that fills
the viewport reads as a template.

---

## Everywhere else

| Where | Effect | Term | Spring |
| --- | --- | --- | --- |
| Product card hover | Image `scale 1.04`, card lifts 2px, shadow deepens | *Hover effect* | `ui` |
| Product grid load | Cards cascade 40ms apart, capped at 8 | *Stagger* | `ui` |
| Quantity stepper | Line total rolls; `-`/`+` press-scale | *Number ticker* | `ui` |
| Remove cart item | Row collapses height, siblings slide up | *Layout animation* | `ui` |
| Remove on mobile | Drag left past 40% to delete, rubber-band before | *Swipe to dismiss* | `momentum` |
| Filter chips | Chips reflow when one is removed | *Layout animation* | `ui` |
| Checkout steps | Forward slides left, back slides right | *Direction-aware transition* | `ui` |
| Payment processing | Indeterminate sweep → determinate on webhook | — | — |
| AI drawer | Sheet from right, `backdrop-filter` blur, drag to dismiss | *Drawer* | `sheet` |
| Toasts | Slide from top-right, swipe to dismiss | *Swipe to dismiss* | `momentum` |
| Skeletons | Sheen sweep while loading | *Skeleton / Shimmer* | linear |
| Seller metrics | Values count up once on mount, tabular numerals | *Number ticker* | — |
| Form errors | Field shakes on submit failure | *Shake / Wiggle* | — |
| Landing sections | Fade + 16px rise as they enter | *Scroll reveal* | `ui` |
| 404 illustration | Gentle 6px drift, 4s loop | *Float* | — |
| Stock badge | Pulses once when it drops to "low" | *Pulse* | — |

---

## Landing page hero

The one place with room for ambition. Three options, cheapest first:

**A — Animated gradient mesh (recommended).** Two or three blurred radial
gradients drifting on long, offset loops behind the headline. Pure CSS, no
asset, no payload, themes automatically. Nearly impossible to make look cheap
because there is nothing literal to judge.

**B — Product card constellation.** Real product images from your catalog
floating on gentle *Float* loops with subtle *Parallax* on scroll. Uses live
data, so it doubles as social proof. Needs good product photography.

**C — Video loop.** Only if you have genuinely good footage. 1920×1080, H.264
MP4 + WebM, under 2MB, muted, `playsinline`, poster frame, and it must pause
under reduced motion. Most portfolio video hurts more than it helps because
stock footage reads as filler.

Take A. It costs nothing, never looks generic, and the effort belongs in the
checkout moment instead.

---

## What makes this not look AI-generated

The tells, and the fix for each:

| Tell | Fix |
| --- | --- |
| Everything animates | Most things should not move. Motion marks what changed. |
| Uniform 300ms ease-in-out everywhere | Springs, and different presets per weight of action |
| Bounce on everything | Bounce only after real momentum |
| Confetti on every success | One celebration, once |
| Icons at mismatched stroke weights | One icon set, never AI-generated |
| Perfectly even spacing with no rhythm | A real scale — 4/8/12/16/24/32/48 |
| Text that animates in letter by letter | Reserve *Text morph* for changing values |

The single biggest differentiator is **restraint**. A product that animates four
things beautifully reads as more expensive than one that animates forty.
