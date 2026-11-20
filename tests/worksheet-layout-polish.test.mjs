import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=new URL('../src/ui/worksheet-components.js',import.meta.url);
const context={};
runInNewContext(readFileSync(source,'utf8'),context);
const ui=context.WorksheetComponents;

test('helper keeps reward details accessible without enabling worksheet actions',()=>{
 const reward=ui.rewards([{rank:1,name:'Coin Cart',count:4,chance:.7,base:432}]);
 const readOnly=ui.readOnly(reward+ui.workspace({done:0,total:6,complete:false,actions:'<button onclick="doSomething()">Call</button>'}));
 assert.match(readOnly,/class="reward-info"/);
 assert.doesNotMatch(readOnly,/disabled aria-disabled="true"[^>]*class="reward-info"/);
 assert.match(readOnly,/data-ticket-count="1"[^>]*>4<\/b>/);
 assert.match(readOnly,/>70%<\/span>/);
 assert.match(readOnly,/button disabled aria-disabled="true"[^>]*data-worksheet-control="undo"/);
 assert.match(readOnly,/button disabled aria-disabled="true"[^>]*id="collectRewards"/);
 assert.doesNotMatch(readOnly,/ onclick=/);
});

test('worksheet grid sizing preserves minimum touch targets across operand lengths',()=>{
 for(const [rows,cols,available,width] of [
  [1,2,790,650], [2,4,910,900], [2,5,620,520], [2,7,240,340], [2,7,180,250]
 ]){
  const gap=6,byWidth=Math.floor((width-100-gap*(cols-1))/cols);
  const layout=ui.layout({rows,cols,available,byWidth,minArea:0,gap});
  assert.ok(layout.cell>=44 && layout.cell<=148,JSON.stringify([rows,cols,layout]));
  assert.ok(layout.height>=layout.cell*3);
  assert.ok(layout.area>=cols*layout.cell+(cols-1)*gap+90);
  // Short screens use bounded scrolling instead of shrinking below 44px.
  if(layout.height>available)assert.equal(layout.cell,44);
 }
});


test('bottom-right action occupies a single slot across the order lifecycle',()=>{
 const toolbar='<div class="worksheet-header-actions"><button class="worksheet-settings">Settings</button><button class="cobaker-help-button">Call for Help</button></div><button id="worksheetSaveExit">Save &amp; Exit</button>';
 const active=ui.workspace({done:1,total:6,complete:false,actions:toolbar});
 const finished=ui.workspace({done:6,total:6,complete:true,actions:toolbar});
 assert.match(active,/id="worksheetSaveExit"/);
 assert.match(active,/id="collectRewards"[^>]*disabled hidden/);
 assert.match(finished,/id="collectRewards"[^>]*onclick="beginWorksheetSettlement/);
 assert.doesNotMatch(finished,/id="collectRewards"[^>]*disabled/);
 assert.match(ui.readOnly(active),/button disabled aria-disabled="true"[^>]*id="worksheetSaveExit"/);
});

test('worksheet lifecycle toggles Save & Exit and Complete Order without changing payout handler',()=>{
 const implementation=readFileSync(new URL('../src/ui/worksheet-experience.js',import.meta.url),'utf8');
 assert.match(implementation,/complete\.hidden=!r\.procedureComplete/);
 assert.match(implementation,/exit\.hidden=!!r\.procedureComplete/);
 assert.match(implementation,/id="worksheetSaveExit"/);
 assert.match(implementation,/onclick="abandonTicket\(\)"/);
});
