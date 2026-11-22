import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import '../src/ui/worksheet-components.js';
import '../src/network/worksheet-observation.js';
import '../src/network/helper-rewards.js';

const source = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const state = {
 a:79,b:18,A:[9,7],B:[8,1],cols:4,row:0,k:0,first:null,phase:'product',
 revealed:true,raw:72,mixed:false,incoming:0,onesPlaced:false,tensPlaced:false,
 tensLocation:null,chosen:null,carrySlots:{},rows:[{},{}],sum:{},sumCol:0,
 sumCarry:0,done:0,boxes:0,complete:false,carryArmed:false,
 expressionOrder:[8,9],expressionActivated:true,goldenOffer:false
};
const calculator={mode:'fact',expression:'8 × 9',display:'72',carryEquation:'',golden:false,
 manual:false,offered:false,multiplier:1,tray:{waiting:0,armed:false,label:'Place the digits',
 digits:[{part:'tens',value:7},{part:'ones',value:2}],selected:null,demo:false,demoDigit:'2'},
 status:'Drag the digits into the correct places.',placementError:false,generate:false,active:true,guide:true};
const presentation={order:{foodId:'pandesal',sprite:1},rewards:[{rank:0,name:'Coin Stack',chance:.6,base:100,count:0}],
 calculator,phase:'place',tutorial:true,guideLevel:2,
 entry:{selected:null,value:'',feedback:'',level:0,hintTargets:[]}};

test('the production observer snapshot with order art, coin options, and expression state is valid',()=>{
 const snap={schema:2,state,presentation};
 assert.equal(CoBakerWorksheet.validSnapshot(snap),true);
 assert.deepEqual(CoBakerWorksheet.snapshot({state},presentation),snap);
 for(const item of [
  {state:{...state,expressionOrder:[8,18]}},
  {state:{...state,expressionActivated:'yes'}},
  {presentation:{...presentation,order:{...presentation.order,sprite:18}}},
  {presentation:{...presentation,rewards:[{...presentation.rewards[0],coins:500}]}}
 ])assert.equal(CoBakerWorksheet.validSnapshot({...snap,...item}),false);
 const native=source('android/app/src/main/java/com/mypanaderya/game/LanDiscovery.java');
 // JVM regression in LanProtocolTest exercises the real native parser. Check
 // that the two native schema entry points were updated, not only JavaScript.
 for(const field of ['expressionOrder','expressionActivated','goldenOffer','"order"','"rewards"'])
  assert.ok(native.includes(field),`Native validator still missing ${field}`);
 assert.match(source('android/app/src/test/java/com/mypanaderya/game/LanProtocolTest.java'),/productionWorksheetPresentationIsAcceptedForLanAndNearby/);
});

test('Generate mode displays instructional text but never a white answer-entry rectangle or expression',()=>{
 const generated=WorksheetComponents.calculator(calculator);
 assert.match(generated,/BAKER’S GUIDE/);
 assert.match(generated,/Drag the digits into the correct places/);
 assert.doesNotMatch(generated,/data-answer-digit="ones"/);
 assert.doesNotMatch(generated,/calculationAnswer|calculationExpression|calculator-answer|Golden Challenge keypad/);
 const manual=WorksheetComponents.calculator({...calculator,manual:true,golden:true});
 assert.match(manual,/calculationAnswer|calculator-answer/);
 assert.match(manual,/calculationExpression/);
 assert.match(manual,/Golden Challenge keypad/);
});

test('helper rewards remain tied to relevant semantic pointing followed by verified learner actions',()=>{
 const waiting={state:{...state,k:1,raw:56,incoming:7,mixed:false,revealed:true}};
 assert.equal(CoBakerRewards.cueStep({kind:'point',target:'carry:1'},waiting),'0:1:carry-down');
 assert.equal(CoBakerRewards.cueStep({kind:'point',target:'slot:0:0'},waiting),null);
 assert.equal(CoBakerRewards.cueStep({kind:'hint',hint:'carry'},waiting),'0:1:carry-down');
 assert.equal(CoBakerRewards.reward(200,5),10);
 assert.equal(CoBakerRewards.actionReward(200,1),2);
 assert.equal(CoBakerRewards.actionReward(200,5),2);
 assert.match(source('src/network/helper-rewards.js'),/verifiedStep\(h\.proof,h\.credit\.step/);
});

test('only the original worksheet-stream arrows remain, and carry can target the floating ones tile',()=>{
 const drag=source('src/ui/worksheet-drag.js');
 const engine=source('worksheet/src/tap-and-drag.js');
 const tutorial=source('worksheet/src/worksheet-render-and-tutorial.js');
 assert.doesNotMatch(drag,/document\.createElementNS\(/);
 assert.doesNotMatch(source('styles/worksheet-experience.css'),/\.worksheet-full-guide\{/);
 assert.match(engine,/target\?\.dataset\.part==='ones'&&!s\.onesPlaced/);
 assert.match(engine,/addCarry\('floating'\)/);
 assert.match(tutorial,/to=s\.onesPlaced\?Q\(`\[data-slot=/);
 assert.match(tutorial,/Q\('\[data-part="ones"\]'\)/);
 assert.match(tutorial,/makeStream\(pointOf\(from\),pointOf\(to\),'next-action'\)/);
});

test('a real drag-end onto the floating product ones digit invokes the correct carry path',()=>{
 const file=source('worksheet/src/tap-and-drag.js');
 const code=file.slice(file.indexOf('function up(e){'),file.indexOf("$('sheet').addEventListener('pointerdown'"));
 assert.ok(code.startsWith('function up(e){'));
 const simulate=(element,onesPlaced=false)=>{
  const events=[];
  const ctx=vm.createContext({
   pointer:{pid:5,kind:'carry',c:1,drag:true,ghost:{remove(){}}},
   worksheetExternalCalculator:true,
   s:{k:1,row:0,mixed:false,onesPlaced},
   hidePreview(){},setTimeout(){},bridgePoll(){events.push('poll')},
   addCarry:kind=>events.push('add:'+kind),
   worksheetCarryTarget:target=>events.push('slot:'+JSON.stringify(target)),
   document:{elementFromPoint:()=>({closest:()=>element})},
   window:{frameElement:{getBoundingClientRect:()=>({left:0,top:0})}},
   report:()=>events.push('wrong-target'),
   ignoreClick:false
  });
  vm.runInContext(code,ctx);
  vm.runInContext('up({pointerId:5,clientX:20,clientY:25,pointerType:"touch"})',ctx);
  return events;
 };
 const floating={dataset:{part:'ones'},hasAttribute:()=>false};
 assert.deepEqual(simulate(floating),['add:floating','poll']);
 const placed={dataset:{slot:'0:1'},hasAttribute:name=>name==='data-slot'};
 assert.deepEqual(simulate(placed,true),['slot:{"kind":"slot","r":0,"c":1}']);
 assert.deepEqual(simulate(placed,false),['slot:{"kind":"slot","r":0,"c":1}']);
});
