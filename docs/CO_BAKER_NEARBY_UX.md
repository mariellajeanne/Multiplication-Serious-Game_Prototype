# Offline Nearby and Co-Baker UX

This milestone adds an **integrated, experimental** Google Play services Nearby
Connections transport to the existing Android wrapper. It uses the existing
validated Co-Baker envelopes, learner-owned session reservation, observation,
semantic pointing/hints, recovery, and durable Phase 4 receipts. It does not add
a second game engine. Native LAN and both browser test relays remain supported.

## Transport and classroom limits

The debug APK starts with **Android Native LAN**. In Settings → Advanced →
Co-Baker network test, select **Nearby Connections (Experimental)** on both
devices. The choice persists on that installation. Transport changes and Retry
are disabled while a session, outgoing call, or acceptance is active. There is
no automatic fallback or simultaneous LAN/Nearby operation. Use the same current
APK on both tablets. Browser relay wire version remains 8: the presence schema
additively accepts the old `busy` field but new clients send only `available`.

Nearby uses `P2P_CLUSTER`, rather than a classroom-wide star host or an exclusive
point-to-point topology. Cluster permits independent temporary pairs, but the
app imposes **three local radio links maximum** and only one code comparison at
a time. This is an application bound, not a tested SDK/device capacity claim.
Coordinator election is retained as advisory presence **within the connected
component**. It does not represent all discovered candidates and never
authorizes worksheet access or rewards.

Foreground devices advertise their persistent Baker identity, display name,
number and calculated availability. Opening Call for Help or Find Bakers renews
bounded 12-second scans while open. Closing the picker stops discovery and
automatic refill, preserving delivered calls. Finding a device never connects
it. Candidate display expires after
45 seconds without a connected peer or another discovery result. Choosing Call
establishes only the required radio link. Both users compare and accept the
same SDK authentication digits. Rejection, permission/service failure, timeout
and old lifecycle callbacks cannot authorize a worksheet. The existing separate
help acceptance is still mandatory after radio pairing.

Find Helpers runs one 60-second automatic search, sharing three logical slots
with manual Call buttons. Slots reserve immediately during setup; each target
has a separate 32-second setup bound and five-second delivery-ACK bound. A strict
`delivered` acknowledgement starts the 15-second actionable invitation. Both
native and browser validators accept this additive message; use matching current
clients/relays. Closing/reopening the picker preserves pending calls and pauses/
resumes refill within the same search deadline. Stop Finding cancels random
calls only. Individually cancelling a random call pauses refill until Find Helpers
is pressed again. Manual calls never replenish on their own.

Selection uses reachable availability, no simultaneous UUID duplicate, untried
candidates, least recent contact, then fair random ties. Favorites and gameplay
statistics never influence it. Radio capacity is separate: at most three actual
links, one code-comparison setup at a time. Queued manual setups precede random
setups and receipt work; active worksheets are never evicted. Idle temporary
connections drain for about one second before explicit release (plus the existing
native idle fallback). Active sessions, delivered invitations and accepting
reservations retain their links. Connections carry validated BYTES, not files.

Outstanding learner reward outboxes initiate a bounded scan at most once per
minute and connect only to reachable receipt recipients. Receipt-only links get
a bounded delivery lease and are released even if an acknowledgement remains
missing; durable receipts retry on the next reconciliation. Existing active
sessions also request bounded recovery discovery. Authenticated radio pairing
may be requested again after reconnecting; confirm only matching digits. The
existing 15-second session recovery grace is unchanged; slow pairing can exceed
it and require a new invitation. Earned receipts remain durable regardless.

**Native LAN retains its existing verified NSD/TCP discovery and maintenance
model.** Its classroom-wide traffic has not been redesigned as sparse discovery.
See [the classroom audit](ANDROID_CLASSROOM_READINESS.md). Browser relays also
retain their existing participant-group discovery. The sparse lifecycle above
applies to Nearby. Neither mode has been validated with 40 physical tablets.

Nearby chooses the underlying Bluetooth/Wi-Fi media. Successful SDK startup or
discovery is **not proof of WLAN Partition bypass**. Diagnostics explicitly say
the medium is SDK selected; physical transfer tests below establish the result.

