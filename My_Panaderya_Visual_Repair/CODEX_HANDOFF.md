# Source and integration handoff

## Source map

- `index.html`: semantic, independently composited scene, native scroll viewports, cabinet header, clipboard utilities, navigation and modal mount.
- `styles.css`: one layout/component stylesheet for the 2000 × 1200 reference canvas. No accumulated override passes or border-image cabinet slicing.
- `app.js`: the original demo catalog/state and transactions, food/ticket rendering, popup content, event dispatcher and fitted stage. `syncScrollbar` and `wireScrollbar` share the two scrollbars' geometry and interaction rules.
- `assets/`: independent illustrated components, preserved food/package/reward art, clean glass-compartment SVG, local font and license.
- `tests/browser-qa.py`: actual browser actions, geometry and accounting assertions, native Chromium touchscreen gestures, screenshots and JSON results.

## State and interaction flow

Equipment → `renderMenu` → equipped-food Boost → `seedOrders` → `renderTickets`.

Ticket → `openOrder` → original multiplication answer check → remove ticket and credit original coin calculation → completion popup. A removed ticket cannot pay again.

Packages entry → existing nine-tier grid → original price deduction and random food sample → owned-food Set → collection. The UI repair does not alter the sample distributions or turn them into production probability tables.

Native scroll positions drive thumb height, position and accessibility values. Pointer dragging converts screen-coordinate travel directly against rendered track travel, so scaling does not change the scroll ratio. ResizeObserver refreshes the rails after content/layout changes. A gesture cancellation clears pressed/dragging feedback.

`render_game_to_text()` is a read-only JSON view for QA. `advanceTime(ms)` waits for visible frames and updates scroll geometry; the demo has no time-based economy or simulation to advance. Foods and tickets remain real DOM elements, as required by the owner.

## Art boundaries

The background contains environmental scenery, including the decorative packages/flower arrangement, but **no gameplay cabinet, tickets, logo, HUD, Packages sign, navigation or register**. All of these are independent components or real DOM content. The clipboard has a blank illustrated title plaque with a real DOM Orders label; popup headings use one blank illustrated plaque with real text.

Nine replacement art components were reconstructed with image generation from the approved reference/source assets. Transparent padding was normalized. Two package sprites and the original Buy button were cropped to remove verified detached neighboring fragments while preserving their main artwork. No scene screenshot fragments are used as repeated ticket/food components.

## Production boundary

This is a repaired standalone source project, not a production integration. Do not copy its demo economics, ownership fixtures, answer input or lack of persistence into the parent game. Any later integration must retain production food identities, actual Mastery/upgrades, probability tables, frozen order rewards, worksheet engine/bridge and the existing save key. This repair did not modify those files.

Do not push or deploy without the owner's request. Physical-tablet performance and final aesthetic acceptance still require owner review.
