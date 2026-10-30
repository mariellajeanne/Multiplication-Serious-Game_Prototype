import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'..');
const source=f=>readFileSync(resolve(root,f),'utf8');

function addition({brokenMotion=false,brokenFeedback=false,invalidSum=false,oldImplementation=false}={}){
  const nodes=new Map(),warnings=[];
  const node=id=>{
    if(!nodes.has(id))nodes.set(id,{style:{},textContent:'1',innerHTML:'',offsetWidth:1,
      classList:{add(){},remove(){},toggle(){}},append(){},remove(){},
      closest:()=>null,getBoundingClientRect:()=>({left:0,top:0,width:70,height:70}),
      animate:()=>{if(brokenMotion)throw Error('Animation unavailable');return {finished:new Promise(()=>{})}}});
    return nodes.get(id);
  };
  const c=vm.createContext({console:{warn:(...args)=>warnings.push(args),error:()=>{}},
    setTimeout:fn=>{queueMicrotask(fn);return 1},clearTimeout(){},
    matchMedia:()=>({matches:false}),window:{},
    document:{createElement:()=>node(Symbol()),getElementById:node}});
  vm.runInContext(`const $=id=>document.getElementById(id),Q=selector=>$(selector);
    let s={a:79,b:18,B:[8,1],cols:4,phase:'sum',rows:[{0:${invalidSum?1:2},1:3,2:6},{0:0,1:9,2:7}],sum:{}},
      busy=false,run=1,additionStart=null,additionCollapsed=false,tutorial=false,money=0;
    const fmt=String;function snapshot(){}function render(){}function play(){}function status(){}function reset(){}
    Array.prototype.findLastIndex=undefined;`,c);
  vm.runInContext(source('worksheet/src/product-placement.js'),c);
  // Use the real arithmetic validation, not a permissive completion stub.
  vm.runInContext(source('worksheet/src/worksheet-render-and-tutorial.js').split(/\r?\n/).find(line=>line.startsWith('function finish()')),c);
  let script=source('worksheet/src/partial-product-addition.js').replace(/\r\n/g,'\n');
  if(oldImplementation)script=script.replace('let last=vals.length-1;while(last>=0&&vals[last]===0)last--;','const last=vals.findLastIndex(v=>v!==0);')
    .replace(" }catch(error){console.warn('Addition feedback interrupted; retaining the verified result.',error)}\n finally{await commitAdditionResult(token,vals)}",' await commitAdditionResult(token,vals);').replace(" try{\n play('mix');"," play('mix');");
  vm.runInContext(script,c);
  vm.runInContext('sleep=()=>Promise.resolve()',c);
  if(brokenFeedback)vm.runInContext('mergeIntoLowerColumn=()=>{throw Error("Interrupted feedback")}',c);
  return {c,warnings,play:()=>vm.runInContext('playCascadeAddition()',c),get:expression=>vm.runInContext(expression,c)};
}

test('reproduces the former final-addition lock when findLastIndex is unavailable',async()=>{
  const h=addition({oldImplementation:true});
  await assert.rejects(h.play(),/findLastIndex/);
  assert.equal(h.get('busy'),true);assert.equal(h.get('s.complete'),undefined);
});

test('carrying addition completes without findLastIndex or working animation APIs',async()=>{
  for(const config of [{},{brokenMotion:true},{brokenFeedback:true}]){
    const h=addition(config);await h.play();
    assert.equal(h.get('s.complete'),true);assert.equal(h.get('busy'),false);
    assert.equal(h.get('Object.entries(s.sum).reduce((n,[col,value])=>n+value*10**col,0)'),1422);
  }
});

test('animation recovery still rejects an incorrect mathematical result',async()=>{
  const h=addition({brokenFeedback:true,invalidSum:true});await h.play();
  assert.notEqual(h.get('s.complete'),true);assert.equal(h.get('busy'),false);
});

test('missing or rejected animation completion promises settle safely',async()=>{
  const c=vm.createContext({setTimeout,clearTimeout});
  vm.runInContext(source('worksheet/src/product-placement.js'),c);
  await vm.runInContext('settleWorksheetAnimation({},20)',c);
  await vm.runInContext('settleWorksheetAnimation({finished:Promise.reject(Error("cancelled"))},20)',c);
});
