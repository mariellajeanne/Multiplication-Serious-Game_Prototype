/* Co-Baker identity, discovery and coordinator protocol. No game/economy/worksheet state crosses this boundary. */
(function(root){
 'use strict';
 const KEY='panaderyaPlayerV1',ID=/^[a-f0-9]{32}$/;
 function randomId(){const bytes=new Uint8Array(16);root.crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}
 function cleanName(name){return String(name||'').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim().slice(0,24)||'Baker'}
 function validProfile(p){return !!p&&typeof p.id==='string'&&ID.test(p.id)&&typeof p.number==='string'&&/^\d{4}$/.test(p.number)&&typeof p.name==='string'&&p.name===cleanName(p.name)}
 function identity(storage){
  let p;try{p=JSON.parse(storage.getItem(KEY))}catch(_){}
  if(!validProfile(p)){const n=new Uint32Array(1);do{root.crypto.getRandomValues(n)}while(n[0]>=4294960000);p={id:randomId(),name:'Baker',number:String(n[0]%10000).padStart(4,'0')};storage.setItem(KEY,JSON.stringify(p))}
  return Object.freeze({id:p.id,name:p.name,number:p.number});
 }
 function packet(p,session,type,replyTo){return {v:1,id:randomId(),session,player:{id:p.id,name:p.name,number:p.number},type,...(replyTo?{replyTo}:{})}}
 function keys(o,allowed){return !!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>allowed.includes(k))}
 function validTerm(t){return Number.isSafeInteger(t)&&t>=0&&t<=1000000000}
 function validCoord(c){
  if(!c)return false;
  if(c.kind==='probe'||c.kind==='notice')return keys(c,['kind']);
  return c.kind==='state'&&keys(c,['kind','replyTo','term','leader'])&&typeof c.replyTo==='string'&&ID.test(c.replyTo)&&validTerm(c.term)&&
   (c.leader===null||keys(c.leader,['id','session','term'])&&typeof c.leader.id==='string'&&ID.test(c.leader.id)&&typeof c.leader.session==='string'&&ID.test(c.leader.session)&&validTerm(c.leader.term)&&c.leader.term>0&&c.leader.term<=c.term);
 }
 function validPacket(m){return keys(m,['v','id','session','player','type','replyTo','coord'])&&m.v===1&&typeof m.id==='string'&&ID.test(m.id)&&typeof m.session==='string'&&ID.test(m.session)&&validProfile(m.player)&&keys(m.player,['id','name','number'])&&['hello','test','reply','coord'].includes(m.type)&&
  (m.type==='reply'?typeof m.replyTo==='string'&&ID.test(m.replyTo):!('replyTo'in m))&&(m.type==='coord'?validCoord(m.coord):!('coord'in m))}

 class Discovery{
  constructor(profile,transport,now=()=>root.performance?.now()??Date.now()){this.profile=profile;this.transport=transport;this.now=now;this.session=randomId();this.peers=new Map();this.seen=new Set();this.pending=new Map();this.messages=[];this.listeners=new Set();this.status='disconnected';this.error='';this.running=false;this.coordinator=root.CoBakerCoordinator?new root.CoBakerCoordinator(this):null}
  observe(fn){this.listeners.add(fn);fn(this);return ()=>this.listeners.delete(fn)}
  changed(){for(const fn of this.listeners)fn(this)}
  async start(){if(this.running)return;this.running=true;this.session=randomId();this.seen.clear();this.status=this.transport?'searching':'unavailable';this.error=this.transport?'':'LAN discovery requires the native Android app. Browsers cannot advertise or listen for LAN peers.';this.changed();if(this.transport)try{await this.transport.start(packet(this.profile,this.session,'hello'))}catch(e){this.running=false;this.coordinator?.offline();this.status='unavailable';this.error=String(e.message||e);this.changed()}}
  stop(){this.running=false;this.coordinator?.offline();try{this.transport?.stop()}catch(_){}this.peers.clear();this.pending.clear();this.status='disconnected';this.changed()}
  receive(event){
   if(!this.running)return;
   if(event.kind==='status'){this.status=['searching','unavailable','disconnected'].includes(event.status)?event.status:'searching';this.error=String(event.error||'').slice(0,240);if(this.status!=='searching'){this.peers.clear();this.pending.clear();this.coordinator?.offline()}else this.coordinator?.online();this.changed();return}
   if(event.kind==='left'){this.peers.delete(event.playerId);this.coordinator?.left(event.playerId);if(this.status==='connected'&&!this.peers.size)this.status='searching';this.changed();return}
   const m=event.message;if(event.kind!=='message'||!validPacket(m)||m.player.id===this.profile.id||this.seen.has(m.id)||!this.peers.has(m.player.id)&&this.peers.size>=128)return;
   this.seen.add(m.id);if(this.seen.size>512)this.seen.delete(this.seen.values().next().value);
   const isNew=!this.peers.has(m.player.id);
   this.peers.set(m.player.id,{...m.player,session:m.session,lastSeen:this.now(),status:'Connected'});this.status='connected';
   if(isNew)this.coordinator?.peer(m.player.id);
   if(m.type==='coord')this.coordinator?.receive(m);
   if(m.type==='test'||m.type==='reply'&&this.pending.get(m.replyTo)===m.player.id){this.messages.unshift({from:m.player.id,label:m.player.name+' #'+m.player.number,text:m.type==='test'?'Test received':'Response received'});this.messages.length=Math.min(30,this.messages.length);if(m.type==='reply')this.pending.delete(m.replyTo)}
   this.changed();
  }
  sendTest(id){if(!this.peers.has(id)||!this.transport)return;const m=packet(this.profile,this.session,'test');this.pending.set(m.id,id);while(this.pending.size>64)this.pending.delete(this.pending.keys().next().value);try{this.transport.send(id,m);this.messages.unshift({label:'You',text:'Test sent'});this.messages.length=Math.min(30,this.messages.length);this.changed()}catch(e){this.error=String(e.message||e);this.changed()}}
  expire(){this.coordinator?.tick();for(const [id,p] of this.peers)if(this.now()-p.lastSeen>16000){this.peers.delete(id);this.coordinator?.left(id)}if(this.status==='connected'&&!this.peers.size)this.status='searching';this.changed()}
 }
 root.CoBakerCore={KEY,identity,cleanName,validPacket,packet,Discovery};
})(globalThis);

