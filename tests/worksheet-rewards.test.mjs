import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..');
const source=file=>readFileSync(resolve(root,file),'utf8');
function shell(saved=null){
  const sent=[],store={};
  const frame={contentWindow:{postMessage:m=>sent.push(m)},style:{}};
  const context=vm.createContext({console,Math:Object.assign(Object.create(Math),{random:()=>.999}),
    document:{getElementById:id=>id==='worksheetFrame'?frame:null},
    window:{addEventListener:()=>{}},setTimeout:()=>{},
    localStorage:{getItem:()=>saved,setItem:(k,v)=>store[k]=v}});
  for(const f of ['src/data/catalog.js','src/game/state.js','src/game/rewards.js','src/game/economy.js','src/game/worksheet-bridge.js'])
    vm.runInContext(source(f),context);
  vm.runInContext(`render=()=>{};toast=()=>{};coinFly=()=>{};showModal=()=>{};
    if(!g.run){g.board=[{id:10,a:79,b:18,rarity:1,base:304}];startTicket(10);}`,context);
  const run=()=>vm.runInContext('g.run',context);
  const actions=(step,kinds)=>kinds.map(kind=>({id:`${run().worksheetRewards.attemptId}/${step.row}/${step.col}/${kind}`,row:step.row,col:step.col,kind}));
  const message=(m,from=frame.contentWindow)=>context.handleWorksheetMessage({source:from,data:{
    source:'pq-worksheet',attemptId:run()?.worksheetRewards.attemptId,...m}});
  const state=(list,extra={})=>message({type:'state',actions:list,step:'place',errors:0,done:0,...extra});
  return {context,frame,sent,store,run,actions,message,state};
}

test('unique domain actions reward once despite stages, repeated messages and reversed snapshots',()=>{
  const h=shell(),r=h.run(),step=r.steps[0];
  h.state([], {step:'connect'});assert.equal(r.pool,0);assert.equal(r.luck,0);
  const connect=h.actions(step,['connect']);h.state(connect);
  const earned={pool:r.pool,luck:r.luck};assert.ok(earned.pool>0);assert.equal(earned.luck,1);
  for(const stage of ['connect','fact','place','connect'])h.state(connect,{step:stage,carryUp:99});
  assert.equal(r.pool,earned.pool);assert.equal(r.luck,earned.luck);
  const rest=h.actions(step,['reveal','place-ones','carry-up']);h.state([...connect,...rest]);
  assert.equal(r.luck,5,'carry-up receives its own two Luck');
  const more=r.pool;h.state([...connect,...rest]);assert.equal(r.pool,more);assert.equal(r.luck,5);
  h.state(h.actions(step,['combo']));assert.equal(r.correct,2);assert.equal(r.bridgeDone,1);
  const sealed={pool:r.pool,luck:r.luck,chests:r.chests.length,correct:r.correct};
  h.state([],{done:0});h.state([...connect,...rest,...h.actions(step,['combo'])],{done:1});
  assert.deepEqual({pool:r.pool,luck:r.luck,chests:r.chests.length,correct:r.correct},sealed);
  const second=r.steps[1];h.state(h.actions(second,['connect','reveal','carry-down','place-ones','place-tens']));
  assert.equal(r.luck,sealed.luck+6,'distinct incoming carry and final tens retain their rewards');
});

test('invalid, stale-attempt and foreign-window actions cannot award or finish an order',()=>{
  const h=shell(),r=h.run(),valid=h.actions(r.steps[0],['connect']);
  h.message({type:'state',actions:valid,attemptId:'previous-attempt'});
  h.message({type:'state',actions:valid},{});
  h.state([{...valid[0],id:'bad-id'},...h.actions(r.steps[0],['carry-down','combo'])]);
  h.message({type:'complete',ticket:r.ticket,top:79,bottom:18,actions:[]});
  h.message({type:'complete',ticket:{id:-1},top:79,bottom:18,actions:valid});
  assert.equal(r.pool,0);assert.equal(r.luck,0);assert.equal(r.correct,0);assert.equal(r.phase,'engine');
});

test('ready/started retries do not reset rewards; reload retains ledger; retry gets a fresh attempt',()=>{
  const h=shell(),r=h.run(),list=h.actions(r.steps[0],['connect','reveal']);h.state(list);
  h.message({type:'ready'});h.message({type:'ready'});
  assert.equal(h.sent.filter(m=>m.type==='start').length,1);
  h.message({type:'started'});h.message({type:'started'});h.state(list);
  assert.equal(r.luck,2);
  const restored=shell(h.store.panaderyaQuestV2),rr=restored.run();restored.state(list);
  assert.equal(rr.luck,2);assert.equal(rr.pool,r.pool);
  const old=rr.worksheetRewards.attemptId;rr.phase='failed';rr.retriesLeft=2;
  restored.context.retryRun();assert.notEqual(rr.worksheetRewards.attemptId,old);
  restored.state(restored.actions(rr.steps[0],['connect']));assert.equal(rr.luck,1);
  restored.message({type:'state',actions:list,attemptId:old});assert.equal(rr.luck,1);
});

