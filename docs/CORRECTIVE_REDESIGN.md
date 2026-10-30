# Corrective redesign — A/B review checkpoint

**Later visual revision:** the owner requested a warmer direction before approving Stage C. See [COZY_VISUAL_REVIEW.md](COZY_VISUAL_REVIEW.md) for the current implementation, real renders, inventory batches and deferred 3-minute/five-ticket refresh requirement. This document retains the earlier A/B history.

2026-10-30. Implements the user's latest **“My Panaderya — Corrective UI/UX Redesign + Progression Overhaul”** brief. This continues the existing work; it is not a new codebase audit. Earlier uncommitted progress preservation, action deduplication, illustrations, and direct upgrades were retained.

**Status: A implemented and tested; B implemented and rendered for owner review. Stop here before C/D. The graphic direction has not yet been approved by the owner. No commit or push.**

## A — reliability and immediate UX

### Completion investigation and recovery

- Completion already used in-page HTML, not `window.open`. No evidence supports blaming Safari popup blocking.
- Reproduced a concrete former failure: with `Array.prototype.findLastIndex` unavailable, final column addition threw and left `busy=true`, before `finish()` and its completion report. The original animation path also assumed that `Element.animate` and `Animation.finished` worked; an exception or unresolved animation could prevent a valid placement/addition from committing.
- Replaced the reverse-index API with a simple backwards scan. Motion helpers tolerate unavailable/throwing animation APIs and missing/rejected/paused completion promises. Addition commits its calculated result after feedback ends or fails, using the existing run cancellation token and the **real arithmetic validation in `finish()`**. It does not turn incorrect arithmetic into completion.
- A completed worksheet now retries `complete` until its attempt receives `completion-ack` (500 ms minimum between reports, on the existing 180 ms poll). A verified completed `state` is another delivery path. Parent still requires the current frame, matching attempt/ticket/operands, all required action/combo identities, and the final deduplication key. Both bridge files must be deployed together.
- The in-page completed-order view keeps the prize and Collect button together. Its saved `claim` phase survives reload before collection; repeating Collect pays once. The former Exit position becomes Collect for completed orders, so it does not abandon a completed prize. Reward animation remains presentation only.
- **Attribution limit:** these are demonstrated failure paths, not proof of the particular playtester's iPad cause. Its OS version/logs were not supplied. No Safari/WebKit runner or physical iPad was available in this workspace. Edge touch/device emulation is not WebKit verification.

### Menu and collection

- Equipped foods display in descending rarity, then descending **current actual food value**, then stable UID order. Sorting does not mutate the saved menu assignments.
- Add Food and Buy Slot controls are a compact strip before occupied cards. Purchased empty slots and unpurchased capacity remain distinct; slot prices/rules are unchanged.
- Food Inventory and Food Index sit directly above Menu. Inventory renders every owned copy with On menu/In inventory status, direct Level Up/Fuse and Add/Remove/Sell controls. Inline inventory level-up refreshes the same inventory panel.
- Remove and Sell are in a separate footer below the upgrade controls. Removal confirms that the contribution stops but the food/upgrades remain. Sale shows the whole-copy loss and actual refund; discovery stays in Food Index after selling.
- Player-facing Chest wording is now **Package**, including help, pending rewards, guarantees and abandonment confirmation. Internal `chests` fields, function/DOM names, protocol `kind:'chest'`, and **`panaderyaQuestV2`** remain compatible.
- New ticket IDs animate onto the wooden board once; tickets generated while the board is hidden wait until it is visible. Reduced motion removes the entrance. Presentation never consumes reward RNG.

## B — corrective visual direction

