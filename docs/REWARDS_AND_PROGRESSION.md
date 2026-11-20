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

The production Packages station uses a vertical selector with exactly eight types. Each has exactly three food rarities in a non-scrolling odds panel. Purchasing retains the 50-per-type capacity; old excess stock can still be opened. Single/batch opening immediately credits food discovery or duplicate Mastery capacity, with replay protection.

| Type | Completed-order gate | Food rarities |
| --- | ---: | --- |
| Gift | 0 | Classic, Favorite, Special |
| Surprise | 4 | Favorite, Special, Premium |
| Mystery | 12 | Special, Premium, Deluxe |
| Secret | 24 | Premium, Deluxe, Signature |
| Enchanted | 45 | Deluxe, Signature, Masterpiece |
| Mythical | 75 | Deluxe, Signature, Masterpiece |
| Cosmic | 120 | Signature, Masterpiece, Crown Jewel |
| Divine | 180 | Signature, Masterpiece, Crown Jewel |

New package distributions normalize the previous binomial weights within the owner's three approved rarities. The price growth curve remains; the existing resale safeguard covers the new reward set without lowering the historical price floor. Displayed odds and actual draws share the same function.

Previously unlocked types remain unlocked. Migration preserves old stock distributions and guaranteed rarities without rolling rewards. Former ninth-tier stock joins Divine while retaining its historical distribution; pre-rolled receipts retain every reward. No ninth type is displayed or sold. Existing worksheet payouts, foods and paid Mastery are preserved.

## Design limits

These gates/formulas are implemented values, not validated educational thresholds. The retained [food-only simulation](hub-progression-simulation.json) is numerical evidence, not an accepted pacing guarantee. Reproduce it with `tests/simulate-progression.mjs`; keep new output under ignored `output/`.

The learning goal is procedural fluency rather than speed or repeated clicking. Broader learning assessment, future modes, cosmetic progression and other ideas in historical notes remain proposals unless explicitly requested. Do not revive retired Power/Kitchen systems, old package drops or a demo economy from historical documentation.
