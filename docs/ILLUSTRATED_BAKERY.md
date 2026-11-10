# Illustrated bakery and complete food collection — 2026-11-09

**Superseded visual handoff:** [Full production UI replacement](PRODUCTION_UI_REPLACEMENT.md) is now current. The actual root game uses the repaired ZIP's artwork, composition, cabinet, clipboard, navigation, HUD and popup system with real game data. The original worksheet and Packages interface are preserved. The descriptions below record the prior illustrated pass; its home scenery and styles have been replaced.

The sections below archive the preceding illustrated implementation. The newer production UI replacement above is current. This earlier pass superseded the Three.js renderer and reduced detail across all 17 recipes while preserving gameplay; its home composition and skins have now been replaced.

Open root `index.html` through VS Code Live Server or a local HTTP server. No build or install is needed. Default is the playable illustrated bakery. `?view=legacy` keeps the previous collection presentation with the current shared economy; `?view=environment` keeps the isolated Phase 1 archive without game scripts or save access. `?view=fallback` uses the same illustrated hub and interactions as default. No push or deployment was performed.

## Art direction and implementation

The room, three-row package shelf, full-width counter and register are separate raster layers. Interactive packages, foods, tickets, headings and controls remain real components. No equations, buttons or text are baked into room art. The default hub loads no Three.js renderer, WebGL canvas or scenery animation loop. Earlier Three.js source and its pinned vendor copy remain as historical material, without a default runtime import.

Forms are matte, softly dimensional and deliberately simple: smooth wood without grain, broad shadow planes, quiet highlights, shallow contact shadows and a shared warm palette. Mounted signboards, cream plaques, recessed glass compartments, a physical order board and layered action faces give the HUD depth. Editable SVGs define these controls; responsive text and real click targets sit above them. The organic, elongated four-point Boost sparkle keeps its restrained rainbow effect and reduced-motion support.

The showcase renders equipped foods only, without empty placeholder cells. It handles 1, 3, 5, 9, 10, 16 and 17 foods; partial rows are centered, including the ten-food 4+4+2 layout. The display and order board scroll independently. Collection and non-package overlays use the same materials. Worksheet changes affect presentation, without moving digit cells or changing the math/input protocol.

**Package-popup exception:** the owner explicitly requested that its existing visual design remain unchanged. Its original vector food art, layout, controls and skin are retained. New food sprites appear in the hub, collection, Food Index, order tickets and worksheet header. The new overlay skin excludes the package popup and its backdrop.

## Complete food refinement

A three-food study established Pandesal, Ensaymada and an ube-filled bun at actual showcase size, including a 1024×768 preview. After internal inspection, the same treatment was applied to every recipe without an approval stop. The final foods use a few broad sculpted surfaces, simple filling masses, three thick cheese strips where relevant and minimal scoring. Crumbs, pores, fine strands and repeated decorative ridges were removed through regenerated shape design; no blur or smoothing filter was applied to the old art.

`assets/illustrated/foods.webp` is a 1122×1402 RGBA atlas with four equal columns and five equal rows. Runtime mapping is explicit and independent of catalog order:

| Row | Column 1 | Column 2 | Column 3 | Column 4 |
| --- | --- | --- | --- | --- |
| 1 | `pandesal` | `monay` | `kababayan` | `pan-de-coco` |
| 2 | `spanish-bread` | `cheese-bread` | `kalihim` | `ensaymada` |
| 3 | `hopia` | `mamon` | `pianono` | `ube-pandesal` |
| 4 | `buko-pie` | `brazo` | `butter-mamon` | `celebration-ensaymada` |
| 5 | `ube-ensaymada` | Unused | Unused | Unused |

Nested SVG viewports clip each sprite. Explicit source-cell bounds suppress small neighboring plate fragments while keeping a consistent sprite scale and plate baseline. The unused cells are never referenced. Alpha from the generated masters is preserved in the WebP copies. The mapping and clipping live in `src/ui/illustrated-art.js`; the original `foodArt()` remains available for the package popup and legacy view.

## Assets and source prompts

All project-consumed art is stored in [assets/illustrated](../assets/illustrated/). The seven runtime WebP files total about 1.28 MB; the internal three-food study is separate and not loaded by production.

