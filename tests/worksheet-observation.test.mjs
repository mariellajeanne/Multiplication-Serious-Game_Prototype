import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
globalThis.crypto ??= webcrypto;
await import('../src/network/worksheet-observation.js');
await import('../src/network/co-baker.js');
await import('../src/network/coordinator.js');
await import('../src/network/help-requests.js');
const api=globalThis.CoBakerCore;
function network(){
 let now=Date.now(),queue=[];const connected=new Map(),saves=new Map();
 const id=n=>n.toString(16).padStart(32,'0');
 const flush=()=>{let limit=3000;while(queue.length){assert.ok(--limit>0,'Message loop');const [target,event]=queue.shift();connected.get(target)?.receive(event)}};
 function join(n){const player={id:id(n),name:'Baker',number:'0000'},storage={getItem:k=>saves.get(n)?.[k],setItem:(k,v)=>saves.set(n,{...saves.get(n),[k]:v})};let d;
  const transport={start(hello){connected.set(player.id,d);queue.push([player.id,{kind:'status',status:'searching'}]);for(const peer of connected.values())if(peer!==d){queue.push([peer.profile.id,{kind:'message',message:hello}]);queue.push([player.id,{kind:'message',message:api.packet(peer.profile,peer.session,'hello')}])}},stop(){connected.delete(player.id);for(const peer of connected.values())queue.push([peer.profile.id,{kind:'left',playerId:player.id}])},send(to,m){queue.push([to,{kind:'message',message:m}])}};
  d=new api.Discovery(player,transport,()=>now);d.help.clock=()=>now;d.help.storage=storage;d.help.worksheet=()=>!!d.isOnWorksheet;d.isOnWorksheet=false;d.start();return d;
 }
 function advance(ms){now+=ms;for(const d of connected.values())d.help.tick();flush()}
 return {join,flush,advance,connected,queue,now:()=>now,id};
}

const w=globalThis.CoBakerWorksheet;
const initial={a:79,b:18,A:[9,7],B:[8,1],cols:4,row:0,k:0,first:null,phase:'select',revealed:false,raw:0,mixed:false,incoming:0,onesPlaced:false,tensPlaced:false,tensLocation:null,chosen:null,carrySlots:{},rows:[{},{0:0}],sum:{},sumCol:0,sumCarry:0,done:0,boxes:0,complete:false,carryArmed:false};
function pair(){const n=network(),a=n.join(1),b=n.join(2),c=n.join(3);n.flush();a.isOnWorksheet=true;const ao=new w.Observation(a),bo=new w.Observation(b),co=new w.Observation(c);let current=structuredClone(initial);ao.onSnapshot=()=>ao.publish({state:current});a.help.request([b.profile.id]);n.flush();b.help.accept([...b.help.incoming.keys()][0]);n.flush();return {n,a,b,c,ao,bo,co,set(s){current=s;ao.publish({state:s});n.flush()}}}
test('snapshot projects math only, rejects HTML, unknown fields and invalid indexes',()=>{
 const data=w.snapshot({state:{...initial,digitSources:{private:'ignored'}},money:100,history:['private'],metrics:{},actions:[]});
 assert.deepEqual(Object.keys(data),['schema','state']);assert.equal(data.state.digitSources,undefined);
 for(const patch of [{phase:'<img onerror=alert(1)>'},{row:5},{rows:[{0:'<script>'},{0:0}]},{A:[9,8]},{carrySlots:{1:{value:7,provisional:'yes'}}},{coins:5}])assert.equal(w.validState({...initial,...patch}),false);
 assert.equal(api.validHelp({kind:'worksheet',sessionId:'a'.repeat(32),streamId:'b'.repeat(32),version:1,snapshot:data}),true);
});
test('confirmed helper alone receives initial snapshot and procedural states including Undo and completion',()=>{
 const {n,a,b,c,ao,bo,co,set}=pair();assert.deepEqual(bo.latest.state,initial);assert.equal(co.latest,null);
 for(const changes of [{phase:'product',raw:72,mixed:true},{phase:'product',raw:72,mixed:true,revealed:true,onesPlaced:true,rows:[{0:2},{0:0}],tensPlaced:true,tensLocation:'row'},{phase:'product',raw:72,revealed:true,carrySlots:{1:{value:7,provisional:true}}},{...initial},{...initial,phase:'complete',complete:true,done:4,boxes:4,rows:[{0:2,1:3,2:6},{0:0,1:9,2:7}],sum:{0:2,1:2,2:4,3:1}}]){const state={...initial,...changes};set(state);assert.deepEqual(bo.latest.state,state)}
 assert.equal(co.latest,null);const last=bo.received;set({...bo.latest.state});assert.equal(bo.received,last);
 const own=ao.latest;b.help.send(a.profile.id,{kind:'worksheet',sessionId:a.help.active.sessionId,streamId:ao.streamId,version:999,snapshot:w.snapshot({state:initial})});n.flush();assert.equal(ao.latest,own);
});
test('stale, duplicate, out of order, unrelated and expired messages cannot update the viewer',()=>{
 const {n,a,b,c,ao,bo,co}=pair();const h={kind:'worksheet',sessionId:a.help.active.sessionId,streamId:bo.streamId,version:bo.received+1,snapshot:w.snapshot({state:{...initial,first:{kind:'top',c:0}}})};
 const deliver=(from,help,session=from.session)=>b.receive({kind:'message',message:{...api.packet(from.profile,session,'help'),help}});
 deliver(c,h);assert.equal(bo.latest.state.first,null);
 deliver(a,{...h,sessionId:'f'.repeat(32)});deliver(a,{...h,streamId:'f'.repeat(32)});deliver(a,{...h,version:bo.received});assert.equal(bo.latest.state.first,null);
 deliver(a,h);assert.equal(bo.latest.state.first.kind,'top');const latest=bo.latest;
 deliver(a,{...h,snapshot:w.snapshot({state:initial})});assert.equal(bo.latest,latest);
 a.help.end();n.flush();deliver(a,{...h,version:999});assert.equal(bo.latest,null);assert.equal(ao.publish({state:initial}),false);
});
test('temporary disconnect requests a fresh snapshot without replaying learner inputs',()=>{
 const {n,a,b,ao,bo,set}=pair();const reservation=a.help.active.sessionId;
 b.help.offline();a.help.left(b.profile.id);assert.ok(a.help.active.lostAt);assert.equal(ao.publish({state:initial}),false);
 b.help.online();a.help.peer(b.profile.id);bo.lastRequest=0;bo.refresh();n.flush();assert.equal(a.help.active.sessionId,reservation);assert.deepEqual(bo.latest.state,initial);
 n.advance(16000);assert.ok(a.help.active);
});
test('refreshed helper proves previous connection within grace; old connection stays retired',()=>{
 const {n,a,b,ao,bo}=pair();const previous=b.session,sessionId=a.help.active.sessionId;
 b.session='e'.repeat(32);bo.previousSession=previous;bo.streamId='f'.repeat(32);bo.latest=null;bo.received=0;
 a.receive({kind:'message',message:api.packet(b.profile,b.session,'hello')});assert.ok(a.help.active.lostAt);
 bo.refresh();n.flush();assert.equal(a.help.active.sessionId,sessionId);assert.equal(a.help.active.otherSession,b.session);assert.deepEqual(bo.latest.state,initial);
 a.receive({kind:'message',message:{...api.packet(b.profile,previous,'help'),help:{kind:'watch',sessionId,streamId:'a'.repeat(32)}}});assert.equal(a.help.active.otherSession,b.session);
});

