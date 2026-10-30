# Panaderya Quest — UX audit and redesign

**Newest revision:** [CORRECTIVE_REDESIGN.md](CORRECTIVE_REDESIGN.md) supersedes the pale visual direction and earlier outstanding browser checks below. Corrective A/B is implemented with saved, inspected renders and passing browser/automated regressions; owner review is pending before C/D.

**Later revision:** the user's annotated main/worksheet feedback is implemented in [ANNOTATION_REDESIGN.md](ANNOTATION_REDESIGN.md). Public title is now My Panaderya. That document records the newer card/panel arrangement, 24 passing automated tests, passing math browser regression, and the target-resolution visual suite still pending launch approval. Results below describe the earlier redesign stage.

2026-10-30. Authorized scope: comprehensive child-centered UX/UI implementation. Preserve the long-multiplication interactions, attempt/action reward ledger, save key, economy formulas and existing owned progress. No new progression systems or management simulation. This document records the audit **before implementation**; results are appended as stages are verified.

## Review method

Read AGENTS.md, GAME_VISION.md, REWARDS_AND_PROGRESSION.md, ARCHITECTURE.md and CODEBASE_AUDIT.md. Inspected root/iframe rendering, input, tutorial, reward, dialog and responsive code. Launched the real game in isolated headless Edge at 1280×800, inspected the main menu and active worksheet and exercised food detail, inventory, fusion, ingredients, kitchen, decor, staff, index, modes, settings, Luck, sell confirmation and food assignment popups. Existing tests and prior audit provide the mathematics/reward baseline. This is an expert UX review; no claim of usability testing with children.

The design follows the supplied principles and uses 44px+ primary touch targets and reduced-motion alternatives, informed by W3C [Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) and [Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html). These are implementation targets, not a claim of full WCAG conformance.

## Prioritized findings and decisions

| Priority / surface | First-time experience problem | Proposed implementation |
| --- | --- | --- |
| P0: active worksheet | At tablet size the digits and prize pool fall below the fold. Old machine controls occupy most of the screen; disabled tickets and unrelated navigation compete with math. | Solve view uses the full central space; compact order narrative, generous math surface and a fixed, always-visible reward dock. Hide the ticket board and management rails only while solving, with clear Exit/Undo/Guide/Sound. |
| P0: tutorial | Five modal reading cards precede play. Arrow mode misses expression reveal; addition guide remains when OFF. Prompts describe controls instead of showing them. | No first-launch blocking modal. Highlight the next ticket, then guide the current math action. One arrow/target stream, short state-based prompt, restrained dimming. OFF clears prompts, guide targets and both arrow layers immediately. Keep flexible valid alternatives available. |
| P0: reward feedback | Coins originate at iframe center, vanish rapidly, pool is offscreen. Temporary Luck and chest drops lack an obvious relationship. Cosmetic child cash counter implies a second payout. | Report action coordinates for presentation only. Pop a coin/Luck chip near the action, hold briefly, fly to fixed dock; animate displayed totals on arrival without delaying actual accounting. Show live chest chance, Luck→chest relationship, colored chest tokens and guaranteed minimum. Remove child fake payout UI. |
| P1: main/menu | Wallet is tiny; bakery value is repeated three times; prominent locked controls and empty management panels overwhelm new players. | Warm bakery storefront, clear wallet, dominant central multiplier, compact navigation revealed at existing unlock thresholds. Food tiles retain required rarity/art/level/value layout and show affordable upgrade affordance. |
| P1: tickets | Generic pastry emoji, tiny reward estimate, no clear task narrative. A Chances popup is needed for meaning. | Saturated numbered rarity treatments, explicit equation, visual trays × food count, exact base payout estimate with current mode (potential adjustment labeled), clear digit-pair effort dots. Inline permanent Luck progression and ticket→chest quality cue, optional real odds details. |
| P1: narrative/art | Auto-packer calibration conflicts with Filipino bakery collection. Foods use unrelated foreign pastry icons. | Vector illustrations for Filipino breads reused in tiles, orders and collection. An order is b trays × a pieces per tray, consistently matching worksheet operands. Rename visible packing/calibration language to customer orders. No food simulation or new inventory deductions. |
| P1: food detail/inventory | Multiple equal-weight buttons, dense explanatory boxes, unclear next value and cost; fusion exposed before its unlock. | One primary level action with old→new multiplier and cost. Fusion in secondary section after existing gate; stock quantities and fee visible. Assignment clearly distinguishes duplicate copies whose values do not stack. Sale stays secondary with explicit whole-item consequence. |
| P1: management | Kitchen/decor/staff/index/modes read like dashboard cards; same text repeated throughout. | Short benefit/value previews, visual progress and meaningful purchase labels; preserve prices/caps. Show locked systems contextually rather than all at startup. Index stays persistent after sale. |
| P1: settings/destructive actions | Prototype coins/reset prominent to children, modal lacks focus handling and Escape. | Group adult/testing controls behind a disclosure; separate sound/music/guide controls, focus/restore/trap and Escape. Confirm destructive reset and sale; keep saves unchanged. |
| P2: modes | Advertised Lookup/Blindfold differ from actual implementation; lives selector hidden. | Keep modes later in navigation, expose existing life choices in the dialog and use honest descriptions of current behavior. Do not invent independent-recall rules in a visual redesign. Restore lookup facts as an optional aid without replacing math gestures. |
| P2: responsive/accessibility | Root disables zoom, heavy cascades cause clipping, tiny carry shelves, nested iframe scroll, decorative continuous movement. | Allow zoom; generous math hit targets; responsive single-column phone screen, scrollable wide math only when necessary; reduced-motion feedback and strong focus states. Test 1280×800, 1024×768, 768×1024 and 390×844. |

