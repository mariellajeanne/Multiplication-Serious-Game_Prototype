import test from 'node:test';
import assert from 'node:assert/strict';
import {progressionHarness} from './progression-harness.mjs';

test('old order gates migrate once, preserving assets and grandfathered tiers without retroactive earnings',()=>{
 const original=progressionHarness().json('g');
 delete original.packageDiscoveryVersion;
 original.completed=75;original.packageTierUnlocks=[7];original.coins=987654321;
 original.coinsEarnedSinceLastDiscovery=999999999;original.mathPractice={lifetimeCoins:[123]};
 const h=progressionHarness(original);
 assert.deepEqual(h.json('g.packageTierUnlocks'),[0,1,2,3,4,5,7]);
 for(const key of ['coins','owned','recipeCeilings','packages','completed','mathPractice'])assert.deepEqual(h.json('g.'+key),original[key]);
 assert.equal(h.run('g.coinsEarnedSinceLastDiscovery'),0);
 h.run('creditGameplayCoins(g,1234);save()');
 const reload=progressionHarness(h.json('g'));
 assert.equal(reload.run('g.coinsEarnedSinceLastDiscovery'),1234);
 reload.run('g.completed=1e6;migratePackageDiscovery(g)');
 assert.equal(reload.run('packageUnlocked(6)'),false);
});

test('earnings accumulate independently of spending, opening, resale, refunds and wallet adjustments',()=>{
 const h=progressionHarness();assert.equal(h.run('g.coinsEarnedSinceLastDiscovery'),0);
 h.run('creditGameplayCoins(g,1200);g.coins-=500;g.coins+=100000;save()');
 assert.equal(h.run('g.coinsEarnedSinceLastDiscovery'),1200);
 h.run('quote=quotePackageBatch(0,5);commitPackageBatch(quote.id);collectPackageBatch(g.packageBatchReceipt.id)');
 assert.equal(h.run('g.coinsEarnedSinceLastDiscovery'),1200);
 h.run('sellFood(g.owned[0].uid)');assert.equal(h.run('g.coinsEarnedSinceLastDiscovery'),1200);
 assert.equal(progressionHarness(h.json('g')).run('g.coinsEarnedSinceLastDiscovery'),1200);
});

test('a threshold grants exactly one tier, discards excess, preserves wallet/lifetime stats and starts the next counter at zero',()=>{
 const h=progressionHarness();h.run('g.mathPractice={lifetimeCoins:[7,8]};g.coinsEarnedSinceLastDiscovery=4999;before=g.coins;creditGameplayCoins(g,1)');
 assert.equal(h.run('g.coins'),251);assert.equal(h.run('g.coinsEarnedSinceLastDiscovery'),0);
 assert.deepEqual(h.json('g.packageTierUnlocks'),[0,1]);assert.deepEqual(h.json('g.mathPractice.lifetimeCoins'),[7,8]);
 h.run('creditGameplayCoins(g,1e12)');assert.deepEqual(h.json('g.packageTierUnlocks'),[0,1,2]);
 assert.equal(h.run('g.coinsEarnedSinceLastDiscovery'),0);
 h.run('creditGameplayCoins(g,123)');assert.equal(h.run('g.coinsEarnedSinceLastDiscovery'),123);
 h.run('g.packageTierUnlocks=PACKAGE_SHOP.map(t=>t.rank);g.coinsEarnedSinceLastDiscovery=0;creditGameplayCoins(g,123)');
 assert.equal(h.run('nextPackageToUnlock()'),null);assert.equal(h.run('g.coinsEarnedSinceLastDiscovery'),0);
});

test('an order reward and its discovery commit together once; duplicate/stale claims and failed saves cannot double earn',()=>{
 const h=progressionHarness();h.run('refillBoard();startTicket(g.board[0].id);g.run.phase="claim";g.run.pool=5001;receipt=g.run;before=g.coins;ok=creditCompletedOrder(receipt);again=creditCompletedOrder(receipt)');
 assert.equal(h.run('ok'),true);assert.equal(h.run('again'),false);
 assert.equal(h.run('g.coins-before'),5001);assert.deepEqual(h.json('g.packageTierUnlocks'),[0,1]);
 assert.equal(h.run('g.coinsEarnedSinceLastDiscovery'),0);
 const reload=progressionHarness(h.json('g'));reload.c.receipt=h.json('receipt');
 assert.equal(reload.run('creditCompletedOrder(receipt)'),false);
 const fail=progressionHarness();fail.run('refillBoard();startTicket(g.board[0].id);g.run.phase="claim";g.run.pool=5001;before=JSON.stringify(g);localStorage.setItem=()=>{throw Error("full")};ok=creditCompletedOrder()');
 assert.equal(fail.run('ok'),false);assert.equal(fail.run('JSON.stringify(g)'),fail.run('before'));
});

test('staff rewards use the same earnings path, unique elapsed ticks, and complete rollback on storage failure',()=>{
 const h=progressionHarness();h.run('Date.now=()=>10000;g.staff={until:20000,lastTick:9000,rate:100,fraction:0};tickStaff();tickStaff()');
 assert.equal(h.run('g.coinsEarnedSinceLastDiscovery'),100);assert.equal(h.run('g.coins'),350);
 h.run('Date.now=()=>11000;before=JSON.stringify([g.coins,g.staff,g.coinsEarnedSinceLastDiscovery,g.packageTierUnlocks]);localStorage.setItem=()=>{throw Error("full")};tickStaff()');
 assert.equal(h.run('JSON.stringify([g.coins,g.staff,g.coinsEarnedSinceLastDiscovery,g.packageTierUnlocks])'),h.run('before'));
});

test('discovery numeric handling rejects invalid earnings, bounds corrupt progress, and supports large legitimate rewards',()=>{
 const h=progressionHarness();h.run('before=JSON.stringify(g);[NaN,Infinity,-1,0,"5000"].forEach(n=>creditGameplayCoins(g,n))');
 assert.equal(h.run('JSON.stringify(g)'),h.run('before'));
 h.run('g.coinsEarnedSinceLastDiscovery=-10;migratePackageDiscovery(g)');assert.equal(h.run('g.coinsEarnedSinceLastDiscovery'),0);
 h.run('creditGameplayCoins(g,Number.MAX_VALUE)');assert.deepEqual(h.json('g.packageTierUnlocks'),[0,1]);
 assert.equal(h.run('g.coinsEarnedSinceLastDiscovery'),0);
});
