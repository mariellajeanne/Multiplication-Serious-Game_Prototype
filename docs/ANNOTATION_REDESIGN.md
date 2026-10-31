# My Panaderya — annotation-led redesign

**Superseded visual checkpoint:** see [CORRECTIVE_REDESIGN.md](CORRECTIVE_REDESIGN.md) for the subsequent richer presentation, reliability fixes, current tests and actual renders. This document preserves the earlier implementation history; its old pending-launch status is no longer current.

2026-10-30. Source of requirements: the user's “Main Page & Worksheet UX Redesign” request and the two annotated JPGs. The written request defines scope; screenshot annotations guide layout rather than exact pixels. Illustrative screenshot numbers (e.g. a 100-coin level-up or a ×1.00 base) are **not balance changes**.

## Implemented stages

1. **Global/main:** public name is My Panaderya; no subtitle; friendly local sans-serif typography. Settings sits beside the title. The yellow wallet lives inside the green `Menu | ×N 🪙` panel. Removed the large storefront/status illustration, redundant captions and menu-upgrade instructions. Discovery count lives with Collection navigation.
2. **Food cards/tickets:** food cards expose actual Level Up price and Fuse fee directly, with upper-left value/base, upper-right rarity, centered art/name, and lower level/tier contributions. Level contributes the real +20% increments; fusion contributes the existing ×1/1.6/2.5/4 factors. Direct level-up retains the transaction but does not open the inventory popup. Tickets show coins/applied base multiplier above art/name/equation; quantity context remains accessible in the label. Larger permanent Ticket Luck stars sit beside Order Tickets; the optional odds popup remains. No timed refresh/countdown was invented.
3. **Worksheet:** one centered white panel wraps measured content. Order art/name/equation and tray quantities are inside it; Chest Luck sits directly below. Exit is inside the upper-right and styled with Undo, which stays lower-left. Removed visible instruction/progress labels while retaining DOM hooks and accessible guidance. A `layout` message changes CSS cell size/gaps from available width/height and column/row count, without resetting math state. The prize sits compactly beneath the worksheet rather than at the viewport bottom.
4. **Feedback/guide:** each earned coin and Luck amount has its own chip. Protected math/floating geometry is reported for presentation only; recognition and flight paths use side lanes or the space above math, not interactive tiles. Coins/chests land at the prize; Luck lands at the relocated Chest Luck indicator. Reduced motion fades; accounting and deduplication remain independent. Resize cancels old presentation and repaints earned totals. A one-time persisted guide graduation occurs after the third **claimed successful order**; later manual re-enabling is respected.

## Fusion compatibility

The existing rule consumes **one exact-food duplicate per fusion tier**, charges that tier's existing base fee, retains the target's level and accumulates donor investment. Quantity selection schedules consecutive applications of that same rule, capped by available copies and remaining tiers. The preview adds the exact rounded fees for those tiers; it does not charge several copies for one tier or invent discounts. Preflight checks the whole amount before calling the existing transactions. Submission clears the selection, so a repeated submit does not spend again.

Ingredient fusion is still a distinct route from the same focused popup, retaining fixed ingredient prices, inventory usage and the base fee. Empty duplicate inventory disables duplicate confirmation, not the ingredient alternative. Existing ingredient investment-accounting limitations are unchanged.

`panaderyaQuestV2` remains unchanged. `guideGraduated` is additive: old saves below three orders remain eligible for the one-time graduation; established saves at/above three retain their saved guide preference and are treated as already graduated. No coins, food upgrades, discoveries, mode rules or probabilities are reset.

## Files

