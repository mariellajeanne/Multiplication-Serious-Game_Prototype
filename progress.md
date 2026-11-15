Original prompt: Investigate and fix remote Co-Baker multiplayer after Phase 2; reproduce authentication, registration, identity, discovery, coordinator, reconnect and invitation failures with automated and actual browser tests. Preserve game mechanics and all transport modes; do not push or deploy.

## Investigation
- Baseline: 24 Co-Baker/coordinator Node tests pass. Existing remote tests cover raw WebSockets, not the actual browser adapter with Phase 2.
- Phase 2 sends help presence automatically on discovery. A running Phase 1 relay retains its old packet validator and closes those connections with 1008 even after successful registration. The adapter incorrectly describes every 1008 as credential/origin/group rejection. Reproduce against the historical relay before fixing.
- Also checking connection epochs, duplicate tabs, session replacement, stale UI status and registration readiness.
- Using develop-web-game and playwright skills; existing Python Playwright and Node skill adapter are available under .test-tools.

## Fix and evidence
- Reproduced the reported generic rejection in real Chrome/Edge through a local TLS proxy using the exact pre-Phase-2 relay/core from commit 2d9e056 (generated historical files under ignored output/remote-repro). Both upgraded/registered, then Phase 2 help traffic triggered rejection. This confirms a code-level compatibility failure, not the version of the user's live relay.
- Remote relay now acknowledges protocol 2 and supplies fixed safe error codes for authentication, registration, packet, route, and rate limits. Password/origin/group restrictions remain. Profile fields are compared by value, not JSON property order.
- Adapter waits for compatible registration before discovery/election/sends, keeps duplicate tabs passive until promoted, bounds stalled registration, ignores superseded socket events, and reports actual error categories. Repeated Connect with identical config is idempotent.
- Valid traffic clears stale errors; popup status follows actual registration. Session replacement retires coordinator challenges/leases and old help reservations even without a left event.
- 195/195 Node regressions pass, including new protocol/lifecycle/session/security tests.
- Real browser remote suite passed Chrome/Edge/WebKit with four isolated profiles, messages both ways, refresh, duplicate-tab takeover, repeated clicks, popup reopen, authentication recovery, group isolation, relay outage/restart, coordinator replacement, Call All/first-helper-wins/end. Screenshots inspected at 2000x1200 and 1280x800.
- Historical relay after fix: explicit outdated-relay instruction; coordinator stays Offline and no Phase 2 traffic starts.
- Existing browser-coordinator.py passed local Chrome/Edge, three Bakers, failover, paused renderer, tab takeover, refresh, relay restart and continued solo worksheet use.
- Existing browser-co-baker-relay.py also passed real Edge/WebKit discovery, both-way messaging, duplicate identity, name update, outage/reconnect and independent saves. The complete remote browser suite passed again after adding home captures; inspected both required home resolutions.
- develop-web-game skill client ran successfully using existing local adapter. No UI redesign or worksheet/economy edits. No push/deployment.

## External retest remaining
- No cloudflared executable or supplied live tunnel was available. No actual Cloudflare, GitHub Pages deployment, or physical Android LAN/device test performed. Follow docs/CO_BAKER_REMOTE_TESTING.md: restart Node from updated source, verify protocol 2 banner, publish browser files through the user's normal workflow, hard-refresh and connect independent profiles via the current tunnel.

