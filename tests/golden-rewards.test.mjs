import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function shell(saved=null){
 const store=new Map(saved?[['panaderyaQuestV2',JSON.stringify(saved)]]:[]),sent=[];
 const frame={contentWindow:{postMessage:message=>sent.push(message)},style:{}};
 const c=vm.createContext({Math:Object.assign(Object.create(Math),{random:()=>.5}),Date,location:{origin:'http://local'},
  document:{getElementById:id=>id==='worksheetFrame'?frame:null},window:{addEventListener:()=>{}},setTimeout:()=>{},clearTimeout:()=>{},
  localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)}});
 for(const file of ['src/data/catalog.js','src/game/economy-balance.js','src/game/progression.js','src/game/golden-challenges.js','src/game/state.js','src/game/rewards.js','src/game/progression-economy.js','src/game/economy.js','src/ui/bakery-art.js','src/game/worksheet-bridge.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),c);
 const run=code=>vm.runInContext(code,c),json=code=>JSON.parse(JSON.stringify(run(code)));
 if(!saved)vm.runInContext("g.owned=[{uid:1,id:'pandesal',level:1,fusion:1,spent:0}];g.activeMenu=[1];g.menuSlots=1;g.recipeCeilings={pandesal:0};",c);
 run('render=()=>{};toast=()=>{};coinFly=()=>{};showModal=()=>{};if(!g.run){g.board=[{id:41,a:79,b:18,rarity:1,coinTier:1,base:176}];startTicket(41)}');
 const actions=index=>run(`worksheetActionKinds(g.run.steps[${index}]).map(kind=>({id:worksheetActionId(g.run.worksheetRewards.attemptId,g.run.steps[${index}].row,g.run.steps[${index}].col,kind),row:g.run.steps[${index}].row,col:g.run.steps[${index}].col,kind}))`);
 const message=(data,source=frame.contentWindow,origin='http://local')=>c.handleWorksheetMessage({source,origin,data:{source:'pq-worksheet',type:'state',attemptId:run('g.run?.worksheetRewards.attemptId'),errors:0,...data}});
 return {c,store,frame,sent,run,json,actions,message};
}
test('new production runs give no coins for connection, generation or individual placements',()=>{
 const h=shell(),list=h.actions(0);
 for(const action of list.filter(a=>a.kind!=='combo')){h.message({actions:[action]});assert.equal(h.run('g.run.pool'),0)}
 h.message({actions:list});assert.equal(h.run('g.run.stepCoins.baseTotal'),176);assert.equal(h.run('g.mathPractice.lifetimeCoins[1]'),1);
 h.message({actions:list});assert.equal(h.run('g.mathPractice.lifetimeCoins[1]'),1);
 assert.equal(h.run('g.run.stepCoins.receipts["0:0"].baseAmount'),176);
});
test('a full Golden bonus changes only that step value, not its odds or container count',()=>{
 const h=shell();h.run('step=g.run.steps[0];answer=ensureFactAnswer(g.run,step);answer.offered=true;answer.multiplier=5;acceptGoldenChallenge(g.run,step);submitGoldenAnswer(g.run,step,"72");odds=JSON.stringify(g.run.stepCoins.options)');
 h.message({actions:h.actions(0)});h.message({actions:h.actions(1)});
 assert.equal(h.run('g.run.stepCoins.baseTotal'),176*5+176);
 assert.equal(h.run('g.mathPractice.lifetimeCoins.reduce((sum,n)=>sum+n,0)'),2);
 assert.equal(h.run('JSON.stringify(g.run.stepCoins.options)'),h.run('odds'));
 assert.equal(h.run('g.run.pool'),Math.round((176*5+176)*1.2));
});
test('attempt resets, Normal retries, Undo-like snapshots and reload cannot farm receipts',()=>{
 const h=shell();h.message({actions:h.actions(0)});h.run('g.run.phase="failed";g.run.retriesLeft=2;retryRun()');h.message({actions:h.actions(0),done:0});
 assert.equal(h.run('g.mathPractice.lifetimeCoins[1]'),1);
 h.run('g.run.phase="failed";retryNormal()');h.message({actions:h.actions(0)});
 assert.equal(h.run('g.mathPractice.lifetimeCoins[1]'),1);
 const loaded=shell(h.json('g'));loaded.message({actions:loaded.actions(0)});assert.equal(loaded.run('g.mathPractice.lifetimeCoins[1]'),1);
});
test('completion waits for every procedural combo and settles the rounded boosted total once',()=>{
 const h=shell(),before=h.run('g.coins');
 assert.equal(h.run('creditCompletedOrder()'),false);
 h.message({type:'complete',ticket:h.run('g.run.ticket'),top:79,bottom:18,actions:[]});assert.equal(h.run('g.run.procedureComplete'),false);
 for(let i=0;i<4;i++)h.message({actions:h.actions(i)});
 const complete={type:'complete',ticket:h.run('g.run.ticket'),top:79,bottom:18,actions:[]};h.message(complete);h.message(complete);
 assert.equal(h.run('g.run.phase'),'engine');assert.equal(h.run('g.run.procedureComplete'),true);assert.equal(h.run('g.coins'),before);
 const total=h.run('stepCoinTotals(g.run).total');h.run('g.run.settlement={version:1,status:"pending"}');assert.equal(h.run('creditCompletedOrder()'),true);
 assert.equal(h.run('g.coins'),before+total);assert.equal(h.run('g.completed'),1);assert.equal(h.run('creditCompletedOrder()'),false);
 assert.equal(h.sent.filter(m=>m.type==='completion-ack').length,2,'A dropped ACK can be recovered without repeating rewards');
 const reloaded=shell(h.json('g'));assert.equal(reloaded.run('g.claimedOrders[41]!==undefined'),true);
});
test('foreign origins, frames, old attempts and invalid combo prerequisites award nothing',()=>{
 const h=shell(),actions=h.actions(0);h.message({actions},{},'http://local');h.message({actions},h.frame.contentWindow,'http://other');h.message({actions,attemptId:'old'});
 h.message({actions:actions.filter(a=>a.kind==='combo')});assert.equal(h.run('g.run.pool'),0);assert.equal(h.run('g.mathPractice.steps'),0);
});
test('a failed durable step write rolls back coins/counts and permits one clean retry',()=>{
 const h=shell();h.run('savedSetter=localStorage.setItem;localStorage.setItem=()=>{throw Error("quota")}');h.message({actions:h.actions(0)});
 assert.equal(h.run('g.mathPractice.steps'),0);assert.equal(h.run('g.run.stepCoins.baseTotal'),0);
 assert.equal(h.run('!!g.run.worksheetRewards.actions[worksheetActionId(g.run.worksheetRewards.attemptId,0,0,"combo")]'),false);
 h.run('localStorage.setItem=savedSetter');h.message({actions:h.actions(0)});assert.equal(h.run('g.mathPractice.steps'),1);
});
test('stale worksheet tabs cannot replace newer receipts or lifetime counts',()=>{
 const h=shell(),stale=h.json('g');h.message({actions:h.actions(0)});
 const other=shell(stale);other.store.set('panaderyaQuestV2',h.store.get('panaderyaQuestV2'));other.message({actions:other.actions(0)});
 assert.equal(other.run('g.mathPractice.steps'),0);assert.equal(other.run('save()'),false);
 assert.equal(JSON.parse(other.store.get('panaderyaQuestV2')).mathPractice.steps,1);
});
