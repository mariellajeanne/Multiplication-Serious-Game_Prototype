import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
function browser(){
 const store=new Map(),listeners=new Map(),calls=[];let invite,helpBody;
 const body={appendChild(el){invite=el;el.parentElement=body}};
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 const context={URLSearchParams,crypto:webcrypto,localStorage:storage,sessionStorage:storage,location:{search:'?cobaker=debug'},innerWidth:1280,innerHeight:800,
  document:{body,querySelector:()=>null,addEventListener:(e,fn)=>listeners.set(e,fn),
   getElementById:id=>id==='coBakerInvitations'?invite:id==='coBakerHelpBody'?helpBody:null,
   createElement:()=>({setAttribute(){},childElementCount:0,set innerHTML(s){this.childElementCount=s?1:0}})},
  addEventListener:()=>{},setInterval:()=>{},setTimeout:()=>{},performance:{now:()=>0},
  openSettings:()=>{},renderWorksheet:()=>'<main class="worksheet-modern"><div class="worksheet-header-actions"><button>Save & Exit</button></div></main>',
  g:{run:{phase:'engine',paused:false,procedureComplete:false}},
  showModal:(...args)=>{calls.push(args);helpBody=args[1].includes('coBakerHelpBody')?{dataset:{},innerHTML:''}:null}};
 context.window=context;
 const vmc=vm.createContext(context);
 for(const file of ['src/network/co-baker.js','src/network/coordinator.js','src/network/help-requests.js','src/network/baker-preferences.js','src/ui/co-baker.js','src/ui/co-baker-help.js'])
  vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),vmc);
 return {vmc,calls,storage,listeners,get helpBody(){return helpBody}};
}
test('worksheet header gains one Call for Help action without replacing engine or layout',()=>{
 const b=browser(),html=b.vmc.renderWorksheet();
 assert.match(html,/cobaker-help-button/);assert.match(html,/Save & Exit/);
 assert.equal((html.match(/Call for Help/g)||[]).length,1);
 assert.equal(typeof b.vmc.openCoBakerHelp,'function');
 assert.equal(b.vmc.panaderyaCoBaker.help.worksheet(),true);
});
test('available-to-help preference is separate from bakery save',()=>{
 const b=browser();b.vmc.panaderyaCoBaker.help.setAvailable(false);
 assert.equal(b.storage.getItem('panaderyaAvailableToHelpV1'),'false');
 assert.equal(b.storage.getItem('panaderyaQuestV2')!==null,false);
});


test('zero peers opens the empty-state dialog independently of network and coordinator readiness',()=>{
 for(const state of ['searching','disconnected','unavailable']){
  const b=browser();b.vmc.panaderyaCoBaker.status=state;b.vmc.panaderyaCoBaker.coordinator=null;
  b.vmc.openCoBakerHelp();
  assert.equal(b.calls.length,1);assert.equal(b.calls[0][0],'Call for Help');
  assert.match(b.helpBody.innerHTML,/No Bakers nearby yet!/);
  assert.match(b.helpBody.innerHTML,/data-help-action="find" disabled/);
  assert.equal(b.vmc.panaderyaCoBakerHelpDiagnostic,'Help popup rendered');
 }
});
test('unavailable service and inactive worksheet show feedback rather than silently ignoring the action',()=>{
 for(const mutate of [b=>b.vmc.panaderyaCoBaker=null,b=>b.vmc.g.run=null,b=>b.vmc.g.run.paused=true,b=>b.vmc.g.run.procedureComplete=true]){
  const b=browser();mutate(b);b.vmc.openCoBakerHelp();
  assert.equal(b.calls.length,1);assert.match(b.calls[0][1],/role="status"/);
  assert.match(b.vmc.panaderyaCoBakerHelpDiagnostic,/Feedback opened/);
 }
});
test('dialog exceptions are recorded and produce visible error feedback',()=>{
 const b=browser(),notices=[];b.vmc.showModal=()=>{throw new Error('test renderer failure')};b.vmc.toast=s=>notices.push(s);
 assert.doesNotThrow(()=>b.vmc.openCoBakerHelp());
 assert.match(b.vmc.panaderyaCoBakerHelpDiagnostic,/Handler error: test renderer failure/);
 assert.match(notices[0],/Could not open Co-Baker help/);
});

