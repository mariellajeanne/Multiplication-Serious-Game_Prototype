# Stage C/D implementation — 2026-10-31

The owner explicitly authorized C/D after the component-theme review. This supersedes earlier “stop before Stage C” checkpoints. The paper, wood, pastry-box, local illustrations and rounded-font design remains. No scenic image, new game mode, multi-worker panel, worksheet interaction rewrite, commit or push is part of this work.

## Current systems and files

- `src/game/progression.js`: shared deterministic rules, eight-rank probabilities, tier/level values, fusion planning, Equip Best ordering, legacy migration, pricing baseline and milestone definitions. Loads after catalog and before state.
- `src/game/progression-economy.js`: prices and guarded transactions for Level/Tier upgrades, fusion, ingredient investment, resale, Kitchen/Bakery upgrades and equipment automation. Loads after rewards and before the existing economy controls.
- `src/game/state.js`: versioned fresh saves, backup/migration invocation, board generation, durable refresh cooldown, Auto reconciliation and saving.
- `src/game/economy.js`: retains staff contracts, passive ticks and existing challenge controls; retry board capacity now uses the five-ticket limit.
- `src/game/rewards.js`: eight-rank package sampling and Tier 1 acquisitions. Mathematical action weights, unique-action ledger, completion payout, Package Luck drop chance and last-combo guarantee remain unchanged.
- `src/ui/menu.js`, `dialogs.js`, `scene.js`: integrate new caps, complete fusion reviews, Equip Best, refresh, probabilities, Kitchen depth and actual Bakery progression into the existing screens. Manual inventory multi-select, confirmations and batch sales remain.
- `src/data/catalog.js`: eight rank names; existing 15 food IDs retained, with Butter Mamon and Celebration Ensaymada filling Signature/Masterpiece using existing local food art. `bakery-art.js` supports these art aliases.
- `styles/progression.css`: only feature-specific rank/tier/milestone treatments, dropdown, fusion reviews and five-ticket scrolling. Existing theme remains the base.
- `src/main.js`: reconciles Auto before normal menu rendering; updates the refresh countdown without recreating the worksheet. `worksheet-bridge.js` only maps new Bakery stages onto the existing presentation-only theme command. No child worksheet code changed.

## Multipliers and prices

Food Tier 1–5 canonical base factors: **1, 2, 3.5, 5.5, 8**. Level 1–5 factors: **1, 1.25, 1.55, 1.9, 2.3**.

`tierBase = catalogBase × tierFactor + retainedBase`

`foodValue = tierBase × levelFactor`

Only the strongest equipped copy of a food contributes, as before. Kitchen multiplies all menu foods by `Π (1 + toolBonus)^toolLevel`, retaining tool bonuses 5.5%, 4.2%, 3.3%, 2.8%, with **20 levels per tool**. Bakery multiplies the combined result by `1.085^(bakeryLevel − 1)`, through **Level 30**. Level previews show the percentage of tier-adjusted base; global upgrades show the actual relative gain.

Let `E` be the probability-weighted base payout of a Normal ticket at current mastery, `K` Kitchen factor, `B` Bakery factor, and `P` the highest best-menu food sum reached (one strongest copy per food, up to bought capacity). Current eligible ownership can raise `P`; saving records it. Removing or selling foods never reduces it, closing the cheap-upgrades-by-unequipping exploit.

The Normal pricing unit is `U = E × P × K × B`. Challenge-mode bonuses do not inflate prices.

| Purchase | Coin price, rounded |
| --- | --- |
| Food Level, current level L | `E × foodValue × K × B × (0.75 + 0.45 × L^1.3)` |
| Fusion fee, input tier T (higher input for duplicates) | `E × catalogBase × K × B × (1.5 + 0.65 × T^1.25)` |
| Kitchen, current level L, tool index i | `U × (0.85 + 0.22 × L^1.15) × (1 + 0.1 × i)` |
| Bakery, current level L | `U × (2.5 + 0.2 × (L−1)^1.15)` |
| Menu slot, already bought S | `U × (2 + 0.6 × max(0,S−4)^1.15)` |

Ingredients retain fixed unit prices. Primary quantities for T1→2 / T2→3 / T3→4 / T4→5 are 3 / 7 / 15 / 30, multiplied by `1 + floor(rarity/2)`; secondary ingredient quantity is rounded 70% of that. Missing stock plus the fee is charged at confirmation. Already-owned paid stock is consumed and its full acquisition value transfers into food `spent`, without charging it again.

Future staff shifts use **current actual expected Normal earnings / 360 per second**, rather than the pricing high-water mark. Existing paid staff contracts keep their saved rate and expiry. At a 90-second order pace active gross income is 4× passive gross income; at 120 seconds it is 3×. Hiring fees make net passive income lower still. These are balance assumptions, never a game timer or learner speed requirement; slower real play needs observation.

## Fusion conservation and confirmation

Two copies must have the same food ID; both must be Tiers 1–4. Tier 5 is excluded from either input and from ingredient upgrades.

