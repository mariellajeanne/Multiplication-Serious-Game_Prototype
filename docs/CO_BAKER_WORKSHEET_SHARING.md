# Co-Baker Phase 3B: observation, pointing and procedural hints

After accepting a Call for Help, the helper opens a separate read-only worksheet
overlay. Back to bakery hides it; Watch worksheet reopens it. End Helping ends
the learner-owned reservation. The helper's personal iframe remains mounted.
Completion stays visible until either Baker ends assistance or the learner exits
or settles the worksheet. A completed order cannot start another invitation.

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
a random observation stream ID. Only the reserved learner/helper pair and their
current discovery connections may exchange state. The learner responds directly
to that helper with `help/worksheet`, containing the schema, stream, session and
monotonically increasing state version. Existing validated local iframe reports
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
current semantic target/DOM existence. Each watch also issues a random cue token
in the learner's snapshot. Each token expires after 6.5 seconds on learner time;
at most three overlapping leases allow cues in flight during a watch refresh.
Older leases are never extended, and disconnect revokes them all. A fresh watch
rotates the current token. Snapshot schema stays at 2.
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

The existing 15-second Phase 2 disconnect grace remains authoritative. Socket
reconnections fetch a fresh snapshot. A helper refresh may resume within this
grace using a tab-local, short-lived reservation and proof of its prior connection
session. Nothing is stored in `panaderyaQuestV2`. A learner refresh ends assistance
safely; its worksheet uses ordinary solo persistence, and a new Call for Help is
required. Expired sessions require a new invitation. Coordinator replacement does
not own or reset observation. Solo play needs no transport.

The remote development relay now requires protocol **5**. Restart the Node relay
from current source and refresh both browsers together. No cloud service is added
to the Android app; it uses the existing native direct LAN transport.
Rebuild and reinstall the updated APK on both tablets for the new bounded cue
payloads; the native discovery envelope remains version 1.

## Verification

- `node --test tests/*.test.mjs`: existing and focused protocol/security/state tests.
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

Phase 3B ends here. Remote editing, unrestricted chat, helper rewards and shared
progression are outside this phase.
