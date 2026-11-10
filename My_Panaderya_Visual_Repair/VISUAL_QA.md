# Visual repair and QA record — 2026-11-09

## Diagnosis and corrections

| Source defect | Cause | Repair |
| --- | --- | --- |
| Cut upper-left foliage and awning seam | Separate mismatched background/alcove crops | Reconstructed continuous environment from the approved illustration; UI removed from the background |
| Stray pieces around navigation and Packages | Component PNGs included neighboring counter, shelves and props | Reconstructed independent transparent navigation and plaque artwork |
| Nested, uneven cabinet frame | `border-image` slicing plus a separately framed interior and repeated override rules | One illustrated wooden cabinet shell with one recessed interior |
| Heading and foods shift relative to each other | Count-dependent cabinet position/size with global heading anchors | Fixed cabinet/header; only real DOM contents change and scroll |
| Food tags cross trim or cell boundaries | Cell dimensions did not match the actual illustrated aperture | Explicit slot geometry inside the cabinet aperture; all badges remain inside their own cells |
| Cramped tickets and inconsistent baselines | Competing absolute offsets and undersized main column | One reward/main/play grid; consistent padding, food quantities, tray symbols and live payout text |
| Register obstructed by clipboard | Overlapping screen rectangles and inappropriate register scale | Separate board/register rectangles; register rests on the counter mat below the board |
| Clipped popup title gifts and Buy artifacts | Defective source heading and button crops | One complete blank illustrated heading with real text; clean original Buy artwork |
| Stray marks by two package props | Detached neighboring atlas fragments in PNGs | Cleaned the verified outlying boundaries of packages 6 and 7 |

## Composition and visual inspection

The original approved illustration remains the composition reference. Logo, packages alcove, central showcase, clipboard, window, counter and three navigation actions retain their relative roles. The source miniatures remain the food artwork. The register is deliberately smaller than the source screenshot so it fits on the counter and clears the clipboard.

Initial renders exposed an additional food/trim collision and a doubled clipboard title; both were corrected before the final browser checks. Package-popup inspection also exposed defects that source inspection alone did not settle. The final screenshots are inspected at target/tablet sizes, including sparse and overflowing food menus and popup scroll states. Comparison artifacts are written to the parent workspace's `output/playwright/` directory.

## Executed validation

- Parent repository: all **125 Node tests passed**; the production hub browser runner passed in **Edge and WebKit**.
- Supplied-demo browser runner: **Edge and WebKit passed** the 2000 × 1200, 1280 × 800 and 1440 × 900 cases; 1, 3, 5, 9, 10 and 16 foods; exact cell counts; centered final rows; stationary frame; slot/badge boundaries; ticket separation; both scrollbars; all available popup/navigation paths; nine package purchases; equipment/Boost; wrong/right answers; duplicate completion rejection and coin-only rewards.
- Native Chromium touchscreen gestures exercised food/ticket swipes and both draggable thumbs at target/tablet sizes. Both engines exercised touch taps, mouse wheel, mouse dragging, arrows, tracks and keyboard scrollbar input.
- The installed web-game Playwright client was run on home, Packages and Collection states. Screenshots and read-only state JSON were inspected; no browser error files were produced.
- Direct `file://` opening in Edge passed: local fonts/assets, the nine-tier package popup, close controls and no console errors.
- Expanded Edge/WebKit checks passed exhausted-ticket Play disabling, ticket refresh, unaffordable purchases, disabled control behavior and nonnegative balances.
- Final visual inspection found that reopening a previously scrolled popup could retain its offset. The reset now occurs after the popup becomes visible. Focused Edge/WebKit regression checks passed reopening at the top and popup wheel/native Chromium touch scrolling at both 2000 × 1200 and 1280 × 800, without unintended food activation.
- The production worksheet runner passed with `PANADERYA_TEST_VIEW=hub`: 79 × 18 = 1422 and 19 × 9 = 171; click/drag, carrying before/after placement, tutorial and sound controls, Undo, downward swipe, iframe preservation, reload, duplicate-event/claim rejection, paid food upgrade, unavailable animation APIs and dropped completion delivery. The separate five-test smoke suite also passed.

## Review artifacts

- [Approved reference, supplied ZIP and repaired demo](QA/reference-comparison.jpg).
- [All six food counts at 2000 × 1200](QA/food-counts-2000.jpg) and [1280 × 800](QA/food-counts-1280.jpg).
- [Twelve popup and disabled-state views](QA/popup-review.jpg).
- Full-size [2000 × 1200 home](QA/home-2000.png), [1280 × 800 home](QA/home-1280.png), [scrolled food menu](QA/foods-scrolled-1280.png) and [scrolled orders](QA/orders-scrolled-1280.png).
- Machine-readable [Edge results](QA/edge-results.json) and [WebKit results](QA/webkit-results.json) use fresh, isolated sample state.

## Limits

This source ZIP was explicitly a standalone UI demo. It does not contain production persistence, long-multiplication procedure, Mastery, paid upgrades or an actual confirmation flow. Existing popup paths were repaired and exercised; absent systems were not invented. The original repository's production behavior remains separate.

Touch testing is browser emulation, including real browser-dispatched touchscreen gestures, not a physical Galaxy Tab A7 test. The composition follows the approved reference while retaining the requested miniature foods; it is not a claim of pixel-for-pixel reproduction or owner aesthetic approval. No push or deployment was performed.
