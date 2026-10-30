# Panaderya Quest — instructions for Codex / AI coding agents

## Priority: preserve existing functionality
- The current playable implementation is the **v3 prototype**, only split into files. This refactor is intended to preserve behavior and appearance.
- **Do not rewrite, simplify, or regenerate** `worksheet/v33-engine.html`. This is the original embedded v33 long-multiplication worksheet, including the user's special tapping, connecting, carry actions, animated tutorial arrows, sounds and downward-swipe merging.
- The parent/worksheet interface is an iframe + `postMessage` bridge in `src/game/v33-bridge.js`, which listens for `bc-v33` messages and sends `bc-shell` messages. See also `src/main.js` for iframe loading.
- When tutorial arrows are OFF, there should be no tutorial arrows. Preserve sound feedback on tap/connect/carry.
- Do not alter unrelated screens, game rules, odds, prices, or artwork when asked for a focused edit.

## Architecture
- No framework and **no build**: plain static HTML/CSS/JS so GitHub Pages deploys the root folder unchanged.
- The JavaScript files are **classic scripts**, not ES modules. Their top-level lexical bindings and function declarations intentionally share the browser's global script environment. They must load in the specified order in `index.html`.
- `src/data/catalog.js`: Filipino foods, rarities, ingredient definitions, kitchenware, modes, tutorials.
- `src/game/state.js`: save data, ticket generation and value formulas, event helpers.
- `src/game/rewards.js`: worksheet actions, coin/chest drops, ticket completion.
- `src/game/economy.js`: food levels, fusion, resale, kitchen/decor/staff and slots.
- `src/game/v33-bridge.js`: communication with original v33 engine.
- `src/ui/scene.js`: bakery scene, tickets and older worksheet UI helpers.
- `src/ui/menu.js`: current centerpiece tiled menu and main worksheet shell.
- `src/ui/dialogs.js`: all popup menus, instructions, unlocks and modes.
- `src/main.js`: app render and initialization.
- `styles/base.css`: common styles; `menu.css`: tiled menu; `tickets.css`: vivid tickets; `worksheet.css`: v33 container and responsive adjustments.

## Workflow for small changes
1. Read only the relevant files, and edit only what the user requested.
2. Use Live Server and test visually in the browser.
3. For changes to script logic, run `node --test tests/smoke.test.mjs` if Node is available.
4. For math/touch/sound/tutor changes, additionally test one complete carrying problem (e.g. 79 × 18) with the v33 engine, with arrows on and off.
5. Summarize changed files and any untested behavior. Don't claim unsupported tests passed.
6. Never push to GitHub unless the user explicitly asks to push.

## User's non-negotiable design choices
- The menu grid occupies the center when not solving; tiles show rarity at top, food icon, bottom-left level and bottom-right multiplier; empty purchased slot has plus, unpurchased slot shows Buy Slot with price.
- Rarity-colored order tickets on the right are **filled and shiny**.
- Philippine panaderia foods are the collection focus.
- Coins are guaranteed through mathematical actions, with random chests and grade-dependent rarities.
- The overall Bakery Value Multiplier is a major visible progression score.
- Features unlock gradually for younger players.
