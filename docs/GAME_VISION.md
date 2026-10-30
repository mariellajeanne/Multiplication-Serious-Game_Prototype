# Panaderya Quest — game vision and interaction goals

**Current review:** [BAKERY_COMPONENT_REVIEW.md](BAKERY_COMPONENT_REVIEW.md) follows the newest owner direction: the components themselves carry the bakery theme, using paper, light wood, display labels, pastry boxes, matching illustrations and rounded sans-serif typography. The background is subtle; scenic wallpaper is not part of the active UI. Stop for owner review before Stage C.

Public title: **My Panaderya**. The 30-level roadmap remains a visual preview. Earlier annotation, corrective and cozy-image documents preserve implementation history; this newer direction overrides their appearance guidance. Mathematical interaction requirements below remain.

## Product vision
A **tablet-oriented serious game** that makes repeated long multiplication feel satisfying through responsive, bakery-themed play and frequent, meaningful progression. The motivating reference is Roblox **Assassin Leveling**: early and middle stages offer several affordable, parallel ways to improve, creating the feeling that another worthwhile upgrade is always close. **Do not** copy its crowded onboarding, AFK bottlenecks, predatory purchases, or excessive micromanagement.

The primary educational goal is **fluency with the algorithm/process of long multiplication**—especially where to put product digits and when/how to carry—not memorizing facts. A separate prior learning activity covers multiplication tables. Multiplication fact retrieval can still be practiced as a bonus. Reward mistakes as learning opportunities: do not undermine understanding just to make a reward game difficult.

## Audience and accessibility
Young learners using a tablet; original target design resolution around **2000×1200 landscape**. Big legible tiles, generous tap/drag targets, readable status cues, pastel Filipino bakery visual identity, uncluttered information hierarchy, pleasant short interaction sounds. Learning mode should be fully playable without understanding advanced upgrade economies. Introduce features gradually and contextually rather than exposing every system from the start.

## Original worksheet interaction spec (behavior matters, appearance may change)
1. Student taps or drags to connect a selected multiplier digit with a multiplicand digit; a **rounded capsule** visual connects them, not a bare line. The multiplication result appears above the connection as an initially clickable **`M × N` expression**; tap it to reveal separate digits (ones/tens).
2. The floating product is anchored so its **rightmost digit stays aligned with the current multiplicand column**. During product display, operands fade slightly to emphasize the product. Avoid jumping horizontal alignment.
3. Student places rightmost product digit in the partial-product row and handles leftmost digit as a carry. Actions should feel flexible: digits/carries may be placed in either allowed order; a prior carry may be added to the result when mathematically appropriate. When adding an incoming carry, use a satisfying fusion/merge animation. Prevent advancing past a carry that still needs resolution.
4. Each digit-pair is a meaningful **combo**. Product rows shift with multiplier place value. After all partial products, a **downward swipe anywhere in the intended math surface** initiates a clear right-to-left addition cascade; the final sum consolidates into a result row. Avoid turning the main mechanic into text-field input or a sequence of generic Next buttons.
5. **Tutorial ON**: one animated arrow stream/trail guides the next valid movement at a time (connect digit, product tile, carry, downward addition), not a crowded set of arrows; tutorial OFF: **no arrow hints**. Optional concise verbal help. Interaction flow should remain smooth without long blocking animation.
6. Satisfying per-action synthesized sounds for connection, placement, carry merge, completion; mute control; avoid harsh or excessive audio. Product micro-animation variants previously discussed: count-by, array/dots, or concise `M × N`, but current preferred interaction is `M × N` tap to reveal digit tiles.
7. Only correct, necessary, unique actions grant progress rewards; repeated taps or undo/redo farming should not grant unlimited bonuses. Permit correction of honest mistakes. Don't penalize accidental pointer slips as mathematical mistakes.

## Screen layout preference
**Outside solving:** main/center = large grid of food tiles (Filipino panaderia foods), with a very obvious **total Bakery Value Multiplier centered above**; each food tile has rarity header, food illustration/icon, bottom-left level, bottom-right individual multiplier. An unpurchased menu slot has a price and `Buy Slot`; an already bought empty slot has a large `+` to assign food. **Right rail** = clear, saturated, shiny tickets whose WHOLE background reflects rarity (not just colored border), with clear math, reward expectations, class, and selection affordance. Keep side management controls unobtrusive.
**While solving:** interactive receipt/worksheet takes priority; reward container/jar visible near the bottom, with animated coins moving into it. No clutter obstructing digits or carry arrows. Renovations and decor should also visibly evolve the worksheet styling; worksheet does not need to retain old visual skin.

## The delight curve
Almost every valid action has small, quick positive feedback; each finished combo can create a surprising chest; each completed ticket pays visible earned coins; upgrades visibly improve food, bakery, and UI. A player blocked on a costly item can instead level food, fuse with collected duplicates or purchased ingredients, upgrade kitchenware, buy decor, sell unwanted inventory, add menu slots, or choose a new ticket. These routes should remain simple and require **little strategic overhead**, with frequent progress early to mid game and longer goals later.

## Filipino bakery identity
Featured food concepts include **pandesal, monay, kababayan, pan de coco, Spanish bread, cheese bread, kalihim/pan de regla, ensaymada, hopia, mamon, pianono, ube cheese pandesal, buko pie, brazo de Mercedes**, and more. These are initial content examples; visual art and balancing can evolve. Avoid treating foreign pastry art as the default when clearly Filipino bakery foods can be shown.

## Scope discipline
This is not a full bakery simulator, restaurant tycoon, or decorating sandbox. Don't introduce food-category-specific oven management, individually assigned equipment slots, many overlapping currencies, mandatory AFK, heavy inventory strategy, or complex micromanagement unless requested. Prioritize learner motivation to solve another order ticket.
