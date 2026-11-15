# Co-Baker Phase 3A: read-only observation

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
network state; the learner's iframe, run and reward ledger have no inbound path.

`worksheet/worksheet-observer.html` loads the same pure calculator, digit tray,
workspace and sizing components (`src/ui/worksheet-components.js`) and production
styles. Its nested `worksheet-engine.html?observe=1` uses the existing renderer
with external-calculator mode and learner guidance. Only observer container sizing
changes; learner geometry stays unchanged. Calculator numbers come from the
learner's view model. No bakery state, challenge/reward logic or command functions
are loaded in the observer document. All worksheet controls have handlers removed,
are disabled, and inputs are blocked in capture phase. Its inner bridge accepts
only validated snapshots and readiness probes. Render acknowledgements retry a
delayed frame update. Source/origin and network session/version checks stay in
place; network strings are escaped. The helper's personal iframe stays mounted.

## Disconnects and limits

The existing 15-second Phase 2 disconnect grace remains authoritative. Socket
reconnections fetch a fresh snapshot. A helper refresh may resume within this
grace using a tab-local, short-lived reservation and proof of its prior connection
session. Nothing is stored in `panaderyaQuestV2`. A learner refresh ends assistance
safely; its worksheet uses ordinary solo persistence, and a new Call for Help is
required. Expired sessions require a new invitation. Coordinator replacement does
not own or reset observation. Solo play needs no transport.

The remote development relay now requires protocol **4**. Restart the Node relay
from current source and refresh both browsers together. No cloud service is added
to the Android app; it uses the existing native direct LAN transport.

## Verification

- `node --test tests/*.test.mjs`: existing and focused protocol/security/state tests.
- `python tests/browser-worksheet-observation.py`: three isolated Edge/WebKit
  profiles through the actual local WebSocket relay; production 79 × 18 procedure,
  provisional placement, carry correction, Undo, completion, blocked observer
  input, helper refresh/socket reconnect, learner/helper endings and unrelated
  Baker isolation. Helper and unrelated saves are compared in full except the
  normal order-generation clock refreshed by reload. The helper's math state is
  also checked after refresh.
- Existing Phase 2/remote, production hub/UI, and worksheet browser regressions.
- Android JVM validator tests and debug APK build are distinct from physical
  device verification. No physical Android LAN, live Cloudflare Tunnel or deployed
  GitHub Pages verification is implied by local browser/TLS results.

No hints, pointing, remote editing, helper rewards or shared progression are part
of this phase.
