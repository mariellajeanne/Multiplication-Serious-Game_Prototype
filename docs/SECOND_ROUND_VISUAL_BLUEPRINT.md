# Second-round visual blueprint

Authority: the complete `CODEX_SECOND_ROUND_MASTER_PROMPT.txt` in the new handoff, and its three original full-resolution concept PNGs. Older editor layouts and derived art are excluded from this reconstruction.

Visual thesis: the original candy-pink bakery illustrations, broad orange timber framing, dense warm cabinet and ornate paper tickets assembled as working image layers.
Content plan: real equipped/owned food and slot actions in Menu; real tiers, chance rows and purchases in Packages; real order tickets and worksheet entry in Orders.
Interaction thesis: a finite horizontal stage; one contextual center navigation button; shared viewport HUD; native scroll containers with separate illustrated caps, tracks and thumbs.

## 2000 × 1200 blueprint (before implementation)

| Scene | Main art bounds | Safe interactive content | Details |
| --- | --- | --- | --- |
| Menu | x0–2000, y95–1220, original 1672:941 aspect | x305–1650, y500–945; four columns, two substantial visible rows | Preserve full awning and lamps; large stacked gift at x65/y865, pink inward-facing register at x1660/y880. Counter extends behind shared bottom controls. Sparse genuine saves get meaningful available-slot cards, never invented ownership. |
| Packages | x5–1995, y85–1206, original 1671:941 aspect | x210–760/y345–1005 showcase/selector; x825–1760/y335–1005 header/odds/purchases | Large package illustration, identifiable carousel previews, decorative left rail, discovery below. Eight real rarity chances in a colorful scrollable inset rather than flattening three example probabilities. |
| Orders | x310–1690, y65–1227, original 1367:1151 aspect | x555–1415/y450–1070; four tickets about 140px high | Broad ornate slips with scalloped edges, left reward art/plaque, dotted divider, food × quantity and tray × count, lower progress strip. No additional boxed compartments or blank top plaque. Utilities at x570–1420/y350–420. |

All main structures preserve source aspect. Shared HUD: x1050–1950/y12–92. Navigation: left x70–490, center x700–1300, right x1510–1930, y1065–1180. These exact bounds persist during camera travel. HUD sits above every world layer.

Depth order: recognizable softly warmed panorama; frame and backing; scroll content; decorative edge art and props; fixed HUD/navigation; existing dialogs/worksheet. No duplicated fourth page.

## Asset-to-component checklist

- Original menu frame: remove only connected exterior checkerboard; preserve original illustration.
- Original package and Orders frames: preserve alpha and aspect; split frame ornaments only when needed for layering.
- Original gold button/HUD/help/settings sheets: independent state crops with cap-preserving display, not previous derived graphics.
- Original package sheet: clean eight isolated illustrations; retain the working game's ninth tier and progression.
- Menu concepts: exact card outlines, multiplier shell, counter gift and pink register. Extract clean standalone parts or generate faithful transparent illustrations where occlusion prevents safe extraction.
- Orders concept: exact ornate ticket contour, pastel/gold interiors, decorative stars, reward icons and tray. Reconstruct/generate clean blank ticket shell without baked example values; preserve all actual reward tiers.
- Package concept: rich title plaque, colored chance-row shells, taller rectangular glossy purchase buttons and discovery shell. Use source slices with live numbers.
- Original panorama: gentle blur and cream tint, keeping windows/furniture recognizable and configurable.

QA: actual game screenshots paired with original concepts at full resolution and 2000 × 1200; repeat after corrections. Also 1280 × 800, 1920 × 1080 and short landscape; camera midpoint, fixed bounds, native scrolling/selector, transactions, worksheet save/resume, Node regressions and browser console.