## Favorite Bakers, availability and invitations

One picker lists active calls, Favorite Bakers and Other Bakers in that order.
Favorite/Other sections sort by name then visible number; pending Bakers appear
once. Filled/outlined hearts toggle UUID favorites, including in active rows.
The existing `panaderyaCoBakerPreferencesV1` storage/`crew` property remains for
save compatibility. Favorites never connect peers. The fixed top pill shows
0/3 through 3/3 with a proportional fill; the list has a visible native scrollbar.
Individual rows show call source, local countdown/bar, and a cancel X.

Help Notifications saves six mute preferences. All are off for new profiles:

- Do Not Disturb overrides every child.
- In My Bakery and In Any Worksheet are equal-level options.
- Solving On My Own, Being Helped and Helping Another Baker are nested under
  In Any Worksheet, which overrides those three.

Overridden controls are disabled without clearing their saved values. Only the
resulting Available/Unavailable boolean is public. Solving/helping/being helped
remain local context. Being Available does not remove the one-session lock.

Requests use one compact horizontal row, local countdown and a visible native
scrollbar. They dock above the visible learner calculator or in the helper
viewer's reserved header area. In short/narrow layouts several requests collapse
to a count until expanded. Bakery requests use a small corner tray. No request
overlays worksheet drop targets. This dock preserves the existing multiplication
grid, calculator positions and shared learner/helper presentation.

Call for Help always opens the same picker. Cancellation briefly shows
"cancelled the call"; a winner shows "found help!" to other invited Bakers.
Both dismiss after about two seconds. Expiry is quiet. Left swipe or the
accessible X dismisses a request locally and records a replay tombstone.

Learner End Help uses the same delayed two-tap in-place pattern: the second
button is red, rapid double taps are blocked, and the confirmation expires.
Removal revokes observation immediately and keeps the same live worksheet frame,
progress, delivered suggestions and durable exactly-once reward receipts.

Helping another learner requires a second tap on the same red confirmation
button. Leaving a personal worksheet uses orange Save & Exit Worksheet.
Confirmation cannot execute within 650 ms of the first tap. Back cancels the
confirmation. The existing exit captures engine actions and now refuses a
failed save. Switching revalidates expiry/session ownership, serializes races,
ends only the old live session, and retains earned/pending contribution data.
No coin penalty is added.

Central rules are `CoBakerHelpRules` in `src/network/help-requests.js`: three
shared outgoing slots; one 60-second automatic search; 15-second validity;
30-second per-UUID repeat cooldown; 45-second cooldown after interrupted/cancelled/
failed calls; twelve outgoing attempts per rolling minute; one new incoming
caller request per 30 seconds; 24 incoming rows; 256 retained anti-replay records
for 120 seconds. Acceptance remains learner-authoritative and first-helper-wins.
Rate/replay windows are in memory and reset on app restart; editing client saves
or code is not an adversarial trust boundary.

The worksheet gear now opens the same shared Settings as the bakery, including
sound, Guide/tutorial, profile, Co-Baker and Help Notifications. The helper viewer
also has Settings. Opening it preserves the current reservation and worksheet.

## Diagnostics and permissions

Debug Network Test has one-tap **Copy Details** using Android ClipboardManager.
It generates the complete bounded report from state, including offscreen fields.
The report includes device/OS/build/protocol, selected transport, availability,
candidate/connected counts, coordinator/session status, native LAN address/NSD
state or Nearby lifecycle/failures/setup latency, and latest relevant errors.
It excludes credentials and redacts permanent UUIDs. “Copied!” acknowledges
success. Debug-only diagnostics are not a transport success test.

Nearby requires installed, compatible Google Play services, Wi-Fi and Bluetooth
enabled. Actual classroom use needs no internet. Permission requests are:

- Android 8–11: coarse/fine Location, with Location services enabled.
- Android 12/12L: Location plus Bluetooth scan/connect/advertise.
- Android 13+: Nearby devices (Bluetooth scan/connect/advertise and nearby Wi-Fi).

