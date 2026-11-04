# Frame 11 — My Panaderya

**Packages workspace (2026-11-05):** [Three-column interface and automatic collection](PACKAGES_INTERFACE.md) supersedes separate Buy/Unbox tabs and reward dialogs: all eight types, 50-per-type purchasing capacity (old excess stock retained), immediate food/Mastery credit and selected-type-only Open All. Verify with `python tests/browser-packages.py`.

**Coin-only orders (2026-11-04):** [Order Ticket tiers and rewards](ORDER_COIN_TIERS.md) supersedes package drops, temporary Package Luck and challenge coin modifiers below. New orders pay base coins times saved Baker's Boost; packages come from the Package Counter. Preserve migration of already-earned packages and fixed legacy budgets. Verify with `python tests/browser-order-coins.py` and the full worksheet runner.

**Frame 12 selection (2026-11-04):** [Current floating controls](FOOD_SELECTION_IMPLEMENTATION.md) replace the food-details sheet without resizing the grid; single and multi-selection use exclusive compact popup states.

**Bakery Power panel (2026-11-04):** [Current wireframe implementation](BAKERY_POWER_PANEL.md) uses a full-height 60/40 Bakery Power/Packages sidebar, a current bakery image, and a vertical progression list; this replaces the earlier 40vh cap.

**Compact Menu header (2026-11-04):** [Current header and counter popups](MENU_HEADER_IMPLEMENTATION.md) supersedes earlier topbar, Boost-banner and Menu-heading descriptions.

**Kitchen removal (2026-11-04):** [Current removal and save compatibility](KITCHEN_REMOVAL.md) supersedes all Kitchen descriptions below. Baker's Boost and proportional prices now use recipes and Bakery Power only.

**Current owner corrections (2026-11-04):** [Tablet UX implementation](TABLET_UX_IMPLEMENTATION.md) and [Unity migration reference](../UNITY_MIGRATION_REFERENCE.md) supersede Frame 11 on duplicate ownership: one owned instance per Food Index recipe, duplicates unlock paid-Mastery capacity, slots cap at the complete Food Index. Legacy modes are outside this phase and remain unchanged. Keep the web prototype reliable; do not begin a Unity port.

Implemented 2026-11-04 from the owner's pasted Frame 11 request and annotated wireframe. This is current behavior; it supersedes earlier documents' four starting slots, five-step mastery cap, Bakery 30 cap, separate inventory screen, and single unfinished order. The warm paper, light wood, local illustrated foods, rounded type and original worksheet interactions remain.

## Current behavior

