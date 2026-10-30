# Architecture, code map, and constraints

## Running/deploying
- Static site: root `index.html` imports classic scripts in precise order and CSS from `styles/`; use VS Code Live Server or any static local HTTP server. **No npm build or compilation.** Root GitHub Pages can deploy all files.
- Data/saves stored via `localStorage` key **`panaderyaQuestV2`**. This key is a compatibility contract, NOT a code-version label to rename casually. An update that changes its format needs a migration plan.
- Two browser documents: main page and an iframe for the interactive multiplication worksheet. They exchange `window.postMessage` notifications; `src/game/worksheet-bridge.js` is main side, `worksheet/src/parent-bridge.js` is worksheet side. Source markers must agree (`bc-shell` into worksheet, `pq-worksheet` back to main) and origin/iframe validation should be respected. Avoid dropping event data or breaking ready/start/state/complete/sound/tutorial controls.
- Some worksheet modules were conservatively separated into **classic scripts sharing top-level lexical bindings**; they are not self-contained ES modules. Their order in `worksheet/worksheet-engine.html` is significant. Refactoring to explicit module imports is possible, but must be deliberately staged and tested.

## Major files
| Responsibility | Files |
|---|---|
| Food catalog, ingredients, modes, tutorial copy | `src/data/catalog.js` |
| Store/load progress, menu value, rarity ticket generator | `src/game/state.js` |
| Action rewards, luck, chest selection, ticket sessions | `src/game/rewards.js` |
| Food upgrade/fusion/sale, kitchen, decor, staff, mode changes | `src/game/economy.js` |
| Parent iframe/session state and messaging | `src/game/worksheet-bridge.js` |
| Main render/bootstrap | `src/main.js` |
| Center menu, slots, in-progress worksheet wrapper | `src/ui/menu.js` |
| Bakery rail/ticket board/scene | `src/ui/scene.js` |
| Dialogs, settings, upgrade menus, onboarding | `src/ui/dialogs.js` |
| CSS design | `styles/base.css`, `menu.css`, `tickets.css`, `worksheet.css` |
| Worksheet HTML and script order | `worksheet/worksheet-engine.html` |
| Worksheet math state | `worksheet/src/state.js` |
| Sound and multiplication visual feedback | `worksheet/src/sound-and-multiplication-fx.js` |
| Placement / carry logic | `worksheet/src/product-placement.js` |
| Downward addition / partial products | `worksheet/src/partial-product-addition.js` |
| Math layout and tutorial arrow rendering | `worksheet/src/worksheet-render-and-tutorial.js` |
| Hitboxes, gestures, rounded capsule connection | `worksheet/src/tap-and-drag.js` |
| Worksheet UI settings and gestures | `worksheet/src/worksheet-controls.js` |
| Worksheet → parent bridge | `worksheet/src/parent-bridge.js` |
| Embedded-app-specific controls | `worksheet/src/embedded-controls.js` |
| Worksheet styles | `worksheet/styles/foundation.css`, `effects-and-guides.css`, `receipt-theme.css`, `embedded-layout.css`, `custom-theme.css` |
| Testing guidance | `tests/smoke.test.mjs`, `tests/worksheet-manual-checklist.md` |

## Known refactoring/implementation cautions
- The worksheet parent bridge currently handles `start`, `restart`, and `sound` messages, but the main app also sends `tutorial`. Verify that this toggle actually reaches the worksheet and updates arrow guidance; don't treat the existence of a toggle button as evidence that it works. The first Codex audit should flag or test this mismatch.
- A lot of code is extracted from a one-file prototype, including DOM-template strings and global functions. Avoid treating filenames as clean architecture boundaries without inspection.
- Main app sends commands and receives worksheet progress to calculate coins/chests. Do not create independent reward payouts inside iframe; it is a math-input engine.
- When renaming an iframe element ID or a message source string, change BOTH sender and receiver and relevant tests. Never blindly replace persistent storage keys or public APIs.
- The worksheet's visual theme is **not fixed**; specifically requested changes can modify HTML/CSS or even input architecture, but preserve interaction semantics and run carrying/touch regression tests.
- For UI tweaks, update only relevant visuals; for math logic and bridge changes, run end-to-end checks (e.g. `79 × 18 = 1422`, tutorial arrows on/off, sound toggles, dragging/carry placement, downward swipe).

## Verification checklist
1. `node --test tests/smoke.test.mjs` from repo root (syntax/import order/basic references).
2. Serve with Live Server and confirm main menu grid/ticket board and food multiplier.
3. Choose ticket, complete product/carry sequence and final addition, earn coins and chests, collect a Filipino food.
4. Toggle arrows OFF (none should render), ON (only next-step hints), toggle sound/mute.
5. Check slots and coin deductions, food upgrades/fusions, reload/saved state, and mobile/tablet layout.
6. Summarize what was actually tested, what failed and what's still exploratory.