- Deep bakery greens, gold wallet/prize, warm wooden order board, cream paper, and stronger rarity fills replace the pale treatment. Foods retain the existing local Filipino bread SVG art; new baking-tray SVG replaces the slanted text symbol.
- Collectible food frames, larger art, contrasted value/rarity labels, tactile upgrade buttons, and separated management footers. Tier 0–3 frame treatments represent the **existing** economy; they do not imply the future Tier 1–5 migration is implemented.
- Compact receipt header and secondary utility controls reserve height for actual digits, targets and floating product controls. Parent sends presentation-only dimensions; the child updates CSS without resetting state/history. Capsule radius scales with the same digit-cell dimension, retaining the existing rounded shape and shared held/final geometry.
- Prize bar stays attached below the math. Purple **Package Luck** says “This order”; blue/gold starred **Ticket Luck** is labelled permanent. Separate coin/Luck chips keep their existing protected side routes and land at their respective indicators. Broken reward animations cannot prevent their timed display updates or change accounting.
- Real browser inspection caught and corrected clipped management footers, excessive empty-slot size, a wrapping Buy Slot price, and landscape overflow. Passing structural tests alone was not used as visual approval.

### Render evidence

All images below are real isolated Edge localhost renders, not mockups. The progressed-menu fixtures use existing foods, tiers, prices and rarity rules; demonstration coins/tickets are confined to the isolated browser profile.

| Viewport | Main page | Worksheet with revealed product | Actual digit cell / prize bottom |
|---|---|---|---|
| 2000 × 1200 | [Menu](previews/corrective-redesign/main-progress-2000.png) | [Worksheet](previews/corrective-redesign/worksheet-product-2000.png) | 135 px / 1162 px |
| 1194 × 834 | [Menu](previews/corrective-redesign/main-progress-1194.png) | [Worksheet](previews/corrective-redesign/worksheet-product-1194.png) | 70 px / 799 px |
| 1024 × 768 | [Menu](previews/corrective-redesign/main-progress-1024.png) | [Worksheet](previews/corrective-redesign/worksheet-product-1024.png) | 61 px / 742 px |
| 768 × 1024 | [Menu](previews/corrective-redesign/main-progress-768.png) | [Worksheet](previews/corrective-redesign/worksheet-product-768.png) | 106 px / 990 px |

Also: [first-launch menu](previews/corrective-redesign/main-2000.png), [Inventory](previews/corrective-redesign/inventory.png), [sale consequences](previews/corrective-redesign/sale.png), [existing fusion preview](previews/corrective-redesign/fusion-quantity.png), [durable completed-order view](previews/corrective-redesign/completed-order-1194.png).

The tested three-food landscape menus fit without vertical scrolling at 2000/1194/1024 widths. The portrait menu's extra food row scrolls normally; it is not hidden. Larger menus and inventory necessarily scroll. The worksheet/prize fit the tested tablet viewports and the 390 × 844 touch viewport, without horizontal page overflow. Portrait browser chrome, real device safe areas and software zoom still need physical-device review.

## Verification

**34 automated tests passed:**

```sh
node --test tests/smoke.test.mjs tests/worksheet-session.test.mjs tests/worksheet-rewards.test.mjs tests/ux.test.mjs tests/completion-reliability.test.mjs
```

Includes legacy/save-key compatibility, stable domain actions through undo/replay, legitimate carry rewards, stale/foreign messages, final payout/claim once, dropped-completion fallback and acknowledgement, reload of pending claims, missing animation APIs, real final arithmetic validation, sorting/slots, inventory/removal/sale/discovery, ticket arrivals, and non-obstructing separate reward paths. Existing regression tests remain.

**Both browser runners passed** using isolated Edge profiles and a static localhost server:

- `node tests/browser-worksheet.mjs`: live iframe/state/history/settings survive dialogs; 79 × 18 = 1422 using click/drag, carry after placement, undo/reveal dedup and downward swipe; deterministic first-order payout **365 coins and one guaranteed package**, claimed once; reload before Collect restores the in-page claim; subsequent food upgrade persists under the existing key.
- Same runner: 19 × 9 = 171 at 390 px using emulated touch, outgoing/incoming carry before placement, tutorial and sound flags enabled.
- Same runner: 79 × 18 on a 1024 × 768 emulated touch tablet, with `findLastIndex` removed, animation APIs throwing, and the first completed-state and complete-event deliveries intentionally suppressed. Retry completes the order and repeated Collect pays once. Correct math is still performed through touch/drag/swipe.
- `node tests/browser-ux.mjs`: first launch, all existing dialog families/focus, inline level costs, duplicate and ingredient fusion fees, five base viewports plus 1194 × 834, larger math, visible prize, no clipped card footers, tutorial OFF, reduced-motion reward arrival, and no unexpected runtime exceptions. Browser artifacts include normal and revealed-product worksheet states.

