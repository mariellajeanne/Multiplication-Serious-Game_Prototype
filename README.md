# Panaderya Quest — modular VS Code project

A Filipino bakery-themed long-multiplication serious game, built as a static website with independent UI, economy and worksheet source files.

**Latest visual refinement:** [Die-cut order slips, tier effects, fixed controls and grounded register](docs/ORDER_PRESENTATION.md), following the [header/architectural/popup cleanup](docs/UI_REFINEMENT.md). The actual root app retains the existing worksheet, package shop and saved-game systems.

**Current production UI (2026-11-09):** root `index.html` now uses the complete repaired ZIP interface, connected to real game state. The original multiplication worksheet and existing Packages shop are preserved. See [production UI replacement](docs/PRODUCTION_UI_REPLACEMENT.md) for files, backup, art mapping and verification. The standalone ZIP folder is a visual reference, not the running game.

## Quick start (Windows, VS Code)

The default page is the **playable illustrated bakery hub**. Open root `index.html` with Live Server, or run `python -m http.server 5500 --bind 127.0.0.1` and visit `http://127.0.0.1:5500/index.html`. No install/build or CDN is required. See [illustrated bakery, complete food collection and validation](docs/ILLUSTRATED_BAKERY.md). `?view=legacy` retains the previous collection layout with the shared food-only economy; `?view=environment` retains the isolated Phase 1 scenery archive.

1. Extract the project into a folder and **File → Open Folder** in VS Code (select folder containing `index.html`).
2. Install **Live Server** (Ritwick Dey). Open root `index.html` and choose **Open with Live Server**.
3. Your browser opens a localhost page. Save edits with `Ctrl+S` and Live Server refreshes it.
4. For Codex, install the official **Codex – OpenAI's coding agent** extension, sign in with ChatGPT, and open the **entire folder**. The user does not need to know which file to edit.
5. Paste the starter prompt in [`docs/FIRST_CODEX_MESSAGE.md`](docs/FIRST_CODEX_MESSAGE.md) for a full codebase analysis **without changing code**.

## Reference documents for Codex
- [`AGENTS.md`](AGENTS.md) — concise working rules and pointers.
- [`docs/GAME_VISION.md`](docs/GAME_VISION.md) — learning objective, target experience and precise worksheet/visual interaction requirements.
- [`docs/REWARDS_AND_PROGRESSION.md`](docs/REWARDS_AND_PROGRESSION.md) — agreed reward systems, modes, future ideas and open decisions.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — file map, messaging and saved-data contracts, tests.
- [`worksheet/README.md`](worksheet/README.md) — worksheet breakdown and manual test expectations.

## Current implementation

The [production UI replacement](docs/PRODUCTION_UI_REPLACEMENT.md) is current. Its illustrated environment, cabinet, clipboard, HUD, navigation, food art and shared popup design come from the repaired ZIP; live values and actions come from the production game. All 17 recipes and nine package tiers remain available through their real progression. The worksheet and Packages popup retain their original designs. Bakery Power remains removed, Boost comes from equipped foods, and saved progress and started-order payouts are preserved. Earlier documents below describe historical checkpoints.

See [Tablet UX implementation](docs/TABLET_UX_IMPLEMENTATION.md) for current unique-food ownership, all fifteen audit fixes and browser evidence. The final platform is Unity; [UNITY_MIGRATION_REFERENCE.md](UNITY_MIGRATION_REFERENCE.md) is the tested behavior/formula handoff. No Unity migration has started.

See [Frame 11 implementation and verification](docs/FRAME_11_IMPLEMENTATION.md) for the latest collection UI, Bakery Power, Recipe Mastery, package shop, Undo, independent saved orders and Safari fixes.

## Tests
If Node.js is available, from project root: `node --test tests/smoke.test.mjs`. For gestures, tutorials, sound and visual checks, run the browser and use `tests/worksheet-manual-checklist.md`.

Run all regression tests with `node --test tests/*.test.mjs`. The current integration runner is `python tests/browser-hub.py edge webkit` (Python Playwright and its WebKit browser, plus installed Edge). Screenshots go to `.test-tools/hub-shots/`. To run real carrying, tap/drag and swipe checks through the hub in PowerShell, set `$env:PANADERYA_TEST_VIEW='hub'` and run `node tests/browser-worksheet.mjs`. Reproduce the food-only progression report with `node tests/simulate-progression.mjs docs/hub-progression-simulation.json`. See the hub handoff for focused package/order/selection checks and physical-device limits. Earlier Power-panel browser fixtures are historical.

## GitHub Pages
This project is static and does not require a build step. Deploy **all** root files and directories via branch `main` and `/(root)` in GitHub Pages. Preserve `.git` when copying files into your existing clone. A new commit does not erase commit history.

## Refactor notes
Legacy version-specific **source names** were replaced with descriptive `worksheet-*` identifiers, including the frame and protocol, and smoke tests were updated. The persistent `panaderyaQuestV2` localStorage key was intentionally **not** renamed, to preserve existing saves. Gameplay code was otherwise kept as-is rather than silently 'improved'.
