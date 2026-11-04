import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'..');
function ui(){
 const c=vm.createContext({Math:Object.create(Math),localStorage:{getItem:()=>null,setItem:()=>{}},
   document:{getElementById:()=>null},setTimeout:()=>{}});
 for(const file of ['src/data/catalog.js','src/game/progression.js','src/game/state.js','src/game/rewards.js','src/game/progression-economy.js','src/game/economy.js',
   'src/ui/bakery-art.js','src/ui/dialogs.js','src/ui/scene.js','src/ui/menu.js'])
   vm.runInContext(readFileSync(resolve(root,file),'utf8'),c);
 vm.runInContext(`showModal=(title,html)=>{result={title,html}};toast=()=>{};render=()=>{};
   closeModal=()=>{};Math.random=()=>{throw Error('Presentation must not consume reward RNG')}`,c);
 return c;
}
test('ticket preview uses actual math, guaranteed coins and named package types without consuming RNG',()=>{
 const c=ui();vm.runInContext(`g.board=[{id:8,a:79,b:18,rarity:1,base:304}];result=renderTickets()`,c);
 assert.match(c.result,/79 \u00d7 18/);assert.match(c.result,/365 base coins/);assert.match(c.result,/1\+ FREE/);assert.match(c.result,/Lucky/);assert.match(c.result,/Ticket Luck/);
});

test('sticky food preview shows actual contribution, mastery availability and price without ownership changes',()=>{
 const c=ui();vm.runInContext(`g.recipeCeilings.pandesal=2;openFoodItem(1);before=JSON.stringify(g.owned);result=renderFoodPanel();cost=foodLevelPrice(g.owned[0]);assignFood(1);after=JSON.stringify(g.owned);active=g.activeMenu.length`,c);
 assert.match(c.result,/1\.20/);assert.match(c.result,/0\.30/);assert.match(c.result,/Available \+2/);assert.equal(c.cost,255);assert.equal(c.before,c.after);assert.equal(c.active,1);
});

test('main navigation keeps menu, Food Index and packages accessible without exposing future features',()=>{
 const c=ui();vm.runInContext('result=renderLeft();menu=renderMenu();tickets=renderTickets()',c);
 assert.match(c.result,/GET MORE PACKAGES/);assert.match(c.menu,/menu-header/);assert.doesNotMatch(c.menu,/menu-heading|boost-hero/);assert.doesNotMatch(c.menu,/Kitchen|switchMenuTab|role="tab"/);assert.match(c.tickets,/openIndex/);assert.doesNotMatch(c.result,/Helper|Game modes/);
 vm.runInContext('g.completed=6;openSettings();settings=result.html',c);assert.match(c.settings,/openStaff/);assert.match(c.settings,/openModes/);
});

test('compact header counters open minimal Boost and Coins dialogs without changing progress',()=>{
 const c=ui();
 vm.runInContext(`g.bakeryLevel=14;g.owned[0].mastery=3;before=JSON.stringify(g);
  menu=renderMenu();showBoostInfo();boost=result;showCoinsInfo();coins=result;after=JSON.stringify(g)`,c);
 assert.equal(c.before,c.after);
 assert.equal(c.boost.title,"Baker's Boost 💎");
 assert.match(c.boost.html,/Total Menu 💎/);assert.match(c.boost.html,/Bakery Power 👑/);
 assert.match(c.boost.html,/id="menuBoostComponent">2\.28<\/strong>/);assert.match(c.boost.html,/id="bakeryPowerComponent">2\.89<\/strong>/);
 assert.doesNotMatch(c.boost.html,/Kitchen|<button|recipes|Equipped/);
 assert.equal(c.coins.title,'Coins 🪙');
 assert.equal(c.coins.html,'<div class="coins-help"><p>Complete orders to earn coins!</p><p>Your Baker\'s Boost multiplies the coins you earn.</p></div>');
 assert.match(c.menu,/<div class="menu-brand">.*My Panaderya.*menu-settings.*<div class="menu-counters">/);
});

