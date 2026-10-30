import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..');
test('dialogs and repeated renders retain the live frame and all child state',()=>{
  let writes=0,frame=null;
  const nodes={modals:{innerHTML:''},walletCoins:{textContent:''}};
  nodes.app={set innerHTML(html){writes++;frame=html.includes('worksheetFrame')?
    {src:'',contentWindow:{state:{}}}:null;}};
  const context=vm.createContext({document:{getElementById:id=>id==='worksheetFrame'?frame:nodes[id]},
    localStorage:{getItem:()=>null,setItem:()=>{}},setInterval:()=>{},setTimeout:()=>{}});
  for(const file of ['src/data/catalog.js','src/game/state.js','src/ui/bakery-art.js'])
    vm.runInContext(readFileSync(resolve(root,file),'utf8'),context);
  vm.runInContext(`g.helpSeen=true;function renderLeft(){return ''}function renderRight(){return ''}
    function renderMenu(){return ''}function renderWorksheet(){return '<iframe id="worksheetFrame"></iframe>'}
    function tickStaff(){}`,context);
  vm.runInContext(readFileSync(resolve(root,'src/main.js'),'utf8'),context);
  vm.runInContext(`g.run={phase:'engine',ticket:{id:1}};render()`,context);
  const original=frame,initialWrites=writes;
  const states=[{first:{kind:'bottom',c:0}},
    {phase:'product',revealed:false},
    {phase:'product',revealed:true,onesPlaced:true,chosen:'tens',carryArmed:true,
      carrySlots:{1:{value:7,provisional:true}},rows:[{0:2}],tutorial:false},
    {phase:'sum',rows:[{0:2,1:3,2:6},{0:0,1:9,2:7}],busy:true}];
  for(const state of states){
    original.contentWindow.state=state;
    vm.runInContext(`showModal('Help','Step 1');showModal('Settings','Step 2');closeModal();render()`,context);
    assert.equal(frame,original);
    assert.equal(frame.contentWindow.state,state);
    assert.equal(writes,initialWrites);
  }
  vm.runInContext(`g.coins=999;render()`,context);
  assert.equal(nodes.walletCoins.textContent,'999');
  vm.runInContext(`g.run.phase='claim';render()`,context);
  assert.equal(writes,initialWrites+1,'claim transitions must still render');
  vm.runInContext(`g.run=null;render();g.run={phase:'engine',ticket:{id:2}};render()`,context);
  assert.notEqual(frame,original,'a new order must get a fresh worksheet');
});
