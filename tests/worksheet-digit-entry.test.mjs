import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function worksheet(a=84,b=17){
 const nodes=new Map(),listeners={},messages=[];
 const element=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',append(){},style:{},setAttribute(){},classList:{add(){},remove(){},toggle(){}},getBoundingClientRect:()=>({left:0,top:0,width:50,height:50})});return nodes.get(id)};
 const parent={postMessage:m=>messages.push(structuredClone(m))};
 const c=vm.createContext({console,structuredClone,performance,Option:function(){},setInterval(){},setTimeout(){},clearTimeout(){},location:{origin:'http://test'},document:{getElementById:element,createElement:()=>element(Symbol()),querySelector:()=>null,querySelectorAll:()=>[],documentElement:{scrollHeight:600},body:{scrollHeight:600,classList:{toggle(){}}}},window:{parent,__BATCH_TEST_FAST:true,addEventListener:(type,fn)=>listeners[type]=fn}});
 const exec=code=>vm.runInContext(code,c),json=code=>JSON.parse(JSON.stringify(exec(code)));
 exec(readFileSync(new URL('../worksheet/src/state.js',import.meta.url),'utf8'));
 exec(`function render(){if(worksheetExternalCalculator&&typeof syncWorksheetDigitEntry==='function')syncWorksheetDigitEntry()}function clearMultiplyFx(){}function hidePreview(){}function startMultiplySequence(){}function updateTutorial(){}function finish(){s.complete=true;s.phase='complete';render()}function revealProduct(){snapshot();s.revealed=true;render()}play=()=>{};$('tryCustom').click=()=>{$('problem').value=$('customA').value+','+$('customB').value;reset()}`);
 for(const file of ['product-placement.js','digit-entry.js','parent-bridge.js'])exec(readFileSync(new URL('../worksheet/src/'+file,import.meta.url),'utf8'));
 exec(`worksheetExternalCalculator=true;externalStart({id:77,a:${a},b:${b}},'A')`);
 const connect=()=>exec(`operand('top',s.k);operand('bottom',s.row);revealProduct();setWorksheetPlacementPath(true)`);
 const select=(kind,col,row=exec('s.row'))=>exec(`selectWorksheetDigit({kind:'${kind}',r:${row},c:${col}})`);
 const enter=n=>exec(`worksheetDigitKey('${n}');worksheetDigitKey('Enter')`);
 return {exec,json,connect,select,enter,messages,listeners,parent};
}
test('known answers leave every worksheet digit empty until a correct typed target is submitted',()=>{
 const w=worksheet();w.connect();assert.equal(w.exec('s.raw'),28);
 w.exec(`place('ones','slot',0)`);assert.deepEqual(w.json('s.rows'),[{}, {0:0}]);
 w.select('slot',0);w.exec(`worksheetDigitKey('8')`);assert.equal(w.exec('s.rows[0][0]'),undefined);
 w.exec(`worksheetDigitKey('Backspace');worksheetDigitKey('Enter')`);assert.equal(w.exec('bridgeMetrics.errors'),0);
 w.enter(8);assert.equal(w.exec('s.rows[0][0]'),8);assert.equal(w.exec('s.done'),0);
 w.select('carry',1);w.enter(2);assert.equal(w.exec('s.done'),1);assert.equal(w.exec('s.phase'),'select');
 assert.equal(w.exec('s.A[s.k]*s.B[s.row]'),56,'After 4 × 7 the next pair is 8 × 7 and needs a connection');
});
test('submitted wrong digits/columns/carry positions progress through actual-action guidance, never autofilling',()=>{
 const w=worksheet();w.connect();w.select('slot',2);w.enter(8);assert.equal(w.exec('worksheetDigitEntry.feedback'),'Try again!');
 w.select('slot',0);w.enter(2);assert.match(w.exec('worksheetDigitEntry.feedback'),/carry row/);
 w.select('carry',0);w.enter(8);assert.equal(w.exec('worksheetDigitEntry.feedback'),'Put 8 in the ones column.');
 assert.equal(w.exec('worksheetDigitEntry.level'),3);assert.equal(w.exec('s.done'),0);assert.deepEqual(w.json('s.rows[0]'),{});
 w.select('slot',0);w.enter(8);w.select('carry',0);w.enter(2);
 assert.equal(w.exec('worksheetDigitEntry.feedback'),'Try again!','The next placement starts at feedback level one');
 w.select('carry',1);w.enter(2);assert.equal(w.exec('s.done'),1);
});
test('legacy draft migration and Undo retain unresolved mistake counts without writing an old draft',()=>{
 const w=worksheet();w.connect();w.select('slot',1);w.enter(8);
 w.select('slot',0);w.exec(`worksheetDigitKey('7');worksheetDigitKey('Backspace');worksheetDigitKey('8');saved=window.getWorksheetSession();s=history.pop().s;render();revealProduct()`);
 assert.equal(w.exec('worksheetDigitEntry.guidance["0:0/ones"].mistakes'),1);
 w.exec(`externalStart({id:77,a:84,b:17},'A',true,saved)`);
 assert.equal(w.exec('worksheetDigitEntry.value'),'');assert.equal(w.exec('worksheetDigitEntry.selected'),null);
 w.select('slot',2);w.enter(8);assert.match(w.exec('worksheetDigitEntry.feedback'),/ones column/);
 assert.equal(w.exec('worksheetDigitEntry.guidance["0:0/ones"].mistakes'),2);
});
test('a provisional ones digit accepts its carry without advancing or requiring re-entry',()=>{
 const w=worksheet(19,9);w.connect();w.select('carry',1);w.enter(8);w.select('slot',0);w.enter(1);
 w.connect();assert.equal(w.exec(`worksheetDropDigit('ones',{kind:'slot',r:0,c:1},9)`),true);assert.equal(w.exec('s.rows[0][1]'),9);assert.equal(w.exec('s.done'),1);
 w.exec(`addCarry('placed')`);assert.equal(w.exec('value()'),17);assert.equal(w.exec('s.rows[0][1]'),7);assert.equal(w.exec('s.onesPlaced'),true);
 assert.equal(w.exec('s.complete'),false);w.select('slot',2);w.enter(1);
 assert.equal(w.exec('s.complete'),true);assert.deepEqual(w.json('s.rows[0]'),{0:1,1:7,2:1});
});
test('both carry orders produce identical rows across zeros, overflow and long shifted products',()=>{
 for(const [a,b] of [[97,28],[84,47],[19,9],[178,7],[64,7],[1005,24],[99999,99],[305,4],[248,26]]){
  const rows=[];
  for(const after of [false,true]){
   const w=worksheet(a,b);let guard=0;
   while(w.exec('s.phase')!=='sum'&&w.exec('s.phase')!=='complete'){
    assert.ok(++guard<30);w.connect();
    if(w.exec('s.incoming&&!s.mixed')){
     if(after){w.exec(`worksheetDropDigit('ones',{kind:'slot',r:s.row,c:currentCol()},ones())`);assert.equal(w.exec('s.phase'),'product');w.exec("addCarry('placed')")}
     else w.exec("addCarry('floating')");
    }
    w.exec(`if(!s.onesPlaced)worksheetDropDigit('ones',{kind:'slot',r:s.row,c:currentCol()},ones())`);
    if(w.exec("s.phase==='product'&&tens()>0&&!s.tensPlaced"))w.exec(`worksheetDropDigit('tens',lastDigit()?{kind:'slot',r:s.row,c:currentCol()+1}:{kind:'carry',c:s.k+1},tens())`);
   }
   const actual=w.json('s.rows');rows.push(actual);assert.equal(actual.reduce((sum,row)=>sum+Object.entries(row).reduce((n,[c,v])=>n+v*10**c,0),0),a*b);
  }
  assert.deepEqual(rows[0],rows[1],`${a} x ${b}`);
 }
});
test('carry overflow updates provisional outgoing tens and survives saved-session restoration',()=>{
 const w=worksheet(178,7);w.connect();w.exec(`worksheetDropDigit('ones',{kind:'slot',r:0,c:0},6);worksheetDropDigit('tens',{kind:'carry',c:1},5)`);w.connect();
 w.exec(`worksheetDropDigit('ones',{kind:'slot',r:0,c:1},9);worksheetDropDigit('tens',{kind:'carry',c:2},4);saved=window.getWorksheetSession()`);
 assert.equal(w.exec('s.done'),1);assert.equal(w.exec('s.carrySlots[2].provisional'),true);
 w.exec(`externalStart({id:77,a:178,b:7},'A',true,saved);worksheetCarryTarget({kind:'slot',r:0,c:1})`);
 assert.equal(w.exec('s.rows[0][1]'),4);assert.equal(w.exec('s.carrySlots[2].value'),5);assert.equal(w.exec('s.done'),2);
 w.exec('s=history.pop().s;render()');assert.equal(w.exec('s.mixed'),false);assert.equal(w.exec('s.rows[0][1]'),9);assert.equal(w.exec('s.carrySlots[2].value'),4);
 w.exec(`worksheetCarryTarget({kind:'slot',r:0,c:1})`);w.connect();w.exec(`addCarry('floating');worksheetDropDigit('ones',{kind:'slot',r:0,c:2},2);worksheetDropDigit('tens',{kind:'slot',r:0,c:3},1)`);
 assert.equal(w.exec('s.complete'),true);assert.deepEqual(w.json('s.rows[0]'),{0:6,1:4,2:2,3:1});
});