test('food illustration and discovery renderers cover all catalog foods with named local art',()=>{
 const c=ui();vm.runInContext('result=FOOD.map(f=>({id:f.id,name:f.name,art:foodArt(f.id)}))',c);
 assert.equal(c.result.length,17);
 for(const food of c.result){assert.ok(food.art.includes(`aria-label="${food.name}"`));assert.match(food.art,/<svg/);}
});

test('collection sorts every owned food by rarity and actual contribution, with slots counted separately',()=>{
 const c=ui();vm.runInContext(`g.owned.push({uid:2,id:'pandesal',level:2,fusion:1,spent:145},{uid:3,id:'ensaymada',level:1,fusion:1,spent:0});result=renderMenu();order=sortedMenuFoods(g.owned).map(o=>o.uid);`,c);
 assert.deepEqual([...c.order],[3,2,1]);assert.equal((c.result.match(/data-uid=/g)||[]).length,3);assert.match(c.result,/1\/1 Slots Used/);assert.match(c.result,/is-unequipped/);assert.match(c.result,/is-equipped/);assert.match(c.result,/Hide Unequipped/);assert.match(c.result,/Equip Best/);
});

test('collection starts with no selection and uses long-press for the bulk action panel',()=>{
 const c=ui();vm.runInContext('openMenu();empty=renderFoodPanel();multiSelect=true;selectedFoods.add(1);panel=renderFoodPanel()',c);
 assert.equal(c.empty,'');assert.match(c.panel,/Select All/);assert.match(c.panel,/Deselect All/);assert.match(c.panel,/Unequip Selected/);assert.match(c.panel,/Sell/);
});

test('multi-add is capacity checked as a whole and ignores already equipped copies',()=>{
 const c=ui();vm.runInContext(`g.menuSlots=2;g.owned.push({uid:2,id:'monay',level:2,fusion:1,spent:400},
   {uid:3,id:'pandesal',level:1,fusion:0,spent:0});openMenu('add');
   toggleInventoryFood(1);toggleInventoryFood(2);toggleInventoryFood(3);before=JSON.stringify(g);overflow=addInventorySelection();after=JSON.stringify(g);
   toggleInventoryFood(3,false);accepted=addInventorySelection();repeated=addInventorySelection();active=[...g.activeMenu];`,c);
 assert.equal(c.overflow,false);assert.equal(c.before,c.after);
 assert.equal(c.accepted,true);assert.equal(c.repeated,false);assert.deepEqual([...c.active],[1,2]);
 assert.equal(vm.runInContext('g.owned[1].spent',c),400);
});

test('batch removal confirms once and keeps all copies, upgrades, coins and discoveries',()=>{
 const c=ui();vm.runInContext(`g.owned.push({uid:2,id:'monay',level:2,fusion:1,spent:400});g.activeMenu=[1,2];g.discovered.push('monay');
   openMenu();toggleInventoryFood(1);toggleInventoryFood(2);before=JSON.stringify({owned:g.owned,coins:g.coins,discovered:g.discovered});
   requestInventoryAction('remove');stillEquipped=g.activeMenu.length;prompt=result;
   accepted=confirmInventoryAction();again=confirmInventoryAction();after=JSON.stringify({owned:g.owned,coins:g.coins,discovered:g.discovered});`,c);
 assert.equal(c.stillEquipped,2);assert.match(c.prompt.html,/stop contributing/);
 assert.equal(c.before,c.after);assert.equal(c.accepted,true);assert.equal(c.again,false);
 assert.equal(vm.runInContext('g.activeMenu.length',c),0);
});

