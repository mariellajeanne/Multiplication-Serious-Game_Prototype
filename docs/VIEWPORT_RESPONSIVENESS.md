# Viewport-filling game layout — 2026-11-04

**Frame 12 selection (2026-11-04):** [Current floating controls](FOOD_SELECTION_IMPLEMENTATION.md) replace the food-details sheet without resizing the grid; single and multi-selection use exclusive compact popup states.

**Bakery Power panel (2026-11-04):** [Current wireframe implementation](BAKERY_POWER_PANEL.md) uses a full-height 60/40 Bakery Power/Packages sidebar, a current bakery image, and a vertical progression list; this replaces the earlier 40vh cap.

This supersedes fixed layout dimensions and older header/toolbar breakpoints. It is a CSS layout change; gameplay, saves, imagery, colors and worksheet/bridge code are unchanged.

## Layout ownership

`styles/progression.css` owns the active game component boundaries. Its existing layout rules were edited and redundant layout overrides removed from its responsive blocks. No new stylesheet, runtime viewport calculations or UI framework was introduced.

- `#app` fills `100dvh`, with `100vh` fallback. The root document does not scroll. The game grid has no overall maximum width and uses consistent 10px padding and gaps.
- At widths of 960px and above, three columns share the full available height. Their ratio is approximately 22% / 56% / 22%, with practical sidebar minima of 180px and 210px. `min-width:0`, `min-height:0` and a `minmax(0,1fr)` row allow content to yield to the viewport.
- The latest sidebar wireframe uses two full-height Grid tracks, 3fr and 2fr after the 12px gap. Bakery Power and Packages fill those tracks, with internal scrolling instead of unused space below Packages. The food grid and ticket list scroll independently; expanded odds have their own bounded scroll area.
- From 640px through 959px, the sidebar panels occupy a bounded side-by-side top row with internal scrolling. Menu and tickets share the remaining height beneath it. Below 640px, panels stack deliberately: Menu, tickets, sidebar. The **game shell**, rather than the document, scrolls between them; Menu and tickets retain independent internal scrolling. This narrow-screen exception keeps every panel reachable instead of forcing unusable columns.
- Food cards remain 210px tall. `auto-fill` chooses the column count from a 160px minimum width. Cards retain their existing typography, art and interaction proportions instead of scaling with viewport size.
- The paused-order container reserves space for Resume and gives the rest to the same flexible Menu. Focused worksheets retain their existing math sizing and can scroll inside the game shell if the available height cannot accommodate minimum touch targets.

## Header, toolbar and overlays

The header uses actual panel width through container queries. Icon/name/Settings stay grouped left; Boost/Coins stay grouped right. The normal row uses compact padding and bounded typography. It switches to two deliberate rows only below a 490px panel width, replacing the earlier 620px cutoff. Existing name-to-Settings spacing and the blue Boost finish remain.

The toolbar is a five-column grid with flexible track proportions, centered content, modest 12–14px text and 44px minimum touch targets. Labels can use two text lines without truncation. The old automatic left margin and scattered font/padding overrides are removed. Below 490px panel width, controls form a balanced three-plus-two arrangement rather than isolating one button.

The details sheet shares the Menu's available height with the food grid; its body and, when needed, action area can scroll. Standard popups use a fixed header and scrolling body inside the existing viewport height bound. No popup content, prices or transactions changed.

## Verification

- `node --test tests/*.test.mjs`: all 83 tests pass, including smoke, worksheet and progression regressions.
- `python tests/browser-frame11.py`: WebKit and Edge passed the existing collection/details, popups, purchase/Undo/reload, Packages/Mastery, 79×18 carrying, clicks/drags/swipe, tutorial/sound, saved worksheet switching and exactly-once claim checks.
- `python tests/browser-responsive.py`: WebKit and Edge check 2000×1200, 1194×834, 1024×768, 960×768, portrait 834×1194 and 768×1024, 390×844, zoom-equivalent CSS viewports, and 2560×1440. Assertions cover viewport bounds, header/toolbar rows, long counter values, readable card width, touch targets, independent scroll movement, popup bounds and details-sheet controls. The normal landscape header and all five toolbar controls stay on one row.
- Actual Edge browser zoom is verified at 80%, 100%, 125%, 150% and 200% via a temporary extension's per-tab `chrome.tabs.setZoom` API in an isolated temporary profile. This exercises browser reflow, rather than pinch emulation. Resulting CSS viewports ranged from 1460×926 to 584×370; Boost popups and actual worksheet Exit/Resume remained usable. The extension and profile are cleaned up automatically. WebKit checks equivalent CSS viewport sizes; its test does not claim native browser zoom automation.
- Desktop/tablet screenshots were visually inspected. New responsive screenshots are generated under ignored `.test-tools/responsive-shots/`. Existing tracked regression screenshots were restored after the run. No manual Live Server test, deployment or push was performed.

Changed implementation: `styles/progression.css`. Added browser runner: `tests/browser-responsive.py` (uses the same Python Playwright installation as the existing runner). Current documentation links: `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/MENU_HEADER_IMPLEMENTATION.md`, `docs/TABLET_UX_IMPLEMENTATION.md` and this document.
