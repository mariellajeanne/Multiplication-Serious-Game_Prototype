# My Panaderya — Loading Screen Ideas (Parked for Later)

**Status:** Idea bank only. Do **not** implement or finalize artwork yet. Focus on the rest of the PC/browser UI and UX first.

## Goal

Make initial game loading feel playful and bakery-themed without delaying students from playing. Keep loading behavior independent of the rest of the game's evolving UI so future visual changes require little or no work on the loading system.

## Recommended concept: Baking Bread in an Oven

- A simple, cute, handcrafted **2D illustrated bakery oven**, consistent with My Panaderya's matte, 3–4-tone, lightly cel-shaded art style.
- **Continuous subtle loop:** warm oven glow slowly pulses; two or three small steam puffs rise and fade.
- **Progress-linked change:** dough/bread gently rises and becomes golden as essential resources become ready.
- **Completion:** small bread pop/bounce, optional short *ding!* (only if audio is enabled and playback is permitted), then transition immediately into the bakery.
- **Progress display:** bakery-themed horizontal bar beneath the oven, with a short plain-language loading label. Use real progress where measurable, not a fake percentage that stalls at 99%.
- Avoid complex micro-details, excessive glossy effects, heavy GIFs/videos, or forced animation playback before entering the game.

### Alternative concepts

1. **Rising dough:** a dough ball gently expands and turns into a bun as progress advances. Simplest to animate and maintain.
2. **Mixing ingredients:** a whisk continuously stirs a bowl; small ingredients move subtly. Particularly suitable for unpredictable loading times because the loop does not rely on progress.
3. **Bakery conveyor:** small pastries move toward the end of a conveyor belt. Playful, but more complex than necessary.

## Suggested startup loading UX

1. Show a lightweight loading scene only when there is meaningful waiting; avoid a visible flash for near-instant loads.
2. Load the **minimum essential resources** for the first usable bakery screen. The exact set should be determined by inspecting the existing code, not guessed or hardcoded into the visual component.
3. Enter the game **automatically** as soon as the first screen is genuinely ready. **No Skip button is needed** for the loading sequence: if it can safely be skipped, the game should simply proceed.
4. Load nonessential resources for later screens, effects, and popups in the background, without leaving visible holes or blocking interactions when players reach those screens.
5. If an essential resource fails, show a clear recovery message and **Retry** button instead of stalling forever.

### Tips underneath the progress bar?

**Optional, not a priority.** Short loads make tips difficult to read, especially for young students.

- Under ~2 seconds: no tip; show only a simple loading label if any feedback is needed.
- ~2–4 seconds: one short status message, e.g. *Preparing your bakery...*
- Over ~4 seconds: optionally show **one brief game tip**, such as *Tap Tutorial to see the next step!* or *You can return to an unfinished order.*
- Avoid rapid tip rotation. If loading is genuinely long, change a tip only every ~5–7 seconds, and keep text easy enough for younger readers.
- Never hold the loading screen open just to finish displaying a tip.

## Order ticket / worksheet opening

**Current observation:** opening an order ticket takes approximately **one second or less**.

**Decision:** do **not** add a ticket-specific loading bar or full loading screen. A small, satisfying **~150–250 ms ticket-opening transition** (subtle lift, expand, or slide) is enough, provided it does not delay readiness. Show a minimal spinner only if an unexpected longer delay occurs. Preload reusable worksheet resources when practical.

## Technical design for later implementation

Keep three concerns separate:

- **Loading / readiness manager:** determines what has genuinely loaded and what is required before opening the game.
- **Resource declarations / registration:** updated only when the asset pipeline or required resources change.
- **Visual loading component:** oven artwork, animations, text, and progress bar. Can be reskinned without changing readiness logic.

Additional constraints:

- Inspect the actual repository first; reuse existing loading mechanisms and avoid architecture rewrites.
- Favor CSS `transform` and `opacity` on a few independent illustrated layers (or similarly lightweight animation); avoid expensive continuous repaints.
- Work with the existing HTML/CSS/JavaScript game and Android wrapper, and respect reduced-motion settings if feasible.
- Avoid tying loading to particular menu/order/package UI layouts, since those are still being redesigned.
- Do not disrupt working gameplay, progress persistence, rewards, or Co-Baker networking.
- Use targeted verification for this change; reserve broad regression tests for substantial refactors.
- Never introduce a minimum artificial loading duration just to showcase the animation.

## Timing / when to revisit

**After** the desktop bakery's overall art direction is sufficiently stable, finalize the oven's visual layers and connect them to the independently implemented loading system. Alternatively, the loading architecture could be implemented earlier with a plain placeholder if startup issues make it necessary. This is an optional future task, not part of the immediate UI-polish scope.

**Likely Codex reasoning:** Medium for examining existing initialization/loading; High if implementing a new reliable asset-readiness pipeline; Low–Medium for later visual tweaks. Actual usage depends on code complexity and scope.
