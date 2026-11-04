# Bakery Power wireframe implementation — 2026-11-04

The latest owner wireframes supersede the horizontal carousel, the previous 40vh cap, and the promotional Packages card. The owner's wireframe specifies the structure; the existing paper/wood palette, Nunito type, bakery illustration and purchase styling remain.

## Current presentation

1. Centered, clickable current multiplier and crown.
2. Compact BAKERY POWER heading with an information button. Both triggers open the same existing small popup: title “Bakery Power 👑”, “Boosts the coins you earn from every order!”, and Close. Its shared wallet is hidden.
3. A prominent illustration of the CURRENT bakery, with its actual name directly beneath it in the same bordered preview.
4. Internally scrolling vertical list. As in the latest wireframe, each row now has two direct sections: bold name with status below, and boxed additive power gain. The small per-row bakery icons are removed. The next row adds its coin price beside NEXT, wrapping within that middle section only when needed on the narrow sidebar. No names, prices or gains are revealed for the later locked row.
5. Dashed separator and a single full-width purchase button: `UPGRADE +<actual gain> 👑 <actual cost> 🪙`. On narrow sidebars, bonus and price form two centered lines. No explanatory sentence or carousel controls remain.

The sidebar fills the same available height as Menu and Order Tickets at landscape tablet widths. Its two Grid tracks divide usable height 60/40 after accounting for the 12px gap; borders and padding belong inside those tracks. There is no leftover space beneath Packages. Bakery Power uses five tracks: multiplier, compact heading, flexible current-bakery image/name, scrollable rows, and fixed Upgrade footer. The old 40vh cap is removed, not layered beneath a new override.

The heading's information target is compact at 32 by 30px; the same popup also has the larger clickable multiplier target. CURRENT retains its 4px dark border, highlighted paper background, bold status, and `aria-current="step"`. Render/resize/Undo reveals the row inside its list without hiding the current-bakery preview or moving the page.

The displayed window is the nearest previously unlocked bakery, CURRENT, NEXT with its price, and one masked later bakery. The first bakery omits the nonexistent previous row; the penultimate bakery omits a nonexistent later locked row; the final bakery shows previous/current and a disabled UPGRADE button. All list rows remain reachable by touch, pointer or keyboard scrolling.

Names come from the existing `bakeryUpgradeName()` mapping. That data intentionally reuses a named bakery stage across multiple internal purchases; no names or ordinal labels were invented. The initial free bakery contributes the baseline +1. Subsequent gains are `bakeryFactor(n) - bakeryFactor(n - 1)`. The next gain is additive power, replacing the old percent label; the existing 8.5% purchase factor, 100-purchase configuration and coin-price formula are unchanged.

Coins now uses a glossy gold face, defined border, inset highlights and bottom shadow. Both header counters have hover and pressed feedback. The Coins popup content and behavior are unchanged.

## Packages wireframe

The replacement Packages panel contains only:

- A package icon, PACKAGE COUNTER and the actual sum of unopened `g.packages` stock. Pending order prizes are not counted as owned/unopened stock.
- A large existing package illustration on the left, with a subtle CSS radial sunburst behind it. On the right, POSSIBLE REWARD appears above the highest obtainable package type's star rank and name.
- One full-width BUY PACKAGES! button fixed at the bottom. It explicitly opens `openPackages('buy')`, even if the user last visited Unbox.

The current data yields **8-star FATE** (the catalog name is Fate, not the wireframe's illustrative Fated). `possiblePackageReward()` selects the highest package-shop rank with positive ticket probability, then renders its actual name and one-based star rating. This is a possible package type, not a guaranteed roll or a promise about the food inside. Package odds and purchasing gates are unchanged.

The old promotional descriptions, multiple package illustrations and How to play link are removed from this panel. Counter and Buy button remain outside the flexible illustration/copy section; that section can scroll in exceptionally short layouts. In the existing 640-959px portrait reflow, the two panels sit side by side above Menu/tickets; below 640px they return to a full-height stacked 60/40 sidebar in the scrolling game shell.

## Implementation and compatibility

- `src/ui/scene.js`: progression window, vertical renderer/current preview, shared information popup, dynamic package counter/reward panel, and current-row reveal.
- `src/main.js`: render/resize calls the new vertical reveal function.
- `src/game/progression-economy.js`: removes only obsolete carousel position/banner presentation state and its timeout. Purchases, pricing, save fields, Undo and toasts are retained.
- `styles/progression.css`: replaces old panel rules with a full-height 60/40 split, compact Bakery Power heading, current preview, progression states and fixed action footers, plus the Packages sunburst. Existing unrelated layout changes remain.
- `tests/bakery-panel.test.mjs`, `tests/frame11.test.mjs`, `tests/browser-bakery-power.py`, `tests/browser-frame11.py`, `tests/ux.test.mjs`: updated structural, progression, purchase and browser checks.

No save migration or storage-key change is needed. No worksheet/bridge or other progression rules changed.

## Verification

`node --test tests/*.test.mjs`: 87 passing tests. Covers neighboring state windows and gains at every internal level, first/final states, exact information copy, unchanged upgrade charge/factor, Undo and reload, saved package-stock totals, pending-prize exclusion and dynamically selected possible rewards.

`python tests/browser-bakery-power.py`: WebKit and Edge at 2000×1200, 1194×834 and 1024×768, each at levels 1, 21, 100 and 101. Checks exact 60/40 proportions and bottom alignment, the current preview, compact heading, CURRENT visibility/border, two sections per row, reachability of every row through internal scrolling, stationary accessible Upgrade button, unknown later details, unaffordable/final disabling, both identical popup triggers, real purchase/Undo/reload, unchanged Coins popup, exact package counter, possible reward, one package button and explicit Buy-tab routing. Screenshots under ignored `.test-tools/bakery-power-shots/` were visually reviewed at all three widths.

`python tests/browser-frame11.py`: WebKit and Edge passed the wider collection, purchase, Mastery, Packages, saved worksheet and exactly-once claim regressions, including carrying 79×18, tap/drag/swipe and tutorial/sound toggles. The old banner assertion now checks the updated CURRENT row. Tracked regression screenshots were restored after the run. No manual Live Server test, push or deployment was performed.
