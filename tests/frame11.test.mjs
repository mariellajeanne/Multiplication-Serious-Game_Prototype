import test from 'node:test';
import assert from 'node:assert/strict';
import {progressionHarness} from './progression-harness.mjs';

test('new saves start with one slot; existing slots, investments and claim identities migrate once',()=>{
 const h=progressionHarness();assert.equal(h.run('g.menuSlots'),1);
 const old=h.json('g');delete old.frame11Version;delete old.recipeCeilings;delete old.orderRuns;
 old.menuSlots=8;old.owned.push({uid:2,id:'pandesal',level:4,fusion:3,spent:900});old.coins=4567;
 old.run={ticket:{id:40,a:79,b:18,rarity:1},phase:'claim',pool:888,worksheetRewards:{attemptId:'saved',actions:{x:true}}};
 const migrated=progressionHarness(old);
 assert.equal(migrated.run('g.menuSlots'),8);assert.equal(migrated.run('g.coins'),4567);
 assert.equal(migrated.run('g.recipeCeilings.pandesal'),4);
 assert.equal(migrated.run('g.run===g.orderRuns[40]'),true);
 assert.equal(migrated.run('g.run.worksheetRewards.attemptId'),'saved');
 migrated.run('before=JSON.stringify(g);migrateFrame11(g)');assert.equal(migrated.run('JSON.stringify(g)'),migrated.run('before'));
});

test('each order preserves problem, snapshot, ledger, budget and pending rewards through switching and reload',()=>{
 const h=progressionHarness();h.run(`refillBoard();first=g.board[0].id;second=g.board[1].id;startTicket(first);
 g.run.pool=45;g.run.worksheetSession={attemptId:g.run.worksheetRewards.attemptId,state:{a:g.run.ticket.a,b:g.run.ticket.b,phase:'product',onesPlaced:true}};
 original=JSON.stringify(g.run);startTicket(second);g.run.pool=12;startTicket(first);restored=JSON.stringify(g.run);save()`);
 assert.equal(h.run('restored'),h.run('original'));
 const reload=progressionHarness(JSON.parse(h.store.get('panaderyaQuestV2')));
 assert.equal(reload.run('g.run===g.orderRuns[g.run.ticket.id]'),true);
 assert.equal(reload.run('g.run.pool'),45);assert.equal(reload.run('g.run.worksheetSession.state.onesPlaced'),true);
 
 assert.equal(reload.run('Object.values(g.orderRuns).find(r=>r.ticket.id!==g.run.ticket.id).pool'),12);
});

test('refresh protects all started tickets and only replaces untouched tickets; no refresh when all are started',()=>{
 const h=progressionHarness();h.run(`refillBoard();first=g.board[0].id;second=g.board[1].id;startTicket(first);startTicket(second);g.run.phase='claim';save();
 snapshots=JSON.stringify(g.orderRuns);ok=refreshOrders();ids=g.board.map(t=>t.id)`);
 assert.equal(h.run('ok'),true);assert.equal(h.run('JSON.stringify(g.orderRuns)'),h.run('snapshots'));
 assert.ok(h.run('ids.includes(first)&&ids.includes(second)'));assert.equal(h.run('g.board.length'),5);
 h.run('for(const t of g.board)startTicket(t.id);g.orderRefreshAt=0;before=JSON.stringify([g.board,g.orderRuns,g.coins]);ok=refreshOrders()');
 assert.equal(h.run('ok'),false);assert.equal(h.run('JSON.stringify([g.board,g.orderRuns,g.coins])'),h.run('before'));
});

test('duplicate discoveries permanently unlock mastery; purchases grow past five and calculate exact contributions',()=>{
 const h=progressionHarness();h.run(`g.coins=1e12;noUpgrade=upgradeFood(1,true);for(let i=0;i<12;i++)discoverFood(F('pandesal'));
 before=g.coins;cost=foodLevelPrice(g.owned[0]);ok=upgradeFood(1,true);after=g.coins;for(let i=0;i<10;i++)upgradeFood(1,true)`);
 assert.equal(h.run('noUpgrade'),false);assert.equal(h.run('ok'),true);
 assert.equal(h.run('before-after'),h.run('cost'));assert.equal(h.run('recipeMastery(g.owned[0])'),11);
 assert.equal(h.run('availableMastery(g.owned[0])'),1);
 assert.ok(Math.abs(h.run('foodValue(g.owned[0])')-1.2*(2.3+7*.4))<1e-10);
 assert.equal(h.run('g.owned.length'),1);
 assert.equal(progressionHarness(h.json('g')).run('bakeryValue()'),h.run('bakeryValue()'));
});

