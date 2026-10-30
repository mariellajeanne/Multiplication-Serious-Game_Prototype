# Bakery component system — visual review

2026-10-31. Latest owner direction: the bakery references supply **palette, soft shading and atmosphere only**. They are not wallpaper or layout instructions. This pass supersedes [COZY_VISUAL_REVIEW.md](COZY_VISUAL_REVIEW.md).

**Implemented and verified; stop for visual review before Stage C. No commit or push.**

## Design language

The theme now comes from the objects the player uses:

| Component | Bakery material / treatment |
|---|---|
| Page background | Quiet cream with a small, faint dot pattern; no scenic image |
| Header and navigation | Shop-sign crest, subtle awning stripe, biscuit-shaped tabs and matching local illustrations |
| Bakery progression | Inlaid wood/cream sign and illustrated bakery emblem, replacing the scenic thumbnail |
| Menu multiplier | Warm wooden price board with a framed coin label |
| Food cards | Display labels, rarity-colored paper, small wood display plinth, cream name cards and glazed controls |
| Buy Slot / Add Item | Regular-size display cards with illustrated empty cabinet / bread box; original order and prices retained |
| Order tickets | Paper slips with a bakery-order header, top clip, perforated bottom and readable rarity seal |
| Inventory | Pastry-box palette, label-style foods, fixed header, sticky multi-select action bar and separate checkboxes |
| Worksheet | Receipt on a light wood-edged work board, framed order stub, compact parcel stamp and attached prize tray |
| Reward popup | Clipboard with a brass clip, paper face, pastry-box reward cards, perforated receipt summary and a large return button |

Opaque component surfaces replace the previous translucent panels. Main navigation, collection controls, header crest/settings and worksheet Guide/Sound share `bakeryIcon()`'s soft fills, warm outline and rounded forms. Existing Filipino food illustrations and package/tray SVGs are retained.

### Typography

The parent game and worksheet iframe now use the same **self-hosted Nunito variable font**, aliased in CSS as `Panaderya Rounded`. No serif font is part of the active font stack. The browser suite verifies an actual loaded font face in **both** documents, rather than merely checking the CSS font-family string.

