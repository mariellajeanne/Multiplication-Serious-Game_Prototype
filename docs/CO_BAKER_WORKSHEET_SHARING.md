# Co-Baker Phase 3C: observation and session recovery

After accepting a Call for Help, the helper opens a separate read-only worksheet
overlay. Back to bakery hides it; Watch worksheet reopens it. End Helping ends
the learner-owned reservation. The helper's personal iframe remains mounted.
Connected completion stays visible until either Baker ends assistance or the
learner exits or settles the worksheet. Completion during an outage releases the
reservation. A completed order cannot start another invitation.

## Data flow and authority

`src/network/worksheet-observation.js` projects the existing engine session into
schema 2: operands, digit arrays, row/column, procedural flags, partial rows,
carry slots, sum, completion, and the learner-owned calculator/tray/guidance view.
Calculator paints also publish changes, including Golden Challenge input before
the engine changes. Schema 1 remains valid for arithmetic-only compatibility.
History, reward ledgers, coordinates, ticket metadata, timestamps, economy and
bakery saves are excluded.
The same bounded validator is used by browsers and the development relays; the
native Java validator accepts the corresponding bounded schema.

The helper sends a `help/watch` request with the confirmed Phase 2 session ID and
a random observation stream ID and increasing `watchVersion`. Only the reserved learner/helper pair and their
current discovery connections may exchange state. The learner responds directly
to that helper with `help/worksheet`, containing the schema, stream, session and
monotonically increasing state version and the requested watch generation. Existing validated local iframe reports
drive subsequent deduplicated snapshots (the engine checks for changes every
180 ms). Periodic watch requests refresh the authoritative snapshot. There is no
input replay or requirement to receive every intermediate animation frame.

Receivers reject unrelated roles, peers, connections, sessions, streams, malformed
fields and non-increasing versions. Only the helper's observation cache accepts
network state; the learner's arithmetic, run and reward ledger have no inbound
state or command path. Phase 3B adds presentation-only cues described below.

`worksheet/worksheet-observer.html` loads the same pure calculator, digit tray,
workspace and sizing components (`src/ui/worksheet-components.js`) and production
styles. Its nested `worksheet-engine.html?observe=1` uses the existing renderer
with external-calculator mode and learner guidance. Only observer container sizing
changes; learner geometry stays unchanged. Calculator numbers come from the
learner's view model. No bakery state, challenge/reward logic or command functions
are loaded in the observer document. All worksheet controls have handlers removed,
are disabled, and inputs are blocked in capture phase. Its inner bridge accepts
only validated snapshots and readiness probes. Point taps are reported separately
from gameplay input. Render acknowledgements retry a
delayed frame update. Source/origin and network session/version checks stay in
place; network strings are escaped. The helper's personal iframe stays mounted.
If a read-only child document loads without its bridge during an interruption,
readiness probes and a six-second load watchdog retry only that child document.
Its fresh snapshot is reapplied without invoking any learner action or reward.

## Semantic pointing and hints

The compact helper toolbar explains tap-to-point and offers six fixed hints:
ones column, carry, next digit, placement, adding rows and trying again. There
is no free text. Both mouse and touchscreen taps go through the observer's
existing capture-phase input gate; ordinary clicks, drags and keys remain
blocked. Scrolling/dragging more than 12 local pixels cancels a pending tap.
Only the semantic ID is sent, never pointer coordinates or movement.

`src/ui/worksheet-cues.js` is the shared DOM adapter for the production worksheet
and both observer documents. It maps existing digit attributes and control IDs:

| ID example | Meaning |
| --- | --- |
| `top:0`, `bottom:1` | Operand digit, indexed from ones |
| `carry:1` | Carry value/destination above the tens digit |
| `slot:0:2` | First partial-product row, hundreds column (empty or filled) |
| `calculator:product`, `calculator:tray` | Actual learner product/tray |
| `calculator:ones`, `calculator:tens`, `calculator:carry` | Visible digit/carry source |
| `control:generate`, `control:undo`, `control:add`, `control:challenge` | Relevant visible control |

