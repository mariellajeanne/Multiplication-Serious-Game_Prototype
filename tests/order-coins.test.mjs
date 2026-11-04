import test from 'node:test';
import assert from 'node:assert/strict';
import {progressionHarness} from './progression-harness.mjs';

test('eight coin tiers grow exponentially; saved tiers and labels do not consume RNG on render, resume or migration',()=>{
 const h=progressionHarness();
 assert.deepEqual(h.json('COIN_TIERS'),['Coin Stack','Coin Jar','Coin Bag','Coin Bucket','Coin Cart','Treasure Chest','Golden Vault','Divine Treasury']);
 assert.deepEqual(h.json('COIN_TIERS.map((_,i)=>ticketBase(i))'),[130,176,237,320,432,583,787,1062]);
 h.run(`g.mastery=80;refillBoard();saved=JSON.stringify(g.board);save();
  Math.random=()=>{throw Error('Must not reroll saved rewards')};renderTickets();migrateFrame11(g)`);
 assert.equal(h.run('JSON.stringify(g.board)'),h.run('saved'));
 const reload=progressionHarness(h.json('g'));
 assert.equal(reload.run('JSON.stringify(g.board)'),h.run('saved'));
 reload.run(`startTicket(g.board[0].id);first=g.run;abandonTicket();Math.random=()=>{throw Error('Must not reroll on resume')};startTicket(first.ticket.id)`);
 assert.equal(reload.run('g.run===first'),true);
});

