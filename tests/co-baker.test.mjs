import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
function core(crypto=webcrypto){const c=vm.createContext({crypto});vm.runInContext(readFileSync(new URL('../src/network/co-baker.js',import.meta.url),'utf8'),c);return c.CoBakerCore}
function storage(){const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}}
test('identity persists separately from bakery saves; leading zeros and duplicate labels are safe',()=>{
 const api=core({getRandomValues:a=>{a.fill(0);return a}}),s=storage(),p=api.identity(s);assert.equal(p.name,'Baker');assert.equal(p.number,'0000');assert.match(p.id,/^[a-f0-9]{32}$/);assert.deepEqual(api.identity(s),p);
 s.setItem(api.KEY,JSON.stringify({...p,name:'Maria'}));const renamed=api.identity(s);assert.equal(renamed.name,'Maria');assert.equal(renamed.id,p.id);assert.equal(renamed.number,p.number);assert.equal(s.getItem('panaderyaQuestV2'),undefined);
});
test('two simulated transports exchange tests and responses; IDs dedupe peers independently of labels',async()=>{
 const a=core(),p=a.identity(storage()),q=a.identity(storage());let clock=0,A,B;
 const deliver=(receiver,m)=>receiver.receive({kind:'message',message:m});
 A=new a.Discovery(p,{start:m=>deliver(B,m),stop(){},send:(id,m)=>{deliver(B,m);deliver(A,a.packet(q,B.session,'reply',m.id))}},()=>clock);
 B=new a.Discovery({...q,name:p.name,number:p.number},{start:m=>deliver(A,m),stop(){},send:(id,m)=>{deliver(A,m);deliver(B,a.packet(p,A.session,'reply',m.id))}},()=>clock);
 await B.start();await A.start();deliver(A,a.packet(B.profile,B.session,'hello'));assert.equal(A.peers.size,1);assert.equal(B.peers.size,1);
 const m=a.packet(B.profile,B.session,'hello');deliver(A,m);deliver(A,m);assert.equal(A.peers.size,1);
 const twin={...a.identity(storage()),name:B.profile.name,number:B.profile.number};deliver(A,a.packet(twin,'c'.repeat(32),'hello'));assert.equal(A.peers.size,2,'Identical visible identities remain distinct peers');A.receive({kind:'left',playerId:twin.id});assert.equal(A.peers.size,1);
 A.sendTest(q.id);B.sendTest(p.id);assert.equal(A.messages.length,3);assert.equal(B.messages.length,3);
 deliver(A,{...m,id:'bad'});deliver(A,{...m,v:9});deliver(A,{...m,coins:999});assert.equal(A.messages.length,3);
 assert.equal(a.validPacket({...m,player:{...m.player,id:[m.player.id]}}),false);assert.equal(a.validPacket({...m,session:[m.session]}),false);
 clock=17000;A.expire();assert.equal(A.peers.size,0);assert.equal(A.status,'searching');deliver(A,a.packet(B.profile,B.session,'hello'));assert.equal(A.peers.size,1);A.stop();assert.equal(A.status,'disconnected');await A.start();
});
test('unavailable/failed networking cannot block the browser game',async()=>{
 const a=core(),p=a.identity(storage()),service=new a.Discovery(p,null);await service.start();assert.equal(service.status,'unavailable');assert.match(service.error,/Browsers/);
 const broken=new a.Discovery(p,{start(){throw Error('Wi-Fi unavailable')},stop(){}});await broken.start();assert.equal(broken.status,'unavailable');assert.equal(broken.running,false);
});
