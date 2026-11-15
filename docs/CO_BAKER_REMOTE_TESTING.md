# Co-Baker remote browser testing (temporary, internet required)

This is an **opt-in development tool**, not the final Android LAN solution.
It connects a GitHub Pages game to a **separate, password-protected WebSocket relay** on your laptop through a Cloudflare Quick Tunnel. Testers may be on different Wi-Fi networks or in different cities. **No worksheet, bakery saves, mastery or rewards are transmitted.** Phase 2 adds availability, Call for Help invitations, first-helper-wins reservations, and session-ending messages. Live worksheets, hints, and rewards are not transmitted or implemented yet.

This mode requires a current GitHub Pages deployment containing the patch. Ordinary visitors without debug query parameters remain in solo mode. The remote relay publishes **no game files, repository paths or `/__co-baker/config` endpoint**. It listens on `127.0.0.1`, not on your LAN address. Keep its password private to your small trusted testing group.

## 1. Update and publish GitHub Pages

Apply the patch and run `npm.cmd test` (install development dependencies with `npm.cmd ci` only if needed). When you choose to publish through your usual GitHub workflow, confirm that GitHub Pages contains the updated `src/network/co-baker.js`, `src/network/remote-test-transport.js`, and `src/ui/co-baker.js`. Hard-refresh each testing browser after deployment. The relay code runs on your laptop.

**Stop and restart the Node relay after updating the repository.** An already running Node process retains the previous packet validator. Phase 2 automatically sends `help` availability as soon as another Baker appears; the Phase 1 relay rejects that packet even after a successful WebSocket upgrade and registration. Updating GitHub Pages or restarting only Cloudflare does not update Node. Phase 3A adds bounded worksheet observation packets, so a Phase 2 relay also needs restarting. The current startup banner must say **`protocol 3, Phase 3A observation`**. The browser checks this protocol acknowledgement before discovery or coordinator election; an older relay now produces an explicit restart instruction.

## 2. Start a restricted relay (PowerShell on laptop)

From your project directory, after installing Node 22+ and dependencies (`npm.cmd ci`), run:

```powershell
$env:COBAKER_ALLOWED_ORIGINS = 'https://YOUR-USERNAME.github.io'
$testSecret = Read-Host 'Choose a temporary shared test password (12+ characters)' -AsSecureString
$env:COBAKER_REMOTE_PASSPHRASE = [System.Net.NetworkCredential]::new('', $testSecret).Password
npm.cmd run dev:cobaker:remote
```

**Important:** Replace `YOUR-USERNAME` with the GitHub Pages site's **actual origin**, e.g. `https://mariellajeanne.github.io` if the page URL starts with that domain. Do **not** include the `/repository/` path. The relay refuses to start without an explicit origin and a password of at least 12 characters. To allow both a local test page and GitHub Pages, separate exact origins with commas. Never use `*`.

The relay listens on `http://127.0.0.1:5512` by default. The only ordinary HTTP endpoint is `/health`; all other HTTP paths return 404. It routes only authenticated and schema-validated Co-Baker test and invitation messages, and separates peers by a chosen **test group**. Stop with Ctrl+C. Clear the password from the PowerShell session when finished: `Remove-Item Env:COBAKER_REMOTE_PASSPHRASE`.

## 3. Create an outbound-only temporary tunnel

Install `cloudflared` from Cloudflare's official downloads page: https://developers.cloudflare.com/tunnel/downloads/

Open a **second** PowerShell window and run:

```powershell
cloudflared tunnel --url http://127.0.0.1:5512
```

This prints a temporary URL like `https://random-words.trycloudflare.com`. Copy this address. It changes each time the tunnel restarts. Cloudflare Quick Tunnels are intended for development, require no Cloudflare account and support WebSockets. Everyone with the address can reach the login gate, so **the shared password and exact allowed origin still matter**. Do not tunnel the ordinary `dev:cobaker` server or your whole repository.

## 4. Connect from GitHub Pages in each browser/device

1. Open the real GitHub Pages game URL, adding `?cobaker=debug&remoteRelay=1` (or `&cobaker=debug&remoteRelay=1` if the URL already has a query string).
2. Open **Settings → Advanced → Co-Baker network test**.
3. Enter the **temporary `https://...trycloudflare.com` address**, not the GitHub Pages URL, as **Relay HTTPS/WSS address**.
4. Enter the same simple **test group** on all participating devices, e.g. `our-team`.
5. Enter the shared testing password; click **Connect to test Bakers**.
6. Repeat on Chrome, Edge, an Android tablet's browser or a distant groupmate's computer, each using a separate browser profile with its own Baker ID.

