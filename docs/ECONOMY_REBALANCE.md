# Accelerating economy — implemented 2026-11-05

This is the current balance specification. It supersedes earlier prices, 100-purchase Bakery Power cap, package unlock thresholds, and doubling coin-tier rewards. It changes no layout or multiplication interactions.

## Result

The selected model gives a growing number of meaningful purchases per order. The comparison below uses 24 deterministic seeds, the balanced spending policy and ordinary coin-tier draws. A meaningful upgrade increases equipped Baker's Boost by at least 0.1%; package openings and empty slots do not count as upgrades.

| Stage (completed orders) | Before: average purchases/order | After: average purchases/order | Before → after: median upgrades affordable from one order alone | Before → after: chance one payout covers two Bakery upgrades |
| --- | ---: | ---: | ---: | ---: |
| Early, 1–25 | 0.46 | 3.48 | 0 → 2 | 0.3% → 58.8% |
| Middle, 26–100 | 0.42 | 4.84 | 0 → 5 | 0.1% → 100% |
| Late, 101–200 | 0.33 | 7.52 | 0 → 9 | 0% → 100% |

The two measures answer different questions. Actual purchases include saved coins and discoveries from opening packages, while reserving 30% of income for packages. The affordability probe starts with only that order's payout, excludes the existing wallet and package reserve, and recalculates every successive upgrade price. It uses the state just before completion, so it conservatively excludes the extra efficiency from that completion and food discoveries made afterward. A zero median in the old model means saving across orders was usually necessary.

Double-Bakery affordability is based on the **sum of the first and second sequential prices**, including the first upgrade's price increase; it never spends an old wallet. Actual double-Bakery purchase rates are 31.8%, 97.9%, and 100% in the three stages. The model deliberately favors frequent consecutive upgrades over scarcity after the opening stage.

## Diagnosis and candidates

Previously the shared price unit was expected coin-tier payout × strongest potential Menu × Bakery Power. Better Luck immediately raised prices, and stronger Menu/Power repriced almost all gains away. Bakery's surcharge then rose as purchases^1.15, Mastery prices multiplied an already improved recipe by another steep curve, and slots cost several complete expected orders. Owning a stronger unequipped food could also tax the whole economy. Increasing coin payouts alone would therefore have raised prices again.

The historical baseline is preserved as executable function bodies in `tests/fixtures/economy-before.json`, with its source revision. The same production-context simulator compares it with six alternatives. Exploratory runs use three seeds per tested strategy/luck cohort; the baseline and final choice receive 24 seeds across every cohort.

| Model | Actual upgrades/order: 1–25 / 26–50 / 51–100 / 101–200 | Decision |
| --- | --- | --- |
| Original | 0.45 / 0.43 / 0.42 / 0.27 | Upgrade frequency declines; bad luck causes long droughts. |
| All old prices ×0.22 | 1.81 / 0.99 / 0.83 / 0.77 | One-time discount fades; compounding still reprices progress away. |
| Loose compounding | 52.07 / 76.83 / 0 / 0 | Runaway spending exhausts its 2,000-purchase cap by order 50. |
| Paced compounding | 3.61 / 4.07 / 5.68 / 10.17 | Too aggressive in later favorable draws; changes existing Power bonuses. |
| Gentle compounding | 3.19 / 3.45 / 3.59 / 4.34 | Late acceleration and poor-luck recovery are too weak. |
| Accelerating craft | 3.69 / 4.27 / 5.29 / 7.48 | Good frequency, but highest packages become impractical while upgrading; consecutive Bakery upgrades arrive too early. |
| **Bakery milestones, selected** | **3.48 / 4.29 / 5.12 / 7.52** | Keeps existing Power, strengthens early choices, and makes package milestones reachable during growth. |

The last row uses the larger final sample, not the three-seed pilot. Parameters for all models are in `tests/economy-candidates.json`; exploratory measurements are in [economy-candidate-comparison.json](economy-candidate-comparison.json). The full 24-seed baseline/final measurements and audit traces are in [progression-simulation.json](progression-simulation.json).

## Implemented formulas

