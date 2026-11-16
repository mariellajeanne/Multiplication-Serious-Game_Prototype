import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
function browser(){
 const store=new Map(),listeners=new Map(),calls=[];let invite,helpBody;
 const body={appendChild(el){invite=el}};
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 const context={URLSearchParams,crypto:webcrypto,localStorage:storage,sessionStorage:storage,location:{search:'?cobaker=debug'},
  document:{body,querySelector:()=>null,addEventListener:(e,fn)=>listeners.set(e,fn),
   getElementById:id=>id==='coBakerInvitations'?invite:id==='coBakerHelpBody'?helpBody:null,
   createElement:()=>({setAttribute(){},childElementCount:0,set innerHTML(s){this.childElementCount=s?1:0}})},
  addEventListener:()=>{},setInterval:()=>{},setTimeout:()=>{},performance:{now:()=>0},
  openSettings:()=>{},renderWorksheet:()=>'<main class="worksheet-modern"><div class="worksheet-header-actions"><button>Save & Exit</button></div></main>',
  g:{run:{phase:'engine',paused:false,procedureComplete:false}},
  showModal:(...args)=>{calls.push(args);helpBody=args[1].includes('coBakerHelpBody')?{dataset:{},innerHTML:''}:null}};
 context.window=context;
 const vmc=vm.createContext(context);
 for(const file of ['src/network/co-baker.js','src/network/coordinator.js','src/network/help-requests.js','src/ui/co-baker.js'])
  vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),vmc);
 return {vmc,calls,storage,get helpBody(){return helpBody}};
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
  assert.match(b.helpBody.innerHTML,/data-help-action="all" disabled/);
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
