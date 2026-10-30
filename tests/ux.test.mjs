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
 assert.match(c.result,/79 × 18/);assert.match(c.result,/18 trays · 79 each/);
 assert.match(c.result,/365/);assert.match(c.result,/4 pairs/);
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
 assert.match(c.result,/openIndex/);assert.doesNotMatch(c.result,/onclick="openKitchen/);
 assert.doesNotMatch(c.result,/onclick="openModes/);
 vm.runInContext('g.completed=6;result=renderLeft()',c);
 for(const fn of ['openKitchen','openDecor','openStaff','openModes'])assert.ok(c.result.includes(fn));
});
test('food illustration and discovery renderers cover all catalog foods with named local art',()=>{
 const c=ui();vm.runInContext('result=FOOD.map(f=>({id:f.id,name:f.name,art:foodArt(f.id)}))',c);
 assert.equal(c.result.length,15);
 for(const food of c.result){assert.ok(food.art.includes(`aria-label="${food.name}"`));assert.match(food.art,/<svg/);}
});

test('reward arrival updates display even without animation promises and never changes accounting',()=>{
 const timers=new Map(),nodes=new Map();let sequence=0;
 const element=()=>({style:{},textContent:'',innerHTML:'',offsetWidth:1,
   classList:{add(){},remove(){}},appendChild(){},remove(){},animate(){return {}},
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
 for(let i=0;i<2;i++){
   const [id,fn]=timers.entries().next().value;timers.delete(id);fn();
 }
 assert.equal(nodes.get('pendingCoins').textContent,'🪙 12');
 assert.equal(vm.runInContext('g.run.pool',c),12);
 assert.equal(vm.runInContext('rewardFlightsPending()',c),false);
 vm.runInContext(`animateReward({attemptId:'a',coins:12,luck:1,pool:12,totalLuck:1,chests:[],index:0});syncRewardPresentation()`,c);
 assert.equal(timers.size,0,'rerender/claim cancels old arrivals');
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
