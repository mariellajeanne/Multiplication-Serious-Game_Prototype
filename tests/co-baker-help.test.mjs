import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
globalThis.crypto ??= webcrypto;
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
test('strict help protocol rejects malformed and unknown payloads',()=>{
 const p={id:'a'.repeat(32),name:'Baker',number:'0123'},m=api.packet(p,'b'.repeat(32),'help');
 m.help={kind:'invite',requestId:'c'.repeat(32),expiresAt:Date.now()+30000};assert.equal(api.validPacket(m),true);
 for(const help of [
  {kind:'invite',requestId:'c'.repeat(32),expiresAt:'tomorrow'},
  {kind:'presence',available:true,busy:false,coins:999},
  {kind:'assigned',requestId:'c'.repeat(32),sessionId:'broken',helperId:'a'.repeat(32)},
  {kind:'unknown',requestId:'c'.repeat(32)}
 ])assert.equal(api.validPacket({...m,help}),false);
});
test('direct request: one helper reserves, learner owns session, end clears Busy',()=>{
 const n=network(),a=n.join(1),b=n.join(2);n.flush();a.isOnWorksheet=true;
 assert.equal(a.help.eligible(b.profile.id),true);assert.equal(a.help.request([b.profile.id]).ok,true);n.flush();
 assert.equal(b.help.incoming.size,1);assert.equal(b.help.accept([...b.help.incoming.keys()][0]),true);n.flush();
 assert.equal(a.help.active.otherId,b.profile.id);assert.equal(a.help.active.role,'Learner');
 assert.equal(b.help.active.otherId,a.profile.id);assert.equal(b.help.active.role,'Helper');
 assert.equal(b.help.status(),'Available');assert.equal(a.help.outgoing,null);
 assert.equal(a.help.request([b.profile.id]).ok,false);
 b.help.end();n.flush();assert.equal(a.help.active,null);assert.equal(b.help.active,null);
 assert.equal(b.help.status(),'Available');
});
test('simultaneous independent acceptances produce only one helper lock',()=>{
 const n=network(),a=n.join(1),b=n.join(2),c=n.join(3);n.flush();a.isOnWorksheet=true;
 assert.equal(a.help.request([b.profile.id,c.profile.id]).ok,true);n.flush();
 const req=[...b.help.incoming.keys()][0],other=[...c.help.incoming.keys()][0];assert.notEqual(other,req);
 b.help.accept(req);c.help.accept(other);n.flush();
 assert.equal(a.help.active.otherId,b.profile.id);
 assert.equal(b.help.active.role,'Helper');assert.equal(c.help.active,null);
 assert.equal(c.help.incoming.size,0);assert.equal(c.help.accepting,null);
 assert.equal(c.help.status(),'Available');
});
test('DND, cancellation, expiration and worksheet exit do not create sessions',()=>{
 const n=network(),a=n.join(1),b=n.join(2);n.flush();a.isOnWorksheet=true;
 b.help.setAvailable(false);n.flush();assert.equal(a.help.eligible(b.profile.id),false);
 b.help.setAvailable(true);n.flush();a.help.request([b.profile.id]);n.flush();const req=[...b.help.incoming.keys()][0];
 a.help.cancel();n.flush();assert.equal(b.help.incoming.has(req),false);
 a.help.request([b.profile.id]);n.flush();n.advance(46000);
 assert.equal(a.help.outgoing,null);assert.equal(b.help.incoming.size,0);
 a.help.request([b.profile.id]);n.flush();a.isOnWorksheet=false;n.advance(1000);
 assert.equal(a.help.outgoing,null);assert.equal(b.help.incoming.size,0);
});
test('coordinator departure leaves direct helper reservation until helper leaves',()=>{
 const n=network(),coordinator=n.join(1),a=n.join(2),b=n.join(3);n.flush();a.isOnWorksheet=true;
 a.help.request([b.profile.id]);n.flush();b.help.accept([...b.help.incoming.keys()][0]);n.flush();
 coordinator.stop();n.flush();assert.ok(a.help.active);assert.ok(b.help.active);
 b.stop();n.flush();assert.ok(a.help.active.lostAt);
 n.advance(15500);assert.equal(a.help.active,null);
});

test('same persistent player with a replacement session retires its old help reservation without left',()=>{
 const n=network(),a=n.join(1),b=n.join(2);n.flush();a.isOnWorksheet=true;
 a.help.request([b.profile.id]);n.flush();b.help.accept([...b.help.incoming.keys()][0]);n.flush();
 assert.ok(a.help.active);
 const old=b.session;b.session='e'.repeat(32);assert.notEqual(b.session,old);
 a.receive({kind:'message',message:api.packet(b.profile,b.session,'hello')});
 assert.equal(a.help.active,null);assert.equal(a.peers.get(b.profile.id).session,b.session);
 assert.match(a.help.log[0].message,/restarted/);
});

