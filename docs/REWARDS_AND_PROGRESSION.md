# Reward economy and progression — design reference

**Latest user direction (2026-10-30):** the corrective brief requests Level/Tier 5, value-preserving fusion/overflow, percentage economy improvements, seven rarities including Mythic, and bakery Level 30. These supersede older proposed caps below but are **not implemented yet**: the owner requested a visual review after corrective A/B, before C/D. See [CORRECTIVE_REDESIGN.md](CORRECTIVE_REDESIGN.md) for the exact checkpoint, retained formulas and migration work still required. Player-facing Chest is now **Package**; internal save fields keep their old names.

**Legend:** **Direction** = explicitly discussed and favored or accepted; **Proposal** = appealing but undecided; **Prototype** = implementation shortcut that must not be presented as a finalized balance/design choice. Numerical values in the code are tunable examples.

## Core progression (Direction)
- The main score is the **Bakery Value Multiplier**, displayed clearly. Improving the menu, kitchen, and bakery appearance raises this score, increasing coins earned through active multiplication tickets.
- Multiple cheap-to-medium-term upgrade paths and significant milestones should remain within reach, especially early–middle game; avoid one AFK-dependent grind route. Features appear in stages, not all at once.
- Coins are guaranteed for correctly completing tickets. **Meaningful mathematical actions** cause small coin bursts that visually fly into a **pending prize jar/pool**, where numbers increase; later partial-product rows can create richer coin bursts. Ticket completion and final sum release the pool. The total payout must not reward artificial extra taps.
- **Passive income** is allowed via **temporary hired staff**, but a student solving at a comfortable pace should earn at least around **3× the staff income rate**. Staff do not independently earn learning-related chests or mastery.

## Chests, Luck, and tickets (Direction)
- A completed digit-pair **combo** has a **chance** (not guarantee) of dropping a chest. Chance grows with Temporary Luck accumulated from necessary worksheet actions, including legitimate carry-related actions, and may rise slightly in later rows.
- When a chest drops, it collects in the pending pool, not interrupting math. If no chest has dropped by the **last combo**, that combo guarantees at least one chest for a finished ticket.
- Chest **rarity is random and influenced by order-ticket rarity**. A better ticket must have better probabilities for better reward grades; it need not guarantee a valuable item. Optional visible odds should be honest and reflect actual distribution. The random prize ultimately provides bakery foods/items.
- **Permanent Luck**, earned through demonstrated long-multiplication mastery, primarily affects **how often higher-rarity order tickets appear**. It should NOT directly improve chest rarity; the ticket has already done that. **Temporary Luck** affects chest occurrence, not ticket rarity.
- Once simpler ticket classes have been mastered and retained, they **can disappear from the usual generated ticket pool**, while being revisitable for practice or collecting. Ticket class and learning competence should be compatible; mastery assessment is distinct from raw time played or coins.
- Longer or more complex tickets can create additional chest opportunities, but balance opportunity vs difficulty, time, and fairness. Unfinished/failed-ticket reward treatment still needs refinement.

## Menu / individual foods (Direction)
- Rarity-based food collection primarily from chests; original concept used 3 foods per rarity, but exact content count is **not final**. Collection Index permanently records discovery, even if the whole owned food is later sold.
- **Food Level**: spend coins; proposed maximum **Level 3**; boosts individual value in **percentage increments** (small, frequent upgrades).
- **Food Fusion Tier**: proposed maximum **Tier 3**; significant **multiplicative** value improvement; both alternative ways upgrade the SAME fusion tier:
  - **Duplicate** of the same exact food + a **base fusion fee in coins**.
  - **Ingredients** bought in the shop + the **same base fusion fee**. This is a guaranteed alternative to chance-based duplicates, NOT free fusion.
