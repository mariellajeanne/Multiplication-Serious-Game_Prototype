# Second-round implementation, asset mapping and visual QA

## Approved artwork revision — November 20, 2026

The latest owner handoff supersedes the checkpoint below. Production now uses the supplied pastel café background and three approved frames in `assets/bakery-approved/`. All supplied frame PNGs were RGB with baked white/checkerboard backgrounds; faithful transparent extraction used the built-in image generator. Source hashes, alpha bounds, dimensions and extraction prompts are recorded in `provenance.json`. The original background is unchanged. Existing foods, eight package illustrations, tickets, counter gifts and register remain in use.

The background and stations move together in one finite world. Camera anchors account for the actual artwork silhouettes, giving both adjacent visible gaps approximately 220 logical pixels. Outer stage/page clipping is removed; only the viewport and intended inner lists clip. HUD and bottom navigation remain fixed. Buttons are simple rounded controls, scrollbars follow native vertical positions, counter props share the counter baseline, and order progress labels/percentages sit inside their bars.

The vertical package selector has exactly Gift, Surprise, Mystery, Secret, Enchanted, Mythical, Cosmic and Divine. Each package has the owner's three-rarity mapping. Previous probability weights are normalized within those three rarities; the pricing curve is retained, with the existing resale safeguard evaluated for the approved rewards and the historical floor retained. Saved stock retains historical distributions/guarantees. Former ninth-tier stock is folded into Divine with its original reward promise; frozen receipts, worksheet payouts, ownership and paid Mastery remain intact.

Verification: all 293 Node tests pass. The production world runner passes Edge and WebKit, including real purchases, replay protection, settings/dialogs, scrolling by wheel/drag/touch/keyboard, finite camera motion, reduced motion and worksheet persistence. PNG alpha bounds verify equal visible gaps, preserved aspect ratios and clear navigation at 2000×1200, 1280×800, 1024×768, 1920×1080, 854×480 and 800×360. Screenshots are under ignored `output/playwright/approved/`, including all three stations and a mid-transition state. The real worksheet runner completes 79×18 with carrying, Undo, swipe, reload and one-time claims. Preserved responsive/zoom and isolated environment runners pass Edge/WebKit.

On short landscape phones the scene scrolls vertically while HUD/navigation stay fixed; changing stations restores the top. Physical-device testing remains separate. No deployment was performed.

## Earlier checkpoint retained for provenance

Implemented in the existing game from the new handoff's complete master prompt and the three original full-resolution concepts. The earlier editor, its layouts and its extracted graphics are not inputs to this presentation.

## Presentation and integration

`index.html` now loads `src/ui/bakery-scenes.js` and `styles/bakery-scenes.css`, replacing the first-pass world scripts/styles in the production entry point. The original worksheet, collection, Settings, Help, purchases, batch receipts, refresh, saves and Co-Baker services remain the real controllers. No build, CDN, new runtime dependency, save migration, economy change or parallel mockup was added.

The presentation uses three independently rendered scenes in a finite 6000 × 1200 logical strip. A single monotonic camera sweep crosses Menu between the endpoints, with rapid retargeting and an immediate reduced-motion alternative. The background moves more slowly. All four HUD controls and three navigation bounds are viewport overlays. The center slot opens the collection on Menu and navigates home from either side; there is no duplicate collection button on the counter.

The Menu uses the original awning/frame, four columns and two substantial visible food rows. Tier, effective level (paid Mastery + 1) and actual Boost remain live. Real owned recipes are shown; unequipped ones are identified. Sparse saves show the real slot purchase action and empty recipe spaces without inventing ownership. The standalone gift stack and inward-facing pink register sit on the counter.

Packages uses the original ribbon/timber frame, a larger featured illustration, identifiable horizontal tier carousel, a connected illustrated rail, live discovery, aligned colorful chance rows and the three rectangular illustrated purchase controls. All eight real food-quality probabilities remain accessible by scrolling their inset. Orders uses separately preserved top/bottom frame caps and an extended straight middle, four large ornate slips, original reward/tray cutouts, live equations/progress, and the existing worksheet entry actions.

