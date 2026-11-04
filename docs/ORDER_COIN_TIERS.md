# Coin-only Order Tickets — 2026-11-04

**Packages update (2026-11-05):** [Current workspace](PACKAGES_INTERFACE.md) replaces separate opening dialogs and Open Selected with immediate in-place collection. Open All now consumes only the selected package type; old guaranteed-food queues remain supported.

Implemented owner direction. This supersedes earlier ticket-package rewards, temporary Package Luck, ticket/package odds labels, and challenge coin modifiers. The worksheet's input, carry, undo, tutorial, sound, retry/lives and independent-session behavior is retained.

## Current reward contract

Order Tickets and their worksheet actions award coins only. The Package Counter's purchasing and unboxing system supplies new packages and foods. Food rarity odds, duplicates unlocking paid Recipe Mastery capacity, collection, menu slots, Menu Boost and Bakery Power retain their existing rules.

| Stars | Coin tier | Base coins |
| --- | --- | ---: |
| 1 | Coin Stack | 130 |
| 2 | Coin Jar | 260 |
| 3 | Coin Bag | 520 |
| 4 | Coin Bucket | 1,040 |
| 5 | Coin Cart | 2,080 |
| 6 | Treasure Chest | 4,160 |
| 7 | Golden Vault | 8,320 |
| 8 | Divine Treasury | 16,640 |

New orders use `round(baseCoins × bakersBoost)`. Starting an order snapshots both factors. Necessary math actions accumulate part of that fixed coin budget; finishing releases the remainder. Actions, errors, repeated messages, retries and switching cannot add packages or reroll a tier. New orders use the same two-factor payout in every mode; former challenge payout bonuses/penalties and misleading descriptions are removed to honor this contract. Challenge input/lives/retries and Mastery credit are preserved.

The saved claim and finished-order popup show the earned coin tier, Base coins, saved Baker's Boost and Total coins earned. Boost has up to 12 significant digits here to avoid misleading arithmetic from the compact HUD's two-decimal formatting; final coins round to whole coins.

## Generation and luck

The existing eight-rank binomial distribution and multiplication dimensions are retained. Its input is `max(mastery, 4 × permanentLuck)`, preserving ordinary existing progression and honoring retained Permanent Luck. The board and information popup display these same exact probabilities as **Coin Reward Tier Odds**. Neither influences a purchased package's food-rarity distribution.

Creation saves `coinTier`, `orderLabel`, `orderIcon`, operands, ID and base. The retained `rarity` field is a compatibility/difficulty alias, not a package promise. Rendering consumes no reward RNG. Resuming/reloading retains these fields; Refresh replaces only untouched orders and preserves every started worksheet and reward snapshot. The five-ticket limit and refresh cooldown are unchanged.

## Wireframe structure

Each full-card button has a 30/70 reward/content grid:

- Left: distinct local SVG container illustration, faint radial rays, star row, bottom tier strip.
- Right: customer/location icon and short label; separate bordered multiplication box; separate `PROGRESS`/percentage strip.

All eight tickets have distinct whole-card tints, borders, ink and stars. Upper tiers gain stronger/double framing, static highlights and soft glow. No decorative animation is needed to identify a tier. At narrow rail widths the reward panel has a 70px minimum so long tier names wrap without clipping; equation icons/gaps compact deliberately while numbers remain at least 16px. The rail scrolls independently. Existing Menu, sidebar and food-selection layout rules are retained.

## Save compatibility and transactions

The key remains `panaderyaQuestV2`. `migrateCoinRewards()` runs from the established migration entry point:

- Existing ticket ranks, saved bases, problems, IDs, pending coins, fixed budgets and worksheet ledgers survive without randomized migration. Existing ticket bases are grandfathered; new tickets use the exponential table.
- Already-earned legacy chests move once into the Package Counter. Pre-Frame-11 guaranteed food ranks are queued in `legacyPackageFoods[packageRank]` and honored by that package type's next openings before ordinary package rolls. Opening Selected and Open All share this path.
- Each migrated run is marked `coinRewardsVersion:1`; retired `chests`, `luck`, `guaranteedPackages` and ticket package-count fields are removed. No unearned guaranteed package is granted on completion.
- Older runs lack their original Boost snapshot. Their saved budget (or already completed pool) is represented by the original base and reconstructed saved factor, labelled `(saved)`. This can include former challenge effects; it is never recomputed from today's menu. New runs store the actual Boost snapshot directly.
- Claiming persists coins, receipt, completion/Mastery progress and removal of only that order together. A failed write restores the original state. Repeated, reloaded and stale-tab claims are refused. A stale autosave cannot erase a newer persisted receipt. Claimed legacy run/board remnants are discarded on load.

No package opening, food discovery or reward RNG occurs during a coin claim. Package opening remains its own persisted transaction with rollback.

## Balance evidence

`tests/simulate-progression.mjs` now models purchased packages only (model 4), using production formulas and fixed seed 20261104: 60 trials × 80 orders × three progression snapshots × three spending policies. Accepted output: [progression-simulation.json](progression-simulation.json).

The doubled tier rewards use the original 130-coin low-tier anchor. Existing proportional cost formulas remain unchanged: Standard Packages cost approximately 0.6 expected orders, first Bakery Power approximately 2.5, and the next slot approximately 2.0 early orders. Active solving remains 3× helper income at a 120-second pace. No additional price tuning is necessary to keep progression accessible.

Removing free food draws intentionally slows collection: early mixed-policy median discoveries after 80 orders change from 17 to 8 and power growth from about 296× to 42×. The collector policy reaches a median 10 discoveries. A policy that never buys packages retains its starting recipe while still progressing through Bakery Power; collection now requires the requested package system. These are model predictions, not child playtest results.

## Verification

- `node --test tests/*.test.mjs`: 97 passing, including ledger replay protection, all eight payout tiers, frozen rewards, migration idempotency, legacy guaranteed foods, purchase/opening rollback, stale receipts, switching and refresh.
- `python tests/browser-order-coins.py`: real WebKit/Edge, all eight static treatments at 2000×1200, 1194×834, 1024×768, 834×1194, 390×844 and 597×417; no clipped content, tier persistence, switching, saved claim, coins only, exact payout and one claim.
- `python tests/browser-frame11.py`: full WebKit/Edge workflow including package buying/opening, 79×18 carrying by taps and drags, guide/sound toggles, undo, swipe/add rows, lost-completion recovery, reload and claiming once.
- `python tests/browser-responsive.py`: WebKit/Edge responsive layouts and actual Edge browser zoom at 80%, 100%, 125%, 150% and 200%.

[2000x1200](previews/order-coins/2000.png), [1194x834](previews/order-coins/1194.png), [1024x768](previews/order-coins/1024.png), [highest tier](previews/order-coins/tier-8.png), and [completed reward](previews/order-coins/completed.png) capture the final UI. Additional focused screenshots are generated under ignored `.test-tools/order-coins-shots/`. The attached wireframe determines ticket structure; repository bakery colors/type/art determine styling. No push or deployment.
