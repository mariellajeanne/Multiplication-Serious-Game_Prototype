# My Panaderya — Unity migration reference

Updated 2026-11-04. **The web app remains a functional gameplay and visual prototype. No Unity project or migration has been started.** This file and [tablet implementation notes](docs/TABLET_UX_IMPLEMENTATION.md) supersede Frame 11 wherever they disagree about duplicate ownership, tablet usability or the scope of modes.

## Finalized scope and player experience

Grade 2–5 learners practice the **procedure of long multiplication**, including place value, partial products and carries. They already have access to basic facts; fact recall is not the main assessment. No public academic ranks, speed targets or pressure to rush.

Core loop: choose an order → connect digits → reveal the product → place digits/carries → add partial products → collect coins/packages → choose the next order.

Meta loop: discover unique Filipino recipes → buy slots and equip recipes → purchase optional Mastery/Kitchen/Bakery Power improvements → earn larger rewards and pursue discoveries. Collection, learning and short confirming feedback are the intended sources of satisfaction. Avoid bookkeeping and compulsory Mastery completion.

**Latest owner correction:** game modes are outside this phase. Existing legacy mode code is retained unchanged; no mode selection, new modes, mode balance or mode penalties form part of this Unity specification. The normal core worksheet is penalty-free: mistakes do not remove coins, packages or progress and do not end an order.

## Food ownership, Mastery and slots

- A save owns **at most one instance per `FOOD.id`**, irrespective of rarity.
- First discovery creates that recipe with Mastery 0, Tier 1 and no investment. If an empty purchased slot exists it is placed on the menu.
- A duplicate increments `recipeCeilings[id]` by exactly one. It does **not** create an inventory/card instance, spend coins, purchase Mastery, change equipment assignment or modify the existing recipe's UID, Tier, Mastery, retained base or investment.
- Buying +1 Mastery increments the owned recipe's actual `mastery` and records its exact coin cost in `spent`. Available capacity is `max(0, ceiling − mastery)`. Capacity has no fixed five-step cap and selling does not erase it.
- Batch results group by recipe; show total newly unlocked Mastery capacity rather than repeated copies. A new recipe and its duplicate capacity can be displayed together.
- Start with **one** slot. Cap slots at `FOOD.length` (currently 17), including all undiscovered recipes. Never use owned/discovered counts as the cap. Reject purchases at the cap without charging.
- Equipped foods have a stronger warm outline. All owned recipes remain visible by default; Hide Unequipped is only a view filter. Mixed selection exposes Equip (N) and Unequip (M) separately. Equip validates the whole selection before mutation.
- Recipe investment is optional. Duplicate fusion cannot operate in unique-food saves; old links route to the existing ingredient upgrade. Ingredient Tier upgrades remain available without consuming another recipe instance.

## Authoritative calculations

Sources: `src/data/catalog.js`, `src/game/progression.js`, `src/game/progression-economy.js`, `src/game/state.js` and `src/game/rewards.js`. Prices formerly in menu/dialog rendering are now in progression-economy. The game-design pass tunes Power prices below; coin reward formulas and probability distributions remain unchanged.

Use double precision for calculations; round at the same transaction boundaries. JavaScript `Math.round` for these nonnegative amounts is equivalent to `floor(x + 0.5)`; do not silently use a different midpoint rule in C#. UI formatting never feeds back into calculations.

### Food and bakery value

Let `m` be purchased Mastery, `t` be Tier, and `base` be the recipe catalog value.

```text
tierFactor[1..5] = [1, 2, 3.5, 5.5, 8]
masteryFactor[0..4] = [1, 1.25, 1.55, 1.9, 2.3]
masteryFactor(m >= 5) = 2.3 + 0.4 * (m - 4)
tierBase = base * tierFactor[t] + max(0, retainedBase)
foodContribution = tierBase * masteryFactor(m)
recipeTotal = sum(equipped unique recipe contributions)
kitchenFactor = product((1 + toolBonus) ^ toolLevel)
bakeryPower = 1.085 ^ (bakeryLevel - 1)
bakersBoost = max(1, recipeTotal) * kitchenFactor * bakeryPower
```

