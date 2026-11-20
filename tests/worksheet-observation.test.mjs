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
 return {join,flush,advance,elapse:ms=>{now+=ms},connected,queue,now:()=>now,id};
}

const w=globalThis.CoBakerWorksheet;
const initial={a:79,b:18,A:[9,7],B:[8,1],cols:4,row:0,k:0,first:null,phase:'select',revealed:false,raw:0,mixed:false,incoming:0,onesPlaced:false,tensPlaced:false,tensLocation:null,chosen:null,carrySlots:{},rows:[{},{0:0}],sum:{},sumCol:0,sumCarry:0,done:0,boxes:0,complete:false,carryArmed:false};
function pair(){const n=network(),a=n.join(1),b=n.join(2),c=n.join(3);n.flush();a.isOnWorksheet=true;const ao=new w.Observation(a),bo=new w.Observation(b),co=new w.Observation(c);let current=structuredClone(initial);ao.onSnapshot=()=>ao.publish({state:current});a.help.request([b.profile.id]);n.flush();b.help.accept([...b.help.incoming.keys()][0]);n.flush();return {n,a,b,c,ao,bo,co,set(s){current=s;ao.publish({state:s});n.flush()}}}
test('snapshot projects math only, rejects HTML, unknown fields and invalid indexes',()=>{
 const data=w.snapshot({state:{...initial,digitSources:{private:'ignored'}},money:100,history:['private'],metrics:{},actions:[]});
 assert.deepEqual(Object.keys(data),['schema','state']);assert.equal(data.state.digitSources,undefined);
 for(const patch of [{phase:'<img onerror=alert(1)>'},{row:5},{rows:[{0:'<script>'},{0:0}]},{A:[9,8]},{carrySlots:{1:{value:7,provisional:'yes'}}},{coins:5}])assert.equal(w.validState({...initial,...patch}),false);
 assert.equal(api.validHelp({kind:'worksheet',watchVersion:1,sessionId:'a'.repeat(32),streamId:'b'.repeat(32),version:1,snapshot:data}),true);
});