test('all owned foods display; hide is a view filter; mixed selection has both operations; capacity is atomic',()=>{
 const h=progressionHarness();h.run(`discoverFood(F('monay'));discoverFood(F('kababayan'));all=renderMenu();hideUnequipped=true;hidden=renderMenu();
 multiSelect=true;selectedFoods=new Set([1,2,3]);panel=renderFoodPanel();before=JSON.stringify(g.activeMenu);overflow=selectionEquip(true)`);
 assert.equal((h.run('all').match(/data-uid=/g)||[]).length,3);
 assert.equal((h.run('hidden').match(/data-uid=/g)||[]).length,1);
 assert.match(h.run('panel'),/Equip \(2\)/);assert.match(h.run('panel'),/Unequip \(1\)/);
 assert.equal(h.run('overflow'),false);assert.equal(h.run('JSON.stringify(g.activeMenu)'),h.run('before'));
 h.run('g.menuSlots=3;ok=selectionEquip(true)');assert.equal(h.run('ok'),true);assert.deepEqual(h.json('g.activeMenu'),[1,2,3]);
 h.run('selectionEquip(false)');assert.equal(h.run('g.owned.length'),3);assert.equal(h.run('g.activeMenu.length'),0);
});

test('bulk mastery quotes the exact eligible total and rejects stale confirmations and repeated purchases',()=>{
 const h=progressionHarness();h.run(`g.coins=1e8;discoverFood(F('pandesal'));discoverFood(F('monay'));g.recipeCeilings.monay=0;
 selectedFoods=new Set([1,2,3]);requestSelectedMastery();quote=masteryConfirmation.cost;before=g.coins;ok=confirmSelectedMastery();again=confirmSelectedMastery()`);
 assert.equal(h.run('ok'),true);assert.equal(h.run('again'),false);assert.equal(h.run('before-g.coins'),h.run('quote'));
 assert.deepEqual(h.json('g.owned.map(recipeMastery)'),[1,0]);
 h.run(`g.recipeCeilings.pandesal++;requestSelectedMastery();g.owned[0].mastery++;before=g.coins;stale=confirmSelectedMastery()`);
 assert.equal(h.run('stale'),false);assert.equal(h.run('g.coins'),h.run('before'));
});

test('ten second Undo reverses only the latest transaction once, survives reload, and commits on dependencies',()=>{
 const h=progressionHarness();h.run(`Date.now=()=>100000;g.coins=1e9;before=JSON.stringify([g.coins,g.menuSlots]);buyMenuSlot();id=g.purchaseUndo.id;save()`);
 const reload=progressionHarness(JSON.parse(h.store.get('panaderyaQuestV2')));reload.run('Date.now=()=>100001;ok=undoPurchase(g.purchaseUndo.id);again=undoPurchase("old")');
 assert.equal(reload.run('ok'),true);assert.equal(reload.run('again'),false);assert.equal(reload.run('JSON.stringify([g.coins,g.menuSlots])'),h.run('before'));
 h.run('buyMenuSlot();old=g.purchaseUndo.id;upgradeDecor();latest=g.purchaseUndo.id;denied=undoPurchase(old);ok=undoPurchase(latest)');
 assert.equal(h.run('denied'),false);assert.equal(h.run('ok'),true);assert.equal(h.run('g.menuSlots'),3);assert.equal(h.run('g.bakeryLevel'),1);
 h.run('upgradeDecor();refillBoard();startTicket(g.board[0].id);denied=undoPurchase(latest)');assert.equal(h.run('g.purchaseUndo'),null);assert.equal(h.run('denied'),false);
 const expired=progressionHarness();expired.run('g.coins=1e9;Date.now=()=>1000;buyMenuSlot();id=g.purchaseUndo.id;Date.now=()=>11001;ok=undoPurchase(id)');assert.equal(expired.run('ok'),false);
});

