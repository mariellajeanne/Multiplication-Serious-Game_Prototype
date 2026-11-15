// Opt-in local testing server. Never included in the APK or required for solo play.
import http from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {networkInterfaces} from 'node:os';
import {randomBytes} from 'node:crypto';
import {WebSocketServer} from 'ws';
import '../src/network/co-baker.js';
const core=globalThis.CoBakerCore;
export async function startDevServer({port=5500,host='0.0.0.0'}={}){
 const root=await realpath(fileURLToPath(new URL('..',import.meta.url))),token=randomBytes(24).toString('hex'),clients=new Map();
 const addresses=['127.0.0.1','localhost',...Object.values(networkInterfaces()).flat().filter(a=>a?.family==='IPv4').map(a=>a.address)];
 const hosts=new Set();const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.ogg':'audio/ogg','.mp3':'audio/mpeg'};
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!hosts.has(req.headers.host)||!['GET','HEAD'].includes(req.method)){res.writeHead(403).end();return}
  try{
   const url=new URL(req.url,'http://local');
   if(url.pathname==='/__co-baker/config'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({enabled:true,token}));return}
   const relative=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
   if(relative!=='index.html'&&!/^(src|styles|assets|worksheet)\//.test(relative))throw Error('Not public');
   const file=await realpath(path.resolve(root,relative));if(!file.startsWith(root+path.sep))throw Error('Outside root');
   const body=await readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(req.method==='HEAD'?undefined:body);
  }catch(_){res.writeHead(404).end('Not found')}
 });
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{
  const url=new URL(req.url,'http://local');if(!hosts.has(req.headers.host)||req.headers.origin!==`http://${req.headers.host}`||url.pathname!=='/__co-baker/socket'||url.searchParams.get('token')!==token){socket.destroy();return}
  if(wss.clients.size>=128){socket.destroy();return}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
 });
 const send=(ws,event)=>{if(ws.readyState===1){if(ws.bufferedAmount>65536)ws.terminate();else ws.send(JSON.stringify(event))}};
 const broadcast=(event,except)=>{for(const ws of wss.clients)if(ws.player?.id!==except&&clients.get(ws.player?.id)?.values().next().value===ws)send(ws,event)};
 const presence=ws=>({kind:'message',message:core.packet(ws.player,ws.session,'hello')});
 wss.on('connection',ws=>{
  ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('error',()=>{});
  const deadline=setTimeout(()=>ws.close(1008,'Register first'),5000);
  let count=0,windowStart=Date.now();
  ws.on('message',(bytes,binary)=>{try{
   if(Date.now()-windowStart>1000){count=0;windowStart=Date.now()}if(binary||++count>512)throw Error('Limit');
   const frame=JSON.parse(bytes.toString());if(!frame||!core.validPacket(frame.message))throw Error('Invalid packet');const m=frame.message;
   if(!ws.player){
    if(frame.kind!=='register'||m.type!=='hello'||Object.keys(frame).some(k=>!['kind','message'].includes(k)))throw Error('Register first');
    clearTimeout(deadline);ws.player=m.player;ws.session=m.session;let set=clients.get(m.player.id);if(!set)clients.set(m.player.id,set=new Set());set.add(ws);
    if(set.size>1){send(ws,{kind:'status',status:'unavailable',error:'This Baker is already connected in another tab. Waiting for that tab to close.'});broadcast(presence([...set][0]),m.player.id);return}
    send(ws,{kind:'status',status:'searching'});for(const [id,peers] of clients)if(id!==m.player.id)send(ws,presence([...peers][0]));
    broadcast(presence(ws),m.player.id);return;
   }
   if(clients.get(ws.player.id)?.values().next().value!==ws)return;
   if(frame.kind!=='send'||Object.keys(frame).some(k=>!['kind','to','message'].includes(k))||!['test','reply','coord','help'].includes(m.type)||JSON.stringify(m.player)!==JSON.stringify(ws.player)||m.session!==ws.session)throw Error('Invalid route');
   const peer=clients.get(frame.to)?.values().next().value;if(peer)send(peer,{kind:'message',message:m});
  }catch(_){ws.close(1008,'Invalid development message')}});
  ws.on('close',()=>{clearTimeout(deadline);if(!ws.player)return;const set=clients.get(ws.player.id);const wasActive=set?.values().next().value===ws;set?.delete(ws);if(!set?.size){clients.delete(ws.player.id);broadcast({kind:'left',playerId:ws.player.id},ws.player.id)}else if(wasActive){const next=[...set][0];send(next,{kind:'status',status:'searching'});for(const [id,peers]of clients)if(id!==next.player.id)send(next,presence([...peers][0]));broadcast(presence(next),next.player.id)}});
 });
 const timer=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue}ws.alive=false;ws.ping()}for(const [id,peers]of clients)broadcast(presence([...peers][0]),id)},5000);
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve)})}catch(error){clearInterval(timer);wss.close();throw error}
 const bound=server.address().port;for(const address of addresses)hosts.add(`${address}:${bound}`);
 return {port:bound,server,close:async()=>{clearInterval(timer);for(const ws of wss.clients)ws.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r))},urls:[...new Set(addresses)].map(ip=>`http://${ip}:${bound}/index.html?cobaker=debug&webrelay=1`)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let app;for(let port=Number(process.env.PORT)||5500;!app;port++){try{app=await startDevServer({port})}catch(error){if(error.code!=='EADDRINUSE'||process.env.PORT||port>=5510){console.error('Unable to start local relay:',error.message);process.exit(1)}console.log(`Port ${port} is occupied; trying ${port+1}.`)}}
 console.log('Co-Baker Browser Test relay running (trusted local development only).');for(const url of app.urls)console.log(url);console.log('Use a consistent URL per browser profile; Ctrl+C stops web and relay.');process.on('SIGINT',async()=>{await app.close();process.exit(0)});
}