## Phase 2 verification — 2026-11-15
- Inspected the current working tree; retained all pre-existing remote protocol/lifecycle changes. No Phase 3 work.
- Reproduced four additional failures with regressions before fixing: cancel after acceptance failed to clear the helper's confirmation wait; expired confirmation silently ignored a late assignment and stranded the learner lock; a delayed accept from an already declined helper could win; a replaced peer's old session could roll back discovery and destroy its current reservation.
- Minimal fixes in src/network/help-requests.js and src/network/co-baker.js: cancel matches pending confirmation ownership, rejected assignments send the existing session-specific end message, declined recipients cannot win, and a bounded retired-session set ignores superseded packets. Matching assignment replays remain harmless.
- Added five meaningful regression cases, including stale assignment/end safety and worksheet exit. All 200 Node tests pass (node --test tests/*.test.mjs).
- Added tests/browser-co-baker-help.py: four isolated Edge/WebKit profiles, actual settings and request buttons, Direct Call, Call All, DND, decline, cancel, acceptance, first-helper-wins, expiry (existing Help clock injection), ending from either role, unrelated coordinator departure during pending AND active reservations, and actual participant socket replacement within grace. Checks exact bakery saves and both independent worksheet sessions, including real generated-product work, remain unchanged.
- Browser verification passed: python tests/browser-co-baker-help.py; python tests/browser-co-baker-remote.py (Chrome/Edge/WebKit, local TLS proxy); python tests/browser-coordinator.py (Chrome/Edge, including suspended renderer and outage/restart). No page errors.
- Skill client passed with the existing local Playwright adapter; inspected its Settings screenshot/text, Phase 2 connected learner/helper captures and current home at 2000x1200 and 1280x800. Artifacts remain under output/playwright/. git diff --check passes.
- Scope: existing transport/protocol and reservation behavior only; bakery artwork, worksheet implementation/layout, gameplay and economy unchanged. No push/deployment. Physical Android LAN and actual Cloudflare Tunnel remain external checks; local browser/TLS results do not establish those device/network environments.
- Stop here after Phase 2 verification; do not begin Phase 3 without a new request.


## Phase 3A - live read-only worksheet sharing, 2026-11-15
- User request: Phase 3A only from attached request. Preserved existing Phase 2 edits, procedural mechanics, saves, economy and transports. No push/deployment.
- Added semantic schema/snapshot projection and session/connection/stream/version checks in src/network/worksheet-observation.js. Existing local iframe reports drive deduplicated outbound state. No network-to-learner input/state path.
- Separate read-only helper iframe reuses production renderer; own iframe stays mounted. Added WebKit readiness retries after reproducing initial message loss. Step/connection status, Back to bakery, Watch worksheet, End Helping; completion visible until ending/exiting/settling.
- Fresh snapshots on socket reconnect; helper refresh proves short-lived tab-local reservation within 15-second grace. Learner refresh ends assistance safely, preserving ordinary solo persistence. Coordinator independent.
- Extended local/remote/native validators for bounded observation data. Remote test protocol is now 3: restart relay and refresh browsers together. APK retains native direct LAN, no cloud dependencies.
- 205/205 Node tests pass, including 5 focused observation tests. New isolated Edge/WebKit relay test passes live production 79 x 18, provisional/corrected carries, Undo/completion, blocked observer input, socket reconnect/helper refresh, both-role endings, unrelated Baker isolation and save preservation (ordinary reload orderClock excluded).
- Existing browser-co-baker-help.py passes; fixed repeated unchanged notice replacement discovered by regression. Existing remote TLS suite passes Chrome/Edge/WebKit; production hub/UI replacement pass Edge/WebKit.
- Existing worksheet CDP regression passed with permitted browser-launch access after sandbox attempt stalled: carrying math, tap/drag, Undo, swipe, settings, reload, one-time claims and animation/completion fallback.
- Android debug APK build and 9 JVM native-validator tests pass. No physical Android device/LAN, live Cloudflare or deployed GitHub Pages verification. Docs: docs/CO_BAKER_WORKSHEET_SHARING.md.
- Skill client passed; inspected its worksheet screenshot/text and helper provisional/completion at 1280x800 and 2000x1200. All browser artifacts under ignored output/.
- Final source/package/check refresh in progress. Stop after Phase 3A: no hints, pointing, editing or helper rewards.

- Final verification complete: new observation browser test rerun passes; generate-answer test now waits for the accepted reveal before the next action. Final smoke/focused tests and git diff --check pass. Current debug APK rebuilt successfully; 9 native tests remain passing. Inspected current home at 1280x800 and 2000x1200, final skill screenshot/text and observer screenshots. No outstanding Phase 3A implementation work; external Android/tunnel verification remains unperformed. Stop here.


## Phase 3A.1 - faithful read-only workbench
- Request: share current production worksheet/calculator/tray/Golden Challenge presentation; keep scope read-only, no hints/pointing/new rewards.
- Cause: Phase 3A mirrored only arithmetic iframe, deliberately disabling external-calculator mode; current calculator lives in parent shell.
- Extracted shared pure calculator/tray/workspace/layout components. Learner creates authoritative visual model (schema 2); helper loads presentation-only document plus existing engine in read-only mode. No input/reward/game-state scripts loaded by viewer.
- State includes calculator output, Golden Challenge offer/entry/tries/success, actual available digits, carry equation, selection and placement guidance. Keeps existing session/version/grace logic; remote protocol 4 rejects outdated relay. Native validator extended to schema 2.
- 205 baseline Node tests pass after extraction. Live Edge/WebKit relay test passes including added challenge offer/wrong/correct attempts and calculator DOM equality; adjusting observer-only sizing after screenshot revealed footer clipping. Further focused/native/regression verification underway.

- Final Phase 3A.1: 208 Node tests pass, including visual-only update ordering, malformed presentation rejection and pure shared renderer/read-only checks. Existing help and remote TLS browser suites pass; production UI replacement passes Edge/WebKit. Existing CDP worksheet regression passes carrying/tap/drag/Undo/swipe/settings/reload/claim-once and animation fallback.
- Real Edge/WebKit isolated relay test compares calculator DOM and live guidance text, exercises deterministic Golden Challenge offer/wrong/correct attempts, provisional/carry correction/Undo/completion, blocked input, own saves, session ending, socket reconnect/helper refresh. Landscape 1024x768, 1280x800 and 2000x1200 bounds and screenshots pass.
- Observer-only transform sizing avoids nested scrolling/iframe distortion; local render acknowledgements retry delayed inner updates with ordered render versions. Learner layout and gameplay unchanged.
- 9 native JVM tests pass (including schema 2 full calculator/tray); debug APK build succeeds. No physical device/LAN, deployed Pages or live tunnel verification. Remote relay now protocol 4: restart from source and refresh both browsers.
- Skill client passed; reviewed worksheet screenshot/text, final helper challenge/provisional/completion screenshots and current home at 1280x800 and 2000x1200. Artifacts remain in output/. Existing sharing doc updated in place. No new dependencies, pushes or deployment. Stop after Phase 3A.1; no pointing/hints/helper rewards.
