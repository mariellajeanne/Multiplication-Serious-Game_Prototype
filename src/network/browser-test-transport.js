(function(root){
 'use strict';
 class BrowserTestTransport{
  constructor(receive){this.receive=receive;this.label='Browser Test';this.epoch=0}
  async start(hello){this.stop();this.hello=hello;this.active=true;const epoch=this.epoch;
   const connect=async()=>{if(!this.active||epoch!==this.epoch)return;
    try{const response=await fetch('/__co-baker/config',{cache:'no-store'});if(!response.ok)throw Error('Start npm run dev:cobaker first');const config=await response.json();if(!config.enabled||!config.token)throw Error('Local relay is not enabled');
     if(!this.active||epoch!==this.epoch)return;
     const url=new URL('/__co-baker/socket',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';url.searchParams.set('token',config.token);const ws=this.socket=new WebSocket(url);
     const current=()=>this.active&&epoch===this.epoch&&this.socket===ws;
     ws.onopen=()=>{if(!current()){ws.close();return}ws.send(JSON.stringify({kind:'register',message:hello}))};
     ws.onmessage=e=>{if(!current()||ws.readyState!==1)return;try{const event=JSON.parse(e.data);this.receive(event);const m=event.message;if(event.kind==='message'&&root.CoBakerCore.validPacket(m)&&m.type==='test')this.send(m.player.id,root.CoBakerCore.packet(hello.player,hello.session,'reply',m.id))}catch(_){}};
     ws.onerror=()=>{};ws.onclose=()=>{if(current()){this.receive({kind:'status',status:'disconnected',error:'Local relay disconnected. Reconnecting…'});this.timer=setTimeout(connect,1500)}};
    }catch(e){if(epoch===this.epoch&&this.active){this.receive({kind:'status',status:'unavailable',error:String(e.message||e)});this.timer=setTimeout(connect,2000)}}
   };await connect();
  }
  stop(){this.active=false;this.epoch++;clearTimeout(this.timer);if(this.socket){this.socket.onclose=null;this.socket.close();this.socket=null}}
  send(to,message){if(this.socket?.readyState!==1)throw Error('Relay disconnected');this.socket.send(JSON.stringify({kind:'send',to,message}))}
 }
 root.BrowserTestTransport=BrowserTestTransport;
})(globalThis);
