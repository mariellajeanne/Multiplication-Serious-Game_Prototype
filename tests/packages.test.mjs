import test from 'node:test';
import assert from 'node:assert/strict';
import {progressionHarness} from './progression-harness.mjs';

test('all eight types select both panels; Bakery Power gates buying, without hiding types or old stock',()=>{
 const h=progressionHarness();
 for(let rank=0;rank<8;rank++){
  h.run(`g.packages[${rank}]=2;openPackages('buy',${rank});html=popup.html`);
  assert.equal(h.run('packageType'),rank);
  assert.match(h.run('html'),new RegExp(`id="packageSelectedHeading">${rank+1}★ ${h.run(`PACKAGE_TYPES[${rank}].toUpperCase()`)} PACKAGE`));
  assert.match(h.run('html'),new RegExp(`id="packageOpeningHeading">OPEN ${rank+1}★ PACKAGES`));
  assert.equal((h.run('html').match(/data-package-type=/g)||[]).length,8);
  assert.equal(h.run('packageQuantityMaximum()>0'),rank===0);
  h.run(`g.bakeryLevel=PACKAGE_SHOP[${rank}].unlock-1`);
  if(rank)assert.equal(h.run('packageUnlocked(packageType)'),false);
  h.run(`g.bakeryLevel=PACKAGE_SHOP[${rank}].unlock;g.coins=1e20;openPackages('buy',${rank})`);
  assert.equal(h.run('packageQuantityMaximum()'),48);
  h.run('g.bakeryLevel=1;g.coins=250');
 }
});

test('odds and prices retain production probabilities and are independent of Coin Luck',()=>{
 const h=progressionHarness();
 h.run(`before=JSON.stringify(PACKAGE_TYPES.map((_,i)=>packageProbabilities(i)));price=packagePrice(0);
  g.permanentLuck=500;for(let i=0;i<8;i++){odds=packageProbabilities(i);markup=foodOddsMarkup(i);
   if(!odds.every(p=>markup.includes('width:'+p*100+'%')))throw Error('Odds bars differ from production')}`);
 assert.equal(h.run('JSON.stringify(PACKAGE_TYPES.map((_,i)=>packageProbabilities(i)))'),h.run('before'));
});

test('quantities obey affordability, the selected-type capacity and locks; old over-cap stock is never discarded',()=>{
 const h=progressionHarness();h.run(`g.coins=1e8;g.packages[0]=47;openPackages('buy',0);setPackageQuantity(999)`);
 assert.equal(h.run('packageQuantity'),3);
 h.run('setPackageQuantity(-4)');assert.equal(h.run('packageQuantity'),1);
 h.run('g.coins=packagePrice(0)*2;setPackageQuantity(999)');assert.equal(h.run('packageQuantity'),2);
 h.run('g.coins=0;setPackageQuantity(8)');assert.equal(h.run('packageQuantity'),0);
 h.run(`g.packages[0]=73;g.coins=1e8;save();endPackageSession();openPackages('buy',0)`);
 assert.equal(h.run('g.packages[0]'),73);assert.equal(h.run('packageQuantity'),0);
 const reload=progressionHarness(h.json('g'));assert.equal(reload.run('g.packages[0]'),73);
 reload.run(`Math.random=()=>0;openPackages('buy',0);unboxAllPackages()`);
 assert.equal(reload.run('g.packages[0]'),0);assert.equal(reload.run('g.recipeCeilings.pandesal'),73);
});

test('purchase quotes spend exactly once and reject stale quantities, prices, stock and old selection',()=>{
 const h=progressionHarness();h.run(`g.coins=1e9;openPackages('buy',0);setPackageQuantity(5);
  quote=packageQuote.id;price=packagePrice(0);before=g.coins;ok=requestPackagePurchase(quote);again=requestPackagePurchase(quote)`);
 assert.equal(h.run('ok'),true);assert.equal(h.run('again'),false);
 assert.equal(h.run('g.packages[0]'),5);assert.equal(h.run('before-g.coins'),h.run('price*5'));
 for(const mutation of ['g.bakeryLevel++','g.packages[0]++','packageQuantity++',"openPackages('buy',1)"]){
  const h=progressionHarness();h.run(`g.coins=1e9;openPackages('buy',0);setPackageQuantity(2);id=packageQuote.id;${mutation};before=JSON.stringify([g.coins,g.packages]);ok=requestPackagePurchase(id)`);
  assert.equal(h.run('ok'),false,mutation);assert.equal(h.run('JSON.stringify([g.coins,g.packages])'),h.run('before'));
 }
});

