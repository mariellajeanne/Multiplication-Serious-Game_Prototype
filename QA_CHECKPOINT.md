# QA Report and Checkpoint — My Panaderya (2026-11-22)

Status: **QA pass complete; optimized debug APK rebuilt and verified.** All work is
uncommitted on `main` (base `6b35c63`). No saves, artwork or assets were deleted or
modified. Physical-tablet checks remain (see §6).

**APK:** `android/app/build/outputs/apk/debug/app-debug.apk`, **51,811,683 bytes (49.41 MiB)**,
optimizer `full-audit`. The pre-QA baseline was 73,591,502 bytes (70.18 MiB, fallback
mode), kept at `output/apk-baseline/`.

## 1. Baseline
- Node: 388 tests, 373 pass, 15 fail (stale harnesses).
- The APK was in `conservative-legacy` fallback mode because source changed after the asset audit.
- Many browser runners failed on selectors from earlier designs. Each was confirmed identical on an unmodified baseline worktree.

## 2. Defects fixed (each reproduced, fixed and re-measured in real Edge)

**Tutorial** (`src/ui/game-tour-v18.js`, `styles/game-tour-v18.css`):
1. Checkmarks were invisible: the tick and the next focus happened in the same frame. Each tick now draws within ~0.35 s and is held ~1.0 s before focus moves; measured holds 1.00–1.09 s.
2. The Order Complete popup was dimmed by the guide, flashed dark for 240 ms, and was covered by the checklist. Popups with their own backdrop now get transparent blockers, and the checklist is placed beside them.
3. The unboxed food and the Boost finale popup were dimmed or covered. They stay bright, with shade patches; the finale is narrowed beside the popup on 1280×800.
4. Dimming started too early: during the last coin flight, the reward animation and the package reveal. Guidance now waits for flights plus a 0.5 s settle.
5. The checklist covered the answer row, food stats or target. Placement now scores avoid regions, with a compact single-strip fallback.
6. The skip/done guard had been swallowed by a `//` comment.
7. Intro:
   - strips emerge from behind the previous one without the card jumping
   - all strips are cream-white
   - an SVG tick replaces "✓", which looked like √
   - the Next interval measures 1.51–1.59 s
8. At 960×540 the food target was off-screen while swipes were blocked; it is now scrolled into view.
9. Skip covered toasts and headings; it now sits top-left and hides during the worksheet, reward and reveal steps.

**Order Complete backdrop:** `styles/order-completion.css` was `transparent`; it is now a dimmed `#29150c9e` with a fade and no blur.

**Worksheet readability:** the in-sheet prompt grew from 13 px to `clamp(14px,2vw,21px)`, and the calculator note from 14 px to `clamp(14px,1.2vw,22px)`.

**Worksheet Undo** (`worksheet/src/parent-bridge.js`): a shell Undo tap during a short animation was silently dropped although the button looked enabled. It is now deferred until the animation ends (3 s cap). Repeated taps coalesce, and the attempt-id is re-checked.

**Co-Baker learner footer** (`src/ui/co-baker-help.js`, `styles/co-baker-help.css`):
- **Before:** End Help was 15 px plain text, and adding it overflowed and clipped "Find a Helper" at 1280×800.
- **Now:** End Help uses the footer's own illustrated-button sizing (78/69/48 px tall at 2000/1280/960) and replaces Find a Helper while connected, since a second helper can't be called mid-session.
- **Status line:** connection status is a caption above End Help.
- **Measured:** no overlap or clipping at 2000×1200, 1280×800 or 960×540.

**Page swipe** (`src/ui/bakery-scenes.js`): commit `cb339a8` clamped the camera and lost the edge "stretch and spring back" (0 px). The clamp now applies only to ordinary drags; measured 30–40 px resistance with spring-back at four layouts.

**Package reveal on phone landscape** (`styles/package-experience.css`, `styles/ui-polish-v19.css`):
- **Problem:** ×10 at 844×390 showed no food at all, because badge padding consumed the box and an implicit grid row resolved to 0.
- **Fix:** both causes fixed.
- **Tablet sizes:** 960/1280/2000 measured unchanged (60/100/166–322 px art, 8 px gap).

**APK:** re-audited asset plan, with a `sourceDigest` refresh and a `sourceAudit` record. See `docs/ANDROID_APK_OPTIMIZATION.md` (new "Measured debug APK" section).

## 3. Co-Baker reward accounting check (requested)
The helper runner needed `coinsEarnedSinceLastDiscovery` reduced by the 6 helper-reward coins. This is a test-expectation fix, not a production change.

**Why the adjustment is correct:**
- **Single credit path:** `receiveEarned()` (`src/network/helper-rewards.js`) credits through the shared `creditGameplayCoins` (`src/game/progression.js:28`). That one call adds the same amount to `coins` and to the discovery counter. Completed orders use the same path, and validated Co-Baker grants are a documented qualifying source.
- **Duplicate protection intact:**
  - a repeated receipt id is acknowledged without paying again
  - a second receipt for the same order step or ordinal is refused
  - a legacy combined receipt is acknowledged only
  - a failed save undoes both the coins and the counter
