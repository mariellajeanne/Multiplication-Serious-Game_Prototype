import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
function browser(){
 const store=new Map(),listeners=new Map(),calls=[];let invite;
 const body={appendChild(el){invite=el}};
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 const context={URLSearchParams,crypto:webcrypto,localStorage:storage,sessionStorage:storage,location:{search:'?cobaker=debug'},
  document:{body,querySelector:()=>null,addEventListener:(e,fn)=>listeners.set(e,fn),
   getElementById:id=>id==='coBakerInvitations'?invite:null,
   createElement:()=>({setAttribute(){},childElementCount:0,set innerHTML(s){this.childElementCount=s?1:0}})},
  addEventListener:()=>{},setInterval:()=>{},setTimeout:()=>{},performance:{now:()=>0},
  openSettings:()=>{},renderWorksheet:()=>'<main class="worksheet-modern"><div class="worksheet-header-actions"><button>Save & Exit</button></div></main>',
  g:{run:{phase:'engine',paused:false,procedureComplete:false}},
  showModal:(...args)=>calls.push(args)};
 context.window=context;
 const vmc=vm.createContext(context);
 for(const file of ['src/network/co-baker.js','src/network/coordinator.js','src/network/help-requests.js','src/ui/co-baker.js'])
  vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),vmc);
 return {vmc,calls,storage};
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