test('completion flushes unpolled actions, rolls each combo once and claims full budget exactly once',()=>{
  const h=shell(),r=h.run();
  const list=r.steps.flatMap(step=>h.actions(step,vm.runInContext(`worksheetActionKinds(g.run.steps[${r.steps.indexOf(step)}])`,h.context)));
  const complete={type:'complete',ticket:r.ticket,top:79,bottom:18,actions:list};
  h.message(complete);
  assert.equal(r.phase,'claim');assert.equal(r.pool,r.budget);assert.equal(r.correct,9);
  assert.equal(r.chests.length,1,'last combo guarantees a chest with deterministic missed earlier rolls');
  const luck=r.luck;h.message(complete);h.state(list);assert.equal(r.luck,luck);assert.equal(r.chests.length,1);
  const coins=vm.runInContext('g.coins',h.context),owned=vm.runInContext('g.owned.length',h.context);
  h.context.prizeItems();h.context.prizeItems();h.message(complete);
  assert.equal(vm.runInContext('g.coins',h.context),coins+r.budget);
  assert.equal(vm.runInContext('g.completed',h.context),1);
  assert.equal(vm.runInContext('g.owned.length',h.context),owned+1);
});

test('legacy aggregates are retained and conservatively baselined without changing the save key',()=>{
  const h=shell();vm.runInContext(`delete g.run.worksheetRewards;g.run.bridgeDone=1;
    g.run.bridgePrev={phase:'product'};g.run.pool=30;g.run.luck=4;g.run.correct=2;
    ensureWorksheetRewards(g.run);save()`,h.context);
  const r=h.run();h.state(r.steps.slice(0,2).flatMap(step=>h.actions(step,['connect','reveal','place-ones'])));
  assert.equal(r.pool,30);assert.equal(r.luck,4);assert.equal(r.correct,2);
  assert.ok(h.store.panaderyaQuestV2);
});

// Run the real worksheet state/placement functions with only rendering and motion
// stubbed. Async placement still commits on its actual microtask boundary.
function worksheet(){
  const elements=new Map(),messages=[];
  const element=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',style:{},
    innerHTML:'',append(){},classList:{add(){},remove(){},toggle(){}},setAttribute(){},
    getBoundingClientRect:()=>({left:0,top:0,width:50,height:50})});return elements.get(id);};
  const parent={postMessage:m=>messages.push(structuredClone(m))};
  const c=vm.createContext({console,structuredClone,performance,Option:function(){},
    setInterval:()=>{},setTimeout:()=>{},clearTimeout:()=>{},
    document:{getElementById:element,createElement:()=>element(Symbol()),querySelector:()=>null,
      querySelectorAll:()=>[],documentElement:{scrollHeight:600},body:{scrollHeight:600}},
    window:{parent,addEventListener:()=>{},__BATCH_TEST_FAST:true}});
  vm.runInContext(source('worksheet/src/state.js'),c);
  vm.runInContext(`function render(){}function clearMultiplyFx(){}function hidePreview(){}
    function startMultiplySequence(){}function finish(){s.complete=true;s.phase='complete';render()}
    play=()=>{};function revealProduct(){if(busy||s.revealed||s.phase!=='product')return;snapshot();s.revealed=true;render()}
    $('tryCustom').click=()=>{$('problem').value=$('customA').value+','+$('customB').value;reset()}`,c);
  vm.runInContext(source('worksheet/src/product-placement.js'),c);
  vm.runInContext(source('worksheet/src/parent-bridge.js'),c);
  vm.runInContext(`externalStart({id:10,a:79,b:18},'attempt-A')`,c);
  const exec=code=>vm.runInContext(code,c);
  const list=()=>{exec('bridgePoll()');return messages.filter(m=>m.type==='state').at(-1).actions;};
  const settle=async code=>{exec(code);await Promise.resolve();};
  return {c,exec,list,settle};
}

test('real worksheet accepted placements emit stable actions across undo, carry paths and async cancellation',async()=>{
  const w=worksheet();w.exec(`operand('bottom',0);operand('top',0);revealProduct()`);
  assert.deepEqual(w.list().map(a=>a.kind),['connect','reveal']);
  w.exec(`revealProduct();operand('top',0)`);assert.equal(w.list().length,2);
  await w.settle(`place('tens','slot',1)`);
  assert.equal(w.list().length,2,'optional temporary tens placement is not a bonus click');
  await w.settle(`liftTens()`);await w.settle(`place('ones','slot',0)`);
  assert.deepEqual(w.list().map(a=>a.kind),['connect','reveal','carry-up','place-ones','combo']);
  // Restore math before the combo, as undo does; telemetry must not restore rewards.
  w.exec(`s=history.pop().s;render()`);await w.settle(`place('ones','slot',0)`);
  assert.equal(w.list().length,5);
  w.exec(`operand('top',1);operand('bottom',0);revealProduct()`);
  await w.settle(`place('ones','slot',1)`);await w.settle(`addCarry('placed')`);
  await w.settle(`place('tens','slot',2)`);
  const second=w.list().filter(a=>a.col===1&&a.row===0);
  assert.deepEqual(second.map(a=>a.kind),['connect','reveal','place-ones','carry-down','place-tens','combo']);
  const before=w.list().length;w.exec(`externalStart({id:10,a:79,b:18},'attempt-A')`);
  assert.equal(w.exec('s.row'),1,'duplicate start must not reset state');assert.equal(w.list().length,before);
  w.exec(`externalStart({id:10,a:79,b:18},'attempt-B')`);assert.equal(w.list().length,0);
  w.exec(`operand('top',0);operand('bottom',0);revealProduct();place('ones','slot',0);run++`);
  await Promise.resolve();assert.equal(w.list().length,2,'cancelled async placement does not emit a reward');
});