test('cancel after helper accepts clears the pending confirmation immediately',()=>{
 const n=network(),a=n.join(1),b=n.join(2);n.flush();a.isOnWorksheet=true;
 const {requestId}=a.help.request([b.profile.id]);n.flush();
 b.help.accept(requestId);a.help.cancel();
 const cancel=n.queue.find(([,e])=>e.message?.help?.kind==='cancel')[1];b.receive(cancel);
 assert.equal(b.help.accepting,null);assert.equal(b.help.status(),'Available');
 n.flush();
 assert.equal(a.help.active,null);
});

test('late assignment after confirmation timeout releases the learner reservation',()=>{
 const n=network(),a=n.join(1),b=n.join(2);n.flush();a.isOnWorksheet=true;
 const {requestId}=a.help.request([b.profile.id]);n.flush();b.help.accept(requestId);
 const accept=n.queue.find(([,e])=>e.message?.help?.kind==='accept')[1];a.receive(accept);
 const assigned=n.queue.find(([,e])=>e.message?.help?.kind==='assigned')[1];
 b.help.clock=()=>n.now()+51000;b.help.tick();b.receive(assigned);n.flush();
 assert.equal(b.help.active,null);assert.equal(a.help.active,null);
});

test('a helper that declined cannot win with a delayed acceptance',()=>{
 const n=network(),a=n.join(1),b=n.join(2),c=n.join(3);n.flush();a.isOnWorksheet=true;
 const {requestId}=a.help.request([b.profile.id,c.profile.id]);n.flush();b.help.decline(requestId);n.flush();
 const m=api.packet(b.profile,b.session,'help');m.help={kind:'accept',requestId};a.receive({kind:'message',message:m});n.flush();
 assert.equal(a.help.active,null);assert.ok(a.help.outgoing);
});

test('delayed packets from a replaced session cannot roll back the peer or end its new reservation',()=>{
 const n=network(),a=n.join(1),b=n.join(2);n.flush();a.isOnWorksheet=true;
 const old=b.session;b.session='e'.repeat(32);
 a.receive({kind:'message',message:api.packet(b.profile,b.session,'hello')});
 b.help.broadcastPresence();n.flush();a.help.request([b.profile.id]);n.flush();b.help.accept([...b.help.incoming.keys()][0]);n.flush();
 const active=a.help.active;assert.ok(active);
 a.receive({kind:'message',message:api.packet(b.profile,old,'hello')});
 assert.equal(a.peers.get(b.profile.id).session,b.session);assert.equal(a.help.active,active);
});

test('replayed assignments and old session endings cannot release a current reservation',()=>{
 const n=network(),a=n.join(1),b=n.join(2);n.flush();a.isOnWorksheet=true;
 a.help.request([b.profile.id]);n.flush();b.help.accept([...b.help.incoming.keys()][0]);n.flush();
 const current=b.help.active;
 for(const sessionId of [current.sessionId,'f'.repeat(32)]){
  const m=api.packet(a.profile,a.session,'help');
  m.help={kind:'assigned',requestId:current.requestId,sessionId,helperId:b.profile.id};
  b.receive({kind:'message',message:m});n.flush();
  assert.equal(b.help.active,current);assert.equal(a.help.active.sessionId,current.sessionId);
 }
 a.isOnWorksheet=false;n.advance(1000);
 assert.equal(a.help.active,null);assert.equal(b.help.active,null);
});

test('15-second lifetime, protocol cooldowns, local dismiss tombstones and cancellation feedback',()=>{
 const n=network(),a=n.join(1),b=n.join(2);n.flush();a.isOnWorksheet=true;
 const r=a.help.request([b.profile.id]);n.flush();assert.equal(a.help.outgoing.expiresAt-n.now(),15000);
 const original=api.packet(a.profile,a.session,'help');original.help={kind:'invite',requestId:r.requestId,expiresAt:n.now()+15000};
 b.help.decline(r.requestId);n.flush();b.receive({kind:'message',message:original});assert.equal(b.help.incoming.size,0);
 assert.equal(a.help.request([b.profile.id]).ok,false);n.advance(30000);assert.equal(a.help.request([b.profile.id]).ok,true);n.flush();
 const req=a.help.outgoing.requestId;a.help.cancel();n.flush();assert.equal(b.help.terminals.get(req).text,'cancelled the call');n.advance(2100);assert.equal(b.help.terminals.size,0);
 n.advance(30000);const last=a.help.request([b.profile.id]);n.flush();n.advance(15000);assert.equal(b.help.accept(last.requestId),false);assert.equal(a.help.outgoing,null);
});

