# Co-Baker Phase 3A: read-only observation

After accepting a Call for Help, the helper opens a separate read-only worksheet
overlay. Back to bakery hides it; Watch worksheet reopens it. End Helping ends
the learner-owned reservation. The helper's personal iframe remains mounted.
Completion stays visible until either Baker ends assistance or the learner exits
or settles the worksheet. A completed order cannot start another invitation.

## Data flow and authority

`src/network/worksheet-observation.js` projects the existing engine session into
schema 1: operands, digit arrays, row/column, procedural flags, partial rows,
carry slots, sum and completion. It excludes history, reward actions, coordinates,
calculator guidance, ticket metadata, timestamps, economy and bakery saves.
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

`worksheet/worksheet-engine.html?observe=1` reuses the production renderer in a
separate frame. It never starts a worksheet attempt or reports gameplay actions.
Input events are intercepted, controls hidden, audio/guides disabled, and the
parent bridge accepts only validated observation snapshots and readiness probes.
No network-supplied strings are interpreted as HTML. The shell checks the
observer frame's source and origin separately from its personal worksheet bridge.

## Disconnects and limits

The existing 15-second Phase 2 disconnect grace remains authoritative. Socket
reconnections fetch a fresh snapshot. A helper refresh may resume within this
grace using a tab-local, short-lived reservation and proof of its prior connection
session. Nothing is stored in `panaderyaQuestV2`. A learner refresh ends assistance
safely; its worksheet uses ordinary solo persistence, and a new Call for Help is
required. Expired sessions require a new invitation. Coordinator replacement does
not own or reset observation. Solo play needs no transport.

The remote development relay now requires protocol **3**. Restart the Node relay
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