- Main/card/ticket views: `src/main.js`, `src/ui/menu.js`, `src/ui/scene.js`, `src/ui/bakery-art.js`, `index.html`, new last-loaded `styles/feedback-layout.css`.
- Supporting transactions/settings: `src/game/economy.js` (optional inline presentation), `src/game/state.js` and `src/game/rewards.js` (one-time guide graduation), `src/ui/dialogs.js` (public reset wording).
- Worksheet and feedback: `src/game/worksheet-bridge.js`, `src/ui/reward-feedback.js`, `worksheet/src/parent-bridge.js`, `worksheet/worksheet-engine.html`, new last-loaded `worksheet/styles/responsive-workspace.css`.
- Tests: `tests/ux.test.mjs`, `tests/smoke.test.mjs`, `tests/browser-ux.mjs`.

## Verification status

- **24 automated tests passed**, zero failed/skipped. Includes existing smoke/session/math/reward tests, direct level-up, exact sequential fusion fees/donor investment, ingredient fusion, guide graduation/opt-in/old-save compatibility and sampled coin/Luck animation paths clear of protected math at wide/narrow widths.
- **Existing isolated Edge worksheet runner passed:** 79×18 = 1422 at 1280×800; 19×9 = 171 with 390px touch emulation; flexible carry orders, click/drag, expression reveal, Undo, swipe-to-add from a math cell, guide/sound settings, dialog preservation, duplicate messages, exactly one payout, real food upgrade and save-key round-trip. No browser runtime exceptions in the successful run.
- **Dedicated visual suite has not run for this revision.** Automatic approval review timed out twice before launching `tests/browser-ux.mjs`. That runner now includes 2000×1200 fit/no-scroll and enlarged-cell assertions, smaller viewport renders, direct card upgrades, both fusion routes and screenshots. These checks and visual inspection of their renders are pending, not passed.
- Consequently, exact 2000×1200 fit, current screenshot aesthetics, the focused fusion popup's rendered layout and actual browser animation clearance still require the dedicated suite/manual review. Unit geometry checks and the completed math regression do not substitute for those visual checks.
- Physical-device touch, audible sound quality and child usability sessions remain manual validation. Full page-reload math resume and retained mastery design remain outside this change.

Run:

```text
node --test tests/smoke.test.mjs tests/worksheet-session.test.mjs tests/worksheet-rewards.test.mjs tests/ux.test.mjs
node tests/browser-worksheet.mjs
node tests/browser-ux.mjs
```

No commit or push. Implementation is saved; final target-resolution visual verification is pending browser-launch approval.


## Accepted navigation and worksheet alignment follow-up (2026-10-31)

Layout/navigation only: the main render no longer mounts the feature sidebar. Its rendering function and all deferred feature implementations remain available in source; Modes and Decor sidebar entries are not displayed. Kitchen now sits directly below Upgrade Bakery in a shared action column in the top bakery panel. Existing unlocks remain: Kitchen after two orders, Helper after six, with their relocated controls visible but disabled beforehand.

The toolbar immediately above the menu grid has Guide then Helper on the left, and Equip Best, Food Inventory, Food Index on the right. Each uses its existing handler. Guide and Modes behavior, progression, save data and worksheet protocol were not changed. The browsing grid removes the unused sidebar column; at widths up to 1000px the order rail follows the menu so the toolbar retains a usable single row. The mounted live worksheet wrapper now centers its panel/iframe horizontally, including after Exit/Resume.

Files: src/main.js, src/ui/menu.js, src/ui/scene.js, styles/progression.css. Verification: all five smoke checks plus worksheet-session check passed. Local headless Edge verified toolbar order, single-row alignment, no clipping/overlap, no sidebar, and Kitchen placement at 390, 560, 768, 834, 1024, 1194, 1280 and 2000px. The worksheet panel and iframe were both centered without horizontal overflow at 390, 768, 834, 1024, 1280 and 1920px. Tablet-menu and desktop-worksheet screenshots were visually inspected. The existing headless Edge interaction runner also passed: 79 x 18 carrying with click/drag/swipe, 19 x 9 phone touch, tutorial and sound OFF/ON, live Exit/Resume, saved claims, and exactly-once payouts. No manual Live Server check was performed.