test('batch sale pays actual refunds once and saves remaining foods and discoveries',()=>{
 const c=ui();vm.runInContext(`g.owned.push({uid:2,id:'monay',level:2,fusion:1,spent:401},{uid:3,id:'pandesal',level:3,fusion:2,spent:900});
   g.activeMenu=[1,2,3];g.discovered.push('monay');openMenu();toggleInventoryFood(2);toggleInventoryFood(3);
   price=resalePrice(g.owned[1])+resalePrice(g.owned[2]);requestInventoryAction('sell');before=g.coins;prompt=result;
   localStorage.setItem=(key,value)=>{persisted={key,value}};accepted=confirmInventoryAction();again=confirmInventoryAction();`,c);
 assert.match(c.prompt.html,/whole copies and their upgrades/);assert.equal(c.accepted,true);assert.equal(c.again,false);
 const saved=JSON.parse(c.persisted.value);assert.equal(c.persisted.key,'panaderyaQuestV2');
 assert.equal(saved.coins,c.before+c.price);assert.deepEqual(saved.activeMenu,[1]);assert.equal(saved.owned.length,1);
 assert.deepEqual(saved.discovered,['pandesal','monay']);
});

test('cancel and stale batch confirmations cannot remove or sell changed foods',()=>{
 const c=ui();vm.runInContext(`openMenu();toggleInventoryFood(1);requestInventoryAction('sell');
   openMenu(inventoryIntent,true);cancelled=confirmInventoryAction();kept=inventorySelection.has(1);
   requestInventoryAction('sell');g.owned[0].level=2;before=JSON.stringify(g);stale=confirmInventoryAction();after=JSON.stringify(g);`,c);
 assert.equal(c.cancelled,false);assert.equal(c.kept,true);assert.equal(c.stale,false);assert.equal(c.before,c.after);
});

test('inventory batch mutations remain blocked during a live worksheet',()=>{
 const c=ui();vm.runInContext(`openMenu();toggleInventoryFood(1);requestInventoryAction('sell');g.run={phase:'engine'};
   before=JSON.stringify(g);add=addInventorySelection();remove=requestInventoryAction('remove');sale=confirmInventoryAction();after=JSON.stringify(g);`,c);
 assert.equal(c.before,c.after);assert.equal(c.add,false);assert.equal(c.remove,false);assert.equal(c.sale,false);
});

test('resolved packages consolidate duplicate discoveries and report actual Mastery capacity and Ticket Luck',()=>{
 const c=ui();vm.runInContext(`Math.random=()=>0;g.mastery=3;g.owned.push({uid:2,id:'monay',level:1,fusion:0,spent:0});
   g.run={ticket:{id:31,a:79,b:18},phase:'claim',chests:[{rarity:0},{rarity:1},{rarity:0}],pool:3004,correct:6,mistakes:0,mode:'normal'};
   before=g.coins;prizeItems();popup=result;prizeItems();after=g.coins;`,c);
 assert.equal(c.popup.title,'Order Ticket Resolved!');assert.match(c.popup.html,/Mastery unlocked!/);assert.match(c.popup.html,/\+3 Recipe Mastery upgrades unlocked/);
 assert.equal((c.popup.html.match(/>NEW!</g)||[]).length,0);
 assert.match(c.popup.html,/\+3,004/);assert.match(c.popup.html,/resolved-luck.*?<strong>\+1<\/strong>/);
 assert.match(c.popup.html,/Back to Bakery/);assert.equal(c.after,c.before+3004);
});

test('unequipping preserves food copies, upgrades and discovery',()=>{
 const c=ui();vm.runInContext(`g.owned.push({uid:2,id:'monay',level:2,fusion:1,spent:400});before=JSON.stringify(g.owned);cards=g.owned.map(o=>renderFoodCard(o)).join('');unassignFood(1);after=JSON.stringify(g.owned);`,c);
 assert.match(c.cards,/On menu/);assert.match(c.cards,/Unequipped/);assert.equal(c.before,c.after);assert.equal(vm.runInContext('g.activeMenu.length',c),0);
});

