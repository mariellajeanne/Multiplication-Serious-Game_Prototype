# Game design improvements — implementation record

2026-11-04. Implemented in the web prototype; no push, deployment or Unity port.

## Recoverable checkpoint

- Read current code, tablet/Unity handoff, architecture and five requested skills. Read-only delegated reviews covered audience, agency, economy, puzzles, feedback and attention; narrative/social/spatial/business domains excluded as outside this phase.
- Baseline: all 79 Node tests pass. `GAME_DESIGN_LEGACY_BASELINE.json` reproduces `TABLET_PROGRESSION_RESULTS.json` byte for byte (SHA256 47ee705cfe8be7023c13e94de30511d0284d93b81445cfa2dfb2e1370fdea70b). Original results remain intact.
- Confirmed: later Power costs rise without increased percentage gain; package prices double per rank; old simulation omits per-pair packages, three kitchen tools and ingredient upgrades. Reward cards do not connect discoveries to an actionable improvement.
- Selected the **Power-only** candidate: `2.5 + .04*n` expected Power orders. Cheaper package candidates were implemented, simulated, then reverted after showing harmful duplicate spending. Package prices remain `.6 * 2^rank`; the shop now exposes collection-aware discovery odds. Benefits/probabilities are unchanged.
- Implemented contextual reward actions, boost previews, optional goal links, reveal/package feedback and reduced-motion spark correction. Original Node/Edge/WebKit journeys remain intact.
- Full comparison complete: four candidates × three snapshots × five policies × 40 seeds × 200 orders = **2,400 traces / 480,000 orders**. Post-selection runtime verification complete: **150 traces / 30,000 orders** using 10 seeds and the same horizons. The intermediate cheaper-package runtime rerun was superseded by the accepted output.

## Evidence boundary

Simulations measure purchasing opportunities and economic consequences, not enjoyment or real session duration. Child comprehension, voluntary motivation and physical iPad interaction require real playtesting. Preserve procedural math, existing saves/key, exactly-once rewards, ten-second Undo, mute/Guide controls and legacy mode code.

## Intended experience and system boundary

Learners choose a comfortable order, perform the multiplication procedure, perceive progress, then choose how to improve their bakery. The tension is between a useful guaranteed upgrade and an optional collection purchase. Bakery strength changes earnings, never the mathematical answer or required steps. Success is a child predicting what a purchase will improve and voluntarily returning to multiplication; this has not yet been measured with children.

Inside this model: a necessary math action, its attempt-owned reward ledger, completed orders, five-ticket choice, coins, free/bought packages, discoveries, duplicate capacity, equipped recipes, Mastery, slots, all kitchen tools, ingredient upgrades and Power. Time steps are actions and orders, with 25/50/100/200-order checkpoints. Modes, social features, narrative expansion, real-time speed targets and Unity implementation are outside this change.

| State / owner | Source and destination | Boundary / feedback |
| --- | --- | --- |
| Pending coins and temporary Luck / attempt ledger | Unique correct action → pool/Luck; sealed pair → package opportunity and partial Luck reset | Coins capped at 76% before completion, full fixed budget at finish; replay pays once |
| Wallet / claim or purchase transaction | Verified completion → coins; purchase → upgrade/package stock | Nonnegative stock; saved claim tombstones and fixed run budgets retained |
| Recipes / discovery transaction | Package → first unique recipe or additional paid-Mastery capacity | One owned instance per recipe; discoveries permanent; capacity unbounded, optional |
| Menu / equip transaction | Contributions → summed Menu Boost → kitchen → Power → Baker's Boost | Slots 1–17; improvement never removes arithmetic work |
| Shop / purchase transaction | Coins → capacity, contribution or global multiplier | Historical peak protects prices against unequip/sale manipulation |
| New ticket probabilities / completed-order experience | Completed order → experience → distributions on newly generated tickets | Honest probability displays; no speed requirement or mistake loss in Normal |

