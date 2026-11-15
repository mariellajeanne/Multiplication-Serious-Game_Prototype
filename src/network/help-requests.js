/* Co-Baker Phase 2: peer invitations and learner-authoritative reservations.
 * Coordinator election remains advisory; no worksheet/economy changes or rewards.
 * Works over both test WebSockets and native direct messages. */
(function(root){
 'use strict';
 const ID=/^[a-f0-9]{32}$/,PREF='panaderyaAvailableToHelpV1';
 const INVITE_MS=45000,GRACE_MS=15000,MAX_INVITES=64;
 const makeId=()=>{const a=new Uint8Array(16);root.crypto.getRandomValues(a);return [...a].map(b=>b.toString(16).padStart(2,'0')).join('')};
 class Help{
  constructor(discovery,options={}){
   this.d=discovery;this.clock=options.clock||(()=>Date.now());this.storage=options.storage||root.localStorage;
   try{this.available=this.storage?.getItem(PREF)!=='false'}catch(_){this.available=true}
   this.presence=new Map();this.incoming=new Map();this.outgoing=null;this.active=null;this.accepting=null;
   this.log=[];this.listeners=new Set();this.lastAdvertise=0;this.worksheet=()=>false;
  }
  observe(fn){this.listeners.add(fn);fn(this);return ()=>this.listeners.delete(fn)}
  changed(){for(const fn of this.listeners)try{fn(this)}catch(_){}}
  note(message){this.log.unshift({message,at:this.clock()});this.log.length=Math.min(this.log.length,12);this.changed()}
  activeWorksheet(){try{return !!this.worksheet()}catch(_){return false}}
  isBusy(){return !!(this.active||this.outgoing||this.accepting)}
  status(){return !this.available?'Do Not Disturb':this.isBusy()?'Busy':'Available'}
  setAvailable(value){this.available=!!value;try{this.storage?.setItem(PREF,String(this.available))}catch(_){}this.broadcastPresence();this.changed()}
  state(id){return this.presence.get(id)||{available:false,busy:true,status:'Connecting'} }
  eligible(id){return this.d.peers.has(id)&&this.state(id).status==='Available'&&id!==this.d.profile.id}
  online(){this.lastAdvertise=0;this.broadcastPresence();this.changed()}
  offline(){this.presence.clear();this.incoming.clear();this.lastAdvertise=0;if(this.outgoing){this.outgoing.waiting=true}if(this.active&&!this.active.lostAt)this.active.lostAt=this.clock();this.changed()}
  peer(id){
   const session=this.d.peers.get(id)?.session;
   if(this.active?.otherId===id&&this.active.otherSession&&session!==this.active.otherSession){
    // A refreshed observer must prove its old reservation before sharing resumes.
    if(this.d.observation&&this.active.role==='Learner'){
     if(!this.active.lostAt)this.active.lostAt=this.clock();
     this.changed();return;
    }
    this.active=null;this.note('Co-Baker restarted. The previous help session ended safely.');
   }
   this.presence.delete(id);this.send(id,{kind:'presence',available:this.available,busy:this.isBusy()});if(this.active?.otherId===id){this.active.lostAt=0}this.changed()}
  left(id){this.presence.delete(id);for(const [key,v]of this.incoming)if(v.ownerId===id)this.incoming.delete(key);
   if(this.accepting?.ownerId===id)this.accepting=null;
   if(this.active?.otherId===id&&!this.active.lostAt)this.active.lostAt=this.clock();
   if(this.outgoing?.recipients.has(id))this.outgoing.recipients.delete(id);
   this.changed();}
  send(to,help){if(!this.d.running||!this.d.peers.has(to)||!this.d.transport)return false;
   const m=root.CoBakerCore.packet(this.d.profile,this.d.session,'help');m.help=help;
   try{this.d.transport.send(to,m);return true}catch(_){return false}}
  broadcastPresence(){this.lastAdvertise=this.clock();for(const id of this.d.peers.keys())this.send(id,{kind:'presence',available:this.available,busy:this.isBusy()});this.changed()}
  request(recipients){
   if(!this.activeWorksheet())return {ok:false,error:'Open an active order first.'};
   if(this.isBusy())return {ok:false,error:'Finish or cancel your current Co-Baker request first.'};
   const targets=[...new Set(recipients)].filter(id=>this.eligible(id));
   if(!targets.length)return {ok:false,error:'No available Bakers to call right now.'};
   const requestId=makeId(),expiresAt=this.clock()+INVITE_MS;
   this.outgoing={requestId,expiresAt,recipients:new Set(targets),declined:new Set(),waiting:false};
   for(const id of targets)this.send(id,{kind:'invite',requestId,expiresAt});
   this.broadcastPresence();this.note(targets.length===1?'Calling a Baker…':'Calling nearby Bakers…');
   return {ok:true,requestId};
  }
  decline(requestId){const invitation=this.incoming.get(requestId);if(!invitation)return;
   this.incoming.delete(requestId);this.send(invitation.ownerId,{kind:'decline',requestId});this.changed()}
  accept(requestId){const invitation=this.incoming.get(requestId);
   if(!invitation||invitation.expiresAt<=this.clock()||!this.d.peers.has(invitation.ownerId)||!this.available||this.isBusy())return false;
   for(const [otherId,other] of this.incoming)if(otherId!==requestId)this.send(other.ownerId,{kind:'decline',requestId:otherId});
   this.incoming.clear();this.accepting={requestId,ownerId:invitation.ownerId,expiresAt:invitation.expiresAt+5000};
   this.send(invitation.ownerId,{kind:'accept',requestId});this.broadcastPresence();this.note('Waiting for Baker to confirm…');return true;
  }
  cancel(){const o=this.outgoing;if(!o)return false;this.outgoing=null;
   for(const id of o.recipients)this.send(id,{kind:'cancel',requestId:o.requestId});
   this.broadcastPresence();this.note('Help request canceled.');return true}
  end(){if(this.outgoing)return this.cancel();if(!this.active)return false;
   const a=this.active;this.active=null;this.send(a.otherId,{kind:'end',sessionId:a.sessionId});this.broadcastPresence();this.note('Help session ended.');return true}
  receive(m){const h=m.help,id=m.player.id,now=this.clock();if(!h||!this.d.peers.has(id))return;
   if(h.kind==='presence'){this.presence.set(id,{available:h.available,busy:h.busy,status:!h.available?'Do Not Disturb':h.busy?'Busy':'Available'});this.changed();return}
   if(h.kind==='invite'){
    if(h.expiresAt<=now||h.expiresAt>now+INVITE_MS+30000||!this.available||this.isBusy()){this.send(id,{kind:'unavailable',requestId:h.requestId,reason:'busy'});return}
    if(this.incoming.has(h.requestId)||this.incoming.size>=MAX_INVITES)return;
    this.incoming.set(h.requestId,{requestId:h.requestId,ownerId:id,expiresAt:h.expiresAt});this.note(`${m.player.name} #${m.player.number} needs help!`);return;
   }
   if(h.kind==='cancel'){const invite=this.incoming.get(h.requestId);if(invite?.ownerId===id||this.accepting?.requestId===h.requestId&&this.accepting.ownerId===id){this.incoming.delete(h.requestId);if(this.accepting?.requestId===h.requestId)this.accepting=null;this.broadcastPresence();this.changed()}return}
   if(h.kind==='unavailable'){
    const invite=this.incoming.get(h.requestId);
    if(invite?.ownerId===id||this.accepting?.requestId===h.requestId&&this.accepting.ownerId===id){this.incoming.delete(h.requestId);
     if(this.accepting?.requestId===h.requestId)this.accepting=null;
     this.broadcastPresence();this.note(h.reason==='taken'?'Already being helped! Another Baker accepted.':'That request is no longer available.');return}
   }
   if(h.kind==='decline'||h.kind==='unavailable'){
    const o=this.outgoing;if(!o||o.requestId!==h.requestId||!o.recipients.has(id))return;
    o.declined.add(id);
    if(o.declined.size===o.recipients.size){this.cancel();this.note('No Bakers were available. You can try again.')}else this.changed();return;
   }
   if(h.kind==='accept'){
    const o=this.outgoing;
    if(!o||o.requestId!==h.requestId||o.expiresAt<=now||!this.activeWorksheet()||!o.recipients.has(id)||o.declined.has(id)||this.active){this.send(id,{kind:'unavailable',requestId:h.requestId,reason:o?.expiresAt<=now?'expired':'taken'});return}
    // Owner serializes acceptances. Only the learner can make the helper lock definitive.
    const sessionId=makeId(),targets=[...o.recipients];this.outgoing=null;
    this.active={sessionId,requestId:h.requestId,otherId:id,otherSession:this.d.peers.get(id)?.session,role:'Learner',lostAt:0};
    this.send(id,{kind:'assigned',requestId:h.requestId,sessionId,helperId:id});
    for(const other of targets)if(other!==id)this.send(other,{kind:'unavailable',requestId:h.requestId,reason:'taken'});
    this.broadcastPresence();this.note(`${m.player.name} #${m.player.number} is helping!`);return;
   }
   if(h.kind==='assigned'){
    if(h.helperId!==this.d.profile.id)return;
    if(this.active?.otherId===id&&this.active.sessionId===h.sessionId)return;
    // Release the owner's lock when confirmation arrives after our wait ended.
    // An end for an old session cannot affect a newer reservation.
    if(this.active||!this.accepting||this.accepting.requestId!==h.requestId||this.accepting.ownerId!==id||this.accepting.expiresAt<=now){this.send(id,{kind:'end',sessionId:h.sessionId});return}
    this.accepting=null;this.incoming.delete(h.requestId);
    this.active={sessionId:h.sessionId,requestId:h.requestId,otherId:id,otherSession:m.session,role:'Helper',lostAt:0};
    this.broadcastPresence();this.note(`Connected with ${m.player.name} #${m.player.number}!`);return;
   }
   if(h.kind==='end'&&this.active?.otherId===id&&this.active.sessionId===h.sessionId){this.active=null;this.broadcastPresence();this.note('Your Co-Baker left the session.')}
  }
  tick(){const now=this.clock();let changed=false;
   for(const [key,v]of this.incoming)if(v.expiresAt<=now){this.incoming.delete(key);changed=true}
   if(this.accepting?.expiresAt<=now){this.accepting=null;changed=true}
   if(this.outgoing&&(this.outgoing.expiresAt<=now||!this.activeWorksheet())){this.cancel();this.note('Help request ended.');changed=true}
   if(this.active){if(this.active.role==='Learner'&&!this.activeWorksheet()){this.end();changed=true}
    else if(this.active.lostAt&&now-this.active.lostAt>=GRACE_MS){this.active=null;this.broadcastPresence();this.note('Co-Baker disconnected. You can keep playing.');changed=true}}
   if(this.d.running&&this.d.transport&&now-this.lastAdvertise>=5000&&this.d.peers.size)this.broadcastPresence();
   if(changed)this.changed();
  }
 }
 root.CoBakerHelp=Help;
 root.CoBakerHelpPreferenceKey=PREF;
})(globalThis);