test('each icon opens once, credits foods/Mastery immediately and retains one result per opening through type switches',()=>{
 const h=progressionHarness();h.run(`Math.random=()=>0;g.packages[0]=3;g.packages[1]=2;openPackages('buy',0);
  id=packageSession.slots[0][0].id;ok=openPackageSlot(0,id);again=openPackageSlot(0,id);view=packageSession.viewId;
  openPackages('buy',1);wrongType=openPackageSlot(0,packageSession.slots[0][1].id);openPackages('buy',0);unboxAllPackages()`);
 assert.equal(h.run('ok'),true);assert.equal(h.run('again'),false);assert.equal(h.run('wrongType'),false);
 assert.equal(h.run('g.packages[0]'),0);assert.equal(h.run('g.packages[1]'),2);
 assert.equal(h.run('g.recipeCeilings.pandesal'),3);assert.equal(h.run('g.owned.length'),1);
 assert.equal(h.run('packageSession.slots[0].filter(s=>s.reward).length'),3);
 h.run('endPackageSession();openPackages()');assert.equal(h.run('packageSession.slots[0].length'),0);
 const reload=progressionHarness(h.json('g'));assert.equal(reload.run('g.recipeCeilings.pandesal'),3);
 assert.equal(reload.run('g.packages[0]'),0);assert.equal(reload.run('packageSession'),null);
});

test('Open All consumes only the selected type and cannot replay a stale view after switching or purchase',()=>{
 const h=progressionHarness();h.run(`g.packages=[2,3,4,0,0,0,0,0];openPackages('buy',1);view=packageSession.viewId;
  Math.random=()=>0;ok=unboxAllPackages(view);again=unboxAllPackages(view)`);
 assert.equal(h.run('ok'),true);assert.equal(h.run('again'),false);
 assert.deepEqual(h.json('g.packages'),[2,0,4,0,0,0,0,0]);
 h.run(`view=packageSession.viewId;openPackages('buy',0);denied=unboxAllPackages(view)`);
 assert.equal(h.run('denied'),false);assert.equal(h.run('g.packages[0]'),2);
});

test('new foods are already in the collection even when presentation is interrupted immediately after opening',()=>{
 const h=progressionHarness();h.run(`g.packages[7]=1;Math.random=()=>.999999;openPackages('buy',7);
  openPackageSlot(7,packageSession.slots[7][0].id);endPackageSession()`);
 assert.equal(h.run('g.packages[7]'),0);assert.equal(h.run("g.owned.some(o=>o.id==='ube-ensaymada')"),true);
 const reload=progressionHarness(JSON.parse(h.store.get('panaderyaQuestV2')));
 assert.equal(reload.run("g.owned.some(o=>o.id==='ube-ensaymada')"),true);
});

test('failed purchase/open saves roll back coins, stock, foods, guarantee queues and presentation',()=>{
 for(const action of ['requestPackagePurchase()','unboxAllPackages()']){
  const h=progressionHarness();h.run(`g.coins=1e9;g.packages[0]=3;g.legacyPackageFoods[0]=[7];openPackages('buy',0);
   before=JSON.stringify([g.coins,g.packages,g.legacyPackageFoods,g.owned,g.recipeCeilings,g.packageRevision]);
   localStorage.setItem=()=>{throw Error('quota')};ok=${action}`);
  assert.equal(h.run('ok'),false);
  assert.equal(h.run('JSON.stringify([g.coins,g.packages,g.legacyPackageFoods,g.owned,g.recipeCeilings,g.packageRevision])'),h.run('before'));
  assert.equal(h.run('packageSession.slots[0].filter(s=>s.reward).length'),0);
 }
});

test('stale package transactions and autosaves cannot restore consumed stock or roll foods twice',()=>{
 const h=progressionHarness();h.run(`g.packages[0]=2;openPackages();save();stale=JSON.stringify(g);unboxAllPackages();
  claimed=localStorage.getItem('panaderyaQuestV2');g=JSON.parse(stale);endPackageSession();openPackages();
  denied=unboxAllPackages();saved=save()`);
 assert.equal(h.run('denied'),false);assert.equal(h.run('saved'),false);
 assert.equal(h.store.get('panaderyaQuestV2'),h.run('claimed'));
});
