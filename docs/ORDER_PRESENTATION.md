# Physical order slips, tier finishes and grounded register — 2026-11-10

**Latest focused refinement:** [Orders containment and utility controls](UI_LAYOUT_POLISH.md) supersedes this pass's two-slip layout, board dimensions/placement, register size and utility-button backgrounds. Its three-slip layout, nine-slice board and CSS controls are current. The die-cut/tier/gameplay preservation requirements below remain.

This focused pass updates the actual root game. The bakery, enlarged sign, repaired upper-left architecture, collection/popups, package shop and original worksheet remain as implemented in [UI refinement](UI_REFINEMENT.md).

## Current presentation

`src/ui/bakery-hub.js` separates each slip into a silhouette-shaped shadow, masked artwork/material layer and a consistent inner content region. `HUB_TICKET_PATH` and `assets/bakery-ui/order-ticket-mask.svg` share the same die-cut outline: rounded corners with two concave notches on each side. Frame, paper, effects and dynamic content follow that outline. The button has no rectangular paper fill or generic rounded-card mask. Artwork and contents stay inside the Orders viewport.

The layout retains real reward art and tier on the left, saved order type/icon above, actual food/tray equation in the middle and live progress below. No visible coin-container names, numeric payout labels or separate Play buttons. The whole ticket calls the original `startTicket`; paused worksheets keep their identities and frozen payouts.

The eight existing coin tiers progress through paper/stitched accents, corner trim, soft rays, restrained sparkles, and occasional light sweeps for the top two tiers. The highest tier adds a faint iridescent rim. Basic tickets do not glow. Effects use CSS opacity/transform animations behind the content, with small corner sparkles; masks contain their paint. Reduced motion disables animation. Tier names, order labels/icons, probabilities and reward calculations are unchanged.

The heading stays at the top. New Orders/Skip and Reward Odds now sit immediately below it in a fixed horizontal row. The independently scrollable slip list is below them. Scroll padding and native proximity snapping show two complete slips at rest; the viewport was tuned to avoid a thin fragment of the next ticket. Wheel, native touch, track/thumb/arrows and keyboard remain supported. Keyboard focus lights the thumb rather than outlining its larger invisible hit area.

## Register and depth

`assets/bakery-ui/cash-register-facing.png` corrects the receding body plane to the right, matching owner attachment 3. The receipt/display arrangement was reconstructed coherently against that reference; a blanket flip would also reverse those features and move the bell. The bell remains at the right. The room/window/board were not mirrored or regenerated.

The sprite preserves its aspect ratio and uses a connected-alpha SVG cutout, eliminating disconnected faint debris from the generated transparency. Its doily/feet sit on the counter's upper surface above the vertical front panel. The register is in front of the lower board edge. The ticket viewport and utilities clear its full bounds. Its small mat and the source scene's counter doily provide contact beneath it.

The logical 2000×1200 composition uses a 650px-high Orders board and register at x1540/y710, width 350px with proportional height. Its footprint ends around y970, on the countertop top surface; its upper portion overlaps the reserved board bottom. These positions scale together at tablet sizes.

Only register-related raster art was regenerated through built-in image editing. [Exact prompts and final asset paths](../assets/bakery-ui/order-refinement-provenance.json) are recorded. Ticket frames/effects and the boundary masks are native SVG/CSS.

## Preservation and backup

[Task-start backup](../output/backups/orders-refinement-before-20261110-001912.zip) contains 150 files and an adjacent SHA-256 manifest. [Final audit](../output/playwright/orders-refinement/preservation-audit.json) confirms **31 protected files are byte-identical**, including all backed-up worksheet and game-system files, catalog, original dialog/menu/scene controllers, room background and repaired title. No migration, save-key change, economy adjustment or new tier. Packages remains untouched. No push/deployment.

## Observed verification

- `node --test tests/*.test.mjs`: **127 passed, 0 failed**.
- `python tests/browser-order-presentation.py edge webkit`: **passed both engines** at **2000×1200, 1280×800 and 1024×768**. Checks matching artwork/mask paths, eight tiers and widest equations, safe content, stationary controls, register grounding/clearance, wheel/native-touch/thumb/track/arrows/keyboard, reduced motion and original worksheet resumption/reload.
- `python tests/browser-ui-replacement.py edge webkit`: passed both; seven equipped-food counts plus empty recovery, actual package purchase/opening/duplicate Mastery, equipment/Boost, save/reload, scrolling and original worksheet/package appearance baselines. Replaced the obsolete no-register-overlap assertion with the requested layering/clearance checks.
- `python tests/browser-hub.py edge webkit`: passed both, including package tiers, five viewports, fallback, worksheet retention/reload and unique coin claims.
- Original `PANADERYA_TEST_VIEW=hub` worksheet runner passed actual **79×18=1422** and **19×9=171**, click/drag, carries, Undo, swipe-to-add, Guide/Sound, reload, one-time payouts and degraded API/dropped-message cases.
- Installed web-game client rendered final actual home and original worksheet; screenshots/state were inspected without browser-error artifacts. Playwright CLI independently inspected the root app and final composition.
- Visually inspected every tier, both required landscape sizes and scrolled states, reference 3 beside the current register, and live quiet/shimmer animation samples. No paper fragments appear behind fixed heading/buttons; register depth does not cover slips or controls.

Review: [eight tiers](../output/playwright/orders-refinement/eight-tier-review.jpg), [register/reference comparison](../output/playwright/orders-refinement/register-reference-comparison.jpg), [actual tablet screen](../output/playwright/orders-refinement/edge-1280-top.png), [scrolled highest tiers](../output/playwright/orders-refinement/edge-1280-scrolled.png), [Edge results](../output/playwright/orders-refinement/edge-results.json), [WebKit results](../output/playwright/orders-refinement/webkit-results.json).

Native touch was emulated in Chromium; physical Android tablet performance and final owner aesthetic acceptance remain unverified.