Kitchen bonuses: Oven 5.5%, Mixer 4.2%, Refrigerator 3.3%, Display Cabinet 2.8% per purchase; each tool retains its existing internal 20-purchase cap. Bakery Power has 100 internal purchases (stored level 1–101); **do not show a 100-level ceiling**. CURRENT is the latest purchased stage; NEXT is the immediate upgrade. Browsing history never equips an old bakery appearance.

### Pricing and transactions

`expectedBase` is the probability-weighted Normal ticket base below. `pricingBase` is the maximum of 1, the stored historical peak, and the total contributions of the strongest unique owned recipes that fit purchased capacity. Unequipping/selling must not reduce global prices.

```text
economyUnit = expectedBase * pricingBase * kitchenFactor * bakeryPower
earningUnit = expectedBase * bakersBoost
foodShare = expectedBase * thisFoodContribution * kitchenFactor * bakeryPower
nextMasteryCost = max(1, round(foodShare * (0.75 + 0.45 * (m + 1)^1.3)))
nextSlotCost = round(economyUnit * (2 + 0.6 * (slots - 1)^1.15))
nextBakeryCost = max(1, round(economyUnit * (2.5 + 0.04 * (bakeryLevel - 1))))
nextToolCost = max(1, round(economyUnit * (0.85 + 0.22 * toolLevel^1.15) * (1 + 0.1 * toolIndex)))
packageCost(rank) = max(1, round(economyUnit * 0.6 * 2^rank))
packageUnlockLevel(rank) = 1 + 10 * rank
```

Pricing knobs live in `BAKERY_POWER_CONFIG`, `PACKAGE_PRICE_CONFIG`, `PACKAGE_SHOP`, `MASTERY_STEP` and the calculation functions. Config should become a versioned data asset in Unity, independent of views. The stronger foods selected by Equip Best use actual final contributions, not raw base values.

The retained helper rate is `earningUnit / 360` coins/second, with a 120-second contract and fee `ceil(rate * 36)`. Gross active earnings exceed the helper by 6×, 4× and 3× at illustrative 60-, 90- and 120-second order paces. These are analysis assumptions, **not learner timers**.

Ingredient upgrades use `fusionFee`, `ingredientNeeds` and `fusionIngredientCost` unchanged. The recipe pays for missing ingredients plus the fee; its `spent` also retains the value of previously purchased pantry ingredients. Sale returns `resaleBase + floor(spent / 2)`, removing the owned recipe and its assignment but preserving discovery and ceiling.

### Honest package and ticket probabilities

Both distributions are binomial over ranks 0–7:

```text
coefficients = [1, 7, 21, 35, 35, 21, 7, 1]
weight[r] = coefficients[r] * p^r * (1-p)^(7-r)
probability[r] = weight[r] / sum(weights)
ticket p = 0.04 + 0.68 * (1 - exp(-completedOrderExperience / 80))
package food p = 0.08 + 0.84 * packageRank / 7
```

Package Luck names: **Standard, Lucky, Fortunate, Charmed, Blessed, Miraculous, Divine, Fate**.

Food rarities are a separate system: **Classic, Favorite, Special, Premium, Deluxe, Signature, Masterpiece, Crown Jewel**. After drawing a food rarity, choose uniformly among catalog foods in that rarity. A Fate package can contain a Classic food. Never substitute ticket odds for food odds. A positive probability below 0.01% displays as `<0.01%`; exact model values remain available for calculation and inspection.

Inject an RNG or seed into draws. UI effects must never consume gameplay RNG. Retain the complete numeric distributions in [simulation results](docs/TABLET_PROGRESSION_RESULTS.json).

### Orders, action rewards and claims

Ticket operand dimensions by rank: `[2×1, 2×2, 2×2, 3×2, 3×2, 4×2, 4×2, 4×2]` **digit counts**, not the operands themselves.

```text
ticketBase = round((70 + 30 * topDigits * bottomDigits) * (1 + 0.6 * rank))
Normal budget = round(ticketBase * bakersBoost at first start)
advertised minimum packages = 1 + floor(rank / 3)
```

