# Panaderya Quest — VS Code edition

This is the **same playable Panaderya Quest v3** refactored from one large HTML file into separate files. It is still a static browser game, built for fast local editing and GitHub Pages.

## Run in VS Code on Windows (fastest route)

1. Extract the ZIP to a folder, e.g. `C:\UnityProjects\PanaderyaQuest`.
2. VS Code → **File → Open Folder…** → select the folder containing `index.html`.
3. Extensions (`Ctrl+Shift+X`) → install **Live Server** by Ritwick Dey (`ritwickdey.LiveServer`).
4. Right-click `index.html` → **Open with Live Server** (or click **Go Live** in the bottom-right status bar).
5. A browser opens at `http://127.0.0.1:5500/`. Save files with `Ctrl+S` to refresh the page automatically.

**Do not open `index.html` by double-clicking it directly**; run through a web server so the external worksheet iframe loads reliably.

### Other run options

If Python is installed, run `py -m http.server 5500` in the project folder and open `http://localhost:5500` (refresh manually after edits). No `npm install`, compilation, or Vite setup is required.

## Where to edit things

| Task | Files |
|---|---|
| Change menu tile appearance, slot or placement | `styles/menu.css`, `src/ui/menu.js` |
| Change ticket rarity colors / shine | `styles/tickets.css` |
| Change food names, icons, base values, rarity | `src/data/catalog.js` |
| Change tickets / Luck / chest drops | `src/game/state.js`, `src/game/rewards.js`, `src/game/v33-bridge.js` |
| Change upgrades / ingredients / fusion / reselling | `src/game/economy.js` |
| Change popups, modes, tutorial text | `src/ui/dialogs.js` |
| Change bakery scene / sidebars | `src/ui/scene.js` |
| Change worksheet shell / reward jar | `src/ui/menu.js`, `styles/worksheet.css` |
| Change multiplication connection/carry/sounds | `worksheet/v33-engine.html` (**only when explicitly requested**) |
| Change app startup / iframe loading | `src/main.js` |

## Tests

If Node.js is installed: `node --test tests/smoke.test.mjs`. These are structural/syntax checks, **not** a substitute for manually testing touch and audio.

## GitHub Pages

Copy the contents of this folder to the **root** of the existing Git repository (keep `.git`), `git add -A`, commit and push to `main`. In Settings → Pages, use `Deploy from a branch`, `main`, `/(root)`.

Unlike the older single-file version, GitHub Pages **needs the `src/`, `styles/`, and `worksheet/` folders**; do not upload only `index.html`.

## Use Codex in VS Code

Install the official **Codex – OpenAI's coding agent** extension (`OpenAI.chatgpt`), click Codex, and choose **Sign in with ChatGPT**, using your usual ChatGPT account. It can read and change the opened project directly. It will read `AGENTS.md` for coding guidance. For details see https://developers.openai.com/codex/ide.

Example request: "Change ONLY `styles/menu.css` so the food tiles are 10% taller. Preserve all text, grid positions, worksheet behavior and reward logic. Show a diff and test." Review the changes before committing.

Note: the Codex chat in VS Code is a separate conversation from this ChatGPT thread; account sign-in does not automatically migrate the full chat history. `AGENTS.md` preserves key constraints.
