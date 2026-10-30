# Architecture, code map, and constraints

**Current A/B checkpoint:** [CORRECTIVE_REDESIGN.md](CORRECTIVE_REDESIGN.md). Completion now retries until an attempt-scoped acknowledgement and can be recovered from a verified complete state; all existing action/combo/ticket checks remain. Worksheet animation errors cannot strand a valid addition, and a saved claim restores the in-page Collect view after reload. The two bridge files must ship together. Economy migrations are deferred until the owner reviews the visuals.

## Running/deploying
- Latest annotation-led UI: `styles/feedback-layout.css` and `worksheet/styles/responsive-workspace.css` load last. Parent `fitWorksheet()` sends presentation-only `layout` values; the child changes CSS dimensions and rerenders without resetting math/history. State reports include normalized protected surface geometry used only for reward routing. See [ANNOTATION_REDESIGN.md](ANNOTATION_REDESIGN.md) for implementation and the outstanding target-resolution visual checks.
- The 2026-10-30 UX redesign adds `src/ui/bakery-art.js` (local SVG foods and order presentation), `src/ui/reward-feedback.js` (presentation-only flights), and last-loaded `styles/bakery-theme.css`. Worksheet visuals use its last-loaded `custom-theme.css`. Keep all files when serving the static site; no package/build step or external asset service was introduced.
- Static site: root `index.html` imports classic scripts in precise order and CSS from `styles/`; use VS Code Live Server or any static local HTTP server. **No npm build or compilation.** Root GitHub Pages can deploy all files.
- Data/saves stored via `localStorage` key **`panaderyaQuestV2`**. This key is a compatibility contract, NOT a code-version label to rename casually. An update that changes its format needs a migration plan.
- Two browser documents: main page and an iframe for the interactive multiplication worksheet. They exchange `window.postMessage` notifications; `src/game/worksheet-bridge.js` is main side, `worksheet/src/parent-bridge.js` is worksheet side. Source markers must agree (`bc-shell` into worksheet, `pq-worksheet` back to main) and origin/iframe validation should be respected. Avoid dropping event data or breaking ready/start/state/complete/sound/tutorial controls.
- Some worksheet modules were conservatively separated into **classic scripts sharing top-level lexical bindings**; they are not self-contained ES modules. Their order in `worksheet/worksheet-engine.html` is significant. Refactoring to explicit module imports is possible, but must be deliberately staged and tested.

## Worksheet action rewards (approved implementation, 2026-10-30)

- A ticket attempt owns `g.run.worksheetRewards = {version:1, attemptId, actions:{...}}`. This additive field is saved under the existing **panaderyaQuestV2** key. New tickets and explicit retries initialize a fresh attempt; dialogs, duplicate notifications, undo/redo and a saved-run reload retain the ledger.
- `start` carries `attemptId`; child `started/state/complete/height` messages echo it. Parent also checks the current iframe window. Duplicate `ready`/`start` messages do not reset the mounted worksheet. Source markers and existing sound/tutorial controls are unchanged. Deploy both bridge files together.
- Child bridge observes accepted worksheet states after the existing render function, including committed async placements. It keeps an append-only action map outside undo history. IDs are `attemptId/row/column/kind`; kinds are connect, reveal, place-ones, carry-down, carry-up or final place-tens, and combo. Temporary tens placement before lifting earns no additional reward. Polls carry the cumulative action list, so rapid actions and missed intermediate snapshots do not lose rewards. Completion includes the list to flush any outstanding actions.
- Parent validates action IDs and mathematical eligibility, deduplicates before awarding, and requires necessary actions before sealing a combo. Each combo gets one chest opportunity and two correctness credits; final completion is separately guarded by `attemptId/complete`, matching ticket operands, and all sealed combos. Claim clears the run as before. Coins/Luck are no longer awarded merely because a poll's UI stage or carry counter changed.
- Existing budget, 76% pending-action cap, action weight classes, mode payout formulas, chest probability formula/rarity distribution and final guaranteed chest are retained. Reliable recording of distinct necessary actions replaces timing-dependent rewards; incoming and outgoing carries retain their own rewards. Final completion tops up to the existing ticket payout.
- Compatibility: pre-ledger saved runs retain coins/pool/chests and baseline previously completed pairs. If the old snapshot was mid-product, that pair's ambiguous prior action rewards are conservatively considered paid; its combo and subsequent pairs still earn normally. Old saves did not retain exact action identities, so this avoids retroactive replay awards. No whole-save reset or storage-key rename.
- Page reload still restarts worksheet math; the ledger prevents replayed math from earning the same pending rewards again. Full math snapshot restoration is a separate feature. The child's standalone cosmetic money counter is not the parent economy.

Run `node --test tests/smoke.test.mjs tests/worksheet-session.test.mjs tests/worksheet-rewards.test.mjs` for structural/session/action regressions. `node tests/browser-worksheet.mjs [path-to-Chromium-or-Edge]` runs a localhost, isolated-profile headless browser check using Node 22 built-in WebSocket/CDP APIs; it needs browser-launch permissions, no dependency install. The runner leaves only an isolated OS-temp profile for OS cleanup. See the audit follow-up for exact results and limitations.

