# Panaderya Quest — agent instructions

## The project and the goal
Panaderya Quest is a tablet-first educational incremental bakery game for practicing **long multiplication procedure** after students have learned basic multiplication facts. The user is both designer and product owner. Their priority is a delightful, approachable learning experience, not a complicated bakery-management simulator.

- Start with `docs/GAME_VISION.md` when learning the project, changing gameplay, or making UX decisions.
- Read `docs/REWARDS_AND_PROGRESSION.md` for rewards, economy, bakery, levels, mastery, game modes, and unlocks. It distinguishes **agreed direction** from **proposals** and **existing prototype shortcuts**.
- Read `docs/ARCHITECTURE.md` when refactoring code, debugging, modifying the worksheet or integrating features.
- Read only relevant files for a focused visual edit; do **not** exhaustively reread all docs for every small task.

## Non-negotiable interaction and UX principles
- Preserve the **behavior**, not a particular version's appearance, of the long multiplication worksheet: digit tap/drag connection with rounded capsule, floating `M × N` button revealing product tiles, flexible tile placement and carry handling, downward swipe to merge partial-product rows, satisfying sound effects, and guidance arrows only when tutorial is ON.
- A child's cognitive effort must go toward math. Make rewards immediately comprehensible, controls generous and clear, menus easy to scan, and introduce systems gradually.
- The main screen centers the **food menu grid**; tile top = rarity, center = food illustration/icon, bottom-left = level, bottom-right = food multiplier; purchased empty slots display `+`, unpurchased slots `Buy Slot` plus price. The **Bakery Value Multiplier** is obvious at the top. The right side shows colorful, filled, shiny rarity-coded order tickets.
- Filipino panaderia foods are the collection focus. Passive hired staff are supplemental; active math should be approximately 3×+ stronger at a comfortable solving pace.
- Reward mathematical progress, not repeated clicks; don't pressure students to rush. Preserve a generous tutorial and undo/accidental-tap tolerance.
- Do not change unrelated functionality, game rules, prices, imagery, learning intent, saved data, or layouts when the requested change is narrow.

## Development workflow
- The entire workspace is available: **the user never has to tell you which source file to open**. Search and identify the relevant files yourself.
- For an initial codebase analysis, inspect all relevant files **read-only** and produce a map of functions, screens, data flow, risks, and tests; do not refactor until asked.
- After a substantive accepted implementation/design decision, update appropriate docs so the next Codex conversation can recover the rationale. Distinguish current behavior from proposed changes.
- Static HTML/CSS/JS, no build; VS Code Live Server hosts `index.html`. Classic scripts load in deliberate order and share global lexical bindings; be mindful of this before splitting/refactoring.
- Main app↔worksheet iframe uses a `postMessage` protocol: `src/game/worksheet-bridge.js` and `worksheet/src/parent-bridge.js`. Preserve the protocol contract in both locations. **The `panaderyaQuestV2` localStorage key must remain unchanged unless a tested data migration is requested.**
- For code changes, run `node --test tests/smoke.test.mjs`. For worksheet changes also complete a carrying math case (e.g., 79 × 18), test click and drag, tutorials ON/OFF, sounds ON/OFF, and swipe-to-add. Never claim an unperformed test passed.
- Test manually in Live Server as appropriate, summarize exact files changed, and flag risks. No Git push unless explicitly requested.

## Existing structure
- Data: `src/data/catalog.js`.
- Progress/save/ticket generator: `src/game/state.js`.
- Coins/chests/gameplay run: `src/game/rewards.js`.
- Food levels/fusions/sales, kitchen, decor, staff, modes: `src/game/economy.js`.
- Menu/screens: `src/ui/menu.js`, `src/ui/scene.js`, `src/ui/dialogs.js`.
- Main app entry: `src/main.js`, UI styles: `styles/`.
- Worksheet entry: `worksheet/worksheet-engine.html`; input, placement, carries, add, SFX, render, tutorial, and iframe protocol in `worksheet/src/`; themes in `worksheet/styles/`.

## Naming and refactoring
Use **behavior-based names** such as `worksheet-engine`, `worksheet-bridge`, `renderWorksheet`; do not name permanent components after historical versions such as v33. Do not mass search/replace externally visible data keys without migration. You can redesign the worksheet visuals freely when asked, while keeping the tested interactions unless the user specifically changes them.