test('recovery envelopes require typed IDs and bounded increasing generations',()=>{
 const id='a'.repeat(32),watch={kind:'watch',sessionId:id,streamId:id,watchVersion:1};
 assert.equal(api.validHelp(watch),true);assert.equal(api.validHelp({kind:'resume',sessionId:id,previousSession:id}),true);
 for(const patch of [{sessionId:[id]},{streamId:[id]},{previousSession:[id]},{watchVersion:0},{watchVersion:1.1},{watchVersion:'1'},{watchVersion:Number.MAX_SAFE_INTEGER+1},{snapshot:{}}])assert.equal(api.validHelp({...watch,...patch}),false);
 assert.equal(api.validHelp({kind:'resume',sessionId:id,previousSession:[id]}),false);
});
test('confirmed helper alone receives initial snapshot and procedural states including Undo and completion',()=>{
 const {n,a,b,c,ao,bo,co,set}=pair();assert.deepEqual(bo.latest.state,initial);assert.equal(co.latest,null);
 for(const changes of [{phase:'product',raw:72,mixed:true},{phase:'product',raw:72,mixed:true,revealed:true,onesPlaced:true,rows:[{0:2},{0:0}],tensPlaced:true,tensLocation:'row'},{phase:'product',raw:72,revealed:true,carrySlots:{1:{value:7,provisional:true}}},{...initial},{...initial,phase:'complete',complete:true,done:4,boxes:4,rows:[{0:2,1:3,2:6},{0:0,1:9,2:7}],sum:{0:2,1:2,2:4,3:1}}]){const state={...initial,...changes};set(state);assert.deepEqual(bo.latest.state,state)}
 assert.equal(co.latest,null);const last=bo.received;set({...bo.latest.state});assert.equal(bo.received,last);
 const own=ao.latest;b.help.send(a.profile.id,{kind:'worksheet',watchVersion:bo.watchVersion,sessionId:a.help.active.sessionId,streamId:ao.streamId,version:999,snapshot:w.snapshot({state:initial})});n.flush();assert.equal(ao.latest,own);
});
test('stale, duplicate, out of order, unrelated and expired messages cannot update the viewer',()=>{
 const {n,a,b,c,ao,bo,co}=pair();const h={kind:'worksheet',watchVersion:bo.watchVersion,sessionId:a.help.active.sessionId,streamId:bo.streamId,version:bo.received+1,snapshot:w.snapshot({state:{...initial,first:{kind:'top',c:0}}})};
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
 b.receive({kind:'message',message:{...api.packet(a.profile,a.session,'help'),help:{kind:'worksheet',watchVersion:bo.watchVersion,sessionId:a.help.active.sessionId,streamId:bo.streamId,watchVersion:bo.watchVersion,version,snapshot:w.snapshot({state:initial},view)}}});assert.equal(bo.latest.presentation.calculator.display,'7');
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
 const h={kind:'point',stateVersion:bo.received,sessionId:a.help.active.sessionId,streamId:ao.streamId,cueToken:ao.cueToken,recipientId:a.profile.id,sequence:30,target:'top:0'};
 c.help.send(a.profile.id,h);n.flush();assert.equal(cues.length,2);
 for(const patch of [{recipientId:b.profile.id},{sessionId:n.id(90)},{streamId:n.id(91)},{cueToken:n.id(92)},{target:'top:6'},{target:'slot:1:0'}]){b.help.send(a.profile.id,{...h,...patch});n.flush()}assert.equal(cues.length,2);
 assert.equal(JSON.stringify(ao.latest),before);
});
test('guidance rejects malformed payloads, duplicate sequences, flood attempts and hidden targets',()=>{
 const {n,a,b,ao,bo,ag,bg,cues}=guidedPair();
 const h={kind:'hint',stateVersion:ao.version,sessionId:a.help.active.sessionId,streamId:ao.streamId,cueToken:ao.cueToken,recipientId:a.profile.id,sequence:1,hint:'ones'};
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
 const old={kind:'point',stateVersion:bo.received,sessionId:a.help.active.sessionId,streamId:ao.streamId,cueToken:ao.cueToken,recipientId:a.profile.id,sequence:99,target:'carry:1'};
 assert.ok(bg.send('point','slot:0:0'));n.flush();assert.equal(cues.at(-1).target,'slot:0:0');
 b.help.offline();a.help.left(b.profile.id);assert.equal(cues.at(-1),null);assert.equal(ao.cueToken,null);assert.equal(bg.send('hint','retry'),false);
 b.help.online();b.help.peer(a.profile.id);a.help.peer(b.profile.id);bo.lastRequest=0;bo.refresh();n.flush();assert.notEqual(ao.cueToken,old.cueToken);
 b.help.send(a.profile.id,old);n.flush();assert.equal(cues.at(-1),null);
 assert.ok(bg.send('point','carry:1'));n.flush();assert.equal(cues.at(-1).target,'carry:1');
 a.help.end();n.flush();assert.equal(cues.at(-1),null);b.help.send(a.profile.id,old);n.flush();assert.equal(cues.at(-1),null);
});
test('tokens expire on learner time and calculator/carry targets follow visible presentation',()=>{
 const {n,a,b,ao,bo,bg,cues}=guidedPair();assert.equal(bg.send('point','calculator:product'),false);
 ao.presentation=()=>view;ao.publish({state:initial});n.flush();
 for(const t of ['calculator:product','calculator:tray','calculator:ones','calculator:tens','carry:1','slot:0:3','control:undo'])assert.ok(w.targetExists(t,ao.latest),t);
 for(const t of ['calculator:carry','control:generate','control:add','sum:0','slot:1:0'])assert.equal(w.targetExists(t,ao.latest),false,t);
 const old={kind:'point',sessionId:a.help.active.sessionId,streamId:ao.streamId,recipientId:a.profile.id,cueToken:ao.cueToken,stateVersion:bo.received,sequence:1,target:'calculator:product'};n.advance(6501);b.help.send(a.profile.id,old);n.flush();assert.equal(cues.length,0);
});
test('watch token rotation accepts an in-flight cue only within its original lease',()=>{
 const {n,a,b,ao,bo,cues}=guidedPair();
 const h={kind:'hint',stateVersion:ao.version,sessionId:a.help.active.sessionId,streamId:ao.streamId,cueToken:ao.cueToken,recipientId:a.profile.id,sequence:1,hint:'next'};
 n.advance(1000);bo.lastRequest=0;bo.refresh();n.flush();assert.notEqual(ao.cueToken,h.cueToken);
 b.help.send(a.profile.id,h);n.flush();assert.equal(cues.at(-1).hint,'next');
 n.advance(5600);bo.lastRequest=0;bo.refresh();n.flush();
 b.help.send(a.profile.id,{...h,sequence:2});n.flush();assert.equal(cues.length,1);
 b.help.send(a.profile.id,{...h,cueToken:ao.cueToken,stateVersion:bo.received,sequence:3});n.flush();assert.equal(cues.length,2);
 a.help.left(b.profile.id);assert.equal(ao.cueTokens.size,0);
});

