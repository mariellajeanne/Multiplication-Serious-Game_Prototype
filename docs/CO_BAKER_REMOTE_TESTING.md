# Co-Baker remote browser testing (temporary, internet required)

This is an **opt-in development tool**, not the final Android LAN solution.
It connects a GitHub Pages game to a **separate, password-protected WebSocket relay** on your laptop through a Cloudflare Quick Tunnel. Testers may be on different Wi-Fi networks or in different cities. **No worksheet, bakery saves, mastery or rewards are transmitted.** Phase 2 adds availability, Call for Help invitations, first-helper-wins reservations, and session-ending messages. Live worksheets, hints, and rewards are not transmitted or implemented yet.

This mode requires a current GitHub Pages deployment containing the patch. Ordinary visitors without debug query parameters remain in solo mode. The remote relay publishes **no game files, repository paths or `/__co-baker/config` endpoint**. It listens on `127.0.0.1`, not on your LAN address. Keep its password private to your small trusted testing group.

## 1. Update and publish GitHub Pages

Apply the patch, run `npm.cmd ci` and `npm.cmd test`, then commit/push the changes through your usual GitHub workflow. Confirm that GitHub Pages has deployed the updated `index.html`, new `src/network/remote-test-transport.js`, and the existing `src/ui/co-baker.js`. You do not need to publish the relay server code separately: it runs on your laptop.

## 2. Start a restricted relay (PowerShell on laptop)

From your project directory, after installing Node 22+ and dependencies (`npm.cmd ci`), run:

```powershell
$env:COBAKER_ALLOWED_ORIGINS = 'https://YOUR-USERNAME.github.io'
$env:COBAKER_REMOTE_PASSPHRASE = Read-Host 'Choose a temporary shared test password (12+ characters)'
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
- If you see **connection rejected**, check that the password, exact GitHub Pages origin, test group and temporary tunnel address match.
- If two tabs share the same browser profile, they also share the same persistent Baker ID. Use Chrome and Edge or separate profiles for distinct players.
- If the site doesn't show the remote setup form, confirm GitHub Pages has deployed the new source and the URL includes both debug flags.
- When done, Ctrl+C both relay and tunnel, and clear the password from PowerShell. No inbound firewall or router port forwarding is needed.
