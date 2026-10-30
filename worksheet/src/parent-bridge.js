'use strict';
// Worksheet bridge. This adapter preserves the worksheet interaction functions.
const bridgeMetrics={errors:0,carryUp:0,carryDown:0,bestCombo:0,currentCombo:0,cycles:0,lastDone:0,lastRow:0,sent:false,startedAt:performance.now(),pausedSince:0};
const report=(type,additional={})=>window.parent.postMessage({source:'pq-worksheet',type,...additional},'*');
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
function bridgePoll(){
 if(!s)return;
 if(s.done!==bridgeMetrics.lastDone){
  if(s.done>bridgeMetrics.lastDone){for(let i=bridgeMetrics.lastDone;i<s.done;i++){bridgeMetrics.cycles++;bridgeMetrics.currentCombo++;bridgeMetrics.bestCombo=Math.max(bridgeMetrics.bestCombo,bridgeMetrics.currentCombo)}}
  else bridgeMetrics.currentCombo=Math.max(0,s.k);
  bridgeMetrics.lastDone=s.done;
 }
 if(s.row!==bridgeMetrics.lastRow){bridgeMetrics.currentCombo=0;bridgeMetrics.lastRow=s.row;}
 const stage=s.phase==='select'?'connect':s.phase==='product'?(s.revealed?(s.onesPlaced?(s.incoming&&!s.mixed?'applyCarry':(tens()>0&&(!s.tensPlaced||s.tensLocation==='row')?'liftCarry':'rowFinish')):'place'):'fact'):s.phase==='sum'?'addDigit':s.phase==='complete'?'result':s.phase;
 const dat={step:stage,combo:bridgeMetrics.currentCombo,bestCombo:bridgeMetrics.bestCombo,carryUp:bridgeMetrics.carryUp,carryDown:bridgeMetrics.carryDown,row:s.row,done:s.done,phase:s.phase,factLookups:s.done+(s.phase==='product'&&s.revealed?1:0),factRecalls:s.done,hadOld:!!s.incoming,errors:bridgeMetrics.errors};
 const signature=JSON.stringify(dat);
 if(signature!==lastReport){lastReport=signature;report('state',dat)}
 if(s.complete&&!bridgeMetrics.sent){
  bridgeMetrics.sent=true;report('complete',{ticket:window.__ACTIVE_WORKSHEET_TICKET||{id:'none'},top:s.a,bottom:s.b,stats:bridgeStats()});
 }
 const height=Math.ceil(Math.max(document.documentElement.scrollHeight,document.body.scrollHeight));
 if(Math.abs(height-lastHeight)>24){lastHeight=height;report('height',{height})}
}
setInterval(bridgePoll,180);
function externalStart(ticket){
 if(!ticket)return;const a=Number(ticket.a),b=Number(ticket.b);
 if(!Number.isInteger(a)||a<1||a>99999||!Number.isInteger(b)||b<1||b>99){report('unsupported',{a,b});return;}
 window.__ACTIVE_WORKSHEET_TICKET=ticket;
 Object.assign(bridgeMetrics,{errors:0,carryUp:0,carryDown:0,bestCombo:0,currentCombo:0,cycles:0,lastDone:0,lastRow:0,sent:false,startedAt:performance.now()});
 $('customA').value=a;$('customB').value=b;$('tryCustom').click();
 report('started',{a,b});bridgePoll();
}
window.addEventListener('message',event=>{
 const m=event.data;if(!m||m.source!=='bc-shell')return;
 if(m.type==='start')externalStart(m.ticket);
 if(m.type==='restart'&&window.__ACTIVE_WORKSHEET_TICKET)externalStart(window.__ACTIVE_WORKSHEET_TICKET);
 if(m.type==='sound'){$('sound').textContent=m.enabled?'♫ Sound on':'♫ Sound off';sound=!!m.enabled;}
});
setTimeout(()=>report('ready'),0);

reset();