test('Undo cannot reverse mastery used by equipment, opened packages, sales or changed assignments',()=>{
 for(const change of ['g.equipment.oven++','g.packages[0]++','g.activeMenu=[]','g.owned[0].spent++','g.coins++']){
  const h=progressionHarness();h.run(`g.coins=1e9;discoverFood(F('pandesal'));buyMastery([1]);id=g.purchaseUndo.id;${change};save();ok=undoPurchase(id)`);
  assert.equal(h.run('ok'),false,change);assert.equal(h.run('g.purchaseUndo'),null);
 }
});

test('Bakery Power supports 100 configurable purchases, shows only immediate price/gain and wraps history',()=>{
 const h=progressionHarness();h.run('g.coins=1e100');
 for(let i=0;i<100;i++)assert.equal(h.run('upgradeDecor()'),true);
 assert.equal(h.run('upgradeDecor()'),false);assert.equal(h.run('g.bakeryLevel'),101);
 h.run('g.bakeryLevel=20;html=renderBakery();bakeryBrowseIndex=21;browseBakery(1)');
 assert.equal(h.run('bakeryBrowseIndex'),1);assert.doesNotMatch(h.run('html'),/\/100|\/101|Level|progressbar/);
 assert.equal((h.run('html').match(/🪙/g)||[]).length,1);
});

test('package types are distinct from food rarities; displayed ticket odds match generation; Fate is not guaranteed Crown Jewel',()=>{
 const h=progressionHarness();assert.equal(h.run('PACKAGE_TYPES[7]'),'Fate');assert.equal(h.run('RARITIES[7]'),'Crown Jewel');
 h.run('Math.random=()=>0;low=drawFood(7);Math.random=()=>.999999999;high=drawFood(7);g.mastery=80;html=renderTicketOdds()');
 assert.equal(h.run('low.rarity'),0);assert.equal(h.run('high.rarity'),7);
 const probabilities=h.json('ticketProbabilities(80)');assert.ok(Math.abs(probabilities.reduce((a,b)=>a+b)-1)<1e-12);
 assert.match(h.run('html'),/Ticket Luck/);assert.match(h.run('html'),/openProbabilities/);
 const odds=h.run('openProbabilities();popup.title+popup.html');assert.match(odds,/Ticket Package Odds/);assert.match(odds,/Fate/);assert.doesNotMatch(odds,/Crown Jewel/);
});

test('coin package purchases save stock, charge exactly once, reject stale pricing and reveal only next locked type',()=>{
 const h=progressionHarness();h.run(`g.coins=1e8;openPackages('buy',0);html=popup.html;packageQuantity=3;before=g.coins;price=packagePrice(0);requestPackagePurchase();
 if(packagePurchaseReview)confirmPackagePurchase();again=confirmPackagePurchase()`);
 assert.equal(h.run('g.coins'),h.run('before-price*3'));assert.equal(h.run('g.packages[0]'),3);assert.equal(h.run('again'),false);
 assert.match(h.run('html'),/Standard/);assert.match(h.run('html'),/Lucky/);assert.doesNotMatch(h.run('html'),/Fortunate|Miraculous/);
 h.run(`g.packages[0]=0;packagePurchaseReview={rank:0,count:1,total:packagePrice(0),price:packagePrice(0)};g.bakeryLevel++;before=g.coins;ok=confirmPackagePurchase()`);
 assert.equal(h.run('ok'),false);assert.equal(h.run('g.coins'),h.run('before'));
});

test('unboxing retains one instance per recipe, expands mastery ceilings, persists results, and never permits negative stock',()=>{
 const h=progressionHarness();h.run(`g.packages[0]=30;Math.random=()=>0;before=g.owned.length;ok=unboxPackages(0,30,true);again=unboxPackages(0,30,true)`);
 assert.equal(h.run('ok'),true);assert.equal(h.run('again'),false);assert.equal(h.run('g.packages[0]'),0);assert.equal(h.run('g.owned.length'),1);
 assert.equal(h.run('g.recipeCeilings.pandesal'),30);
 assert.equal(progressionHarness(h.json('g')).run('g.owned.length'),1);
});

