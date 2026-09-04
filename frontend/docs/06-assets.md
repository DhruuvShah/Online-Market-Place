# Assets

What to make, how to make it, and what to refuse to generate.

## The short version

**9 assets.** All vector, all made in Figma, all exported as SVG. No Lottie, no
video, no AI-generated icons.

| # | Asset | Format | Where |
| --- | --- | --- | --- |
| 1 | Logo mark | SVG | header, footer, auth pages |
| 2 | Logo lockup (mark + wordmark) | SVG | header, 404, OG image |
| 3 | Favicon | SVG + 180px PNG | browser tab |
| 4 | OG share image | 1200×630 PNG | link previews |
| 5 | Empty cart | SVG | `/cart` |
| 6 | No orders | SVG | `/orders`, `/seller/orders` |
| 7 | No products | SVG | `/seller/products` |
| 8 | No results | SVG | `/discover` |
| 9 | Product placeholder | SVG | any product missing an image |

The success checkmark is **not** on this list — it is code, not an asset. See
`05-motion.md`.

---

## Never AI-generate these

**Icons.** Use `lucide-react`. Around 40 icons, one consistent stroke weight,
one optical grid, tree-shaken, free. AI icons drift in stroke width, corner
radius and optical size between generations, and inconsistency across a set is
the loudest "made by a machine" signal in an interface. This is the highest-
value rule in this document, and it costs you nothing.

**The logo.** A raster logo from an image model cannot be scaled, recoloured for
dark mode, or rendered crisply at 24px. Build it in Figma with real shapes.

**UI illustrations, if generated individually.** Four empty states generated
separately will not share a palette, a line weight, or a perspective. If you use
AI here, generate them as **one image containing all four**, then trace.

---

## Making the logo in Figma

"HiveMind" gives you a hexagon — a hive cell. Deliberate and geometric beats
decorative.

1. **Frame** 256×256, name it `logo-mark`.
2. **Polygon tool**, set to 6 sides. Hold shift, draw 160×160, centre it.
3. Duplicate twice; scale to 108 and 56, all centre-aligned. Three nested
   hexagons.
4. Select all three → right-click → **Outline stroke**. Set stroke weight 16,
   no fill, corner radius 8 — rounded joins are what stop it looking like clip
   art.
5. Delete one edge of the inner hexagon to suggest an opening. Asymmetry is what
   makes a mark memorable.
6. **Export SVG**, "Include id attributes" off, "Outline text" on.
7. Duplicate the frame, change stroke to your light colour, export as
   `logo-dark.svg`.

**Wordmark:** set "HiveMind" in Inter or Geist, weight 600, letter-spacing
`-0.02em` — negative tracking, per the apple-design typography rule. Convert to
outlines before export so it renders without the font.

**Favicon:** the mark alone, 48×48 frame, stroke bumped to 24 so it survives at
16px. Test it at 16px before committing; thin strokes vanish.

---

## Making the four empty states

Consistency across the set matters more than any individual drawing.

**Shared constraints — apply to all four:**

- Frame 400×300, transparent
- Stroke 2px, round caps, round joins
- Exactly 3 colours: `currentColor` for lines, one accent, one 10%-opacity fill
- Isometric or flat-front — pick one and never mix
- No text inside the SVG; headings are real HTML

**Build order:** make the *empty cart* first, then duplicate that frame three
times and modify. Starting each from scratch is what makes a set drift.

| Asset | Drawing |
| --- | --- |
| Empty cart | Cart outline, interior empty, one dashed arc suggesting motion |
| No orders | Stacked boxes, top one open and empty |
| No products | Shelf with two empty brackets |
| No results | Magnifier over a grid with faded cells |

Export each as SVG, then **hand-edit the file**: replace hard-coded line colours
with `currentColor` so the illustrations inherit theme colour. Figma will not do
this for you. It is a two-minute find-and-replace and it is what makes them work
in dark mode.

---

## Where AI genuinely helps

**Product photography for seed data.** Your catalog needs plausible products.
This is the one place image generation earns its place — the images are content,
not interface.

Prompt shape that works:

```
Product photograph of [item], centred, on a seamless light grey backdrop,
soft diffused studio lighting from the upper left, subtle contact shadow,
shot at 50mm, square 1:1 crop, photorealistic, no text, no watermark,
no props, no hands.
```

Keep backdrop, lighting direction and focal length **identical across every
product**, changing only the item. A catalog whose photos share a lighting setup
looks like a real store; one where every image has a different background looks
like a scrape. Generate 12–20.

**The OG image.** Compose in Figma at 1200×630 — logo lockup, one line of
copy, a flat product-card arrangement. Export PNG. AI can generate a background
texture; do not let it generate the layout or the text.

**Ideation.** Ask an image model for twenty hexagon logo directions, pick one,
then rebuild it properly in Figma. Use it as a sketchpad, not a factory.

---

## Video

**None in the interface.** Video cannot be transparent, cannot inherit theme,
cannot be interrupted, and costs 20× its equivalent in SVG.

The one defensible use is a landing hero, and `05-motion.md` recommends an
animated CSS gradient mesh instead: no asset, no payload, no risk of looking
like stock footage.

If you later want a demo reel for a portfolio page — a screen recording of the
checkout flow — that is a different thing and it belongs in a README, not in the
product.

---

## Fonts

**Inter** for UI, **Geist Mono** for order IDs and prices. Both free, both on
Google Fonts. Self-host the subset rather than hot-linking so the landing page
does not block on a third-party request.

Per the apple-design typography rule, tracking is size-specific:

```css
.display { font-size: clamp(2rem, 5vw, 4rem); letter-spacing: -0.02em; line-height: 1.05; }
.body    { letter-spacing: 0; line-height: 1.6; }
.caption { letter-spacing: 0.01em; }
```

Prices and order IDs use `font-variant-numeric: tabular-nums`, without exception.
Proportional digits make a number ticker jitter and make a price column fail to
align.

---

## Production order

Do these before any UI is built, because placeholder assets have a way of
shipping:

1. Logo mark + wordmark + favicon — blocks every layout
2. Product photography (12–20) — blocks the catalog looking real
3. Four empty states — blocks every list
4. Product placeholder — blocks the catalog
5. OG image — needed only before you share the link

1 and 2 are the blockers. 3 and 4 can land while pages are being built.
