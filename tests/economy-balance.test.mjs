import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {progressionHarness} from './progression-harness.mjs';
const baseline=JSON.parse(readFileSync(new URL('./fixtures/economy-before.json',import.meta.url),'utf8'));

test('independent starter quotes use the selected growth curves and keep a meaningful guaranteed coin reward',()=>{
 const h=progressionHarness();
 assert.equal(h.run('ticketBase(0)*bakeryValue()'),156);
 assert.equal(h.run('bakeryUpgradeCost()'),130);
 assert.equal(h.run('slotCost()'),61);
 assert.equal(h.run('foodLevelPrice(g.owned[0])'),29);
 assert.equal(h.run('packagePrice(0)'),118);
 assert.equal(h.run('BAKERY_POWER_CONFIG.purchases'),5000);
 assert.deepEqual(h.json('PACKAGE_SHOP.map(t=>t.unlock)'),[1,12,30,60,110,190,300,450]);
});

test('mathematical practice and menu growth improve purchasing power independently of coin-tier luck',()=>{
 const h=progressionHarness();h.run(`g.coins=1e50;before=slotCost();g.mastery=200;g.permanentLuck=50;afterLuck=slotCost();g.completed=200;afterPractice=slotCost()`);
 assert.equal(h.run('afterLuck'),h.run('before'));
 assert.ok(h.run('afterPractice')<h.run('before'));
 h.run(`g.completed=0;g.economyPeakBase=1.2;costLow=slotCost();g.economyPeakBase=120;costHigh=slotCost()`);
 assert.ok(h.run('costHigh/costLow')<100);
});

test('every package type has negative expected buy/open/sell return, including at the cheapest possible quote',()=>{
 const h=progressionHarness();
 for(let rank=0;rank<8;rank++){
  h.run(`g.completed=1000000;g.bakeryLevel=1;rank=${rank};value=packageProbabilities(rank).reduce((sum,p,i)=>{
   const foods=FOOD.filter(f=>f.rarity===i);return sum+p*foods.reduce((n,f)=>n+baseResale({id:f.id}),0)/foods.length},0)`);
  assert.ok(h.run(`packagePrice(${rank})`)>h.run('value'));
  assert.ok(h.run(`packagePrice(${rank})`)>=h.run('value*1.2'));
 }
});

test('collecting an unequipped food does not tax the Menu and actual Menu peaks cannot be sold or unequipped away',()=>{
 const h=progressionHarness();h.run(`before=slotCost();discoverFood(FOOD.at(-1));afterDiscovery=slotCost();
  equipBest('final');save();afterEquip=slotCost();g.activeMenu=[];save();afterUnequip=slotCost()`);
 assert.equal(h.run('afterDiscovery'),h.run('before'));
 assert.ok(h.run('afterEquip')>h.run('before'));
 assert.equal(h.run('afterUnequip'),h.run('afterEquip'));
 h.run('g.owned=[];save()');assert.equal(h.run('slotCost()'),h.run('afterEquip'));
});

test('repricing rebases obsolete projected Menu costs once and retains already unlocked package types',()=>{
 const old=progressionHarness().json('g');delete old.economyVersion;
 old.bakeryLevel=41;old.economyPeakBase=1e12;
 const h=progressionHarness(old);
 assert.equal(h.run('g.economyPeakBase'),1.2);
 assert.deepEqual(h.json('PACKAGE_SHOP.map(t=>packageUnlocked(t.rank))'),[true,true,true,true,true,false,false,false]);
 h.run('g.economyPeakBase=123;save()');
 const reload=progressionHarness(h.json('g'));
 assert.equal(reload.run('g.economyPeakBase'),123);
 assert.equal(reload.run('packageUnlocked(4)'),true);
 const fresh=progressionHarness();assert.equal(fresh.run('packageUnlocked(4)'),false);
});

test('milestone package costs grow slower than earnings while Bakery Power keeps its legacy 8.5 percent gain',()=>{
 const h=progressionHarness();h.run(`g.bakeryLevel=101;g.completed=100;before=packagePrice(7)/bakeryValue();
  g.bakeryLevel=501;after=packagePrice(7)/bakeryValue()`);
 assert.ok(h.run('after/before')<.4);
 assert.ok(Math.abs(h.run('bakeryFactor(102)/bakeryFactor(101)')-1.085)<1e-12);
});

