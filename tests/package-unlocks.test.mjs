import test from 'node:test';
import assert from 'node:assert/strict';
import {progressionHarness} from './progression-harness.mjs';

test('celebrations use the existing practice gates and skip the starter package',()=>{
 const h=progressionHarness();assert.deepEqual(h.json('pendingPackageCelebrations(g)'),[]);
 for(const rank of h.json('PACKAGE_SHOP.slice(1).map(t=>t.rank)')){
  h.run(`g.completed=PACKAGE_SHOP[${rank}].orders-1`);
  assert.equal(h.run(`pendingPackageCelebrations(g).includes(${rank})`),false);
  h.run('g.completed++');assert.equal(h.run(`pendingPackageCelebrations(g).includes(${rank})`),true);
  assert.equal(h.run(`packageUnlocked(${rank})`),true);
 }
});
test('order collection earns the milestone durably without replacing its results',()=>{
 const h=progressionHarness();h.run(`g.completed=3;refillBoard();startTicket(g.board[0].id);g.run.phase='claim';g.run.pool=g.run.budget;
  receipt=g.run.ticket.id;ok=prizeItems();replayed=prizeItems()`);
 assert.equal(h.run('ok'),true);assert.equal(h.run('replayed'),false);
 assert.match(h.run('popup.title'),/Order complete/);
 assert.equal(h.run('g.completed'),4);
 assert.deepEqual(progressionHarness(h.json('g')).json('pendingPackageCelebrations(g)'),[1]);
});
test('multiple milestones queue in tier order and acknowledgements survive reload',()=>{
 const h=progressionHarness();h.run('g.completed=24;save()');
 assert.deepEqual(h.json('pendingPackageCelebrations(g)'),[1,2,3]);
 for(const rank of [1,2,3]){
  assert.equal(h.run(`acknowledgePackageUnlock(${rank})`),true);
  assert.equal(h.run(`acknowledgePackageUnlock(${rank})`),true);
  assert.deepEqual(progressionHarness(h.json('g')).json('pendingPackageCelebrations(g)'),[1,2,3].filter(r=>r>rank));
 }
 assert.deepEqual(h.json('g.packageCelebrations.acknowledged'),[0,1,2,3]);
 assert.deepEqual(h.json('PACKAGE_SHOP.filter(t=>packageUnlocked(t.rank)).map(t=>t.rank)'),[0,1,2,3]);
});
test('established saves baseline current and grandfathered tiers without changing assets',()=>{
 const h=progressionHarness();h.run('g.completed=12;g.packageTierUnlocks=[5];delete g.packageCelebrations');
 const before=h.json('[g.coins,g.owned,g.packages,g.completed,g.packageTierUnlocks]');
 const old=progressionHarness(h.json('g'));
 assert.deepEqual(old.json('pendingPackageCelebrations(g)'),[]);
 assert.deepEqual(old.json('[g.coins,g.owned,g.packages,g.completed,g.packageTierUnlocks]'),before);
 old.run('g.completed=24');assert.deepEqual(old.json('pendingPackageCelebrations(g)'),[3]);
 old.run('migratePackageCelebrations(g)');assert.deepEqual(old.json('pendingPackageCelebrations(g)'),[3]);
});
test('locked and malformed acknowledgements are rejected and failed saves retain the queue',()=>{
 const h=progressionHarness();
 for(const value of ['1','-1','9','1.5','NaN',"'1'"])assert.equal(h.run(`acknowledgePackageUnlock(${value})`),false);
 h.run(`g.completed=4;localStorage.setItem=()=>{throw new Error('full')}`);
 assert.equal(h.run('acknowledgePackageUnlock(1)'),false);
 assert.deepEqual(h.json('pendingPackageCelebrations(g)'),[1]);
 assert.deepEqual(h.json('g.packageCelebrations.acknowledged'),[0]);
});
test('a stale tab cannot erase another tab acknowledgement or newer economy receipts',()=>{
 const h=progressionHarness();h.run('g.completed=12;save();before=JSON.stringify(g);acknowledgePackageUnlock(1);g=JSON.parse(before);save()');
 assert.deepEqual(h.json('pendingPackageCelebrations(g)'),[2]);
 h.run(`latest=JSON.parse(localStorage.getItem('panaderyaQuestV2'));latest.claimedOrders.extra=true;localStorage.setItem('panaderyaQuestV2',JSON.stringify(latest))`);
 assert.equal(h.run('acknowledgePackageUnlock(2)'),false);
 assert.deepEqual(h.json('pendingPackageCelebrations(g)'),[2]);
});