- First start fixes operands, budget, attempt identity and its worksheet state. Later purchases never reprice a started order.
- Five tickets; refresh is 180 seconds. Refresh protects all started and unclaimed orders, replacing only untouched tickets. A paid skip costs `max(1, round(economyUnit * 0.5))`.
- Distinct accepted domain actions reward progress, not clicks. IDs are `attemptId/row/column/kind`. Kinds include connect, reveal, place-ones, carry-down, carry-up, place-tens and combo. Optional temporary tens placement has no extra reward.
- During solving: action pool cap `floor(budget * 0.76)`, action unit `max(1, floor(cap / (digitPairs * 4.4)))`, row factor `1 + row * 0.25`; ordinary action weight 0.65, carry/combo weight 1.2. Package Luck generally gains 1 per action, 2 for carries. Clamp coin additions to the remaining cap.
- After a completed digit pair, package chance is `clamp(0.12 + 0.013 * temporaryLuck + 0.03 * row, 0.06, 0.83)`. A drop retains the ticket's package type, then temporary Luck becomes `round(luck * 0.3)`. Preserve the final-pair fallback and advertised package minimum.
- Validated Normal completion sets the pool to its full fixed budget regardless of errors. Undo restores worksheet history but never rolls back the append-only paid-action ledger.
- Collection commits coins, discoveries/capacity or saved packages, completed-order count, claim tombstone and order removal in **one persisted transaction**. Failed persistence restores pre-claim state; repeat collection pays nothing.
- Each Normal completion adds one hidden completed-order experience. Visible Ticket Luck is `floor(experience / 4)` and never decreases. No public academic skill label is derived from this value.
- Free packages can be opened on collection or saved. Bought packages use coins, persist as stock, and have no retention/discard cap. Buy batches are capped at 1,000 per transaction; Open All includes all stock types. Show the next locked type with its exact upgrade requirement on tap.

## Worksheet touch contract

1. Tap two valid digits in either order or drag between them. Show the rounded connection capsule.
2. The floating `M × N` control reveals the product; facts are assistance to procedure, not a forced recall gate.
3. Tap a product tile then a destination, or drag it. Allow the tested flexible ones/tens placement order.
4. Tens can be placed provisionally in a partial-product row and then lifted to the carry shelf. An incoming carry must explicitly join the current ones tile, floating or already placed.
5. Start the second partial product in the correct place-value column with its zero. Preserve carry-in arithmetic.
6. Downward swipe over whitespace or completed math cells merges partial products. **Add Rows** is an accessible alternative invoking the same arithmetic and completion path.
7. Guide ON shows one concise instruction plus arrows/target outlines. OFF removes those cues immediately; normal input/selection affordances and Add Rows remain.
8. Errors use stable reserved space and a gentle border response. Do not shake or reposition the math. Save & Exit preserves the exact accepted state and permits another ticket.

Tap commits on pointer-up; suppress only the compatibility click from that gesture. Capture drag after movement, cancel cleanly on pointer-cancel, and retain native scrolling in menus/dialogs. Do not install global touch-scroll blockers. Unity should reproduce these semantics with its input system rather than copying DOM event plumbing.

## State and persistence contract

The primary web key remains **`panaderyaQuestV2`**. Relevant state:

| Data | Fields / invariant |
| --- | --- |
| Identity/version | `progressionVersion`, `frame11Version`, `uniqueFoodsVersion`, monotonic `uidNext` and `ticketSeq` |
| Collection | `owned[]`: unique `id`, `uid`, `mastery`, legacy `level`, `fusion`, `spent`, optional `baseCarry` and `resaleBase` |
| Discovery | `discovered[]` permanent; `recipeCeilings[id]` permanent unlocked paid-upgrade capacity |
| Menu/economy | `activeMenu[]` unique recipe UIDs, `menuSlots`, `coins`, `equipment`, `bakeryLevel`, `bakerySpent`, `economyPeakBase`, pantry and legacy investment fields |
| Orders | `board[]`; `orderRuns[ticketId]` independently owns ticket, phase, fixed budget, pool, rewards, mistakes, progress, worksheet session and action ledger |
| Current view | `g.run` aliases the canonical selected `orderRuns` entry; `paused` permits the bakery view without deleting the run |
| Worksheet session | Exact arithmetic state, selection/provisional carries, history, metrics, append-only action records and attempt ID |
| Reward safety | `claimedOrders[ticketId]` tombstone; no repeated grant after reload or stale delivery |
| Packages | Eight nonnegative stock counts in rank order; legacy pending packages retain their promised food rarity |
| Refresh | `orderClock`, `orderRefreshAt`; persisted deadline survives reload |
| Latest Undo | Transaction ID, label, exact cost, prior fields, signature, absolute expiry; at most one transaction for ten seconds |
| Preferences | Sound, music and Guide; legacy guide graduation retained |