test('selling requires its consequence prompt and never removes the food discovery',()=>{
 const c=ui();vm.runInContext(`sellFoodPrompt(1);prompt=result;before=g.owned.length;
   sale=resalePrice(g.owned[0]);sellFood(1);openIndex();index=result;`,c);
 assert.equal(c.before,1);assert.match(c.prompt.html,/removes this copy and its upgrades/);
 assert.match(c.prompt.html,/Food Index/);assert.equal(c.index.title,'Food Index');
 assert.match(c.index.html,/Pandesal/);assert.match(c.index.html,/0 owned/);
 assert.equal(vm.runInContext('g.coins',c),250+c.sale);
 assert.equal(vm.runInContext('g.discovered.includes("pandesal")',c),true);
});

test('ticket arrival plays once per new ticket without consuming reward randomness',()=>{
 const c=ui();vm.runInContext(`g.board=[{id:8,a:79,b:18,rarity:1,base:304}];
   first=renderTickets();second=renderTickets();g.board.push({id:9,a:19,b:9,rarity:0,base:130});third=renderTickets();`,c);
 assert.equal((c.first.match(/ticket-arriving/g)||[]).length,1);
 assert.doesNotMatch(c.second,/ticket-arriving/);
 assert.equal((c.third.match(/ticket-arriving/g)||[]).length,1);
 assert.match(c.first,/aria-label="baking tray"/);
 vm.runInContext(`g.board.push({id:10,a:24,b:6,rarity:0,base:130});g.run={phase:'engine'};
   hidden=renderTickets();g.run=null;visible=renderTickets();`,c);
 assert.doesNotMatch(c.hidden,/ticket-arriving/);
 assert.equal((c.visible.match(/ticket-arriving/g)||[]).length,1,'arrivals wait until the board is visible');
});

test('reward arrival updates display even without animation promises and never changes accounting',()=>{
 for(const brokenMotion of [false,true]){
 const timers=new Map(),nodes=new Map();let sequence=0;
 const element=()=>({style:{},textContent:'',innerHTML:'',offsetWidth:1,
   classList:{add(){},remove(){}},appendChild(){},remove(){},animate(){if(brokenMotion)throw Error('No animation support');return {}},
   getBoundingClientRect:()=>({left:10,top:600,width:700,height:80})});
 for(const id of ['prizejar','pendingCoins','pendingLuck','pendingChests','chestTokens','chestChanceBar','chestChance'])nodes.set(id,element());
 const c=vm.createContext({document:{getElementById:id=>nodes.get(id),createElement:element,body:{appendChild(){}}},
   innerWidth:1000,innerHeight:800,matchMedia:()=>({matches:true}),
   setTimeout:fn=>{timers.set(++sequence,fn);return sequence},clearTimeout:id=>timers.delete(id)});
 vm.runInContext(`const $=id=>document.getElementById(id),fmt=n=>String(n),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
   const RARITIES=['Classic'],PACKAGE_TYPES=['Standard'];function renderChestTokens(){return ''}
   const g={run:{ticket:{rarity:0},phase:'engine',pool:12,luck:1,chests:[],steps:[{row:0}],index:0,worksheetRewards:{attemptId:'a'}}}`,c);
 vm.runInContext(readFileSync(resolve(root,'src/ui/reward-feedback.js'),'utf8'),c);
 vm.runInContext(`animateReward({attemptId:'a',coins:12,luck:1,pool:12,totalLuck:1,chests:[],index:0})`,c);
 assert.equal(nodes.get('pendingCoins').textContent,'');
 for(let i=0;i<4;i++){
   const [id,fn]=timers.entries().next().value;timers.delete(id);fn();
 }
 assert.equal(nodes.get('pendingCoins').textContent,'🪙 12');
 assert.equal(vm.runInContext('g.run.pool',c),12);
 assert.equal(vm.runInContext('rewardFlightsPending()',c),false);
 vm.runInContext(`animateReward({attemptId:'a',coins:12,luck:1,pool:12,totalLuck:1,chests:[],index:0});syncRewardPresentation()`,c);
 assert.equal(timers.size,0,'rerender/claim cancels old arrivals');
 }
});

