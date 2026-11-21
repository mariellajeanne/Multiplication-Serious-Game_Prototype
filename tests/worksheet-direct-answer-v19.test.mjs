import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const read=rel=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');
function sliceFunction(src,from,to){const start=src.indexOf(from),end=src.indexOf(to,start);assert.ok(start>=0&&end>start,`missing ${from}`);return src.slice(start,end)}

// Exercise the real child tap handler AND the real authenticated parent message
// handler in sequence. UI nodes are lightweight geometry stubs, not a browser.
function harness({left=9,right=0,golden=false,failSave=false}={}){
 const sends=[],reports=[],renders=[],s={phase:'product',row:0,k:0,expressionOrder:[left,right],A:[left],B:[right],raw:left*right,expressionActivated:false,goldenOffer:false,revealed:false,onesPlaced:false,tensPlaced:false,chosen:null,carryArmed:false};
 const answer={status:'waiting',offered:golden,accepted:false};
 const parentWindow={};const frame={contentWindow:parentWindow};
 const top={getBoundingClientRect:()=>({left:220,top:120,width:48,height:48})};
 const bottom={getBoundingClientRect:()=>({left:220,top:290,width:48,height:48})};
 const float={dataset:{},style:{},innerHTML:'',offsetWidth:180,offsetHeight:75,getBoundingClientRect:()=>({left:0}),setAttribute(){},querySelector(sel){return this.innerHTML.includes('data-part="tens"')&&sel.includes('tens')?{offsetLeft:8,offsetWidth:50,getBoundingClientRect:()=>({right:58})}:this.innerHTML.includes('data-part="ones"')&&sel.includes('ones')?{offsetLeft:60,offsetWidth:50,getBoundingClientRect:()=>({right:110})}:null},classList:{add(){},remove(){},toggle(){}}};
 const svg={setAttribute(){},classList:{add(){},remove(){}}};
 const nodes={floating:float,pair:svg,sheet:{getBoundingClientRect:()=>({left:0,top:0,width:600,height:450})},pairHalo:svg,pairGlow:svg,pairTrace:svg,connectorPreview:svg};
 let parentHandler;
 const child=vm.createContext({s,busy:false,worksheetExternalCalculator:true,worksheetChallengeInput:false,
  $:id=>nodes[id],Q:sel=>sel.startsWith('[data-top')?top:bottom,productActive:()=>s.phase==='product',
  tens:()=>Math.floor(s.raw/10),ones:()=>s.raw%10,value:()=>s.raw,
  convexConnector:()=>'',updateTutorial(){},fxPosition(){},bridgePoll(){},
  render(){renders.push(float.innerHTML);vm.runInContext('positionFloater()',child)},
  report(type,data){reports.push({type,...data});parentHandler({source:parentWindow,origin:'https://bakery.local',data:{source:'pq-worksheet',attemptId:'A',type,...data}})},
  revealProduct(){s.revealed=true;vm.runInContext('positionFloater()',child)},
  invalid(){},status(){},targetClicked(){},chooseTile(){},
  });
 vm.runInContext(sliceFunction(read('worksheet/src/tap-and-drag.js'),'function targetClicked(el){',"$('math').addEventListener"),child);
 vm.runInContext(sliceFunction(read('worksheet/src/worksheet-render-and-tutorial.js'),'function positionFloater(){','function pointOf(el)'),child);
 const r={phase:'engine',ticket:{a:left,b:right,id:11},paused:false};
 const parent=vm.createContext({console,g:{run:r},location:{origin:'https://bakery.local'},window:{addEventListener(){}},$:id=>id==='worksheetFrame'?frame:null,
  usesStepCoins:()=>false,ensureWorksheetRewards:()=>({attemptId:'A'}),
  currentWorksheetCalculation:()=>({r,step:{row:0,col:0,a:left,b:right,p:left*right},state:s}),ensureFactAnswer:()=>answer,
  sendEngine(type,data){sends.push({type,...data});if(type==='fact-choice') {s.goldenOffer=true;vm.runInContext('positionFloater()',child)}
   if(type==='fact-answer'){s.revealed=true;vm.runInContext('positionFloater()',child)}
   if(type==='challenge-input'){child.worksheetChallengeInput=!!data.enabled;vm.runInContext('positionFloater()',child)}
   if(type==='fact-reset'){s.expressionActivated=false;s.goldenOffer=false;vm.runInContext('positionFloater()',child)}},
  generateWorksheetAnswer(){if(failSave)return false;answer.status='generated';parent.sendEngine('fact-answer',{row:0,col:0});return true},
  chooseWorksheetChallenge(){answer.accepted=true;parent.sendEngine('challenge-input',{enabled:true});return true}
 });
 vm.runInContext(sliceFunction(read('src/game/worksheet-bridge.js'),'function handleWorksheetMessage(ev){',"window.addEventListener('message',handleWorksheetMessage)"),parent);
 parentHandler=data=>vm.runInContext('handleWorksheetMessage(__message)',Object.assign(parent,{__message:data}));
 const eq={dataset:{},hasAttribute:()=>false,closest:selector=>selector==='#equationReveal'?eq:null};
 const choice=option=>({dataset:{goldenOption:option},hasAttribute:()=>false,closest:selector=>selector==='[data-golden-option]'?true:null});
 return {s,float,answer,reports,sends,renders,eq,choice,child,parent,
  tap(el){child.__el=el;vm.runInContext('worksheetTap(__el)',child)},
  pos(){vm.runInContext('positionFloater()',child)} };
}
test('9 × 0: floating equation tap generates a draggable zero tile without Calculator click',()=>{
 const h=harness();h.pos();assert.match(h.float.innerHTML,/>9 × 0</);
 h.tap(h.eq);assert.equal(h.s.revealed,true);assert.equal(h.answer.status,'generated');
 assert.match(h.float.innerHTML,/data-part="ones"[^>]*>0<\/button>/);
 assert.doesNotMatch(h.float.innerHTML,/data-part="tens"/);
 assert.deepEqual(h.reports.map(m=>m.type),['fact-activate']);
});
test('6 × 7: tapping the equation exposes independent 4 and 2 draggable sources',()=>{
 const h=harness({left:6,right:7});h.tap(h.eq);
 assert.equal(h.s.revealed,true);assert.match(h.float.innerHTML,/data-part="tens"[^>]*>4<\/button>/);
 assert.match(h.float.innerHTML,/data-part="ones"[^>]*>2<\/button>/);
 assert.match(h.float.style.left,/px$/);
});
test('floating equation preserves the actual drag connection direction',()=>{
 for(const [a,b] of [[2,4],[4,2]]){const h=harness({left:a,right:b});h.pos();assert.match(h.float.innerHTML,new RegExp(`${a} × ${b}`));}
});
test('Golden automatic path displays two vertically stacked choices, then result digits',()=>{
 const h=harness({left:6,right:7,golden:true});h.tap(h.eq);
 assert.equal(h.s.revealed,false);assert.equal(h.s.goldenOffer,true);
 assert.match(h.float.innerHTML,/Try It Yourself[\s\S]*Just Generate/);
 h.tap(h.choice('auto'));assert.equal(h.s.revealed,true);
 assert.match(h.float.innerHTML,/data-part="tens"/);
});
test('Golden manual path hides floating choices while keypad is active; correct answer reveals digits',()=>{
 const h=harness({left:6,right:7,golden:true});h.tap(h.eq);h.tap(h.choice('manual'));
 assert.equal(h.answer.accepted,true);assert.equal(h.child.worksheetChallengeInput,true);assert.equal(h.float.innerHTML,'');
 // The real Golden-answer reward/attempt logic is separately covered by
 // golden-challenges.test.mjs; it sends the same fact-answer message on success.
 h.parent.sendEngine('fact-answer',{row:0,col:0});assert.equal(h.s.revealed,true);
 assert.match(h.float.innerHTML,/data-part="ones"/);
});
test('failed answer save restores expression button instead of stranding player',()=>{
 const h=harness({failSave:true});h.tap(h.eq);assert.equal(h.s.expressionActivated,false);
 assert.match(h.float.innerHTML,/id="equationReveal"/);
});
test('stale or unauthenticated activation cannot generate an answer',()=>{
 const h=harness({left:6,right:7});h.parent.__message={source:{},origin:'https://bakery.local',data:{source:'pq-worksheet',type:'fact-activate',attemptId:'A',row:0,col:0}};
 vm.runInContext('handleWorksheetMessage(__message)',h.parent);assert.equal(h.s.revealed,false);
 h.parent.__message={source:h.parent.$('worksheetFrame').contentWindow,origin:'https://bakery.local',data:{source:'pq-worksheet',type:'fact-activate',attemptId:'old',row:0,col:0}};
 vm.runInContext('handleWorksheetMessage(__message)',h.parent);assert.equal(h.s.revealed,false);
});