## Coherent implementation stages

1. **Bakery and orders:** main hierarchy, vector food identity, wallet/menu, ticket narrative/rarity/effort, inline permanent Luck and unlock navigation. Use an intentional cream/teal/coral palette, tactile borders, bread-shop awning and round controls, rather than generic administration cards.
2. **Solve and learn:** remove machine chrome, retain input DOM hooks and math functions, compact receipt on a bakery worktop, fixed prize dock, correct guide gating/next-action focus, action narrative and optional lookup. Keep capsule, expression reveal, carrying in either order, swipe, undo and SFX.
3. **Rewards and progression:** source-positioned reward flights backed by existing dedup ledger, understandable Luck/chest display, claim celebration and direct next-upgrade affordance, simplified dialogs and focus/accessibility behavior.

## Validation plan and guardrails

- Run smoke, worksheet-session and worksheet-rewards tests; add presentation/guide/reward-feedback checks where they protect real behavior.
- Browser: first-use selection → 79×18 → flexible carry-after and 19×9 carry-before → swipe → single claim → food upgrade. Duplicate reports/undo retain reward integrity and dialogs retain the frame. Verify no development bypass or unsupported fake math rewards.
- Check all popup families after redesign and screenshots at tablet and phone sizes. Assert horizontal overflow, important target sizes, dock visibility, tutorial OFF layers and reduced-motion behavior. Inspect screenshots, not only DOM presence.
- Never change `panaderyaQuestV2`, probabilities, budget/cost formulas, rarity definitions or owned inventory to support presentation. Narrative food selection is deterministic from ticket identity; no RNG calls that perturb reward rolls.
- Open issues not silently resolved by visual work: retained mastery design, full page-reload math resume, investment cost accounting for pre-bought ingredients, finalized challenge mechanics and comfortable-pace passive-income balance. Child usability sessions, physical tablet testing and audible sound quality remain necessary after automated browser coverage.

## Stage 1 implementation

Implemented the storefront/menu/ticket hierarchy in `src/main.js`, `src/ui/scene.js`, `src/ui/menu.js`, new local `src/ui/bakery-art.js`, `index.html` and `styles/bakery-theme.css`. Food tiles use 15 named vector illustrations; wallet is distinct, upgrade preview is direct, and unlock navigation is progressively shown using existing thresholds. Tickets show correct tray quantities, base payout, effort and rarity; permanent Luck has an inline four-star progression strip. First-use blocking tutorial launch is removed. No economic formula or save-key change.

Initial verification: all 12 existing smoke/session/reward tests passed. Headless Edge exercised all dialog families and captured the new menu at 1280×800 without runtime errors. Visual inspection led to moving permanent Luck above the tickets so it is visible without scrolling. Worksheet/dialog/phone polishing and full interaction validation continue in the following stages.

## Stage 2 implementation

Focused solving now hides unrelated bakery/order rails, keeps a fixed prize dock in view, and communicates trays/pieces using the actual operands. `worksheet/styles/custom-theme.css` replaces the visible machine skin; all math cells, capsule, floating expression, place/carry handlers, undo, animations and SFX remain. Carry targets are at least 44px. State-driven tutorial focus covers connection, expression reveal, ones placement, incoming/outgoing carry and addition. OFF clears prompts, targets and both guide layers. `worksheet/src/parent-bridge.js` reports content height without iframe viewport feedback and receives decor styling; root bridge renders the focused order and dock. Optional Lookup facts are visible again.

Verification: 12 automated regressions passed; headless Edge completed 79×18 (carry after placement, mouse click/drag, undo/reveal deduplication and downward swipe) and 19×9 (carry before placement creating a leading digit). 79×18 paid 365 coins and one chest exactly once under deterministic test odds. Dialog state preservation, duplicate ready/state messages, both guide/SFX settings and Tutorial OFF addition gating passed. Real touch/audio and smaller viewport visual checks remain for final validation.

## Stage 3 implementation

