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

## Current implementation

See [Frame 11 implementation and verification](docs/FRAME_11_IMPLEMENTATION.md) for the latest collection UI, Bakery Power, Recipe Mastery, package shop, Undo, independent saved orders and Safari fixes.

## Tests
If Node.js is available, from project root: `node --test tests/smoke.test.mjs`. For gestures, tutorials, sound and visual checks, run the browser and use `tests/worksheet-manual-checklist.md`.

Run all current regression tests with `node --test tests/*.test.mjs`. The focused browser runner is `python tests/browser-frame11.py webkit edge` (Python Playwright plus a downloaded WebKit browser; Edge installed locally). It hosts the static checkout on loopback and uses isolated contexts. Its screenshots are saved in `docs/previews/frame11/`. See the Frame 11 handoff for exact coverage and physical-device limits. The older CDP runners preserve earlier UI fixtures; use the Frame 11 runner for the current collection and purchase flow.

## GitHub Pages
This project is static and does not require a build step. Deploy **all** root files and directories via branch `main` and `/(root)` in GitHub Pages. Preserve `.git` when copying files into your existing clone. A new commit does not erase commit history.

## Refactor notes
Legacy version-specific **source names** were replaced with descriptive `worksheet-*` identifiers, including the frame and protocol, and smoke tests were updated. The persistent `panaderyaQuestV2` localStorage key was intentionally **not** renamed, to preserve existing saves. Gameplay code was otherwise kept as-is rather than silently 'improved'.
