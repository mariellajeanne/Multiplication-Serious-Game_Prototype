import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {progressionHarness} from './progression-harness.mjs';

test('approved packages have exactly eight normalized three-rarity distributions',()=>{
 const h=progressionHarness();assert.equal(h.run('PACKAGE_SHOP.length'),8);assert.equal(h.run('COIN_TIERS.length'),8);
 const expected=[[0,1,2],[1,2,3],[2,3,4],[3,4,5],[4,5,6],[4,5,6],[5,6,7],[5,6,7]];
 for(let rank=0;rank<8;rank++){
  const p=h.json(`packageProbabilities(${rank})`);assert.ok(Math.abs(p.reduce((a,b)=>a+b)-1)<1e-12);
  assert.deepEqual(p.flatMap((v,i)=>v>0?[i]:[]),expected[rank]);
  assert.ok(h.run(`packagePrice(${rank})>=expectedPackageResale(${rank})*1.2`));
 }
 assert.deepEqual(h.json('PACKAGE_TYPES'),['Gift','Surprise','Mystery','Secret','Enchanted','Mythical','Cosmic','Divine']);
});

test('eighth package uses the same purchase, immediate discovery and replay protection',()=>{
 const h=progressionHarness();h.run(`g.coins=1e9;g.completed=260;g.packageTierUnlocks=PACKAGE_SHOP.map(t=>t.rank);openPackages('buy',7);setPackageQuantity(2);
  before=g.coins;cost=packagePrice(7)*2;id=packageQuote.id;ok=requestPackagePurchase(id);again=requestPackagePurchase(id);
  Math.random=()=>.999999999;token=packageSession.slots[7][0].id;opened=openPackageSlot(7,token);replayed=openPackageSlot(7,token)`);
 assert.equal(h.run('ok'),true);assert.equal(h.run('again'),false);assert.equal(h.run('before-g.coins'),h.run('cost'));
 assert.equal(h.run('opened'),true);assert.equal(h.run('replayed'),false);assert.equal(h.run('g.packages[7]'),1);
 assert.equal(h.run('g.owned.at(-1).id'),'ube-ensaymada');
 assert.equal(progressionHarness(h.json('g')).run('g.packages[7]'),1);
});

test('hub reads equipped recipes without empty boxes or demo state and exposes real actions',()=>{
 const h=progressionHarness();vm.runInContext(readFileSync(new URL('../src/ui/illustrated-art.js',import.meta.url),'utf8'),h.c);vm.runInContext(readFileSync(new URL('../src/ui/bakery-hub.js',import.meta.url),'utf8'),h.c);
 h.run(`discoverFood(F('monay'));html=renderHubHome()`);
 assert.equal((h.run('html').match(/class="[^"]*\bhub-food\b/g)||[]).length,1);
 assert.equal((h.run('html').match(/class="[^"]*\bhub-package\b/g)||[]).length,1);
 assert.match(h.run('html'),/openHubFood\(1\)/);assert.match(h.run('html'),/data-hub-action="packages"/);
 assert.match(h.run('html'),/assets\/bakery-ui\/illustrated\/room.png/);
 assert.match(h.run('html'),/assets\/bakery-ui\/illustrated\/food-01.png/);
 assert.doesNotMatch(h.run('html'),/Buy Slot|locked display|Bakery Power/);
});

test('transferred food sprites follow actual recipe identity and ticket quotes keep frozen payouts',()=>{
 const h=progressionHarness();vm.runInContext(readFileSync(new URL('../src/ui/illustrated-art.js',import.meta.url),'utf8'),h.c);vm.runInContext(readFileSync(new URL('../src/ui/bakery-hub.js',import.meta.url),'utf8'),h.c);
 assert.match(h.run("hubFoodArt('cheese-bread')"),/food-06.png.*alt="Cheese Bread"/);
 assert.match(h.run("hubFoodArt('kababayan')"),/food-03.png.*alt="Kababayan"/);
 assert.match(h.run("hubFoodArt('ube-ensaymada')"),/food-17.png/);
 h.run('refillBoard();t=g.board[0];quote=orderCoinQuote(t);startTicket(t.id);saved=g.run.budget;g.owned[0].mastery=30');
 assert.equal(h.run('quote'),h.run('saved'));assert.equal(h.run('hubTicketReward(t)'),h.run('saved'));
 h.run('Math.random=()=>{throw Error("UI must not draw rewards")};html=renderHubHome()');
 assert.match(h.run('html'),/startTicket\(/);assert.doesNotMatch(h.run('html'),/type="number"|id="answer"|12750/);
});

test('refined tickets preserve every existing type, saved progress and reward state without consuming randomness',()=>{
 const h=progressionHarness();vm.runInContext(readFileSync(new URL('../src/ui/illustrated-art.js',import.meta.url),'utf8'),h.c);vm.runInContext(readFileSync(new URL('../src/ui/bakery-hub.js',import.meta.url),'utf8'),h.c);
 h.run(`g.board=Array.from({length:8},(_,rank)=>({id:9900+rank,coinTier:rank,rarity:rank,orderLabel:COIN_ORDER_LABELS[rank][1],orderIcon:COIN_ORDER_ICONS[rank],foodId:'pandesal',a:79,b:18,base:ticketBase(rank)}));startTicket(9903);g.run.phase='claim';before=JSON.stringify(g);Math.random=()=>{throw Error('Rendering must not change odds')};html=renderHubTickets()`);
 assert.equal(h.run('JSON.stringify(g)'),h.run('before'));
 for(const name of h.json('COIN_ORDER_LABELS.map(names=>names[1])'))assert.ok(h.run('html').includes(name));
 assert.equal((h.run('html').match(/role="progressbar"/g)||[]).length,8);
 assert.doesNotMatch(h.run('html'),/class="(?:order-name|order-type-icon|order-tier)"/);
 assert.equal((h.run('html').match(/class="order-math"/g)||[]).length,8);
 assert.match(h.run('html'),/Collect<\/span><strong>100%/);
 assert.doesNotMatch(h.run('html'),/class="ticket-(?:play|reward)"|\d+ coins<|<small>/);
});