await import('../src/ui/worksheet-components.js');
const view={calculator:{mode:'fact',expression:'9 \u00d7 8',display:'72',carryEquation:'',golden:true,manual:false,offered:false,multiplier:3,tray:{waiting:0,armed:false,label:'Place the digits',digits:[{part:'tens',value:7},{part:'ones',value:2}],selected:null,demo:false,demoDigit:'2'},status:'Place each digit.',placementError:false,generate:false,active:true,guide:false},phase:'place',tutorial:true,guideLevel:2,entry:{selected:null,value:'',feedback:'',level:0,hintTargets:[]}};
test('presentation snapshots update calculator/challenge state without a math change and preserve ordering',()=>{
 const {n,a,b,ao,bo}=pair();ao.presentation=()=>view;ao.publish({state:initial});n.flush();assert.equal(bo.latest.schema,2);assert.deepEqual(bo.latest.presentation,view);const version=bo.received;
 const typing=structuredClone(view);typing.calculator.manual=true;typing.calculator.golden=false;typing.calculator.generate=true;typing.calculator.display='7';typing.calculator.tray=null;
 ao.presentation=()=>typing;ao.publish({state:initial});n.flush();assert.ok(bo.received>version);assert.equal(bo.latest.presentation.calculator.display,'7');
 b.receive({kind:'message',message:{...api.packet(a.profile,a.session,'help'),help:{kind:'worksheet',sessionId:a.help.active.sessionId,streamId:bo.streamId,version,snapshot:w.snapshot({state:initial},view)}}});assert.equal(bo.latest.presentation.calculator.display,'7');
});
test('presentation schema rejects commands, economic fields, unsafe targets and unbounded text',()=>{
 for(const change of [p=>p.coins=99,p=>p.calculator.onclick='undo()',p=>p.calculator.status='x'.repeat(241),p=>p.calculator.tray.digits.push({part:'tens',value:2}),p=>p.calculator.tray.digits=[null],p=>p.entry.selected={kind:'slot',r:9,c:0},p=>p.entry.hintTargets=[{kind:'pixel',c:0}]]){const p=structuredClone(view);change(p);assert.equal(w.validPresentation(p),false)}
 assert.equal(w.validSnapshot({schema:2,state:initial,presentation:view}),true);assert.equal(w.validSnapshot({schema:2,state:initial}),false);
});
test('shared observer components render supplied calculator values and strip executable controls',()=>{
 const p=structuredClone(view.calculator);p.display='73';p.status='<img src=x onerror=alert(1)>';
 const html=WorksheetComponents.readOnly(WorksheetComponents.calculator(p)+WorksheetComponents.workspace({done:0,total:4,complete:false}));
 assert.match(html,/>73<\/output>/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img| onclick=/);assert.match(html,/button disabled aria-disabled="true"/);
 const small=WorksheetComponents.layout({rows:2,cols:4,available:390,byWidth:90});assert.ok(small.cell>=44&&small.height<=390);
});
