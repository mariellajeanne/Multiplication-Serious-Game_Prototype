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
  const reg=async(id,group,password=KEY)=>{
   const ws=await connect(endpoint);wslist.push(ws);const messages=[];ws.on('message',data=>messages.push(JSON.parse(data)));
   const player={id,name:'Baker',number:'4821'},session='b'.repeat(32);
   ws.send(JSON.stringify({kind:'register',group,passphrase:password,message:core.packet(player,session,'hello')}));
   await wait(50);return {ws,player,session,messages};
  };
  assert.equal((await fetch(base+'/health')).status,200);
  assert.equal((await fetch(base+'/__co-baker/config')).status,404);
  assert.equal((await fetch(base+'/src/network/co-baker.js')).status,404);
  await assert.rejects(connect(endpoint,'https://untrusted.example'));
  const first=await reg('a'.repeat(32),'alpha');
  const other=await reg('c'.repeat(32),'beta');
  assert.equal(first.messages.filter(e=>e.message?.player.id===other.player.id).length,0);
  const second=await reg('d'.repeat(32),'alpha');
  assert.ok(first.messages.some(e=>e.message?.player.id===second.player.id));
  assert.ok(second.messages.some(e=>e.message?.player.id===first.player.id));
  const testPacket=core.packet(first.player,first.session,'test');
  first.ws.send(JSON.stringify({kind:'send',to:second.player.id,message:testPacket}));
  await wait(50);assert.ok(second.messages.some(e=>e.message?.id===testPacket.id));
  first.ws.send(JSON.stringify({kind:'send',to:other.player.id,message:core.packet(first.player,first.session,'test')}));
  await wait(50);assert.equal(other.messages.filter(e=>e.message?.type==='test').length,0);
  const denied=await reg('e'.repeat(32),'alpha','incorrect-password');
  await wait(50);assert.equal(denied.ws.readyState,WebSocket.CLOSED);
  second.ws.close();await wait(60);assert.ok(first.messages.some(e=>e.kind==='left'&&e.playerId===second.player.id));
 }finally{for(const ws of wslist)ws.terminate();await app.close()}
});
