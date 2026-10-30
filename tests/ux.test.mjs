import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'..');
function ui(){
 const c=vm.createContext({Math:Object.create(Math),localStorage:{getItem:()=>null,setItem:()=>{}},
   document:{getElementById:()=>null},setTimeout:()=>{}});
 for(const file of ['src/data/catalog.js','src/game/state.js','src/game/rewards.js','src/game/economy.js',
   'src/ui/bakery-art.js','src/ui/dialogs.js','src/ui/scene.js','src/ui/menu.js'])
   vm.runInContext(readFileSync(resolve(root,file),'utf8'),c);
 vm.runInContext(`showModal=(title,html)=>{result={title,html}};toast=()=>{};render=()=>{};
   closeModal=()=>{};Math.random=()=>{throw Error('Presentation must not consume reward RNG')}`,c);
 return c;
}
test('order narrative and reward preview use real quantities without consuming reward RNG',()=>{
 const c=ui();
 vm.runInContext(`g.board=[{id:8,a:79,b:18,rarity:1,base:304}];result=renderTickets()`,c);
 assert.match(c.result,/79 × 18/);assert.match(c.result,/18 trays · 79 .* each/);
 assert.match(c.result,/365/);assert.match(c.result,/×1\.20/);
 assert.match(c.result,/Ticket luck/);
});
test('food preview shows actual next value and cost without changing saved ownership',()=>{
 const c=ui();vm.runInContext(`openFoodItem(1);before=JSON.stringify(g.owned)`,c);
 assert.match(c.result.html,/×1\.20/);assert.match(c.result.html,/×1\.44/);assert.match(c.result.html,/145/);
 assert.doesNotMatch(c.result.html,/Fusion ·/,'advanced controls stay hidden at first');
 vm.runInContext(`assignFood(1);after=JSON.stringify(g.owned);active=g.activeMenu.length`,c);
 assert.equal(c.before,c.after);assert.equal(c.active,1,'same copy cannot occupy two slots');
});
test('navigation introduces systems at existing thresholds and keeps collection accessible',()=>{
 const c=ui();vm.runInContext('result=renderLeft()',c);
 assert.doesNotMatch(c.result,/openIndex|openMenu/);
 vm.runInContext('menu=renderMenu()',c);
 assert.match(c.menu,/Food Inventory/);assert.match(c.menu,/Food Index/);
 assert.ok(c.menu.indexOf('food-navigation')<c.menu.indexOf('menu-grid'));
 assert.doesNotMatch(c.result,/onclick="openKitchen/);
 assert.doesNotMatch(c.result,/onclick="openModes/);
 vm.runInContext('g.completed=6;result=renderLeft()',c);
 for(const fn of ['openKitchen','openDecor','openStaff','openModes'])assert.ok(c.result.includes(fn));
});
test('food illustration and discovery renderers cover all catalog foods with named local art',()=>{
 const c=ui();vm.runInContext('result=FOOD.map(f=>({id:f.id,name:f.name,art:foodArt(f.id)}))',c);
 assert.equal(c.result.length,15);
 for(const food of c.result){assert.ok(food.art.includes(`aria-label="${food.name}"`));assert.match(food.art,/<svg/);}
});

test('menu sorts rarity then actual value, and puts slot controls before equipped foods',()=>{
 const c=ui();vm.runInContext(`g.owned.push({uid:2,id:'pandesal',level:2,fusion:0,spent:145},
   {uid:3,id:'ensaymada',level:1,fusion:0,spent:0});g.activeMenu=[1,2,3];
   result=renderMenu();order=sortedMenuFoods(g.owned).map(o=>o.uid);original=[...g.activeMenu];`,c);
 assert.deepEqual([...c.order],[3,2,1]);assert.deepEqual([...c.original],[1,2,3]);
 assert.ok(c.result.indexOf('Add food')<c.result.indexOf('data-uid="3"'));
 assert.ok(c.result.indexOf('Buy Slot')<c.result.indexOf('data-uid="3"'));
 assert.ok(c.result.indexOf('data-uid="3"')<c.result.indexOf('data-uid="2"'));
 assert.match(c.result,/food-management/);assert.match(c.result,/removeFoodPrompt\(3\)/);
 assert.match(c.result,/sellFoodPrompt\(3\)/);
});

test('inventory distinguishes equipped copies; removal confirms and preserves food investment',()=>{
 const c=ui();vm.runInContext(`g.owned.push({uid:2,id:'monay',level:2,fusion:1,spent:400});
   openMenu();inventory=result;removeFoodPrompt(1);prompt=result;before=JSON.stringify(g.owned);
   stillEquipped=g.activeMenu.includes(1);unassignFood(1);after=JSON.stringify(g.owned);`,c);
 assert.equal(c.inventory.title,'Food Inventory');
 assert.match(c.inventory.html,/On menu/);assert.match(c.inventory.html,/In inventory/);
 assert.equal((c.inventory.html.match(/data-uid=/g)||[]).length,2);
 assert.equal(c.prompt.title,'Remove from the menu?');assert.equal(c.stillEquipped,true);
 assert.match(c.prompt.html,/all its upgrades stay/);assert.equal(c.before,c.after);
 assert.equal(vm.runInContext('g.activeMenu.length',c),0);
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
   const RARITIES=['Common'];function renderChestTokens(){return ''}
   const g={run:{phase:'engine',pool:12,luck:1,chests:[],steps:[{row:0}],index:0,worksheetRewards:{attemptId:'a'}}}`,c);
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

test('direct card level-up charges the existing cost without opening inventory',()=>{
 const c=ui();vm.runInContext(`menuOpened=0;openMenu=()=>menuOpened++;upgradeFood(1,true);
   result={coins:g.coins,level:g.owned[0].level,spent:g.owned[0].spent};`,c);
 assert.deepEqual(JSON.parse(JSON.stringify(c.result)),{coins:105,level:2,spent:145});assert.equal(c.menuOpened,0);
});
test('fusion quantity is sequential tiers with exact fees and retained investment/level',()=>{
 const c=ui();vm.runInContext(`g.completed=5;g.coins=10000;g.owned[0].level=2;
   g.owned.push({uid:2,id:'pandesal',level:1,fusion:0,spent:100},{uid:3,id:'pandesal',level:2,fusion:0,spent:200});
   g.activeMenu=[1,2,3];openMenu=()=>{};openFusion(1,2);preview=duplicateFusionPlan(g.owned[0],2);
   submitDuplicateFusion();submitDuplicateFusion();result={coins:g.coins,food:g.owned[0],owned:g.owned.length,active:g.activeMenu};`,c);
 assert.equal(c.preview.fee,950);assert.equal(c.preview.nextTier,2);
 assert.equal(c.result.coins,9050);assert.equal(c.result.food.level,2);assert.equal(c.result.food.fusion,2);
 assert.equal(c.result.food.spent,1250);assert.equal(c.result.owned,1);assert.deepEqual([...c.result.active],[1]);
});
test('fusion refuses excess copies/tiers and keeps the ingredient route at its actual cost',()=>{
 const c=ui();vm.runInContext(`g.completed=5;g.coins=10000;openMenu=()=>{};openFusion(1);
   popup=result.html;bad=duplicateFusionPlan(g.owned[0],3);fuseIngredients(1);
   result={coins:g.coins,tier:g.owned[0].fusion,spent:g.owned[0].spent};`,c);
 assert.match(c.popup,/ingredientFusionInfo\(1\)/);assert.equal(c.bad,null);
 assert.equal(c.result.coins,9750);assert.equal(c.result.tier,1);assert.equal(c.result.spent,250);
});
test('guide graduates once at the third claimed order and respects later opt-in',()=>{
 const c=ui();vm.runInContext(`g.completed=2;g.run={phase:'claim',chests:[],pool:100,correct:1,mistakes:0,mode:'normal'};
   prizeItems();off=!g.tutorialArrows&&g.guideGraduated;
   g.tutorialArrows=true;g.run={phase:'claim',chests:[],pool:100,correct:1,mistakes:0,mode:'normal'};
   prizeItems();on=g.tutorialArrows;roundtrip=JSON.parse(JSON.stringify(g));`,c);
 assert.equal(c.off,true);assert.equal(c.on,true);assert.equal(c.roundtrip.guideGraduated,true);assert.equal(c.roundtrip.tutorialArrows,true);
});
test('older established saves retain their explicit guide preference and original storage key',()=>{
 const original=ui();const saved=vm.runInContext(`(()=>{const old=fresh();old.completed=8;old.tutorialArrows=true;delete old.guideGraduated;return JSON.stringify(old)})()`,original);
 const c=vm.createContext({localStorage:{getItem:key=>{assert.equal(key,'panaderyaQuestV2');return saved}},document:{getElementById:()=>null}});
 for(const file of ['src/data/catalog.js','src/game/state.js'])vm.runInContext(readFileSync(resolve(root,file),'utf8'),c);
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
