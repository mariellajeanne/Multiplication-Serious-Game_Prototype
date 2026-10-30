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