Short landscape screens vertically scroll the intact artwork between fixed controls. The background remains recognizable; CSS variables `--room-brightness`, `--room-saturation` and `--room-blur` adjust its separation from foreground content.

## Source-preserving artwork

There are **60 raster exports** under `assets/bakery-faithful/`, with per-file crop bounds, source hashes, adaptations and generated source names in `provenance.json`. Originals remain untouched. No full concept screenshot is used as an app screen. The old `assets/bakery-world/` folder is not consumed by the new presentation.

| Original artwork | Components / preparation |
| --- | --- |
| Cute Bakery Kiosk Menu Frame | Original silhouette, canopy, Menu plaque, lamps, cabinet and counter. Removed the connected exterior checkerboard only. |
| Glossy Packages Game UI Frame | Original complete timber/ribbon frame and transparent opening. |
| Glossy Bakery Orders Board | Original top and bottom caps retained intact; only straight middle posts extend. Its original rail is independent, with exterior brown removed and endcaps protected. The unsliced original export is also retained for provenance. |
| Gold, Coins/Boost, Help/Settings and Orders button sheets | Independently cropped original controls/states and icons. Gold buttons use protected cap slices; the HUD uses full-height endcaps with only the middle extending. |
| Candy-style gift / hat / clipboard sheet | Actual shared navigation illustrations, isolated without neighboring fragments. |
| `packages.png` | Eight individually bounded original package illustrations. Crops follow each object instead of a uniform sprite grid, preserving bows, questions and outlines while removing neighboring components. |
| Menu concept | Original collection book, food-card edge pixels and six catalog-matched foods: Ube Ensaymada, Brazo, Buko Pie, Pianono, Ensaymada and Ube Pandesal. Cabinet pixels and example multiplier fragments removed; the food pixels are preserved. The other eleven real recipes retain established game illustrations. |
| Orders concept | Coin Cart, Treasure Chest, Coin Bucket and crown reward illustrations plus tray cutout; sample quantities, labels and progress are not imported. Other real reward tiers retain existing game artwork and receive distinct paper treatments. |
| Packages concept | Original coin illustration, isolated for dynamic prices. |
| Menu concept yellow thumb | Independent illustrated thumb; 14px source endcaps remain separate from its stretchable center. |
| Original café panorama | Uniform aspect-preserving cover, modest source blur, reduced saturation and 42% cream blend. Runtime adjustments remain available. |

**Seven newly generated transparent raster assets**, made with built-in `image_gen` and the actual concepts as explicit references: the stacked counter gifts, pink register, four blank ornate ticket shells (gold, pink, purple, rainbow), and blank rounded-rectangle purchase shell. Each was inspected before integration. Generation briefs and invariants are in `assets/bakery-faithful/GENERATION.md`; these images are saved inside the repository, not referenced from the generator's cache.

CSS supplies live text, meters, layout, quiet flexible chance/title backing, clipping, hit regions, focus feedback and cap slicing. No new SVG food, gift, register, timber frame, ticket or ribbon substitutes were drawn. The existing shared Boost symbol and preserved worksheet artwork remain in use.

Development-only preparation:

```powershell
python scripts/prepare-faithful-art.py ORIGINAL_ASSETS_ZIP GENERATED_DIRECTORY
```

## Visual comparison and corrections

Opened all original PNGs and all three full-resolution concepts before implementation; recorded the initial composition blueprint in `SECOND_ROUND_VISUAL_BLUEPRINT.md`. Inspected multiple actual screenshot iterations, then generated and opened side-by-side comparison images.

Corrections included inherited CSS shrinking the package frame and changing the food grid into crowded flex rows; food-card center seams; empty-looking food composition; omitted/mismatched counter props; generic boxed ticket structure; small/faded package previews; neighboring sprite fragments; opaque coin/tray crop corners; a sample multiplier edge below a food; a frame slice seam; and short-screen HUD cap distortion. The final HUD protects the entire endcap at the current height rather than stretching corner pieces independently.

Screenshots are under ignored `output/playwright/second-round/`:

- `menu-final.png`, `packages-final.png`, `orders-final.png`: actual game at **2000 × 1200**, with isolated established-game fixtures to expose real content and decorative variants.
- `menu-comparison.png`, `packages-comparison.png`, `orders-comparison.png`: original concept beside the running game. Reference images are fit without distortion for comparison only.
- `edge-2000-menu-starter.png` / WebKit equivalent: genuine starter composition with sparse ownership.
- `edge-2000-mid-transition.png` / WebKit equivalent: a rendered intermediate camera position, with all seven control bounds checked.
- `edge-1280-*`, `edge-1920-*`, `edge-800-*` and WebKit equivalents: tablet, desktop, phone landscape and scrolled views.
- `edge-pressed-state.png`: supplied pressed artwork in use. Skill-client directories contain inspected screenshots and `render_game_to_text` output.

## Functional validation

- `node --test tests/*.test.mjs`: **290/290 pass**. Includes the four scene tests for state-preserving rendering, camera traversal, rapid retarget/reduced motion and protected production purchases.
- `python tests/browser-world.py edge webkit`: **both pass**. Three pages at 2000 × 1200, 1280 × 800, 1920 × 1080 and 800 × 360; contextual center button; fixed bounds for all seven controls during travel; inactive-page input isolation; all navigation directions; mid-sweep capture; fast retargeting; reduced motion; wheel, thumb drag, keyboard endpoints and Edge native touch swipes; tier selection; actual odds; real purchases/reveals/collection and receipt replay protection; locked previews; saved packages; refresh/paid-refresh confirmation; all HUD dialogs; food gallery; mounted worksheet/frozen payout across navigation and reload; legacy route; no page/console errors.
- Existing `$env:PANADERYA_TEST_VIEW='hub'; node tests/browser-worksheet.mjs`: **pass** with permitted browser launch. Real 79 × 18 and 19 × 9 carrying, digit tap/drag, flexible carry placement, Undo/reveal deduplication, swipe addition, settings, reload, one-time claims and animation/completion fallbacks.
- `python tests/browser-co-baker-relay.py`: **pass** with real Edge/WebKit clients: discovery, both-way messages, duplicate-tab identity, name changes, disconnect/reconnect, solo worksheet entry during outage, identity after restart and independent saves. Updated only its navigation step to enter the now-separate Orders page.
- `python tests/browser-responsive.py`: **pass** for preserved Edge/WebKit legacy layouts and actual Edge zoom 80–200%.
- Additional real-browser detail check: slot purchase debits the actual price and increases actual capacity; supplied desktop hover/pressed images are selected; contextual center opens the real gallery.
- Required develop-web-game skill client: **pass**, screenshots/text opened and inspected.
- `python tests/browser-environment.py edge webkit`: **both pass**; scenery route and preserved-game entry remain isolated.
- `git diff --check`: **pass**.

The earlier single-screen hub/UI geometry runners retain their historical expectations; the production three-scene acceptance runner is `tests/browser-world.py`. Migration and legacy tests were retained. No giant unrelated test rewrite was made.

## Intentional differences and limits

- Fixed shared navigation/HUD and the contextual center slot override their varying placements in the concept screenshots, as the new specification requires. The center navigation overlaps part of the original lower Packages ribbon; the original artwork is preserved behind that overlay.
- Actual names, food identities, probabilities, prices, progress and ownership replace example content. The working repository has **nine** package tiers and eight food-quality chances; all existing tiers/rules remain intact. The ninth tier reuses the eighth original package illustration with its own real name and number. No ninth design was invented and no saved tier removed.
- Seven missing illustrations are faithful reconstructions rather than pixel-identical source exports. Remaining catalog recipes without matching concept illustrations retain the existing game's art.
- Windows WebKit can deliver sparse animation-frame samples. Direction, camera crossing and bounds are tested independently of that sampling rate. Physical tablet frame rate, native Android radio/LAN behavior and hardware touch require device verification; desktop/emulated results do not establish those environments.
- No deployment, push or APK rebuild was performed. Unrelated existing work was retained.