test('touch pointer-up on floating expression triggers one generation (no duplicate click)',()=>{
 const h=harness({left:9,right:0});
 const src=read('worksheet/src/tap-and-drag.js');
 vm.runInContext('let pointer=null,ignoreClick=false;function hidePreview(){}',h.child);
 vm.runInContext(sliceFunction(src,'function isPointerTarget(el)',"$('sheet').addEventListener('pointerdown',down)"),h.child);
 h.child.convexConnector=()=>'';
 h.eq.id='equationReveal';h.eq.closest=selector=>selector.includes('#equationReveal')?h.eq:null;
 h.child.setTimeout=()=>{};
 h.child.__down={target:h.eq,pointerId:2,pointerType:'touch',clientX:10,clientY:15};
 vm.runInContext('down(__down);up(__down)',h.child);
 assert.equal(h.s.revealed,true);assert.equal(h.reports.filter(r=>r.type==='fact-activate').length,1);
});
test('touch drag of a revealed result tile invokes existing digit placement validation',()=>{
 const h=harness({left:6,right:7});h.tap(h.eq);
 const src=read('worksheet/src/tap-and-drag.js');
 vm.runInContext('let pointer=null,ignoreClick=false;function hidePreview(){}',h.child);
 vm.runInContext(sliceFunction(src,'function isPointerTarget(el)',"$('sheet').addEventListener('pointerdown',down)"),h.child);
 h.child.convexConnector=()=>'';
 const drops=[];
 const slot={dataset:{slot:'0:0'},hasAttribute:key=>key==='data-slot',closest:sel=>sel==='button'?slot:null};
 const tile={dataset:{part:'ones'},textContent:'2',hasAttribute:key=>key==='data-part',closest:sel=>sel.includes('[data-part]')?tile:null};
 h.child.document={createElement:()=>({style:{},remove(){}}),body:{append(){}},elementFromPoint:()=>slot};
 h.child.worksheetDropDigit=(part,target,value)=>{drops.push({part,target,value});return true};
 h.child.setTimeout=()=>{};
 h.child.__down={target:tile,pointerId:3,pointerType:'touch',clientX:5,clientY:5};
 h.child.__move={...h.child.__down,clientX:70,clientY:30,cancelable:true,preventDefault(){}};
 vm.runInContext('down(__down);move(__move);up(__move)',h.child);
 assert.equal(drops.length,1);
 assert.equal(drops[0].part,'ones');assert.equal(drops[0].value,2);
 assert.equal(drops[0].target.kind,'slot');assert.equal(drops[0].target.c,0);
});
