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

function guidedPair(){const p=pair();p.ag=new w.Guidance(p.a);p.bg=new w.Guidance(p.b);p.cg=new w.Guidance(p.c);p.ag.targetVisible=()=>true;p.cues=[];p.ag.observe(cue=>p.cues.push(cue));return p}
test('semantic pointers and six preset hints are presentation-only and limited to the confirmed helper',()=>{
 const {n,a,b,c,ao,bo,ag,bg,cg,cues}=guidedPair();const before=JSON.stringify(ao.latest);
 assert.ok(bg.send('point','top:1'));n.flush();assert.equal(cues.at(-1).target,'top:1');
 assert.ok(bg.send('hint','carry'));n.flush();assert.equal(cues.at(-1).hint,'carry');assert.equal(cues.at(-1).name,'Baker');
 assert.equal(ag.send('point','top:0'),false);assert.equal(cg.send('hint','ones'),false);
 assert.equal(JSON.stringify(ao.latest),before);assert.deepEqual(bo.latest.state,initial);
 const h={kind:'point',sessionId:a.help.active.sessionId,streamId:ao.streamId,cueToken:ao.cueToken,recipientId:a.profile.id,sequence:30,target:'top:0'};
 c.help.send(a.profile.id,h);n.flush();assert.equal(cues.length,2);
 for(const patch of [{recipientId:b.profile.id},{sessionId:n.id(90)},{streamId:n.id(91)},{cueToken:n.id(92)},{target:'top:6'},{target:'slot:1:0'}]){b.help.send(a.profile.id,{...h,...patch});n.flush()}assert.equal(cues.length,2);
 assert.equal(JSON.stringify(ao.latest),before);
});
test('guidance rejects malformed payloads, duplicate sequences, flood attempts and hidden targets',()=>{
 const {n,a,b,ao,ag,bg,cues}=guidedPair();
 const h={kind:'hint',sessionId:a.help.active.sessionId,streamId:ao.streamId,cueToken:ao.cueToken,recipientId:a.profile.id,sequence:1,hint:'ones'};
 for(const patch of [{hint:['ones']},{hint:'The answer is 72'},{target:'top:0'},{sequence:0},{sequence:1.5},{recipientId:[]},{command:'undo'}])assert.equal(api.validHelp({...h,...patch}),false);
 b.help.send(a.profile.id,h);n.flush();assert.equal(cues.length,1);
 n.advance(2600);b.help.send(a.profile.id,h);n.flush();assert.equal(cues.length,1);
 for(let sequence=2;sequence<20;sequence++){b.help.send(a.profile.id,{...h,sequence});n.flush()}assert.equal(cues.length,2);
 n.advance(2600);b.help.send(a.profile.id,{...h,sequence:19});n.flush();assert.equal(cues.length,2);
 ag.targetVisible=()=>false;assert.ok(bg.send('point','top:0'));n.flush();assert.equal(cues.length,2);
 assert.equal(bg.send('point','top:1'),false);assert.equal(bg.send('hint','free text'),false);assert.equal(bg.send('hint',['ones']),false);
});
test('ending and disconnect revoke cues; reconnection never replays an old token',()=>{
 const {n,a,b,ao,bo,ag,bg,cues}=guidedPair();
 const old={kind:'point',sessionId:a.help.active.sessionId,streamId:ao.streamId,cueToken:ao.cueToken,recipientId:a.profile.id,sequence:99,target:'carry:1'};
 assert.ok(bg.send('point','slot:0:0'));n.flush();assert.equal(cues.at(-1).target,'slot:0:0');
 b.help.offline();a.help.left(b.profile.id);assert.equal(cues.at(-1),null);assert.equal(ao.cueToken,null);assert.equal(bg.send('hint','retry'),false);
 b.help.online();b.help.peer(a.profile.id);a.help.peer(b.profile.id);bo.lastRequest=0;bo.refresh();n.flush();assert.notEqual(ao.cueToken,old.cueToken);
 b.help.send(a.profile.id,old);n.flush();assert.equal(cues.at(-1),null);
 assert.ok(bg.send('point','carry:1'));n.flush();assert.equal(cues.at(-1).target,'carry:1');
 a.help.end();n.flush();assert.equal(cues.at(-1),null);b.help.send(a.profile.id,old);n.flush();assert.equal(cues.at(-1),null);
});
test('tokens expire on learner time and calculator/carry targets follow visible presentation',()=>{
 const {n,a,b,ao,bg,cues}=guidedPair();assert.equal(bg.send('point','calculator:product'),false);
 ao.presentation=()=>view;ao.publish({state:initial});n.flush();
 for(const t of ['calculator:product','calculator:tray','calculator:ones','calculator:tens','carry:1','slot:0:3','control:undo'])assert.ok(w.targetExists(t,ao.latest),t);
 for(const t of ['calculator:carry','control:generate','control:add','sum:0','slot:1:0'])assert.equal(w.targetExists(t,ao.latest),false,t);
 n.advance(6501);assert.ok(bg.send('point','calculator:product'));n.flush();assert.equal(cues.length,0);
});
test('watch token rotation accepts an in-flight cue only within its original lease',()=>{
 const {n,a,b,ao,bo,cues}=guidedPair();
 const h={kind:'hint',sessionId:a.help.active.sessionId,streamId:ao.streamId,cueToken:ao.cueToken,recipientId:a.profile.id,sequence:1,hint:'next'};
 n.advance(1000);bo.lastRequest=0;bo.refresh();n.flush();assert.notEqual(ao.cueToken,h.cueToken);
 b.help.send(a.profile.id,h);n.flush();assert.equal(cues.at(-1).hint,'next');
 n.advance(5600);bo.lastRequest=0;bo.refresh();n.flush();
 b.help.send(a.profile.id,{...h,sequence:2});n.flush();assert.equal(cues.length,1);
 b.help.send(a.profile.id,{...h,cueToken:ao.cueToken,sequence:3});n.flush();assert.equal(cues.length,2);
 a.help.left(b.profile.id);assert.equal(ao.cueTokens.size,0);
});
