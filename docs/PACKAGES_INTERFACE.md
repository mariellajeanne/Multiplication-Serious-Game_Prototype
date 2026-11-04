# Packages workspace — 2026-11-05

Implemented owner direction. This supersedes the separate Buy/Unbox tabs, next-locked-type-only list, 1,000-per-purchase limit, all-types Open All, and separate package reward dialog. The attached wireframe determines the structure; the written request explicitly removes its Collect Items button.

## Layout

The existing modal presents three full-height columns in approximately **16% / 42% / 42%** proportions, matching the wireframe:

- **Left:** independently scrolling cards for all eight package types, existing illustrations and rarity palettes, star ratings, name strips and actual unlocked unit prices. Locked types remain selectable and show only `NEEDS HIGHER BAKERY POWER 👑`; selected cards have a strong outline. Bakery Power gates purchasing at the existing `PACKAGE_SHOP` thresholds.
- **Center:** selected package heading; eight food-rarity probability bars with actual percentages; Order Packages heading; quantity box, selected/free-capacity fraction and total-price badge; slider between stacked −1/−5 and +1/+5 controls; Max Affordable; large gold Buy button with the actual total.
- **Right:** selected-star opening heading; internally scrolling grid of that type's unopened package icons and session-local opened food cards; one green Open All Packages button fixed below the grid. Close sits at the far top-right, without another banner or explanatory panel.

Selection updates both center and right. A type with no stock stays selected. Opening and purchasing are available together; switching types retains that session's opened food cards for each type. Opened slots keep a stable grid size, avoiding shifting touch targets. Updating the workspace retains the mounted modal and does not replay its entrance animation.

At the three requested landscape sizes, all three columns remain side by side with controls at least 44px. Below 760px, types remain left and purchasing/opening stack on the right with internal scrolling. Below 440px, the type selector becomes a horizontal strip above the other sections. Type names, quantities, prices and actions remain visible without horizontal page overflow.

## Purchasing and capacity

Prices, food-drop distributions and Bakery Power unlocks retain their existing production formulas. Coin Luck does not influence food-drop probabilities. Package types and food rarities remain separate systems.

New purchases are limited to **50 unopened packages per type**. The selected quantity is clamped to the smaller of affordable quantity and free spaces (`50 − unopened stock`), and to zero for locked tiers. The fraction shows selected quantity/free spaces, e.g. `10/35` when 15 packages already occupy that type's 50 spaces. There is no capacity shared between types.

All eight existing `g.packages` counts retain their storage format. Older saves above 50 retain every unopened package; purchases pause for that type until stock falls below the new cap. They can still open individual packages or all of that type, including legacy excess stock.

Buy commits immediately using an exact quote for selected type, quantity, unit price, existing stock and total. Replayed or stale button quotes cannot spend again. Changes to prices, quantity, selection, capacity or affordability invalidate a quote. Purchasing continues to commit any prior purchase Undo, as before.

## Opening and automatic collection

There is no Collect Items button, opening cooldown or second reward dialog. Each icon has a session-local identity. Opening one consumes its stock, credits the food or duplicate Mastery capacity, and saves both together **before revealing its result**. Replaying that icon cannot open another package. Open All snapshots only the currently selected type's unopened icons and commits them in one transaction; other types remain untouched.

Revealed cards show the actual food image, name, food rarity and `NEW!` or `+1 MASTERY AVAILABLE`. Duplicate credit unlocks paid Mastery capacity; it does not purchase a Mastery level. Closing by X, Escape or backdrop, or replacing the popup, discards only the temporary cards. Collection, Mastery capacity and remaining packages persist. Refresh/reload cannot reopen consumed stock, and interrupted presentation cannot undo credited food.

Existing pre-Frame-11 guaranteed-food queues remain supported. Those packages consume their saved promised food ranks before ordinary food rolls, as established by the coin-only order migration. New package probabilities are unchanged.

## Integrity and implementation

- Save key remains `panaderyaQuestV2`; stock remains eight numeric counts.
- Additive `packageRevision` defaults to zero on old saves and increments on each package purchase/opening transaction. Stale package transactions and autosaves refuse to overwrite a newer inventory revision.
- Failed writes restore coins, packages, guaranteed-rarity queues, owned foods, recipe ceilings and revision. Failed openings reveal no reward and leave the icon available to retry.
- Session slot IDs, rendered results and view/purchase quote identities live outside saved state. Opening code has a synchronous reentrancy guard. Old Open All view identities cannot act after switching or refreshing the panel.
- `src/ui/dialogs.js` owns the workspace and transactions; `src/ui/bakery-art.js` renders compact revealed cards; `src/game/state.js` handles revision compatibility, stale-save protection and popup-close lifecycle. The underlying package component rules in `styles/progression.css` replace the old layout.
- Menu, sidebar panel, Order Ticket coin tiers, package odds, pricing, worksheets and unrelated progression rules are unchanged.

## Verification

- `node --test tests/*.test.mjs`: **106 passing**, including eight-type gates, exact production odds, capacity/affordability, preserved over-cap saves, stale quotes and clicks, immediate discovery/Mastery, selected-type Open All, session clearing, reload, failed-write rollback and stale autosaves.
- `python tests/browser-packages.py`: **WebKit and Edge pass** at **2000×1200, 1194×834 and 1024×768**, with measured 16/42/42 proportions, readable unclipped buttons, all eight types, selected-type panels, single/Open All behavior, automatic collection, session clearing and reload. Also checks portrait/narrow layouts at 834×1194, 597×417 and 390×844, and scrolling through 50 packages.
- `python tests/browser-frame11.py`: **WebKit and Edge pass**, including package purchasing/opening, persistent orders, 79×18 carrying by tap/drag, tutorial/sound controls, swipe/add rows, lost-completion recovery and exactly-once coin claims.
- `python tests/browser-bakery-power.py`: **WebKit and Edge pass**, preserving sidebar structure, its 60/40 split, upgrades/Undo/reload and counter popup entry points.

Final visual references: [2000×1200](previews/packages/2000.png), [1194×834](previews/packages/1194.png), [1024×768](previews/packages/1024.png), [revealed foods](previews/packages/opened.png), [locked type with retained stock](previews/packages/fate.png). The browser runner writes additional screenshots under ignored `.test-tools/packages-shots/`.

No push or deployment.
