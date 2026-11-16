// Temporary remote Co-Baker testing ONLY. Exposes no game/source files or saves.
// Bind to 127.0.0.1 and publish this port via a temporary HTTPS/WSS tunnel.
import http from 'node:http';
import {createHash,timingSafeEqual,createHmac} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {WebSocketServer} from 'ws';
import '../src/network/worksheet-observation.js';
import '../src/network/helper-rewards.js';
import '../src/network/co-baker.js';
const core=globalThis.CoBakerCore;
// Registration acknowledgement version: Phase 4 helper reward receipts.
const PROTOCOL=8;
const GROUP=/^[a-zA-Z0-9_-]{3,32}$/;
const sha256=s=>createHash('sha256').update(s,'utf8').digest();
const validPassword=(received,expected)=>typeof received==='string'&&received.length<=128&&timingSafeEqual(sha256(received),sha256(expected));

export async function startRemoteRelay({port=5512,host='127.0.0.1',passphrase,allowedOrigins}={}){
 if(typeof passphrase!=='string'||passphrase.length<12||passphrase.length>128)throw Error('Set COBAKER_REMOTE_PASSPHRASE to a temporary 12–128 character password.');
 const origins=new Set((Array.isArray(allowedOrigins)?allowedOrigins:String(allowedOrigins||'').split(','))
  .map(s=>String(s).trim().replace(/\/$/,'' )).filter(Boolean));
 if(!origins.size||[...origins].some(s=>!/^https?:\/\/[^/]+$/.test(s)))throw Error('Set COBAKER_ALLOWED_ORIGINS to the exact origin of your GitHub Pages site (for example https://username.github.io).');
 const groups=new Map();
 const sign=(id,group,origin,expires)=>createHmac('sha256',passphrase).update(JSON.stringify({id,group,origin,expires})).digest('hex');
 const issue=ws=>{const expires=Date.now()+3600000;return {token:sign(ws.player.id,ws.group,ws.origin,expires),expires}};
 const server=http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.url==='/health'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'}).end('Co-Baker test relay online');return}
  res.writeHead(404).end('Not found');
 });
 const wss=new WebSocketServer({noServer:true,maxPayload:8192,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{
  let url;try{url=new URL(req.url,'http://localhost')}catch(_){socket.destroy();return}
  if(url.pathname!=='/__co-baker/socket'||url.search||!origins.has(req.headers.origin)||wss.clients.size>=64){socket.destroy();return}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req.headers.origin));
 });
 const send=(ws,event)=>{if(ws.readyState===1){if(ws.bufferedAmount>65536)ws.terminate();else ws.send(JSON.stringify(event))}};
 const active=(group,id)=>groups.get(group)?.get(id)?.values().next().value;
 const broadcast=(group,event,except)=>{for(const [id]of groups.get(group)||[])if(id!==except){const peer=active(group,id);if(peer)send(peer,event)}};
 const presence=ws=>({kind:'message',message:core.packet(ws.player,ws.session,'hello')});
 const ready=ws=>send(ws,{kind:'status',status:'searching',protocol:PROTOCOL,reconnect:issue(ws)});
 const reject=(ws,code)=>{send(ws,{kind:'status',status:'unavailable',protocol:PROTOCOL,code});ws.close(1008,code)};
 wss.on('connection',(ws,origin)=>{
  ws.origin=origin;ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('error',()=>{});
  const deadline=setTimeout(()=>reject(ws,'registration-timeout'),5000);
  let count=0,windowStart=Date.now();
  ws.on('message',(bytes,binary)=>{try{
   if(Date.now()-windowStart>1000){count=0;windowStart=Date.now()}
   if(binary)throw Error('invalid-packet');
   if(++count>128)throw Error('rate-limit');
   let frame;try{frame=JSON.parse(bytes.toString())}catch(_){throw Error('invalid-packet')}
   if(!frame||!core.validPacket(frame.message))throw Error('invalid-packet');
   const m=frame.message;
   if(!ws.player){
    if(frame.kind!=='register'||m.type!=='hello'||
       Object.keys(frame).some(k=>!['kind','message','group','passphrase','resumeToken','resumeExpires'].includes(k))||
       typeof frame.group!=='string'||!GROUP.test(frame.group))throw Error('invalid-registration');
    const expires=frame.resumeExpires,token=frame.resumeToken;
    const resumed=Number.isSafeInteger(expires)&&expires>Date.now()&&expires<=Date.now()+3600000&&typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)&&validPassword(token,sign(m.player.id,frame.group,origin,expires));
    if(!resumed&&!validPassword(frame.passphrase,passphrase))throw Error('authentication-failed');
    clearTimeout(deadline);ws.player=m.player;ws.session=m.session;ws.group=frame.group;
    let peers=groups.get(ws.group);if(!peers)groups.set(ws.group,peers=new Map());
    let sockets=peers.get(m.player.id);if(!sockets)peers.set(m.player.id,sockets=new Set());
    sockets.add(ws);
    if(sockets.size>1){send(ws,{kind:'status',status:'unavailable',protocol:PROTOCOL,code:'identity-in-use'});return}
    ready(ws);
    for(const [id]of peers)if(id!==m.player.id){const other=active(ws.group,id);if(other)send(ws,presence(other))}
    broadcast(ws.group,presence(ws),m.player.id);return;
   }
   if(active(ws.group,ws.player.id)!==ws)return;
   if(frame.kind!=='send'||Object.keys(frame).some(k=>!['kind','to','message'].includes(k))||
      !['test','reply','coord','help'].includes(m.type)||typeof frame.to!=='string'||!/^[a-f0-9]{32}$/.test(frame.to)||
      m.player.id!==ws.player.id||m.player.name!==ws.player.name||m.player.number!==ws.player.number||m.session!==ws.session)throw Error('invalid-route');
   const peer=active(ws.group,frame.to);if(peer)send(peer,{kind:'message',message:m});
  }catch(error){reject(ws,['invalid-packet','invalid-registration','authentication-failed','invalid-route','rate-limit'].includes(error.message)?error.message:'invalid-packet')}});
  ws.on('close',()=>{
   clearTimeout(deadline);if(!ws.player)return;
   const peers=groups.get(ws.group),sockets=peers?.get(ws.player.id),wasActive=active(ws.group,ws.player.id)===ws;
   sockets?.delete(ws);
   if(!sockets?.size){peers?.delete(ws.player.id);broadcast(ws.group,{kind:'left',playerId:ws.player.id},ws.player.id)}
   else if(wasActive){const next=active(ws.group,ws.player.id);ready(next);for(const [id]of peers)if(id!==next.player.id){const p=active(ws.group,id);if(p)send(next,presence(p))}broadcast(ws.group,presence(next),next.player.id)}
   if(peers&&!peers.size)groups.delete(ws.group);
  });
 });
 const timer=setInterval(()=>{
  for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue}ws.alive=false;ws.ping()}
  for(const [group,peers]of groups)for(const [id]of peers){const ws=active(group,id);if(ws)broadcast(group,presence(ws),id)}
 },5000);
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve)})}
 catch(e){clearInterval(timer);wss.close();throw e}
 return {port:server.address().port,server,close:async()=>{
  clearInterval(timer);for(const ws of wss.clients)ws.terminate();
  await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));
 }};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const app=await startRemoteRelay({port:Number(process.env.COBAKER_REMOTE_PORT)||5512,passphrase:process.env.COBAKER_REMOTE_PASSPHRASE,allowedOrigins:process.env.COBAKER_ALLOWED_ORIGINS});
  console.log(`Co-Baker TEMPORARY remote test relay (protocol ${PROTOCOL}, Phase 4 receipts) listening at http://127.0.0.1:${app.port}`);
  console.log(`Allowed browser origins: ${process.env.COBAKER_ALLOWED_ORIGINS}`);
  console.log('Only /health and authenticated WebSockets are exposed. Stop with Ctrl+C.');
  process.on('SIGINT',async()=>{await app.close();process.exit(0)});
 }catch(error){console.error('Remote relay not started:',error.message);process.exitCode=1}
}
