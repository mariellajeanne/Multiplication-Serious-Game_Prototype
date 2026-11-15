import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {startDevServer} from '../tools/co-baker-dev.mjs';
const core=globalThis.CoBakerCore;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('real local WebSockets register, dedupe, route, reject spoofing and remove peers',async()=>{
 const app=await startDevServer({port:0,host:'127.0.0.1'}),base=`http://127.0.0.1:${app.port}`,sockets=[];
 try{
  const config=await(await fetch(base+'/__co-baker/config')).json();
  const connect=async(id)=>{const ws=new WebSocket(base.replace('http','ws')+'/__co-baker/socket?token='+config.token,{origin:base});sockets.push(ws);const messages=[];ws.on('message',data=>messages.push(JSON.parse(data)));await new Promise(r=>ws.on('open',r));const p={id,name:'Baker',number:'0073'};ws.send(JSON.stringify({kind:'register',message:core.packet(p,'d'.repeat(32),'hello')}));await wait(40);return {ws,messages,p}};
  const a=await connect('a'.repeat(32)),b=await connect('b'.repeat(32)),tab=await connect('a'.repeat(32));
  assert.equal(b.messages.filter(e=>e.message?.player.id===a.p.id).length,2); // Updated presence, one stable ID.
  const m=core.packet(a.p,'d'.repeat(32),'test');a.ws.send(JSON.stringify({kind:'send',to:b.p.id,message:m}));await wait(40);assert.ok(b.messages.some(e=>e.message?.id===m.id));
  tab.ws.close();await wait(40);assert.ok(!b.messages.some(e=>e.kind==='left'&&e.playerId===a.p.id));
  a.ws.send(JSON.stringify({kind:'send',to:b.p.id,message:core.packet(b.p,'d'.repeat(32),'test')}));await new Promise(r=>a.ws.on('close',r));await wait(40);assert.ok(b.messages.some(e=>e.kind==='left'&&e.playerId===a.p.id));
  assert.equal((await fetch(base+'/.git/config')).status,404);assert.equal((await fetch(base+'/android/local.properties')).status,404);
 }finally{for(const s of sockets)s.terminate();await app.close()}
});
