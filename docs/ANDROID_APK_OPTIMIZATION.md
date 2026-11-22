# Android APK-only asset optimization (2026-11-22)

## Objective and measured result

Keep all original artwork and historical experiments in the Git checkout, but stage a
smaller, independently auditable subset for the installed Android game.

| Measurement | Audited source | Optimized staging |
|---|---:|---:|
| Raw `assets/` payload | 97.23 MiB | 46.32 MiB |
| Assets omitted from Android only | — | 114 files, 50.01 MiB |
| Embedded MP3 cover art removed | — | 940,694 bytes |
| Source artwork changed | None | None |
| Sound frames transcoded | No | No |

**This is a staged-assets measurement, not a measured reduction in the finished
APK's size.** Android's runtime, DEX, compression rules and libraries also occupy
APK space. Build `:app:assembleDebug` on a machine with Android SDK installed and
compare the two signed APK sizes before quoting an APK reduction.

## What is excluded (from the APK only)

`tools/android-asset-optimization-plan.json` has the explicit relative path and
original SHA-256 for every excluded file. Most candidates are old artwork under
`assets/bakery-approved` and `assets/bakery-faithful`. The current production
loader requires the complete `BAKERY_ASSETS` map in `src/bakery-assets.js` before
starting the game; all active world assets are mapped to `bakery-runtime` WebP.
The previous fallback PNG sets remain in source control for design recovery.

Other audited removals are obsolete root-level bakery-ui PNG doubles, legacy
root-level numbered food PNGs (the live UI uses the WebP or illustrated assets),
unused background source images, provenance/generation JSON, and reference-only
art. We **retain** `bakery-world` images referenced by CSS, all numbered runtime
food/coin/package sprites, worksheet images (including legacy root `coin-XX.png`),
all ticket/popup artwork, fonts, Co-Baker scripts and gameplay code.

The source checksum covers every HTML/CSS/JS file under `index.html`, `src/`,
`styles/`, and `worksheet/`, and normalizes CRLF. If all source is unchanged, the
full audited exclusion list applies. If any source differs, the *conservative*
mode permits exclusion **only** under `bakery-approved/` and `bakery-faithful/`,
and only when four byte-verified loader/boot files are unchanged. It scans all
shipped source plus text-bearing image assets for additional directory references;
any such reference prevents exclusions in that directory. Unknown/changed
assets are retained, and missing already-cleaned assets are skipped. When the
loader changed or both directories are referenced, the tool retains every image;
only verified audio metadata may be stripped. The report includes an explicit
`mode` and `protectedRoots` explaining that decision.

This conservative mode protects the known static and dynamic paths, but is not
a formal proof for arbitrary dynamically constructed filenames in entirely new
code. If substantially modifying game asset loading, run a fresh audit and
update the manifest before depending on pruning. Do not force the old source
hash to match. The ZIP audited for this patch is not necessarily the same as
your current Windows checkout.

## PNG and audio rules

Sampled ten active PNGs, including room, title, cabinet, ticket, food, package,
button and HUD art, using lossless DEFLATE recompression; none got smaller.
No active PNG has been modified. The tool contains a tested PNG re-encoder with
CRC checking and exact inflated scanline comparison but enables it only for
explicitly audited `pngCandidates` (currently none). Dimensions, RGBA and
existing artwork remain byte-for-byte identical in this patch.

The 30-minute MP3 is already encoded at 64 kbit/s (44.1 kHz stereo). Rather than
re-encode it at even lower quality, the staging tool removes the MP3's embedded
1280×1280 PNG album cover and ID3 metadata. It copies every MP3 audio frame
byte-for-byte, preserving duration, audio, loop behavior and playback API.
Original MP3 remains in `assets/music/`. `ffprobe` can verify the staged MP3.

## Build and verification

`android/app/build.gradle` still stages the original files using its existing
Gradle `Sync` task. Its final staging action calls:

```text
node tools/android-optimize-stage.mjs android/app/build/game-assets/game
```

Only this generated Android copy is changed. The tool writes
`android/app/build/asset-optimization-report.json` (not shipped in the APK).
Requires Node.js 22+ when building Android; no FFmpeg or new image dependency
is needed on the user's Windows machine.

Checks run for this implementation:
- Node tests for source fingerprints and the stricter legacy loader guard,
  SHA-256 allowlist, missing/modified asset preservation, source-reference
  blocking, exact MP3 audio frame equality and PNG filtered-scanline equivalence.
- Browser six-task walkthrough plus asset existence checks at 2000×1200,
  1280×800 and 960×540, with the *production asset map loaded* (the older
  inline tutorial fixture did not load this map).
- Existing Co-Baker, touch/navigation, worksheet and six-task Node checks.
- Static HTML/CSS/JS references validated against the optimized staged tree.

**Not established by these checks:** physical APK install, audio output through
an actual Android tablet, native WebView decoding or actual APK size. Those must
be checked after the Windows Gradle build. The user's existing saves and
`panaderyaQuestV2` schema are not touched.

## Recovery and future updates

All original assets remain available; removing this Gradle hook and rebuilding
restores ordinary full-size packaging. Do not delete original assets to chase
repository size. After significant art or UI loader changes, run a fresh asset-reference
audit and update the source fingerprint/manifest rather than bypassing the
guards. If the optimized staging unexpectedly has missing art, install the
backup APK retained by the accompanying CMD installer and report the specific
screen and image.

## Measured debug APK (2026-11-22 QA pass)

| Build | APK bytes | MiB | Optimizer mode |
|---|---:|---:|---|
| Before QA (source changed after the audit) | 73,591,502 | 70.18 | `conservative-legacy` (69 exclusions) |
| After re-audit and fingerprint refresh | 51,811,683 | **49.41** | `full-audit` (103 exclusions; 11 edited assets retained) |

The fallback build was 20.8 MiB larger only because later edits changed the source
fingerprint. The re-audit compared every shipped line added since the audited
commit `f843056`: no new reference to an excluded file or to `bakery-approved/` or
`bakery-faithful/` (only retained `bakery-runtime` icons). `sourceAudit` in the plan
records the method and previous digest.

Verify a build with `python tests/apk-contents-check.py`. It checks that source and
assets are byte-identical, that exclusions are absent, that every literal asset
reference and `BAKERY_ASSETS` entry resolves, and that the MP3 audio frames are
preserved. `tests/browser-six-task-tutorial.py` also fails if the game requests an
excluded asset. **After any further source edit, repeat the asset re-audit and
refresh `sourceDigest`**; otherwise the next build falls back to ~70 MiB.
Not established: physical installation, WebView decoding or audio on a real tablet.