## Major files
| Responsibility | Files |
|---|---|
| Food catalog, ingredients, modes, tutorial copy | `src/data/catalog.js` |
| Store/load progress, menu value, rarity ticket generator | `src/game/state.js` |
| Action rewards, luck, chest selection, ticket sessions | `src/game/rewards.js` |
| Food upgrade/fusion/sale, kitchen, decor, staff, mode changes | `src/game/economy.js` |
| Parent iframe/session state and messaging | `src/game/worksheet-bridge.js` |
| Main render/bootstrap | `src/main.js` |
| Center menu, slots, in-progress worksheet wrapper | `src/ui/menu.js` |
| Bakery rail/ticket board/scene | `src/ui/scene.js` |
| Dialogs, settings, upgrade menus, onboarding | `src/ui/dialogs.js` |
| CSS design | `styles/base.css`, `menu.css`, `tickets.css`, `worksheet.css` |
| Worksheet HTML and script order | `worksheet/worksheet-engine.html` |
| Worksheet math state | `worksheet/src/state.js` |
| Sound and multiplication visual feedback | `worksheet/src/sound-and-multiplication-fx.js` |
| Placement / carry logic | `worksheet/src/product-placement.js` |
| Downward addition / partial products | `worksheet/src/partial-product-addition.js` |
| Math layout and tutorial arrow rendering | `worksheet/src/worksheet-render-and-tutorial.js` |
| Hitboxes, gestures, rounded capsule connection | `worksheet/src/tap-and-drag.js` |
| Worksheet UI settings and gestures | `worksheet/src/worksheet-controls.js` |
| Worksheet → parent bridge | `worksheet/src/parent-bridge.js` |
| Embedded-app-specific controls | `worksheet/src/embedded-controls.js` |
| Worksheet styles | `worksheet/styles/foundation.css`, `effects-and-guides.css`, `receipt-theme.css`, `embedded-layout.css`, `custom-theme.css` |
| Testing guidance | `tests/smoke.test.mjs`, `tests/worksheet-manual-checklist.md` |

## Known refactoring/implementation cautions
- Reward action records may include optional normalized `point:{x,y}` coordinates for a presentation origin. The parent validates bounds and falls back to the worksheet center; coordinates never determine action eligibility or payouts. `theme` and `feedback` are presentation-only commands (decor tint and chest sound). Source markers, attempt IDs, the math engine and the save key remain unchanged.
- Reward accounting is immediate; `reward-feedback.js` can briefly defer the dock's displayed total until arrival. `syncRewardPresentation()` cancels stale flights on claim/new run. Reduced motion fades without travel. Both reward arrival and worksheet placement/addition use bounded completion callbacks so paused compositor promises cannot strand UI totals or busy state. These helpers never award additional rewards.
- Normal navigation is progressively shown at existing unlock counts. `showTutorial()` now points to live interactions instead of opening onboarding cards. Root `scene.js` no longer contains the superseded worksheet renderer; the current worksheet view belongs only to `worksheet-bridge.js`.
- Active worksheet lifetime: `src/main.js` retains the mounted iframe when `render()` is called for the same `g.run` object in `engine` phase. Dialogs live in the separate `#modals` mount, so closing Help/Settings/other dialogs does not rebuild the worksheet. Claim, failure, abandonment, reset, and a new run still render normally. This preserves live child state and animations; it does not implement page-reload resume.
- Tutorial messages are handled by `worksheet/src/embedded-controls.js`, separately from the parent bridge. The UX redesign fixes the addition-guide OFF issue and adds state-specific target focus/prompts. Switching OFF clears guidance synchronously, including when frame painting is paused. Mathematical selection/provisional-state styling is distinct from tutorial guidance.
- A lot of code is extracted from a one-file prototype, including DOM-template strings and global functions. Avoid treating filenames as clean architecture boundaries without inspection.
- Main app sends commands and receives worksheet progress to calculate coins/chests. Do not create independent reward payouts inside iframe; it is a math-input engine.
- When renaming an iframe element ID or a message source string, change BOTH sender and receiver and relevant tests. Never blindly replace persistent storage keys or public APIs.
- The worksheet's visual theme is **not fixed**; specifically requested changes can modify HTML/CSS or even input architecture, but preserve interaction semantics and run carrying/touch regression tests.
- For UI tweaks, update only relevant visuals; for math logic and bridge changes, run end-to-end checks (e.g. `79 × 18 = 1422`, tutorial arrows on/off, sound toggles, dragging/carry placement, downward swipe).

## Verification checklist
1. `node --test tests/smoke.test.mjs` from repo root (syntax/import order/basic references).
2. Serve with Live Server and confirm main menu grid/ticket board and food multiplier.
3. Choose ticket, complete product/carry sequence and final addition, earn coins and chests, collect a Filipino food.
4. Toggle arrows OFF (none should render), ON (only next-step hints), toggle sound/mute.
5. Check slots and coin deductions, food upgrades/fusions, reload/saved state, and mobile/tablet layout.
6. Summarize what was actually tested, what failed and what's still exploratory.
