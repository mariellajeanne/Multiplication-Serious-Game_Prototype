# Scene refinement and startup readiness — November 20, 2026

This pass refines the approved three-station implementation. It preserves the finite camera, original Menu/Orders frames, package economy, tickets, saves, worksheets and Co-Baker controllers.

## Composition and controls

The supplied floor-rich interior is extended sideways with the built-in image tool into a proportional 3:1 room. Its runtime rectangle is 6000×2000 world units at (-457,-340). The background never scales independently in x/y. Stations use .92 of their previous scale and sit near floor y1000, in front of the wall/floor join near y760. Floor shadows stay behind the frame bases.

| Station | Previous center | Current center | Approximate visible width |
| --- | ---: | ---: | ---: |
| Packages | 1000 | 1000 | 1465 |
| Menu | 2822 | 2693.84 | 1483 |
| Orders | 4316 | 4085.92 | 861 |

Both visible edge-to-edge gaps remain 220 world units. Camera fitting remains independent of those positions. Short landscape phones retain the existing vertical-scroll approach; the background is bounded to the scene height so it cannot create an empty floor-only scroll area.

Navigation controls have content-sized widths, equal heights and independently positioned centers at 22%, 50% and 78% of the viewport. They sit 3.5vh above the bottom (with safe-area handling). Warm-brown text replaces white outlined lettering. The center label/action remains Menu on every page. View All Foods is a separate pink button on the lower Menu trim, with focus restored when its collection closes.

The coin display uses an amber coin medallion attached to a cream counter. Boost uses a gem mount and lavender multiplier strip. Help and Settings use softer square controls with rounded corners. All four remain fixed during camera travel. `--bakery-background-blur` in `styles/bakery-scenes.css` is the single scenery-only blur control; it starts at `0px`.

## Artwork

- `assets/bakery-approved/packages-frame.png` remains the original backup. The built-in image tool removes only the bottom bow/tails; only x620–1050, y820–941 from that edit is composited into `packages-frame-no-ribbon.png`. Pixels outside the patch are asserted identical.
- Menu and Orders are lossless WebP exports with identical decoded RGBA pixels and intrinsic dimensions. No regeneration or shape changes.
- Runtime props/icons are sensibly downsampled with Lanczos, then encoded losslessly. Coin art retains 2× its largest 150px display size. The opaque background uses WebP quality 96; its enlarged before/after crop was visually inspected. Original source PNGs remain available.
- Runtime paths, dimensions, source sizes and encodings: `assets/bakery-runtime/provenance.json`. Exact built-in image-tool prompts and final saved asset paths: `assets/bakery-runtime/generation-prompts.json`. Reproduction: `scripts/prepare-refinement-art.py`.

## Loading behavior and measurements

All independent downloads begin together; classic script execution still follows the declared dependency order. The Menu frame, background and counter props get high image fetch priority. Required assets include the complete three-station world and all food/reward sprites, so immediate navigation, purchases and refreshed orders cannot expose missing art. This deliberately favors safe immediate interaction over an extra asynchronous navigation state machine.

Progress counts real completed scripts, images, fonts and initialization work. Required images are decoded, mounted images checked, styles verified and two paint frames allowed before readiness. Skip remains disabled until then. Optional worksheet/legacy decoration can finish afterward or be skipped. Required image/script/manifest/bootstrap failures offer Retry without discarding saved progress. The asset manifest is generated development metadata; no build or install is required to play.

Controlled Edge comparison used three fresh browser contexts per version, served from the same machine. Baseline source was read from Git HEAD without changing the working tree. Baseline readiness checked the actually mounted images, background, fonts and completed script initialization; current readiness uses the explicit loader milestone.

| Metric | Before | After |
| --- | ---: | ---: |
| Cold startup resource transfer | 12.43 MB | 8.88 MB |
| Matched source/runtime art | 16.45 MB | 7.22 MB |
| Median local required readiness | 658 ms | 689 ms |
| Cached resource transfer | — | 0 bytes |

Transfer falls 28.6%; runtime art is 56.1% smaller. Readiness is comparable locally, with about 32 ms additional time for the stricter complete-world readiness check and broader preloading. It is not claimed as a startup-time improvement. HTTP caching, device speed and connection conditions affect timings. Measured startup CLS is 0 in Edge and WebKit.

## Verification and artifacts

- `node --test tests/*.test.mjs`: 293/293 pass.
- `python tests/browser-world.py edge webkit`: pass. Six landscape sizes, PNG/WebP alpha-derived equal gaps, native proportions, continuous camera, fixed controls, touch/wheel/keyboard/drag scrolling, all tiers, purchases/replay guards, dialogs, saved worksheet and reduced motion.
- `python tests/browser-scene-loading.py edge webkit`: pass. Held frame and final script keep Skip disabled; progress tracks completed work; optional-only Skip works; failed frame, gameplay script, manifest and bootstrap recover with Retry; saved coins survive; rapid navigation has no missing images; cold/cached startup succeeds.
- `PANADERYA_TEST_VIEW=hub node tests/browser-worksheet.mjs`: pass using permitted real Edge/CDP launch. Carrying 79×18, typed digits, drag/tap connection, Undo, swipe addition, settings, reload, one-time claims and degraded APIs/delivery. The harness now waits for startup readiness and serves actual image MIME types.
- `python tests/browser-co-baker-relay.py`: pass with independent Edge/WebKit clients, discovery/messages, identity, reconnect and offline solo play.
- `python tests/browser-responsive.py`: pass, including actual Edge zoom. `python tests/browser-environment.py edge webkit`: pass.
- The web-game skill client passed and its screenshots/text state were inspected. Normal startup/world navigation produced no new runtime errors.

Final screenshots are under ignored `output/playwright/refinement/`: `2000-menu.png`, `2000-packages.png`, `2000-orders.png`, `2000-transition.png`, and all three views at 1920×1080, 1280×800, 1024×768, 854×480 and 800×360 (including phone scroll endpoints). Loading/Skip/Retry screenshots and cold/cache measurements are in its `loading/` subdirectory. `benchmark.json` records the controlled comparison. Browser artifacts are deliberately excluded from source control.

Physical tablet and native Android LAN testing remain outside this desktop-browser validation. No remaining implementation issue requires user input. No push or deployment was performed.