Selection, modal visibility, scroll positions and animation nodes are presentation state. Do not serialize transient visual effects as gameplay truth.

### Unique-food migration

Before migrating an old save without `uniqueFoodsVersion:1`, retain its raw JSON once in `panaderyaQuestV2BeforeUniqueFoods` when storage is available. Do not rename/wipe the primary key.

Group existing owned entries by food ID. Keep the equipped UID when present, otherwise the strongest recipe. Consolidate highest purchased Mastery/Tier, all paid `spent` and base resale investment, and enough retained base to avoid reducing the strongest prior contribution. Existing discovery/ceiling progress remains. Rebind assignments, remove repeated recipe assignments and cap slots to the complete Food Index. The migration is idempotent. It may combine complementary past investments into a stronger single recipe; it never purchases new Mastery or grants coins.

Commit/invalidate an old reversible transaction if its current or prior owned state contains duplicate instances; otherwise Undo could restore obsolete ownership. Starting an order, changing assignments, refresh, sale and package transactions commit dependent Undo. Rewards and random contents are never undone.

## Layout and feedback reference

- Primary target **2000×1200 landscape**: Bakery Power/packages left; central Menu Boost/combined boost, yellow wallet, tabs, selection controls and unique-food grid; colorful order tickets right. Keep the established paper, light wood, pastry-box colors, local food art and rounded Nunito typography.
- Compact landscape: retain three columns with scrollable food/ticket regions. Recipe details have a scrolling information body and a visible action footer. Expanded details may compact the boost header.
- Compact portrait 834/768px: compress the existing bakery/package upper band; menu stays left of tickets below it. Food cards and playable orders appear earlier. Avoid a phone/desktop redesign.
- Ticket odds start collapsed below 1500px; explicit user toggling takes precedence. A readable horizontal chance chart replaces tiny broken labels. Start/Resume/Collect are visually explicit.
- Interactive targets generally 44–48 CSS px, with child-readable primary labels, secondary explanatory text and contextual blocked-action reasons. Focus returns to the initiating control after a re-rendered dialog.
- Reserve Guide and error-message space before sizing math. Do not move targets when feedback appears. Worksheet digit cells never shrink below 44px in this prototype.

| Event | Timing / treatment | Gameplay relationship |
| --- | --- | --- |
| Press / selection | ~100ms response, warm pressed state / stable selection outline | Immediate; no input delay |
| Connection / reveal | Existing capsule and short confirming sound; ~180ms settle | Existing math selection/reveal controls retained |
| Product placement | 160ms ghost movement; carry lift 200ms; destination brightness response 180ms | **Commit valid math immediately**, independently of animation completion |
| Coins / extra package | 180ms appearance, 120ms hold, ~360ms eased travel outside protected math | Accounting is already committed; bounded timers only update presentation |
| Equip / Mastery | ~280ms local confirmation pulse and immediately recomputed boost | No extra currency/reward event |
| Bakery Power | Old → new rounded multiplier and exact +8.5% next-upgrade meaning | Full precision retained internally |
| Rare discovery | ~480ms single reveal, restrained Crown Jewel border/overshoot; Fate pearlescence is bounded, not perpetual flashing | No reward RNG consumed; no mandatory wait |
| Routine message | One current notification, ~2.8 seconds; dialog messages stay inline | No stale stack obscuring the math or collection buttons |

Respect reduced motion. Keep sound optional. No screen shake, hit-stop or particle barrage is needed for this educational game. The addition cascade is an explanatory arithmetic sequence, not a new reward rule. New effects must not gate valid input.

### Game design feedback additions (2026-11-04)

Reward groups show unique recipe progress, optional saved duplicate capacity, next Mastery contribution/cost/coin gap, and direct recipe access. When Equip Best would increase earnings, show the actual combined boost before/after and a free Equip Best action. Do not auto-buy upgrades or grant additional rewards from these controls. Food details and Mastery review use a pure counterfactual preview, including possible Auto Equip changes. The package shop displays the exact chance of an undiscovered recipe for the current collection: sum(foodRarityProbability * undiscoveredCountAtRarity / recipeCountAtRarity). A collected recipe unlocks optional capacity instead; this disclosure does not change the draw.

