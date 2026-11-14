# My Panaderya - agent guide

Tablet-first static web game for practicing long multiplication. Root `index.html` is the production illustrated bakery. No build, npm install, or CDN is required.

## Start and test

Serve the repository with VS Code Live Server, or `python -m http.server 5500 --bind 127.0.0.1`; open `http://127.0.0.1:5500/index.html`.

- All Node regressions: `node --test tests/*.test.mjs` (minimum for code changes: `node --test tests/smoke.test.mjs`).
- Production integration: `python tests/browser-hub.py edge webkit` and `python tests/browser-ui-replacement.py edge webkit`.
- UI/Orders: `python tests/browser-ui-refinement.py edge webkit` and `python tests/browser-order-presentation.py edge webkit`.
- Worksheet, in PowerShell: `$env:PANADERYA_TEST_VIEW='hub'; node tests/browser-worksheet.mjs`. It exercises real carrying math, click/drag, Undo, swipe addition, settings, reload and one-time claims.
- Layout changes: `python tests/browser-responsive.py`. Environment route: `python tests/browser-environment.py edge webkit`.
- Python browser runners require Playwright, its WebKit browser and installed Edge. Existing local dependencies may live in ignored `.test-tools/`; keep that installation. Worksheet CDP runner needs Node 22+ and Edge. If sandboxed Edge stalls, stop that attempt and rerun with permitted browser-launch access; never claim an unperformed check passed.
- Browser artifacts belong under ignored `output/` or `.test-tools/`, never source/docs. Validate current home at 2000x1200 and 1280x800.

## Production map

- `index.html`, `src/environment-entry.js`: ordered classic-script loading; default hub, preserved `?view=legacy`, isolated scenery at `?view=environment`.
- `src/ui/bakery-hub.js`: illustrated home, collection and shared popups; calls existing game controllers. `src/ui/illustrated-controls.js`: synchronized native scrollbars.
- `styles/bakery-hub.css`, `styles/bakery-interface.css`: current hub/popups. `styles/bakery-preserved-interfaces.css`: original Packages and worksheet shell exceptions. Other loaded styles support shared/legacy interfaces; do not remove them based on age.
- `assets/bakery-ui/`: current artwork, including dynamically named `food-01..17.png` and `coin-01..08.png`. `assets/illustrated/` retains worksheet/package art; `assets/environment/` supports the explicit scenery route; `assets/fonts/` includes font license.
- `src/data/catalog.js`: recipe IDs/content. `src/game/state.js`: saves, migrations, order identities. `progression.js`, `economy-balance.js`, `progression-economy.js`, `economy.js`: formulas and transactions. `rewards.js`: runs, frozen payouts and claims.
- `src/ui/menu.js`, `scene.js`, `dialogs.js`, `bakery-art.js`, `illustrated-art.js`, `reward-feedback.js`: shared/preserved renderers, package controllers and feedback; still active.
- `worksheet/worksheet-engine.html`, `worksheet/src/`, `worksheet/styles/`: multiplication engine and gestures. Both bridges are `src/game/worksheet-bridge.js` and `worksheet/src/parent-bridge.js`.
- `tests/`: regression runners, fixtures and simulations. Keep migration/legacy tests. `docs/hub-progression-simulation.json` is retained numerical evidence.

## Constraints

- Preserve the illustrated composition and original worksheet/Packages visuals unless specifically asked. Current geometry: [UI spec](docs/UI_GEOMETRY_REFINEMENT.md).
- Preserve digit tap/drag connection, rounded capsule, floating product reveal, flexible tile/carry placement, swipe addition, sounds and tutorial-only arrows. Test a carrying case such as 79 x 18 after worksheet changes.
- Classic scripts share global lexical bindings; load order matters. Keep both postMessage bridges in sync, including source/origin/frame/attempt validation and duplicate-action/claim protection.
- Keep `panaderyaQuestV2`, food IDs, ownership, equipment, paid Mastery, prices/odds, saved worksheets and frozen started-order payouts. Boost is food-only; new order claims grant coins, food acquisition comes from packages. Do not reintroduce Bakery Power, Kitchen or a separate demo economy.
- Changes must stay scoped; do not start a Unity port. No reset/discard of existing changes, push or deployment without explicit authorization.

Read [vision](docs/GAME_VISION.md), [architecture](docs/ARCHITECTURE.md) or [progression](docs/REWARDS_AND_PROGRESSION.md) only as relevant. `docs/history/` contains superseded checkpoints/proposals, not current instructions. Normal ripgrep/VS Code searches exclude history, generated output, local test tools and `.agents/` skill data. Source artwork/provenance and historical test fixtures remain available by explicit path.
