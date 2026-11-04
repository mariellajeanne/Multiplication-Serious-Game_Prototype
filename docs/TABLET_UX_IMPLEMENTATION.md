# Tablet UX, unique foods and Unity-ready prototype

**Packages workspace (2026-11-05):** [Three-column interface and automatic collection](PACKAGES_INTERFACE.md) supersedes separate Buy/Unbox tabs and reward dialogs: all eight types, 50-per-type purchasing capacity (old excess stock retained), immediate food/Mastery credit and selected-type-only Open All. Verify with `python tests/browser-packages.py`.

**Coin-only orders (2026-11-04):** [Order Ticket tiers and rewards](ORDER_COIN_TIERS.md) supersedes package drops, temporary Package Luck and challenge coin modifiers below. New orders pay base coins times saved Baker's Boost; packages come from the Package Counter. Preserve migration of already-earned packages and fixed legacy budgets. Verify with `python tests/browser-order-coins.py` and the full worksheet runner.

**Frame 12 selection (2026-11-04):** [Current floating controls](FOOD_SELECTION_IMPLEMENTATION.md) replace the food-details sheet without resizing the grid; single and multi-selection use exclusive compact popup states.

**Viewport responsiveness (2026-11-04):** [Current viewport layout](VIEWPORT_RESPONSIVENESS.md) supersedes earlier fixed panel heights, layout caps and header/toolbar breakpoints.

**Compact Menu header (2026-11-04):** [Current header and counter popups](MENU_HEADER_IMPLEMENTATION.md) supersedes earlier topbar, Boost-banner and Menu-heading descriptions.

**Kitchen removal (2026-11-04):** [Current removal and save compatibility](KITCHEN_REMOVAL.md) supersedes all Kitchen descriptions below. Baker's Boost and proportional prices now use recipes and Bakery Power only.

2026-11-04. Implemented from the UI/UX audit, comprehensive checklist, Unity-priority instruction and subsequent owner corrections. **This is a web prototype improvement, not the start of a Unity port.** Authoritative handoff: [UNITY_MIGRATION_REFERENCE.md](../UNITY_MIGRATION_REFERENCE.md).

## Current rules and scope

One owned instance per Food Index recipe. Duplicate rewards expand that recipe's paid-Mastery capacity without changing its current investment or assignment. Batch results group duplicate rewards by recipe. Slots start at one and cap at all 17 catalog recipes, including undiscovered foods.

Older multiple-copy saves consolidate once, retain the equipped UID when present, preserve the highest purchased Mastery/Tier and at least the strongest prior contribution, and transfer paid/resale investment to the retained recipe. The raw pre-migration save is backed up once when available. Obsolete Undo snapshots cannot restore duplicate inventories. Existing duplicate-fusion transactions are blocked; legacy links route to the ingredient option. No primary-key change or reset.

The owner's last correction puts **game modes outside this phase**. Earlier in this conversation removal of their penalties was requested; the subsequent instruction to leave mode code untouched takes precedence. Those interim edits were undone. Existing mode handlers, values, menus and unlocks were not redesigned, added or balanced. The core Normal worksheet remains penalty-free.

## Fifteen audit findings

| # | Status | Implemented behavior |
| --- | --- | --- |
| 1 | Complete | Details body scrolls independently; Mastery/Sell/Equip footer remains inside the menu and is hit-testable at every target tablet size. |
| 2 | Complete | Guide shows one readable contextual instruction plus retained arrows. OFF clears/hides tutorial cues while retaining stable allocated space. |
| 3 | Complete | Add Rows invokes the same verified arithmetic/cascade as downward swipe. |
| 4 | Complete | Portrait upper bakery/package band is compact; foods/orders begin earlier. Landscape retains left/center/right hierarchy. |
| 5 | Complete | Ticket odds start collapsed below 1500px; user toggling is respected. Tickets retain the recovered area. |
| 6 | Complete | Reserved status/Guide space prevents errors moving math, Undo or the prize dock. Error response is a brief border cue rather than shaking the worksheet. |
| 7 | Complete | Information controls, quantity controls and important menu actions use approximately 44–48px targets. |
| 8 | Complete | Readable horizontal chance chart, larger supporting text and positive tiny probabilities shown as `<0.01%`. Model precision is retained. |
| 9 | Complete | Explicit Start Order/Resume Order/Collect labels and a first-order prompt. |
| 10 | Complete | Select Foods and long-press both enter multi-selection; Equip/Unequip have Put on Menu/Take off Menu labels and inline blocked-action reasons. |
| 11 | Complete | Unbox chooses an in-stock type when the previous type is empty. Empty shelves have quantity zero and disabled actions. |
| 12 | Complete | Open Selected Instantly, Open All N Packages, contextual MAX explanation and tappable exact unlock requirement for the next locked type. |
| 13 | Complete | Bought-package results omit zero Coins/Luck and order-only copy; duplicate groups explain the actual newly unlocked paid-Mastery capacity. |
| 14 | Complete | Re-rendered dialogs restore the initiating button; native touch clicks are tracked even when Safari does not focus the button automatically. Food details restore their recipe control. |
| 15 | Complete | Rounded display-only Power, meaningful +8.5% next purchase, one current toast, dialog-local messages and no stale toast stack over math. |