test('wrong carry targets use progressive hints; a resolved or replayed carry cannot add twice',()=>{
 const w=worksheet(97,28);w.connect();w.exec(`worksheetDropDigit('ones',{kind:'slot',r:0,c:0},6);worksheetDropDigit('tens',{kind:'carry',c:1},5)`);w.connect();
 for(let i=1;i<=3;i++){assert.equal(w.exec(`worksheetCarryTarget({kind:'slot',r:0,c:3})`),false);assert.equal(w.exec('worksheetDigitEntry.level'),i);assert.equal(w.exec('s.done'),1)}
 assert.match(w.exec('worksheetDigitEntry.feedback'),/carry 5/);
 w.exec(`worksheetDropDigit('ones',{kind:'slot',r:0,c:1},2);worksheetCarryTarget({kind:'slot',r:0,c:1})`);
 assert.equal(w.exec('s.rows[0][1]'),7);const resolved=w.json('s');w.exec("addCarry('placed')");assert.deepEqual(w.json('s'),resolved);
 w.exec('s=history.pop().s;render()');assert.equal(w.exec('s.mixed'),false);assert.equal(w.exec('s.rows[0][1]'),2);
 w.exec(`worksheetCarryTarget({kind:'slot',r:0,c:1})`);assert.equal(w.exec('s.rows[0][1]'),7);assert.equal(w.exec('s.done'),1);
});
test('Golden placement feedback and authenticated digit messages cannot spend fact attempts or duplicate seals',()=>{
 const w=worksheet();w.connect();w.exec('setWorksheetPlacementPath(false)');w.select('slot',2);w.enter(8);
 assert.match(w.exec('worksheetDigitEntry.feedback'),/ones column/);assert.equal(w.exec('s.done'),0);
 w.select('slot',0);
 const message={source:w.parent,origin:'http://test',data:{source:'bc-shell',type:'digit-key',attemptId:'A',row:0,col:0,key:'8'}};
 w.listeners.message({...message,origin:'http://foreign'});assert.equal(w.exec('worksheetDigitEntry.value'),'');
 w.listeners.message({...message,data:{...message.data,attemptId:'stale'}});assert.equal(w.exec('worksheetDigitEntry.value'),'');
 w.listeners.message(message);w.enter(8);w.select('carry',1);w.enter(2);w.exec(`worksheetDigitKey('Enter');bridgePoll()`);
 assert.equal(w.exec('s.done'),1);assert.equal(w.messages.filter(m=>m.type==='state').at(-1).actions.filter(a=>a.kind==='combo').length,1);
});
test('dragged equal digits are separate instances and Undo restores only the reverted instance',()=>{
 const w=worksheet(64,7);w.connect();w.exec(`worksheetDropDigit('ones',{kind:'slot',r:0,c:0},8);worksheetDropDigit('tens',{kind:'carry',c:1},2)`);w.connect();w.exec("addCarry('floating')");
 // 6 × 7 + 2 = 44: identical tiles may occupy either valid position.
 assert.equal(w.exec(`worksheetDropDigit('tens',{kind:'slot',r:0,c:1},4)`),true);
 assert.equal(w.exec(`worksheetDropDigit('tens',{kind:'slot',r:0,c:2},4)`),false,'Consumed source cannot be reused');
 assert.equal(w.exec(`worksheetDropDigit('ones',{kind:'slot',r:0,c:2},4)`),true);
 w.exec('s=history.pop().s;render()');
 assert.deepEqual(w.json('s.digitSources["0:1"]'),{ones:'tens'});
 assert.equal(w.exec(`worksheetDropDigit('ones',{kind:'slot',r:0,c:2},4)`),true);
});
test('temporary written tens remain movable to carry without duplicating their source',()=>{
 const w=worksheet(84,47);w.connect();
 assert.equal(w.exec(`worksheetDropDigit('tens',{kind:'slot',r:0,c:1},2)`),true);
 assert.equal(w.exec(`worksheetDropDigit('ones',{kind:'slot',r:0,c:0},8)`),true);assert.equal(w.exec('s.done'),0);
 assert.equal(w.exec(`worksheetDropDigit('tens',{kind:'carry',c:1},2)`),true);assert.equal(w.exec('s.done'),1);
 assert.equal(w.exec('s.rows[0][1]'),undefined);assert.equal(w.exec('s.carrySlots[1].value'),2);
});

