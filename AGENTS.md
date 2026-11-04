# Panaderya Quest — agent instructions

**Accelerating economy (2026-11-05):** [Current formulas, migration and simulation evidence](docs/ECONOMY_REBALANCE.md) supersedes earlier prices, doubling coin-tier bases, package gates and the 100-purchase Bakery cap. Power keeps its existing 8.5% gain with 5,000 purchases; prices grow below income, and old assets, unlocked package types and frozen rewards are preserved. Run `node tests/simulate-progression.mjs docs/progression-simulation.json`.

**Packages workspace (2026-11-05):** [Three-column interface and automatic collection](docs/PACKAGES_INTERFACE.md) supersedes separate Buy/Unbox tabs and reward dialogs: all eight types, 50-per-type purchasing capacity (old excess stock retained), immediate food/Mastery credit and selected-type-only Open All. Verify with `python tests/browser-packages.py`.

**Coin-only orders (2026-11-04):** [Order Ticket tiers and rewards](docs/ORDER_COIN_TIERS.md) supersedes package drops, temporary Package Luck and challenge coin modifiers below. New orders pay base coins times saved Baker's Boost; packages come from the Package Counter. Preserve migration of already-earned packages and fixed legacy budgets. Verify with `python tests/browser-order-coins.py` and the full worksheet runner.

**Frame 12 food selection (2026-11-04):** [Floating popup implementation](docs/FOOD_SELECTION_IMPLEMENTATION.md) replaces sheet references: 75%-width single/multi alternatives overlay the grid without resizing it. Verify with `python tests/browser-food-selection.py` and the browser zoom runner.

**Bakery Power wireframe (2026-11-04):** [Current panel](docs/BAKERY_POWER_PANEL.md) supersedes carousel references. The latest owner correction replaces the 40vh cap: the full-height sidebar uses 60% Bakery Power / 40% Packages, with a current-bakery image and fixed action footers; verify with `python tests/browser-bakery-power.py`.

**Viewport layout (2026-11-04):** [Responsive implementation](docs/VIEWPORT_RESPONSIVENESS.md) supersedes fixed layout caps and panel heights. Preserve independent scrolling and run `python tests/browser-responsive.py` for layout changes.

**Compact Menu header (2026-11-04):** [Current layout](docs/MENU_HEADER_IMPLEMENTATION.md): bakery icon/name/Settings grouped left, clickable Boost/Coins counters right, no standalone topbar or Menu heading.

**Kitchen removed (2026-11-04):** See [removal and migration](docs/KITCHEN_REMOVAL.md). Do not reintroduce Kitchen tools, tabs or bonuses. Existing saves discard obsolete equipment fields; the save key and saved order budgets remain unchanged.

**Current owner corrections (2026-11-04):** [Tablet UX implementation](docs/TABLET_UX_IMPLEMENTATION.md) and [Unity migration reference](UNITY_MIGRATION_REFERENCE.md) supersede Frame 11 on duplicate ownership: one owned instance per Food Index recipe, duplicates unlock paid-Mastery capacity, slots cap at the complete Food Index. Legacy modes are outside this phase and remain unchanged. Keep the web prototype reliable; do not begin a Unity port.

Current behavior and verification: [docs/FRAME_11_IMPLEMENTATION.md](docs/FRAME_11_IMPLEMENTATION.md) (2026-11-04). Frame 11 supersedes older layout/cap references: all owned foods, one starting slot, duplicate-unlocked unbounded Recipe Mastery, Bakery Power with 100 internal purchases, coin packages, safe ten-second Undo and persistent independent order worksheets. Keep both bridges in sync. Run `node --test tests/*.test.mjs` and the focused WebKit/Edge runner when changing these paths.

## The project and the goal
Panaderya Quest is a tablet-first educational incremental bakery game for practicing **long multiplication procedure** after students have learned basic multiplication facts. The user is both designer and product owner. Their priority is a delightful, approachable learning experience, not a complicated bakery-management simulator.

- Start with `docs/GAME_VISION.md` when learning the project, changing gameplay, or making UX decisions.
- Read `docs/REWARDS_AND_PROGRESSION.md` for rewards, economy, bakery, levels, mastery, game modes, and unlocks. It distinguishes **agreed direction** from **proposals** and **existing prototype shortcuts**.
- Read `docs/ARCHITECTURE.md` when refactoring code, debugging, modifying the worksheet or integrating features.
- Read only relevant files for a focused visual edit; do **not** exhaustively reread all docs for every small task.
- Latest visual pass: `docs/BAKERY_COMPONENT_REVIEW.md`. References are aesthetic guidance only: no scenic wallpaper or translucent UI over an illustration. Theme the actual components with paper, light wood, pastry-box motifs, illustrated icons and shared rounded sans-serif type. The owner subsequently authorized Stage C/D; see `docs/STAGE_C_D_IMPLEMENTATION.md` for implemented eight ranks, Level/Tier 5 conservation, Auto Equip, five tickets/3-minute refresh, Bakery 30, migration and tests. Preserve the accepted component theme.

## Non-negotiable interaction and UX principles
- Preserve the **behavior**, not a particular version's appearance, of the long multiplication worksheet: digit tap/drag connection with rounded capsule, floating `M × N` button revealing product tiles, flexible tile placement and carry handling, downward swipe to merge partial-product rows, satisfying sound effects, and guidance arrows only when tutorial is ON.
- A child's cognitive effort must go toward math. Make rewards immediately comprehensible, controls generous and clear, menus easy to scan, and introduce systems gradually.
- The main screen centers the **food menu grid**. Latest approved layout: upper-left food multiplier/base, upper-right rarity, center food art/name, lower level/tier contributions and direct Level Up/Fuse controls. Purchased empty slots display `+`; unpurchased slots show `Buy Slot` and price. Integrate **Menu, Bakery Value Multiplier and yellow wallet** above the grid; colorful rarity-filled order tickets sit right. See `docs/ANNOTATION_REDESIGN.md` for the newest user-directed layout and validation status.
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
- Deterministic progression/migration: `src/game/progression.js`; economy transactions/formulas: `src/game/progression-economy.js`.
- Progress/save/ticket generator: `src/game/state.js`.
- Coins/chests/gameplay run: `src/game/rewards.js`.
- Food levels/fusions/sales, decor, staff, modes: `src/game/economy.js`.
- Menu/screens: `src/ui/menu.js`, `src/ui/scene.js`, `src/ui/dialogs.js`.
- Main app entry: `src/main.js`, UI styles: `styles/`.
- Worksheet entry: `worksheet/worksheet-engine.html`; input, placement, carries, add, SFX, render, tutorial, and iframe protocol in `worksheet/src/`; themes in `worksheet/styles/`.

## Naming and refactoring
Use **behavior-based names** such as `worksheet-engine`, `worksheet-bridge`, `renderWorksheet`; do not name permanent components after historical versions such as v33. Do not mass search/replace externally visible data keys without migration. You can redesign the worksheet visuals freely when asked, while keeping the tested interactions unless the user specifically changes them.
