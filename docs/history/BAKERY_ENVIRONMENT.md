> Historical checkpoint. These notes preserve past decisions and proposals; they are not current implementation instructions. Start with [AGENTS.md](../../AGENTS.md), [architecture](../ARCHITECTURE.md) and [current UI geometry](../UI_GEOMETRY_REFINEMENT.md). Generated screenshots/backups and retired prototype source are recoverable from Git history.

# My Panaderya — Phase 1 bakery environment

**Archive notice (2026-11-09):** The owner subsequently requested the full [playable Three.js redesign](THREEJS_BAKERY_HUB.md). The implementation below remains available at `index.html?view=environment`, isolated from saves. Default `index.html` is now the playable hub; the original Phase 1-only restriction no longer governs current work. The following text records the earlier scope and art decisions.

Owner request and art-direction correction: 2026-11-08. Work remains on `main`; the owner preserved the earlier implementation on `old`. No push or deployment is part of this work.

## Current scope and visual direction

The default `index.html` is an environment-only view. The Frame 13 wireframe supplies the three-region composition: room for packages on the left, a dominant central wall for a future expanding showcase, and room for tickets on the right. The five newly supplied game-art attachments are strict references for illustration and rendering style only. Their workshop subject matter, characters, tools, text, blue/red palette and layout are not copied.

The owner rejected the previous painterly, ornate direction. All scenery masters, wall/counter crops and the register were replaced with new artwork; this revision does not reuse or recolor the old architecture.

Current rendering uses clean geometric silhouettes, deliberate dark cocoa/plum-brown outlines, distinct light/midtone/shadow planes, crisp angular cast shadows and contrasting edge highlights. The palette combines cream, milk-tea/caramel wood, dusty blush/pink and selective golden-yellow light accents. Large cream surfaces remain bright; substantial cocoa shadows and blush regions provide color contrast. Small lighting gradients provide polish without replacing the hard-edged cel shading.

The room has straight square structural posts and ceiling beams, a cream central wall with sparse stepped-square color blocking, simple geometric box pendant lights, flat rectangular side panels, and a continuous modern cream worktop over caramel/blush cabinet panels. A separate modern POS register has a blank dark screen, cream/blush housing and an angular stand. It is scenery only, with no interaction. Arches, carved trim, floral tiles, foliage, realistic wood grain, antique fixtures and the vintage keyed register have been removed.

There are no food showcases, food cards, package shelves, tickets, title/header controls, popups, clickable regions, or placeholder gameplay elements. This explicitly supersedes older documents' prohibition on illustrated interiors and their main-screen layout prescriptions for the default view. The existing game is retained for subsequent integration. Phase 2 is not authorized.

## Entry points and save preservation

- `index.html`: scenery only. Hidden and inert `#app`, `#modals`, and `#notificationDock` roots remain available for the preserved game.
- `index.html?view=legacy`: loads the previous playable UI with its original CSS, script dependency order, worksheet and behavior.
- `src/environment-entry.js` reads the view parameter. Gameplay script declarations in the HTML are inert data blocks until the legacy entry point explicitly loads each as a classic script, awaiting completion in order.
- Default viewing does not execute `state.js`, migrations, random ticket generation, staff/refresh timers, worksheet mounting, visibility/pagehide saves, or any other gameplay code. It never reads or writes `panaderyaQuestV2`.
- Original gameplay source files and both worksheet bridges are unchanged. No economy formulas, save fields, persistent keys, prices, assets used by the legacy UI, or mathematical interactions were modified.

Existing browser regression runners now open `?view=legacy`, preserving their original purpose after the default entry-point change.

## Layers and future integration

`styles/bakery-environment.css` scopes its page overrides to `body[data-view="environment"]`. The environment is fixed to the available viewport, including dynamic viewport height, with no external frame or margins. Layers use a local stacking context:

| Layer | Element | Purpose |
| --- | --- | --- |
| 0 | `.environment-architecture` | Geometric wall, structural posts, ceiling and box lights |
| 2 | `.environment-counter` | Continuous cream worktop, flat edge and rectangular panel front |
| 3 | `.environment-register` | Separate transparent register sprite, positioned relative to the viewport |

The counter occupies the lower 20% of the viewport, close to the wireframe's approximately 19%. Art uses proportional scaling and cropping, never stretched objects. HTML `picture` sources select an independently composed 4:3 tablet plate at aspect ratios up to 3:2; wider screens use the 5:3 plate. This prevents a single wide image from cropping away the side regions at 1024×768. Both variants keep the same wall pattern, modern geometry, square lights, palette, counter height and empty three-region layout. The register scales uniformly, remains inside the right region and rests on the worktop.

Scene-relative CSS coordinates reserve future regions without mounting placeholder elements:

| Future region | Horizontal bounds | Vertical guidance |
| --- | --- | --- |
| Packages | 3%–22% | Below side lighting, above the counter |
| Showcase | 24%–76% | Top 22%, bottom clearance 23% |
| Header | Within central region | Top 6%; no header exists in this phase |
| Orders | 78%–97% | Below side lighting, above register |

These are integration guides, not new game rules or a Phase 2 implementation. A future feature can consume the existing CSS variables and local layer stack.

## Assets and generation