| File | Use |
| --- | --- |
| `room.webp`, `counter.webp`, `register.webp`, `shelf.webp` | Modular environment layers |
| `foods.webp` | All 17 refined food sprites, 4×5 atlas |
| `packages.webp` | Nine distinct, simplified packages, 3×3 atlas |
| `coins.webp` | Eight coin-reward illustrations, 4×2 atlas |
| `food-style-study.webp` | Internal three-food reference; test preview only |
| `bakery-sign.svg`, `cabinet-frame.svg`, `mounted-plaque.svg` | Shared room and panel structure |
| `action-control*.svg`, `boost-plaque.svg`, `boost-silhouette.svg` | Scalable control faces and Boost shape |

Raster assets were produced with the **built-in `image_gen` tool**, then copied/converted into the workspace. [generation-prompts.json](../assets/illustrated/generation-prompts.json) records the reference roles, final prompts and master output paths. Unmodified PNG masters remain in the generated-image library. SVG interface assets were authored directly as editable project graphics.

## Orders, rewards and saved progress

Each ticket stores an additive `foodId` selected deterministically from the equipped recipes. This does not consume reward RNG or tie the requested food to coin tier. Old tickets receive a valid assignment without rerolling their equation or reward. Untouched tickets can rebind when their recipe leaves the menu. Started/saved worksheets retain their original recipe and frozen payout even if it is later unequipped or sold. An empty menu retains a valid saved recipe or falls back to an owned/starter recipe so math remains available.

Order claims award coins only. The reward panel shows base × saved Boost = total, retaining already-promised payouts. The reward audit also removed direct food grants from the grown-up demo shortcut. New food and duplicate Mastery capacity are credited through package opening; starter foods, existing saved ownership and grandfathered stock are preserved. The `panaderyaQuestV2` save key and worksheet protocol are unchanged. The earlier food-only economy implementation and simulation evidence remain recorded in [the previous hub handoff](THREEJS_BAKERY_HUB.md).

## Source map

- Entry and layer assets: `index.html`, `src/environment-entry.js`, `src/ui/illustrated-art.js`.
- Hub components, centering and persistent worksheet mount: `src/ui/bakery-hub.js`, `styles/bakery-hub.css`.
- Shared art adapters and collection/dialog presentation: `src/ui/bakery-art.js`, `src/ui/menu.js`, `src/ui/dialogs.js`, `styles/bakery-interface.css`.
- Ticket recipe persistence and reward presentation: `src/game/state.js`, `src/game/rewards.js`.
- Worksheet food presentation and color theme: `src/game/worksheet-bridge.js`, `worksheet/worksheet-engine.html`, `worksheet/styles/illustrated-bakery.css`.

## Validation and limits

Run the full Node suite, hub browsers and real worksheet runner:

```powershell
node --test tests/*.test.mjs
python tests/browser-hub.py edge webkit
$env:PANADERYA_TEST_VIEW='hub'
node tests/browser-worksheet.mjs
```

The hub browser runner covers all seven food counts, last-row centering, clipping, both scroll regions, package transactions, equipment and Auto Equip, Boost, persistent iframe/resume/reload, one-time claims, all eight coin tiers, and five viewport sizes. It also checks compact food-details text separation, 44px action targets and the package popup's style isolation. Focused package and coin-order browser runners were exercised in Edge and WebKit. Node tests include recipe migration/locking, reward exclusivity and complete food-atlas coverage.

Observed results: all **125 Node tests** and the separate five-test smoke run passed. The hub runner passed in Edge and WebKit. The real worksheet runner passed `79 × 18 = 1422` and `19 × 9 = 171`, including click/drag, carrying, tutorial/sound controls, Undo, downward swipe, reload, duplicate-event protection and one-time coin claims. Its degraded-API and dropped-completion-delivery cases also passed.

Selected final screenshots are in [docs/previews/illustrated](previews/illustrated/). They use isolated fixtures and do not alter the player's save. Browser emulation is not physical Galaxy Tab A7 performance or touch testing. Final aesthetic acceptance remains with the owner; this handoff records implementation and observed checks, without claiming owner approval.