## Game feel and architecture choices

- Valid digit placements, carry lifts and carry merges commit immediately; a short visual ghost finishes independently. A cosmetic animation cannot lock the next valid input or lose an accepted placement during exit/reload.
- Preserve existing connection capsule, reveal, flexible placement/carry paths, explanatory addition cascade and sound events.
- Routine placement/carry movement is 160/200ms; local confirmation ~180–280ms. Coin/Luck flights are shorter and eased, still routed outside protected math. Accounting is independent of display arrival.
- Equip and paid Mastery pulse their local result; Power shows old → new and percentage gain. Rare Crown Jewel results have one restrained 480ms reveal; Fate treatment is bounded instead of a perpetual shimmer. Reduced motion suppresses those effects.
- No screen shake, hit-stop, new audio assets, generic replacement food art, frontend rewrite, browser dependency or Unity runtime was introduced.
- Package/slot prices and package unlock calculations moved from UI renderers into the existing progression-economy module. Rendering does not choose reward probabilities or consume reward RNG.

## Economy evidence and decision

Reused and corrected `tests/simulate-progression.mjs` for unique ownership and unbounded Mastery. Editable scenarios live in `tests/progression-scenarios.json`; reproducible output is [TABLET_PROGRESSION_RESULTS.json](TABLET_PROGRESSION_RESULTS.json).

Seed 20261104, 60 trials for each early/middle/late × growth/mixed/collector combination, 80 orders each: **540 traces / 43,200 simulated orders**. The model uses runtime price/probability functions, advertised minimum package rewards and the strongest available menu, with one purchase decision per order. Additional per-pair packages, helper income, fusion, selling, refresh spending and modes are excluded. Middle/late snapshots are independent scenarios rather than claims about session duration.

| Quote, in expected Normal orders | Early | Middle snapshot | Late snapshot |
| --- | --- | --- | --- |
| Standard package | 0.60 | 0.60 | 0.60 |
| Next Power | 2.50 | 8.77 | 28.98 |
| Next Oven | 0.85 | 1.63 | 4.68 |
| Next slot | 2.00 | 4.95 | 5.82 |

Early growth/mixed policies make their median first purchase after two orders; collector policy after one simulated order. This model decides only after an order, so it does not represent the option to buy a Standard package immediately from starting coins. Early median boost growth after 80 orders is 503.76× for greedy growth, 363.29× for mixed and 22.50× for collector; these are predictions under explicit automated choices, not observed learner behavior.

Greedy marginal-growth policies choose no middle/late Power purchases in this horizon. That is a **playtest concern**, not sufficient proof to alter prices: the policy ignores the future utility of unlocking package types and assumes perfect menu optimization. More discoveries and Mastery capacity remain useful; no optional-Mastery maximum is required.

**No price factors, coin rewards or probability distributions changed.** Changes to ownership, duplicate utility and stale legacy transactions implement the owner's corrected rules. Next evidence needed: can children explain a duplicate's benefit, choose among a slot/Mastery/Power/package, notice the Power unlock goal, and continue comfortable multiplication without feeling pushed to rush? Only then consider a small configurable later-Power price adjustment.

## Verification

