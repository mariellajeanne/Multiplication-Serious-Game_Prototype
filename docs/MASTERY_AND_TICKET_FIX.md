# Focused Mastery cards and ticket exit (2026-10-31)

Implemented at the owner's request. This supersedes only the food card presentation and ticket selection/exit lifecycle in earlier layout notes.

- Food cards now show a plain rarity label, rarity-colored star panel, current/base multiplier box, existing food art/name, Mastery summary, one upgrade button, and Remove/Add and Sell actions. Fusion remains in food details. Mastery presents the existing food level; the five-level cap, percentage bonuses, costs, credits, tiers, images and storage key are unchanged. The supplied 2/3 and +20%/+30% were layout examples, not a requested economy migration.
- Food upgrades and both fusion transactions share refreshFoodProgress: reconcile selection, derive contribution/menu total, save, render, and update open inventory content. Base Auto Equip now breaks equal-base ties by final contribution before UID, so an improved copy can immediately replace a weaker equal-base copy. Existing value-preserving fusion rules still apply; conservation does not promise a strict increase for every possible duplicate fusion.
- Starting an order keeps its ticket on the board. Exit marks the same run paused, keeps the mounted iframe hidden, and exposes Resume order above the menu. Resume shows the same iframe, math, history, attempt and pending rewards. Claim removes the ticket, allowing normal replenishment. Explicit refresh remains deliberate. Retry Normal deduplicates its retained ticket.
- Paused status and the run/reward ledger persist in the existing save. The pre-existing limitation remains: a full page reload restarts worksheet math, while retaining the ticket, attempt ledger and pending rewards; this change preserves exact worksheet state on Exit/Resume within the live page.

## Files

- Presentation: src/ui/menu.js, styles/progression.css.
- Progression/value refresh: src/game/progression.js, src/game/progression-economy.js.
- Ticket lifecycle and iframe preservation: src/game/economy.js, src/game/rewards.js, src/main.js.
- Regression coverage: tests/progression.test.mjs, tests/browser-worksheet.mjs.

## Validation

Automated smoke, progression, worksheet-session and worksheet-reward tests: 29 passed, including Mastery labels, immediate individual/menu changes, equal-base Auto Equip selection, both fusion paths, reload/save values, exit/resume identity and replacement after claim.

The headless Edge worksheet runner additionally checks Exit/Resume at each stable connection/product/carry state and compares the same iframe, complete math state, undo history, tutorial/sound preferences and board IDs. Passed: 79 x 18 carrying with click/drag and downward swipe; 19 x 9 at 390px with touch and incoming/outgoing carries; tutorial and SFX OFF/ON; saved claim reload; exactly-once payouts; and tablet completion despite unavailable animation APIs and dropped completion messages. A manual VS Code Live Server visual review was not performed.

## Owner-directed card proportions correction

The follow-up changes only styles/progression.css: remove the shelf pseudo-element and hide the shared artwork's plate inside cards, retaining the soft shadow; make rarity stars a full-width ribbon; make the centered multiplier/base a compact full-width two-line band; tighten the image/name/Mastery spacing. All menu slot types and inventory cards use a fixed 360px border-box height and full grid-track width, with bounded content rows so content cannot stretch individual cards. The upgrade and bottom action targets remain at least 44px tall. Existing rank colors and tier borders remain.

Validation: all five smoke checks passed. A temporary local headless Edge check populated every catalog food across levels/tiers, checked identical outer dimensions for occupied/Buy Slot/Add Item cards, full interior panel widths, removed shelf and bounded rows at 320, 390, 560, 800, 1024, 1280, 1700 and 2000px. Screenshots at 390 and 1280px were visually inspected. Temporary validation files were removed. No gameplay or other component changes were made in this follow-up.