test('direct card level-up charges the displayed progression cost without opening inventory',()=>{
 const c=ui();vm.runInContext(`g.coins=1000;g.recipeCeilings.pandesal=1;expected=foodLevelCost(g.owned[0]);menuOpened=0;openMenu=()=>menuOpened++;upgradeFood(1,true);
   result={coins:g.coins,level:g.owned[0].level,spent:g.owned[0].spent};`,c);
 assert.deepEqual(JSON.parse(JSON.stringify(c.result)),{coins:1000-c.expected,level:2,spent:c.expected});assert.equal(c.menuOpened,0);
});
test('unique recipe details offer ingredient upgrades and route legacy fusion links without creating copies',()=>{
 const c=ui();vm.runInContext(`g.completed=5;g.coins=10000;openFoodItem(1);panel=renderFoodPanel();
 expected=fusionFee(g.owned[0])+fusionIngredientCost(g.owned[0]);openFusion(1);popup=result.html;
 submitIngredientFusion();submitIngredientFusion();result={coins:g.coins,food:g.owned[0],owned:g.owned.length};`,c);
 assert.doesNotMatch(c.panel,/Fuse copies/);assert.match(c.panel,/Use ingredients/);assert.match(c.popup,/Buy missing/);
 assert.equal(c.result.coins,10000-c.expected);assert.equal(c.result.food.fusion,2);assert.equal(c.result.food.spent,c.expected);assert.equal(c.result.owned,1);
});

test('fusion refuses missing donors and previews the ingredient route at its actual cost',()=>{
 const c=ui();vm.runInContext(`g.completed=5;g.coins=10000;openMenu=()=>{};ingredientFusionInfo(1);
   popup=result.html;bad=duplicateFusionPlan(g.owned[0],999);expected=fusionFee(g.owned[0])+fusionIngredientCost(g.owned[0]);
   ingredientFusionInfo(1);submitIngredientFusion();again=submitIngredientFusion();result={coins:g.coins,tier:g.owned[0].fusion,spent:g.owned[0].spent};`,c);
 assert.match(c.popup,/Buy missing/);assert.equal(c.bad,null);assert.equal(c.again,false);
 assert.equal(c.result.coins,10000-c.expected);assert.equal(c.result.tier,2);assert.equal(c.result.spent,c.expected);
});

test('guide graduates once at the third claimed order and respects later opt-in',()=>{
 const c=ui();vm.runInContext(`g.completed=2;g.run={ticket:{id:31,a:79,b:18},phase:'claim',chests:[],pool:100,correct:1,mistakes:0,mode:'normal'};
   prizeItems();off=!g.tutorialArrows&&g.guideGraduated;
   g.tutorialArrows=true;g.run={ticket:{id:31,a:79,b:18},phase:'claim',chests:[],pool:100,correct:1,mistakes:0,mode:'normal'};
   prizeItems();on=g.tutorialArrows;roundtrip=JSON.parse(JSON.stringify(g));`,c);
 assert.equal(c.off,true);assert.equal(c.on,true);assert.equal(c.roundtrip.guideGraduated,true);assert.equal(c.roundtrip.tutorialArrows,true);
});
test('older established saves retain their explicit guide preference and original storage key',()=>{
 const original=ui();const saved=vm.runInContext(`(()=>{const old=fresh();old.completed=8;old.tutorialArrows=true;delete old.guideGraduated;return JSON.stringify(old)})()`,original);
 const c=vm.createContext({localStorage:{getItem:key=>{assert.equal(key,'panaderyaQuestV2');return saved}},document:{getElementById:()=>null}});
 for(const file of ['src/data/catalog.js','src/game/progression.js','src/game/state.js'])vm.runInContext(readFileSync(resolve(root,file),'utf8'),c);
 assert.equal(vm.runInContext('g.guideGraduated&&g.tutorialArrows',c),true);
});

