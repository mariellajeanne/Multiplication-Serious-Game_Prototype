# My Panaderya — illustrated UI repair

Open **index.html** in Edge or Chrome. This is a static HTML/CSS/JavaScript project; no build or server is required. Keep the `assets/` folder beside the HTML file. A local HTTP server also works.

This repairs the supplied `My_Panaderya_Touch_Fixed_Source.zip`. The approved bakery illustration guides composition, materials, silhouettes and spacing. The existing Filipino food miniatures, nine package tiers, food IDs, sample prices and reward calculations are retained.

## What changed

- One 2000 × 1200 scene, uniformly fitted to the browser, with a continuous reconstructed background and clear HUD margins.
- Clean independent cabinet, clipboard, navigation, Packages plaque and headings. Unused defective screenshot fragments were removed from this distribution.
- A stationary cabinet and shared Menu Collection/Boost header; real food cells, centered incomplete rows and native scrolling.
- One reusable ticket grid with reward art, food name, exact coin payout, food/tray expression and play affordance. The register clears the board.
- Both illustrated scrollbars follow native scrolling and support wheel, touch, arrows, track, mouse/touch dragging and keyboard control.
- Illustrated popups with a shared clean heading, readable layouts, focus containment/restoration, Escape/backdrop dismissal and cancelled-pointer cleanup.

The Packages plaque, decorative alcove and bottom Packages button all open the same nine-tier popup. Package props in the scenery do not select individual tiers.

## Preserved demo behavior and limits

- Orders award coins only, once, using the original sample Base Coins × equipped-food Boost calculation.
- Foods come from package opening; buying a package immediately opens it, as in the supplied ZIP.
- The collection equips/unequips owned foods, retaining at least one and allowing at most 16 equipped foods.
- Settings retains the source demo's layout previews, now including the requested 10-food case. These previews also grant demo ownership, exactly as the original preview controls did.
- The supplied project has **sample economics and a basic answer field**. It has no production long-multiplication engine, save persistence, Mastery, paid upgrades or confirmation workflow. Those systems were not fabricated or replaced. Production gameplay, the worksheet protocol and `panaderyaQuestV2` in the parent repository are untouched.

## Verification

The browser runner drives real controls, checks DOM boundaries, captures screenshots and tests transactions in isolated browser contexts:

```powershell
python tests/browser-qa.py edge webkit
```

It reuses the parent repository's Playwright installation when present. Outside that repository, install Python Playwright and its desired browser normally; Edge is selected through Playwright's `msedge` channel.

See [VISUAL_QA.md](VISUAL_QA.md) for the source diagnosis, validation record and remaining limits, and [CODEX_HANDOFF.md](CODEX_HANDOFF.md) for integration boundaries. Nunito's license is included in `assets/OFL-Nunito.txt`.