test('completed orders pay once across stale attempts, reload, switching and mistakes; visible Luck never decreases',()=>{
 const h=progressionHarness();h.run(`refillBoard();id=g.board[0].id;startTicket(id);g.run.phase='claim';g.run.pool=456;g.run.chests=[{rarity:0}];g.run.mistakes=100;
 Math.random=()=>0;old=g.coins;ok=prizeItems();again=prizeItems();startTicket(id)`);
 assert.equal(h.run('ok'),true);assert.equal(h.run('again'),false);assert.equal(h.run('g.coins'),h.run('old+456'));assert.equal(h.run('g.run'),null);assert.equal(h.run('g.mastery'),1);
 const reload=progressionHarness(h.json('g'));reload.run(`startTicket(${h.run('id')})`);assert.equal(reload.run('g.run'),null);
});

test('free packages can be saved instead of opened and persist without repeating the claim',()=>{
 const h=progressionHarness();h.run(`refillBoard();startTicket(g.board[0].id);g.run.phase='claim';g.run.pool=100;g.run.chests=[{rarity:7},{rarity:7}];
 before=g.owned.length;old=g.coins;ok=prizeItems(false);again=prizeItems(false)`);
 assert.equal(h.run('ok'),true);assert.equal(h.run('again'),false);assert.equal(h.run('g.owned.length'),h.run('before'));
 assert.equal(h.run('g.packages[7]'),2);assert.equal(h.run('g.coins'),h.run('old+100'));
 assert.equal(progressionHarness(h.json('g')).run('g.packages[7]'),2);
});

test('failed claim and package writes retain their original coins, foods, stock and claim eligibility',()=>{
 const claim=progressionHarness();claim.run(`refillBoard();startTicket(g.board[0].id);g.run.phase='claim';g.run.chests=[{rarity:1}];g.run.pool=222;
 before=JSON.stringify([g.coins,g.owned,g.packages,g.claimedOrders]);localStorage.setItem=()=>{throw Error('quota')};ok=prizeItems()`);
 assert.equal(claim.run('ok'),false);assert.equal(claim.run('g.run.phase'),'claim');assert.equal(claim.run('g.run===g.orderRuns[g.run.ticket.id]'),true);
 assert.equal(claim.run('JSON.stringify([g.coins,g.owned,g.packages,g.claimedOrders])'),claim.run('before'));
 const packages=progressionHarness();packages.run(`g.packages[0]=2;before=JSON.stringify([g.coins,g.owned,g.packages]);localStorage.setItem=()=>{throw Error('quota')};ok=unboxPackages(0,2)`);
 assert.equal(packages.run('ok'),false);assert.equal(packages.run('JSON.stringify([g.coins,g.owned,g.packages])'),packages.run('before'));
});

test('legacy pending packages retain their earned food rarity rather than being downgraded by new Luck odds',()=>{
 const old=progressionHarness().json('g');delete old.frame11Version;
 old.run={ticket:{id:123,rarity:7},phase:'claim',chests:[{rarity:7}],pool:500,correct:1,mistakes:0,mode:'normal'};
 const h=progressionHarness(old);h.run('Math.random=()=>0;cannotDefer=prizeItems(false);ok=prizeItems()');
 assert.equal(h.run('cannotDefer'),false);assert.equal(h.run('ok'),true);
 assert.equal(h.run("g.owned.at(-1).id"),'ube-ensaymada');
});

test('paused orders keep fixed budgets while bakery purchases update totals; Resume commits Undo',()=>{
 const h=progressionHarness();h.run(`g.coins=1e9;g.completed=6;refillBoard();startTicket(g.board[0].id);budget=g.run.budget;id=g.run.ticket.id;abandonTicket();
 buyMenuSlot();slotTx=g.purchaseUndo.id;startTicket(id);denied=undoPurchase(slotTx);abandonTicket();before=bakeryValue();kitchen=upgradeEquipment('oven')`);
 assert.equal(h.run('denied'),false);assert.equal(h.run('g.run.budget'),h.run('budget'));assert.equal(h.run('kitchen'),true);assert.ok(h.run('bakeryValue()>before'));
});
