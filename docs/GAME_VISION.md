# My Panaderya - game vision

A tablet-first educational incremental bakery game for practicing **long multiplication procedure** after students have learned basic multiplication facts. The owner is the designer and product owner. A delightful, approachable learning experience takes priority over bakery-management complexity.

## Current experience

Root `index.html` opens the playable illustrated bakery: equipped Filipino foods in a showcase, live Baker's Boost, coin Orders on a wooden clipboard, a Packages station and collection management. The production multiplication worksheet and original Packages shop are preserved visual exceptions. Current composition is specified in [UI geometry](UI_GEOMETRY_REFINEMENT.md); [architecture](ARCHITECTURE.md) and [progression](REWARDS_AND_PROGRESSION.md) describe implemented systems.

The main landscape references are 2000x1200 and 1280x800. Keep controls generous, text clear, rewards comprehensible and menus easy to scan. Gameplay runs locally as a static website; no Unity port is underway.

## Worksheet interaction requirements

1. Tap or drag to connect a multiplier digit with a multiplicand digit; a rounded capsule makes the connection visible.
2. Tap the floating `M x N` expression to reveal product tiles, aligned with the relevant multiplicand column.
3. Place product digits flexibly and handle outgoing/incoming carries in valid orders. Preserve satisfying carry merging and accidental-tap tolerance.
4. Swipe downward to merge completed partial-product rows in a right-to-left addition cascade. Do not replace this with a generic answer field or Next-button sequence.
5. Tutorial ON shows only the next useful guidance; tutorial OFF shows no hint arrows. Keep sound controls and satisfying per-action feedback.
6. Reward unique necessary mathematical progress. Repeated taps, Undo/replay and duplicate bridge delivery must not farm rewards. Preserve generous retries and honest correction.

## Motivation and identity

Filipino panaderia foods are the collection focus. Real orders earn coins, packages acquire foods, duplicates unlock paid Mastery, and equipment increases Boost. Introduce systems gradually so children's cognitive effort stays on mathematics. Do not pressure students to rush.

The intended delight comes from clear feedback, a growing food collection and understandable improvement. Optional legacy helper systems remain supplemental to active math. Avoid adding currencies, per-food oven management, furniture micromanagement or unrelated management loops without an owner request.

Existing food IDs, saved progress, worksheet behavior, production economy and visual direction are constraints for focused work. Historical notes contain superseded checkpoints and unapproved ideas; they are not instructions to redesign the current game.
