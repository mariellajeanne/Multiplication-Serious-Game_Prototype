// Temporary remote Co-Baker testing ONLY. Exposes no game/source files or saves.
// Bind to 127.0.0.1 and publish this port via a temporary HTTPS/WSS tunnel.
import http from 'node:http';
import {createHash,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {WebSocketServer} from 'ws';
import '../src/network/co-baker.js';
const core=globalThis.CoBakerCore;
const GROUP=/^[a-zA-Z0-9_-]{3,32}$/;
const sha256=s=>createHash('sha256').update(s,'utf8').digest();
const validPassword=(received,expected)=>typeof received==='string'&&received.length<=128&&timingSafeEqual(sha256(received),sha256(expected));

export async function startRemoteRelay({port=5512,host='127.0.0.1',passphrase,allowedOrigins}={}){
 if(typeof passphrase!=='string'||passphrase.length<12||passphrase.length>128)throw Error('Set COBAKER_REMOTE_PASSPHRASE to a temporary 12–128 character password.');
 const origins=new Set((Array.isArray(allowedOrigins)?allowedOrigins:String(allowedOrigins||'').split(','))
  .map(s=>String(s).trim().replace(/\/$/,'' )).filter(Boolean));
 if(!origins.size||[...origins].some(s=>!/^https?:\/\/[^/]+$/.test(s)))throw Error('Set COBAKER_ALLOWED_ORIGINS to the exact origin of your GitHub Pages site (for example https://username.github.io).');
 const groups=new Map();
 const server=http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.url==='/health'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'}).end('Co-Baker test relay online');return}
  res.writeHead(404).end('Not found');
 });
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{
  let url;try{url=new URL(req.url,'http://localhost')}catch(_){socket.destroy();return}
  if(url.pathname!=='/__co-baker/socket'||url.search||!origins.has(req.headers.origin)||wss.clients.size>=64){socket.destroy();return}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
 });
 const send=(ws,event)=>{if(ws.readyState===1){if(ws.bufferedAmount>65536)ws.terminate();else ws.send(JSON.stringify(event))}};
 const active=(group,id)=>groups.get(group)?.get(id)?.values().next().value;
 const broadcast=(group,event,except)=>{for(const [id]of groups.get(group)||[])if(id!==except){const peer=active(group,id);if(peer)send(peer,event)}};
 const presence=ws=>({kind:'message',message:core.packet(ws.player,ws.session,'hello')});
 wss.on('connection',ws=>{
  ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('error',()=>{});
  const deadline=setTimeout(()=>ws.close(1008,'Registration required'),5000);
  let count=0,windowStart=Date.now();
  ws.on('message',(bytes,binary)=>{try{
   if(Date.now()-windowStart>1000){count=0;windowStart=Date.now()}
   if(binary||++count>128)throw Error('Rate limit');
   const frame=JSON.parse(bytes.toString());
   if(!frame||!core.validPacket(frame.message))throw Error('Invalid packet');
   const m=frame.message;
   if(!ws.player){
    if(frame.kind!=='register'||m.type!=='hello'||
       Object.keys(frame).some(k=>!['kind','message','group','passphrase'].includes(k))||
       !GROUP.test(frame.group)||!validPassword(frame.passphrase,passphrase))throw Error('Invalid registration');
    clearTimeout(deadline);ws.player=m.player;ws.session=m.session;ws.group=frame.group;
    let peers=groups.get(ws.group);if(!peers)groups.set(ws.group,peers=new Map());
    let sockets=peers.get(m.player.id);if(!sockets)peers.set(m.player.id,sockets=new Set());
    sockets.add(ws);
    if(sockets.size>1){send(ws,{kind:'status',status:'unavailable',error:'This Baker is already connected in another tab. Waiting for that tab to close.'});return}
    send(ws,{kind:'status',status:'searching'});
    for(const [id]of peers)if(id!==m.player.id){const other=active(ws.group,id);if(other)send(ws,presence(other))}
    broadcast(ws.group,presence(ws),m.player.id);return;
   }
   if(active(ws.group,ws.player.id)!==ws)return;
   if(frame.kind!=='send'||Object.keys(frame).some(k=>!['kind','to','message'].includes(k))||
      !['test','reply','coord','help'].includes(m.type)||JSON.stringify(m.player)!==JSON.stringify(ws.player)||m.session!==ws.session)throw Error('Invalid route');
   const peer=active(ws.group,frame.to);if(peer)send(peer,{kind:'message',message:m});
  }catch(_){ws.close(1008,'Invalid development message')}});
  ws.on('close',()=>{
   clearTimeout(deadline);if(!ws.player)return;
   const peers=groups.get(ws.group),sockets=peers?.get(ws.player.id),wasActive=active(ws.group,ws.player.id)===ws;
   sockets?.delete(ws);
   if(!sockets?.size){peers?.delete(ws.player.id);broadcast(ws.group,{kind:'left',playerId:ws.player.id},ws.player.id)}
   else if(wasActive){const next=active(ws.group,ws.player.id);send(next,{kind:'status',status:'searching'});for(const [id]of peers)if(id!==next.player.id){const p=active(ws.group,id);if(p)send(next,presence(p))}broadcast(ws.group,presence(next),next.player.id)}
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
  console.log(`Co-Baker TEMPORARY remote test relay listening at http://127.0.0.1:${app.port}`);
  console.log(`Allowed browser origins: ${process.env.COBAKER_ALLOWED_ORIGINS}`);
  console.log('Only /health and authenticated WebSockets are exposed. Stop with Ctrl+C.');
  process.on('SIGINT',async()=>{await app.close();process.exit(0)});
 }catch(error){console.error('Remote relay not started:',error.message);process.exitCode=1}
}