Denial or unavailable Play services gives a recoverable message; solo play and
the selectable Native LAN transport remain available. Retry after correcting
permissions/radios. The app targets API 35; a future target SDK 37 upgrade must
revisit Android 17 local-network permission requirements.

Implementation references: Google's [strategy API](https://developers.google.com/android/reference/com/google/android/gms/nearby/connection/Strategy),
[permission requirements](https://developers.google.com/nearby/connections/android/get-started),
[authenticated connection lifecycle](https://developers.google.com/nearby/connections/android/manage-connections)
and [BYTES payload API](https://developers.google.com/nearby/connections/android/exchange-data).

## Exact two-device physical test

1. Install `android/app/build/outputs/apk/debug/app-debug.apk` on both tablets
   using `adb install -r` or an in-place APK upgrade. Preserve existing app data.
   Set distinct Baker names in Settings and record each visible four-digit ID.
2. Start with Native LAN on both. On the already verified Wi-Fi with WLAN
   Partition disabled, confirm discovery and Send test/Response in both
   directions. Solve an order with help and confirm pointing, hints and rewards.
3. End help/cancel pending calls. On both devices open Settings → Advanced →
   Co-Baker network test and select Nearby Connections (Experimental). Grant the
   OS permissions. Ensure Wi-Fi, Bluetooth and older Android Location services
   are enabled. Confirm diagnostics show Nearby rather than simultaneous NSD.
4. Enable **WLAN Partition/client isolation** on the classroom router. Keep both
   tablets on that SSID and disconnect the router's internet uplink. Relaunch
   the apps, keeping both foreground. Copy Details on both before testing.
5. On A tap Find Bakers in Network Test. A should discover B exactly once. Tap
   Send test for B, compare the code physically on both tablets, and confirm
   only if it matches. Check Test received/Response received, then test B → A.
   Record discovery and actual payload results separately. Copy Details on both.
   If this fails, the build has not established a bypass; record the errors and
   selected transport without inferring a specific wireless medium.
6. On A open/resume 79 × 18, Call for Help → B → Call. Pair again if requested.
   B should see a 15-second row only after setup; radio pairing alone must never
   show A's worksheet. Accept on B (confirm Save & Exit if B has personal work).
   Verify the read-only mirror, digit pointing, preset hints and a followed
   suggestion paying exactly once. Complete the carry procedure normally.
7. End the live session. Save B to Favorite Bakers on A; reopen/relaunch and verify the saved
   heart. Wait a few seconds and check unused Nearby connected count drops
   while advertising remains on. Opening the picker should scan without automatically
   reconnecting every favorite. Background B: A should eventually show Not nearby.
8. Check all six mute switches, parent disabling/restoration and Available/
   Unavailable on the other tablet. Open Settings from learner and helper views;
   verify progress and active help survive. Cancel a call, dismiss a row by left
   swipe/×, let another expire, and check the 30-second direct cooldown.
9. Leave an earned receipt undelivered by taking B offline before following a
   previously delivered suggestion. Save/exit/relaunch both, restore B and
   discovery, confirm pairing if asked, and verify ordinary-peer delivery pays
   once without another help session. Retest independent bakery saves.
10. Repeat with Wi-Fi on but disconnected from the classroom AP, Bluetooth on,
    and no internet, recording that as a distinct scenario. Deny permission,
    turn radios off/on, reject pairing and background/foreground each device.
    Copy each complete report. Restore Native LAN on both and repeat step 2.

Two devices cannot prove three-call arbitration across multiple receivers, helper
switching among multiple learners, or 40-student capacity. Those have automated
multi-client coverage and require a later three/four-tablet classroom test.

## Automated validation

See `progress.md` for the final run results. Focused additions include
`tests/nearby-transport.test.mjs`, `tests/baker-preferences.test.mjs`, extended
help protocol tests, `tests/browser-co-baker-nearby-ux.py`, and native
`NearbyDiscoveryTest`. Adapter tests simulate bridge events; JVM tests cover
permission selection, metadata/identity bounds and shared packet validation.
They do not execute Google radios, OS permission dialogs, WLAN isolation or
physical tablet clipboard behavior. Existing worksheet, helper rewards, relays,
coordinator, save/migration and native LAN validator regressions remain in use.