- Three columns at the 2000 × 1200 target: Bakery Power and packages; the owned-food collection; order tickets and collapsible **Ticket Package Odds**. Narrow layouts reflow without hiding the collection. The collection scrolls separately while its details panel is open.
- Every owned copy is visible, including unequipped foods. **Slots Used** counts equipped recipes. New saves start with one slot; existing purchased capacity is retained. New slots stop at the complete Food Index's recipe count, including undiscovered types. One copy of each recipe can contribute at a time. Equip Best uses actual final contributions. Hide Unequipped is a view filter.
- Tap for sticky details. Long-press for multi-selection; Shift+Space/Enter is the keyboard equivalent. Mixed selections show both eligible Equip and Unequip counts. Equip validates the entire selection, capacity and duplicate recipe assignments before changing anything. Selling requires a review and rejects stale confirmations. Bulk mastery quotes only eligible items and the exact combined price.
- Recipe mastery is paid **per owned copy**; the unlocked ceiling is shared by recipe. Every discovery after the first permanently adds one to that recipe's ceiling. Selling a copy does not remove discovery or ceiling progress. Actual mastery has no five-step cap. Legacy Level 1–5 values become Mastery 0–4 with the same multipliers; further steps add 0.4 to the base factor. Existing fusion/tier investment and copies are retained. Historical fusion credits contribute to migrated unlock ceilings; new mastery purchases use coins. Existing fusion, pantry, helper and mode controls remain available through recipe details or Settings.
- Bakery Power retains the accepted 8.5% relative increase and pricing model, extended to 100 purchases. `CURRENT` always marks the latest purchased progression. Browsing has no equip action; arrows wrap the history, and the scrollable carousel uses shrinking cards and fading edges. Only the immediate next gain and price are exposed. Purchase feedback shows old → new power, gain and percentage boost; reduced motion removes animation.
- Only the latest reversible purchase has a visible ten-second Undo. The transaction, exact price, prior fields, expiry, ID and state signature are saved. A new purchase commits its predecessor. Starting an order, refreshing tickets, changing assignments, selling or buying/opening packages commits dependent Undo. Other changed economy state invalidates it with feedback. An expired or repeated transaction cannot refund again. Rewards and random package results are never rolled back.
- Package Luck types are **Standard → Lucky → Fortunate → Charmed → Blessed → Miraculous → Divine → Fate**. Food rarities still end in **Crown Jewel**. The chart uses the exact `ticketProbabilities()` distribution used by ticket generation; there are currently no adaptive rank restrictions. Package food distributions use `packageProbabilities(type)` and a separate random food-rarity draw. A Fate package can contain a Classic food. Previously earned pending packages are tagged during migration and retain their original guaranteed food rarity; those legacy rewards open on collection rather than entering the new randomized stock.
- Tickets guarantee their advertised minimum package quantity of the named Luck type and base coins. Correct worksheet actions retain their existing pool, Package Luck and extra-package chances. Each awarded package has the ticket's Luck type. Completing an order awards permanent completed-order experience regardless of mistakes; visible Ticket Luck never decreases.
- Package shop unlocks follow Bakery Power. The shop lists unlocked types and only the next locked type, with artwork, prices, separate food odds, coin balance, quantity slider, −/+, MAX and confirmation for substantial purchases. Stock has no keep-slot capacity. Purchases support up to 1,000 packages per transaction; this is a batch limit, not a shelf limit. Batch opening, Skip Animation and Open All retain every resulting copy. Free order packages may be opened immediately or collected into saved package stock.

## Reliability and worksheet findings

The WebKit browser run reproduced a startup race: the first child `ready` event sometimes had a source identity that did not yet match the mounted iframe. The existing strict source check correctly rejected it, but a one-shot handshake then stranded the default worksheet. The child now repeats readiness until started; the parent also sends `hello` on iframe load and retries start until acknowledged. Duplicate starts remain idempotent. Source markers, attempt IDs and iframe source checks remain mandatory.

Touch taps now commit on pointer-up; the compatibility click is suppressed. This handles an observed native-touch sequence with pointer-down/up but no click. Mouse and keyboard clicks retain their own path. Drag capture starts after movement, cancels cleanly, and prevents default movement only on the math surface. A new pointer-down clears stale click suppression. The worksheet's math surface uses explicit touch-action and WebKit selection/callout rules, while menus and dialogs retain scrolling.

Floating product markup is replaced only when its contents change. Scroll, resize and positioning frames keep the same live button node, avoiding detached touch targets. Plain-data snapshot cloning has a fallback when `structuredClone` is unavailable. Animation completion fallbacks and validated arithmetic are retained.

Each ticket now owns its run, fixed problem, payout budget, worksheet snapshot, undo history, action ledger, errors, progress, package rewards and attempt identity in `orderRuns`. `g.run` is the currently viewed run and is rebound to the canonical saved entry on load. Switching synchronously flushes accepted actions and errors before removing a frame; snapshots also travel in state messages and flush on visibility/page-hide. A placement animation interrupted before acceptance resumes from its last accepted state. Undo history never rolls back the append-only reward ledger.

Refresh preserves every started/finished-unclaimed order and replaces only untouched tickets. Completed-order claim status is saved with coins and food/package stock in one storage write; claims and package transactions restore their prior in-memory state if that write fails. A reload restores the claim screen. Collect actions remain in the page, with scrollable content, safe-area spacing and no browser popups.

## Configuration and save compatibility