The reinforcing loop is solve → earn → invest → earn more per future solution. Prices scale with expected earnings, providing a balancing loop; excessive additional price growth can make an upgrade feel unreachable despite nominal coin growth. Packages feed collection and future optional Mastery, while Power also gates package-shop variety. This explains why evaluating only immediate marginal return misses collection value.

## Design decisions and tradeoffs

- **Keep procedural input and its existing safeguards.** The capsule, product reveal, flexible tile/carry order, partial products and swipe/Add Rows already form a coherent learning loop. Replacing them with faster generic taps would invalidate the educational purpose.
- **Keep unique recipes and duplicate capacity.** It prevents inventory clutter and preserves investment. The weakness is deferred utility being hard to interpret, so reward cards now show saved optional capacity, next Mastery contribution/price/coin shortfall and direct recipe access. They never auto-buy Mastery. Free Equip Best previews the actual combined boost when a stronger collected menu exists.
- **Expose a useful next choice.** One optional bakery idea chooses the cheapest currently useful opportunity, including free equipment changes. It routes to the existing control/details, and never spends coins merely by being displayed. Power shows the nearest package unlock; purchases crossing it name the new type. No notification counters, deadlines or new currencies.
- **Use feedback tiers.** Existing routine placement/carry response remains immediate. Product tiles settle in 180ms; extra packages use a quieter two-note cue instead of repeating the full pair-completion sound. Mastery shows its actual boost consequence, medium local pulses remain ~280ms, and new high-rarity recipes use one 480ms reveal. Reduced motion disables tile/reveal motion and addition sparks. No gameplay RNG, input lock or screen shake.
- **Do not claim a new educational assessment.** Current Ticket Luck follows completed-order experience. It is not proof of retained mathematical competence. Legacy modes remain untouched.

The optional idea filters paid suggestions below 0.5% combined growth; free improvements always qualify. This is a presentation heuristic to playtest, not a new purchase restriction. Package unlock feedback remains readable for six seconds; ordinary Power feedback lasts 2.2 seconds. Neither blocks input, and an old timer cannot remove a newer purchase's message.

## Numerical comparison and selected economy

Expected-order quotes assume the strongest owned menu; historical peak pricing can make quotes larger after selling or choosing a weaker menu. Let `n = bakeryLevel - 1`.

| Parameter | Baseline | Implemented | Reason |
| --- | --- | --- | --- |
| Power price in economy units | `2.5 + .2*n^1.15` | `2.5 + .04*n` | Replace escalating effort for a fixed benefit with a nearby saving goal |
| Power benefit | +8.5% per purchase | Unchanged | No reward inflation or stronger passive activity |
| Power purchase count | 100 | Unchanged | Existing saves/investments remain meaningful |
| Package price | `.6 * 2^rank` | Unchanged after experiment | Cheaper packages mainly added duplicate spending in these traces |
| Package unlocks | `1 + 10*rank` | Unchanged | Power investment still opens shop variety |
| Mastery, slots, kitchen, ingredient and resale rules | Existing runtime formulas | Unchanged | No demonstrated reason to redesign all sinks simultaneously |
| Coin budgets, per-action cap, free packages and odds | Existing runtime formulas | Unchanged | Preserve math integrity, generous guarantees and transparent randomness |

| Next Power purchase | Baseline expected orders | Implemented expected orders |
| --- | ---: | ---: |
| First | 2.50 | 2.50 |
| After 20 purchases | 8.77 | 3.30 |
| After 70 purchases | 28.98 | 5.30 |
| Last | 41.95 | 6.46 |

Immediate relative gain per expected-order price improves from approximately 0.97% to 2.58% at 20 purchases and 0.29% to 1.60% at 70. Oven's corresponding late quote is 4.68 orders for +5.5%; Power now offers a credible alternative for a child willing to save. This ratio is not a prediction of real-time payback.

### Alternatives evaluated

All four variants used the same model and deterministic seeds:

1. **Baseline:** original Power and package prices.
2. **Power-only — selected:** linear `.04` Power growth, original package prices.
3. **Gentle bundle — rejected/reverted:** selected Power plus `.6*1.45^rank` packages; Fate would cost 8.09 orders.
4. **Fast bundle — rejected:** `.02` Power growth plus `.6*1.25^rank` packages; Fate would cost 2.86 orders.

The gentle bundle reduced middle balanced median growth at 200 orders from 52.48× baseline to 47.56×, and younger-policy growth from 48.77× to 30.04× (about **38.4% lower**), while both still had median 17 recipes. Younger-policy mean bought packages rose from 18.28 to 80.08: cheaper stock crowded out useful upgrades and mostly unlocked surplus duplicate capacity. Fast bundle similarly produced younger growth 31.90× with no median discovery gain. Bigger multiplier values in its optimizing paths do not prove it is more enjoyable. Select the smaller, supported Power intervention and disclose package utility instead of making all spending cheaper.

The retained package shop now calculates `sum(rarityProbability * undiscoveredRecipesAtRarity / recipeCountAtRarity)` without RNG. A full Index honestly shows 0% new-recipe chance, with optional Mastery as the stated alternative. This also explains why a high-Luck type may be a poor choice when the missing foods are low-rarity. The simulation's highest-unlocked collection policy does **not** model a learner using this new disclosure to choose a different type; its benefit requires playtesting.

### Same-model before/after results

Median growth is relative to each independent snapshot's starting boost, not a comparison of children's ability. Parentheses show p10–p90 where given.

| Snapshot / policy | Orders | Baseline boost growth | Selected boost growth |
| --- | ---: | ---: | ---: |
| Early / growth | 25 | 240.39× | 240.39× |
| Early / growth | 50 | 837.17× | 837.53× |
| Early / growth | 100 | 3,278.78× | 3,341.20× |
| Early / growth | 200 | 14,764.10× (11,900.68–19,822.26) | 30,854.80× (20,051.36–44,612.00) |
| Middle / balanced | 200 | 52.48× (40.98–59.03) | 62.26× (52.04–76.41) |
| Middle / younger | 200 | 48.77× (33.13–55.17) | 50.66× (35.85–60.30) |
| Late / Power saving | 25 | 1.00× | 1.39× |
| Late / Power saving | 50 | 1.09× | 2.08× |
| Late / Power saving | 100 | 1.28× | 4.00× |
| Late / growth | 200 | 2.01× | 2.01× |

The last row is an important limitation: a myopic policy that spends on the best **currently affordable** Mastery does not save for Power, even at its improved price. Do not claim the price change eliminates every dominant-policy concern. A deliberate late Power saver reaches its first purchase in median **5 orders (5–6)** instead of **29 (27–31)**, and by 200 orders reaches the existing Power cap; this policy ignores other available upgrades after that cap.

At 200 orders, early growth averages Power **7.38 → 24.90**, kitchen **35.00 → 28.45**, Mastery **40.25 → 29.10**, and ingredient upgrades **15.45 → 12.28**. Multiple investments remain useful. Middle growth changes Power **0 → 9.70**, alongside 62.73 Mastery and 19.55 kitchen purchases. Early growth's first purchase remains median **2 orders (1–3)**; its p90 longest purchase gap remains four orders. Middle balanced median available growth candidates increases **3.185 → 3.37**, with p90 longest purchase gap still three orders.

Free package/reward frequencies are deliberately unchanged. Early growth medians at 25/50/100/200 orders are **32/73/174/427** free packages and **13/16/17/17** discovered recipes; median duplicate rewards are **20/58/158/411**. Late's 200-order median is **546** free packages, **15** discovered recipes and **536** duplicates. These are separate distribution medians, not an accounting sum. The small catalog saturates quickly in some traces; this is a remaining design risk, not something solved by cheap package purchases.