function tabStorage(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}}
function recoverable(){
 const n=network(),a=n.join(1),b=n.join(2),c=n.join(3);n.flush();a.isOnWorksheet=true;
 const stores=[tabStorage(),tabStorage()];let current=structuredClone(initial);
 const ao=new w.Observation(a,{storage:stores[0],recoveryKey:()=> 'attempt-79x18'}),bo=new w.Observation(b,{storage:stores[1]});new w.Observation(c,{storage:tabStorage()});
 ao.onSnapshot=()=>ao.publish({state:current});a.help.request([b.profile.id]);n.flush();b.help.accept([...b.help.incoming.keys()][0]);n.flush();
 return {n,a,b,c,ao,bo,stores,set(s){current=s;ao.publish({state:s});n.flush()},current:()=>current};
}

test('recovery requires a fresh generation; buffered snapshots and old watch requests cannot roll back the stream',()=>{
 const {n,a,b,ao,bo,set}=recoverable();const old={kind:'worksheet',sessionId:a.help.active.sessionId,streamId:bo.streamId,watchVersion:bo.watchVersion,version:bo.received+100,snapshot:bo.latest};
 const watch={kind:'watch',sessionId:old.sessionId,streamId:old.streamId,watchVersion:old.watchVersion};
 b.receive({kind:'status',status:'disconnected'});a.help.left(b.profile.id);assert.ok(b.help.active.lostAt);
 set({...initial,phase:'product',raw:72,revealed:true,carrySlots:{1:{value:7,provisional:true}}});
 b.receive({kind:'status',status:'searching'});b.receive({kind:'message',message:api.packet(a.profile,a.session,'hello')});a.help.peer(b.profile.id);assert.ok(b.help.active.lostAt);assert.ok(a.help.active.lostAt);
 n.flush();assert.equal(b.help.active.lostAt,0);assert.equal(a.help.active.lostAt,0);assert.equal(bo.latest.state.carrySlots[1].provisional,true);
 const fresh=bo.latest,stream=ao.streamId;
 a.help.send(b.profile.id,old);b.help.send(a.profile.id,watch);n.flush();assert.equal(bo.latest,fresh);assert.equal(ao.streamId,stream);assert.notEqual(stream,old.streamId);
});

test('both role refreshes retain one reservation, version floors and local authority within the original deadline',()=>{
 const p=recoverable(),{n,a,b,ao,bo,stores}=p,sessionId=a.help.active.sessionId;
 p.set({...initial,phase:'product',raw:72,revealed:true,carrySlots:{1:{value:7,provisional:true}},rows:[{0:2},{0:0}]});
 const floor=bo.received,oldLearner=a.session,oldHelper=b.session;
 a.stop();b.stop();n.flush();n.elapse(1000);
 const learner=n.join(1),helper=n.join(2);learner.isOnWorksheet=true;
 const lo=new w.Observation(learner,{storage:stores[0],recoveryKey:()=> 'attempt-79x18'}),ho=new w.Observation(helper,{storage:stores[1]});
 lo.onSnapshot=()=>lo.publish({state:p.current()});n.flush();
 assert.equal(learner.help.active.sessionId,sessionId);assert.equal(helper.help.active.sessionId,sessionId);
 assert.equal(learner.help.active.lostAt,0);assert.equal(helper.help.active.lostAt,0);assert.ok(ho.received>floor);assert.deepEqual(ho.latest.state,p.current());
 assert.equal(learner.help.active.otherSession,helper.session);assert.equal(helper.help.active.otherSession,learner.session);
 // Old connection packets remain retired even after a player-left event.
 for(const [target,from,old]of [[learner,b,oldHelper],[helper,a,oldLearner]])target.receive({kind:'message',message:{...api.packet(from.profile,old,'help'),help:{kind:'end',sessionId}}});
 assert.ok(learner.help.active);assert.ok(helper.help.active);
});