The test harness initially exposed page-load timing and instantaneous synthetic-tap issues. Reload waits now require app initialization; touch taps have realistic press/release delays. Deterministic package RNG is reapplied after test reload. These were test corrections, not changes to the learner's pointer handlers.

Audible SFX quality, actual Safari/WebKit, and child usability testing are **unverified**. Existing guide/SFX settings and sound-trigger code were preserved and exercised; headless checks cannot establish how audio sounds.

## Scope and unchanged formulas

Current food value remains `base × (1 + 0.20 × (level − 1)) × [1, 1.6, 2.5, 4][fusion]`, Level 1–3 and legacy fusion 0–3. Bakery value remains strongest equipped copy per food, summed, multiplied by existing kitchen/decor bonuses. Package chance remains `clamp(0.12 + luck × 0.013 + row × 0.03, 0.06, 0.83)` with the existing last-combo guarantee and drop Luck consumption. Payout and mode formulas were preserved.

Full recovery of an **unfinished mathematical worksheet after a page reload** remains unsupported: the math restarts, while the durable reward ledger retains pending earnings and prevents duplicate action rewards. Dialogs and presentation resizing preserve the live worksheet. Completed saved claims recover correctly. This is the existing boundary, not a newly introduced reset.

### Files changed for A/B

- `src/ui/menu.js`, `dialogs.js`, `scene.js`, `bakery-art.js`: navigation, cards/actions, ordering, terminology, board arrival, tray art.
- `src/ui/reward-feedback.js`: Package labels and failure-tolerant visual animation calls; existing separated flight routes retained.
- `src/game/worksheet-bridge.js`, `worksheet/src/parent-bridge.js`: completion retry/ack/fallback, saved in-page claim presentation, measured visual dimensions.
- `worksheet/src/product-placement.js`, `partial-product-addition.js`: tolerate animation API failures and unsupported reverse lookup while retaining validation/timing on supported browsers.
- `worksheet/src/tap-and-drag.js`: capsule **drawing radius only**; gesture and mathematical action rules unchanged.
- `styles/feedback-layout.css`, `worksheet/styles/responsive-workspace.css`: corrective presentation and responsive sizing.
- `src/data/catalog.js`, `src/game/rewards.js`, `src/game/economy.js`: visible Package/prize-pool wording only in this continuation; no new economy transaction or balance changes.
- `tests/ux.test.mjs`, `worksheet-rewards.test.mjs`, new `completion-reliability.test.mjs`, both browser runners; this document and linked documentation.

## Deferred until the visual checkpoint is approved

The following are requested future work, **not implemented or simulated yet**:

1. **C:** Level/Tier 5; additive-tier fusion with the specified overflow examples; Tier 5 input exclusion; preservation of actual multiplier value and level investment/credits; exact previews and fees; safe legacy-Tier-0/inventory migration and exploit checks.
2. **C:** percentage-based economy rebalance, active/passive and early/mid/late simulations; exactly Common, Uncommon, Rare, Epic, Legendary, Mythic, Divine; monotone smooth Ticket Luck distribution and probability simulations.
3. **D:** bakery Level 30 and visible milestones **2, 3, 5, 7, 10, 13, 17, 21, 25, 30**, preserving decor investment; expanded Kitchen; further environmental/audio polish. Simple ticket arrivals were delivered in A because also requested under immediate UX.

No multi-worker/helper panel, commit, push, price migration, or new progression rules were introduced. The next conversation must obtain/recover the owner's visual review before implementing C/D.
