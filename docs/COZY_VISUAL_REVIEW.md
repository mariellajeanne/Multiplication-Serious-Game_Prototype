# Cozy bakery visual review

**Superseded visual approach:** the owner rejected the scenic-background treatment. [BAKERY_COMPONENT_REVIEW.md](BAKERY_COMPONENT_REVIEW.md) records the replacement: native bakery-style components, subtle background, local rounded type and no scenic image requests. Inventory/claim behavior from this earlier pass is retained.

2026-10-31. Latest source: the owner's **“Do NOT proceed to Stage C yet”** brief, four bakery aesthetic images, and the reward-resolution layout mockup. These supersede the darker green presentation in [CORRECTIVE_REDESIGN.md](CORRECTIVE_REDESIGN.md). The bakery references define the atmosphere; the popup mockup defines the package row, summary and return-button composition. Mockup currency numbers are examples, not balance changes.

**Status: visual/UI pass implemented; awaiting owner approval. Stage C and the new ticket-refresh feature remain unimplemented. No commit or push.**

## Screens updated

- **Main bakery:** original illustrated sunlit bakery environment, peach/cream paper, honey wood, terracotta controls, readable dark-brown text and light navigation with separate icon backplates. Settings uses explicit grid centering. Menu multiplier and wallet remain above Inventory/Index; both collection buttons now sit directly beneath the wallet area and above the food grid.
- **Slots:** regular cards inside the food grid, in order **Buy Slot → one Add Item card → occupied foods**. The two utility cards share the occupied-card dimensions. Buy Slot shows its actual price on the same line as the label; Add Item shows the number of empty spaces. No duplicated empty-slot cards and no separate wide utility strip. Existing prices and capacity rules remain.
- **Bakery/decor component:** above Menu, with stage name, displayed Bakery level, actual current bonus, existing upgrade price and Decor entry point. The ten requested milestones **2, 3, 5, 7, 10, 13, 17, 21, 25, 30** are shown as an explicitly labelled **30-level milestone preview**.
- **Inventory:** normal opening defaults to multi-selection with unchecked, obvious top-right checkboxes. Tapping food art also selects. Add To Menu, Remove and Sell stay visible at the top, initially disabled. Controls enable for eligible selected foods; Add refuses an over-capacity selection as a whole. Add Item opens this same inventory with add intent. Single-food Level Up/Fuse remain available.
- **Tickets and selected food:** warmer board materials retain clear rarity fills and large expressions/rewards. Hover/focus highlights a matching equipped food. The worksheet's food/order summary has its own colored frame, including the Spanish Bread example.
- **Worksheet:** warm framed paper, clearer caramel target outlines, retained large responsive cells and existing capsule/input behavior. Package Luck is a compact package icon plus score/progress bar and drop-chance caption; the confusing arrow toward a gift is gone. The attached prize still fits the tested tablet viewports. Player-facing reward icons use parcels instead of gifts.
- **Resolved-order popup:** centered clipboard-style dialog, top-right X, “Order Ticket Resolved!” title, three package reward cards in a row on tested tablet/desktop widths, accurate NEW/copy badges, large actual coin and permanent Ticket Luck gains, and Back to Bakery. Narrow phones wrap the cards. The header and inventory action controls remain accessible when scrolling a long dialog.

## Behavior and save boundaries

### Inventory batches

Selection and pending confirmation are transient UI state, outside the save object. Batch Add deduplicates selected UIDs, ignores already equipped copies and validates free spaces before changing anything. Remove and Sell show one confirmation for the eligible group. Cancel preserves selection without changing the game. Confirmation validates the exact owned copies, levels, tiers, investment and equipped status again; stale confirmations are refused. The pending action is cleared before mutation, so repeated confirmation cannot repeat a sale.

Batch Remove keeps every owned copy and its upgrades. Batch Sell uses the existing per-copy `resalePrice()` calculation, removes those copies/menu assignments, retains permanent discoveries and writes the save once. No new prices, tier rules, food-value calculations or currency systems were introduced. All mutations remain blocked during a live worksheet. The strongest-equipped-copy rule is unchanged.

### Completion

The existing two-step flow remains: validated completion persists a claim; Collect credits it once and opens the redesigned resolved-order popup. Closing the popup only dismisses it. It does not repeat the claim or discard earned rewards. Copy badges use ownership counts before the claim, advanced per reward; NEW means the first permanent discovery. Ticket Luck shows its **actual** change, including +0 where appropriate, rather than always displaying the mockup's +1.

The previous completion retry/acknowledgement, action ledger, carry rewards, undo tolerance, sound/guide controls and iframe lifetime fixes remain. `panaderyaQuestV2`, stored decor, owned UIDs/levels/tiers/investment, reward protocol fields and existing ticket generation remain compatible. The additional dialog variant is presentation state and is not saved.

### 30-level concept is a preview

This pass does **not** silently implement the progression overhaul. Displayed Bakery level is the existing `g.decor + 1`; stored decor and the four existing purchases remain unchanged. The track previews the requested ten future milestones. The actual Level 30 costs, bonuses, migration and milestone environments still belong to the deferred progression work. Upgrade Bakery opens the existing Decor view and honors its current unlock/cost rules.

## Verification

**41 automated tests passed:**

```sh
node --test tests/smoke.test.mjs tests/worksheet-session.test.mjs tests/worksheet-rewards.test.mjs tests/ux.test.mjs tests/completion-reliability.test.mjs
```

New regressions cover initially disabled selection actions, capacity-safe multi-add, confirmed multi-remove, investment-preserving removal, exact once-only multi-sale/refunds and saved discoveries, cancellation/stale confirmations, live-worksheet mutation guards, slot ordering and accurate new/copy/Luck summaries.