test('old savings, investments, package guarantees, Mastery and frozen order rewards survive repricing once',()=>{
 const old=progressionHarness().json('g');delete old.economyVersion;
 old.coins=1234567;old.completed=110;old.bakeryLevel=101;old.bakerySpent=987654;
 old.owned[0].mastery=20;old.owned[0].spent=12345;old.recipeCeilings.pandesal=35;
 old.packages[7]=73;old.legacyPackageFoods[7]=[7];
 old.run={ticket:{id:71,rarity:7,coinTier:7,a:79,b:18,base:16640},coinRewardsVersion:1,baseCoins:16640,bakersBoost:42,budget:698880,pool:110,phase:'engine',steps:[],worksheetRewards:{attemptId:'keep',actions:{x:true}}};
 old.orderRuns={71:old.run};old.board=[old.run.ticket];
 old.purchaseUndo={id:'old-pricing',signature:'old'};
 const h=progressionHarness(old);
 for(const key of ['coins','completed','bakeryLevel','bakerySpent','owned','recipeCeilings','packages','legacyPackageFoods'])assert.deepEqual(h.json(`g.${key}`),old[key]);
 assert.equal(h.run('decorBonus()'),1.085**100);assert.equal(h.run('g.run.budget'),698880);
 assert.equal(h.run('g.run.ticket.base'),16640);assert.equal(h.run('g.run.worksheetRewards.attemptId'),'keep');
 assert.equal(h.run('g.purchaseUndo'),null);
 h.run('before=JSON.stringify(g);migrateFrame11(g)');assert.equal(h.run('JSON.stringify(g)'),h.run('before'));
});

test('all valid boundary quotes and rewards stay finite and large-number labels stay compact',()=>{
 const h=progressionHarness();h.run(`g.bakeryLevel=BAKERY_POWER_CONFIG.purchases+1;g.completed=1e6;
  g.owned=FOOD.map((f,i)=>({uid:i+1,id:f.id,fusion:5,mastery:1e6,level:5,spent:0}));
  g.menuSlots=FOOD.length;g.activeMenu=g.owned.map(o=>o.uid);g.recipeCeilings=Object.fromEntries(FOOD.map(f=>[f.id,1e6+10]));
  values=[bakeryValue(),...COIN_TIERS.map((_,i)=>Math.round(ticketBase(i)*bakeryValue())),...g.owned.map(foodLevelPrice),...PACKAGE_TYPES.map((_,i)=>packagePrice(i)),slotCost(),bakeryUpgradeCost()]`);
 assert.ok(h.json('values').every(n=>Number.isFinite(n)&&n>0));
 for(const label of h.json('values.flatMap(n=>[amountLabel(n),powerLabel(n),fmt(n)])'))assert.ok(label.length<24,label);
 assert.equal(h.run('fmt(123456)'), '123,456');assert.equal(h.run('multiplierLabel(1.2)'), '1.20');
});

test('actual public transactions charge their pre-purchase quotes through a multi-purchase sequence',()=>{
 const h=progressionHarness();h.run(`g.coins=10000;g.completed=25;discoverFood(F('pandesal'));discoverFood(F('monay'));discoverFood(F('monay'));`);
 for(const [quote,action] of [['bakeryUpgradeCost()','upgradeDecor()'],['foodLevelPrice(g.owned[0])','upgradeFood(1,true)'],['slotCost()','buyMenuSlot()'],['fusionFee(g.owned[0])+fusionIngredientCost(g.owned[0])','fuseIngredients(1)']]){
  h.run(`cost=${quote};before=g.coins;ok=${action}`);
  assert.notEqual(h.run('ok'),false);assert.equal(h.run('before-g.coins'),h.run('cost'));
 }
});

test('baseline fixture reproduces known original quotes before candidate tuning',()=>{
 const h=progressionHarness();h.c.beforeModel=baseline;
 h.run(`Object.assign(BAKERY_POWER_CONFIG,beforeModel.bakery);beforeModel.shop.forEach((v,i)=>Object.assign(PACKAGE_SHOP[i],v));
  for(const [name,source] of Object.entries(beforeModel.functions))eval(name+' = ('+source+')')`);
 assert.equal(h.run('bakeryUpgradeCost()'),513);assert.equal(h.run('slotCost()'),411);
 assert.equal(h.run('packagePrice(0)'),123);assert.equal(h.run('foodLevelPrice(g.owned[0])'),246);
});

test('the retained simulator uses the production model faithfully, spends multiple times, and conserves coins',()=>{
 const h=progressionHarness();
 vm.runInContext(readFileSync(new URL('./economy-simulation-engine.js',import.meta.url),'utf8'),h.c);
 const config={seed:20261105,trials:1,checkpoints:[25,50,100,200],policies:{balanced:.3},luck:['normal','coin_stack_only'],meaningfulGain:.001};
 h.c.checkConfig=config;h.run(`result=runEconomyTrials(checkConfig,{name:'production'})`);
 const rows=h.json('result.aggregate.filter(r=>r.from)');
 assert.ok(rows.every(r=>!r.exhaustedOrders&&!r.loopLimitHits));
 const normal=rows.filter(r=>r.luck==='normal');
 assert.ok(normal.find(r=>r.to===200).actualUpgrades.mean>normal.find(r=>r.to===25).actualUpgrades.mean);
 assert.ok(normal.find(r=>r.to===200).affordableUpgrades.median>=5);
 assert.ok(h.run('result.worstDrought')<=3);
});
