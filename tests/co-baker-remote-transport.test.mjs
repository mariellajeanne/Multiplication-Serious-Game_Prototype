import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function setup(){
 const instances=[],received=[],timers=new Map();let timerId=0;
 class MockWebSocket{
  constructor(url){this.url=url;this.readyState=1;this.sent=[];instances.push(this)}
  send(text){this.sent.push(JSON.parse(text))}
  close(){this.readyState=3}
 }
 const ctx=vm.createContext({URL,WebSocket:MockWebSocket,
  setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId},clearTimeout:id=>timers.delete(id),globalThis:null});
 ctx.globalThis=ctx;
 vm.runInContext(readFileSync(new URL('../src/network/remote-test-transport.js',import.meta.url),'utf8'),ctx);
 const transport=new ctx.RemoteTestTransport(event=>received.push(event));
 return {transport,instances,received,timers};
}
test('remote browser mode requires explicit secure endpoint, group and password',()=>{
 const {transport}=setup();
 assert.throws(()=>transport.configure({url:'http://example.test',group:'class1',passphrase:'at-least-twelve'}),/HTTPS\/WSS/);
 assert.throws(()=>transport.configure({url:'https://example.test/?token=secret',group:'class1',passphrase:'at-least-twelve'}),/HTTPS\/WSS/);
 assert.throws(()=>transport.configure({url:'https://example.test',group:'a',passphrase:'at-least-twelve'}),/group/);
 assert.throws(()=>transport.configure({url:'https://example.test',group:'class1',passphrase:'short'}),/password/);
 const result=transport.configure({url:'https://temporary.trycloudflare.com',group:'class1',passphrase:'at-least-twelve'});
 assert.equal(result.url,'wss://temporary.trycloudflare.com');
 assert.equal(transport.config.url,'wss://temporary.trycloudflare.com/__co-baker/socket');
});
test('remote adapter registers only after configuration and sends no production game state',async()=>{
 const {transport,instances,received}=setup();
 await transport.start({type:'hello'});
 assert.equal(instances.length,0);
 assert.equal(received[0].status,'unavailable');
 transport.configure({url:'wss://temporary.trycloudflare.com',group:'bakers',passphrase:'test-password-123'});
 const hello={type:'hello',player:{name:'Baker',number:'4821',id:'a'.repeat(32)},session:'b'.repeat(32)};
 await transport.start(hello);
 assert.equal(instances.length,1);
 const socket=instances[0];socket.onopen();
 assert.deepEqual(socket.sent[0],{kind:'register',message:hello,group:'bakers',passphrase:'test-password-123'});
 socket.onmessage({data:JSON.stringify({kind:'status',status:'searching',protocol:6})});
 assert.equal(received.at(-1).status,'searching');
 transport.stop();
 assert.equal(socket.readyState,3);
});

const config={url:'https://temporary.trycloudflare.com',group:'bakers',passphrase:'test-password-123'};
const hello={type:'hello',player:{name:'Baker',number:'4821',id:'a'.repeat(32)},session:'b'.repeat(32)};
const deliver=(ws,event)=>ws.onmessage({data:JSON.stringify(event)});

test('legacy relay registration fails explicitly before discovery can emit Phase 2 packets',async()=>{
 const {transport,instances,received}=setup();transport.configure(config);await transport.start(hello);
 const ws=instances[0];ws.onopen();
 assert.throws(()=>transport.send('c'.repeat(32),{}),/not registered/);
 deliver(ws,{kind:'status',status:'searching'});
 deliver(ws,{kind:'message',message:{type:'hello'}});
 assert.equal(transport.active,false);assert.equal(received.length,1);
 assert.equal(received[0].code,'protocol-mismatch');assert.match(received[0].error,/restart the Node relay/);
 assert.doesNotMatch(received[0].error,/password/);
});

test('duplicate tab waits without election or traffic, then activates on promotion',async()=>{
 const {transport,instances,received,timers}=setup();transport.configure(config);await transport.start(hello);
 const ws=instances[0];ws.onopen();
 deliver(ws,{kind:'status',status:'unavailable',code:'identity-in-use',protocol:6});
 assert.equal(transport.phase,'waiting');assert.equal(transport.active,true);assert.equal(timers.size,0);
 assert.match(received.at(-1).error,/another tab/);assert.throws(()=>transport.send('x',{}));
 deliver(ws,{kind:'status',status:'searching',protocol:6});
 assert.equal(transport.phase,'ready');assert.equal(received.at(-1).error,'');
 transport.send('c'.repeat(32),{});assert.equal(ws.sent.at(-1).kind,'send');transport.stop();
});

test('authentication and post-registration protocol closes have distinct safe errors',async()=>{
 for(const code of ['authentication-failed','invalid-route','invalid-packet','rate-limit']){
  const {transport,instances,received}=setup();transport.configure(config);await transport.start(hello);
  const ws=instances[0];ws.onopen();
  deliver(ws,{kind:'status',status:'unavailable',protocol:6,code,error:config.passphrase});
  ws.onclose({code:1008});
  assert.equal(received.length,1);assert.equal(received[0].code,code);
  assert.ok(!received[0].error.includes(config.passphrase));
 }
 const {transport,instances,received}=setup();transport.configure(config);await transport.start(hello);
 const ws=instances[0];ws.onopen();deliver(ws,{kind:'status',status:'searching',protocol:6});ws.onclose({code:1008});
 assert.match(received.at(-1).error,/registered connection/);assert.doesNotMatch(received.at(-1).error,/password/);
});

test('reconnect ignores old socket events, waits for registration and preserves the active session',async()=>{
 const {transport,instances,received,timers}=setup();transport.configure(config);await transport.start(hello);
 const old=instances[0];old.onopen();deliver(old,{kind:'status',status:'searching',protocol:6});
 old.onclose({code:1006});assert.equal(transport.phase,'disconnected');
 const retry=[...timers.values()].find(t=>t.ms===2000);retry.fn();
 const next=instances[1];next.onopen();assert.equal(next.sent[0].message.session,hello.session);
 const count=received.length;deliver(old,{kind:'status',status:'unavailable',code:'authentication-failed'});old.onclose({code:1008});
 assert.equal(received.length,count);assert.equal(transport.active,true);
 deliver(next,{kind:'status',status:'searching',protocol:6});assert.equal(received.at(-1).error,'');
 transport.stop();const stopped=received.length;deliver(next,{kind:'status',status:'searching',protocol:6});assert.equal(received.length,stopped);
});

test('stalled registration is bounded and restarting cancels old handshake deadlines',async()=>{
 const {transport,instances,timers}=setup();transport.configure(config);await transport.start(hello);
 const old=instances[0],oldTimer=[...timers.values()][0];
 await transport.start({...hello,session:'d'.repeat(32)});
 const next=instances[1];oldTimer.fn();assert.equal(next.readyState,1);
 assert.equal(timers.size,1);[...timers.values()][0].fn();assert.equal(next.readyState,3);
 next.onclose({code:1006});assert.equal(transport.phase,'disconnected');
 transport.stop();assert.equal(timers.size,0);assert.equal(old.readyState,3);
});
