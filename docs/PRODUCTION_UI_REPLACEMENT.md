# Full UI replacement in the actual project — 2026-11-09

The subsequent [UI refinement pass](UI_REFINEMENT.md) updates the logo, upper-left architecture, order-ticket presentation, popup system and touch controls. This document records the original integration and its preservation evidence.

The actual project at `C:/GitProjects/THS HO Game/Multiplication-Serious-Game_Prototype` now uses the latest repaired ZIP interface at root **index.html**. `My_Panaderya_Visual_Repair/` remains a reference/source artifact and is not loaded by the game.

The visual source is the repaired illustrated UI. The gameplay source is the existing production game. This replaces the earlier hub's layout, room art, header, shelf, display construction, tickets, HUD, buttons and non-package popup skin; it does not combine the two home designs.

## Backup and preservation

Before replacement, affected source, styles, worksheet files, illustrated art and tests—including existing uncommitted work—were archived in [the backup](../output/backups/production-ui-before-20261109-214150.zip). Its adjacent JSON manifest records SHA-256 hashes. No Git reset, push or deployment was performed.

The `panaderyaQuestV2` key, save schema, inventory identities, Mastery, slot limits, prices, probability tables, package transactions, reward ledger and order progression remain production-owned. The ZIP's sample catalog, starting balance, sample tickets, package distribution, preview ownership grants and answer input were not imported.

## Source and data flow

| Component | Current source / production connection |
| --- | --- |
| Root loading and archive isolation | `index.html`, `src/environment-entry.js`; default opens the real hub, the old environment mounts only for its explicit archive route |
| Approved home and popup rendering | `src/ui/bakery-hub.js`; reads `g` and uses existing production actions |
| Native scroll and illustrated controls | `src/ui/illustrated-controls.js`; wheel, touch, track, arrows, dragging and keyboard share actual `scrollTop` geometry |
| Home/popup styles | `styles/bakery-hub.css`, `styles/bakery-interface.css`; scoped to the new components |
| Preserved exceptions | `styles/bakery-preserved-interfaces.css`; original worksheet and ninth-package rules isolated from the replacement styles |
| Transferred artwork | `assets/bakery-ui/`; direct copies from the revised ZIP, without regeneration |
| Ticket reward quote | `orderCoinQuote` in `src/game/rewards.js`; the original formula is shared by real run creation and display, while existing run budgets override new quotes |

The showcase reads `g.activeMenu` → matching `g.owned` instances → `F(id)` and `foodValue`. Boost reads `bakeryValue`. It shows no locked/fake compartments. The complete 17-recipe capacity remains available; 10–17 foods scroll in the same fixed cabinet. Partial rows center. The production empty-menu case has a collection entry without fabricated food cells.

The clipboard reads `g.board`, `g.orderRuns`, `orderFood`, `ticketCoinTier` and the real quote/saved budget. Actual food names, expressions, reward art, payout, progress/resume/claim state and refresh rules populate reusable tickets. Its utility buttons invoke real refresh/paid-skip confirmation and actual probability data.

Collection, direct equipment, long-press multi-selection, paid Mastery, slots, Equip Best, Auto Equip, Food Index and sale confirmation invoke the existing controllers. Inventory and progression change the underlying game, which then rerenders the new presentation. No parallel game state or duplicate transaction handler exists.

## Food identities

The demo's sample food labels were inconsistent with its sprites. The transfer uses the existing `ILLUSTRATED_FOODS` identity mapping: sprite 3 is **Kababayan**, sprite 6 is **Cheese Bread**, sprite 7 is **Kalihim**, and sprite 17 is **Special Ube Ensaymada**. All 17 recipes use their actual catalog IDs, rarity, contributions and Mastery. The catalog itself is unchanged.

## Original multiplication worksheet

Tickets call the existing `startTicket`. The original `renderWorksheet` output and persistent iframe mount remain in place. `worksheet/worksheet-engine.html`, its child scripts/styles, `src/game/worksheet-bridge.js`, the protocol, carry/partial-row interactions, guidance, sounds, saved progress and claim ledger were not replaced.

The presentation adapter temporarily selects the original art renderer while building the worksheet, and the isolated stylesheet retains its prior outer surface and controls. Returning home and resuming keeps the same iframe/run where production did so before. There is no replacement answer field.

## Existing Packages interface

