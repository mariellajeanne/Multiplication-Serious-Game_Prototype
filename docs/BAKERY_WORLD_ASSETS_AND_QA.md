# Three-page bakery world — assets and QA

> Superseded by the second-round original-art reconstruction. See [current implementation and QA](SECOND_ROUND_ASSETS_AND_QA.md). This file records the first visual pass only.

The November 20 text request is the implementation brief. Its fixed Packages / Menu / Orders arrangement replaces the previous single-screen hub composition. The supplied concept images guide composition; the older production plan and failed editor project are reference material. No editor, infinite loop, separate economy, renamed catalog, or publication was introduced.

## Implementation

- `src/ui/bakery-world.js` assembles three distinct 2000 × 1200 scenes at horizontal camera positions 0, 1 and 2. Menu is the initial page. One-page trips take 480 ms; longer trips take 740 ms. Smooth monotonic interpolation passes through Menu in both directions. Repeated active-page presses do not restart movement; retargeting continues from the current position. Reduced motion lands immediately.
- `styles/bakery-world.css` follows the existing loaded styles, preserving shared popups and the worksheet. The three bottom navigation buttons and four top-right controls are outside the world track and remain fixed to the viewport. Inactive scenes are inert and hidden from assistive technology.
- Root `index.html` loads the scene script after the package experience controller. Small hooks in `src/ui/bakery-hub.js` select the scene renderer and navigation while retaining the mounted worksheet and original production controllers. `?view=legacy` and `?view=environment` remain isolated alternatives.
- The background moves just 100 pixels across the complete camera journey. Its warm tint, low contrast and blur are prepared in the raster so the browser does not have to blur a large background on every animation frame.
- Short landscape screens use a vertically scrollable diorama between fixed controls, with a three-column food list. Tablet and desktop scenes fit the available space without stretching the structures. The short-screen scroll exposes the counter props, collection action and purchase controls.

## Asset inventory

Runtime scene artwork is under `assets/bakery-world/`. `provenance.json` lists all 28 prepared files, source members, SHA-256 hashes, crop bounds and adaptations. The originals and failed editor ZIP are not required at runtime.

| Source | Runtime use | Preparation |
| --- | --- | --- |
| `Charming Bakery Café Interior.png` | `bakery-panorama.webp`, `bakery-ambient.webp` | Original panorama retained; ambient derivative has cream tint, reduced saturation and source-space Gaussian blur. |
| `Cute Bakery Kiosk Menu Frame.png` | `menu-frame.png` | Used the earlier cut after inspecting it against the original; retained the illustration and transparent silhouette, removed disconnected scraps. |
| `Glossy Bakery Orders Board.png` | `orders-frame.png` | Direct original raster and alpha. The built-in rail remains part of the frame. |
| `Glossy Packages Game UI Frame.png` | `packages-frame.png` | Direct original raster and alpha. A restrained cream surface backs its transparent opening. |
| `panaderya_golden_buttons_equal_pressed.png` | Gold normal / hover / pressed and cream selected shells | Inspected earlier isolated cuts; retained original image-based buttons with live labels. |
| `panaderya_coins_boost_equal_pressed.png` | Blank orange coin and purple Boost HUD shells | Inspected earlier isolated cuts. Current coins and food Boost are live text. |
| `panaderya_help_settings_equal_pressed.png` | Green help and settings controls | Inspected normal-state cuts; removed disconnected sprite remnants. Interaction feedback uses brightness without moving their hit areas. |
| `Candy-Style Gift, Chef Hat, and Clipboard Icons.png` | Packages / Menu / Orders icons | Inspected cuts; connected-component cleanup removes neighboring icon fragments. |
| `My_Panaderya_Orders_Button_Assets_Final_Spaced.png` | Orders utility shells and refresh icon | Cropped the supplied refresh icon; removed the unrelated icons below the earlier hover shell cut. |
| `packages.png` | Eight distinct package illustrations | Preserved the inspected original-pixel cuts. Canonical tier names, unlocks and prices come from the game. Its existing ninth tier reuses the eighth illustration with a distinct live name and star number. |
| Existing `assets/bakery-ui/illustrated/` | All 17 foods, 8 coin rewards, 8 blank ticket shells, register and tray | Reused existing production artwork. No baked sample food multipliers, ticket quantities, probabilities or purchase prices were imported. |
| Existing `scroll-rail-clean.png`, `scroll-thumb-clean.png` | Menu rail and both live scroll thumbs | Cap-preserving border-image slices. Native scroll position drives the same pointer, track, wheel, keyboard and touch behavior. |

