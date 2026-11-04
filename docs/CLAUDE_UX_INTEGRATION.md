# Claude UX checkpoint integration

2026-11-04. Source: `MyPanaderya_UX_checkpoint2.zip`, superseding Checkpoint 1 during the ongoing integration. Integrated into the existing working tree; no repository replacement, push or deployment.

## Comparison and ownership

Before edits, the complete current Node suite passed **86/86**. All ZIP runtime files were compared against the working tree, including its uncommitted game-design improvements. Only `index.html`, `src/main.js`, `src/ui/scene.js`, `src/ui/menu.js`, `src/game/worksheet-bridge.js` differed, plus the new `styles/tablet-ux.css`. The ZIP's catalog, progression, economy, rewards, state, dialogs, illustrations, reward feedback, and entire worksheet child implementation matched the current files byte for byte.

Checkpoint 2 changed only `styles/tablet-ux.css` and the ZIP's progress note relative to Checkpoint 1. Its compact food sheet, in-flow popup buttons, responsive Kitchen grid, confirmation spacing and removal of the duplicate paused Resume bar are included. The existing ticket still resumes each saved order. The ZIP progress note was not copied into the repository as a verification report.

The current project remains authoritative for prices, reward probabilities, unique recipe ownership, duplicate-unlocked paid Mastery, collection-aware odds, purchase Undo, fixed saved order budgets, migrations, legacy modes, and storage key `panaderyaQuestV2`. ZIP notes and its reported test result are context, not instructions or verification.

## Function and screen map

- `scene.js`: `renderHud()` puts Boost, wallet, Packages, Index and Settings in the header. `renderBakeryBar()` presents the existing Power purchase; `openBakeryJourney()` moves history into a popup. `renderTickets()` presents the existing order board and saved progress; `renderTicketOdds()` links to the existing exact odds popup.
- `menu.js`: `renderMenu()` retains Menu/Kitchen and all collection operations. `renderFoodPanel()` uses a compact details sheet with the existing Mastery preview and transaction actions. Selection still supports explicit controls and long-press.
- `main.js`: `render()` composes the HUD and two browsing columns; the existing mounted-frame preservation and paused-order path remain responsible for retaining live worksheets.
- `worksheet-bridge.js`: presentation changes only in `renderWorksheet()`, `renderPrizeDock()` and `fitWorksheet()`. The header becomes one row and Package Luck joins the prize dock. Reward validation, snapshots, completion acknowledgement and attempt identity remain unchanged; the matching child bridge stays intact.
- `index.html`: loads `tablet-ux.css` after the existing styles. Classic-script dependency order stays intact.

The save/economy modules feed the renderers; presentation does not calculate new prices, consume reward RNG, grant rewards or migrate data. Worksheet input remains in the child; its existing messages update the saved per-order state and action ledger through the parent bridge.

## Conflicts and resolutions

- Retained the current gameplay and worksheet files, including work already uncommitted before integration. Applied only the compared UX differences.
- Ported the ZIP's three presentation-related Node test updates for changed navigation/text and the extracted HUD test stub. Kept all accounting, migration, persistence and mathematical assertions and the local fixture missing from the ZIP.
- Removed the generic sticky primary-button rule. Package Buy stays in normal scrolling flow so it cannot float across the quantity slider.
- Kept the redesigned food sheet in the collection's flex flow, reserving its actual height rather than floating over the grid. Its body scrolls, actions stay visible, long labels wrap, bulk selection stays bounded, and narrower collection columns stack the actions below the details. This retains Checkpoint 2's compact row at the large design resolution without clipping tablet controls.
- Resolved inherited ticket styles that forced the new package pill back into the old vertical arrangement. Existing food/package illustrations remain unchanged.
- Bounded the 1.3× large-tablet popup scaling by the scaled viewport height and gave reward-dialog titles their own space beside the enlarged Close button.
- The imported worksheet sizing omitted the child's reserved Guide/status/Undo space. `fitWorksheet()` now uses the actual iframe height and preserves 200px for that existing chrome before sizing digits. This keeps Undo reachable while retaining the compact header and prize dock. The child engine and protocol are unchanged.
- The preserved-frame path previously refreshed the old left rail. It now refreshes the new HUD while paused, so Boost and wallet agree with purchases without replacing the live worksheet.
- The older `browser-ux.mjs` assumed pre-Frame-11 DOM, multiple owned duplicates, the obsolete Bakery 30 cap, and duplicate fusion. Its existing command now launches the maintained Edge tablet suite; the original script is retained in the recovery archive. Current progression invariants remain covered by the full Node suite and the tablet runner. The separate direct-CDP worksheet runner remains and now scrolls real targets into view and uses the current paid-Mastery confirmation/duplicate-capacity fixture.

