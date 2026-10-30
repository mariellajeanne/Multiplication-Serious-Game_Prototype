# Worksheet regression checklist

After changing worksheet CSS, drag/drop handling, sound, or carry logic:

1. Open index.html with VS Code Live Server.
2. Select a ticket requiring carrying and complete it. For precise debug you can open `/worksheet/v33-engine.html` directly from Live Server and use the built-in custom problem inputs to try `48 × 6` (=288) or `79 × 18` (=1422).
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

Tip: if you are editing appearance alone, most of the worksheet behavior should remain unchanged; still check hitbox alignment after tile size/position changes.
