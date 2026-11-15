import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function setup(){
 const instances=[],received=[];
 class MockWebSocket{
  constructor(url){this.url=url;this.readyState=1;this.sent=[];instances.push(this)}
  send(text){this.sent.push(JSON.parse(text))}
  close(){this.readyState=3}
 }
 const ctx=vm.createContext({URL,WebSocket:MockWebSocket,setTimeout,clearTimeout,globalThis:null});
 ctx.globalThis=ctx;
 vm.runInContext(readFileSync(new URL('../src/network/remote-test-transport.js',import.meta.url),'utf8'),ctx);
 const transport=new ctx.RemoteTestTransport(event=>received.push(event));
 return {transport,instances,received};
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
 socket.onmessage({data:JSON.stringify({kind:'status',status:'searching'})});
 assert.equal(received.at(-1).status,'searching');
 transport.stop();
 assert.equal(socket.readyState,3);
});
