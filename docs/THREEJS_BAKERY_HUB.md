# Playable Three.js bakery hub — 2026-11-09

> Rendering checkpoint, superseded: the [illustrated bakery handoff](ILLUSTRATED_BAKERY.md) describes the current default renderer, complete food refinement, HUD and validation. The economy migration and simulation evidence below remain applicable; Three.js model/renderer descriptions are historical. The current hub uses separate illustrated layers and loads no Three.js runtime.

The owner's complete Three.js redesign request supersedes the Phase 1-only restriction and its earlier art direction. The default page is now the playable bakery. This implementation uses the supplied bakery concept's three-region composition, cream/caramel wood, blush register and warm gold presentation. Food remains the collection focus; the existing multiplication engine remains the learning activity.

## Run locally

Use VS Code Live Server on root `index.html`, or run:

```powershell
python -m http.server 5500 --bind 127.0.0.1
```

Open `http://127.0.0.1:5500/index.html`.

- Default: playable Three.js hub, existing save and real transactions.
- `?view=legacy`: previous collection layout using the current food-only economy. It shares the same save; it is not a separate game or an old-economy sandbox.
- `?view=environment`: retained Phase 1 scenery archive. It loads no game scripts and never reads or writes saves.
- `?view=fallback`: explicitly exercise the accessible non-WebGL presentation and the same gameplay.

No build, npm install, CDN, backend, deployment or Git push is required. Three.js r160 is pinned locally in `assets/vendor/three.module.min.js`, with its MIT license alongside it. This release retains WebGL 1 support for older tablets.

## Reused systems and data flow

| Responsibility | Implementation |
| --- | --- |
| Entry and classic-script dependency order | `index.html`, `src/environment-entry.js` |
| Catalog, saved food ownership, slots, Mastery, tickets and persistence | Existing `src/data/catalog.js`, `src/game/state.js`, `src/game/progression*.js` |
| Package buying/opening, food management and settings | Existing `src/ui/dialogs.js`, `src/ui/menu.js` and their transaction guards |
| Hub presentation and navigation | `src/ui/bakery-hub.js`; `src/main.js` delegates only in the hub view |
| Shared count layout and palette | `src/bakery/layout.js` |
| Shared model/geometry/material factories | `src/bakery/models.js` |
| Orthographic room, cabinet, shelf, window, counter, register and model views | `src/bakery/scene.js` |
| Hub styles, rainbow Boost sparkle, gleam and twinkles | `styles/bakery-hub.css` |
| Worksheet, action ledger, protocol and completion verification | Existing worksheet engine and both bridges; protocol unchanged |

The scene has no independent inventory, wallet or reward model. HTML controls invoke `openPackages`, `startTicket`, food-management actions and existing settings. The adapter reads `g.activeMenu`, `g.owned`, `g.board` and derived `bakeryValue()`. `bakery:sync` invalidates presentation after a render. A dedicated worksheet mount preserves the same iframe and its history during Save & Exit / Resume and dialog visits. Switching orders still captures and restores the existing per-ticket snapshot.

The central cabinet contains equipped foods only. Counts 1, 3, 5, 9 and 16 produce centered layouts; incomplete final rows are centered. Four columns begin above nine foods. Above three rows, contents scroll inside a fixed outer frame. WebGL scissors use the intersection of each cell and the HTML scroll viewport, so models cannot draw outside the cabinet. The outer 3D shell follows measured HTML bounds. Each recipe has a modeled plate, support shelf, back, side glass and front pane. Labels contain only the rainbow sparkle and its individual multiplier; food names and management statistics are in the collection.

The package shelf contains nine distinct modeled containers. Three continuous shelf boards, side posts and a back provide depth. The order board uses actual saved coin tiers and multiplication problems with internal scrolling. The continuous counter supports a pink register with a sloping keypad housing, receipt roll, screen and cash drawer. Text and touch controls stay in HTML.

## Files changed in this implementation