The tunnel URL and group are remembered only for the current browser tab/session. The password is **not saved to browser storage or included in links**; re-enter it after a page refresh. You should see each other's names and four-digit numbers, send test messages, and elect one coordinator. During an active order, use **Call for Help** to send direct invitations or **Call All**. The recipient can accept or decline without interrupting their own worksheet; acceptance only reserves the session for now. Close the coordinator's tab: the others should elect a replacement while the relay stays online.

If two users choose **different test groups**, their discovery/message traffic stays separated even though they use the same tunnel and password.

## 5. Testing limitations and cleanup

- Internet access is required for this remote mode. It **does not validate** Android's offline Wi-Fi/NSD transport or true device-to-device host migration.
- The temporary relay is on the organizer's laptop. When that laptop, relay or tunnel stops, all remote browser clients temporarily disconnect, though each player's solo game remains playable from GitHub Pages.
- This is an invitation-only **testing** service, not a production authentication system. Browser profile IDs are not cryptographic accounts. A shared password is sufficient only for your trusted group. Do not transmit private information.
- **HTTP 101 only proves the WebSocket upgrade succeeded.** Registration, protocol compatibility, and peer discovery happen afterward. An origin outside the allowlist is refused before upgrade; a valid but different group registers successfully and sees a separate set of Bakers.
- **Outdated/incompatible relay:** stop Node with Ctrl+C and restart `npm.cmd run dev:cobaker:remote` from the updated repository. Verify the protocol 3 banner, hard-refresh the game, then reconnect. Do not change the password merely because an older browser showed a generic rejection.
- **Authentication failed:** re-enter the shared password. **Protocol/route/rate-limit error:** inspect that specific error and update both sides. A relay disconnect automatically retries; successful registration clears old errors and restarts election.
- **Could not complete registration:** check the tunnel `/health` URL, the Node process, and the exact browser `location.origin` against `COBAKER_ALLOWED_ORIGINS`. Browsers do not expose the detailed HTTP upgrade failure, so this message does not assert a wrong password.
- If two tabs share the same browser profile, they also share the same persistent Baker ID. Use Chrome and Edge or separate profiles for distinct players.
- If the site doesn't show the remote setup form, confirm GitHub Pages has deployed the new source and the URL includes both debug flags.
- When done, Ctrl+C both relay and tunnel, and clear the password from PowerShell. No inbound firewall or router port forwarding is needed.

## 6. Retest checklist and local regression evidence

After restarting Node and publishing the matching browser files yourself:

1. Use two independent profiles (Chrome and Edge work), then add two more profiles/devices. Open the same Pages URL with `?cobaker=debug&remoteRelay=1`.
2. Enter the same current tunnel URL, case-sensitive group, and password. Each of four Bakers should see **3 nearby Bakers**, **4 connected participants**, and the same healthy coordinator. Send tests in both directions.
3. Click Connect repeatedly with unchanged settings, then close/reopen the popup. The connection should persist; the setup status should say **Registered with remote relay**, not remain on Connecting. The password field is blank when the popup is reopened, but the active connection keeps its in-memory configuration.
4. Refresh one browser. Its persistent Baker ID should remain; re-enter the password and connect. A refresh intentionally does not store or recover the password.
5. Open a second tab in one profile and connect it. It should wait with **already connected in another tab**, show no peers, and have no coordinator. Close the original tab: the waiting tab should become active automatically with the same Baker ID and its own session ID.
6. Close the coordinator's active tab. The remaining Bakers should agree on a replacement. Reopen/reconnect the original profile and verify it joins the agreed coordinator.
7. Stop/restart Node while leaving Cloudflare running on the same port. All clients should lose peers/leadership during the outage, then register and rediscover automatically without stale errors. Leave time for the 2-second retry and election gathering period.
8. From an active order, use Call All and have two helpers accept. Exactly one should become the helper. End help and verify the other Bakers remain connected.

Automated commands: `node --test tests/*.test.mjs`, `python tests/browser-co-baker-remote.py`, and `python tests/browser-coordinator.py`. The remote runner uses real Chrome, Edge, and WebKit with isolated browser contexts, real WSS, exact-origin authentication, and a **local TLS reverse proxy**. It requires `openssl` plus the existing Python Playwright browsers. Its temporary certificate is trusted only by those test contexts; production URL/security validation is unchanged. Artifacts go under `output/playwright/co-baker-remote/`.

These tests do **not** validate a live Cloudflare tunnel, deployed GitHub Pages files, or an Android device's native LAN networking. The next external diagnostic is the checklist above, beginning with the running relay's protocol banner and the browser's protocol-3 registration acknowledgement. Avoid sharing WebSocket registration frames: they contain the temporary testing password.