- Every ingredient type has a fixed unit price regardless of how often/which food buys it; rarer ingredients tend to cost more; successive fusion tiers require substantially greater ingredient quantities. Food levels and improvements should not vanish when fusing a retained copy.
- **Sell the ENTIRE owned food item**, including its levels/fusion, removing it from inventory and active menu; keep its Index entry unlocked. Sale is `rarity/base resale value + 50% of actual coin investment` (levels, purchased ingredients, fusion fees). A proposed alternative uses original food base multiplier and maybe a rarity factor to set base resale, **not decided**. Do not double-count upgrade investments.
- **Menu slots:** existing prototype uses limited assignable slots, an affordable empty slot displays `+` and unpurchased slot displays cost. Broader choice between all-owned and active-food calculation was discussed, but current prototype uses **active menu**; preserve until changed.

## Kitchen, decor, other upgrades (Direction / Proposal)
- Kitchenware should **benefit ALL foods automatically**, not require food-category matching, duplicate ovens, or equipment assignment slots. Each kitchenware type can be bought and upgraded with coins (initial max level ~5). Give small **additive percentage** bonuses overall, making several affordable parallel upgrade paths without strategic overhead.
- Decorations/renovations improve both **bakery appearance AND worksheet styling**. Favor lightweight automatically placed décor and room/theme evolution over manually dragging furniture. Consider **small bakery-wide multipliers** for major visual renovations; individual decor can supply modest bonuses. Exact treatment of per-item decor bonuses is still tunable.
- Optional musical progression is cosmetic: richer background tracks/layers with bakery prestige, player-selectable and mutable; don't distract from maths.
- Collection index milestones, mini goals or celebrations might add motivation, but don't automatically implement ideas from unconstrained brainstorming. Optional proposed rewards include aesthetic transformations or small bonuses at milestones.

## Modes (Conceptual direction; prototype varies)
- **Normal**: forgiving, unlimited retries, full standard worksheet.
- **Lookup Table**: multiplication facts available if needed; supports procedural learning. Not inferior learning evidence by default.
- **Blindfold**: reduced assistance / require independent recall. Exact hiding/input mechanic requires educational validation and is not finalized; don't assume students should be penalized for weaker working memory.
- **Streak**: rewards consecutive correct combos. An earlier **Golden Oven** heat/multiplier idea could be incorporated here instead of adding yet another overlapping mode.
- **Bullseye**: rewards **overall correctness and accuracy** of a ticket, distinct from consecutive streaks. May offer longer combos/problem sequences; mistakes reduce potential rather than instantly killing a run.
- **Survival**: user **chooses how many lives** before attempting a run; fewer lives = higher potential coin multiplier. Errors consume lives, and on zero the attempt fails. Honest accidental UI slips should not count as math errors.
- Higher challenge modes offer significant **temporary coin payout multipliers**, not permanent bakery value. Non-Normal modes may have limited retries by mode; failed attempts and payout eligibility need clear rules. Gradually introduce modes after student learns base interactions. A student's mastery should not require Survival.

## Educational mastery (Direction / To design)
- Mastery should reflect retained ability to perform digit multiplication, carry, partial product alignment and final addition across appropriate difficulty, not just tapping or minutes played. **Permanent Ticket Luck** grows with mastery, improving opportunities for better-class tickets. Retention checks can remove already-mastered easy tickets from ordinary selection; manual revisiting remains an option.
- Strong performance in harder modes may count as appropriate evidence but speed/accuracy multipliers should not force rushed learning. The current code approximates mastery using completed ticket counts; **a real learning measurement design is still required**.

## Open decisions — don't silently finalize
- Exact probabilities, rarity classes/counts, ticket generation rules, balancing and rewards; payout normalization by effort/time.
- Precise rarity-based food resale base formula; fixed base multiplier or randomized variants of same food.
- Exact multiplier stacking, slot capacity scaling, equipment level caps, decoration implementation, EXP/rebirth (not approved).
- Whether or how to discount partial rewards from unfinished orders; whether free retry rules should differ between modes and what resets per retry.
- Cosmetic music, feature ordering, additional new progression ideas from brainstorming; treat these as options rather than required implementation.