For input tiers `a,b`, let `s=a+b`:

1. If `s>5`, output `T5 + T(s−5)`.
2. Otherwise, equal inputs above T1 output `T(s−1) + T1`.
3. Otherwise output `Ts`.

This gives all six requested examples, with symmetric, deterministic outcomes for the remaining pairs. Each confirmation consumes exactly the selected two copies; the new donor selector replaces the old sequential “copies per tier” quantity rule, which would violate these recipes.

Pool paid Level steps `Σ(level−1)`. Fill the primary result up to Level 5, then the secondary result. Any excess becomes **same-food Level credits**: one future Level step per credit, no cash conversion and no second paid-investment/refund entry. The preview names the credited food and number of credits.

Check actual numerical values after those transfers. If necessary, add retained base to the primary result so both total output value and the strongest individual value are at least their input equivalents. Retained base survives subsequent fusion and ingredient upgrades.

Pool input `spent` plus the fee and distribute exact integer amounts proportional to output values, placing rounding remainder in the final output. Pool and distribute input **resale bases** separately: an extra result does not mint an extra resale entitlement. Sale remains allocated base plus floor(50% of allocated paid investment). Fusion/sale cycles cannot refund more coins than their inputs and charges justify.

The primary result retains the chosen target UID. Any equipped consumed copy maps to it, duplicates are removed, and overflow results stay owned in inventory without buying a slot or deleting foods. Auto can then select the best eligible results. Previews show every output, tier, Level, base, Level bonus, final value, retained investment, fee, credits and aggregate gain. Confirmation revalidates the complete input fingerprint and live price, then clears pending selection; repeated or stale confirmation is harmless.

## Ticket Luck and package probabilities

Ranks in ascending order: **Classic, Favorite, Special, Premium, Deluxe, Signature, Masterpiece, Crown Jewel**. All have a distinct muted palette and explicit `★1`–`★8` rank label.

Ticket rank is `Binomial(n=7,p)`, with `p=0.04+0.68×(1−exp(−mastery/80))`. This is smooth, normalized, and every upper tail is nondecreasing: couple the seven Bernoulli draws using shared uniforms as p increases. No abrupt rarity unlock/removal gates are used. The existing mastery-award rules and four-stars-per-Ticket-Luck display are retained; the distribution responds to each mastery point.

| Rarity | Mastery 0 | Mastery 40 | Mastery 160 | Mastery 240 |
| --- | ---: | ---: | ---: | ---: |
| Classic | 75.1447% | 7.6327% | 0.0986% | 0.0300% |
| Favorite | 21.9172% | 23.7314% | 1.1654% | 0.4591% |
| Special | 2.7397% | 31.6220% | 5.9017% | 3.0109% |
| Premium | 0.1903% | 23.4091% | 16.6032% | 10.9707% |
| Deluxe | 0.0079% | 10.3975% | 28.0257% | 23.9839% |
| Signature | 0.0002% | 2.7709% | 28.3839% | 31.4599% |
| Masterpiece | <0.0001% | 0.4103% | 15.9704% | 22.9257% |
| Crown Jewel | <0.0001% | 0.0260% | 3.8511% | 7.1600% |

Unrounded probabilities total 100%; displayed rounding can differ slightly. These are exact distribution calculations, not noisy random-sample estimates.

Conditional **package rank** is separately `Binomial(7,0.08+0.84×ticketRank/7)`. It depends only on that accepted ticket's rank. Temporary Package Luck still affects whether a combo drops a package, including the unchanged final-combo guarantee. The odds dialog uses the same calculation functions as actual sampling and includes conditional package odds.

## Equip Best, tickets and milestones

- Equip Best sits beside Food Inventory. Final mode ranks actual individual value; Base mode ranks tier-adjusted base including retained base, ignoring Levels. Ties use ascending UID. One copy per food avoids wasting slots under the existing strongest-copy rule.
- Choosing a mode equips immediately. Enabling Auto persists one mode; enabling another switches it. A one-shot choice switches an already-active Auto to that mode. Auto reevaluates on saved ownership/upgrades/fusion/sale/capacity changes, without reactive render loops. It pauses during an accepted run so its budget and menu remain stable.
- **While Auto is on**, manual Add/Remove are disabled with an explanation. Batch sale still works and triggers reevaluation. Turn Auto off for manual selection. Existing selected-copy batch operations and confirmations remain.
- Five available tickets refill when accepted. Manual refresh replaces only the available board. Deadline is **180,000 ms** after the last successful refresh, persisted together with the board. A stored clock high-water mark prevents backward-clock/reload bypass; stale-tab saves retain the newest cooldown. Countdown updates only button text/disabled state, never rolls tickets or rerenders math. Refresh does not mutate the accepted run, ledger or unclaimed prize. Existing arrival animation and reduced-motion behavior remain.
- Actual Bakery appearance stages change only at **2,3,5,7,10,13,17,21,25,30**. Between these levels the stage name, emblem seal, material palette and frame treatment stay the same; only numerical level/progress/bonus changes. No extra bitmap asset variants are needed. The existing Bakery panel stays above Menu; its cost/benefit and dialog use actual purchased levels.