One optional bakery idea links to the cheapest useful improvement. Free menu improvements qualify; paid suggestions must increase the combined boost by at least 0.5% (a presentation assumption to playtest). A slot suggestion describes its potential with the best menu, not an immediate boost from empty capacity. Power persistently shows the nearest package unlock and upgrades remaining; crossing it names the newly unlocked type for up to six seconds without blocking input. Undo reverses the unlock and retains the exact amount originally paid.

Product reveal uses a 180ms ease-out settle (0.96 → 1.035 → 1 scale), independently of accepted input. Extra packages have a quieter 740/880Hz two-note synthesized cue, with ~52ms spacing and 0.024 peak gain versus the routine 0.042; mute applies. New recipes of rarity 5+ have one 480ms eased reveal, without implying high-Luck packages guarantee rare food. Reduced motion suppresses reveal motion and addition sparks. Preserve the existing distinct connect, placement, carry, merge and final completion sounds.

No save schema or key migration is required for these price/presentation changes. Preserve paid investment, claimed-order identities, existing package stock, recipe ceilings and fixed in-progress budgets. A price reduction is not a retroactive currency refund; an existing valid Undo refunds its actual recorded cost.

## Reproduce directly vs rebuild in Unity

| Reproduce directly | Reimplement using Unity facilities |
| --- | --- |
| Catalog IDs/rarities, unique ownership, Mastery, formulas and config | Data assets and pure C# calculation/transaction functions |
| Fixed per-ticket problems/budgets, independent sessions, reward ledger/tombstones | In-process worksheet/controller events; no iframe or `postMessage` bridge |
| Tap/drag/carry/swipe/Add Rows semantics and hitbox sizes | Unity input events, drag thresholds, capture/cancellation and accessible controls |
| Layout hierarchy, paper/wood treatment, colors, typography, illustration identity | Canvas/UI Toolkit layout, safe areas and asset preparation; do not port CSS specificity layers |
| Timing, easing intent, sound events and importance tiers | Lightweight animation curves/tweens and audio playback; no Web Animations API/polyfills |
| Atomic save/claim/Undo invariants and versioned migration fixtures | Versioned native save DTOs and durable atomic storage; evaluate app suspension/clock behavior |

Export golden input/output fixtures from the deterministic functions before the Unity implementation and compare C# against them, including rounding and probability tails. Browser source/origin checks, handshake retries and compatibility-click suppression are prototype infrastructure, not gameplay to reproduce literally.

## Evidence and remaining validation

Run `node --test tests/*.test.mjs`, `python tests/browser-frame11.py edge webkit`, and `node tests/simulate-progression.mjs docs/GAME_DESIGN_RESULTS.json tests/game-design-validation.json`. Full candidate comparison: `node tests/simulate-progression.mjs docs/GAME_DESIGN_COMPARISON.json tests/game-design-scenarios.json`. Omitting the validation config uses 40 seeds for future tuning.

The original v2 simulation and tablet report remain historical baseline evidence (540 traces / 43,200 orders); `docs/GAME_DESIGN_LEGACY_BASELINE.json` preserves its exact output. Model v3 includes production per-pair package opportunities and claims, the five-ticket board, all kitchen tools, ingredient upgrades and advanced package purchases. It compares growth, collection, balanced, reasonable nonoptimal and Power-focused policies at 25/50/100/200 orders. Middle/late snapshots and one purchase per order are explicit model assumptions, not measured session lengths.

Current Power quotes in expected Normal orders are 2.50 initially, 3.30 at 20 purchases and 5.30 at 70; the last purchase costs 6.46 instead of the former 41.95. Package prices remain 0.60 through 76.8 orders; the cheaper-package candidates were rejected after simulation showed extra duplicate spending and weaker middle-game growth. Benefits, coin payout amounts, upgrade counts, package unlock thresholds and all probability distributions are unchanged. See [implemented decisions and comparative evidence](docs/GAME_DESIGN_IMPROVEMENTS.md) for rationale, limitations and playtest questions.

Physical iPad Safari gestures/rotation/browser chrome, audible SFX, background/resume and Grade 2–5 playtesting remain pending. Windows WebKit touch taps and synthetic touch drags are not a claim of physical-iPad validation. See [implementation evidence and continuation notes](docs/TABLET_UX_IMPLEMENTATION.md) for the fifteen-fix checklist, tested screens and exact remaining tasks.