- New runtime files: `src/bakery/layout.js`, `src/bakery/models.js`, `src/bakery/scene.js`, `src/ui/bakery-hub.js`, `styles/bakery-hub.css`, `assets/vendor/three.module.min.js`, `assets/vendor/THREE-LICENSE.txt`.
- Updated entry/rendering: `index.html`, `src/environment-entry.js`, `src/main.js`.
- Updated economy/migration/UI: `src/game/economy-balance.js`, `src/game/progression.js`, `src/game/progression-economy.js`, `src/game/state.js`, `src/game/rewards.js`, `src/ui/dialogs.js`, `src/ui/menu.js`, `src/ui/scene.js`.
- New verification: `tests/bakery-hub.test.mjs`, `tests/browser-hub.py`, `tests/hub-progression-scenarios.json`, `docs/hub-progression-simulation.json`.
- Updated regression fixtures/runners: `tests/bakery-panel.test.mjs`, `tests/economy-balance.test.mjs`, `tests/economy-simulation-engine.js`, `tests/frame11.test.mjs`, `tests/kitchen-removal.test.mjs`, `tests/order-coins.test.mjs`, `tests/packages.test.mjs`, `tests/progression-harness.mjs`, `tests/progression.test.mjs`, `tests/simulate-progression.mjs`, `tests/smoke.test.mjs`, `tests/tablet-ux.test.mjs`, `tests/ux.test.mjs`, `tests/browser-environment.py`, `tests/browser-packages.py`, `tests/browser-worksheet.mjs`.
- Updated handoff pointers: `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/GAME_VISION.md`, `docs/REWARDS_AND_PROGRESSION.md`, `docs/BAKERY_ENVIRONMENT.md`, and this document. Review screenshots are under `docs/previews/hub/`.

The initially modified legacy browser URL changes, Phase 1 environment images/styles and other initial working-tree edits were preserved. The worksheet engine and both protocol bridges were not edited.

## Food-only Boost and old saves

`panaderyaQuestV2` is unchanged. `bakeryHubVersion: 1` marks a one-time migration:

- Total Baker's Boost is `max(1, sum of equipped unique food contributions)`. Recipe contributions retain their existing base, fusion and Mastery formulas.
- Bakery Power's purchase function, progression configuration and sidebar are removed. Neutral `decorBonus()` / `bakeryFactor()` aliases return 1 for compatibility; they have no upgrade effect.
- Old Power level and spent coins are archived in `retiredBakeryPower`. The live compatibility fields become level 1 / spent 0. There is no refund, deletion of earned currency or automatic food replacement.
- Previously unlocked package types are grandfathered. Food investments, discovered recipes, Mastery capacity, slots, stock (including excess above 50), old guaranteed package foods, claim identities and saved worksheet state remain.
- Existing started orders keep their exact saved base, Boost snapshot, budget and pending coins. This is an earned promise, not a hidden Power effect on new orders.
- Future ticks of an active old helper contract lose the retired Power factor. Already earned coins and fractional credit stay intact.
- Old purchase Undo records expire during this migration because their snapshots can restore retired Power. New food/slot Undo still survives reload and uses the existing ten-second safeguards.
- Food, slot, fusion and package price formulas retain their Menu/practice components and resale floor. They no longer contain a Power price factor. Changing stale Power fields cannot affect quotes or new payouts.

The eight coin reward tiers, their probabilities, ticket refresh rules and saved reward-reveal behavior are unchanged. Package tiers remain a different system from coin tiers and food rarities.

## Nine packages and explicit first-pass values

Removing Power requires replacement package unlock criteria. These are implemented first-pass completed-order gates, not empirically validated learning thresholds:

| Package tier | Name | Completed orders |
| --- | --- | --- |
| 1 | Standard | 0 |
| 2 | Lucky | 4 |
| 3 | Fortunate | 12 |
| 4 | Charmed | 24 |
| 5 | Blessed | 45 |
| 6 | Miraculous | 75 |
| 7 | Divine | 120 |
| 8 | Fate | 180 |
| 9 | Sovereign | 260 |

The first eight package food distributions are unchanged exactly: seven-trial binomial rank with `p = .08 + .84 * rank / 7`, rank 0–7. New Sovereign uses the same eight food rarities with `p = .97`. It does not create a ninth food rarity or coin tier. The resulting probabilities, from Classic to Crown Jewel, are approximately:

`0.0000000022%, 0.0000004950%, 0.0000480141%, 0.0025874280%, 0.0836601705%, 1.6230073086%, 17.4924121035%, 80.7982844781%`.

The UI reads the full-precision probabilities from production code. Sovereign uses the existing package price formula at rank 8, including the 1.2× expected-resale floor. All types retain 50 purchasing spaces; old excess stock can still be opened. Opening is independent of buying gates. Duplicates unlock Mastery capacity and do not create extra owned instances or buy upgrades automatically.

## Executed verification

```powershell
node --test tests/*.test.mjs
python tests/browser-hub.py edge webkit
python tests/browser-packages.py edge webkit
python tests/browser-order-coins.py edge webkit
python tests/browser-food-selection.py edge webkit
python tests/browser-environment.py
python tests/browser-responsive.py edge --zoom-only
$env:PANADERYA_TEST_VIEW='hub'
node tests/browser-worksheet.mjs
node tests/simulate-progression.mjs docs/hub-progression-simulation.json
```

The Node suite passes 120 tests, including migrations, probabilities, neutralized Power, transaction replay, failed writes, per-order sessions and worksheet action accounting. Browser checks exercise the actual 3D hub, counts 1/3/5/9/16, both scroll regions, first/middle/highest package purchases, repeated-opening rejection, equipment/Boost updates, Auto Equip, worksheet mount retention, reloads, claim once, reduced motion, fallback and widths 2000, 1194, 1024, 960 and 375. Package, order and food-popup runners cover Edge and WebKit. The archived Phase 1 isolation runner also passes in both engines.

The full worksheet runner executes real `79 × 18 = 1422` and `19 × 9 = 171` cases: tap, mouse/touch drag, incoming/outgoing carries, provisional placement, Guide/Sound ON/OFF, Undo/reveal deduplication, swipe addition, reload before claim and repeated collection. It also completes with missing `findLastIndex`, unavailable animation APIs and dropped first completion deliveries. Obsolete chest-drop expectations in that runner were corrected to the established coin-only rules.

The legacy responsive runner also passes after keeping the new Auto Equip selector in the hub's management view. Actual Edge zoom checks pass at 80%, 100%, 125%, 150% and 200%.

The retained simulator now uses the food-only production formulas. Configuration: `tests/hub-progression-scenarios.json`; seed 20261109, 24 independent trials, three purchase policies, four luck bands, through 300 orders. Exact result: `docs/hub-progression-simulation.json`. It checks coin conservation, finite quotes, unique ownership and package capacity on every order. Balanced/normal median Boost at orders 25/50/100/200/300: 679.68 / 1455.36 / 2762.76 / 4847.76 / 5951.72. All nine package types were opened by all balanced/normal trials; median Sovereign first opening is order 283.

The simulation is evidence of functionality and reachability, not a claim that pacing is final. Purchases become less frequent after most recipes are collected. Across all modeled policies/luck bands, the longest gap without an upgrade purchase is 62 orders. This is a material difference from the retired Power economy and needs owner playtesting before further tuning. Historical Power-era simulation output remains archival; its acceleration and “double Bakery upgrade” targets no longer describe this game.

## Performance and remaining limits

One WebGL renderer uses shared low-poly geometry, cached toon materials and a three-step nearest-filter gradient map. Food and package views share that renderer through viewport/scissor regions. Resolution is capped at 1.35×, with no postprocessing, shadow maps, external textures or continuous WebGL animation loop. Scroll, resize and game changes request a coalesced render. Rainbow animation is lightweight CSS and respects reduced motion. WebGL initialization failure or context loss exposes SVG food/package alternatives with the same controls and state.

The primary composition is 5:3 landscape and scales within other tablet viewports. Narrow portrait uses a compact collection/fallback presentation and a Play Orders action. Physical Samsung Galaxy Tab A7 performance, battery use and touch ergonomics have not been measured. Models are deliberately stylized procedural approximations of the catalog's foods; the supplied concept is a composition/art reference, not a pixel-identical reproduction.

Existing uncommitted work was preserved. Before editing, local branch `backup-pre-threejs-20261109` was created at HEAD without switching branches. A separate OS-temp snapshot also captured all initially modified/untracked files and the working-tree patch. No push or deployment was performed.
