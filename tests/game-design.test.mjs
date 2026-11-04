import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {progressionHarness} from './progression-harness.mjs';

function modelHarness(){
 const h=progressionHarness();h.c.window={addEventListener(){}};
 h.run(readFileSync(new URL('../src/game/worksheet-bridge.js',import.meta.url),'utf8'));
 h.run(readFileSync(new URL('./progression-model.js',import.meta.url),'utf8'));
 return h;
}

test('Mastery preview predicts actual boosted earnings with manual, base and final menus without changing state or RNG',()=>{
 for(const auto of ['off','base','final']){
  const h=progressionHarness();h.run(`g.coins=1e8;discoverFood(F('monay'));discoverFood(F('pandesal'));g.autoEquip='${auto}';g.equipment.oven=3;g.bakeryLevel=21;
   saved=JSON.stringify(g);Math.random=()=>{throw Error('render consumed RNG')};preview=masteryPreview(g.owned[0]);
   renderOrderRewards([{food:F('pandesal'),uid:1,isNew:false,masteryUnlocked:1}],0,0,'packages');bakeryIdeas();renderBakery();`);
  assert.equal(h.run('JSON.stringify(g)'),h.run('saved'));
  h.run('buyMastery([1])');assert.ok(Math.abs(h.run('bakeryValue()-preview.after'))<1e-9);
 }
});

test('reward follow-through offers real recipe UIDs, optional saved capacity and free equip benefit without granting more rewards',()=>{
 const h=progressionHarness();h.run(`g.coins=0;rewards=[discoverFood(F('monay')),discoverFood(F('pandesal'))];before=JSON.stringify(g);
 markup=renderOrderRewards(rewards,130,0);`);
 const html=h.run('markup');assert.match(html,/View recipe/);assert.match(html,/openFoodItem\(2\)/);assert.match(html,/Capacity stays saved/);assert.match(html,/more coins needed/);assert.match(html,/Equip Best · free/);
 assert.equal(h.run('JSON.stringify(g)'),h.run('before'));
 h.run('coins=g.coins;useRewardMenu()');assert.equal(h.run('g.coins'),h.run('coins'));assert.deepEqual(h.json('g.activeMenu'),[2]);
});

test('production-driven model includes four per-pair packages for 79×18 when every valid pair drops; duplicate actions cannot add more',()=>{
 const h=modelHarness();h.run(`g.board=[{id:1,a:79,b:18,rarity:1,base:304,packages:1}];Math.random=()=>0;startTicket(1);
 const r=g.run,ledger=ensureWorksheetRewards(r);all=[];for(const s of r.steps)all.push(...worksheetActionKinds(s).map(kind=>({id:worksheetActionId(ledger.attemptId,s.row,s.col,kind),row:s.row,col:s.col,kind})));
 applyWorksheetActions(r,all);applyWorksheetActions(r,all);before=g.coins;finishSum();budget=g.run.budget;packages=g.run.chests.length;prizeItems();`);
 assert.equal(h.run('packages'),4);assert.equal(h.run('g.coins-before'),h.run('budget'));assert.equal(h.run('g.completed'),1);
});

test('extended simulator is reproducible across growth and nonoptimal strategies with all per-order invariants',()=>{
 const h=modelHarness();const config=JSON.parse(readFileSync(new URL('./game-design-scenarios.json',import.meta.url),'utf8'));
 config.trials=2;config.horizons=[1,25];config.scenarios=config.scenarios.slice(0,1);config.policies=['growth','younger'];
 h.c.simulationConfig=config;h.c.simulationVariant=config.variants[0];
 h.run('save=()=>{reconcileAutoEquip();return true};coinFly=()=>{};renderOrderRewards=()=>""');
 const first=h.json('simulateDesign(simulationConfig,simulationVariant)');assert.deepEqual(h.json('simulateDesign(simulationConfig,simulationVariant)'),first);
 for(const metric of first.metrics)assert.ok(metric.distributions.freePackages.p10>=metric.horizon);
 assert.ok(first.metrics.some(m=>m.distributions.freePackages.p50>m.horizon));
});

test('package resale has no positive expected coin loop at the cheapest legal unlock states',()=>{
 const h=progressionHarness();
 for(let rank=0;rank<8;rank++){
  const result=h.json(`(()=>{g=fresh();g.economyPeakBase=1.2;g.owned=[];g.activeMenu=[];g.bakeryLevel=PACKAGE_SHOP[${rank}].unlock;
   const expectedResale=packageProbabilities(${rank}).reduce((n,p,r)=>{const foods=FOOD.filter(f=>f.rarity===r);return n+p*foods.reduce((v,f)=>v+foodResaleBase({id:f.id}),0)/foods.length},0);
   return {expectedResale,price:packagePrice(${rank})}})()`);
  assert.ok(result.expectedResale<result.price,`rank ${rank} has profitable expected resale`);
 }
});

test('accepted price curves match the simulated candidate and leave fixed saved order budgets and past investments intact',()=>{
 const h=progressionHarness();
 for(const [level,orders] of [[1,2.5],[21,3.3],[71,5.3],[100,6.46]]){
  h.run(`g.bakeryLevel=${level}`);
  assert.ok(Math.abs(h.run('bakeryUpgradeCost()/economyUnit()')-orders)<.01);
 }
 const prices=h.json('PACKAGE_SHOP.map(t=>t.priceOrders)');assert.equal(prices[0],.6);assert.equal(prices[7],76.8);
 h.run('g.bakerySpent=123456;g.owned[0].spent=789;g.board=[{id:55,a:79,b:18,rarity:1,base:304}];startTicket(55);fixed=g.run.budget;abandonTicket();save()');
 const saved=h.json('g');const reload=progressionHarness(saved);
 assert.equal(reload.run('g.run.budget'),h.run('fixed'));assert.equal(reload.run('g.bakerySpent'),123456);assert.equal(reload.run('g.owned[0].spent'),789);
});

test('package discovery odds account for already collected recipes independently of rarity, stock and RNG',()=>{
 const h=progressionHarness();h.run("Math.random=()=>{throw Error('odds used RNG')};g.discovered=[]");
 for(let rank=0;rank<8;rank++)assert.ok(Math.abs(h.run(`packageDiscoveryChance(${rank})`)-1)<1e-12);
 h.run("g.discovered=['pandesal']");
 assert.ok(Math.abs(h.run('packageDiscoveryChance(0)-(1-packageProbabilities(0)[0]/3)'))<1e-12);
 h.run('g.discovered=FOOD.map(f=>f.id);openPackages("buy",0)');assert.equal(h.run('packageDiscoveryChance(7)'),0);assert.match(h.run('popup.html'),/New recipe chance: 0.00%/);
});
