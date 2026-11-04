# Frame 12 — floating food selection controls

**Immediate Mastery and safe feedback (2026-11-05):** Single and bulk Mastery buttons buy immediately at the current eligible price; the redundant Buy Recipe Mastery confirmation is removed. Affordability, duplicate capacity, active-order guards and the ten-second latest-purchase Undo remain. Sale confirmations are unchanged. Notifications and Undo share a compact dock over noninteractive package/bakery artwork on tablets, or the details area on narrow screens; it repositions on render, resize and scrolling without moving the food grid or action buttons. Older transient notices clear before a new Mastery purchase.

Implemented 2026-11-04 against the owner's Frame 12 wireframe. This supersedes food-details bottom-sheet layouts in earlier implementation notes. The two drawn popup examples are alternative states, never simultaneous overlays.

## Layout and visual hierarchy

`#foodPanel` is absolutely positioned within the Menu, centered horizontally and 18px above its bottom. It does not participate in flex sizing. Opening, closing or changing selection leaves the food grid's bounds and scroll position unchanged. The grid remains interactive outside the popup; this is not a full-screen modal or a sheet.

At the requested landscape sizes, popup width is approximately 75% of Menu width. The single-food popup uses 35.5% of Menu height, or 38.5% when Menu width is at most 700px. The multi-food popup uses 16.5%. Actual measured border-box ratios in both engines:

| Viewport | Width / Menu | Single height / Menu | Multi height / Menu |
| --- | --- | --- | --- |
| 2000×1200 | 74.7% | 35.4% | 16.4% |
| 1194×834 | 74.5% | 38.3% | 16.4% |
| 1024×768 | 74.5% | 38.3% | 16.4% |

Popup padding is 8px, section gaps 6px and button padding 3px vertically. The close control overlaps the top-right border while remaining inside Menu. There are no tall title bars or extra descriptive sections.

Single state: image/stars/rarity on the left; name, contribution/base, current Mastery/bonus and available/next Mastery on the right; one slim long-press hint; Sell, Mastery and Equip/Unequip along the bottom. Food art overrides the old 200px illustration cap only inside this popup. Stats use actual `foodValue`, `tierBase`, `recipeMastery` and `availableMastery`; retained base and Mastery above five are respected. “Boost” is the selected recipe's contribution, rather than the total bakery multiplier.

Multi state: equal-width Deselect All/Select All controls, followed by Sell Selected, Mastery for Selected and the equip action area. No food images, stat list, selection count or instructional row appears. When a selection mixes equipped and unequipped foods, the third action area holds both existing valid operations, labeled with their eligible counts. No new combined equip operation or partial-capacity behavior was introduced.

Equip uses green; Unequip uses a secondary paper finish; Mastery uses gold; Sell uses muted red outlines; selection controls are neutral. Explicit labels, separate shapes/borders and existing confirmation dialogs distinguish actions in addition to color. Buttons retain at least 44px touch targets and have pressed/disabled states.

## Selection and behavior

One selected food always shows the larger state, including after the first long-press. Two or more show the compact state. Returning to one switches back immediately. Deselect All keeps multi-select mode active with neutral controls available and invalid actions disabled; Close exits that mode. The toolbar's selected-mode label stays synchronized after pointer and keyboard interactions.

The existing 500ms long-press, pointer-movement cancellation, suppressed follow-up tap and Shift+Space/Enter behavior remain. Escape first closes a real confirmation modal; with no modal it closes the floating selection controls and restores card/toolbar focus. Starting a new selection clears transient notifications so they cannot obscure the controls at high zoom.

Sales retain review, stale-state fingerprint checks and discovery/ceiling preservation. Mastery applies immediately using the exact eligible total and current transaction validation; Undo remains available. Equip/Unequip retain duplicate, capacity and active-worksheet guards, saved assignments and existing Auto Equip handling. No prices, progression formulas, save fields or worksheet/bridge code changed.

The old “More recipe options → Use ingredients” entry is omitted from the popup to match the wireframe's three-action structure. Its existing recipe-upgrade entry is preserved in **Settings → Ingredient pantry → Use ingredients for recipes**, with the same eligibility, costs and confirmation behavior. No ingredient gameplay was removed.

At genuinely small Menu widths, the popup widens to leave 16px side clearances. Short viewports can increase its proportional height within Menu's bounds and scroll the detail content internally. Actions and Close remain accessible. The three requested tablet sizes require no internal scrolling for normal single-food content.

## Changed files and verification

- `src/ui/menu.js`: two popup states, compact action renderer, Deselect All, mode-label synchronization and Escape handling.
- `src/ui/dialogs.js`: relocates the existing ingredient-upgrade entry to the existing pantry.
- `styles/progression.css`: replaces the sheet and its legacy breakpoint overrides with one floating component definition and targeted container queries. Other panels retain their accepted layout/theme.
- `tests/food-selection.test.mjs`, `tests/ux.test.mjs`: state switching, actual stats, preserved recipe upgrade access and model regressions.
- `tests/browser-food-selection.py`: WebKit and Edge at all three requested resolutions; actual tap/long-press, exclusive states, popup ratios, unchanged grid bounds/scroll, text/button fit, sale cancellation, immediate/repeated Mastery purchases, Undo, nonoverlapping feedback, Equip/Unequip, Select All/Deselect All, mixed actions and keyboard closing. Screenshots in ignored `.test-tools/food-selection-shots/` were visually compared with the wireframe.
- `tests/browser-frame11.py`: updated selector for the new single-food popup; existing WebKit/Edge carrying 79×18, tap/drag/swipe, sound/tutorial, saved worksheets, purchase/Undo, packages and exactly-once claim checks passed.
- `tests/browser-responsive.py`: actual Edge per-tab browser zoom at 80%, 100%, 125%, 150% and 200% now checks both popup states, Menu containment, stable grid geometry and button text/touch sizing. Native zoom screenshots use the browser surface to avoid Playwright's zoomed viewport cropping. `--zoom-only` runs this focused check. Subpixel touch-target bounds allow 0.1px rounding while checking the 44px CSS minimum.

`node --test tests/*.test.mjs`: 89 passing tests. Popup screenshots at the requested sizes and actual 200% zoom were visually reviewed. No manual Live Server test, deployment or push was performed. Generated tracked regression screenshots are restored after validation.
