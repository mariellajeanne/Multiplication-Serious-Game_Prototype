# Reference-guided raster generation

Built-in `image_gen` produced seven missing components, with transparent output. All source references were opened at full resolution first. The production script only trims transparent margins, removes disconnected noise and downsamples these outputs; it does not redraw them. Original generated images remain in the tool's generated-images directory.

| Runtime asset | Explicit reference | Generation brief / invariants |
| --- | --- | --- |
| `register.png` | Menu concept, bottom-right | Recreate only the complete cream/cherry-pink cash register, tilted screen with cream chef-hat emblem, receipt and pink drawer. Restore occluded lower edge. Preserve inward-facing perspective, bold warm-brown outlines and cel shading. No badge, counter, text, navigation or backdrop. |
| `counter-gifts.png` | Menu concept, bottom-left | Recreate the exact stacked cream gift with pink bow/bread emblem over purple polka-dot chef-hat gift. Restore complete bottom edge. Preserve proportions, overlap, outlines and colors. No counter, navigation, text or extra objects. |
| `ticket-gold.png` | Exact cropped first Orders ticket | Preserve wide ~4.2:1 stepped/scalloped notches, layered white/gold outline, cream paper, gold sparkles, dashed divider at 31%, and blank lower-left orange label pill. Remove reward illustration, all text/numbers, food, tray and progress bar. No boxed fields or top plaque. |
| `ticket-pink.png`, `ticket-purple.png`, `ticket-rainbow.png` | Each corresponding cropped Orders ticket plus generated blank gold shell | Preserve the blank shell structure and wide proportions. Match each reference's paper, outline, sparkle, divider and label-pill colors. Keep both reward area and main field empty. No words, icons, numbers, food or progress pixels. |
| `purchase.png` | Exact cropped Packages Open ×1 button | Preserve ~1.73:1 rounded rectangle, thin brown outline, fine white rim, pale-yellow upper / golden-yellow lower fill, top-left glint and lower orange bevel. Remove all text, quantities and coin. True transparent exterior. |

`provenance.json` records output filenames, source crops and generated source filenames. This set was generated specifically for the second-round handoff; no earlier editor derivative is consumed by the new presentation.
