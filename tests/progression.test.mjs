import test from 'node:test';
import assert from 'node:assert/strict';
import {progressionHarness} from './progression-harness.mjs';

test('eight rank probabilities total one and every upper tail improves smoothly with mastery',()=>{
 const h=progressionHarness();assert.equal(h.run('RARITIES.length'),8);
 let previous=Array(8).fill(0);
 for(let m=0;m<=1000;m++){
  const p=h.json(`ticketProbabilities(${m})`);assert.ok(Math.abs(p.reduce((a,b)=>a+b)-1)<1e-12);
  for(let r=1;r<8;r++){const tail=p.slice(r).reduce((a,b)=>a+b);assert.ok(tail+1e-12>=previous[r]);if(m>0)assert.ok(tail-previous[r]<.06);previous[r]=tail}
 }
 const high=h.json('ticketProbabilities(160)');assert.ok(high[6]+high[7]>.1);assert.ok(high[7]<.1);assert.ok(Math.max(...high)<.4);
 let old=Array(8).fill(0);for(let rank=0;rank<8;rank++){const p=h.json(`packageProbabilities(${rank})`);for(let r=1;r<8;r++){const tail=p.slice(r).reduce((a,b)=>a+b);assert.ok(tail>=old[r]);old[r]=tail}}
});

test('all same-food Tier 1–4 combinations conserve tier units, actual values, level progress and paid investment',()=>{
 const h=progressionHarness(),required={'1,1':[2],'1,2':[3],'2,2':[3,1],'2,3':[5],'3,3':[5,1],'4,4':[5,3]};
 for(let a=1;a<=4;a++)for(let b=1;b<=4;b++)for(let la=1;la<=5;la++)for(let lb=1;lb<=5;lb++){
  const p=h.json(`fusionPlan({id:'pandesal',uid:1,fusion:${a},level:${la},spent:903,baseCarry:.7},{id:'pandesal',uid:2,fusion:${b},level:${lb},spent:147,resaleBase:21},137)`);
  if(required[[a,b]])assert.deepEqual(p.outputs.map(o=>o.fusion),required[[a,b]]);
  assert.equal(p.outputs.reduce((s,o)=>s+o.fusion,0),a+b);
  assert.ok(p.totalAfter+1e-10>=p.totalBefore);assert.ok(p.strongestAfter+1e-10>=p.strongestBefore);
  assert.equal(p.outputs.reduce((s,o)=>s+o.level-1,0)+p.levelCredits,la+lb-2);
  assert.equal(p.outputs.reduce((s,o)=>s+o.spent,0),1187);
  assert.equal(p.outputs.reduce((s,o)=>s+o.resaleBase,0),75);
  assert.ok(p.outputs.every(o=>o.level<=5&&o.fusion<=5&&o.fusion>=1));
  const refund=p.outputs.reduce((s,o)=>s+o.resaleBase+Math.floor(o.spent*.5),0);
  assert.ok(refund-137<=75+Math.floor(903*.5)+Math.floor(147*.5));
 }
 assert.equal(h.run("fusionPlan({id:'pandesal',uid:1,fusion:5,level:1},{id:'pandesal',uid:2,fusion:1,level:1},1)"),null);
 assert.equal(h.run("fusionPlan({id:'pandesal',uid:1,fusion:1,level:1},{id:'monay',uid:2,fusion:1,level:1},1)"),null);
});

test('fusion transaction is exact once, keeps overflow in inventory and same-food excess level credits',()=>{
 const h=progressionHarness();h.run(`g.completed=5;g.coins=1e7;g.menuSlots=1;g.owned=[{uid:1,id:'pandesal',fusion:2,level:5,spent:1000},{uid:2,id:'pandesal',fusion:3,level:5,spent:2000}];g.uidNext=3;
  plan=duplicateFusionPlan(g.owned[0],2);fingerprint=fusionFingerprint(g.owned);before=g.coins;ok=applyDuplicateFusion(plan,fingerprint);again=applyDuplicateFusion(plan,fingerprint);`);
 assert.equal(h.run('ok'),true);assert.equal(h.run('again'),false);
 assert.equal(h.run('g.coins'),h.run('before-plan.fee'));assert.equal(h.run('g.foodLevelCredits.pandesal'),4);
 h.run(`g.owned.push({uid:g.uidNext++,id:'pandesal',fusion:1,level:1,spent:0});creditUid=g.uidNext-1;upgradeFood(creditUid,true)`);
 assert.equal(h.run('g.foodLevelCredits.pandesal'),3);assert.equal(h.run('g.owned.at(-1).spent'),0);
 h.run(`g.owned=[{uid:8,id:'monay',fusion:4,level:3,spent:110},{uid:9,id:'monay',fusion:4,level:4,spent:201}];g.activeMenu=[9];plan=duplicateFusionPlan(g.owned[0],9);applyDuplicateFusion(plan,fusionFingerprint(g.owned));`);
 assert.equal(h.run('g.owned.length'),2);assert.deepEqual(h.json('g.activeMenu'),[8]);assert.equal(h.run('g.owned[1].fusion'),3);
});

