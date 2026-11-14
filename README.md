# My Panaderya

A tablet-first Filipino bakery game for practicing long multiplication. The production game is root `index.html`, with an illustrated bakery, collectible foods, Orders and Packages. It is a static HTML/CSS/JavaScript project with no build step or external runtime dependency.

## Run

Open this folder in VS Code and use Live Server on `index.html`, or run:

```powershell
python -m http.server 5500 --bind 127.0.0.1
```

Visit `http://127.0.0.1:5500/index.html`. `?view=legacy` preserves the earlier collection interface with the same saves; `?view=environment` opens isolated scenery without loading gameplay or touching saves.

## Development

Start with [AGENTS.md](AGENTS.md) for source locations, constraints and browser commands. Current references are [vision](docs/GAME_VISION.md), [architecture](docs/ARCHITECTURE.md), [rewards/progression](docs/REWARDS_AND_PROGRESSION.md) and [UI geometry](docs/UI_GEOMETRY_REFINEMENT.md). The [worksheet guide](worksheet/README.md) covers its engine. Superseded design notes live in `docs/history/`; retired demos and generated artifacts are recoverable from Git history.

```powershell
node --test tests/*.test.mjs
python tests/browser-hub.py edge webkit
python tests/browser-ui-replacement.py edge webkit
$env:PANADERYA_TEST_VIEW='hub'
node tests/browser-worksheet.mjs
```

Python browser runners use Playwright/WebKit and installed Edge; the worksheet runner uses Node 22+ and Edge directly. Tests retain useful fixtures and migration checks. Generated screenshots, logs and temporary outputs are ignored; keep runtime art under `assets/`.

Save compatibility depends on the existing `panaderyaQuestV2` localStorage key and both worksheet bridges. This repository cleanup changes no gameplay or interface design.
