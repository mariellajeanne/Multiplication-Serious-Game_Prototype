import test from 'node:test';
import assert from 'node:assert/strict';
import {progressionHarness} from './progression-harness.mjs';

test('collection shows earned tiers descending and the real next practice gate',()=>{
 const h=progressionHarness();assert.deepEqual(h.json('availablePackageTiers().map(t=>t.rank)'),[0]);
 assert.equal(h.run('nextPackageToUnlock().orders'),4);
 h.run('g.completed=24');assert.deepEqual(h.json('availablePackageTiers().map(t=>t.rank)'),[3,2,1,0]);
 assert.equal(h.run('nextPackageToUnlock().orders'),45);
 h.run('g.packageTierUnlocks=[8]');assert.deepEqual(h.json('availablePackageTiers().map(t=>t.rank)'),[8,3,2,1,0]);
 h.run('g.completed=260');assert.equal(h.run('nextPackageToUnlock()'),null);
});
test('x1/x5/x10 each charge the real total once and persist exactly that many discoveries',()=>{
 for(const count of [1,5,10]){
  const h=progressionHarness();h.run(`g.coins=1e9;price=packagePrice(0);before=g.coins;quote=quotePackageBatch(0,${count});Math.random=()=>0;
   receipt=commitPackageBatch(quote.id);again=commitPackageBatch(quote.id)`);
  assert.equal(h.run('before-g.coins'),h.run(`price*${count}`));assert.equal(h.run('receipt.rewards.length'),count);
  assert.equal(h.run('g.recipeCeilings.pandesal'),count);assert.equal(h.run('g.owned.length'),1);
  assert.equal(h.run('again'),false);assert.equal(h.run('g.packages[0]'),0);
  const reloaded=progressionHarness(JSON.parse(h.store.get('panaderyaQuestV2')));
  assert.equal(reloaded.run('g.packageBatchReceipt.rewards.length'),count);
  assert.equal(reloaded.run('g.recipeCeilings.pandesal'),count);
  reloaded.run('before=JSON.stringify([g.coins,g.owned,g.recipeCeilings]);id=g.packageBatchReceipt.id;ok=collectPackageBatch(id);again=collectPackageBatch(id)');
  assert.equal(reloaded.run('ok'),true);assert.equal(reloaded.run('again'),false);
  assert.equal(reloaded.run('JSON.stringify([g.coins,g.owned,g.recipeCeilings])'),reloaded.run('before'));
  assert.equal(progressionHarness(JSON.parse(reloaded.store.get('panaderyaQuestV2'))).run('g.packageBatchReceipt'),null);
 }
});
test('new discovery flags are frozen per result; duplicates retain existing Mastery behavior',()=>{
 const h=progressionHarness();h.run(`g.completed=260;g.coins=1e12;quote=quotePackageBatch(8,5);Math.random=()=>.999999999;commitPackageBatch(quote.id)`);
 assert.deepEqual(h.json('g.packageBatchReceipt.rewards.map(r=>r.isNew)'),[true,false,false,false,false]);
 assert.equal(h.run('g.recipeCeilings["ube-ensaymada"]'),4);
 assert.equal(h.run('g.owned.filter(o=>o.id==="ube-ensaymada").length'),1);
 assert.equal(h.run('g.owned.find(o=>o.id==="ube-ensaymada").mastery'),0);
});
test('insufficient coins, locks, capacity, active worksheets and stale offers cannot spend or roll',()=>{
 for(const mutate of ['g.coins=0','g.completed=0;quote=quotePackageBatch(1,1)','g.packages[0]=50','g.run={paused:false}','g.economyPeakBase=100000','g.packageRevision++','quote.total=0']){
  const h=progressionHarness();h.run(`g.coins=1e9;quote=quotePackageBatch(0,1);${mutate};before=JSON.stringify(g);rolls=0;Math.random=()=>{rolls++;return 0};ok=commitPackageBatch(quote.id)`);
  assert.equal(h.run('ok'),false,mutate);assert.equal(h.run('JSON.stringify(g)'),h.run('before'));assert.equal(h.run('rolls'),0);
 }
});
test('old stored packages and rarity guarantees are consumed without charging or using a new gate',()=>{
 const h=progressionHarness();h.run(`g.packages[7]=5;g.legacyPackageFoods[7]=[7,7,7,7,7];coins=g.coins;quote=quotePackageBatch(7,5,'stock');Math.random=()=>0;commitPackageBatch(quote.id)`);
 assert.equal(h.run('g.coins'),h.run('coins'));assert.equal(h.run('g.packages[7]'),0);
 assert.equal(h.run('g.legacyPackageFoods[7].length'),0);
 assert.equal(h.run('g.packageBatchReceipt.rewards.every(r=>F(r.foodId).rarity===7)'),true);
});
test('save failure rolls back the entire purchase/opening and acknowledgement remains retryable',()=>{
 for(const source of ['buy','stock']){
  const h=progressionHarness();h.run(`g.coins=1e9;g.packages[0]=5;g.legacyPackageFoods[0]=[7];quote=quotePackageBatch(0,5,'${source}');before=JSON.stringify(g);
   localStorage.setItem=()=>{throw Error('quota')};ok=commitPackageBatch(quote.id)`);
  assert.equal(h.run('ok'),false);assert.equal(h.run('JSON.stringify(g)'),h.run('before'));
 }
 // Saving advances the monotonic order clock even when storage rejects a write.
 const h=progressionHarness();h.run(`quote=quotePackageBatch(0,1);commitPackageBatch(quote.id);before=JSON.stringify({...g,orderClock:0});localStorage.setItem=()=>{throw Error('quota')};ok=collectPackageBatch(g.packageBatchReceipt.id)`);
 assert.equal(h.run('ok'),false);assert.equal(h.run('JSON.stringify({...g,orderClock:0})'),h.run('before'));
});
test('pending receipts prevent a second purchase; stale tabs cannot resurrect collected batches',()=>{
 const h=progressionHarness();h.run(`g.coins=1e9;quote=quotePackageBatch(0,5);commitPackageBatch(quote.id);pending=JSON.stringify(g);
  blocked=quotePackageBatch(0,1);ok=commitPackageBatch(blocked.id);collectPackageBatch(g.packageBatchReceipt.id);collected=localStorage.getItem('panaderyaQuestV2');
  g=JSON.parse(pending);saved=save();replayed=collectPackageBatch(g.packageBatchReceipt.id)`);
 assert.equal(h.run('ok'),false);assert.equal(h.run('saved'),false);assert.equal(h.run('replayed'),false);
 assert.equal(h.store.get('panaderyaQuestV2'),h.run('collected'));
});
