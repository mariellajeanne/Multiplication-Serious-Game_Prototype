# Android wrapper: Windows build and LAN validation

Phase 1B validation: **debug APK built**, 8 native JVM protocol tests passed,
and lint finished with 0 errors / 4 warnings. Shared web coordinator logic is
packaged directly from the production files. Browser election/failover coverage
is described in [the web testing guide](../docs/CO_BAKER_WEB_TESTING.md).
**No tablet/emulator launch or real LAN election test was performed.**
Build logs remain under ignored `output/android-validation`.

Four remaining lint warnings cover required JavaScript, landscape orientation,
the pinned WebKit version, and the unset launcher icon. None blocks this debug
validation build.

## Windows build

1. Install [Android Studio](https://developer.android.com/studio). In SDK Manager install **Android SDK Platform 35**, **Build-Tools 34.0.0** (Show Package Details), and **Android SDK Platform-Tools**. Accept the SDK licenses.
2. Open this `android` folder in Studio. Select **JDK 17** in Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK. This PC already has `C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot`.
3. Keep AGP 8.7.3 and the checksum-pinned **Gradle Wrapper 8.9**. No separate Gradle installation or npm build is needed. Let Studio finish sync.
4. From the repository root in PowerShell:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk" # SDK Manager location
Set-Location android
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
```

For the agent's isolated validation SDK, use `$env:ANDROID_HOME = (Resolve-Path .test-tools/sdk).Path` **before** entering `android`. Alternatively set `sdk.dir` in ignored `android/local.properties`; that takes precedence over the environment variable.

APK: **`android\app\build\outputs\apk\debug\app-debug.apk`** from the repository root. Initial tools/dependency downloads require internet; the installed app does not.

For Windows cache-move errors, retry with a short isolated cache and file watching disabled:

```powershell
.\gradlew.bat --gradle-user-home ..\.test-tools\gc --no-daemon --no-watch-fs "-Dorg.gradle.internal.instrumentation.agent=false" :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
```

This avoids changing antivirus settings or deleting existing Gradle caches.

## Install on two tablets (recommended)

Use Android 8+ devices with current Android System WebView. Enable Developer Options > USB debugging, connect USB, and accept each tablet's authorization. From `android`:

```powershell
$adb = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
& $adb devices
& $adb -s SERIAL_A install -r .\app\build\outputs\apk\debug\app-debug.apk
& $adb -s SERIAL_B install -r .\app\build\outputs\apk\debug\app-debug.apk
```

Replace SERIAL_A/B with `adb devices` values. Launch My Panaderya normally. `install -r` preserves existing app data when the signing key matches; do not uninstall or clear storage for persistence tests. Alternatively copy the APK to each tablet and allow installation from that source.

## Debug interface and pass criteria

Debug APKs automatically load `?cobaker=debug`. Open **Settings > Advanced > Co-Baker network test** on both tablets; no IP, host or room entry is used.

1. Connect both to the same **non-guest IPv4 Wi-Fi**. Keep both apps foreground. Each should list the other once with the correct name and four digits.
2. Tap **Send test** on A: B shows **Test received**, A shows **Response received**. Repeat B to A. No worksheet/economy state should change.
3. Turn B's Wi-Fi off. A should remove B within about 20 seconds (network/read timeouts vary). Reconnect B; it should reappear once and exchange tests again. Repeat after background/foreground and force-stop/relaunch.
4. Change names in Settings, then restart. Names, four-digit numbers and Debug identity IDs must persist; renaming must leave both IDs unchanged. Give both players the same name to check that duplicate names remain distinct.
5. Disconnect the **router's internet uplink while leaving local Wi-Fi enabled**. Relaunch both apps and repeat discovery/messages. Also play solo without Wi-Fi.

Browser check: serve the repository as usual and open `http://127.0.0.1:5500/index.html?cobaker=debug`. Its panel correctly reports **unavailable**: browsers cannot perform native NSD/TCP discovery. This is not an alternative to testing installed APKs.

If no peers appear, check guest/AP isolation, multicast/mDNS filtering, same subnet, foreground state and Wi-Fi connection. IPv6-only Wi-Fi is unsupported. Four-digit numbers are not network keys or editable. Profiles/UUIDs are unverified identities, not authentication.

## Emulator limitations

An emulator can validate launch, local assets, Settings and persistence. For two-emulator discovery, [Emulator 36.5+ supports NSD on shared virtual Wi-Fi](https://developer.android.com/studio/run/emulator-networking-interconnect). Create two separate AVDs (do not clone app data), start both, install the APK on both, and repeat the panel checks. Older NAT/port forwarding is not a substitute for automatic mDNS discovery.

One tablet plus one emulator is **not a reliable physical-LAN test**: virtual Wi-Fi is not automatically bridged to the Windows machine's physical Wi-Fi multicast domain. Do not interpret failure in that arrangement as a game failure or claim TCP port forwarding validates discovery. Use two physical tablets for classroom Wi-Fi acceptance.

## Wrapper audit and future web changes

`stageGame` copies the current root `index.html`, `src`, `styles`, `assets`, and `worksheet` into generated APK assets on every build and removes stale staged files. Edit the existing web source and rebuild/reinstall; never edit `app/build/game-assets`. No separate game codebase or web-server process is required.

`MainActivity` loads `https://appassets.androidplatform.net/assets/game/index.html` with AndroidX WebViewAssetLoader. Only bundled HTTPS resources/navigation are permitted; file and content access are disabled. JavaScript/DOM storage are enabled for the game. Native JSON is escaped before returning to JavaScript.

`PanaderyaLan.start/stop/send` crosses the native bridge; events return through `co-baker-native`. Android NSD advertises `_panaderya._tcp.` and direct Wi-Fi-bound TCP carries versioned hello/test/reply and advisory coordinator packets. Permissions: INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, CHANGE_WIFI_MULTICAST_STATE. No location/account/hardware identifiers are used. The foreground multicast lock and sockets are released on pause/stop.

Frames are size/time bounded; native types/fields and response IDs are validated. The bounded help schema includes learner-owned reservations, recovery proofs, increasing watch/state versions, read-only worksheet/calculator snapshots and ephemeral semantic cues. No remote editing, chat, bakery saves or reward commands exist. Phase 3C keeps the native envelope at version 1; rebuild/reinstall the matching APK on all participating tablets. No relay or cloud dependency is added. TCP messages are **not encrypted or authenticated**; `usesCleartextTraffic=false` does not encrypt raw Java sockets. Persistent player/connection IDs bind reservations under the existing trusted-LAN model; they are not cryptographic identity proofs. A coordinator term never authorizes game changes. See [session recovery and remaining device checks](../docs/CO_BAKER_WORKSHEET_SHARING.md).

Validation fixes: explicit discovery stop now persists across network callbacks;
pause/stop closes active sockets; callbacks cannot update a destroyed WebView;
native packets reject type coercion/mismatched replies; modern dual-stack NSD
results select a local IPv4 address compatible with the listener. Android 12+
backup/device-transfer exclusions prevent copying private bakery/profile data to
a second installation. These changes do not alter solo gameplay.

This build targets SDK 35. Handle target-37 LAN runtime permissions before raising targetSdk; Android 16 opt-in protections also require device validation. See [Android's LAN permissions](https://developer.android.com/privacy-and-security/local-network-permission).


## Physical LAN diagnostic build

Settings > Advanced > Co-Baker network test now includes Native LAN diagnostics,
refreshed once per second while the panel is open. It shows bridge/profile startup,
listener port, multicast lock, advertisement/discovery callbacks, resolution and TCP
counters, and the last error. Counters are cumulative since process launch and
service counts may include this device itself. No addresses or packet bodies are
shown. Local coordinator health does not establish peer discovery.

Resolved endpoints whose initial handshake fails are retained (maximum 128) and
retried every five seconds until success, service loss or network/lifecycle restart.
Previously these endpoints were discarded after one failed attempt. This fixes a
recovery gap, but does not establish the cause of the reported two-device failure.

For a failed retest, capture this panel on both devices after 30 seconds, Android
versions, and whether repeating on a different non-guest router works. Registered
advertisement plus started discovery with only self/no services points toward NSD
visibility; resolutions followed by TCP failures points toward reachability or
handshake problems. Neither alone proves router isolation. Keep original saves.


### Follow-up: candidate and reachability diagnosis

The debug Network Test now shows the bound Wi-Fi IPv4/interface, actual registered
NSD instance name, last discovered/resolved instance and raw returned addresses /
port, and up to eight candidate decisions (SELF, REMOTE, rejected, lost or stale).
SELF matches the actual registered instance name or the local address AND listener
port; a remote device using the same port is not self. Pending remote candidate
count and next five-second scheduler tick are shown. TCP destination and full
socket exception text are visible only through debug diagnostics. Resolution
invocation exceptions now release the resolver queue instead of leaving it stuck.
Android 11 uses the single getHost result; Android 14 uses getHostAddresses and
selects a compatible IPv4. IPv6-only results remain rejected by the IPv4 listener.

Optional debug direct TCP probe: enter the OTHER device's displayed private IPv4
and current listener port. It makes one Wi-Fi-bound connect attempt with a 2.5s
timeout, without saving settings, adding a candidate, or publishing a peer. It
checks TCP reachability only, not protocol compatibility or NSD. Closing this
connection without a game frame may increment the receiver's inbound-failure
counter; this is expected. Probe both directions. A successful probe with absent
remote NSD candidates narrows the issue to advertisement/discovery/resolution.
A failed probe needs its exact error and the target's current listener details;
it does not alone prove Wi-Fi isolation. Students never need this control.


### Call for Help touch diagnosis

Call for Help always opens its existing dialog or an explanation when the service
or unfinished worksheet is unavailable. Previously these guards returned silently.
Zero peers and local coordinator health do not gate dialog opening. The debug
Network Test now shows the last Call for Help pointer/handler/result or exception.
After a failed tap, inspect this field before relaunching. "Handler ready; no tap
yet" means no recorded pointer reached the button; "Pointer reached button" with
no handler result indicates no click reached its inline handler. A handler error
includes its message. Desktop Edge/WebKit touch regressions cover 800x360,
1280x800 and 2000x1200, modal replacement and empty-state/guard feedback; these do
not verify Android 11 WebView behavior. Runner: python tests/browser-co-baker-help-empty.py.

## Classroom audit and Copy Details

See [classroom readiness audit](../docs/ANDROID_CLASSROOM_READINESS.md) for the
confirmed WLAN Partition blocker, retained fixes, bounded cleanup, native debug
Copy Details report, SM-T505 compatibility and unvalidated 40-device traffic risks.
