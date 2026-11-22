import test from 'node:test';
import assert from 'node:assert/strict';
import {progressionHarness} from './progression-harness.mjs';
import {readFileSync} from 'node:fs';
const code=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('new tutorial bakeries begin with no owned food or menu slots, without changing the legacy testing fixture',()=>{
 const h=progressionHarness(),fresh=h.json('fresh()');
 assert.equal(fresh.tutorialStarterVersion,2);
 assert.deepEqual(fresh.owned,[]);assert.deepEqual(fresh.activeMenu,[]);
 assert.equal(fresh.menuSlots,0);assert.equal(fresh.coins,250);
 assert.deepEqual(h.json('consolidateOwnedFoods(fresh()).activeMenu'),[]);
 assert.equal(h.json('consolidateOwnedFoods(fresh()).menuSlots'),0);
 assert.equal(h.run('g.owned.length'),1,'legacy economy scenario fixture still owns Pandesal');
});
test('new-player tutorial survives reload, whereas old saved bakeries keep their original slot minimum',()=>{
 const h=progressionHarness();
 const starter=h.json('fresh()');
 const resumed=progressionHarness(starter);
 assert.equal(resumed.run('g.menuSlots'),0);
 assert.equal(resumed.run('g.owned.length'),0);
 delete starter.tutorialStarterVersion;
 starter.menuSlots=0;
 const legacy=progressionHarness(starter);
 assert.equal(legacy.run('g.menuSlots'),1);
 assert.equal(legacy.run('g.owned.length'),0);
});
test('new starter slot is an actual permanent first Menu tile; only completed game transactions advance tasks',()=>{
 const scene=code('src/ui/bakery-scenes.js'),tour=code('src/ui/game-tour-v18.js');
 assert.match(scene,/tutorial-buy-slot/);
 assert.match(scene,/data-tour-target="empty-slot"/);
 assert.match(tour,/g\.packageBatchReceipt/);
 assert.match(tour,/g\.claimedOrders\[orderId\]/);
 assert.match(tour,/g\.activeMenu\.includes\(tour\.foodUid\)/);
 assert.match(tour,/!g\.packageBatchReceipt&&g\.owned\.some/);
});
test('checklist timing, finished-tutorial guard and Complete Order backdrop stay in place',()=>{
 const tour=code('src/ui/game-tour-v18.js'),css=code('styles/game-tour-v18.css'),order=code('styles/order-completion.css');
 // A finished or skipped tutorial is honoured on its own line (it was once swallowed by a comment).
 assert.match(tour,/\n\s*if\(!replay&&\['done','skipped'\]\.includes\(stored\)\)return false;/);
 // Checks are held visibly before focus moves; results settle before guidance.
 assert.match(tour,/CHECK_HOLD_MS=1000/);assert.match(tour,/RESULT_PAUSE_MS=500/);assert.match(tour,/READ_MS=1500/);
 assert.match(tour,/class="tour-tick"/);assert.doesNotMatch(tour,/\$\{i<done\?'✓':''\}/);
 // Popups with their own backdrop are never dimmed by the guide.
 assert.match(tour,/back:\{bright:'\.worksheet-summary-modal',shade:'own'\}/);
 assert.match(css,/\.is-own-backdrop \.tour-shade\{background:transparent\}/);
 assert.doesNotMatch(css,/tour-shade\{[^}]*transition:[^}]*background-color/);
 assert.doesNotMatch(order,/:has\(\.worksheet-summary-modal\)\{[^}]*background:transparent/);
});
