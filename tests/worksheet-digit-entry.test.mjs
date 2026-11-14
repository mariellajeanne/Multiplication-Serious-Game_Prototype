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
test('selection, editing, switching, Undo and session restoration retain unresolved mistake counts',()=>{
 const w=worksheet();w.connect();w.select('slot',1);w.enter(8);
 w.select('slot',0);w.exec(`worksheetDigitKey('7');worksheetDigitKey('Backspace');worksheetDigitKey('8');saved=window.getWorksheetSession();s=history.pop().s;render();revealProduct()`);
 assert.equal(w.exec('worksheetDigitEntry.guidance["0:0/ones"].mistakes'),1);
 w.exec(`externalStart({id:77,a:84,b:17},'A',true,saved)`);
 assert.equal(w.exec('worksheetDigitEntry.value'),'8');assert.deepEqual(w.json('worksheetDigitEntry.selected'),{kind:'slot',r:0,c:0});
 w.select('slot',2);w.enter(8);assert.match(w.exec('worksheetDigitEntry.feedback'),/ones column/);
 assert.equal(w.exec('worksheetDigitEntry.guidance["0:0/ones"].mistakes'),2);
});
test('carry additions reopen changed provisional digits and require typed replacements',()=>{
 const w=worksheet(19,9);w.connect();w.select('carry',1);w.enter(8);w.select('slot',0);w.enter(1);
 w.connect();w.select('slot',1);w.enter(9);assert.equal(w.exec('s.rows[0][1]'),9);
 w.exec(`addCarry('placed')`);assert.equal(w.exec('value()'),17);assert.equal(w.exec('s.rows[0][1]'),undefined);assert.equal(w.exec('s.onesPlaced'),false);
 w.select('slot',1);w.enter(7);assert.equal(w.exec('s.complete'),false);w.select('slot',2);w.enter(1);
 assert.equal(w.exec('s.complete'),true);assert.deepEqual(w.json('s.rows[0]'),{0:1,1:7,2:1});
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
