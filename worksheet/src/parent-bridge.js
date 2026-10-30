'use strict';
// Worksheet bridge. This adapter preserves the worksheet interaction functions.
const bridgeMetrics={errors:0,carryUp:0,carryDown:0,bestCombo:0,currentCombo:0,cycles:0,lastDone:0,lastRow:0,sent:false,completionAck:false,lastCompleteReport:0,startedAt:performance.now(),pausedSince:0};
let worksheetAttemptId=null;
let worksheetActions=new Map();
const report=(type,additional={})=>window.parent.postMessage({source:'pq-worksheet',type,attemptId:worksheetAttemptId,...additional},'*');
// Observe accepted state transitions at render time, including async placements.
// This ledger lives outside undo snapshots. Optional temporary tens placement is
// not an extra reward: the required outgoing carry is recorded when lifted.
function recordWorksheetActions(){
 if(!worksheetAttemptId||!s)return;
 const record=(row,col,kind)=>{
  const id=`${worksheetAttemptId}/${row}/${col}/${kind}`;
  if(worksheetActions.has(id))return;
  const cc=row+col;
  let target=kind==='carry-up'?Q(`[data-carry="${col+1}"]`):
   kind==='connect'?Q(`[data-top="${col}"]`):kind==='reveal'?$('floating'):
   kind==='carry-down'&&!s.onesPlaced?Q('[data-part="ones"]'):
   Q(`[data-slot="${row}:${kind==='place-tens'?cc+1:cc}"]`);
  const rect=target?.getBoundingClientRect();
  const point=rect&&window.innerWidth&&window.innerHeight?
   {x:(rect.left+rect.width/2)/window.innerWidth,y:(rect.top+rect.height/2)/window.innerHeight}:undefined;
  worksheetActions.set(id,{id,row,col,kind,...(point?{point}:{})});
 };
 if(s.phase==='product'){
  record(s.row,s.k,'connect');
  if(s.revealed){
   record(s.row,s.k,'reveal');
   if(s.onesPlaced)record(s.row,s.k,'place-ones');
   if(s.incoming&&s.mixed)record(s.row,s.k,'carry-down');
   if(s.tensPlaced&&lastDigit())record(s.row,s.k,'place-tens');
   else if(s.tensPlaced&&s.tensLocation==='carry')record(s.row,s.k,'carry-up');
  }
 }
 for(let i=0;i<s.done;i++)record(Math.floor(i/s.A.length),i%s.A.length,'combo');
}
const baseWorksheetRender=render;
render=function(...args){const result=baseWorksheetRender(...args);recordWorksheetActions();return result;};
const baseInvalid=invalid;
invalid=function(...args){bridgeMetrics.errors++;bridgeMetrics.currentCombo=0;return baseInvalid(...args)};
const basePlace=place;
place=function(part,kind,c){
 if(s&&s.phase==='product'&&s.revealed&&!busy&&part==='tens'&&kind==='carry'&&s.k!==s.A.length-1&&c===s.k+1&&!s.tensPlaced&&tens()>0) bridgeMetrics.carryUp++;
 return basePlace(part,kind,c);
};
const baseLift=liftTens;
liftTens=function(...args){if(s&&s.phase==='product'&&!busy&&s.tensLocation==='row'&&s.k!==s.A.length-1) bridgeMetrics.carryUp++;return baseLift(...args)};
const baseAddCarry=addCarry;
addCarry=function(target){if(s&&s.phase==='product'&&!busy&&!s.mixed&&s.incoming&&((target==='placed'&&s.onesPlaced)||(target==='floating'&&!s.onesPlaced))) bridgeMetrics.carryDown++;return baseAddCarry(target)};
function bridgeStats(){return {cycles:bridgeMetrics.cycles,bestCombo:bridgeMetrics.bestCombo,carryUp:bridgeMetrics.carryUp,carryDown:bridgeMetrics.carryDown,errors:bridgeMetrics.errors,lookup:0,recall:0,tempo:1};}
let lastReport='',lastHeight=0;
function worksheetSurface(){
 if(!window.innerWidth||!window.innerHeight)return null;
 const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.left/window.innerWidth,y:r.top/window.innerHeight,w:r.width/window.innerWidth,h:r.height/window.innerHeight}};
 return {math:rect($('math')),floating:productActive()?rect($('floating')):null};
}
function applyWorksheetLayout(layout){
 const cell=Math.max(44,Math.min(148,Math.round(Number(layout.cell)||72)));
 const gap=Math.max(4,Math.min(8,Number(layout.gap)||8));
 const carry=Math.max(44,Math.round(cell*.65)),floating=Math.max(44,Math.round(cell*.62)),operandGap=Math.max(56,Math.round(cell*.95));
 const style=document.documentElement.style;
 style.setProperty('--cell',cell+'px');style.setProperty('--gap',gap+'px');
 style.setProperty('--carry-cell',carry+'px');style.setProperty('--float-cell',floating+'px');style.setProperty('--operand-gap',operandGap+'px');
 const height=carry+(2+s.B.length)*cell+operandGap+50;
 $('sheet').style.setProperty('min-height',height+'px','important');
 render();lastHeight=0;bridgePoll();
}
function bridgePoll(){
 if(!s)return;
 recordWorksheetActions();
 if(s.done!==bridgeMetrics.lastDone){
  if(s.done>bridgeMetrics.lastDone){for(let i=bridgeMetrics.lastDone;i<s.done;i++){bridgeMetrics.cycles++;bridgeMetrics.currentCombo++;bridgeMetrics.bestCombo=Math.max(bridgeMetrics.bestCombo,bridgeMetrics.currentCombo)}}
  else bridgeMetrics.currentCombo=Math.max(0,s.k);
  bridgeMetrics.lastDone=s.done;
 }
 if(s.row!==bridgeMetrics.lastRow){bridgeMetrics.currentCombo=0;bridgeMetrics.lastRow=s.row;}
 const stage=s.phase==='select'?'connect':s.phase==='product'?(s.revealed?(s.onesPlaced?(s.incoming&&!s.mixed?'applyCarry':(tens()>0&&(!s.tensPlaced||s.tensLocation==='row')?'liftCarry':'rowFinish')):'place'):'fact'):s.phase==='sum'?'addDigit':s.phase==='complete'?'result':s.phase;
 const completion={complete:s.complete===true,ticket:window.__ACTIVE_WORKSHEET_TICKET||{id:'none'},top:s.a,bottom:s.b};
 const dat={...completion,surface:worksheetSurface(),actions:[...worksheetActions.values()],step:stage,combo:bridgeMetrics.currentCombo,bestCombo:bridgeMetrics.bestCombo,carryUp:bridgeMetrics.carryUp,carryDown:bridgeMetrics.carryDown,row:s.row,done:s.done,phase:s.phase,factLookups:s.done+(s.phase==='product'&&s.revealed?1:0),factRecalls:s.done,hadOld:!!s.incoming,errors:bridgeMetrics.errors};
 const signature=JSON.stringify(dat);
 if(signature!==lastReport){lastReport=signature;report('state',dat)}
 if(s.complete&&!bridgeMetrics.completionAck&&(!bridgeMetrics.sent||performance.now()-bridgeMetrics.lastCompleteReport>=500)){
  bridgeMetrics.sent=true;bridgeMetrics.lastCompleteReport=performance.now();
  report('complete',{...completion,stats:bridgeStats(),actions:[...worksheetActions.values()]});
 }
 const height=Math.ceil($('app').getBoundingClientRect().height||Math.max(document.documentElement.scrollHeight,document.body.scrollHeight));
 if(Math.abs(height-lastHeight)>24){lastHeight=height;report('height',{height})}
}
setInterval(bridgePoll,180);
function externalStart(ticket,attemptId,forceRestart=false){
 if(!ticket)return;const a=Number(ticket.a),b=Number(ticket.b);
 if(!Number.isInteger(a)||a<1||a>99999||!Number.isInteger(b)||b<1||b>99){report('unsupported',{a,b});return;}
 if(typeof attemptId!=='string'||!attemptId)return;
 if(worksheetAttemptId===attemptId&&!forceRestart){report('started',{a,b});return;}
 if(worksheetAttemptId!==attemptId){worksheetAttemptId=attemptId;worksheetActions=new Map();}
 lastReport='';lastHeight=0;
 window.__ACTIVE_WORKSHEET_TICKET=ticket;
 if(document.body.dataset)document.body.dataset.rows=String(String(b).length);
 Object.assign(bridgeMetrics,{errors:0,carryUp:0,carryDown:0,bestCombo:0,currentCombo:0,cycles:0,lastDone:0,lastRow:0,sent:false,completionAck:false,lastCompleteReport:0,startedAt:performance.now()});
 $('customA').value=a;$('customB').value=b;$('tryCustom').click();
 report('started',{a,b});bridgePoll();
}
window.addEventListener('message',event=>{
 const m=event.data;if(event.source!==window.parent||!m||m.source!=='bc-shell')return;
 if(m.type==='start')externalStart(m.ticket,m.attemptId);
 if(m.type==='completion-ack'&&m.attemptId===worksheetAttemptId)bridgeMetrics.completionAck=true;
 if(m.type==='restart'&&window.__ACTIVE_WORKSHEET_TICKET)externalStart(window.__ACTIVE_WORKSHEET_TICKET,worksheetAttemptId,true);
 if(m.type==='sound'){$('sound').textContent=m.enabled?'♫ Sound on':'♫ Sound off';sound=!!m.enabled;}
 if(m.type==='theme')document.body.dataset.decor=String(Math.max(0,Math.min(4,Number(m.level)||0)));
 if(m.type==='layout'&&s)applyWorksheetLayout(m);
 if(m.type==='feedback'&&m.kind==='chest')play('done');
});
setTimeout(()=>report('ready'),0);

reset();