Each document resolves the ID at its own layout size. A single teal bakery-ink
outline follows the corresponding element for 2.4 seconds, with a brief entrance
and reduced-motion support. New pointers replace the previous one, including
across the calculator/inner-worksheet boundary. The helper sees the same local
confirmation. Missing or hidden targets are ignored.

`help/point` and `help/hint` reuse the existing direct transport. The shared
`Guidance` receiver validates the confirmed learner/helper roles, assistance
session, sender internal player ID and connection session, recipient internal
ID, observation stream, positive increasing sequence, bounded payload and
current semantic target/DOM existence and the observed `stateVersion`. Each watch also issues a random cue token
in the learner's snapshot. Each token expires after 6.5 seconds on learner time;
at most three overlapping leases allow cues in flight during a watch refresh.
Older leases are never extended, and disconnect revokes them all. A fresh watch
rotates the current token. Any change to the shared math/calculator presentation
revokes tokens for the previous visual state, so a delayed point cannot refer to
a different step occupying the same semantic cell. Snapshot schema stays at 2.
Send and receive limits are one pointer per 600 ms and one hint per 2.5 seconds.
Rate-limited sequences are consumed so they cannot be replayed later.

Hints show the sender's Baker Name using text nodes in one nonblocking cream
notification for 4.2 seconds. It occupies the footer progress space between Undo
and Complete Order, avoiding digits and buttons. A new hint replaces it. Session
end or disconnection clears both cues immediately; neither is persisted or
queued for reconnection. Existing unverified transport identities retain their
existing trust model; this is reservation authorization, not new cryptographic
identity authentication.

Only overlay elements change on the learner. No new commands enter the game
bridges, no values/placements are calculated or supplied, and no save, Mastery,
coins, Golden Challenge logic, individual progression or helper rewards change.

## Disconnects and limits

The existing 15-second Phase 2 disconnect grace remains authoritative. Discovery
does not clear the reconnecting status: the learner must receive a valid watch,
and the helper must receive a fresh authoritative snapshot. The helper rotates
its stream on interruption; increasing watch generations reject old requests and
responses. State versions never reset within a reservation, including refresh.
No learner actions are replayed. Nine seconds without observation contact also
marks the session disconnected when discovery traffic alone still appears alive.

Both roles can refresh within grace using `panaderyaObserverV1` in tab-local
sessionStorage: reservation IDs, prior connection, version floors, and a bounded
expiry. A disconnected deadline never slides on refresh, rediscovery or retries.
Learner recovery additionally requires the exact saved local worksheet attempt,
still open and unfinished. A `help/resume` proves the learner's previous
connection to its reserved helper; the helper requests fresh state. The existing
watch proof restores a refreshed helper. Both pages can refresh together.
Recovery metadata contains no worksheet, action, reward or bakery data and never
writes `panaderyaQuestV2`. All math comes from ordinary learner-local persistence.

Missing/expired tab metadata, a changed/paused/completed attempt, a missing peer,
or an unsuccessful handshake ends help safely. The learner can continue solo and
issue another Call for Help on an unfinished worksheet. End Helping/End help,
Save & Exit and settlement revoke observation and cue state. A lost end message
is resolved by the next watch or the original timeout; it never resurrects a lock.

Coordinator changes remain advisory and silent: no coordinator owns reservations
or worksheet traffic. A returning coordinator learns Busy through ordinary peer
presence and cannot assign another helper. While the whole relay is offline,
discovery and election are offline too; election cannot restore communication.
Solo play, saves and ordinary rewards remain available. Compact status appears
in the worksheet header and observer status area; active-session floating notices
are hidden while those views already show the session.

The remote development relay now requires protocol **6**. Restart the Node relay
from current source and refresh both browsers together. No cloud service is added
to the Android app; it uses the existing native direct LAN transport.
Rebuild and reinstall the updated APK on both tablets for the recovery/watch/cue
payloads; the native discovery envelope remains version 1.

## Verification

