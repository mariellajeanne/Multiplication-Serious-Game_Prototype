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
 return {join,flush,advance,connected,now:()=>now,id};
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
 assert.equal(b.help.status(),'Busy');assert.equal(a.help.outgoing,null);
 assert.equal(a.help.request([b.profile.id]).ok,false);
 b.help.end();n.flush();assert.equal(a.help.active,null);assert.equal(b.help.active,null);
 assert.equal(b.help.status(),'Available');
});
test('Call All simultaneous acceptances produce only one helper lock',()=>{
 const n=network(),a=n.join(1),b=n.join(2),c=n.join(3);n.flush();a.isOnWorksheet=true;
 assert.equal(a.help.request([b.profile.id,c.profile.id]).ok,true);n.flush();
 const req=[...b.help.incoming.keys()][0];assert.equal(c.help.incoming.has(req),true);
 b.help.accept(req);c.help.accept(req);n.flush();
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