## Save migration

Main key remains **`panaderyaQuestV2`**. `progressionVersion:3` makes migration idempotent. The original raw JSON is backed up once as **`panaderyaQuestV2BeforeProgression`** before the first migration. Erase Progress clears both. Existing unrelated fields, preferences, coins, discoveries, staff contract, equipment levels, active ticket operands/budget/pool, ledger/attempt identity and claim state are retained.

The actual repository had **six** ranks despite the brief referring to seven. Actual six-rank indices map `0,1,2,3,4,5 → 0,1,2,3,4,7`, keeping old Divine at the top. Identifiable seven-rank saves (explicit count/names, or saved rank 6) map `0,1,2,3,4,5,6 → 0,1,2,3,4,6,7`. An unmarked seven-rank save with no rank-6 evidence is indistinguishable from a six-rank save; the actual repository format is the fallback. No owned food IDs are renamed or removed.

Legacy fusion 0–3 becomes Tier 1–4. Existing Levels and `spent` remain, with new factors at least as generous as their old factors. Old Decor 0–4 is retained as historical investment; Bakery level becomes the lowest level with a percentage bonus at least as large as the old one. Old Decor 4 therefore maps to Bakery 7, preserving at least its former ×1.55 bonus. Recorded legacy renovation cost is 550+2,200+8,800+35,000 = **46,550 coins**. It is not multiplied a second time or charged again. No separately purchased decoration inventory exists in this prototype; any unrelated saved fields are preserved. Historical ingredient investment omitted by the old implementation cannot be reconstructed without purchase records; existing `spent` is never reduced.

## Simulations and verification

Reproduce balance data with `node tests/simulate-progression.mjs docs/progression-simulation.json`. Scenarios preset early / middle / late portfolios, Kitchen levels 0 / 7 / 17, Bakery levels 1 / 10 / 25, and mastery 0 / 40 / 160. These compare earnings and sequential purchases within each scenario; they do not predict a complete child's collection journey.

| Scenario | Expected initial Normal payout | Oven price in typical orders | Bakery price in typical orders | Sequential sample purchases |
| --- | ---: | ---: | ---: | --- |
| Early | 213 | 0.85 | 2.50 | Food Level, Oven, Bakery by order 5 |
| Middle | 494,601 | 2.91 | 5.00 | Weak food Level, Oven, Bakery by order 9 |
| Late | 202,359,846 | 6.57 | 10.23 | Oven, Bakery by order 17 |

Early food Level gains 25% overall; leveling the weakest middle-game food gains 0.928% overall and costs 0.108 typical orders. Global Oven/Bakery upgrades retain 5.5%/8.5% relative gains in every scenario. The full Bakery track totals approximately **197.36 contemporaneous Normal-order equivalents**, before other paths, luck and challenge bonuses. Absolute coin numbers become large, but finite caps bound progression; larger wallet/Menu/ticket totals use compact labels with exact values available in labels/tooltips or detailed views. This balance still needs learner playtesting.

Automated: **52 tests passed**, including 400 tier/Level input combinations, specified recipes, cap/overflow, actual-value/investment/resale conservation, credits, ingredient stock, stale confirmations, legacy migrations, probability normalization/upper-tail monotonicity, Auto/capacity, cooldown/reload/rollback/stale tab, pricing exploit prevention, actual Bakery/Kitchen caps, and all existing worksheet/reward/completion regressions.

Browser: isolated headless Edge via the repository's native CDP runners. Target **2000×1200**, tablets **1194×834, 1024×768, 768×1024**, and existing **390×844** responsive checks. Verified actual dropdown/checkbox/confirmation clicks; Auto reload; all six fusion recipes; ingredient route; refresh persistence/rollback; eight rarity/five tier treatments; real Level 30/Kitchen 20 purchase controls; reduced motion; batch inventory, dialogs, and full existing reward-popup checks. Screenshots: `docs/previews/progression/`.

Worksheet browser: `79×18=1422` click/drag, flexible carry placement, undo/reveal dedup, tutorial/SFX toggles and downward swipe; full fixture pays **365 coins and one package exactly once**. Claim survives reload. Also tested `19×9=171` at 390px with emulated touch, and tablet `79×18` with missing `findLastIndex`, throwing animation APIs, dropped completion messages and eventual exact-once claim. The expanded checks also refresh during an active iframe and before collecting a completed ticket.

Limits: desktop Edge tablet/touch emulation is **not actual iPad/Safari verification** or an acoustic listening test. The client-only game cannot secure time against deliberate forward-clock/localStorage tampering; arbitrary simultaneous multi-window transactions are not server-coordinated. Full mathematical worksheet state still does not resume after a page reload, although dialogs preserve it and saved reward ledgers prevent farming. Educational mastery remains the existing prototype measure, not a validated retention assessment.