- `node --test tests/*.test.mjs`: existing and focused protocol/security/state tests.
- `python tests/browser-co-baker-recovery.py` and the same command with `--remote`:
  three isolated Edge/WebKit clients through local WebSockets or the production
  remote adapter/local TLS proxy. Tests active drag through helper interruption,
  provisional carry/Undo, each role's refresh, stale hints, coordinator loss and
  return, brief/prolonged relay restart, repeated cycles, End Helping offline,
  real grace expiry, 79 x 18 completion offline, equal-digit semantic columns,
  worksheet exit and independent saves. Artifacts: `output/playwright/`.
- `python tests/browser-worksheet-observation.py`: three isolated Edge/WebKit
  profiles through the actual local WebSocket relay; production 79 × 18 procedure,
  provisional placement, carry correction, Undo, completion, blocked observer
  input, helper refresh/socket reconnect, learner/helper endings and unrelated
  Baker isolation. Helper and unrelated saves are compared in full except the
  normal order-generation clock refreshed by reload. The helper's math state is
  also checked after refresh.
- `python tests/browser-worksheet-observation.py --remote`: the same scenario
  through the production remote browser adapter and a local TLS proxy/remote
  relay. Both runs include actual mouse/touch semantic taps across resolutions,
  calculator/tray/carry/partial-product/control targets, hint placement and expiry,
  unrelated-sender rejection, unchanged saves, termination cleanup and departure
  of the unrelated incumbent coordinator (then two remaining clients).
- Existing Phase 2/remote, production hub/UI, and worksheet browser regressions.
- Android JVM validator tests and debug APK build are distinct from physical
  device verification. No physical Android LAN, live Cloudflare Tunnel or deployed
  GitHub Pages verification is implied by local browser/TLS results.

Phase 3C ends here. Remote editing, unrestricted chat, helper rewards and shared
progression are outside this phase.

## Manual browser verification

1. Run `npm.cmd run dev:cobaker`. Open the printed identical URL ending in
   `?cobaker=debug&webrelay=1` in three independent browser profiles (for example,
   Edge, Chrome, and a separate InPrivate profile). Keep all three visible. The
   first Baker becomes coordinator. Normal browser tabs share identity and are
   not independent clients. Use a trusted local network for this development relay.
2. Start orders on the other two profiles. On the learner, choose Call for Help,
   Call the helper, then Accept on the helper. Confirm the helper's own order stays
   saved. Compare calculator, provisional digits, carry cells and Undo while solving.
3. In the helper's DevTools Network panel select Offline, then run
   `panaderyaCoBaker.transport.socket.close()` in its console to interrupt the
   existing WebSocket too. The learner shows "Your Co-Baker is reconnecting..."
   and can continue solving. Return the helper to Online within 15 seconds.
   Expect "Connected again!", the latest worksheet, and no replayed hint/pointer.
   Repeat on the learner. Refresh each page in turn within grace and confirm the
   same reservation and learner progress return. Keep the learner on the same order.
4. Close the third profile. Continue pointing and solving while the remaining
   coordinator changes. Reopen the third profile and verify it cannot replace the
   reserved helper. Repeat once with each remaining profile as the initial coordinator.
5. Stop the relay with Ctrl+C. Both clients must show offline/reconnecting while
   the learner keeps practicing. Restart on the same port within grace for recovery.
   Repeat with an outage over 15 seconds: both reservations/observer overlays must
   clear; reconnect and Call for Help again. End Helping during a short outage,
   or finish the learner's order during an outage; neither session may return.
6. Point at equal digits in different columns, carry destinations and calculator
   digits at differing browser sizes. Only the matching element should highlight.
   Use Save & Exit and reload both profiles: personal worksheets, coins and food
   ownership must remain independent. Close the test relay when finished.

For remote browser verification, follow `CO_BAKER_REMOTE_TESTING.md` with protocol
6, the same test group/password and independent profiles. After refresh, reconnect
through Settings > Advanced > Co-Baker network test within grace: the password
is deliberately kept only in memory. If that takes longer, use a new invitation.
Physical Android Wi-Fi loss, background/resume, process death, router isolation,
and real Cloudflare/deployed-site behavior require separate device/network checks.
