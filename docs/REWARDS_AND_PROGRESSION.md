# Current rewards and progression

This describes implemented production behavior. Source formulas and migration tests are authoritative; older design proposals are retained under [history](history/REWARDS_AND_PROGRESSION.md).

## Foods, equipment and Boost

- The catalog has 17 Filipino recipes across eight rarities. Own one instance of each recipe; discovery remains recorded even after a sale.
- Opening a duplicate unlocks paid Recipe Mastery capacity. It does not create another owned copy or automatically buy upgrades. Existing fusion/investment data and migrated value are preserved.
- Mastery purchases increase recipe value. One starting equipment slot can grow to the catalog limit; only equipped recipes contribute. Equip Best and Auto Equip use the production selectors.
- Baker's Boost is `max(1, sum of equipped recipe contributions)`. Bakery Power and Kitchen are retired; old fields/neutral compatibility functions do not increase new payouts or prices.
- Safe ten-second Undo applies to eligible purchases and expires when a dependent transaction invalidates its snapshot. Preserve existing sale/upgrade/slot safeguards.

## Orders and worksheets

The board has five orders with a persisted three-minute refresh cooldown and the existing paid-Skip confirmation. Orders have eight coin tiers; food rarity, coin tier and package type are distinct systems. Each ticket stores a real equipped recipe `foodId`, retained once started.

New order budgets use the production base quote and saved Boost. Started worksheets preserve their frozen payout promise even if equipment changes later. Accepted unique math actions update progress/pending rewards; duplicate notifications and replay do not create extra rewards. Completion and claims award coins once. New Orders do not grant package drops; already-earned legacy package rewards survive migration.

Normal play uses the long-multiplication worksheet, including product reveal, flexible carry placement, partial products and swipe addition. Paused independent worksheets, tutorial/SFX settings, reload restoration and claim identities are persistent. Compatibility code for older modes/saves remains; cleanup must not remove it merely because it is absent from the current hub navigation.

## Packages

The original three-column shop contains nine types. Purchasing has a 50-per-type capacity; old excess stock is retained and can still be opened. Single opening and selected-type Open All immediately credit food/discovery or duplicate Mastery capacity, with replay protection.

| Type | Completed-order gate |
| --- | ---: |
| Standard | 0 |
| Lucky | 4 |
| Fortunate | 12 |
| Charmed | 24 |
| Blessed | 45 |
| Miraculous | 75 |
| Divine | 120 |
| Fate | 180 |
| Sovereign | 260 |

Previously unlocked types remain unlocked after migration. The first eight distributions retain seven-trial binomial ranks with `p = .08 + .84 * rank / 7`; Sovereign uses `p = .97`. Prices, stock and displayed odds come from the existing production formulas. Sovereign adds no new food rarity or coin tier.

## Design limits

These gates/formulas are implemented values, not validated educational thresholds. The retained [food-only simulation](hub-progression-simulation.json) is numerical evidence, not an accepted pacing guarantee. Reproduce it with `tests/simulate-progression.mjs`; keep new output under ignored `output/`.

The learning goal is procedural fluency rather than speed or repeated clicking. Broader learning assessment, future modes, cosmetic progression and other ideas in historical notes remain proposals unless explicitly requested. Do not revive retired Power/Kitchen systems, old package drops or a demo economy from historical documentation.
