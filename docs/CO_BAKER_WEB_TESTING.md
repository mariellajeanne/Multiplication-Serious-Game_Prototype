# Local browser multiplayer testing

Node 22+ required. From the repository root:

```powershell
npm.cmd ci
npm.cmd run dev:cobaker
```

Dependency installation needs internet once; the running server/relay does not.
This is optional development tooling. The normal static solo game needs no npm.

Open `http://127.0.0.1:5500/index.html?cobaker=debug&webrelay=1` in two different
browser profiles (for example Chrome and Edge). On a tablet, open the printed
`http://YOUR_LAPTOP_WIFI_IPV4:5500/index.html?cobaker=debug&webrelay=1` URL. Both
devices must use the same non-guest Wi-Fi. Keep one consistent origin per profile:
localhost, 127.0.0.1, LAN IP and different ports have separate browser storage.

Settings > Advanced > Co-Baker network test shows **Browser Test**, status,
nearby players and test messages. Send tests both directions; verify Test sent,
Test received and Response received. Close a browser and verify disappearance;
reopen to restore the same identity. Stop/restart the server to test automatic
reconnection. Rename a Baker in Settings and verify the peer updates.

Same-profile tabs are one persistent player. The first connection stays active;
extra tabs wait and automatically take over when it closes. This connection
deduplication is separate from Baker coordinator election. Use
separate profiles/devices for separate players. Never edit a real UUID to simulate
another player. Profile storage and bakery saves remain separate and local.

The server binds IPv4 0.0.0.0 on port 5500 (or the next free port through 5510).
Use the URL it prints. If Windows Firewall asks, allow Node
on your **trusted Private network**; do not expose/port-forward this server to the
internet. Guest/AP isolation can block access. To choose a fixed port explicitly,
use `$env:PORT=5501` before the start command; that port must be free.
Ctrl+C stops both the website and relay.

The relay validates origin, a per-run token, packet schema/identity, payload size,
registration deadline and message rate. Five-second ping/presence checks remove
stale connections and keep peer lists fresh. This is a trusted local test tool,
not authentication or a production networking design. Only fixed hello/test/reply and validated coordinator metadata
messages are routed; no game saves, worksheets or reward data are transmitted.

The browser adapter requires BOTH query switches AND the explicit development
server configuration endpoint. Regular static hosting stays unavailable. The APK
always selects Android Native, even with these query switches. Coordinator
election runs in shared game code. Native packet validation/routing accepts the
same coordinator metadata. No help/session gameplay is implemented.


## Phase 1B: coordinator and failover

In **Settings > Advanced > Co-Baker network test**, Coordinator Status shows the
Baker, your role, connected participant count (including you), and heartbeat
health. Expand Coordinator debug details for term/session and heartbeat age.
These details appear only with `?cobaker=debug`; normal game screens are unchanged.

1. Open the printed URL in Chrome and Edge, using separate profiles. After a few
   seconds both should name one coordinator; only one shows My Role: Coordinator.
2. Leave the relay running and close that Baker's tab. Within about 3 seconds
   after the disconnect is observed, a remaining Baker should become coordinator.
3. Reopen the closed tab at the same URL. Its identity persists, and it adopts
   the replacement. A third isolated browser profile can repeat this test.
4. Refresh, switch tabs, and close/reopen participants. New arrivals should not
   replace a healthy coordinator. Same-profile duplicate tabs wait their turn.
5. Separately, stop the relay with Ctrl+C: all clients should report Transport
   unavailable, with no coordinator. Restart it on the **same port**; they
   reconnect and agree again. A server outage is not successful Baker failover.

The local process serves both HTTP assets and WebSockets. An already loaded
worksheet remains interactive during an outage; opening/reloading documents or
uncached artwork still needs that HTTP server. This is a browser development
hosting limit, not a dependency of the installed APK's bundled solo game.

Protocol: allow 2.5 seconds to discover an incumbent before election; otherwise
choose the smallest stable internal player ID among responding eligible peers.
A healthy incumbent stays in place when a lower-ID newcomer joins. Each new
leadership epoch exceeds the highest term observed in memory. Simultaneous or
partitioned leaders converge by higher term, then smaller ID, then smaller
session ID. Display names and Baker Numbers never decide leadership.

Every 3 seconds the coordinator announces its presence and participants request
fresh status; the coordinator also checks responding participants for newer
epochs, so healing during an election cannot leave a rejected old leader stuck.
Only a direct response matching an outstanding random challenge
(within 4.5 seconds, consumed once) renews a lease. At 6.5 seconds without a valid
response, status is Heartbeat delayed; at 10 seconds, retire the epoch and gather
for replacement election. Explicit peer departure starts gathering immediately.
Timers use a monotonic clock; delayed/throttled execution may lengthen recovery.
On resume or transport reconnection, discard old leases/challenges and discover
again. A returning former coordinator adopts the current healthy incumbent.

There is no quorum or authenticated identity: partitions can temporarily have
separate coordinators. This is advisory presence, **not authority to perform
help, worksheet, reward, or save actions**; those packet types are rejected.
Future help acceptance must independently bind to a fresh current
(term, coordinator ID, coordinator session), learner-owned request/session IDs,
expiry and consent, and invalidate pending actions on leadership change. A term
alone is not authorization. Physical Android suspension, NSD/TCP delivery and
LAN partition behavior still require device testing.

Automated checks: `node --test tests/*.test.mjs` covers simulated clocks, races,
partitions, duplicate/stale packets and validation. `python tests/browser-coordinator.py`
uses actual Chrome/Edge with separate storage, a third isolated context,
coordinator close/return, duplicate tabs, refresh, navigation disconnect,
CDP-paused JavaScript (simulated suspension), relay restart and loaded solo play.
These browser relay tests do not establish production-ready Android migration.