`src/game/economy-balance.js` contains the shared parameters and pure formulas consumed by both production transactions and the simulator. Let:

- `n = bakeryLevel − 1`, capped at 5,000 purchases.
- `P = 1.085^n`: the existing 8.5% Bakery Power gain is preserved, including old saves.
- `M`: strongest **actually equipped** Menu Boost recorded in the save, minimum 1. Prices cannot be lowered by unequipping or selling. An unequipped discovery alone does not raise them.
- `c`: claimed completed orders. Practice efficiency is `D = (1 + c/75)^0.7`.
- `U(x) = 130 × max(1,x)^0.9 × P / D`.

Prices are rounded to whole coins, minimum 1. Earnings use the full equipped Menu and Power; prices use sublinear Menu growth and increasing practice efficiency. Price quotes no longer contain expected coin-tier rewards, so Permanent Luck raises income without raising prices.

| System | Current rule |
| --- | --- |
| Ticket base | `round(130 × 1.35^coinTier)`, tier 0–7 |
| Total ticket payout | `round(saved base × saved Baker's Boost)` |
| Baker's Boost | `max(1, equipped Menu Boost) × P` |
| Bakery upgrade | `round(U(M) × (0.85 + 0.016√n))` |
| Paid Recipe Mastery | `round(U(recipe tier base) × (0.16 + 0.03 × (mastery+1)^0.7))` |
| Menu slot | `round(U(M) × (0.4 + 0.08 × (slots−1)^1.3))` |
| Tier fusion fee | `round(U(recipe catalog base) × (2 + 1.2 × tier^1.25))`, plus existing missing-ingredient costs |
| Package rank r | `max(round(130 × M^0.9 × P^0.97 / D × 0.16 × 2.35^r), ceil(1.2 × expected base resale))` |
| Helper gross rate | `130 × current Baker's Boost / 360` coins/second, frozen at hire |

For a fresh save, independent quotes are Bakery 130, first extra slot 61, first Pandesal Mastery 29 **when a duplicate has unlocked it**, and Standard package 118. A Coin Stack order pays 156 at the starting ×1.2 Boost. Starting coins stay 250. These are separate quotes, not a claim that every action is initially eligible or can all be bought at once.

Mastery bonuses, duplicate-unlocked capacity, recipe ownership, Tier 5 conservation, ingredient quantities/unit prices, food resale values and the 17-recipe slot cap are unchanged. Paid Mastery remains unbounded when duplicates provide capacity. Charging Mastery against recipe base rather than already purchased Mastery prevents its own rewards from multiplying its price twice. Tier upgrades retain their unlock at five completed orders and larger milestone cost. Slot prices retain a growing surcharge rather than becoming free inventory expansion.

Bakery Power now has 5,000 purchases. With the 8.5% gain unchanged, this gives substantially more runway than the old 100 without altering already bought bonuses. It is a finite safety ceiling, not an endless prestige system.

The unchanged two-minute helper contract and fee use the floor-tier earning rate. Active solving at one order per 120 seconds earns at least 3× helper gross income, even without good Luck. Existing running helpers retain their saved rate. Simulation income excludes helpers.

### Coin Luck and package acquisition

| Coin reward tier | New base | Old base |
| --- | ---: | ---: |
| Coin Stack | 130 | 130 |
| Coin Jar | 176 | 260 |
| Coin Bag | 237 | 520 |
| Coin Bucket | 320 | 1,040 |
| Coin Cart | 432 | 2,080 |
| Treasure Chest | 583 | 4,160 |
| Golden Vault | 787 | 8,320 |
| Divine Treasury | 1,062 | 16,640 |

Rewards remain exponentially increasing across eight tiers. The narrower spread makes unfavorable Luck less punitive; acceleration comes mainly from purchases and efficiency, rather than needing a lucky high-tier ticket. The Coin Stack floor is unchanged. The existing Luck distribution is retained: binomial over seven draws with `p = 0.04 + 0.68 × (1 − exp(−luckMastery/80))`; effective mastery is the larger of practice mastery and four times Permanent Luck. Normal orders grant one practice mastery, existing challenge modes two. Normal expected bases at 0/25/50/100/200 practice mastery are approximately 143/220/296/424/562. No Luck price tax remains.

