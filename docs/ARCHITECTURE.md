# Production architecture

My Panaderya is a static site. Root `index.html` declares the stylesheet and classic-script order; `src/environment-entry.js` downloads those scripts together and executes them in declaration order with `async=false`. Default is the illustrated hub. `?view=legacy` uses the preserved interface with the same game/save; `?view=environment` mounts only scenery and never loads game state, migrations or timers.

The startup overlay keeps gameplay inert until required scripts, fonts, decoded artwork and initial rendering finish. The progress bar counts completed resource/readiness tasks, not elapsed time. Skip becomes available only during optional decoration preloading; required failures keep gameplay blocked and offer a full-page Retry. Missing bootstrap files have an HTML-level recovery handler. `window.bakeryLoading` and the `bakery-required-ready` / `bakery-playable` performance marks expose actual readiness for QA.

## Source and data flow

| Responsibility | Source |
| --- | --- |
| Food catalog, modes and content IDs | `src/data/catalog.js` |
| Pure progression/migrations and pricing formulas | `src/game/progression.js`, `economy-balance.js` |
| Persistent state, equipment, ticket generation/refresh | `src/game/state.js` |
| Transactions, Mastery, packages, slots, Undo | `src/game/progression-economy.js`, `economy.js` |
| Order runs, quotes, budgets and one-time claims | `src/game/rewards.js` |
| Production illustrated home, collection and shared popups | `src/ui/bakery-hub.js` |
| Three approved stations, world positions, finite camera and fixed controls | `src/ui/bakery-scenes.js`, `styles/bakery-scenes.css` |
| Runtime asset paths and startup readiness | `src/bakery-assets.js`, `src/environment-entry.js`, `styles/loading.css` |
| Native scrolling with illustrated rails | `src/ui/illustrated-controls.js` |
| Shared/preserved menus, package shop, dialogs and art | Other files in `src/ui/` |
| Main render, lifecycle and timers | `src/main.js` |
| Parent worksheet mount and protocol | `src/game/worksheet-bridge.js` |
| Child math engine | `worksheet/worksheet-engine.html`, `worksheet/src/` |

The hub reads `g.activeMenu` and `g.owned`, derives food contributions/Boost, and renders `g.board` with `g.orderRuns` progress. It invokes existing production controllers rather than maintaining another catalog/economy. The Packages station and its vertical selector use the existing eight-tier batch-purchase controllers and three-rarity distributions.

The current world keeps equal 220-unit visible gaps between Packages, Menu and Orders, with station scale .92 and independent viewport fitting. The floor-rich interior has a proportional 3:1 horizontal extension. Only scenery receives `--bakery-background-blur` (default `0px`). Source-approved frames remain backed up; only the lower-center Packages ribbon patch changes. Runtime WebP exports and exact edit briefs are recorded in `assets/bakery-runtime/provenance.json` and reproduced by `scripts/prepare-refinement-art.py`. Menu/Orders runtime RGBA pixels match their original PNGs exactly. HUD/navigation are siblings of the moving world, and the pink View All Foods action belongs to the Menu frame.

The hub adapter routes the original Packages shop and worksheet shell through preserved renderers/art. Their styles live in `styles/bakery-preserved-interfaces.css`; current home/popups use `bakery-hub.css` and `bakery-interface.css`. All stylesheets referenced by the root and worksheet entries are active, including shared/legacy layers. Current visuals and structural anchors are in [UI geometry](UI_GEOMETRY_REFINEMENT.md).

Food and coin sprite filenames are constructed dynamically; the absence of a literal filename in source does not make an asset unused. Worksheet/package SVGs also reference image atlases. The explicit environment route has separate WebP layers. The retired Three.js renderer and standalone demo are absent from production.

## Persistence and worksheet contract

`panaderyaQuestV2` is a compatibility contract. `state.js` and `progression.js` migrate old records, preserving ownership/investment, unlocked package types, excess stock, legacy reward promises, order identities, claim records and saved worksheet state. Retired Power fields are neutral compatibility data, not active bonuses.

Classic scripts share top-level lexical bindings. Their order in both HTML entries is significant; they are not independent ES modules. Avoid introducing colliding globals or casually changing load order.

The parent bridge and `worksheet/src/parent-bridge.js` exchange `postMessage` commands and state. Source markers are `bc-shell` toward the child and `pq-worksheet` toward the parent. Preserve origin/frame/attempt checks, ready/start/state/complete acknowledgements, sound/tutorial/layout controls and retry delivery.

A run owns its worksheet snapshot and an append-only action ledger. Accepted mathematical actions use stable attempt/row/column/kind identities; duplicate messages and Undo/replay cannot grant rewards twice. Started orders keep frozen budgets. Completion/claim are independently guarded. The iframe is retained across dialogs and pause/resume; saved worksheets restore after reload. Geometry/animation feedback must never determine reward eligibility.

The worksheet owns math input, placement, carries, partial-row addition, guides and SFX. The parent owns game rewards. See [worksheet source guide](../worksheet/README.md) for module responsibilities.

## Validation and history

Use [AGENTS.md](../AGENTS.md) for exact Node and Edge/WebKit commands. Browser integration covers package purchases/opening, duplicate Mastery capacity, upgrades, equipment/Boost, saves, retained worksheet mounts and claims. Worksheet regression covers carrying, tap/drag/swipe, settings and degraded APIs/delivery. Fixtures under `tests/fixtures/` are test inputs/baselines, not disposable output.

`docs/history/` preserves earlier decisions, proposals and numerical comparisons. They do not override current code/specifications. `tests/check-economy-results.mjs` validates a historical Power-era dataset explicitly; the current food-only simulator is `tests/simulate-progression.mjs`. Write fresh reports under ignored `output/`, for example `node tests/simulate-progression.mjs output/progression.json` after creating `output/`.