Complete p10/p50/p90 distributions for every snapshot/policy/horizon, prices, spending counts, coins, purchase gaps and affordable candidates are in [GAME_DESIGN_COMPARISON.json](GAME_DESIGN_COMPARISON.json). [GAME_DESIGN_RESULTS.json](GAME_DESIGN_RESULTS.json) is the fresh production-config verification. `firstPurchase > horizon` is a censored sentinel (no purchase yet), not an observed future order. `maxDry` includes a policy intentionally stopping at its chosen cap; available alternatives are recorded separately.

## Model fidelity and omissions

The old v2 result is preserved, not used as the numerical comparison for new curves. Model v3 invokes production `startTicket`, `applyWorksheetActions`, `finishSum`, `prizeItems` and purchase functions. It includes the actual additional pair packages, temporary Luck reset, guaranteed package floor, five-ticket board, all kitchen tools, ingredient fusion and highest-unlocked bought package. Direct known-case test: every successful drop on 79×18 creates four packages, repeated action delivery creates none, and claim pays its fixed budget once.

Five policies: growth ranks immediate gain per coin; collector saves for the highest unlocked package; balanced adds that collection choice every third order; younger chooses random useful affordable purchases and random tickets; Power pursues its unlock path. All choose the strongest menu. This last assumption, one purchase decision per order, and deterministic policy rules limit predictions about children. A long gap under a saving policy is not necessarily an absence of affordable alternatives; both are recorded separately.

Optional helpers, sales and paid refresh are omitted from primary traces and assessed separately at their formula boundaries. There is no claim of complete behavioral simulation. Staff provides no packages and retains the existing active-to-gross-passive ratios of 6×/4×/3× at illustrative 60/90/120 seconds per order. Those rates are assumptions for comparison, not timers or measured learner durations. Paid refresh remains a discretionary half-economy-unit sink. Sale retains only base resale plus half invested coins; package resale expectation is checked against the cheapest legal purchase states.

Ticket rewards were checked against mathematical work: production bases per digit-pair are approximately 65, 76, 104.5, 116.7, 141.7, 155, 178.25 and 201.5 coins before boosts. Higher ranks reward more work and carry/addition opportunities with larger coins and better package distributions; this does not prove equal real effort. Low-rarity rewards still scale with the full bakery boost. No payout or ticket-probability change was justified here. Short-order availability remains the separate concern below.

## Technical implementation and save compatibility

- No new progression subsystem, currency, mode, inventory type or save schema. The structural relationship change is that Power's fixed percentage benefit has a bounded nearby price curve; its existing shop-unlock role is now visible. One-owned-recipe and duplicate-capacity mechanics are retained for their simplicity.
- All prices remain configurable in `progression.js`; all previews are deterministic in `progression-economy.js`. Rendering changes no ownership, currency, random draw or worksheet state.
- The original `panaderyaQuestV2` key, prior investments, package stock, claim tombstones, independent worksheet sessions and frozen in-progress budgets are retained. Existing Undo refunds its original cost. The lower Power price does not silently refund older purchases.
- Bridge source markers, attempt IDs, reward validation and message contract are unchanged. The child interprets the existing package-feedback event with its distinct optional sound. No new parent/child reward authority exists.

## Verification and reproduction