Package types still have their eight separate food-drop distributions: binomial `p = 0.08 + 0.84 × rank/7`, uniform choice among recipes within the drawn food rarity. Coin Luck does not change package odds. Opening still credits unique food ownership or duplicate/Mastery capacity immediately and exactly once.

New-save package gates are Bakery levels **1, 12, 30, 60, 110, 190, 300, 450**. Higher packages are milestones. Their prices grow as `Power^0.97` rather than full Power, so an unlocked expensive package becomes easier to buy while the player continues upgrading. The selected balanced policy's median first unlocks occur at orders **0, 20, 28, 40, 54, 73, 96, 121**; median first purchases/openings at **3, 21, 30, 42, 58, 80, 108, 149**. All 24 normal balanced runs open the highest type within 200 orders. Previously the median player had only reached Bakery level 13 by order 200.

The resale floor uses the actual rounded base resale of each possible food. Every package costs at least 120% of that expected resale, including when practice efficiency would otherwise make it cheaper. This preserves occasional lucky valuable foods while preventing a positive-expectation buy/open/sell coin loop. Existing invested resale refunds remain unchanged.

## Validation and practical limits

The final experiment covers **576 complete 200-order runs**: two models × three spending strategies × four Luck bands × 24 seeds, totaling 115,200 completed orders. All four requested checkpoints are retained separately; the three-stage summary combines orders 26–100.

Strategies reserve 30% / 18% / 45% of new income for packages (balanced / Bakery-focused / collector). Packages are actually purchased/opened; duplicate capacity is not fabricated. The remaining coins fund repeated available upgrades ranked by gain/cost, with strategy preferences. Each quote is recalculated after every purchase, including during affordability probes. The five-ticket FIFO board is generated through the actual saved-ticket generator, retaining each tier and base; the model never refreshes for better Luck. It uses separate seeded streams for ticket tiers, package drops and equation generation.

Luck bands use ordinary draws, lower 40% quantiles, upper 40% quantiles, and an adversarial **Coin Stack only** case. These last three are stress conditions, not claims about population odds.

| Balanced strategy, orders 101–200 | Average actual upgrades/order | Median one-payout affordable upgrades |
| --- | ---: | ---: |
| Unfavorable draws | 5.41 | 7 |
| Ordinary draws | 7.52 | 9 |
| Favorable draws | 10.41 | 11 |
| Every ticket forced to Coin Stack | 2.62 | 3 |

Across all three strategies, ordinary late-stage actual purchase rates range from **6.77–7.70/order**; unfavorable draws **4.76–5.72**, favorable **9.19–10.41**, and forced Coin Stack **2.26–2.79**. Even this extreme floor supports ongoing progress. Its slower frequency is an intentional stress limit, not the expected late-game pace.

Every selected-model run has another meaningful upgrade within one additional floor-tier order after its spending decisions. Longest observed streak without a meaningful upgrade is one order, versus 125 in the old model across the same stress cohorts. No selected run exhausts meaningful offers or hits the 256-upgrade safety guard through 200 orders. Coin conservation, finite rewards/quotes, unique ownership and package capacity are checked during every simulated order.

| Checkpoint | Old median Boost | New median Boost | Old median order payout | New median order payout | New median recipes found |
| --- | ---: | ---: | ---: | ---: | ---: |
| 25 | 49 | 2,723 | 14,633 | 422,780 | 11/17 |
| 50 | 118 | 2.01M | 69,056 | 410.68M | 15/17 |
| 100 | 352 | 625.21T | 721,946 | 175.44Qa | 17/17 |
| 200 | 1,172 | 9.22e39 | 3.38M | 2.52e42 | 17/17 |

These are end-of-checkpoint distributions, not averages across the whole window. Food acquisition differs from package unlocking: Crown Jewel foods can be lucky earlier drops. Median first food rarity acquisitions are orders **0, 4, 7, 17, 29, 44, 59, 99**. The full report includes reached fractions and p10/median/p90 values, rather than implying guaranteed drop times. At 90 seconds per order, 200 orders correspond to five illustrative hours; actual child solving times are not measured.

