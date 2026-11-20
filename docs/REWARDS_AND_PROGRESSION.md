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

The production Packages station uses a horizontal carousel in the pink half of one shared rounded interior fitted to the wooden aperture with a single thick dark-brown outline and no drop shadow, initially centered on the highest discovered type. Its tier/name label stays below the illustration, with larger type on landscape phones. A vertical divider separates the cream details section. The title and discovery occupy one rounded header, whose entire lower section is the progress track. The three odds share one rounded group with row dividers, ordered from highest rarity to lowest; opening buttons remain in a separate row. On short landscape phones the scene extends behind transparent floating HUD/navigation containers. All three kiosks fit their important content between the HUD and navigation, keeping source artwork proportions while preserving readable text and 44px controls. Only the lower decorative bases may overlap navigation; food/order lists and additional saved-stock controls scroll within their panels when needed. Only the immediate next undiscovered type appears, as a Gift-shaped silhouette; names, artwork, odds and purchase actions stay hidden until discovery. Each discovered type has exactly three food rarities in a non-scrolling odds panel. Purchasing retains the 50-per-type capacity; old excess stock can still be opened. Single/batch opening immediately credits food discovery or duplicate Mastery capacity, with replay protection.

| Type | Coins earned since previous discovery | Food rarities |
| --- | ---: | --- |
| Gift | 0 | Classic, Favorite, Special |
| Surprise | 5,000 | Favorite, Special, Premium |
| Mystery | 50,000 | Special, Premium, Deluxe |
| Secret | 300,000 | Premium, Deluxe, Signature |
| Enchanted | 1,800,000 | Deluxe, Signature, Masterpiece |
| Mythical | 8,000,000 | Deluxe, Signature, Masterpiece |
| Cosmic | 30,000,000 | Signature, Masterpiece, Crown Jewel |
| Divine | 120,000,000 | Signature, Masterpiece, Crown Jewel |

`PACKAGE_DISCOVERY_COINS` in `src/game/progression.js` is the tuning source. Collected order rewards, staff production and validated Co-Baker bonuses count. Starting coins, saved balances, adjustments, Undo refunds and food resale do not. Spending never reduces progress. Each qualifying grant can discover only one type, resets `coinsEarnedSinceLastDiscovery` to zero, and discards excess discovery progress without removing wallet coins or lifetime statistics. Reward receipts, wallet and discovery save together. Migration preserves old order-gated/grandfathered unlocks and initializes the new counter once at zero.

These thresholds are preliminary: the starter order quote is 367 coins at ×1.20 Boost. `node tests/simulate-package-discovery.mjs output/package-discovery-balance.json` exercises real prices, food growth and expected step payouts across 12 seeds, three purchase policies and four ticket-luck scenarios. Normal balanced play predicts median discoveries at orders 4, 7, 10, 16, 26, 40 and 64; unfavorable tickets extend Divine to 95. Exclusively starter-tier tickets can exceed 200 orders. Golden bonuses, staff and helper bonuses are omitted from the model; observed player pacing should guide further tuning. No reward rates or package prices changed.

New package distributions normalize the previous binomial weights within the owner's three approved rarities. The price growth curve remains; the existing resale safeguard covers the new reward set without lowering the historical price floor. Displayed odds and actual draws share the same function.

Previously unlocked types remain unlocked. Migration preserves old stock distributions and guaranteed rarities without rolling rewards. Former ninth-tier stock joins Divine while retaining its historical distribution; pre-rolled receipts retain every reward. No ninth type is displayed or sold. Existing worksheet payouts, foods and paid Mastery are preserved.

## Design limits

These gates/formulas are implemented values, not validated educational thresholds. The retained [food-only simulation](hub-progression-simulation.json) is numerical evidence, not an accepted pacing guarantee. Reproduce it with `tests/simulate-progression.mjs`; keep new output under ignored `output/`.

The learning goal is procedural fluency rather than speed or repeated clicking. Broader learning assessment, future modes, cosmetic progression and other ideas in historical notes remain proposals unless explicitly requested. Do not revive retired Power/Kitchen systems, old package drops or a demo economy from historical documentation.