- `node --test tests/*.test.mjs`: **79 passed** in the final implementation run, including smoke, arithmetic/session/reward safety, storage rollback, Undo, migration, unique ownership and Food Index slot cap. This includes the final save-backup and unbounded-Mastery preview updates.
- `python tests/browser-frame11.py edge webkit`: **both passed** after the implementation. All five target viewports: 2000×1200, 1194×834, 1024×768, 834×1194, 768×1024.
- Real browser controls cover long-press and explicit selection, mixed actions, hit-tested details footers, Power/slot/Mastery purchases, Undo/reload, package buying/opening, empty selection, exact unlock information, focus restoration and saved data.
- Worksheet **79×18=1422** covers click/native touch taps, mouse/touch drags, temporary tens, carry-in, mistake feedback without layout shift, Guide/Sound ON/OFF, switch/reload/snapshot equality, swipe addition and exactly-once collection. First two completion deliveries are deliberately dropped; broken animation APIs and missing `findLastIndex` are exercised.
- Worksheet **12×12=144** covers all tablet sizes, reduced motion, Add Rows and collect/save packages while another order remains unfinished.
- No unexpected page errors in the successful browser runs.
- A final focused Edge/WebKit check also passed for post-confirmation Mastery feedback, Mastery 10 ingredient-preview arithmetic, zero-quantity purchase totals, automatic available-stock selection and a Crown Jewel discovery reveal.
- Edge uses native CDP touch dragging. WebKit uses native touchscreen taps and real mouse dragging plus synthetic touch-pointer drags because Playwright's public touch API exposes taps only.

### Visual evidence

Before images were preserved from the preceding running-interface audit. They use comparable collection states, not identical seeded funds/rewards, and are layout references rather than pixel-diff baselines.

| View | Before | After |
| --- | --- | --- |
| Target landscape | [2000×1200](previews/tablet-ux/before/edge-menu-2000.png) | [2000×1200](previews/tablet-ux/after/edge-collection-2000.png) |
| Tablet landscape | [1194×834](previews/tablet-ux/before/edge-menu-1194.png) | [1194×834](previews/tablet-ux/after/edge-collection-1194.png) |
| Portrait | [768×1024](previews/tablet-ux/before/edge-menu-768.png) | [768×1024](previews/tablet-ux/after/edge-collection-768.png) |
| Details actions | [Clipped](previews/tablet-ux/before/edge-detail-scroll.png) | [Visible footer](previews/tablet-ux/after/webkit-details-1024.png) |
| Error feedback | [Earlier expansion](previews/tablet-ux/before/edge-fresh-error.png) | [Stable worksheet](previews/tablet-ux/after/webkit-worksheet-error.png) |

Also: [Add Rows](previews/tablet-ux/after/webkit-add-rows.png), [package shop](previews/tablet-ux/after/webkit-packages.png), [claim](previews/tablet-ux/after/webkit-claim.png). Screens were visually inspected as well as geometrically checked.

## Files changed in this implementation

- Rules/state/economy: `src/game/{progression,progression-economy,state,rewards,worksheet-bridge}.js`.
- Views/feedback: `src/main.js`, `src/ui/{scene,menu,dialogs,bakery-art,reward-feedback}.js`.
- Presentation: `styles/{progression,typography}.css`; existing illustrated assets retained.
- Worksheet: `worksheet/worksheet-engine.html`, `worksheet/src/{state,product-placement,worksheet-controls,worksheet-render-and-tutorial,parent-bridge}.js`, `worksheet/styles/responsive-workspace.css`.
- Verification: `tests/{browser-frame11.py,frame11.test.mjs,progression.test.mjs,ux.test.mjs,worksheet-rewards.test.mjs,worksheet-session.test.mjs,tablet-ux.test.mjs,simulate-progression.mjs,progression-scenarios.json}`, manual checklist and screenshot evidence.
- Documentation: root Unity reference, this file, simulation results and current-behavior pointers in project docs/README/AGENTS.

## Remaining work / continuation

**Completed:** fifteen audit fixes, corrected ownership/cap rules, tested data consolidation, bounded feedback, focused browser journeys, reproducible progression model and Unity handoff. **Partially validated:** iOS behavior is covered by desktop WebKit, not a physical device; child comprehension/pacing is design-informed but not playtested.

**Pending external validation:**

1. Physical iPad Safari: finger drag/cancel/swipe, rotation and browser chrome, background/resume, audio unlock/audible SFX, and both Collect actions with Safari chrome visible.
2. Short Grade 2–5 playtests focused on first order, carry/addition discovery, duplicate capacity, menu selection and later Power goals. Record observations without introducing timers or public skill labels.
3. Optional additional visual polish only if those tests reveal a concrete issue. No broader phone/desktop redesign is required for this prototype.
4. Unity rebuild is a separate future task. Export formula fixtures and native save/test plans before implementing it; do not begin it as a continuation of this web pass without a new instruction.

No push or deployment performed. Existing unrelated work is retained. Local temporary audit/edit helpers are not runtime dependencies; the retained runner and simulation above are the reproducible tools for future sessions.
