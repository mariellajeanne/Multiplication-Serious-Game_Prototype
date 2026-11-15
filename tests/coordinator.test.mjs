import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/network/co-baker.js';
import '../src/network/coordinator.js';
const core=globalThis.CoBakerCore;
// A deterministic clock and queued, lossy transport exercise the production service.
function network(){
 let time=0,queue=[],blocked=new Set(),suspended=new Set();const clients=new Map(),history=[];
 const profile=n=>({id:n.toString(16).padStart(32,'0'),name:'Same Baker',number:'0042'});
 const deliver=(to,event)=>queue.push({to,event});
 function connect(n){
  const p=profile(n);let d;
  const transport={start(hello){clients.set(p.id,d);d.receive({kind:'status',status:'searching'});for(const peer of clients.values())if(peer!==d){deliver(peer.profile.id,{kind:'message',message:hello});deliver(p.id,{kind:'message',message:core.packet(peer.profile,peer.session,'hello')})}},stop(){clients.delete(p.id);for(const peer of clients.values())deliver(peer.profile.id,{kind:'left',playerId:p.id})},send(to,m){history.push({from:p.id,to,m});if(!blocked.has(p.id+to))deliver(to,{kind:'message',message:m})}};
  d=new core.Discovery(p,transport,()=>time);d.start();return d;
 }
 function flush(){let count=0;while(queue.length){assert.ok(++count<10000,'message storm');const {to,event}=queue.shift();if(!suspended.has(to))clients.get(to)?.receive(event)}}
 function advance(ms){for(let i=0;i<ms;i+=250){time+=250;if(time%5000===0)for(const x of clients.values())for(const y of clients.values())if(x!==y&&!blocked.has(x.profile.id+y.profile.id))deliver(y.profile.id,{kind:"message",message:core.packet(x.profile,x.session,"hello")});flush();for(const d of clients.values())if(!suspended.has(d.profile.id))d.expire();flush()}}
 function agree(expected){const leaders=[...clients.values()].filter(d=>!suspended.has(d.profile.id)).map(d=>d.coordinator.snapshot().leader);assert.ok(leaders.every(Boolean));assert.ok(leaders.every(l=>l.id===expected&&l.term===leaders[0].term));assert.equal([...clients.values()].filter(d=>d.coordinator.snapshot().role==='Coordinator').length,1)}
 return {connect,advance,flush,agree,clients,history,blocked,suspended,profile,deliver,now:()=>time};
}
test('simultaneous startup, duplicate display identities and sticky join use internal IDs',()=>{
 const n=network(),a=n.connect(8),b=n.connect(9),c=n.connect(10);n.advance(7000);n.agree(a.profile.id);
 const term=a.coordinator.snapshot().term;n.connect(1);n.advance(7000);n.agree(a.profile.id);assert.equal(a.coordinator.snapshot().term,term);
 assert.equal(b.profile.name,c.profile.name);assert.equal(b.profile.number,c.profile.number);
});
test('coordinator departure elects remaining Bakers; returning old leader adopts incumbent',()=>{
 const n=network(),a=n.connect(1),b=n.connect(2);n.connect(3);n.advance(7000);n.agree(a.profile.id);const old=a.coordinator.snapshot().term;
 a.stop();n.advance(7000);n.agree(b.profile.id);assert.ok(b.coordinator.snapshot().term>old);
 n.connect(1);n.advance(7000);n.agree(b.profile.id);
});

