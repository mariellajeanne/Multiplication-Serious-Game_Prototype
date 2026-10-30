# Panaderya Quest — modular VS Code project

A Filipino bakery-themed long-multiplication serious game, built as a static website with independent UI, economy and worksheet source files.

## Quick start (Windows, VS Code)
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

## Tests
If Node.js is available, from project root: `node --test tests/smoke.test.mjs`. For gestures, tutorials, sound and visual checks, run the browser and use `tests/worksheet-manual-checklist.md`.

The full regression suite is `node --test tests/smoke.test.mjs tests/worksheet-session.test.mjs tests/worksheet-rewards.test.mjs tests/ux.test.mjs`. With Node 22+ and Edge installed, `node tests/browser-worksheet.mjs` tests the complete tablet/phone order flow; `node tests/browser-ux.mjs` checks dialogs, four viewport sizes and reduced-motion feedback. Both accept a Chromium/Edge executable path as their first argument and use isolated private temporary profiles. See [`docs/UX_AUDIT.md`](docs/UX_AUDIT.md) for the redesign rationale, exact validation and remaining physical-device/child-testing needs.

## GitHub Pages
This project is static and does not require a build step. Deploy **all** root files and directories via branch `main` and `/(root)` in GitHub Pages. Preserve `.git` when copying files into your existing clone. A new commit does not erase commit history.

## Refactor notes
Legacy version-specific **source names** were replaced with descriptive `worksheet-*` identifiers, including the frame and protocol, and smoke tests were updated. The persistent `panaderyaQuestV2` localStorage key was intentionally **not** renamed, to preserve existing saves. Gameplay code was otherwise kept as-is rather than silently 'improved'.