test('receiver limits forged fresh campaigns and suppresses requests while unavailable',()=>{
 const n=network(),a=n.join(1),b=n.join(2);n.flush();
 for(let i=0;i<100;i++){const m=api.packet(a.profile,a.session,'help');m.help={kind:'invite',requestId:api.packet(a.profile,a.session,'hello').id,expiresAt:n.now()+15000};b.receive({kind:'message',message:m})}
 assert.equal(b.help.incoming.size,1);assert.ok(b.help.records.size<=CoBakerHelpRules.maxRecords);
 b.help.setAvailable(false);for(const key of [...b.help.incoming.keys()])b.help.decline(key);n.advance(30000);
 const m=api.packet(a.profile,a.session,'help');m.help={kind:'invite',requestId:'f'.repeat(32),expiresAt:n.now()+15000};b.receive({kind:'message',message:m});assert.equal(b.help.incoming.size,0);
});

test('public presence shares only calculated availability, even during an active session',()=>{
 const n=network(),a=n.join(1),b=n.join(2);n.flush();a.isOnWorksheet=true;
 a.help.broadcastPresence();const m=n.queue.find(([,e])=>e.message?.help?.kind==='presence')[1].message;
 assert.deepEqual(Object.keys(m.help).sort(),['available','kind']);n.flush();a.help.request([b.profile.id]);n.flush();b.help.accept([...b.help.incoming.keys()][0]);n.flush();
 assert.equal(a.help.status(),'Available');assert.equal(b.help.status(),'Available');assert.equal(a.help.isBusy(),true);
});

test('manual and random share slots, and first acceptance cancels the others',()=>{
 const n=network(),a=n.join(1),b=n.join(2),c=n.join(3);n.flush();a.isOnWorksheet=true;a.help.setPicker(true);
 const r=a.help.request([b.profile.id]);assert.equal(a.help.startSearch().ok,true);n.flush();
 assert.equal(a.help.calls.get(b.profile.id).source,'manual');assert.equal(a.help.calls.get(c.profile.id).source,'random');
 const other=[...c.help.incoming.keys()][0];b.help.accept(r.requestId);c.help.accept(other);n.flush();assert.equal(a.help.active.otherId,b.profile.id);
 assert.equal(c.help.terminals.get(other).text,'found help!');assert.equal(a.help.search,null);assert.equal(a.help.calls.size,0);
});

test('switching serializes sessions, refuses failed saves, and revalidates expiration after preparation',async()=>{
 const n=network(),a=n.join(1),b=n.join(2),c=n.join(3);n.flush();a.isOnWorksheet=c.isOnWorksheet=true;
 const first=a.help.request([b.profile.id]);n.flush();b.help.accept(first.requestId);n.flush();const old=b.help.active.sessionId;
 const next=c.help.request([b.profile.id]);n.flush();assert.equal(b.help.incoming.size,1);assert.equal(await b.help.switchTo(next.requestId,old,()=>false),false);assert.equal(b.help.active.sessionId,old);
 let release;const pending=b.help.switchTo(next.requestId,old,()=>new Promise(r=>release=r));assert.equal(await b.help.switchTo(next.requestId,old),false);release(true);assert.equal(await pending,true);n.flush();
 assert.equal(a.help.active,null);assert.equal(b.help.active.otherId,c.profile.id);assert.equal(c.help.active.role,'Learner');
 b.help.end();n.flush();n.advance(30000);const late=a.help.request([b.profile.id]);n.flush();assert.equal(await b.help.switchTo(late.requestId,null,()=>{n.advance(15001);return true}),false);assert.equal(b.help.active,null);
});

test('sparse slots reserve independently and expire only after acknowledged delivery',async()=>{
 const n=network(),a=n.join(1),b=n.join(2),c=n.join(3),e=n.join(4);n.flush();a.isOnWorksheet=true;
 const releases=new Map();a.transport.sparse=true;a.transport.connect=id=>new Promise(r=>releases.set(id,r));
 const r=a.help.request([b.profile.id,c.profile.id,e.profile.id]);assert.equal(a.help.calls.size,3);assert.equal(a.help.outgoing.expiresAt,0);n.advance(18000);assert.equal(b.help.incoming.size,0);
 releases.get(b.profile.id)(true);await Promise.resolve();n.flush();assert.equal(a.help.calls.get(b.profile.id).expiresAt-n.now(),15000);assert.equal(b.help.incoming.has(r.requestId),true);assert.equal(c.help.incoming.size,0);
 n.advance(5000);releases.get(c.profile.id)(true);await Promise.resolve();n.flush();assert.equal(a.help.calls.get(c.profile.id).expiresAt-n.now(),15000);assert.equal(a.help.calls.get(b.profile.id).expiresAt-n.now(),10000);
 a.help.finishCall(e.profile.id,'cancel',true);releases.get(e.profile.id)(true);await Promise.resolve();n.flush();assert.equal(e.help.incoming.size,0);a.help.cancel();n.flush();
});

