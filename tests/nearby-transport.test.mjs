import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
globalThis.crypto ??= webcrypto;
await import('../src/network/co-baker.js');
await import('../src/network/nearby-transport.js');
const p={id:'a'.repeat(32),name:'Ada',number:'0022'},other={id:'b'.repeat(32),name:'Bea',number:'0022'};
test('Nearby candidates do not become connected participants or authorize sessions',async()=>{
 const calls=[],bridge={start:x=>calls.push('start'),stop:()=>calls.push('stop'),connect:id=>calls.push(id),send:()=>{},scan:()=>calls.push('scan'),retain:()=>{}};
 const d=new CoBakerCore.Discovery(p,null);const t=new NearbyTransport(bridge,e=>d.receive(e));d.transport=t;await d.start();
 t.event({kind:'candidate',player:{...other,available:true}});t.event({kind:'candidate',player:{...other,available:true}});
 assert.equal(d.candidates.size,1);assert.equal(d.peers.size,0);assert.equal(calls.length,1);
 t.scan();t.scan();assert.equal(calls.filter(x=>x==='scan').length,1);
 const connecting=t.connect(other.id);assert.equal(t.connect(other.id),connecting);await Promise.resolve();assert.equal(calls.filter(x=>x===other.id).length,1);
 t.event({kind:'message',message:CoBakerCore.packet(other,'c'.repeat(32),'hello')});assert.equal(await connecting,true);assert.equal(d.peers.size,1);
 t.event({kind:'left',playerId:other.id});assert.equal(d.peers.size,0);assert.equal(d.candidates.size,1);
 const pending=t.connect(other.id);d.stop();assert.equal(await pending,false);assert.equal(t.waiting.size,0);
});
test('unavailable service events stay graceful and do not mix transports',async()=>{
 const d=new CoBakerCore.Discovery(p,null),bridge={start(){},stop(){}};const t=new NearbyTransport(bridge,e=>d.receive(e));d.transport=t;await d.start();
 t.event({kind:'status',status:'unavailable',error:'Permission denied'});assert.equal(d.status,'unavailable');assert.equal(d.peers.size,0);
 d.stop();t.event({kind:'message',message:CoBakerCore.packet(other,'c'.repeat(32),'hello')});assert.equal(d.peers.size,0);
});
test('rejected/failed connections resolve promptly, and unavailable service clears connection state',async()=>{
 const events=[],bridge={start(){},stop(){},connect(){}};const t=new NearbyTransport(bridge,e=>events.push(e));t.start(CoBakerCore.packet(p,'d'.repeat(32),'hello'));
 const pending=t.connect(other.id);t.event({kind:'connection-failed',playerId:other.id});assert.equal(await pending,false);assert.equal(t.waiting.size,0);
 t.event({kind:'message',message:CoBakerCore.packet(other,'c'.repeat(32),'hello')});assert.equal(t.connected.size,1);
 t.event({kind:'message',message:CoBakerCore.packet(p,'d'.repeat(32),'hello')});assert.equal(t.connected.size,1);
 const second=t.connect('e'.repeat(32));t.event({kind:'status',status:'unavailable',error:'Google Play services unavailable'});assert.equal(await second,false);assert.equal(t.connected.size,0);t.stop();
});
test('sparse maintenance retains active invitations and outstanding rewards, never Crew or all candidates',async()=>{
 const retained=[],connections=[],bridge={start(){},stop(){},scan(){},retain:s=>retained.push(JSON.parse(s)),connect:id=>connections.push(id)};
 const t=new NearbyTransport(bridge,()=>{});t.start(CoBakerCore.packet(p,'d'.repeat(32),'hello'));t.connected.add(other.id);
 const ledger={outbox:{r:{helperId:other.id,acknowledged:false}}},d={help:{active:null,accepting:null,outgoing:null,incoming:new Map()},candidates:new Map([['e'.repeat(32),{}]]),rewards:{a:{state:()=>({coBakerRewards:ledger})}}};
 t.maintain(d);assert.deepEqual(retained.at(-1),[other.id]);assert.deepEqual(connections,[]);
 t.receiptLeases.set(other.id,Date.now()-1);t.maintain(d);assert.deepEqual(retained.at(-1),[],'unacknowledged receipts do not hold a permanent connection');
 ledger.outbox.r.acknowledged=true;t.maintain(d);assert.deepEqual(retained.at(-1),[]);
 d.help.incoming.set('f'.repeat(32),{ownerId:other.id});t.maintain(d);assert.deepEqual(retained.at(-1),[other.id]);t.stop();
});

test('radio capacity differs from logical slots, serializes consent, and prioritizes queued manual calls',async()=>{
 const connections=[],released=[],bridge={start(){},stop(){},connect:id=>connections.push(id),release:id=>released.push(id)};
 const t=new NearbyTransport(bridge,()=>{});t.start(CoBakerCore.packet(p,'d'.repeat(32),'hello'));
 const ids=['b','c','d','e'].map(x=>x.repeat(32));
 const random=t.connect(ids[0],{priority:1}),manual=t.connect(ids[1],{priority:0}),another=t.connect(ids[2],{priority:1});await Promise.resolve();assert.deepEqual(connections,[ids[1]]);
 const hello=id=>t.event({kind:'message',message:CoBakerCore.packet({...other,id},'f'.repeat(32),'hello')});
 hello(ids[1]);assert.equal(await manual,true);assert.deepEqual(connections,[ids[1],ids[0]]);hello(ids[0]);assert.equal(await random,true);hello(ids[2]);assert.equal(await another,true);assert.equal(t.connected.size,3);
 const fourth=t.connect(ids[3],{priority:0});await Promise.resolve();assert.equal(connections.length,3,'three live links block setup without dropping active work');
 t.event({kind:'left',playerId:ids[2]});assert.equal(connections.at(-1),ids[3]);t.cancelConnect(ids[3]);assert.equal(await fourth,false);assert.deepEqual(released,[ids[3]]);t.stop();
});
test('closing discovery keeps incoming capability and active link, idle temporary links release safely',()=>{
 const calls=[],bridge={start(){},stop(){},scan(){calls.push('scan')},stopScan(){calls.push('stop-scan')},retain:s=>calls.push(JSON.parse(s)),release:id=>calls.push(id)};
 const t=new NearbyTransport(bridge,()=>{});t.start(CoBakerCore.packet(p,'d'.repeat(32),'hello'));t.setDiscovering(true);t.setDiscovering(false);assert.deepEqual(calls,['scan','stop-scan']);assert.equal(t.active,true);
 t.connected.add(other.id);const d={help:{active:{otherId:other.id},incoming:new Map(),calls:new Map()},candidates:new Map()};t.idle.set(other.id,0);t.maintain(d);assert.equal(calls.includes(other.id),false);assert.equal(t.idle.has(other.id),false);
 d.help.active=null;t.maintain(d);t.idle.set(other.id,Date.now()-1001);t.maintain(d);assert.equal(calls.at(-1),other.id);t.stop();
});
test('cancelling queued setup never opens a native connection, stopping resolves all reservations',async()=>{
 const calls=[],bridge={start(){},stop(){},connect:id=>calls.push(id),release:id=>calls.push('release:'+id)};
 const t=new NearbyTransport(bridge,()=>{});t.start(CoBakerCore.packet(p,'d'.repeat(32),'hello'));const pending=t.connect(other.id);t.cancelConnect(other.id);await Promise.resolve();assert.equal(await pending,false);assert.deepEqual(calls,[]);
 const next=t.connect(other.id);await Promise.resolve();t.stop();assert.equal(await next,false);assert.equal(t.waiting.size,0);
});