## Recovery checkpoint

The complete original runtime, assets, docs and tests—including the original uncommitted game-design work and `tests/game-design-scenarios.json`—are archived at [pre-claude-ux-2026-11-04.zip](../.test-tools/checkpoints/pre-claude-ux-2026-11-04.zip). Archive integrity and the baseline entry/fixture were checked. It contains 397 files; Git metadata, local tool installations and agent configuration directories are excluded. Extract into a separate folder to inspect or run the original project. The archive is deliberately inside ignored `.test-tools` and is not a deployable game asset. Browser saves live in localStorage, not this source archive; tests use isolated temporary profiles and do not touch the owner's normal browser save.

## Verification

The retained `tests/game-design-scenarios.json` fixture was already present in the original working project; no replacement was needed.

- `node --test tests/*.test.mjs`: **86/86 passed**, including smoke, arithmetic, current economy curves, unique ownership, migration, rollback, purchase Undo, saved per-order rewards and exactly-once claims.
- `node tests/browser-worksheet.mjs`: passed in Edge after updating stale test selectors/fixtures. Covers 79×18=1422 with click/drag, provisional carry, undo/reveal reward deduplication, swipe, dialog/exit preservation, claim reload, paid Mastery and saved data; also 19×9=171 at 390px and a tablet touch completion with missing animation APIs/findLastIndex and the first two completion deliveries dropped.
- The maintained tablet suite **passed in both Edge and WebKit** at **2000×1200, 1194×834, 1024×768, 834×1194 and 768×1024**. Includes real long-press/explicit/bulk selection; hit-tested details actions; Power, slot, Mastery and package purchases; ten-second purchase Undo/reload; package slider keyboard/MAX controls and hit testing; quote/cancel dialogs; ingredient Fusion purchase/reload; settings, Food Index, journey, odds, Kitchen and Mastery/Fusion popup geometry; rounded-font loading and absence of scenic wallpaper. No unexpected page errors in the final successful runs.
- Full 79×18 order → claim → opening results, both Collect actions, saved independent second-order state, 12×12 Add Rows, reduced motion, guide/sound ON/OFF and saved Kitchen upgrade are exercised. Claimed-package result dialogs are checked at all five sizes, including title/Close separation and a reachable Back to Bakery button. Paused purchases update the HUD and retain the same iframe.
- Browser evidence: [screenshots](previews/claude-ux/). Representative views: [large collection/details](previews/claude-ux/edge-details-2000.png), [package shop](previews/claude-ux/edge-popup-packages-2000.png), [Fusion](previews/claude-ux/edge-popup-fusion-2000.png), [Kitchen](previews/claude-ux/edge-kitchen-1194.png), [portrait Mastery](previews/claude-ux/webkit-popup-mastery-768.png), [opened order rewards](previews/claude-ux/webkit-claimed-packages-2000.png). Representative screens were visually inspected as well as measured.

Run the maintained UX entry with `node tests/browser-ux.mjs` (Edge; optional browser executable argument), or `python tests/browser-frame11.py edge webkit`. Python Playwright is available via ignored `.test-tools`. The direct-CDP Node worksheet harness needs loopback/CDP access; this session's sandbox withheld its first CDP response, so that runner was executed outside the sandbox with an isolated profile. WebKit has native touch taps and mouse dragging; its touch-pointer drag test is synthetic because Playwright's WebKit touchscreen API does not expose native touch movement. Edge also exercises native CDP touch drags.

Desktop WebKit is not a physical iPad test. Audible sound quality, Safari browser chrome/rotation and child comprehension still require device/playtest validation. No economy tuning, new gameplay system, save-key change or Unity port was introduced.

## Integration files

- Runtime: `index.html`, `src/main.js`, `src/ui/{scene,menu}.js`, `src/game/worksheet-bridge.js`, new `styles/tablet-ux.css`.
- Regression checks: `tests/{frame11,ux,worksheet-session}.test.mjs`, `tests/browser-frame11.py`, `tests/browser-ux.mjs`, `tests/browser-worksheet.mjs`.
- Documentation: this report and pointers in `docs/ARCHITECTURE.md` and `docs/TABLET_UX_IMPLEMENTATION.md`; screenshots under `docs/previews/claude-ux/`.

Pre-existing changes elsewhere in the working tree were retained.