function click(b,dataset){const target={dataset,closest:()=>target,hasAttribute:()=>false};b.listeners.get('click')({target})}
const baker=(n,name)=>({id:String(n).padStart(32,'0'),name,number:'3720',available:true});
test('unified picker orders calls, favorites and others, renders all four counter fills without duplicates',()=>{
 const b=browser(),d=b.vmc.panaderyaCoBaker,h=d.help;
 const peers=[baker(1,'Zoe'),baker(2,'Bea'),baker(3,'Ada'),baker(4,'Cora')];for(const p of peers)d.candidates.set(p.id,p);h.preferences.toggle(peers[1]);b.vmc.openCoBakerHelp();
 for(let n=0;n<=3;n++){
  if(n){const p=peers[n-1];h.calls.set(p.id,{id:p.id,requestId:'f'.repeat(32),state:'calling',source:n===2?'random':'manual',expiresAt:Date.now()+15000})}
  h.changed();const html=b.helpBody.innerHTML;
  assert.match(html,new RegExp('aria-valuenow="'+n+'"'));assert.ok(html.includes('--call-fill:'+n/3*100+'%'));
  assert.equal((html.match(/data-baker=/g)||[]).length,4);assert.equal((html.match(/data-help-cancel=/g)||[]).length,n);
  for(const p of peers)assert.equal((html.match(new RegExp('data-baker="'+p.id+'"','g'))||[]).length,1);
  if(n<2)assert.ok(html.indexOf('Favorite Bakers</h3>')<html.indexOf('Other Bakers</h3>'));
  if(n===3){assert.match(html,/data-help-to="[^"]+" disabled>Call/);assert.match(html,/data-help-action="find" disabled/)}
 }
 assert.doesNotMatch(b.helpBody.innerHTML,/Call All|Baker.s Crew|role="tab"|Max Reached/);
});
test('heart on active row persists by UUID and never cancels its invitation',()=>{
 const b=browser(),h=b.vmc.panaderyaCoBaker.help,p=baker(8,'Bea');b.vmc.panaderyaCoBaker.candidates.set(p.id,p);h.calls.set(p.id,{id:p.id,requestId:'f'.repeat(32),state:'calling',source:'random',expiresAt:Date.now()+15000});b.vmc.openCoBakerHelp();
 click(b,{crew:p.id});assert.equal(h.calls.size,1);assert.equal(h.preferences.crew.has(p.id),true);assert.ok(b.helpBody.innerHTML.includes('aria-pressed="true"'));
 assert.equal(JSON.parse(b.storage.getItem('panaderyaCoBakerPreferencesV1')).crew[0].id,p.id);
 click(b,{crew:p.id});assert.equal(h.calls.size,1);assert.equal(h.preferences.crew.size,0);
});
test('learner removal uses delayed two taps in place and leaves worksheet state unchanged',()=>{
 const b=browser(),h=b.vmc.panaderyaCoBaker.help;let now=100000;h.clock=()=>now;h.active={sessionId:'a'.repeat(32),otherId:'b'.repeat(32),role:'Learner'};const before=JSON.stringify(b.vmc.g.run);b.vmc.openCoBakerHelp();
 click(b,{helpAction:'end'});assert.ok(h.active);assert.match(b.helpBody.innerHTML,/confirm-leave/);click(b,{helpAction:'end'});assert.ok(h.active);
 now+=650;click(b,{helpAction:'end'});assert.equal(h.active,null);assert.equal(JSON.stringify(b.vmc.g.run),before);
});