test('coordinator session replacement without player-left retires its old lease immediately',()=>{
 const n=network(),a=n.connect(1),b=n.connect(2);n.advance(7000);n.agree(a.profile.id);
 const old=a.session;a.coordinator.offline();a.session='f'.repeat(32);a.coordinator.online();
 b.receive({kind:'message',message:core.packet(a.profile,a.session,'hello')});
 assert.equal(b.coordinator.leader,null);assert.notEqual(a.session,old);
 n.advance(10000);n.agree(a.profile.id);
 assert.equal(b.coordinator.leader.session,a.session);
});
test('missing heartbeats become suspect, fail over without a transport-left event, and resume safely',()=>{
 const n=network(),a=n.connect(1),b=n.connect(2);n.advance(7000);n.agree(a.profile.id);
 n.suspended.add(a.profile.id);n.advance(7000);assert.equal(b.coordinator.snapshot().status,'Heartbeat delayed');
 n.advance(8000);assert.equal(b.coordinator.snapshot().role,'Coordinator');
 n.suspended.delete(a.profile.id);a.coordinator.resume();n.advance(7000);n.agree(b.profile.id);
});
test('relay outage clears leadership; reconnection and single-player network recover',()=>{
 const n=network(),a=n.connect(1),b=n.connect(2);n.advance(7000);
 for(const d of [a,b])d.receive({kind:'status',status:'disconnected'});
 n.advance(10000);for(const d of [a,b]){assert.equal(d.coordinator.snapshot().role,'Offline');assert.equal(d.coordinator.snapshot().leader,null)}
 for(const d of [a,b])d.receive({kind:'status',status:'searching'});
 for(const [x,y]of [[a,b],[b,a]])x.receive({kind:'message',message:core.packet(y.profile,y.session,'hello')});
 n.advance(7000);n.agree(a.profile.id);b.stop();n.advance(5000);n.agree(a.profile.id);assert.equal(a.coordinator.snapshot().participants,1);
});
test('partition leaders deterministically converge after healing',()=>{
 const n=network(),a=n.connect(1),b=n.connect(2);n.advance(7000);
 n.blocked.add(a.profile.id+b.profile.id);n.blocked.add(b.profile.id+a.profile.id);n.advance(18000);
 assert.equal(a.coordinator.snapshot().role,'Coordinator');assert.equal(b.coordinator.snapshot().role,'Coordinator');
 n.blocked.clear();n.advance(10000);n.agree(b.profile.id);
});
test('independent same-term leaders resolve by stable ID, not arrival order',()=>{
 const n=network(),x=n.profile(1).id,y=n.profile(2).id;
 n.blocked.add(x+y);n.blocked.add(y+x);const a=n.connect(1),b=n.connect(2);n.advance(7000);
 assert.equal(a.coordinator.snapshot().role,'Coordinator');assert.equal(b.coordinator.snapshot().role,'Coordinator');
 assert.equal(a.coordinator.snapshot().term,b.coordinator.snapshot().term);
 n.blocked.clear();n.advance(10000);n.agree(a.profile.id);
});
test('partition healing between lease expiry and replacement election cannot deadlock',()=>{
 const n=network(),a=n.connect(1),b=n.connect(2);n.advance(7000);
 n.blocked.add(a.profile.id+b.profile.id);n.blocked.add(b.profile.id+a.profile.id);
 for(let i=0;i<45&&b.coordinator.leader;i++)n.advance(250);
 assert.equal(b.coordinator.leader,null);assert.equal(a.coordinator.snapshot().role,'Coordinator');
 n.blocked.clear();n.advance(12000);n.agree(a.profile.id);
 assert.ok(a.coordinator.snapshot().term>1);
});
test('a delayed response beyond the challenge deadline cannot replace the current coordinator',()=>{
 const n=network(),a=n.connect(1),b=n.connect(2);n.advance(7000);
 n.blocked.add(a.profile.id+b.profile.id);b.coordinator.asked.clear();b.coordinator.probe(a.profile.id);n.flush();
 const request=[...b.coordinator.pending][0];assert.ok(request);n.advance(5000);
 const m=core.packet(a.profile,a.session,'coord');m.coord={kind:'state',replyTo:request[0],term:999,leader:{id:a.profile.id,session:a.session,term:999}};
 b.receive({kind:'message',message:m});assert.notEqual(b.coordinator.snapshot().term,999);
});
test('unsolicited, duplicated, expired and stale-epoch responses cannot renew leadership',()=>{
 const n=network(),a=n.connect(1),b=n.connect(2);n.advance(7000);
 const response=n.history.filter(x=>x.from===a.profile.id&&x.m.coord.kind==='state'&&x.m.coord.leader).at(-1).m;
 const before=b.coordinator.leader.at;
 b.receive({kind:'message',message:{...response,id:'e'.repeat(32)}});assert.equal(b.coordinator.leader.at,before);
 a.stop();n.advance(6000);assert.equal(b.coordinator.snapshot().role,'Coordinator');
 b.receive({kind:'message',message:{...response,id:'f'.repeat(32)}});assert.equal(b.coordinator.snapshot().role,'Coordinator');
 // Even a fresh reply to a fresh challenge cannot revive a retired epoch.
 const probe=core.packet(a.profile,a.session,'hello');b.receive({kind:'message',message:probe});
 const request=[...b.coordinator.pending].find(([,p])=>p.id===a.profile.id);
 assert.ok(request);const stale={...response,id:'d'.repeat(32),coord:{...response.coord,replyTo:request[0]}};
 b.receive({kind:'message',message:stale});assert.equal(b.coordinator.snapshot().role,'Coordinator');
});
test('rapid churn settles and coordinator protocol rejects game payloads and malformed epochs',()=>{
 const n=network();n.connect(20);n.advance(6000);
 for(let i=1;i<15;i++){const d=n.connect(i);n.advance(250);d.stop();n.advance(250)}n.advance(8000);n.agree(n.profile(20).id);
 const m=core.packet(n.profile(20),'a'.repeat(32),'coord');m.coord={kind:'state',replyTo:'b'.repeat(32),term:1,leader:null};assert.ok(core.validPacket(m));
 for(const c of [{...m.coord,term:'1'},{...m.coord,term:1.5},{...m.coord,term:-1},{...m.coord,coins:99},{kind:'help'},{kind:'probe',worksheet:{}},{...m.coord,leader:{id:'c'.repeat(32),session:'d'.repeat(32),term:2}}])assert.equal(core.validPacket({...m,coord:c}),false);
 assert.equal(core.validPacket({...m,type:'hello'}),false);
});