test('stale fusion previews and repeated confirmations cannot spend, consume or duplicate',()=>{
 const h=progressionHarness();h.run(`g.completed=5;g.coins=1e6;g.owned.push({id:'pandesal',uid:2,fusion:1,level:1,spent:0});g.uidNext=3;openFusion(1,2);g.owned[1].level++;before=JSON.stringify(g);ok=submitDuplicateFusion();after=JSON.stringify(g)`);
 assert.equal(h.run('ok'),false);assert.equal(h.run('before'),h.run('after'));
});

test('ingredient fusion accounts for already-paid stock, buys only missing units and caps Tier 5',()=>{
 const h=progressionHarness();h.run(`g.completed=5;g.coins=1e6;g.ingredients={Flour:2,Yeast:1};needs=ingredientNeeds(g.owned[0]);fee=fusionFee(g.owned[0]);missing=fusionIngredientCost(g.owned[0]);before=g.coins;fuseIngredients(1);`);
 assert.equal(h.run('g.coins'),h.run('before-fee-missing'));
 assert.equal(h.run('g.owned[0].spent'),h.run('fee+needs.reduce((s,i)=>s+i.need*i.price,0)'));
 assert.equal(h.run('g.owned[0].fusion'),2);
 h.run('g.owned[0].fusion=5;before=JSON.stringify(g);ok=fuseIngredients(1)');assert.equal(h.run('ok'),false);assert.equal(h.run('JSON.stringify(g)'),h.run('before'));
});

test('legacy six and identifiable seven-rank saves migrate once, preserving owned progress and pending claim ledger',()=>{
 const base=progressionHarness().json('fresh()');delete base.progressionVersion;delete base.rarityCount;delete base.bakeryLevel;delete base.bakerySpent;
 base.decor=4;base.owned[0]={uid:1,id:'ube-ensaymada',fusion:3,level:3,spent:12345};base.board=[{id:9,rarity:5,a:79,b:18,base:304}];
 base.run={phase:'claim',ticket:{id:20,rarity:5,a:79,b:18,base:304},budget:500,pool:500,chests:[{rarity:5}],worksheetRewards:{attemptId:'keep',actions:{x:true}}};
 const {json,run,store}=progressionHarness(base);
 assert.equal(json('g.owned[0]').fusion,4);assert.equal(run('g.owned[0].spent'),12345);assert.ok(run('foodValue(g.owned[0])')>=27*4*1.4);
 assert.ok(run('decorBonus()')>=1.55);assert.equal(run('g.bakerySpent'),46550);assert.equal(run('g.board[0].rarity'),7);
 assert.deepEqual(json('g.run.worksheetRewards'),base.run.worksheetRewards);assert.equal(run('g.run.budget'),500);assert.equal(run('g.run.ticket.id'),20);
 assert.equal(store.get('panaderyaQuestV2BeforeProgression'),JSON.stringify(base));
 run('before=JSON.stringify(g);migrateProgression(g)');assert.equal(run('JSON.stringify(g)'),run('before'));
 base.rarityCount=7;base.board[0].rarity=5;base.run.ticket.rarity=6;const seven=progressionHarness(base);assert.equal(seven.run('g.board[0].rarity'),6);assert.equal(seven.run('g.run.ticket.rarity'),7);
 base.owned[0].fusion=0;assert.equal(progressionHarness(base).run('g.owned[0].fusion'),1);
});