- **The numbers agree:** the test subtracts the exact `receivedRewards` sum from both fields and then requires the whole save to be equal. That proves the counter rose by exactly the reward, and that Mastery, foods, orders and worksheets are untouched.

The helper's own order becoming `paused` is likewise expected: accepting mid-worksheet is a deliberate two-step "Save & Exit Worksheet". The test allows only that field to change.

## 4. Test results (final source)
| Suite | Result |
|---|---|
| `node --test tests/*.test.mjs` | **389/389 pass** |
| `browser-six-task-tutorial.py edge` (new) | PASS at 2000/1280/960, with measured timing, spotlights, backdrops, reload/skip and no excluded assets |
| `browser-six-task-tutorial-inline.py`, `-recovery-inline.py`, `browser-android-assets-inline.py` | PASS (Edge) |
| `browser-co-baker-help.py` (Edge+WebKit sockets) | PASS, all 3 phases:<br>• Call, DND, decline, cancel, two-step accept<br>• **helper sees the learner's live read-only worksheet**<br>• learner footer and end<br>• expiry, failover, arbitration, reconnect, independent saves |
| `browser-co-baker-recovery.py` | PASS, Phase 3C (interruptions, refreshes, relay restart, offline 79×18, semantic pointing) |
| `browser-helper-rewards.py` (Chrome/Edge) | PASS: relevance-gated rewards, 5% cap, immediate/persistent receipts, duplicate/out-of-order, learner payout unchanged |
| `browser-co-baker-nearby-ux.py` | PASS on Edge and WebKit |
| `browser-co-baker-help-empty.py` | PASS on Edge/WebKit at 3 sizes |
| `browser-tablet-sync.py` | PASS (live relay, read-only helper, touch, Undo, end) |
| `browser-tablet-repairs.py edge` | PASS P0, P1 (ported to six-task tour), P2/P3 |
| `browser-order-completion.py edge` | PASS (eight sizes, skip/close/reload, one claim) |
| `browser-package-reveal.py`, `browser-page-swipe.py`, `browser-package-carousel.py` | PASS (Edge) |
| `browser-worksheet.mjs` (79×18 / 19×9) | **7/8 and 10/11 runs pass**; see §5 |
| Android JVM | LanProtocolTest 19/19, NearbyDiscoveryTest 9/9 |
| `apk-contents-check.py` | PASS: 104 source + 195 assets byte-identical, 103 exclusions absent, all references resolve, music frames preserved |

New shared helper: `tests/scene_test_support.py`. Runner repairs follow later deliberate designs:
- scene UI, expression bubble, `[data-part]` tiles, DND checkbox
- 30 s call cooldown, two-step accept, live viewer
- reveal Mastery badge
- Undo restoring the generated fact

Each change is commented in the test.

## 5. Unresolved
1. **`browser-worksheet.mjs`: about 1 run in 8 fails.**
   - **When:** only after its synthetic replay of duplicate `ready`/`state` bridge messages.
   - **What happens:** the parent re-syncs the engine to an older state and refuses the next connection for over 3 s, despite a bounded reconnect.
   - **Checked:** the parent's duplicate-`ready` guard and the engine's same-attempt `start` guard look correct. The suspect is the replayed stale `state` message being applied later.
   - **Next step:** trace `worksheet-bridge.js` `m.type==='state'` handling with a timestamp guard. Not reproduced in any user-flow suite.
2. **Golden-worksheet runner:** `browser-golden-worksheet.py`'s own main flow (manual keypad) was not rerun; only its shared helpers were repaired.
3. **WebKit:** most Python runners above were run on Edge only. The Co-Baker help, nearby-ux and help-empty runners also ran on WebKit.
4. **Rebuild discipline:** any further source edit requires repeating the asset re-audit and `sourceDigest` refresh before building; otherwise the APK reverts to ~70 MiB.

## 6. Requires physical tablets (not verified)
- Real Android WebView touch feel, audio and APK install.
- Native LAN and Nearby Connections.

**Two-tablet checklist:**
1. Install the APK on both tablets.
2. A opens an order and taps Find a Helper; B appears as Available.
3. B turns on Do Not Disturb; A sees Unavailable. Turn it off again.
4. A calls; B dismisses. After 30 s A calls again and cancels with ×.
5. A calls; B taps Help → Save & Exit Worksheet. B sees A's live read-only worksheet.
6. B points at a digit and sends a hint; A sees the cue.
7. A completes that step; B's reward receipt appears once.
8. Toggle Wi-Fi on A; the session recovers.
9. A taps End Help twice. Saves, coins and Mastery are unchanged apart from legitimate rewards.

## 7. Evidence
- `output/playwright/six-task-tutorial/`, `output/playwright/cobaker-footer/`
- `output/playwright/package-reveal/`, `output/playwright/co-baker-help/`
- `output/apk-baseline/`
- Temporary git worktrees under the session scratchpad; clean up with `git worktree prune`.