The three concept images were not flattened into working screens. Rejected cuts from the failed attempt include sample-number food tiles, complete ticket screenshots, purchase buttons with example prices, the example HUD balance, and unrelated icon fragments in the hover image.

No new art was generated. No new SVG illustration was drawn. The existing shared Boost gem, shared dialogs and preserved worksheet retain their established vector artwork. CSS supplies layout, clipping, live meters, a quiet panel backing and focus/pressed feedback; it does not replace the supplied structural frames or illustrated buttons.

To reproduce preparation (development only, using Pillow, NumPy and SciPy):

```powershell
python scripts/prepare-world-art.py 'C:\GitProjects\THS HO Game\assets.zip' 'C:\Users\USER\Downloads\my_panaderya_parallax_project.zip'
```

## QA record

Fixed during visual inspection:

- An inherited transform clipped food Boost labels against their cells.
- An inherited ticket plaque position placed reward labels beside the wrong part of the ticket.
- Neighboring scenes appeared beside the camera viewport at wide aspect ratios; the world now clips to exactly one page.
- Full-scene shrinking made the short landscape preview too small; the larger diorama now scrolls between fixed overlays.
- The earlier hover cut contained unrelated icons; only its blank button shell is retained.
- Runtime background blur/position updates were replaced with a prepared ambient raster and composited translation.

Final validation:

- `node --test tests/*.test.mjs`: **290/290 pass**, including four new world tests for data-preserving assembly, monotonic camera traversal, retargeting/reduced motion, and production batch transaction protection.
- `python tests/browser-world.py edge webkit`: **both engines pass**. Checks all three pages at 2000 × 1200, 1280 × 800, 1920 × 1080 and 800 × 360; fixed HUD/navigation bounds; inert inactive scenes; actual camera samples through Menu both ways; retargeting; reduced motion; carousel click/focus/keyboard selection; live odds; wheel, thumb drag, keyboard endpoints and Edge touch swipes; all four HUD dialogs; refresh and paid-refresh confirmation; purchase/reveal/collect, duplicate receipt protection, locked previews and saved-stock opening; original worksheet frame and frozen payout across page trips/reload; legacy route; no page or console errors.
- `python tests/browser-responsive.py`: **Edge/WebKit responsive checks and actual Edge browser zoom 80–200% pass** for the preserved legacy interface.
- `$env:PANADERYA_TEST_VIEW='hub'; node tests/browser-worksheet.mjs`: **pass** with permitted browser-launch access after stopping the stalled sandboxed attempt. Exercises 79 × 18 = 1422, typed digits/connector drag, flexible carries, Undo/reveal deduplication, downward swipe, tutorial/sound, reload, one-time claims, touch, and missing/throwing browser animation API fallbacks.
- The required develop-web-game skill client ran successfully against final Packages and earlier Orders, producing screenshots and `render_game_to_text` output. Screenshots were opened and inspected.
- `git diff --check`: **pass**.

Screenshots and text state are under ignored `output/playwright/bakery-world/`, including the required tablet/desktop sizes, short-screen scrolled views, skill-client captures, and real 79 × 18 worksheet. Windows WebKit can return sparse animation-frame samples; its test verifies camera direction and crossing independently of frame rate. Physical device frame rate is not established by these desktop checks.

`tests/browser-world.py` is the current production scene integration check. The earlier hub/UI refinement/order presentation runners encode the superseded single-screen composition and package-modal navigation; their old pixel/selector expectations are not the new scene acceptance criteria. Migration, economy, legacy and worksheet regressions remain in place.

Physical tablet performance and device-specific touch/browser behavior require a device pass; automated checks use desktop Edge, WebKit and emulated touch. No push, deployment or APK rebuild is part of this request.