**Real isolated Edge browser checks:**

- `node tests/browser-ux.mjs`: real checkbox clicks, batch Add/Remove/Sell, confirmations, persisted sale, all existing dialog families, direct level/fusion transactions, guide OFF, reduced motion, protected reward paths, and page/worksheet renders at 2000×1200, 1194×834, 1280×800, 1024×768, 768×1024 and 390×844 as applicable.
- The popup fixture deliberately recreates the supplied layout example: Pandesal **2nd Copy**, Pan de Coco **NEW**, Monay **2nd Copy**, **+3,004 coins / +1 Ticket Luck**. Those are actual isolated-fixture claim results, not hardcoded production payouts. Claims remain once-only. Centering/bounds are checked at five sizes; the three-card row and visible return button are checked at tablet/desktop sizes.
- `node tests/browser-worksheet.mjs`: 79×18 carrying via clicks/drags and downward addition; dialog/state/history retention; tutorial/SFX ON/OFF; saved completed-claim reload and repeated collection; 19×9 touch carry; 1024×768 touch/swipe completion with animation APIs throwing, `findLastIndex` absent and the first two completion deliveries dropped. No unexpected runtime exceptions.
- Visual inspection identified a shrink-wrapped dialog that forced a 2+1 card arrangement and hid the return button on a tablet, plus a sticky inventory bar obscured by its header. The backdrop now allocates a full-width grid track and dialogs scroll their body beneath a fixed header. These were corrected and the browser checks strengthened accordingly.

### Review images

| Screen | Desktop | iPad-size |
|---|---|---|
| Main bakery | [2000×1200](previews/cozy-redesign/main-progress-2000.png) | [1194×834](previews/cozy-redesign/main-progress-1194.png) |
| Worksheet | [2000×1200](previews/cozy-redesign/worksheet-product-2000.png) | [1194×834](previews/cozy-redesign/worksheet-product-1194.png) |
| Resolved popup | [2000×1200](previews/cozy-redesign/order-resolved-2000.png) | [1194×834](previews/cozy-redesign/order-resolved-1194.png) |

Also: [portrait popup](previews/cozy-redesign/order-resolved-768.png), [phone popup](previews/cozy-redesign/order-resolved-390.png), [inventory](previews/cozy-redesign/inventory.png), [selected inventory](previews/cozy-redesign/inventory-selected.png), [batch sale confirmation](previews/cozy-redesign/inventory-sale-confirmation.png).

More regular-size menu cards require normal vertical scrolling at shorter tablet sizes. Inventory and larger reward collections scroll within the dialog body; fixed headers remain usable. Actual iPad/Safari, real-device safe areas, audible SFX quality and child playtesting remain unverified. Full unfinished-math recovery after a browser reload remains the earlier limitation; dialog/resize preservation and completed-claim recovery are retained.

## Original environmental art

The built-in **imagegen** tool generated [assets/bakery-interior-cozy.png](../assets/bakery-interior-cozy.png), a 1536×1024 original raster background inspired by the supplied mood references. The reference JPGs were not copied into the game or modified. Existing local Filipino food SVGs remain; new package art extends the local SVG illustration system.

Final generation prompt:

> Create an original polished children's casual-game bakery interior background illustration, landscape 3:2 composition. Warm sunlit Filipino panaderia, soft illustrated isometric-ish painterly 3D game art, cozy peach plaster walls, honey-colored wood counters, warm cream and muted terracotta tile floor, arched window and angled sunlight on the left, small potted greenery, hanging amber pendant lamps, curved glass bread display counter with pandesal, monay and Spanish bread around the FAR RIGHT edge and lower corners, back-wall wooden bread shelves. Gentle soft shading, rounded charming forms, refined warm light, appetizing bread, clean edges. The central 65 percent should remain a quiet light peach cream wall and soft counter gradient with very little detail, suitable for readable game panels to overlay. Important decorative content kept near outer edges and top corners. Slight depth and glow, inviting, not photorealistic, not pixel art. No text, no letters, no labels, no interface, no logos, no watermark, no characters. This is an environmental raster asset for a real educational bakery game, not a mockup.

## Files changed

- `assets/bakery-interior-cozy.png`: new environmental art.
- `src/ui/menu.js`, `dialogs.js`, `scene.js`: slot order, collection placement, multi-select UI/transactions, bakery preview and food highlighting.
- `src/ui/bakery-art.js`: package SVG, copy labels and resolved-order presentation.
- `src/game/rewards.js`: presentation metadata and new result popup; reward math/eligibility unchanged.
- `src/game/state.js`: optional dialog presentation class; no save format change.
- `src/game/worksheet-bridge.js`, `src/ui/reward-feedback.js`: compact Package Luck markup and package icons; protocol/reward accounting unchanged.
- `styles/feedback-layout.css`, `worksheet/styles/responsive-workspace.css`: cozy palette, image backdrop, cards, modal composition, scrolling and worksheet appearance.
- `tests/ux.test.mjs`, both browser runners: added regressions and new review artifacts.
- This document and current-context pointers in project docs/AGENTS.

## Stop point / next approved work

**Stop for the owner's visual approval.** After approval, Stage C must also include the newly requested ticket reset/refresh feature: **3-minute cooldown, at most 5 visible tickets, clear cooldown UI, and saved-state compatibility**. No refresh button, cooldown, five-ticket generator, Level/Tier 5, new rarity distribution or rebalance was implemented in this pass. The earlier Stage C/D backlog remains recorded in CORRECTIVE_REDESIGN.md.
