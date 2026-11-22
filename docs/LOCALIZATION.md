# Tagalog localization

Settings → Language / Wika switches between English and Tagalog. The choice is stored in
`panaderyaQuestLanguage`, outside the progress save.

## How it works

All translations live in [`src/ui/language.js`](../src/ui/language.js). English source text is the key.

- `TAGALOG_UI` holds exact phrases. `TAGALOG_PATTERNS` handles dynamic text (counts, coin
  amounts, digit columns, Co-Baker names) and keeps every number and name.
- `uiText(english)` returns the Tagalog text in Tagalog mode and the unchanged English otherwise.
- In Tagalog mode, a render-time pass also applies these tables to text nodes and to `aria-label`,
  `title`, `placeholder`, `alt` and `aria-valuetext`. It keeps each English original, so switching
  back restores the English text without reloading. Call sites keep plain English strings.
  The worksheet frames load the same file and follow a language change through the `storage` event.
- Code never reads translated text back. Saves, network messages and protocol fields stay English.

To add a string, add its exact English text, as rendered, to `TAGALOG_UI` (or a pattern).
`tests/language-localization.test.mjs` checks worksheet, carrying, tutorial and Co-Baker guidance
against the source files, and checks that protected names and numbers are preserved.

## Glossary

| English | Tagalog mode | Note |
|---|---|---|
| My Panaderya, Baker's Boost, Co-Baker | unchanged | Brand and feature names |
| Gift … Divine (package tiers); Classic … Crown Jewel (rarities); Coin Stack … Divine Treasury | unchanged | Fixed tier names |
| Food names, order names (Snack Order …), mode names (Normal …) | unchanged | Canonical names |
| Food Index, Food Inventory, Package Counter, Recipe Mastery / Mastery, Permanent Luck, Auto Equip, Equip Best, Guide | unchanged | Named places/features used inside sentences |
| Packages, Orders, Menu (page names) | unchanged | Match the baked sign artwork |
| Equip, Unequip, Sell, Upgrade, Undo, Sort | unchanged | Short, familiar game buttons |
| coins, order, ticket, package, slot, digit, carry, ones, tens, partial product, worksheet | Taglish | Familiar classroom/game words |
| tap, drag, swipe | i-tap, i-drag, mag-swipe | |
| product / answer | sagot | |
| row (of partial products) | hanay | "I-add ang mga hanay" |
| tile (worksheet box) | kahon | |
| carry row / carry shelf | hanay ng carry | |
| connect digits | pagdugtungin ang mga digit | |
| food | pagkain | |
| Golden Challenge | Gintong Hamon | Existing translation retained |
| Save & Exit (worksheet button) | ⇥ I-save | Fits the button; aria says "I-save at Lumabas" |
| Find a Helper (worksheet button) | Magpatulong | Fits the button |

Tone: friendly "mo/ko", short commands, "Subukan ulit!" over formal phrasing.

## Known limits

- Words baked into artwork (for example the "Menu", "Orders" and "Packages" signs and the
  title sign) stay English.
- Developer-only Co-Baker diagnostics (relay testing, TCP probe, coordinator details) and the
  hidden worksheet calibration panel stay English.
- The loading screen shows English for a moment until `language.js` has loaded.
- Legacy `?view=legacy` screens use the same tables but were not reviewed screen by screen.