The transferred station, separate Packages plaque and bottom button all call `openPackages`. Gift props are decorative. The actual three-column shop, all nine tiers, gates, prices, quantities, capacity, odds, saved stock, individual opening, selected-type Open All, immediate ownership/Mastery credit and replay protection remain unchanged.

Package variants continue through the original modal renderer and original art paths. The new shared popup skin and food/coin adapters expressly exclude this interface. Its redesign remains deferred.

## Obsolete home UI removed

- Replaced the old `renderHubHome` composition, nine individual shelf-tier buttons, old title/header, CSS cabinet and old clipboard/navigation.
- Removed the `bakeryScene` mount and its unused illustrated-room renderer, plus the obsolete default layout-script load.
- Replaced the old hub/interface CSS; preserved only rules needed by the two explicit exceptions.
- Removed the unreferenced old room, counter, register and shelf WebP home assets and the old bakery-sign, Boost-plaque, cabinet-frame and mounted-plaque SVGs after auditing runtime references. They are retained in the backup.

Shared resources still needed by the worksheet, Packages or the explicit legacy/archive routes remain. They do not render the default home screen.

## Verification

The new runner serves root `index.html`, uses isolated browser contexts and checks production state/actions:

```powershell
node --test tests/*.test.mjs
python tests/browser-hub.py edge webkit
python tests/browser-ui-replacement.py edge webkit
$env:PANADERYA_TEST_VIEW='hub'
node tests/browser-worksheet.mjs
```

The before/after style baselines compare 189 package elements and 37 worksheet-shell elements; their computed appearance matches after normalizing the local test-server origin. Browser checks cover 2000×1200, 1280×800 and an additional landscape size, all required food counts plus the actual 17-recipe limit, native touch in Chromium, both custom scrollbars, real Packages purchases/opening, duplicate Mastery, equipment, save/reload, original iframe retention and coin-only claims.

Final observed outcomes:

- `node --test tests/*.test.mjs`: **126 passed, 0 failed**.
- `python tests/browser-hub.py edge webkit`: passed both engines, including actual tickets, retained worksheets, package tiers, equipment and one-time coin claims.
- `python tests/browser-ui-replacement.py edge webkit`: passed both engines after the final popup and empty-menu changes. Tested 2000×1200, 1280×800 and 1440×900; 1/3/5/9/10/16/17 equipped foods, plus the empty-menu recovery flow; wheel, arrow, track, thumb and keyboard scrolling; native Chromium touch scrolling; collection, real package purchase/opening, duplicate Mastery, equipment, Auto Equip and save/reload. No captured browser errors. [Edge results](../output/playwright/production/edge-integration-results.json), [WebKit results](../output/playwright/production/webkit-integration-results.json).
- The original worksheet runner with `PANADERYA_TEST_VIEW=hub`: passed 79×18=1422 and 19×9=171, click/drag, carry handling, Undo, downward swipe, tutorials and sounds, settings, frame retention, reload, one-time coin claims, unavailable animation/array APIs and dropped completion deliveries.
- `python tests/browser-environment.py`: passed Edge and WebKit for the isolated archived environment and preserved-game entry.
- The installed web-game client rendered the actual root home, Collection and original worksheet; screenshots and `render_game_to_text` state were inspected. Playwright CLI also opened the actual root game, selected its real Collection and saved an inspected screenshot. Its inspection browser and the task-owned preview server were then stopped.
- SHA-256 audit against the pre-edit backup: **27 protected files are byte-identical**, including every backed-up worksheet file, both worksheet bridge endpoints, the catalog, package/menu controllers and the other game systems. The sole changed protected game file is the documented identical quote-formula extraction in `rewards.js`. [Audit](../output/playwright/production/preservation-audit.json).

Screenshots were visually inspected for proportions, boundaries, layering, alignment and overflow. The production scene matches the repaired source composition; different displayed foods, balances, multipliers and tickets are intentional production-data substitutions. Review artifacts:

- [Repaired source beside the actual production home](../output/playwright/production/source-production-comparison.jpg).
- [Production food-count and final-row review](../output/playwright/production/production-count-review.jpg).
- [Production Collection, Mastery and shared popup review](../output/playwright/production/production-popup-review.jpg).
- [Preserved Packages](../output/playwright/production/after-packages.png) and [original worksheet](../output/playwright/production/after-worksheet.png).

Touch emulation does not replace physical Galaxy Tab A7 testing or owner aesthetic review. No push or deployment was performed.