test('V19: 9 × 0 produces a real zero digit that can be placed, not a blank result',()=>{
 const w=worksheet(9,10);w.connect();
 assert.equal(w.exec('s.raw'),0);assert.equal(w.exec('ones()'),0);
 assert.equal(w.exec("worksheetDropDigit('ones',{kind:'slot',r:0,c:0},0)"),true);
 assert.equal(w.exec('s.rows[0][0]'),0);
 assert.equal(w.exec('s.done'),1);
});
test('V19: 6 × 7 yields separate ones 2 and tens 4 placements',()=>{
 const w=worksheet(6,7);w.connect();assert.equal(w.exec('s.raw'),42);
 assert.equal(w.exec("worksheetDropDigit('ones',{kind:'slot',r:0,c:0},2)"),true);
 assert.equal(w.exec("worksheetDropDigit('tens',{kind:'slot',r:0,c:1},4)"),true);
 assert.equal(w.exec('s.complete'),true);
 assert.deepEqual(w.json('s.rows[0]'),{0:2,1:4});
});
test('V19: 79 × 18 mixed carry, Undo, and save/resume keep math valid',()=>{
 const w=worksheet(79,18);w.connect();
 // 9 × 8 = 72, place the 2 and carry 7.
 assert.equal(w.exec('s.raw'),72);
 assert.equal(w.exec("worksheetDropDigit('ones',{kind:'slot',r:0,c:0},2)"),true);
 assert.equal(w.exec("worksheetDropDigit('tens',{kind:'carry',c:1},7)"),true);
 assert.equal(w.exec('s.done'),1);
 w.connect();assert.equal(w.exec('s.raw'),56);
 // Allow ones placement before bringing the incoming 7 carry down.
 assert.equal(w.exec("worksheetDropDigit('ones',{kind:'slot',r:0,c:1},6)"),true);
 w.exec('saved=window.getWorksheetSession()');
 w.exec('s=history.pop().s;render()');
 assert.equal(w.exec('s.onesPlaced'),false);
 w.exec("externalStart({id:77,a:79,b:18},'A',true,saved)");
 assert.equal(w.exec('s.onesPlaced'),true);
 assert.equal(w.exec("worksheetCarryTarget({kind:'slot',r:0,c:1})"),true);
 assert.equal(w.exec('s.rows[0][1]'),3);
});
