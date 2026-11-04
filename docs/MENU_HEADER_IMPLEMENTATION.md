# Compact Menu header — 2026-11-04

**Viewport responsiveness (2026-11-04):** [Current viewport layout](VIEWPORT_RESPONSIVENESS.md) supersedes earlier fixed panel heights, layout caps and header/toolbar breakpoints.

The owner's screenshot and subsequent placement clarification supersede previous header layouts, including the standalone Menu heading described in the Kitchen-removal checkpoint.

- The standalone app topbar, Boost banner, Coins band and redundant Menu heading are removed. A single header belongs to the Menu panel, above its existing toolbar and food grid.
- Left group: existing bakery icon, My Panaderya name, Settings button. Icon-to-name gap is 7px; name-to-Settings gap is 15px. Right group: clickable Baker's Boost and Coins counters. There are no visible labels or descriptions alongside the counters.
- At panel widths up to 620px, the same header uses two rows: the left group stays together on the first row, counters align right on the second. Touch targets remain at least 44px. Viewport height offsets reclaim the removed 78px topbar; no replacement page header is mounted.
- Boost opens the existing dialog component in a small `hud-info-modal` variant: title, Total Menu and its number, multiplication sign, Bakery Power and its number. Neither number has a multiplication-sign prefix. Values derive from `max(1, foodSum())` and `decorBonus()`, matching `bakeryValue()`; displayed components use grouped numbers rounded to two decimal places. Calculation precision is unchanged.
- Coins opens the same variant with exactly “Complete orders to earn coins!” and “Your Baker's Boost multiplies the coins you earn.” Both dialogs show only their close button; the shared dialog wallet is hidden for this variant. Existing Escape, focus containment, focus return and backdrop close behavior remain.
- Header relocation also applies when an unfinished order is paused. The retained live worksheet is not rebuilt. Solving retains its existing worksheet controls; Settings remains in the Menu header after Save & Exit.

No economy, save, worksheet or bridge changes are included.

Changed code: `src/main.js`, `src/ui/menu.js`, `styles/progression.css`. Updated tests: `tests/ux.test.mjs`, `tests/browser-frame11.py`. Active documentation links in `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/TABLET_UX_IMPLEMENTATION.md` and `docs/FRAME_11_IMPLEMENTATION.md` point here.

Verification: `node --test tests/*.test.mjs` passes all 83 tests. `python tests/browser-frame11.py` verifies WebKit and Edge at 2000×1200, 1194×834, 1024×768, 834×1194 and 768×1024: grouped header alignment, touch targets, no clipping/empty header gap, both counter popups, exact popup copy and dynamic values, settings placement, collection/details, purchase Undo, reload, Packages, carrying 79×18, tap/drag/swipe, tutorials/sounds and saved-order claims. Additional boundary checks at 851, 900 and 1280px verified long counters and actual Settings opening in both engines. Browser screenshots of the header and both popups were visually reviewed. No manual Live Server check was performed.
