import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {startRemoteRelay} from '../tools/co-baker-remote-relay.mjs';
const core=globalThis.CoBakerCore;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ORIGIN='https://example.github.io';
const KEY='temporary-private-testing-key';
function connect(endpoint,origin=ORIGIN){
 return new Promise((resolve,reject)=>{const ws=new WebSocket(endpoint,{origin});ws.once('open',()=>resolve(ws));ws.once('error',reject)});
}
test('remote WebSocket relay isolates test groups, requires password and exposes no files',async()=>{
 const app=await startRemoteRelay({port:0,passphrase:KEY,allowedOrigins:[ORIGIN]}),wslist=[],base=`http://127.0.0.1:${app.port}`,endpoint=`ws://127.0.0.1:${app.port}/__co-baker/socket`;
 try{
  const reg=async(id,group,password=KEY,token=null)=>{
   const ws=await connect(endpoint);wslist.push(ws);const messages=[];ws.on('message',data=>messages.push(JSON.parse(data)));
   const player={id,name:'Baker',number:'4821'},session='b'.repeat(32);
   ws.send(JSON.stringify({kind:'register',group,...(token?{resumeToken:token.token,resumeExpires:token.expires}:{passphrase:password}),message:core.packet(player,session,'hello')}));
   await wait(50);return {ws,player,session,messages};
  };
  assert.equal((await fetch(base+'/health')).status,200);
  assert.equal((await fetch(base+'/__co-baker/config')).status,404);
  assert.equal((await fetch(base+'/src/network/co-baker.js')).status,404);
  await assert.rejects(connect(endpoint,'https://untrusted.example'));
  const first=await reg('a'.repeat(32),'alpha');
  assert.ok(first.messages.some(e=>e.status==='searching'&&e.protocol===6));
  const ticket=first.messages.find(e=>e.reconnect)?.reconnect;
  assert.match(ticket.token,/^[a-f0-9]{64}$/);assert.ok(ticket.expires>Date.now());
  const wrongIdentity=await reg('9'.repeat(32),'alpha',null,ticket);assert.equal(wrongIdentity.messages.at(-1).code,'authentication-failed');
  const wrongScope=await reg(first.player.id,'beta',null,ticket);assert.equal(wrongScope.messages.at(-1).code,'authentication-failed');
  const duplicate=await reg(first.player.id,'alpha',null,ticket);assert.equal(duplicate.messages.at(-1).code,'identity-in-use');duplicate.ws.close();
  const other=await reg('c'.repeat(32),'beta');
  assert.equal(first.messages.filter(e=>e.message?.player.id===other.player.id).length,0);
  const second=await reg('d'.repeat(32),'alpha');
  assert.ok(first.messages.some(e=>e.message?.player.id===second.player.id));
  assert.ok(second.messages.some(e=>e.message?.player.id===first.player.id));
  const testPacket=core.packet(first.player,first.session,'test');
  first.ws.send(JSON.stringify({kind:'send',to:second.player.id,message:testPacket}));
  await wait(50);assert.ok(second.messages.some(e=>e.message?.id===testPacket.id));
  // Profile field order is not identity. Browsers/bridges may serialize it differently.
  const help=core.packet(first.player,first.session,'help');
  help.player={number:first.player.number,id:first.player.id,name:first.player.name};
  help.help={kind:'presence',available:true,busy:false};
  first.ws.send(JSON.stringify({kind:'send',to:second.player.id,message:help}));
  await wait(50);assert.ok(second.messages.some(e=>e.message?.id===help.id));
  first.ws.send(JSON.stringify({kind:'send',to:other.player.id,message:core.packet(first.player,first.session,'test')}));
  await wait(50);assert.equal(other.messages.filter(e=>e.message?.type==='test').length,0);
  const denied=await reg('e'.repeat(32),'alpha','incorrect-password');
  await wait(50);assert.equal(denied.ws.readyState,WebSocket.CLOSED);
  assert.equal(denied.messages.at(-1).code,'authentication-failed');
  assert.ok(!JSON.stringify(denied.messages).includes(KEY));
  const wrongGroup=await reg('f'.repeat(32),'!invalid!');
  assert.equal(wrongGroup.messages.at(-1).code,'invalid-registration');
  const spoof=await reg('1'.repeat(32),'alpha');
  spoof.ws.send(JSON.stringify({kind:'send',to:first.player.id,message:core.packet(spoof.player,'c'.repeat(32),'test')}));
  await wait(50);assert.equal(spoof.messages.at(-1).code,'invalid-route');assert.equal(spoof.ws.readyState,WebSocket.CLOSED);
  const invalid=await reg('2'.repeat(32),'alpha');
  const bad=core.packet(invalid.player,invalid.session,'help');bad.help={kind:'presence',available:true,busy:false,coins:999};
  invalid.ws.send(JSON.stringify({kind:'send',to:first.player.id,message:bad}));
  await wait(50);assert.equal(invalid.messages.at(-1).code,'invalid-packet');
  const flood=await reg('3'.repeat(32),'beta');
  for(let i=0;i<130;i++)flood.ws.send(JSON.stringify({kind:'send',to:other.player.id,message:core.packet(flood.player,flood.session,'test')}));
  await wait(50);assert.ok(flood.messages.some(e=>e.code==='rate-limit'));assert.equal(flood.ws.readyState,WebSocket.CLOSED);
  second.ws.close();await wait(60);assert.ok(first.messages.some(e=>e.kind==='left'&&e.playerId===second.player.id));
 }finally{for(const ws of wslist)ws.terminate();await app.close()}
});