test('a paused compositor cannot leave worksheet placement waiting forever',async()=>{
 let timeout,cleared=false;
 const c=vm.createContext({setTimeout:fn=>{timeout=fn;return 1},clearTimeout:()=>{cleared=true}});
 vm.runInContext(readFileSync(resolve(root,'worksheet/src/product-placement.js'),'utf8'),c);
 const pending=vm.runInContext('settleWorksheetAnimation({finished:new Promise(()=>{})},410)',c);
 timeout();await pending;
 await vm.runInContext('settleWorksheetAnimation({finished:Promise.resolve()},410)',c);
 assert.equal(cleared,true,'normal completion cancels the fallback');
});

test('separate coin and luck paths stay clear of the mathematical surface at wide and narrow widths',()=>{
 for(const width of [1280,390]){
  const timers=new Map(),created=[];let sequence=0;
  const rect=(left,top,w,h)=>({left,top,width:w,height:h,right:left+w,bottom:top+h});
  const frameRect=width===390?rect(12,220,366,400):rect(300,220,670,600);
  const element=r=>({style:{},classList:{add(){},remove(){}},offsetWidth:1,
    getBoundingClientRect:()=>r,appendChild(){},remove(){},animate(frames,options){this.animations??=[];this.animations.push({frames,options});return {}}});
  const dock=element(rect(width===390?60:400,900,260,70));
  const luck=element(rect(width*.5-130,100,260,50));
  const frame={getBoundingClientRect:()=>frameRect,worksheetSurface:{math:{x:.1,y:.05,w:.8,h:.8}}};
  const c=vm.createContext({innerWidth:width,innerHeight:1200,matchMedia:()=>({matches:false}),
    document:{getElementById:id=>id==='worksheetFrame'?frame:id==='prizejar'?dock:null,
      querySelector:selector=>selector==='.chest-luck-top'?luck:element(rect(10,190,width-20,28)),
      createElement:()=>{const el=element(rect(0,0,78,28));created.push(el);return el},body:{appendChild(){}}},
    setTimeout:fn=>{timers.set(++sequence,fn);return sequence},clearTimeout:id=>timers.delete(id)});
  vm.runInContext(`const $=id=>document.getElementById(id),fmt=String;const RARITIES=['Common'];const g={run:{worksheetRewards:{attemptId:'a'}}}`,c);
  vm.runInContext(readFileSync(resolve(root,'src/ui/reward-feedback.js'),'utf8'),c);
  vm.runInContext(`animateReward({attemptId:'a',coins:50,luck:1,point:{x:.5,y:.5}})`,c);
  assert.equal(created.length,2);assert.match(created[0].textContent,/50/);assert.match(created[1].textContent,/1/);
  const area=vm.runInContext(`rewardProtectedArea($('worksheetFrame'))`,c);
  const overlaps=(x,y,w,h)=>x<area.right&&x+w>area.left&&y<area.bottom&&y+h>area.top;
  for(const el of created){
    const x=parseFloat(el.style.left),y=parseFloat(el.style.top);
    assert.equal(overlaps(x,y,78,28),false,'recognition pause must not cover math');
  }
  for(let i=0;i<2;i++){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}
  for(const el of created){
    const keyframes=el.animations.at(-1).frames;
    const parse=k=>{const t=/translate\(([-\d.]+)(?:px)?,\s*([-\d.]+)(?:px)?\)/.exec(k.transform||'');return {x:t?Number(t[1]):0,y:t?Number(t[2]):0,s:Number(/scale\(([\d.]+)\)/.exec(k.transform||'')?.[1]||1)}};
    for(let i=1;i<keyframes.length;i++)for(let sample=0;sample<=20;sample++){
      const a=parse(keyframes[i-1]),b=parse(keyframes[i]),u=sample/20;
      const x=parseFloat(el.style.left)+a.x+(b.x-a.x)*u,y=parseFloat(el.style.top)+a.y+(b.y-a.y)*u,s=a.s+(b.s-a.s)*u;
      assert.equal(overlaps(x,y,78*s,28*s),false,'flight must route around math');
    }
  }
 }
});