- **Storage key stays `panaderyaQuestV2`.** `frame11Version:1` is additive and idempotent, on top of the existing progression migration. No collection wipe or source-ID rename.
- `src/game/progression.js`: `BAKERY_POWER_CONFIG`, `PACKAGE_TYPES`, `PACKAGE_SHOP`, mastery factors, Undo duration, ticket and food probability functions. Package prices are expected Normal-order equivalents, using the retained anti-devaluation economy basis. Unlock thresholds and price factors are configuration, not wireframe example numbers.
- `src/game/state.js`: migration, ticket creation, protected refresh, storage and canonical run rebinding.
- `src/game/progression-economy.js`: mastery/Power transactions and Undo validation. `src/ui/menu.js` retains slot pricing and transactions alongside collection actions, matching the existing architecture.
- The two bridge files must ship together. `start` adds an optional `session`; `state` adds a session snapshot. `hello` prompts readiness. All original protocol messages remain.
- Two static Nunito weights were derived locally from the supplied licensed variable font. Windows WebKit rendered its default ExtraLight outlines even for bold UI weights; the static faces restore readable, consistent weight without a new font service. The original font and OFL remain.

## Files changed

Application: `index.html`; `src/game/{progression,progression-economy,state,rewards,economy,worksheet-bridge}.js`; `src/main.js`; `src/ui/{menu,scene,dialogs,bakery-art,reward-feedback}.js`.

Worksheet: `worksheet/src/{state,parent-bridge,tap-and-drag,worksheet-controls,worksheet-render-and-tutorial}.js`; `worksheet/styles/responsive-workspace.css`.

Presentation: `styles/{progression,typography}.css`; `assets/fonts/Nunito-{Regular,Bold}.ttf`.

Verification: `tests/frame11.test.mjs`, `tests/browser-frame11.py`, updated `tests/{progression,ux,worksheet-rewards}.test.mjs`; screenshots in `docs/previews/frame11/`. `.gitignore` excludes the local Playwright dependency/browser cache (`.test-tools/`). No runtime dependency or build was introduced.

Documentation: this file, `GAME_VISION.md`, `ARCHITECTURE.md`, `REWARDS_AND_PROGRESSION.md`, `AGENTS.md`, `README.md` and the worksheet manual checklist.

## Verification and limits

Run the full Node suite with `node --test tests/*.test.mjs`, including the required smoke suite. Run `python tests/browser-frame11.py webkit edge` with Python Playwright installed and a WebKit browser downloaded. The runner also accepts one engine name. It uses isolated browser contexts and a temporary loopback static server; no existing save or browser profile is used.

**Final automated result: 73 Node tests passed**, including the smoke suite, migration, rollback-on-storage-failure and legacy pending reward conservation. Both WebKit and Edge browser suites passed. The completion tests deliberately drop the first two completion deliveries and confirm recovery.

The browser suite covers fresh/owned layouts at 2000 × 1200, 1194 × 834, 1024 × 768, 768 × 1024 and 390 × 844; actual long-press and mixed selection controls; real purchase, Undo/reload, mastery confirmation and package buy/open controls; carrying **79 × 18 = 1422** with click/tap/drag, provisional tens placement, incoming carry, tutorial/sound ON and OFF, switching to a different order, reload and snapshot equality, swipe addition and exactly-once claim after reload. It also exercises broken animation APIs and missing `findLastIndex`. Native touchscreen taps are used in both engines. Edge uses native CDP touch drags; WebKit touch drags use synthetic pointer events because Playwright's public touchscreen API exposes taps only. Mouse drags/swipes still exercise real WebKit hit testing/capture.

**Physical iPad/iOS Safari and audible sound playback are not verified.** Windows Playwright WebKit is an engine regression check, not an actual iOS device. Remaining device checks: native finger drag/cancel/swipe, rotation and browser toolbar resizing, audio unlock, background/resume, and the completed-order collection controls with Safari chrome visible. Arbitrary simultaneous-tab transactions and deliberate localStorage/clock tampering remain outside this client-only prototype's guarantees. Learner playtesting is still needed for pacing and economy balance.
