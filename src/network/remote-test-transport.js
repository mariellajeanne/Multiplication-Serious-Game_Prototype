/* Opt-in remote browser test transport. Never selected in ordinary play or Android. */
(function(root){
 'use strict';
 const PROTOCOL=5;
 const ERRORS={
  'identity-in-use':'This Baker is already connected in another tab. Waiting for that tab to close.',
  'authentication-failed':'Remote relay authentication failed. Re-enter the shared testing password.',
  'invalid-registration':'Remote relay rejected the registration format or test group. Update the browser and relay together.',
  'invalid-packet':'Remote relay rejected a protocol message. Update the browser files and restart the Node relay.',
  'invalid-route':'Remote relay rejected a player/session route. Reconnect; update the browser and relay together if this repeats.',
  'rate-limit':'Remote relay message limit exceeded. Reconnect to try again.',
  'registration-timeout':'Remote relay registration timed out. Reconnect to try again.'
 };
 class RemoteTestTransport{
  constructor(receive){this.receive=receive;this.label='Remote Browser Test';this.epoch=0;this.config=null;this.phase='disconnected'}
  configure({url,group,passphrase}){
   const endpoint=new URL(String(url||'').trim());
   if(endpoint.protocol==='https:')endpoint.protocol='wss:';
   if(endpoint.protocol!=='wss:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||
      !['/','/__co-baker/socket'].includes(endpoint.pathname))throw Error('Enter an HTTPS/WSS tunnel address (without a query string).');
   endpoint.pathname='/__co-baker/socket';
   group=String(group||'').trim();
   if(!/^[a-zA-Z0-9_-]{3,32}$/.test(group))throw Error('Test group must be 3–32 letters, numbers, _ or -.');
   if(typeof passphrase!=='string'||passphrase.length<12||passphrase.length>128)throw Error('Shared test password must be 12–128 characters.');
   url=endpoint.toString();
   this.configChanged=!this.config||this.config.url!==url||this.config.group!==group||this.config.passphrase!==passphrase;
   this.config={url,group,passphrase};
   return {url:endpoint.origin,group};
  }
  async start(hello){
   this.stop();
   if(!this.config){this.receive({kind:'status',status:'unavailable',error:'Enter the remote relay URL, test group, and shared password to connect.'});return}
   this.hello=hello;this.active=true;const epoch=this.epoch,config={...this.config};
   const connect=()=>{
    if(!this.active||this.epoch!==epoch)return;
    this.phase='connecting';
    try{
     const ws=this.socket=new WebSocket(config.url);
     const current=()=>this.active&&this.epoch===epoch&&this.socket===ws;
     let registered=false;
     // An upgraded socket is not yet a registered Baker. Bound stalled handshakes.
     this.deadline=setTimeout(()=>{if(current()&&!registered)ws.close()},8000);
     const fail=(code,error)=>{
      clearTimeout(this.deadline);this.phase='unavailable';this.active=false;
      this.receive({kind:'status',status:'unavailable',code,error});ws.close();
     };
     ws.onopen=()=>{if(!current()){ws.close();return}
      this.phase='registering';
      ws.send(JSON.stringify({kind:'register',message:hello,group:config.group,passphrase:config.passphrase}));
     };
     ws.onmessage=e=>{if(!current())return;try{
      const event=JSON.parse(e.data);
      if(event.kind==='status'){
       if(event.status==='searching'||event.code==='identity-in-use'){
        if(event.protocol!==PROTOCOL){fail('protocol-mismatch','Remote relay is outdated or incompatible. Stop and restart the Node relay from the updated repository, then reconnect.');return}
        registered=true;clearTimeout(this.deadline);
        this.phase=event.code==='identity-in-use'?'waiting':'ready';
        this.receive({kind:'status',status:event.status,error:ERRORS[event.code]||''});return;
       }
       if(event.status==='unavailable'){
        fail(event.code||'registration-rejected',ERRORS[event.code]||'Remote relay rejected registration. Update and restart the Node relay; check its configuration.');return;
       }
       return;
      }
      if(this.phase!=='ready')return;
      this.receive(event);
      const m=event.message;
      if(event.kind==='message'&&root.CoBakerCore.validPacket(m)&&m.type==='test')this.send(m.player.id,root.CoBakerCore.packet(hello.player,hello.session,'reply',m.id));
     }catch(_){/* Invalid network frame ignored; never affect solo play. */}};
     ws.onerror=()=>{};
     ws.onclose=e=>{if(!current())return;clearTimeout(this.deadline);
      if(e.code===1008){fail('policy-close',registered?'Remote relay closed a registered connection for a protocol/policy error. Update the browser and restart the Node relay.':'Remote relay rejected registration before it completed. Check the password and update/restart the relay.');return}
      this.phase='disconnected';
      this.receive({kind:'status',status:'disconnected',error:registered?'Remote relay disconnected. Reconnecting…':'Remote relay could not complete registration. Check the tunnel address, relay availability and allowed site origin. Reconnecting…'});
      this.timer=setTimeout(connect,2000);
     };
    }catch(_){clearTimeout(this.deadline);this.phase='disconnected';this.receive({kind:'status',status:'disconnected',error:'Remote relay could not connect. Check the tunnel address and relay availability. Reconnecting…'});this.timer=setTimeout(connect,2500)}
   };
   connect();
  }
  send(to,message){if(this.phase!=='ready'||this.socket?.readyState!==1)throw Error('Remote test relay is not registered');this.socket.send(JSON.stringify({kind:'send',to,message}))}
  stop(){this.active=false;this.phase='disconnected';this.epoch++;clearTimeout(this.timer);clearTimeout(this.deadline);if(this.socket){this.socket.onclose=null;this.socket.close();this.socket=null}}
 }
 root.RemoteTestTransport=RemoteTestTransport;
})(globalThis);