test('unmatched learner attempt and expired stored recovery require a new invitation without reading remote math',()=>{
 for(const expired of [false,true]){
  const {n,a,b,stores}=recoverable();a.stop();n.flush();if(expired)n.elapse(16000);
  const learner=n.join(1);learner.isOnWorksheet=true;new w.Observation(learner,{storage:stores[0],recoveryKey:()=>expired?'attempt-79x18':'another-attempt'});n.flush();
  assert.equal(learner.help.active,null);assert.equal(learner.observation.latest,null);
  n.advance(4000);b.observation.lastRequest=0;b.observation.refresh();n.flush();assert.equal(b.help.active,null);
 }
});

test('discovery and repeated refresh do not extend grace or revive an expired reservation before tick',()=>{
 const {n,a,b,ao,bo,stores}=recoverable();b.help.offline();a.help.left(b.profile.id);
 const deadline=JSON.parse(stores[1].getItem('panaderyaObserverV1')).expires;
 n.elapse(10000);for(let i=0;i<5;i++)bo.refresh();assert.equal(JSON.parse(stores[1].getItem('panaderyaObserverV1')).expires,deadline);
 n.queue.length=0;n.elapse(5001);a.help.peer(b.profile.id);b.help.peer(a.profile.id);n.flush();
 assert.equal(a.help.active,null);assert.equal(b.help.active,null);assert.equal(ao.latest,null);assert.equal(bo.latest,null);
});

test('end during an outage and worksheet exit cannot be undone by delayed recovery or assignments',()=>{
 const {n,a,b,ao,bo}=recoverable(),sessionId=a.help.active.sessionId;
 b.help.offline();a.help.left(b.profile.id);b.help.end();n.flush();assert.equal(a.help.active,null);
 a.help.receive({...api.packet(b.profile,b.session,'help'),help:{kind:'assigned',helperId:a.profile.id,requestId:n.id(90),sessionId}});n.flush();assert.equal(a.help.active,null);
 bo.refresh();assert.equal(bo.latest,null);assert.equal(ao.cueTokens.size,0);
});

test('a delayed point for a reused semantic cell is rejected after state changes',()=>{
 const {n,a,b,ao,bo,ag,bg,cues,set}=guidedPair();
 const old={kind:'point',sessionId:a.help.active.sessionId,streamId:bo.streamId,recipientId:a.profile.id,cueToken:bo.cueToken,stateVersion:bo.received,sequence:99,target:'top:1'};
 set({...initial,first:{kind:'top',c:1}});b.help.send(a.profile.id,old);n.flush();assert.equal(cues.length,0);
 assert.ok(bg.send('point','top:1'));n.flush();assert.equal(cues.at(-1).target,'top:1');
});

test('shared reward presentation accepts bounded current-order counts and rejects unsafe payloads',()=>{
 const p=structuredClone(view);p.order={foodId:'pandesal',sprite:1};p.rewards=[{rank:1,name:'Coin Jar',chance:.7,base:320,count:4}];
 assert.equal(w.validPresentation(p),true);
 const html=WorksheetComponents.rewards(p.rewards);
 assert.match(html,/data-ticket-count="1"[^>]*>4</);assert.match(html,/>70%</);assert.doesNotMatch(html,/Lifetime|multiplier|onclick/);
 for(const change of [v=>v.order.sprite=99,v=>v.order.foodId='../x',v=>v.rewards[0].count=-1,v=>v.rewards[0].chance=NaN,v=>v.rewards[0].command='claim',v=>v.rewards[0].base=Infinity]){const bad=structuredClone(p);change(bad);assert.equal(w.validPresentation(bad),false)}
 const {set,bo,ao,n}=pair();ao.presentation=()=>p;ao.publish({state:initial});n.flush();assert.deepEqual(bo.latest.presentation.rewards,p.rewards);
 p.rewards[0].count++;ao.publish({state:initial});n.flush();assert.equal(bo.latest.presentation.rewards[0].count,5);
});
