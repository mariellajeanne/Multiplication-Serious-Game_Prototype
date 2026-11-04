# Kitchen removal — 2026-11-04

Implemented at the owner's request. This supersedes Kitchen directions in earlier audits and design checkpoints. No Unity port, deployment or push is part of this change.

## Current behavior

- Kitchen tabs, dialogs, tool art, catalog, upgrades, costs, unlock notifications and tutorial references are removed. Menu is a single heading rather than a one-option tab strip; its existing toolbar and flexible collection grid follow directly beneath it.
- Baker's Boost = `max(1, equipped recipe contribution sum) × Bakery Power`. The HUD, info dialog, ticket previews and future order budgets use this same derived total.
- The economy unit, individual food earning share and fusion fee omit the retired multiplier. Slot, Package, Mastery, Bakery Power and refresh prices continue to derive from these units. Existing factors, gates, recipes, purchase limits and probability tables are unchanged.
- Shared `.tool-preview` styles remain because Helper and food-sale dialogs use them. They are not Kitchen-specific.
- Menu, Food Index, Packages, paid Mastery, Bakery Power, pantry/fusion, Helpers and legacy modes remain. Worksheet code and both bridge implementations are unchanged.

## Save compatibility

The localStorage key remains `panaderyaQuestV2`. Loading no longer requires an equipment object, so new saves without that obsolete field do not reset on reload. Loading removes `equipment`, `kitchenSpent` and the obsolete `kitchen` unlock marker. The cleanup is idempotent and is persisted by the normal save path.

Coins, foods and investments, recipe ceilings, menu capacity/assignments, Bakery Power, Packages, pantry, mastery/luck, existing contracts and order progress are retained. Historical Kitchen expenditure is discarded without refund; unknown older expenditure is not reconstructed. No Kitchen multiplier or replacement multiplier survives.

An old pending purchase Undo is committed when obsolete fields are present, because its signature includes equipment and its snapshot must not reintroduce retired data. New purchases retain normal ten-second Undo and reload behavior.

Already-started orders retain their promised budget, pending rewards, worksheet snapshot, attempt ledger and claim identity. New orders use the reduced Boost. Legacy helper contracts retain their promised rate for the remainder of their short shift; new contracts use the current earnings rate.

## Balance evidence and decision

Accept removal without further tuning. Kitchen was a common multiplier on both Normal-order earnings and proportional prices. Removing it on both sides preserves affordability in expected orders, apart from integer rounding. The stored peak remains a recipe-only value and needs no rescaling. Optional fixed pantry prices and historical resale investment are retained; neither gates the Menu/Mastery/Packages/Bakery Power progression path.

The existing deterministic simulator now excludes tool purchases and uses model version 3. Reproduce with:

```sh
node tests/simulate-progression.mjs docs/progression-simulation.json
```

Compared the pre-removal production model with the new model: seed 20261104, 60 trials per scenario/policy, 80 orders, early/middle/late portfolios, growth/mixed/collector policies (540 trajectories per version).

| Snapshot | Next Mastery, orders before → after | Next Bakery Power, orders before → after | Standard Package, orders before → after |
| --- | --- | --- | --- |
| Early | 1.1994 → 1.1994 | 2.5023 → 2.5023 | 0.6021 → 0.6021 |
| Middle | 0.1807 → 0.1807 | 8.7692 → 8.7692 | 0.6000 → 0.6000 |
| Late | 0.7402 → 0.7402 | 28.9785 → 28.9785 | 0.6000 → 0.6000 |

Growth-policy median power growth over 80 orders changes from 503.76× to 416.77× early, 4.80× to 3.86× middle, and remains about 1.47× late. Early growth-policy first purchase is at orders 1/3/5 (p10/median/p90); middle/late first purchases occur at order 1. The simulator checks nonnegative coins, unique recipes and slot capacity after every order. Collection-only policies deliberately defer investment and are not evidence of a progression lock.

Independent formula checks cover zero and obsolete tool levels up to 20, mastery 0/40/160/1000, and Bakery Power levels 1/21/71/101. Prices match expected-order costs within half a coin. Active-to-helper income remains 6×/4×/3× at 60/90/120 seconds per Normal order. This is model evidence, not a child playtest or a full journey forecast; the simulator conservatively includes only advertised minimum free Packages. The temporary pre-change simulation output was removed after comparison.

## Verification

- `node --test tests/*.test.mjs`: 82 passing tests, including obsolete-save cleanup, order/investment preservation, reload, new Undo, Boost and price invariants. Smoke tests are included.
- `python tests/browser-frame11.py`: WebKit and Edge; legacy save cleanup, collection and details at 2000×1200, 1194×834, 1024×768, 834×1194 and 768×1024, no horizontal overflow, no obsolete tabs or reserved gaps, purchase/Undo/reload, Mastery, Package buying/unboxing, 79×18 carrying, taps/drags/swipe, tutorial/sound controls, switching saved orders and exactly-once claims.
- Visual inspection of generated desktop/tablet collection screenshots. No manual Live Server test was performed.

Relevant code: `src/data/catalog.js`; `src/game/progression.js`, `state.js`, `progression-economy.js`, `rewards.js`; `src/ui/menu.js`, `dialogs.js`, `bakery-art.js`; `styles/progression.css`. Tests, simulation scenarios/output, active references and historical-checkpoint notices are updated alongside them. Existing HUD spacing adjustments are preserved.

Test/model files: `tests/kitchen-removal.test.mjs`, `progression.test.mjs`, `frame11.test.mjs`, `ux.test.mjs`, `browser-frame11.py`, `browser-ux.mjs`, `browser-progression-checks.mjs`, `simulate-progression.mjs`, `progression-scenarios.json`; output `docs/progression-simulation.json`.

Documentation: `AGENTS.md`, `UNITY_MIGRATION_REFERENCE.md`; `docs/GAME_VISION.md`, `ARCHITECTURE.md`, `REWARDS_AND_PROGRESSION.md`, `FRAME_11_IMPLEMENTATION.md`, `TABLET_UX_IMPLEMENTATION.md`; historical notices in `docs/STAGE_C_D_IMPLEMENTATION.md`, `CORRECTIVE_REDESIGN.md`, `BAKERY_COMPONENT_REVIEW.md`, `ANNOTATION_REDESIGN.md`, `UX_AUDIT.md`, `CODEBASE_AUDIT.md`; this document.
