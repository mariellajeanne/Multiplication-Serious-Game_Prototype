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
