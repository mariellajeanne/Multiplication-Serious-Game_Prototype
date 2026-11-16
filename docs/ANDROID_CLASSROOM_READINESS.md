# Android classroom readiness audit

The user confirmed physical Android-to-Android LAN connection after disabling
router **WLAN Partition**. This establishes client isolation as the blocker in
that test. It does not establish 40-device capacity or physical acceptance of
this updated APK. No transport bypass, internet dependency or architecture rewrite
was added.

## Retained behavior and minor cleanup

Retained NSD `_panaderya._tcp.`, Wi-Fi-bound IPv4 TCP, five-second maintenance /
connection retries, self filtering, multicast lock, lifecycle/generation checks,
resolver exception handling and bounded queues. Coordinator/session recovery,
worksheet/calculator/cues, independent saves and durable Phase 4 receipts remain
unchanged. Retry candidates persist until success, service loss or lifecycle
restart, rather than being dropped after one failure.

- Prevent duplicate queued/running maintenance jobs for the same endpoint. With
  slow timeouts and 39 peers, repeated five-second batches could otherwise pile up.
  Gameplay messages are not deduplicated or discarded by this guard.
- Track accepted TCP sockets before queuing handlers, so shutdown can close them
  even while handlers are waiting. Rejected sockets close immediately.
- Bound resolution-attempt bookkeeping to 128 names; discard entries on resolution
  success/service loss and clear on shutdown.
- Remove an unused address-selection wrapper and the redundant one-second native
  panel repaint: the existing service observer already repaints on expiry ticks.
- Version label now says `1.0-phase4`, not `1.0-phase1a`; diagnostic revision is
  `classroom-audit-1`. Application ID/versionCode/signing workflow are unchanged.

## Copy Details

Settings > Advanced > Co-Baker network test has one Copy Details button in native
debug builds. The JavaScript summary explicitly selects status/count/role/error
fields, not screen text, profiles, remote relay configuration or saved state.
Android builds the report using a fresh full native diagnostic snapshot, including
fields below the visible scroll area. Android ClipboardManager writes the plain
text on the UI thread; success is acknowledged before showing `Copied!`.

The report includes app/version/revision, native envelope v1, Android OS/API and
manufacturer/model, local IP/listener port, lifecycle, NSD states, the bounded
candidate history, retries, work/socket counts, TCP destinations/counters and
last errors. Summary keys are allowlisted; full hexadecimal/hyphenated UUIDs are
redacted. No Baker names, full Baker UUIDs, relay passwords/tokens or saves are
exported. Native copy, detailed diagnostic export and probe methods reject release
build calls. Candidate history retains at most eight entries; this is a complete
snapshot of the bounded report, not an unlimited event log. Probe remains optional
and debug-only. A no-peer note names WLAN Partition/AP/client isolation and does
not claim isolation can be diagnosed from silence alone.

## SM-T505 compatibility and performance

Given classroom specifications: 3 GB RAM, 64 GB storage, 10.4-inch 2000 x 1200.
Samsung lists 2000 x 1200 and 32/64 GB variants:
https://www.samsung.com/es/business/tablets/galaxy-tab-a/galaxy-tab-a7-t505-sm-t505nzaaeub/

The APK minimum is Android 8/API 26, target/compile API 35. Verify the actual OS
and **Android System WebView version** on classroom units before offline rollout.
The game uses modern JS (including Array.at and String.replaceAll); OS version
alone does not establish WebView compatibility. Provision a current compatible
WebView before disconnecting internet. No ABI-specific native game engine or
continuous 3D rendering is present; the illustrated 2D design remains intact.

The APK is about 36 MiB, so 64 GB storage is not an obvious blocker, subject to
actual free space and normal app-data growth. RAM and CPU suitability are an
inference, not a measurement on SM-T505. Several individual artwork PNGs decode
to about 6 MiB RGBA each, plus WebView/DOM/worksheet/audio/observer overhead.
Check cold launch, carrying math, helper observation, background/resume, thermal
behavior and a sustained session on an actual 3 GB unit. Desktop browser tests
at 2000x1200 and 1280x800 do not emulate tablet RAM, GPU or device-pixel-ratio.
No artwork optimization or visual redesign was made.

## Forty-tablet traffic audit (calculated, not measured)

For N fully connected devices, native hello maintenance alone opens N*(N-1)/5
short TCP connections per second. Availability presence also broadcasts every
five seconds to all peers using separate TCP exchanges. At N=40 these contribute
**312 + 312 = 624 connections/second across the classroom**, before coordinator,
worksheet, invitations, retransmission or reward traffic. Each exchange includes
a response. Startup NSD resolutions and election may add synchronized bursts.

Coordinator heartbeat polling is every three seconds, with leader notices and
probe/state responses. Worksheet snapshots go only to the confirmed helper,
are signature-deduplicated and validated/size-bounded, not broadcast to 39 peers;
watch requests refresh every three seconds. Snapshots are event-driven rather
than globally bandwidth-throttled. Points/hints are rate limited (600/2500 ms).
Pending reward receipts retry every three seconds only to present recipient
identities; a large durable backlog can cause bursts and must not be discarded.

Four worker threads (one commonly waiting on accept), a 64-job queue, bounded
socket timeouts and 8 KiB frames constrain resource use but **do not prove adequate
throughput**. The new maintenance guard prevents identical endpoint jobs from
stacking; it does not eliminate the existing all-to-all traffic. Slow packets and
queue saturation can delay/reject other messages and trigger false peer loss.
Do not describe this version as validated for 40 tablets.

Native sockets close on completion/pause/stop/destroy; candidates and resolver
queues clear on lifecycle shutdown and candidates clear on service loss/success.
JS peers expire after 16 seconds. Failed native endpoints may continue retrying
until NSD service loss or restart; service-name mappings also depend on lost
callbacks/lifecycle cleanup. Test stale NSD/churn, simultaneous join, leader loss,
Wi-Fi interruption, multiple help pairs and reward backlog at increasing counts.

## Acceptance remaining

1. Update both working devices without clearing data; retain WLAN Partition off.
2. Confirm automatic discovery and bidirectional tests. Copy Details and paste
   elsewhere; verify offscreen fields and `Copied!`, with no private Baker UUIDs.
3. Verify helper worksheet/carrying, immediate rewards, ordinary reconnection and
   exactly-once pending reward delivery.
4. Repeat on one classroom SM-T505, then increase device count (e.g. 5, 10, 20, 40)
   on the actual classroom router with its internet uplink disconnected. Record
   discovery time, queue/socket counts, session stability, memory and battery.

Automated results for this change are recorded in progress.md. Browser clipboard
coverage mocks the Android bridge; it does not replace physical clipboard checks.
