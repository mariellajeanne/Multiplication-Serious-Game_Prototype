# Worksheet regression checklist

After changing worksheet CSS, drag/drop handling, sound, or carry logic:

1. Open index.html with VS Code Live Server.
2. Select a ticket requiring carrying and complete it. The automated `node tests/browser-worksheet.mjs` seeds precise 79 × 18 (=1422) and 19 × 9 (=171) cases without touching your normal browser saves. For standalone debugging, the hidden custom inputs remain available through the console: set `document.getElementById('customA').value=79`, `document.getElementById('customB').value=18`, then call `document.getElementById('tryCustom').click()`.
3. Connect top and bottom digits by **two taps**; verify the rounded capsule appears.
4. Try **dragging** from one operand to the other; it should connect too.
5. Tap the floating `M × N` chip; it should reveal product digit tiles.
6. Put a digit into the current partial product, then lift the tens digit upward to the carry position.
7. On the next multiplication, use the waiting carry; try both 'carry before placement' and 'carry after ones placement'.
8. For a two-row problem, swipe downward to merge the partial products and verify the correct final total.
9. Turn tutorial OFF — there must be **no arrows**. Turn it ON — only the relevant hint arrows should appear.
10. With sound ON, listen for a satisfying tap/link/drop/carry/merge sound; with sound OFF, all worksheet sounds should stop.
11. Check no coins/chests are awarded twice on replay, undo or tapping the same source again.
12. Confirm the food menu and reward flow still work when exiting the worksheet.
13. Open/close Settings, foods and Help during a partial carry; the same worksheet state must remain. Check Escape and keyboard focus in dialogs.
14. Verify the reward chip pauses near the action and flies to the dock; the dock total catches up on arrival. In reduced motion it fades. Repeated input must not add extra rewards. Finish and claim, then buy a food level and reload the menu to verify its saved level.
15. Check the prize dock at tablet and phone sizes; swipe down starting both on whitespace and directly on a completed partial-product digit. Guide OFF must clear prompts, target outlines and all arrow layers immediately.

Tip: if you are editing appearance alone, most of the worksheet behavior should remain unchanged; still check hitbox alignment after tile size/position changes.


## Frame 11 physical iPad Safari follow-up

- Use a physical iPad in landscape, with Safari chrome visible, then rotate and return. Confirm the correct ticket operands load every time.
- Complete 79 times 18: tap and drag connections, reveal, place ones/tens in either permitted order, lift provisional tens, merge an incoming carry, then swipe down over a completed cell.
- Toggle Guide and Sound ON/OFF. OFF removes guidance; sound needs an actual listening check after the first trusted touch.
- Exit mid-product, start another ticket, resume the first, reload, background Safari, then resume. Check both problems, partial digits/carries, undo history, progress, coins and package ledgers.
- Complete an order; scroll to both Collect actions. Collect once, double-tap, close the reward dialog, reload, and verify no duplicate coins or foods. Test saving free packages and opening them later.
- Verify touch scrolling of the collection, sticky selected-food list, dialogs, tickets and carousel without accidental selections. Check long-press and mixed bulk actions.
- Buy Power, a slot and Mastery; use Undo before ten seconds and after a reload. Starting an order must commit Undo. Open packages in a batch and verify no discarded foods.
- Enable reduced motion and repeat purchase, package and addition feedback.

Windows WebKit and Edge emulation do not replace these device checks.


## Unique-food / tablet UX follow-up (2026-11-04)

- Complete 79 ? 18 via swipe and 12 ? 12 via Add Rows. Confirm Guide OFF removes instructions/arrows; the Add Rows control remains available.
- Make an invalid placement. The digits, Undo and prize dock must not move. Check corrected placement can immediately continue while its short animation finishes.
- Open recipe details at all five target tablet sizes; scroll the information body while the action footer remains usable. Test Select Foods and long-press, mixed actions and the slot-limit explanation.
- Open duplicate rewards repeatedly: exactly one owned card per recipe, unchanged purchased Mastery/Tier/investment/assignment, and +1 available paid-Mastery capacity per duplicate.
- At maximum slots, verify the full Food Index sets the cap even with undiscovered recipes.
- With an empty previously selected package type, enter Unbox and check that an in-stock type is selected. Check MAX, Open Selected Instantly, Open All scope and next locked type requirements.
- Close Settings/shop/confirmations/details using touch and keyboard. Focus returns to the initiating control; stale notifications must not cover math or Collect.
- Reload a legacy multiple-copy fixture and confirm one retained recipe, conserved paid investments, a backup under panaderyaQuestV2BeforeUniqueFoods, unchanged primary save key and retained order sessions/rewards.

Physical iPad and audible checks remain pending; desktop WebKit does not mark these device steps passed. Legacy game modes are outside this phase.
