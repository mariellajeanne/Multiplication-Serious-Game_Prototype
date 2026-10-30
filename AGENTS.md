# Panaderya Quest — instructions for Codex / AI coding agents

## Priority: preserve existing functionality
- The current playable implementation is the **v3 prototype**, only split into files. This refactor is intended to preserve behavior and appearance.
- **Worksheet interactions are protected, but its LOOK is NOT frozen.** Keep the tested v33 behaviors: tap/drag rounded digit connection, M × N reveal, placing digits in either order, flexible carry, undo, arrow hints only when tutorial is enabled, synthesized confirmation sounds, and swipe-down addition. The worksheet CSS and visual layout may be redesigned freely when asked. Input geometry/DOM data attributes and JS mechanics may also be refactored, but preserve behavior and test with an entire carrying problem. Never interpret 'preserve v33' as 'do not redesign the worksheet'.
- The parent/worksheet interface is an iframe + `postMessage` bridge. Parent: `src/game/v33-bridge.js`, worksheet: `worksheet/src/parent-bridge.js`; `src/main.js` loads iframe. Worksheet behavior has been split across `worksheet/src/`, while its visuals live in `worksheet/styles/`. The extracted classic JS scripts intentionally share top-level browser bindings, and must load in listed order. For full isolation into ES modules, do a subsequent separately tested refactor.
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

## When user does not know which file
- Discover the relevant files yourself via workspace search and AGENTS.md; NEVER require the user to open or name a file.
- User requests are functional specifications, not file lists. Investigate, implement, test, then summarize files changed.

## Worksheet redesign policy
- `worksheet/styles/custom-theme.css` is the first place for a new art direction, and may override any existing look.
- To change worksheet structure, modify HTML and `worksheet/src/worksheet-render-and-tutorial.js`, with tests.
- The user likes the v33 **actions**, not its visuals. Do not resist asked-for worksheet designs.
