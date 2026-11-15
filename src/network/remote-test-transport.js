/* Opt-in remote browser test transport. Never selected in ordinary play or Android. */
(function(root){
 'use strict';
 class RemoteTestTransport{
  constructor(receive){this.receive=receive;this.label='Remote Browser Test';this.epoch=0;this.config=null}
  configure({url,group,passphrase}){
   const endpoint=new URL(String(url||'').trim());
   if(endpoint.protocol==='https:')endpoint.protocol='wss:';
   if(endpoint.protocol!=='wss:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||
      !['/','/__co-baker/socket'].includes(endpoint.pathname))throw Error('Enter an HTTPS/WSS tunnel address (without a query string).');
   endpoint.pathname='/__co-baker/socket';
   group=String(group||'').trim();
   if(!/^[a-zA-Z0-9_-]{3,32}$/.test(group))throw Error('Test group must be 3–32 letters, numbers, _ or -.');
   if(typeof passphrase!=='string'||passphrase.length<12||passphrase.length>128)throw Error('Shared test password must be 12–128 characters.');
   this.config={url:endpoint.toString(),group,passphrase};
   return {url:endpoint.origin,group};
  }
  async start(hello){
   this.stop();
   if(!this.config){this.receive({kind:'status',status:'unavailable',error:'Enter the remote relay URL, test group, and shared password to connect.'});return}
   this.hello=hello;this.active=true;const epoch=this.epoch;
   const connect=()=>{
    if(!this.active||this.epoch!==epoch)return;
    try{
     const ws=this.socket=new WebSocket(this.config.url);
     ws.onopen=()=>{if(this.epoch!==epoch){ws.close();return}
      ws.send(JSON.stringify({kind:'register',message:hello,group:this.config.group,passphrase:this.config.passphrase}));
     };
     ws.onmessage=e=>{if(this.epoch!==epoch)return;try{
      const event=JSON.parse(e.data);this.receive(event);
      const m=event.message;
      if(event.kind==='message'&&root.CoBakerCore.validPacket(m)&&m.type==='test')this.send(m.player.id,root.CoBakerCore.packet(hello.player,hello.session,'reply',m.id));
     }catch(_){/* Invalid network frame ignored; never affect solo play. */}};
     ws.onerror=()=>{};
     ws.onclose=e=>{if(this.epoch!==epoch||!this.active)return;
      if(e.code===1008){this.active=false;this.receive({kind:'status',status:'unavailable',error:'Remote relay rejected this connection. Check the shared password, allowed site, and group.'});return}
      this.receive({kind:'status',status:'disconnected',error:'Remote relay disconnected. Reconnecting…'});
      this.timer=setTimeout(connect,2000);
     };
    }catch(e){this.receive({kind:'status',status:'unavailable',error:String(e.message||e)});this.timer=setTimeout(connect,2500)}
   };
   connect();
  }
  send(to,message){if(this.socket?.readyState!==1)throw Error('Remote test relay disconnected');this.socket.send(JSON.stringify({kind:'send',to,message}))}
  stop(){this.active=false;this.epoch++;clearTimeout(this.timer);if(this.socket){this.socket.onclose=null;this.socket.close();this.socket=null}}
 }
 root.RemoteTestTransport=RemoteTestTransport;
})(globalThis);