`src/ui/reward-feedback.js` provides action-positioned coin/Luck chips: short pop, 500ms recognition pause, then a 620ms flight (a fade in reduced motion) and dock reaction on arrival. Accounting is committed immediately in `src/game/rewards.js`; animation never determines eligibility, coins, Luck or chest rolls. Optional normalized source points come from the child bridge. New/claimed attempts cancel obsolete feedback; animation completion has a bounded timer to prevent a stale display. Chest drops get a colored token and the existing gentle sound vocabulary.

`src/ui/dialogs.js`, `src/ui/menu.js` and modal primitives in `src/game/state.js` simplify every popup family: a clear next food multiplier/cost, contextual fusion, stock/fee summaries, global-tool improvements, renovation previews, honest mode descriptions, visible existing Survival lives, an optional facts aid, visual Luck relationships and optional real ticket odds. Sale keeps the whole-item consequence and index permanence. Testing/reset sits in a grown-up disclosure. Modals receive focus, support Escape/Tab containment and restore focus to a surviving trigger. The claim celebration shows actual food art and offers growing the menu or another order.

Additional interaction improvements from browser testing: reserve vertical room for both partial-product rows so the worksheet does not jump when the next row appears; create product targets synchronously, with a later geometry refinement; bound placement/addition compositor waits without changing the arithmetic or normal animation timings; accept the same downward swipe starting on a completed partial-product digit as on whitespace. Tutorial OFF clears immediately rather than depending on a future paint. Removed malformed HTML style fragments from the older external CSS layers. No reward probabilities, prices, rarity definitions or save-key changes.

## Final validation — 2026-10-30

- **18 automated tests passed, zero failed/skipped:** five smoke/load-order/syntax tests (including new source and style files), one session-preservation test, six reward/math/bridge regressions and six UX tests. The new tests cover true order quantities and payout previews without consuming reward RNG, real upgrade value/cost, existing unlock thresholds, all 15 named SVG foods, display-only reward arrival/cancellation and bounded animation completion.
- **Headless Edge full workflow passed at 1280×800:** choose a rendered order ticket → 79×18 → click/drag, temporary row tens and lifting, incoming carry after placement, undo/reveal, swipe down starting on a partial-product digit → 1422 → exactly one 365-coin and one-chest payout under deterministic test odds → buy a food level through its real button → verify wallet, increased bakery value and saved level under `panaderyaQuestV2`.
- **Phone interaction passed at 390×844 with emulated touch:** 19×9 = 171 using actual touch taps/drags, direct outgoing carry, incoming carry before placement and the new leading tens digit. Guide/SFX enabled; the first carrying flow also exercised them disabled.
- **Responsive/visual suite passed:** main and solving views at 1280×800, 1024×768, 768×1024 and 390×844; no root horizontal overflow, dock visible within viewport and carry targets ≥44px. All 13 management/dialog families opened at tablet size without runtime errors; focus and Escape preserved the active iframe. Screenshots were inspected for main/menu, focused solve, phone/tablet arrangements, food detail, inventory, modes, Luck and settings. PNGs are generated into OS temp by the runner, not committed source assets.
- **Feedback/guide checks passed:** normal and reduced-motion reward arrival; no extra accounting from animation; repeated ready/state messages and parent rerenders do not reward/reset; all tutorial target classes/prompts and both arrow layers clear when OFF, including addition.
- Exploratory failures were not counted as passes. They identified phone CSS specificity, delayed guide clearing, compositor completion, target timing/layout shifts and browser extension interference. The runner now uses an isolated private profile with extensions/sync disabled and closes its local connections. Final successful runs had no browser runtime exceptions.
- `git diff --check` passed after whitespace cleanup. No commit, push, dependency installation or external hosting/deployment.

Commands (Node 22+; this machine uses the existing Unity-bundled Node executable because `node` is not on PATH):

```text
node --test tests/smoke.test.mjs tests/worksheet-session.test.mjs tests/worksheet-rewards.test.mjs tests/ux.test.mjs
node tests/browser-worksheet.mjs
node tests/browser-ux.mjs
```

## Remaining manual and design work

- Emulated touch is not a physical tablet. Test real fingers/stylus, target alignment, portrait/landscape changes and audio loudness/pleasantness on intended classroom devices. Audio ON/OFF state and synthesis paths were exercised; audible quality was not assessed.
- Test the design with actual Grade 5 and prerequisite-ready younger children. Recognition, reading load, icon meaning, Luck comprehension and satisfaction are design judgments until observed with learners. No child-study or full accessibility-conformance claim is made.
- Main menus and large collections intentionally scroll on small screens; phone tickets scroll horizontally inside their row. Generated problems fit the intended math surface; maximum custom debug operands may require math-surface scrolling. A complete keyboard replacement for every math gesture is not implemented.
- Full page-reload math resume, retained-mastery assessment, legacy pre-bought ingredient investment accounting, finalized Blindfold/other challenge mechanics and measured active/passive balance remain separate work. Current mode payout rules are unchanged; the UI describes actual behavior without inventing unfinished mechanics.

All three authorized redesign stages are implemented and reviewed. Future art direction and child-testing feedback can refine them without replacing the preserved math interactions.