- `node --test tests/*.test.mjs`: **86 passed, 0 failed**. Includes smoke, carrying/addition recovery, reward/claim safety, storage rollback, Undo, migration, slots, ownership, counterfactual-preview accuracy, RNG independence, model determinism, production package opportunities, discovery odds and safe expected package resale.
- `python tests/browser-frame11.py edge webkit`: **both passed** at 2000×1200, 1194×834, 1024×768, 834×1194 and 768×1024. Covers details/footer hit testing, touch/drag, selection, package buy/unbox, Mastery, Power, slot/Undo/reload, independent orders and exact-once claims. New checks cover reward-to-recipe access, free Equip Best, package unlock/Undo, actual reveal animation, and no addition sparks under reduced motion.
- Real **79×18=1422**: carrying, temporary tens, carry-in, click/native taps, mouse drags and Edge native touch drags; WebKit touch drags use synthetic pointer events. Guide/Sound ON/OFF, swipe addition, switch/reload persistence, lost completion delivery and broken animation APIs remain covered. **12×12=144** tests Add Rows and reduced motion.
- Fresh-player browser journey: starting wallet 250; two actual **12×3** orders; collect/save packages; wallet exactly 562; buy Oven at the real quote, verify +5.5% boost, exact deduction and reload persistence. No testing touches the owner's normal browser profile/save.
- Additional focused Edge/WebKit check passed: one saved Fate package, forced deterministic high-tail draw (`Math.random=()=>.99999`) → one new Crown Jewel recipe, zero remaining stock, repeat opening rejected, reduced-motion reveal has `animationName: none`, and View recipe opens the correct details. This is a fixture check, not an estimate of Crown Jewel probability. Captures: `edge-rare-discovery.png` / `webkit-rare-discovery.png` in the same evidence directory.
- Full comparative model: `node tests/simulate-progression.mjs docs/GAME_DESIGN_COMPARISON.json tests/game-design-scenarios.json` (40 seeds, 480,000 orders). Every order checks coin conservation, nonnegative stock/coins, unique recipes and slot cap. Original v2 results remain byte-identical.
- Accepted runtime verification: `node tests/simulate-progression.mjs docs/GAME_DESIGN_RESULTS.json tests/game-design-validation.json` (10 seeds, 30,000 orders). Its production configuration and every initial scenario quote exactly match the selected `power-only` candidate. The default current configuration uses 40 seeds for future tuning.
- `git diff --check`: passed. No unexpected browser page errors in successful runs. An intermediate added browser assertion failed because shell encoding changed its Unicode button label; it was corrected to a stable locator and both complete runners passed afterward. Cheaper package parameters were deliberately reverted after failing the economic comparison.
- Screens visually inspected: [fresh menu](previews/game-design/edge-fresh-2000.png), [reward follow-through](previews/game-design/edge-reward-follow-through.png), [package discovery odds](previews/game-design/webkit-packages.png), and [first kitchen improvement](previews/game-design/edge-fresh-first-upgrade.png). Additional tablet/detail/worksheet captures are in `docs/previews/game-design/`; the preceding tablet evidence was preserved. The package image was recaptured after the modal settled to opacity 1.

Exact source files changed: `src/game/{progression,progression-economy}.js`, `src/ui/{bakery-art,dialogs,menu,scene}.js`, `styles/progression.css`, `worksheet/src/{state,parent-bridge,partial-product-addition,sound-and-multiplication-fx}.js`, and `worksheet/styles/responsive-workspace.css`.

Verification/tool files: `tests/{simulate-progression.mjs,progression-model.js,game-design.test.mjs,browser-frame11.py,game-design-scenarios.json,game-design-current.json,game-design-validation.json}`. Existing `tests/progression-scenarios.json` stays valid as a supported legacy-style configuration. Handoff/current-behavior pointers updated in the Unity reference, architecture, rewards/progression and tablet notes. No push or deployment performed.

## Remaining playtest questions

1. Can Grade 2–5 learners explain why a duplicate is useful without treating available Mastery as mandatory unfinished work?
2. Can they predict the effect of a menu change, Mastery, kitchen purchase and Power, and choose an appealing nearby goal?
3. Do easier tickets remain accessible enough? Only Classic uses 2×1 digits; its random probability falls from 75.14% at experience 0 to 7.63% at 40 and 0.0986% at 160. A guaranteed comfortable-order rule is deferred: it would change board composition and requires a separately honest odds explanation.
4. Is collection saturation with 17 foods satisfying, or does long-term interest weaken once discoveries slow? Do not infer fun from multiplier growth.
5. On a physical iPad, verify finger drag/cancel/swipe, rotation/browser chrome, suspension/resume and audible optional SFX. Desktop WebKit is useful evidence but cannot establish these.

Suggested short playtest: observe the first order and a mixed discovery/duplicate claim without explanation; ask what changed and what the child wants to try next. Compare comprehension, purchase variety, accidental taps and voluntary continuation, without speed ranking or pressure.