Assets are local under `assets/environment/`. Built-in `image_gen` generated the new scenery and transparent prop using the new references strictly as rendering/style guidance. The tablet variant uses the new wide scene for design continuity and the new references for cel-shaded rendering. Exact prompts, reference roles and packaging dimensions are saved in [generation-prompts.json](../../assets/environment/generation-prompts.json). The earlier ornate generation is superseded.

- `bakery-interior-source.webp`: lossless retained wide scenery master.
- `bakery-wall.webp`: optimized wall crop of that master.
- `bakery-counter.webp`: matching optimized counter crop.
- `bakery-interior-tablet-source.webp`: lossless retained 4:3 scenery master.
- `bakery-wall-tablet.webp` and `bakery-counter-tablet.webp`: matching optimized tablet crops.
- `cash-register.webp`: transparent sprite with excess transparent padding trimmed and optimized for use in the scene.

The wall/counter split follows the actual counter back edge in each source: y=741 in the 1619×971 wide master and y=839 in the 1448×1086 tablet master. Each independent layer scales uniformly into the existing 80% wall / 20% counter composition. `object-position: center top` keeps the counter's back edge aligned when cover crops excess cabinet-front height. Packaging uses lossless WebP conversion and rectangular crops to retain crisp color boundaries. The transparent register's padding is trimmed before a proportional resize to a maximum 700 pixels. Only the presentation assets are requested by the page; no external image service or build step is required. The original generation outputs remain in the Codex generated-images directory, and all project dependencies are copied into the repository.

## Verification

`python tests/browser-environment.py` runs WebKit and Edge at 2000×1200, 1194×834, and 1024×768, captures browser screenshots, checks viewport fill and counter alignment, verifies no visible gameplay controls, and confirms gameplay scripts are never requested in environment mode. An opaque sentinel save must remain byte-for-byte unchanged across reload, pagehide and navigation. The runner also checks the legacy entry point, ticket/menu rendering and saving/reloading a coin balance.

Final Edge screenshots were visually inspected against the references at all three requested sizes:

- 2000×1200: modern wide composition, stepped-square wall decoration, hard-edged shadow planes, both side areas and continuous counter.
- 1194×834: tablet art direction keeps the side panels open.
- 1024×768: complete rectangular central wall and both side regions, modern register fully inside the screen and seated on the worktop.

Current-revision verification: `python tests/browser-environment.py` passes in Edge and WebKit at all three requested resolutions. The checks cover save isolation, source selection, no gameplay UI, viewport bounds and legacy save/reload. `node --test tests/*.test.mjs` passes all 118 tests, including the required smoke suite. Final actual-browser screenshots were inspected at each target size and compared with the supplied style references: square silhouettes, distinct crisp shadow planes, deliberate dark outlines, cream/blush/cocoa separation, and consistent modern register rendering. Both side regions remain open; the register is fully visible and seated on the counter; no objects are stretched.

The following preserved-game evidence is from the initial Phase 1 implementation, before this artwork-only replacement: all 118 Node tests and both environment/browser engines passed; `python tests/browser-responsive.py` passed in both engines, including actual Edge browser zoom at 80%, 100%, 125%, 150% and 200%. Gameplay scripts, worksheet sources, runtime markup and the entry-point loader are unchanged by the art revision.

`python tests/browser-frame11.py webkit edge` passes in both engines. Coverage includes carrying 79 × 18 = 1422, native touch taps, mouse/pointer drags, touch dragging (native CDP in Edge, synthetic pointer in WebKit), provisional tens placement, incoming carry, tutorial and sound ON/OFF, swipe addition, order switching/reload, and exactly-once reward collection. The suite also covers the preserved collection, purchases, Undo and packages. Its regenerated older screenshots were restored after verification to keep this change focused on the new environment evidence.

The older Node/CDP worksheet runner was attempted but did not complete; its isolated browser debugging endpoint became unavailable and the stalled run was stopped. No pass is claimed for that attempt; the current focused worksheet suite above supplies the completed browser verification.

These are desktop browser/engine checks, not physical iPad or Android hardware verification. The intended composition is landscape tablet; phone/portrait art direction is outside this phase.

## Files changed

For the current art-direction revision: all seven WebP assets and `generation-prompts.json` in `assets/environment/`; `styles/bakery-environment.css` (matching fallback colors and counter crop alignment); the three Edge screenshots in `docs/previews/environment/`; `AGENTS.md`, `docs/GAME_VISION.md` and this document. No gameplay source or interaction code was changed.

The complete initial Phase 1 implementation also includes:

- Entry/presentation: `index.html`, `src/environment-entry.js`, `styles/bakery-environment.css`.
- Assets/provenance: the eight files listed under `assets/environment/`, including `generation-prompts.json`.
- New browser verification: `tests/browser-environment.py` and the three Edge screenshots under `docs/previews/environment/`.
- Existing runner routes: `tests/browser-bakery-power.py`, `tests/browser-food-selection.py`, `tests/browser-frame11.py`, `tests/browser-order-coins.py`, `tests/browser-packages.py`, `tests/browser-responsive.py`, `tests/browser-ux.mjs`, `tests/browser-worksheet.mjs`. Only their entry URLs changed to the preserved view.
- Smoke coverage: `tests/smoke.test.mjs` includes the environment entry script and stylesheet.
- Handoff: `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/GAME_VISION.md`, and this document.