test('confirmed switch uses the invitation context, rather than a temporary bakery mute after saving',async()=>{
 await import('../src/network/baker-preferences.js');
 const n=network(),a=n.join(1),b=n.join(2);n.flush();a.isOnWorksheet=b.isOnWorksheet=true;
 b.help.preferences=new CoBakerPreferences({getItem:()=>null,setItem(){}});b.help.preferences.set('bakery',true);
 const r=a.help.request([b.profile.id]);n.flush();assert.equal(await b.help.switchTo(r.requestId,null,()=>{b.isOnWorksheet=false;return true}),true);n.flush();assert.equal(b.help.active.role,'Helper');
});

function classroom(count=8){const n=network(),a=n.join(1),bakers=Array.from({length:count},(_,i)=>n.join(i+2));n.flush();a.isOnWorksheet=true;a.help.random=()=>0;a.help.setPicker(true);return {n,a,bakers}}
test('three shared slots include pending setup and reject duplicates by permanent UUID',()=>{
 const {n,a,bakers:b}=classroom();a.help.request([b[0].profile.id]);a.help.startSearch();n.flush();assert.equal(a.help.calls.size,3);
 assert.equal(a.help.request([b[0].profile.id,b[3].profile.id]).ok,false);assert.equal(new Set(a.help.calls.keys()).size,3);
 for(const p of b)assert.ok(p.help.incoming.size<=1);
});
test('automatic expiry and decline refill with untried candidates before repeats',()=>{
 const {n,a,bakers:b}=classroom();a.help.startSearch();n.flush();const tried=[...a.help.calls.keys()];
 b[0].help.decline([...b[0].help.incoming.keys()][0]);n.flush();assert.equal(a.help.calls.size,3);assert.ok(!a.help.calls.has(tried[0]));
 n.advance(15000);assert.equal(a.help.calls.size,3);assert.ok([...a.help.calls.keys()].every(id=>!tried.includes(id)));
});
test('individual random cancellation pauses refill, explicit resume works, Stop preserves manual calls',()=>{
 const {n,a,bakers:b}=classroom();a.help.request([b[0].profile.id]);a.help.startSearch();n.flush();
 const random=[...a.help.calls.values()].find(c=>c.source==='random');a.help.finishCall(random.id,'cancel',true);n.flush();n.advance(1000);assert.equal(a.help.calls.size,2);assert.equal(a.help.search.active,false);
 a.help.startSearch();n.flush();assert.equal(a.help.calls.size,3);a.help.stopSearch();n.flush();assert.equal(a.help.calls.size,1);assert.equal(a.help.calls.get(b[0].profile.id).source,'manual');
});
test('manual cancellations never create replacements outside automatic search',()=>{
 const {n,a,bakers:b}=classroom();a.help.request(b.slice(0,3).map(p=>p.profile.id));n.flush();const c=a.help.calls.get(b[1].profile.id);a.help.finishCall(c.id,'cancel',true);n.flush();n.advance(1000);assert.equal(a.help.calls.size,2);assert.equal(b[1].help.incoming.size,0);
});
test('exhausted searches recontact after cooldown, stop at 60 seconds, preserve manual calls',()=>{
 const {n,a,bakers:b}=classroom(2);a.help.startSearch();n.flush();assert.equal(a.help.calls.size,2);n.advance(15000);assert.equal(a.help.calls.size,0);
 n.advance(14999);assert.equal(a.help.calls.size,0);n.advance(1);assert.equal(a.help.calls.size,2);n.advance(15000);assert.equal(a.help.calls.size,0);n.advance(15000);assert.equal(a.help.search.active,false);assert.equal(a.help.calls.size,0);
 a.help.request([b[0].profile.id]);n.flush();a.help.tick();assert.equal(a.help.calls.size,1);
});
test('closing and reopening picker pauses candidate refill but preserves delivered invitations',()=>{
 const {n,a}=classroom();a.help.startSearch();n.flush();const ids=[...a.help.calls.keys()];a.help.setPicker(false);assert.equal(a.help.calls.size,3);
 n.advance(15000);assert.equal(a.help.calls.size,0);assert.equal(a.help.search.active,true);a.help.setPicker(true);n.flush();assert.equal(a.help.calls.size,3);assert.ok([...a.help.calls.keys()].every(id=>!ids.includes(id)));
});
test('bounded setup timeout frees slots and late connection resolution cannot send invitations',async()=>{
 const {n,a,bakers:b}=classroom(4),pending=new Map(),cancelled=[];a.transport.sparse=true;a.transport.connect=id=>new Promise(r=>pending.set(id,r));a.transport.cancelConnect=id=>cancelled.push(id);
 a.help.request(b.slice(0,3).map(p=>p.profile.id));assert.equal(a.help.calls.size,3);assert.equal(a.help.request([b[3].profile.id]).ok,false);
 n.advance(CoBakerHelpRules.setupMs);assert.equal(a.help.calls.size,0);assert.equal(cancelled.length,3);for(const release of pending.values())release(true);await Promise.resolve();n.flush();assert.ok(b.every(p=>!p.help.incoming.size));
});
test('unacknowledged delivery has its own short timeout, acceptance cannot bypass it',()=>{
 const {n,a,bakers:b}=classroom(1);a.help.request([b[0].profile.id]);const c=a.help.calls.get(b[0].profile.id);assert.equal(c.expiresAt,0);assert.equal(c.state,'delivering');
 const m=api.packet(b[0].profile,b[0].session,'help');m.help={kind:'accept',requestId:c.requestId};a.receive({kind:'message',message:m});assert.equal(a.help.active,null);
 n.queue.length=0;n.advance(CoBakerHelpRules.deliveryMs);assert.equal(a.help.calls.size,0);
});
test('manual priority, rate budget, per-person cooldown and interrupted cooldown cannot be bypassed',()=>{
 const {n,a,bakers:b}=classroom();a.help.startSearch();n.flush();const id=[...a.help.calls.keys()][0];a.help.finishCall(id,'cancel',true);a.help.stopSearch();n.flush();
 assert.equal(a.help.request([id]).ok,false);n.advance(30000);assert.equal(a.help.request([id]).ok,false);n.advance(15000);assert.equal(a.help.request([id]).ok,true);
 a.help.cancel();a.help.callTimes=Array(CoBakerHelpRules.maxCallsPerWindow).fill(n.now());assert.equal(a.help.request([b[7].profile.id]).ok,false);
});
test('all-manual capacity disables automatic campaign start; duplicate start keeps one campaign',()=>{
 const {n,a,bakers:b}=classroom();a.help.request(b.slice(0,3).map(p=>p.profile.id));n.flush();assert.equal(a.help.startSearch().ok,false);
 a.help.finishCall(b[0].profile.id,'cancel',true);a.help.startSearch();const campaign=a.help.search;a.help.startSearch();assert.equal(a.help.search,campaign);assert.equal(a.help.calls.size,3);
});
test('random selection ignores favorites and game statistics and fairly randomizes equal history',()=>{
 const counts=new Map();for(let i=0;i<60;i++){const {a,bakers:b}=classroom(6);a.help.random=()=>i/60;a.help.preferences={crew:new Map([[b[0].profile.id,b[0].profile]])};a.help.startSearch();const first=[...a.help.calls.keys()][0];counts.set(first,(counts.get(first)||0)+1)}assert.equal(counts.size,6);assert.deepEqual([...counts.values()],Array(6).fill(10));
});

test('repeat cooldown follows acknowledged delivery even when radio setup is slow',async()=>{
 const {n,a,bakers:b}=classroom(1);let release;a.transport.sparse=true;a.transport.connect=()=>new Promise(r=>release=r);a.help.startSearch();n.advance(25000);release(true);await Promise.resolve();n.flush();
 const id=b[0].profile.id;assert.equal(a.help.calls.get(id).expiresAt,n.now()+15000);n.advance(15000);assert.equal(a.help.calls.size,0);n.advance(14999);assert.equal(a.help.calls.size,0);n.advance(1);assert.equal(a.help.calls.size,1);a.help.stopSearch();
});
test('batch API cannot overrun the same rolling rate budget used by individual calls',()=>{
 const {n,a,bakers:b}=classroom();a.help.callTimes=Array(CoBakerHelpRules.maxCallsPerWindow-1).fill(n.now());const r=a.help.request(b.slice(0,3).map(p=>p.profile.id));assert.equal(r.ok,true);assert.equal(a.help.calls.size,1);assert.equal(a.help.callTimes.length,CoBakerHelpRules.maxCallsPerWindow);
});