Files: `styles/typography.css`, `assets/fonts/Nunito-Variable.ttf`, and its accompanying `OFL-Nunito.txt`. The original font comes from the [Google Fonts Nunito directory](https://github.com/google/fonts/tree/main/ofl/nunito), distributed under its included SIL Open Font License. Runtime font loading is local; the game does not contact a font service.

## Scope preserved

- This is presentation work. Food values/prices, coin/Luck formulas, rarity generation, inventory transactions, save fields and the `panaderyaQuestV2` key are unchanged by this pass.
- The multi-select inventory, confirmation/stale-action safeguards, direct upgrades, Buy Slot → single Add Item → equipped-food order, and accurate reward/copy badges remain.
- Worksheet tap/drag connections, capsules, reveal buttons, flexible carry paths, partial products, swipe addition, Undo, tutorial/SFX state and math validation remain. Changing toolbar labels to matching SVG icons does not change their messages or settings.
- Live worksheet preservation, semantic reward deduplication, completion retry/ack, durable completed claims and once-only collection remain.
- The 30-level bakery roadmap remains an explicit **visual preview**, using the existing decor purchases and `g.decor + 1` display level. No progression migration was introduced.
- The previous scenic PNG is retained as a historical artifact, but no active component references it. The browser suite asserts that the scene image is **never requested** and that the principal page surfaces contain no background-image URL.

## Real render review

| Screen | Desktop | iPad-size |
|---|---|---|
| Main bakery | [2000×1200](previews/bakery-components/main-progress-2000.png) | [1194×834](previews/bakery-components/main-progress-1194.png) |
| Worksheet | [2000×1200](previews/bakery-components/worksheet-product-2000.png) | [1194×834](previews/bakery-components/worksheet-product-1194.png) |
| Resolved order | [2000×1200](previews/bakery-components/order-resolved-2000.png) | [1194×834](previews/bakery-components/order-resolved-1194.png) |
| Inventory | [1280×800](previews/bakery-components/inventory.png) | [768×1024](previews/bakery-components/inventory-768.png) |

Also: [phone inventory](previews/bakery-components/inventory-390.png), [phone reward popup](previews/bakery-components/order-resolved-390.png), [portrait worksheet](previews/bakery-components/worksheet-product-768.png), [selected inventory](previews/bakery-components/inventory-selected.png).

The worksheet's actual digit cells for 79×18 measure **133 px** at 2000×1200, **68 px** at 1194×834, **59 px** at 1024×768 and **105 px** at 768×1024. The attached prize fits each viewport. The progressed sample menu fits 2000×1200; shorter tablet views scroll naturally to additional full-size food rows.

Visual inspection caught and corrected a small desktop overflow, inventory rarity labels sitting beneath checkboxes, and the narrow popup title crowding its X. The browser suite now checks the latter two geometrically at relevant sizes. These fixes are presentation-only; the isolated session test now loads the actual art helper required by the header.

## Verification

**41 automated tests passed:**

```sh
node --test tests/smoke.test.mjs tests/worksheet-session.test.mjs tests/worksheet-rewards.test.mjs tests/ux.test.mjs tests/completion-reliability.test.mjs
```

**Both browser runners passed** in isolated Edge profiles on a local static HTTP server:

- `node tests/browser-ux.mjs`: all existing dialog families, real checkbox multi-add/remove/sell, confirmations and persistence, exact upgrade/fusion costs, six relevant viewport sizes, live font loading in parent and child, no scenic requests, no horizontal page overflow, visible prize, tutorial OFF/reduced motion, centered reward popup, tablet three-package row, visible return button, separate checkbox/rarity bounds and title/X bounds.
- `node tests/browser-worksheet.mjs`: 79×18 = 1422 via click/drag, carrying after placement, undo/reveal dedup, downward swipe, dialog/history/settings preservation, completed-claim reload, exactly-once collection and saved upgrade. The deterministic first-order fixture receives **365 coins and one package once**.
- Same runner: 19×9 = 171 using touch taps/drags with guide and SFX enabled; 1024×768 touch/swipe 79×18 with missing `findLastIndex`, throwing animation APIs and the first two completion deliveries dropped. The result and claim still complete once. No unexpected runtime exceptions.

These are desktop Edge renders and touch emulation, **not physical iPad/Safari or child usability testing**. Audible SFX quality remains unverified. Full unfinished-math restoration after a whole-page reload remains the earlier limitation; live dialogs/resizing and completed-claim recovery are preserved.

## Files changed for this visual pass

- `styles/feedback-layout.css`: replaced the active final theme with the object/material-based system; no additional competing theme stylesheet was appended.
- `styles/typography.css`, `assets/fonts/*`, `index.html`, `worksheet/worksheet-engine.html`: local rounded type, preload and shared font loading.
- `worksheet/styles/responsive-workspace.css`: shared typography, warm tile edges and matching Undo treatment.
- `src/ui/bakery-art.js`: shared illustrated component icons.
- `src/main.js`, `src/ui/scene.js`, `src/ui/menu.js`: themed header/navigation/emblem, order-slip label and illustrated slot cards.
- `src/game/worksheet-bridge.js`: Guide/Sound label presentation only.
- `tests/worksheet-session.test.mjs`, `tests/ux.test.mjs`, both browser runners: art dependency, matching label expectation, font/no-wallpaper and layout regressions; new screenshot destination.
- This document and the current-context pointers in project docs/AGENTS. Previous uncommitted work was retained.

## Review checkpoint

**Wait for owner approval. Stage C is not started.** Level/Tier 5, seven rarities, value-preserving fusion/rebalance, actual bakery Level 30 and expanded Kitchen remain deferred. The subsequently requested ticket refresh also remains deferred: **3-minute cooldown, maximum five visible tickets, clear saved cooldown UI**. Nothing was committed or pushed.
