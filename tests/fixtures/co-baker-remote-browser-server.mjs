// Local TLS tunnel stand-in for real browser integration. Never a public tunnel.
import https from 'node:https';
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';
import {startDevServer} from '../../tools/co-baker-dev.mjs';
// Historical reproduction loads its own validator in a separate process.
const {startRemoteRelay}=await import(process.argv[4]?pathToFileURL(process.argv[4]).href:'../../tools/co-baker-remote-relay.mjs');
const site=await startDevServer({port:0,host:'127.0.0.1'});
const origin=`http://127.0.0.1:${site.port}`;
const options={port:0,passphrase:process.env.COBAKER_REMOTE_PASSPHRASE,allowedOrigins:[origin]};
let relay=await startRemoteRelay(options);options.port=relay.port;
const tunnel=https.createServer({key:readFileSync(process.argv[2]),cert:readFileSync(process.argv[3])},(req,res)=>{
 const upstream=http.request({host:'127.0.0.1',port:options.port,path:req.url,method:req.method},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res)});
 upstream.on('error',()=>res.writeHead(502).end());req.pipe(upstream);
});
tunnel.on('upgrade',(req,socket,head)=>{
 const upstream=http.request({host:'127.0.0.1',port:options.port,path:req.url,headers:req.headers});
 upstream.on('upgrade',(reply,peer,extra)=>{
  socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(reply.headers).map(([k,v])=>`${k}: ${v}\r\n`).join('')}\r\n`);
  if(head.length)peer.write(head);if(extra.length)socket.write(extra);
  peer.on('error',()=>socket.destroy());socket.on('error',()=>peer.destroy());
  peer.on('close',()=>socket.destroy());socket.on('close',()=>peer.destroy());peer.pipe(socket).pipe(peer);
 });
 upstream.on('error',()=>socket.destroy());upstream.end();
});
await new Promise(resolve=>tunnel.listen(0,'127.0.0.1',resolve));
console.log(JSON.stringify({origin,endpoint:`https://127.0.0.1:${tunnel.address().port}`}));
for await(const line of createInterface({input:process.stdin})){
 if(line==='stop'){await relay.close();console.log('stopped')}
 if(line==='start'){relay=await startRemoteRelay(options);console.log('started')}
}
process.exit(0);
