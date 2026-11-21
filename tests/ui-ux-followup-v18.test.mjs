import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('intentionally open Food Inventory keeps collection behind a separately closing detail layer',()=>{
 const h=src('src/ui/bakery-hub.js'),menu=src('src/ui/menu.js');
 assert.match(h,/const detailVisible=!multiSelect&&selectedFoods\.size===1/);
 assert.match(h,/food-collection-detail-backdrop/);
 assert.match(h,/role="dialog" aria-modal="true" aria-label="Selected food details"/);
 assert.match(menu,/if\(collectionDetail\)render\(\);else paintFoodPanel\(\)/);
 assert.match(menu,/restoreFocus\(foodReturnFocus\)/);
});
test('ordinary toasts are bounded, stack bottom-left, and do not replace actionable dialogs',()=>{
 const game=src('src/game/state.js'),css=src('styles/progression.css');
 assert.match(game,/dock\.style\.left='max\(12px/);
 assert.match(game,/dock\.style\.top='auto';dock\.style\.bottom=/);
 assert.match(game,/while\(root\.children\.length>3\)/);
 assert.match(game,/forceDock=false/);
 assert.match(css,/\.notification-dock \.toast\{width:100%/);
});
test('helper toasts keep actual status reasons separate from invitations',()=>{
 const ui=src('src/ui/co-baker-help.js'),protocol=src('src/network/help-requests.js');
 assert.match(ui,/toast\(text,\{forceDock:true\}\)/);
 assert.match(ui,/Only newly recorded, non-actionable status messages/);
 assert.match(protocol,/declined:'Help request declined\.'/);
 assert.match(protocol,/expired:'Help request expired\.'/);
 assert.match(protocol,/if\(outcome&&c\.source==='manual'\)/);
});
test('six-task first-time guide uses persisted checkpoints, live spotlights and leaves worksheet math alone',()=>{
 const tour=src('src/ui/game-tour-v18.js'),css=src('styles/game-tour-v18.css');
 assert.match(tour,/panaderyaWholeGameTourV2/);
 assert.match(tour,/localStorage\.setItem\(KEY,skip\?'skipped':'done'\)/);
 for(const label of ['Solve an Order','Earn Coins','Buy a Package','Unbox a Food','Add Food to Your Menu','Boost Coins with Equipped Food'])assert.ok(tour.includes(label));
 for(const stage of ['nav-orders','ticket','worksheet','complete','summary','back','nav-packages','buy-package','package-reveal','package-collect','nav-menu','buy-slot','empty-slot','choose-food','equip','close-food','close-inventory','boost','ready'])assert.ok(tour.includes(stage));
 assert.match(tour,/g\.run\?\.procedureComplete/);
 assert.match(tour,/g\.claimedOrders\[orderId\]/);
 assert.match(tour,/g\.activeMenu\.includes\(tour\.foodUid\)/);
 assert.match(tour,/data-tour="next"/);
 assert.match(css,/tour-shade/);assert.match(css,/tour-focus-ring/);assert.match(css,/animation:tour-fill 1\.5s/);
 assert.match(tour,/previousTutorial\.apply/);
 assert.match(src('index.html'),/src\/ui\/game-tour-v18\.js/);
});
test('coin artwork and count fly as one, with a readable boost and no dim overlay',()=>{
 const script=src('src/ui/order-completion.js'),css=src('styles/order-completion.css');
 assert.match(script,/const value=group\.querySelector\('\.summary-art'\)/);
 assert.match(script,/add\(518\); \/\/ Hold/);
 assert.doesNotMatch(css,/summary-dim|background:#38221a5e/);
 assert.match(css,/summary-flight\.summary-art/);
 assert.match(css,/data-summary-phase="boost"/);
 assert.match(script,/setNumber\(t===1\?totals\.total/);
});
test('menu slot uses live cost with approved coin image, no price-economy change',()=>{
 const hub=src('src/ui/bakery-hub.js'),menu=src('src/ui/menu.js');
 assert.match(hub,/amountLabel\(slotCost\(\)\)/);
 assert.match(hub,/assets\/bakery-runtime\/price-coin\.webp/);
 assert.match(menu,/menu-slot-coin/);
});
test('worksheet calculator hides unrevealed pair; floater follows live geometry',()=>{
 const ui=src('src/ui/worksheet-experience.js'),engine=src('worksheet/src/worksheet-render-and-tutorial.js');
 assert.match(ui,/expressionOrder\?\.length===2/);
 assert.match(ui,/'\? × \?'/);
 assert.match(engine,/const rightTile=float\.querySelector\('\[data-part="ones"\]'\)/);
 assert.match(engine,/a\.left\+a\.width-rect\.left-rightTileEdge/);
 assert.match(engine,/Math\.max\(22,Math\.min\(rect\.height-h-5,y\)\)/);
});