test('each tier pays base times the boost snapshot with rounding, regardless of later upgrades or mistakes',()=>{
 for(let rank=0;rank<8;rank++){
  const h=progressionHarness();h.run(`g.coins=1e9;g.bakeryLevel=21;g.mode='streak';
   g.board=[{id:100,rarity:${rank},coinTier:${rank},a:79,b:18,base:ticketBase(${rank})}];startTicket(100);
   base=g.run.baseCoins;boost=g.run.bakersBoost;oldPackages=JSON.stringify(g.packages);oldFoods=JSON.stringify(g.owned);
   abandonTicket();upgradeDecor();startTicket(100);g.run.mistakes=50;g.run.bestStreak=99;finishSum();
   payout=g.run.pool;before=g.coins;ok=prizeItems();again=prizeItems()`);
  assert.equal(h.run('payout'),Math.round(h.run('base*boost')));
  assert.equal(h.run('g.coins-before'),h.run('payout'));
  assert.equal(h.run('ok'),true);assert.equal(h.run('again'),false);
  assert.equal(h.run('JSON.stringify(g.packages)'),h.run('oldPackages'));
  assert.equal(h.run('JSON.stringify(g.owned)'),h.run('oldFoods'));
  assert.match(h.run('popup.html'),/Base coins/);assert.match(h.run('popup.html'),/Baker's Boost/);
  assert.match(h.run('popup.html'),/Total coins earned/);
 }
});

test('legacy pending packages migrate into counter stock once, preserving guaranteed food ranks and fixed budgets',()=>{
 const saved=progressionHarness().json('g');delete saved.coinRewardsVersion;delete saved.frame11Version;
 saved.packages[7]=2;
 saved.board=[{id:71,rarity:7,a:79,b:18,base:981,packages:3}];
 saved.run={ticket:saved.board[0],phase:'claim',pool:1234,budget:1500,chests:[{rarity:7}],luck:15,correct:1,mode:'normal'};
 saved.orderRuns={71:saved.run};
 const h=progressionHarness(saved);
 assert.equal(h.run('g.packages[7]'),3);assert.deepEqual(h.json('g.legacyPackageFoods[7]'),[7]);
 assert.equal(h.run('g.run.pool'),1234);assert.equal(h.run('g.run.budget'),1500);
 assert.equal(h.run('g.run.chests'),undefined);assert.equal(h.run('g.run.ticket.packages'),undefined);
 h.run(`before=JSON.stringify(g);Math.random=()=>{throw Error('Migration must not roll foods')};migrateFrame11(g)`);
 assert.equal(h.run('JSON.stringify(g)'),h.run('before'));
 const reload=progressionHarness(h.json('g'));assert.equal(reload.run('g.packages[7]'),3);
 reload.run(`prizeItems();Math.random=()=>0;unboxPackages(7,1,true)`);
 assert.equal(reload.run('g.packages[7]'),2);assert.equal(reload.run('g.owned.at(-1).id'),'ube-ensaymada');
 assert.deepEqual(reload.json('g.legacyPackageFoods[7]'),[]);
});

test('a stale tab cannot claim again or overwrite the persisted receipt with a staff/autosave tick',()=>{
 const h=progressionHarness();h.run(`refillBoard();startTicket(g.board[0].id);finishSum();stale=JSON.stringify(g);prizeItems();receipt=JSON.stringify(g.claimedOrders);wallet=g.coins;g=JSON.parse(stale);denied=prizeItems();saved=save()`);
 assert.equal(h.run('denied'),false);assert.equal(h.run('saved'),false);
 const persisted=JSON.parse(h.store.get('panaderyaQuestV2'));
 assert.equal(JSON.stringify(persisted.claimedOrders),h.run('receipt'));assert.equal(persisted.coins,h.run('wallet'));
});

test('Permanent Luck uses the existing eight-rank distribution for coins and never alters package food odds',()=>{
 const h=progressionHarness();h.run(`g.mastery=0;g.permanentLuck=20;before=JSON.stringify(PACKAGE_TYPES.map((_,i)=>packageProbabilities(i)));odds=ticketProbabilities(ticketLuckMastery());openProbabilities();html=popup.html`);
 assert.deepEqual(h.json('odds'),h.json('ticketProbabilities(80)'));
 assert.match(h.run('html'),/Coin Reward Tier Odds|Divine Treasury/);
 assert.equal(h.run('JSON.stringify(PACKAGE_TYPES.map((_,i)=>packageProbabilities(i)))'),h.run('before'));
});

test('refresh replaces untouched tickets while retaining every started tier, label, worksheet and reward snapshot',()=>{
 const h=progressionHarness();h.run(`refillBoard();startTicket(g.board[0].id);startTicket(g.board[1].id);runs=JSON.stringify(g.orderRuns);refreshOrders();save()`);
 assert.equal(h.run('JSON.stringify(g.orderRuns)'),h.run('runs'));
 const reload=progressionHarness(h.json('g'));
 assert.equal(reload.run('JSON.stringify(g.orderRuns)'),h.run('runs'));
});

test('claimed legacy remnants cannot restore orders or migrate another package',()=>{
 const saved=progressionHarness().json('g');
 saved.run={ticket:{id:700,rarity:7,base:16640},phase:'claim',chests:[{rarity:7}],pool:999};
 saved.board=[saved.run.ticket];saved.orderRuns={700:saved.run};saved.claimedOrders={700:'done'};
 const h=progressionHarness(saved);
 assert.equal(h.run('g.run'),null);assert.deepEqual(h.json('g.orderRuns'),{});
 assert.deepEqual(h.json('g.board'),[]);assert.equal(h.run('g.packages[7]'),0);
});

test('failed legacy package opening restores its guaranteed rarity queue as well as foods and stock',()=>{
 const h=progressionHarness();h.run(`g.packages[7]=1;g.legacyPackageFoods[7]=[7];
  before=JSON.stringify([g.coins,g.packages,g.legacyPackageFoods,g.owned,g.recipeCeilings]);
  localStorage.setItem=()=>{throw Error('quota')};ok=unboxPackages(7,1,true)`);
 assert.equal(h.run('ok'),false);
 assert.equal(h.run('JSON.stringify([g.coins,g.packages,g.legacyPackageFoods,g.owned,g.recipeCeilings])'),h.run('before'));
});
