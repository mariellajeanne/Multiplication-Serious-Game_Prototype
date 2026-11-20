import test from 'node:test';
import assert from 'node:assert/strict';
import {progressionHarness} from './progression-harness.mjs';

test('old stock including ninth tier migrates once, preserving guarantees, rolled receipts and investments',()=>{
 const old=progressionHarness().json('g');delete old.approvedPackagesVersion;
 old.packages=[2,0,0,0,0,0,0,3,4];old.legacyPackageFoods=Array.from({length:9},()=>[]);
 old.legacyPackageFoods[0]=[7];old.packageRevision=20;
 old.packageBatchReceipt={id:'old-paid',rank:8,count:1,total:12345,rewards:[{foodId:'ube-ensaymada',uid:3,isNew:true,masteryUnlocked:false}]};
 old.packageTierUnlocks=[0,8];old.coins=3456;
 const h=progressionHarness(old);
 assert.deepEqual(h.json('g.packages'),[2,0,0,0,0,0,0,7]);
 assert.deepEqual(h.json('g.legacyPackageFoods[0]'),[7,{packageRank:0}]);
 assert.deepEqual(h.json('g.legacyPackageFoods[7]'),[...Array.from({length:3},()=>({packageRank:7})),...Array.from({length:4},()=>({packageRank:8}))]);
 assert.equal(h.run('g.packageBatchReceipt.rank'),7);
 assert.deepEqual(h.json('g.packageBatchReceipt.rewards'),old.packageBatchReceipt.rewards);
 assert.equal(h.run('g.coins'),3456);assert.deepEqual(h.json('g.owned'),old.owned);
 h.run('before=JSON.stringify(g);migrateFrame11(g)');assert.equal(h.run('JSON.stringify(g)'),h.run('before'));
 h.run('save()');assert.equal(progressionHarness(h.json('g')).run('g.packages[7]'),7);
});

test('stored historical stock uses its promised distribution while new purchases use approved rarities',()=>{
 const old=progressionHarness().json('g');delete old.approvedPackagesVersion;
 old.packages=[0,0,0,0,0,0,0,1,1];old.legacyPackageFoods=Array.from({length:9},()=>[]);
 const h=progressionHarness(old);
 h.run('save();Math.random=()=>0;quote=quotePackageBatch(7,1,"stock");commitPackageBatch(quote.id)');
 assert.equal(h.run('F(g.packageBatchReceipt.rewards[0].foodId).rarity'),0);
 h.run('collectPackageBatch(g.packageBatchReceipt.id);quote=quotePackageBatch(7,1,"stock");Math.random=()=>.999999999;commitPackageBatch(quote.id)');
 assert.equal(h.run('F(g.packageBatchReceipt.rewards[0].foodId).rarity'),7);
 h.run('collectPackageBatch(g.packageBatchReceipt.id);g.completed=180;g.coins=1e9;Math.random=()=>0;quote=quotePackageBatch(7,1);commitPackageBatch(quote.id)');
 assert.equal(h.run('F(g.packageBatchReceipt.rewards[0].foodId).rarity'),5);
 assert.equal(h.run('g.packages.length'),8);
});

test('deterministic draw boundaries stay within the displayed three rarities for every package',()=>{
 const h=progressionHarness();
 for(let rank=0;rank<8;rank++){
  const allowed=h.json('PACKAGE_FOOD_RARITIES['+rank+']');
  for(let i=0;i<=1000;i++){
   const rarity=h.run('drawRank(packageProbabilities('+rank+'),'+i/1001+')');
   assert.ok(allowed.includes(rarity),rank+':'+i);
  }
 }
});