The deliberately strong compounding produces very large balances. At 200 orders, the normal balanced median is Bakery level 1,025/5,001 with 141 unpurchased duplicate-unlocked Mastery levels. Compact magnitude labels switch to scientific notation beyond the supported suffixes; stored values, frozen budgets and payout arithmetic remain JavaScript Numbers. Boundary tests exercise all recipes at Tier 5, one million Mastery, one million completed orders and the maximum Bakery Power. Quotes and rewards remain finite. Integer precision above 2^53 has the existing IEEE-754 limitation; displayed compact numbers are approximations. This work does not introduce a decimal/big-number currency engine.

An additional one-seed [1,000-order endurance check](economy-endurance.json) under normal, favorable and forced-floor draws finds no numeric overflow. It also identifies the finite endgame limit: very favorable play can reach the 5,000-purchase ceiling around orders 470–500; normal play around 550. Thereafter remaining linear Mastery increments can fall below the simulation's 0.1% meaningful-gain threshold despite available duplicate capacity. This is outside the 200-order balance target and represents roughly 12–14 illustrative hours at 90 seconds/order, not an indefinitely accelerating loop. More runway would need further cap/growth tuning; indefinitely extending exponential growth needs a larger-number representation or an endgame design. Do not silently raise the exponential cap until it overflows. Forced-floor play is still below the Bakery ceiling at order 1,000.

These are model predictions, not child playtests. Policies automatically equip the strongest Menu, compare upgrade value rationally, open bought packages immediately, and omit idle time, selling, refresh fishing and challenge mastery bonuses. Less optimized choices can be slower. The price peak now tracks actual equipped Menu to avoid charging those players for unused potential. Actual classroom telemetry should verify whether children find duplicate Mastery opportunities and the pace comfortable; no timer or speed incentive was added.

## Saves and reward integrity

The `panaderyaQuestV2` key and progression version remain unchanged. An additive `economyVersion: 1` migration reprices future purchases without altering coins, bought levels, ingredients, invested/refundable spend, foods, recipe ceilings, saved package stock (including old excess), guaranteed legacy food queues, worksheet progress or claimed-order ledgers. Already unlocked package types are grandfathered in `packageTierUnlocks`, using the former ten-level gates.

On first repricing, the obsolete potential-Menu price peak is rebased once to the saved equipped Menu. Subsequent saves keep the actual historical peak. Old price-based ten-second purchase Undo records expire during this one-time migration; retaining an old quote across a new price schedule would be unsafe. New purchases keep ordinary Undo.

Previously generated tickets retain their saved tier **and base**. Started orders retain saved base, Boost, budget and action/attempt ledger; completed unclaimed rewards retain their pool. New tickets use the new curve. Migration neither rerolls tickets nor recalculates frozen rewards. Existing exactly-once claim and stale-save protections remain in place. No reward protocol or worksheet engine change is needed.

## Reproduce and verify

```powershell
node tests/simulate-progression.mjs docs/progression-simulation.json
node tests/check-economy-results.mjs
node tests/simulate-progression.mjs docs/economy-candidate-rerun.json tests/economy-candidates.json
node tests/simulate-progression.mjs docs/economy-endurance.json tests/economy-endurance-scenarios.json
node --test tests/*.test.mjs
node --test tests/smoke.test.mjs
python tests/browser-frame11.py
python tests/browser-packages.py
python tests/browser-bakery-power.py
python tests/browser-order-coins.py
```

The candidate command also gives the selected model a smaller three-seed exploratory sample. The first command is authoritative validation. Browser runners cover WebKit and Edge, 2000×1200, 1194×834, 1024×768 and narrower layouts where applicable: package transactions and automatic collection, Mastery/duplicates, Bakery purchases/Undo, saved progress, and complete tap/drag/carry/add/claim worksheet behavior. No UI stylesheet changes, push or deployment are part of this rebalance.