test('Equip Best chooses unique foods deterministically, modes differ and Auto updates without deleting',()=>{
 const h=progressionHarness();h.run(`g.menuSlots=2;g.owned=[{uid:1,id:'pandesal',fusion:1,level:5,spent:9},{uid:2,id:'monay',fusion:1,level:1,spent:9},{uid:3,id:'pandesal',fusion:1,level:1,spent:9}];
  before=JSON.stringify(g.owned);equipBest('final');final=[...g.activeMenu];equipBest('base');base=[...g.activeMenu];setAutoEquip('final',true);manual=manualMenuAllowed();g.owned.push({uid:4,id:'ensaymada',fusion:2,level:1,spent:0});save();`);
 assert.deepEqual(h.json('final'),[1,2]);assert.deepEqual(h.json('base'),[2,1]);assert.deepEqual(h.json('g.activeMenu'),[4,1]);assert.equal(h.run('manual'),false);
 h.run(`setAutoEquip('base',true);g.owned=g.owned.filter(o=>o.uid!==4);save();setAutoEquip('base',false);allowed=manualMenuAllowed()`);
 assert.equal(h.run('g.autoEquip'),'off');assert.equal(h.run('allowed'),true);assert.equal(h.run('JSON.stringify(g.owned)'),h.run('before'));
 const restored=progressionHarness(h.json('g'));assert.equal(restored.run('g.autoEquip'),'off');
});

test('refresh persists five tickets and deadline, blocks repeat, reload and rollback, preserves active/claim objects',()=>{
 const h=progressionHarness();h.run(`Date.now=()=>1000000;g.run={phase:'engine',ticket:{id:55}};active=g.run;ok=refreshOrders();board=JSON.stringify(g.board);again=refreshOrders();same=g.run===active;`);
 assert.equal(h.run('ok'),true);assert.equal(h.run('again'),false);assert.equal(h.run('same'),true);assert.equal(h.run('g.board.length'),5);
 const saved=h.json('g'),r=progressionHarness(saved);r.run(`Date.now=()=>999999;ok=refreshOrders()`);assert.equal(r.run('ok'),false);assert.equal(r.run('JSON.stringify(g.board)'),h.run('board'));
 r.run(`Date.now=()=>1180000;g.run.phase='claim';claim=g.run;ok=refreshOrders();same=g.run===claim`);assert.equal(r.run('ok'),true);assert.equal(r.run('same'),true);
 const ids=r.json('g.board.map(t=>t.id)');assert.equal(new Set(ids).size,5);
});

test('bakery has exact visual milestones, 30 real levels and preserved kitchen levels expand to 20',()=>{
 const h=progressionHarness();h.run('g.completed=100;g.coins=1e30');
 for(let level=1;level<=30;level++){
  assert.equal(h.run('g.bakeryLevel'),level);const before=h.run('bakeryValue()'),stage=h.run('bakeryStage(g.bakeryLevel)');
  if(level<30){assert.equal(h.run('upgradeDecor()'),true);assert.ok(Math.abs(h.run('bakeryValue()')/before-1.085)<1e-12);
   assert.equal(h.run('bakeryStage(g.bakeryLevel)')-stage,[2,3,5,7,10,13,17,21,25,30].includes(level+1)?1:0);}
 }
 assert.equal(h.run('upgradeDecor()'),false);
 for(let n=0;n<20;n++){const before=h.run('bakeryValue()');assert.equal(h.run("upgradeEquipment('oven')"),true);assert.ok(Math.abs(h.run('bakeryValue()')/before-1.055)<1e-12)}
 assert.equal(h.run("upgradeEquipment('oven')"),false);assert.ok(Math.abs(h.run('economyUnit()/90/staffRate()')-4)<1e-12);
});

test('unequipping or selling cannot lower global upgrade prices or create a high-rate staff contract',()=>{
 const h=progressionHarness();h.run(`g.completed=20;g.owned.push({uid:2,id:'ube-ensaymada',fusion:4,level:4,spent:5000});g.activeMenu=[1,2];save();price=equipmentCost(KITCHEN[0]);bakeryPrice=bakeryUpgradeCost();slotPrice=slotCost();income=staffRate();g.activeMenu=[];save();`);
 assert.equal(h.run('equipmentCost(KITCHEN[0])'),h.run('price'));assert.equal(h.run('bakeryUpgradeCost()'),h.run('bakeryPrice'));assert.equal(h.run('slotCost()'),h.run('slotPrice'));
 assert.ok(h.run('staffRate()')<h.run('income'));
 h.run('g.owned=g.owned.filter(o=>o.uid!==2);save()');assert.equal(h.run('equipmentCost(KITCHEN[0])'),h.run('price'));
 const reloaded=progressionHarness(h.json('g'));assert.equal(reloaded.run('equipmentCost(KITCHEN[0])'),h.run('price'));
});

test('a stale tab save retains the latest refresh deadline',()=>{
 const h=progressionHarness();h.run(`Date.now=()=>1000000;g.orderRefreshAt=1180000;save();g.orderRefreshAt=0;save();again=refreshOrders()`);
 assert.equal(h.run('g.orderRefreshAt'),1180000);assert.equal(h.run('again'),false);
});
