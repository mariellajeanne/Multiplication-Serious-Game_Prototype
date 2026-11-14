> Historical checkpoint. These notes preserve past decisions and proposals; they are not current implementation instructions. Start with [AGENTS.md](../../AGENTS.md), [architecture](../ARCHITECTURE.md) and [current UI geometry](../UI_GEOMETRY_REFINEMENT.md). Generated screenshots/backups and retired prototype source are recoverable from Git history.

# UI refinement and visual cleanup — 2026-11-09

The subsequent [order-slip, rarity-effect and register pass](ORDER_PRESENTATION.md) updates only Orders and the decorative register; the earlier header, room and shared-popup work remains.

The actual root application retains the approved illustrated bakery and production gameplay. This pass supersedes the header, tickets, popup framing and button presentation in [the initial production integration](PRODUCTION_UI_REPLACEMENT.md). The additional owner correction enlarges the repaired hanging sign and repairs the upper-left room architecture.

## Implementation

- `src/ui/bakery-hub.js`: existing order-type names/icons from `COIN_ORDER_LABELS`, `COIN_ORDER_ICONS` and saved tickets; prominent coin art and tier badge; food/tray equation; real progress and whole-ticket selection. Removed visible coin-container labels, payout labels and play arrows. Tier differences use restrained warm paper/frame colors. Ticket taps still invoke `startTicket` and retain saved runs and budgets.
- Header: a reconstructed transparent sign in `assets/bakery-ui/title-sign-refined.png`. It is approximately 19% larger than the first refined render, centered on the cabinet, and layered just over its upper wooden edge. Its painted silhouette clears the Menu Collection plaque and Boost controls. The image retains its proportions and does not intercept input.
- `assets/bakery-ui/bakery-room.png`: repaired the underlying upper-left arch to use one continuous wooden rim following the striped awning. Retained foliage, canopy, lighting and other scene positions. No overlay conceals the former protrusion.
- Separate, transparent `control-help.svg`, `control-settings.svg` and `control-close.svg` extend the existing code-native illustration system. Pressed/selected/disabled states preserve control positions.
- `styles/bakery-interface.css`: content-driven small/medium/large overlays and a clean scalable `popup-frame.svg` using 9-slice framing. Removed the scalloped white bottom strip, stray reward-header clip, duplicate advanced-section marker and repeated oversized title plaques. Popup text and controls use actual viewport sizes, so they remain readable as the scene scales.
- How to Play uses four illustrated steps plus expandable worksheet tips. Settings preserves existing controllers and persistence, with developer/reset actions inside Advanced. Boost shows the live total and equipped-food contributions. Odds uses actual probabilities with an optional base-coin explanation. Sale confirmation and external completed-order receipts use concise visual layouts. The worksheet's own claim screen remains original.
- Collection groups slot/index controls, automatic/manual equipment controls, filtering and multi-selection. Small collections shrink and center their food cards; larger collections scroll. Food detail and bulk-action layers retain existing selection, Mastery, sale, equip and Undo controllers. Selected text remains readable.
- `styles/bakery-hub.css` and `src/ui/illustrated-controls.js`: centered button labels, green paid Skip action, adequate hit areas as the scene scales, and synchronized scrollbar sizing that accounts for its minimum touch size.

## Preservation and backup

Before editing, 149 files were archived in ui-refinement-before-20261109-232110.zip, with an adjacent SHA-256 manifest. All production game/state/economy files, catalog, worksheet files and both bridge endpoints remain byte-identical to that task-start backup. Original package, menu and scene controllers remain unchanged; the new hub adapter delegates their actions. No save migration or key change was introduced.

The existing Packages purchasing/opening interface remains outside the new popup styles. Cropped title/Help/Settings/frame assets and the unused ticket play-arrow PNG were retired from the production asset directory after checking runtime references. Their originals remain in the backup and historical standalone source.

Only the two defective raster assets were reconstructed, using built-in image generation/editing. [Exact prompts and final asset paths](../../assets/bakery-ui/refinement-provenance.json) are recorded with the assets. Clean controls and framing are native SVGs. Screenshot crops/contact sheets are QA artifacts, not replacement production art.

## Verification

Commands used for the actual root app:

```powershell
node --test tests/*.test.mjs
python tests/browser-hub.py edge webkit
python tests/browser-ui-replacement.py edge webkit
python tests/browser-ui-refinement.py edge webkit
$env:PANADERYA_TEST_VIEW='hub'
node tests/browser-worksheet.mjs
```

The refinement runner checks all eight existing order tiers, long equations/headings, real progress/resumption, settings persistence, 44px touch controls, popup/frame bounds, starter/full collection, bulk actions, sale confirmation and a one-time receipt claim. Its claim fixture is prepared directly; the separate original worksheet runner performs actual mathematical solving, including 79×18 and 19×9, carries, click/drag, swipe, reload and degraded-API/message-delivery cases.

Observed results:

- **127/127 Node tests passed**, including the new eight-tier render/state/RNG check.
- Existing hub and full production integration runners passed **Edge and WebKit**. They verify 1/3/5/9/10/16/17 equipped foods plus empty-menu recovery, real package purchasing/opening, duplicate Mastery, equipment/Boost, save/reload, both independent scroll areas and original worksheet retention. Before/after computed appearance baselines still match for the preserved Packages and worksheet surfaces.
- The new refinement runner passed **Edge and WebKit** after the final sign, arch and control changes. Screenshots were rendered and inspected at **2000×1200, 1280×800 and 1024×768**. Checks cover eight production order types, widest equations, popup/food-action bounds, 44px control targets, settings persistence, original worksheet resumption, one-time receipt collection, bulk selection and a full contribution list. Edge results, WebKit results.
- Original worksheet regression passed real **79×18=1422** and **19×9=171**, click/drag, carrying, Undo, swipe-to-add, Guide/Sound settings, paused/reloaded work and unique coin claims, including missing APIs and dropped completion deliveries.
- The installed web-game client rendered the actual home, help, collection and original worksheet. Its screenshots/state were inspected, without browser-error artifacts. Playwright CLI independently inspected the root app, tutorial and final composition. A final focused Chromium scrollbar check also completed wheel, arrow, track, thumb, keyboard and native touch interactions.
- SHA-256 verification confirms **all 29 protected files** are byte-identical to this pass's pre-edit backup. Preservation audit.

Reviewed visual evidence:

- Final actual application at 2000×1200 and 1280×800.
- Actual app before/after.
- Underlying upper-left architecture before/after.
- Popup, food-detail, receipt and bulk-selection review.

The sign's painted boundary stays below the stage's top edge, slightly overlaps the cabinet wood and clears its Menu/Boost row. Source room art and its rendered counterpart were inspected for a continuous arch, coherent awning, retained foliage and absence of the projecting beam. Final screenshots also caught and resolved inherited selected-text contrast and a legacy reward-header decoration.

Native touch emulation is used; physical Android tablet testing remains unperformed. No push or deployment.
