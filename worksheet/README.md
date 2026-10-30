# Worksheet engine — editable, not frozen

The worksheet keeps the **v33 interactions** because those are the UX requirements. Its artwork, theme, layout, and animations can change.

## Where Codex should make changes

- **Appearance:** `styles/custom-theme.css` (last-loaded override; ideal for design experiments). Existing cascade: `foundation.css` → `effects-and-guides.css` → `receipt-theme.css` → `embedded-layout.css` → `custom-theme.css`.
- **HTML structure / interactive tile hooks:** `v33-engine.html` and `src/worksheet-render-and-tutorial.js`.
- **State / math operations:** `src/state.js`.
- **Sound, product reveal / float animation:** `src/sound-and-multiplication-fx.js`.
- **Product tile placement, carries:** `src/product-placement.js`.
- **Partial product addition / swipe merge:** `src/partial-product-addition.js`.
- **Rendering and animated tutorial arrow guidance:** `src/worksheet-render-and-tutorial.js`.
- **Tap, drag/drop and rounded capsule connection:** `src/tap-and-drag.js`.
- **Sound/tutorial/custom number UI controls:** `src/worksheet-controls.js` and `src/embedded-controls.js`.
- **Parent app's ticket communication / mastery stats:** `src/parent-bridge.js` and outside iframe `../src/game/v33-bridge.js`.

### Mechanics to preserve unless specifically requested otherwise

1. Tap or drag top and bottom digits, showing the rounded capsule connection.
2. Tap the `M × N` float to reveal its tiles; place digits in either order.
3. Place carry upward and add the incoming carry to the correct result, with flexible sequence.
4. Swipe downward to merge partial products, with right-to-left cascade.
5. Tutorial arrows only when enabled; sounds on valid interactions.
6. Rewards use the parent app's postMessage bridge, not a new duplicated economy.

### Implementation note

The files are currently **ordered classic scripts sharing one global lexical environment** (a conservative transformation from the original IIFE). Script order in `v33-engine.html` is important. It is a real source split, not yet a fully decoupled ES module design. Avoid introducing global names that conflict with built-in browser properties. More granular state isolation could be a later, separately tested change.

### Test

- Run `node --test tests/smoke.test.mjs` from the project root (Node.js required) and test with Live Server.
- In the live game, complete `79 × 18`; test tap and drag, carry placement/addition, downward swipe merge, arrow ON/OFF and audio ON/OFF.
- Compare visual positions after editing: drag hitbox must match visible tile and finger target.
