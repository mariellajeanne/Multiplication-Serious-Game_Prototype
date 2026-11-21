/* Co-Baker Phase 2: peer invitations and learner-authoritative reservations.
 * Coordinator election remains advisory; no worksheet/economy changes or rewards.
 * Works over both test WebSockets and native direct messages. */
(function(root){
 'use strict';
 const ID=/^[a-f0-9]{32}$/,PREF='panaderyaAvailableToHelpV1';
 const RULES=Object.freeze({inviteMs:15000,directCooldownMs:30000,interruptedCooldownMs:45000,searchMs:60000,rateWindowMs:60000,maxCallsPerWindow:12,maxOutgoing:3,maxIncoming:24,maxRecords:256,recordMs:120000,setupMs:32000,deliveryMs:5000,confirmDelayMs:650,confirmWindowMs:10000});
 const INVITE_MS=RULES.inviteMs,GRACE_MS=15000,MAX_INVITES=RULES.maxIncoming;
 const SWITCH_COMMIT=Symbol('confirmed switch');
 const makeId=()=>{const a=new Uint8Array(16);root.crypto.getRandomValues(a);return [...a].map(b=>b.toString(16).padStart(2,'0')).join('')};
 class Help{
  constructor(discovery,options={}){
   this.d=discovery;this.clock=options.clock||(()=>Date.now());this.storage=options.storage||root.localStorage;
   this.preferences=root.CoBakerPreferences?new root.CoBakerPreferences(this.storage):null;
   // The six Help Notifications switches, not the obsolete single-toggle key,
   // determine availability. Otherwise a previous legacy opt-out can advertise
   // Unavailable until somebody toggles DND even when all six switches are off.
   if(this.preferences)this.available=this.preferences.available('bakery');
   else try{this.available=this.storage?.getItem(PREF)!=='false'}catch(_){this.available=true}
   this.presence=new Map();this.incoming=new Map();this.calls=new Map();this.search=null;this.pickerOpen=false;this.active=null;this.accepting=null;
   this.records=new Map();this.callerTimes=new Map();this.directTimes=new Map();this.interrupted=new Map();this.callTimes=[];this.terminals=new Map();this.random=options.random||Math.random;
   this.log=[];this.listeners=new Set();this.lastAdvertise=0;this.worksheet=()=>false;
  }
  observe(fn){this.listeners.add(fn);fn(this);return ()=>this.listeners.delete(fn)}
  // Compatibility for existing reservation/recovery consumers. Calls themselves
  // have independent identities, setup deadlines and acknowledged expirations.
  get outgoing(){const first=this.calls.values().next().value;return first?{...first,recipients:new Set(this.calls.keys())}:null}
  setPicker(open){if(this.pickerOpen===!!open)return;this.pickerOpen=!!open;this.d.transport?.setDiscovering?.(!!open);if(open)this.fillSearch();this.changed()}
  canCall(id){const now=this.clock();return !this.active&&!this.accepting&&!this.switching&&this.activeWorksheet()&&this.calls.size<RULES.maxOutgoing&&this.eligible(id)&&!this.calls.has(id)&&now-(this.directTimes.get(id)??-Infinity)>=RULES.directCooldownMs&&now>=(this.interrupted.get(id)||0)&&this.callTimes.filter(t=>now-t<RULES.rateWindowMs).length<RULES.maxCallsPerWindow}
  changed(){for(const fn of this.listeners)try{fn(this)}catch(_){}}
  note(message){this.log.unshift({message,at:this.clock()});this.log.length=Math.min(this.log.length,12);this.changed()}
  activeWorksheet(){try{return !!this.worksheet()}catch(_){return false}}
  isBusy(){return !!(this.active||this.outgoing||this.search?.active||this.accepting||this.switching)}
  context(){return this.active?.role==='Helper'?'helping':this.activeWorksheet()?this.active?.role==='Learner'?'assisted':'solo':'bakery'}
  refreshAvailability(){const value=this.preferences?this.preferences.available(this.context()):this.available;if(this.available!==value){this.available=value;this.broadcastPresence()}return value}
  status(){this.refreshAvailability();return this.available?'Available':'Unavailable'}
  setAvailable(value){if(this.preferences)this.preferences.set('dnd',!value);this.available=!!value;try{this.storage?.setItem(PREF,String(this.available))}catch(_){}this.broadcastPresence();this.changed()}
  state(id){return this.presence.get(id)||(this.d.candidates?.has(id)?{available:this.d.candidates.get(id).available,status:this.d.candidates.get(id).available?'Available':'Unavailable'}:{available:false,status:'Unavailable'}) }
  eligible(id){return (this.d.peers.has(id)||this.d.candidates?.has(id))&&this.state(id).status==='Available'&&id!==this.d.profile.id}
  online(){this.lastAdvertise=0;this.refreshAvailability();this.broadcastPresence();this.changed()}
  expired(){return !!this.active?.lostAt&&this.clock()-this.active.lostAt>=GRACE_MS}
  reconnecting(){if(this.active&&!this.active.lostAt){this.active.lostAt=this.clock();this.changed()}}
  reconnected(){if(!this.active||this.expired())return false;const lost=!!this.active.lostAt;this.active.lostAt=0;if(lost)this.note('Connected again!');else this.changed();return true}
  offline(){this.search=null;this.cancel();this.presence.clear();this.incoming.clear();this.lastAdvertise=0;if(this.active&&!this.active.lostAt)this.active.lostAt=this.clock();this.changed()}
  peer(id){
   const session=this.d.peers.get(id)?.session;
   if(this.expired()){this.end();return}
   if(this.active?.otherId===id&&this.active.otherSession&&session!==this.active.otherSession){
    // A refreshed observer must prove its old reservation before sharing resumes.
    if(this.d.observation){
     if(!this.active.lostAt)this.active.lostAt=this.clock();
     this.changed();return;
    }
    this.active=null;this.note('Co-Baker restarted. The previous help session ended safely.');
   }
   this.presence.delete(id);this.refreshAvailability();this.send(id,{kind:'presence',available:this.available});if(this.active?.otherId===id&&!this.d.observation){this.active.lostAt=0}this.changed()}
  left(id){this.presence.delete(id);for(const [key,v]of this.incoming)if(v.ownerId===id)this.incoming.delete(key);
   if(this.accepting?.ownerId===id)this.accepting=null;
   if(this.active?.otherId===id&&!this.active.lostAt)this.active.lostAt=this.clock();
   if(this.calls.has(id))this.finishCall(id,'lost');
   this.changed();}
  send(to,help){if(!this.d.running||!this.d.peers.has(to)||!this.d.transport)return false;
   const m=root.CoBakerCore.packet(this.d.profile,this.d.session,'help');m.help=help;
   try{this.d.transport.send(to,m);return true}catch(_){return false}}
  broadcastPresence(){this.lastAdvertise=this.clock();this.d.transport?.availability?.(this.available);for(const id of this.d.peers.keys())this.send(id,{kind:'presence',available:this.available});this.changed()}
  remember(id){this.records.set(id,this.clock()+RULES.recordMs);while(this.records.size>RULES.maxRecords)this.records.delete(this.records.keys().next().value)}
  request(recipients,options={}){
   if(!this.activeWorksheet())return {ok:false,error:'Open an active order first.'};
   const budget=RULES.maxCallsPerWindow-this.callTimes.filter(t=>this.clock()-t<RULES.rateWindowMs).length;
   const ids=[...new Set(recipients)].filter(id=>this.canCall(id)).slice(0,Math.min(budget,RULES.maxOutgoing-this.calls.size));
   if(!ids.length)return {ok:false,error:this.calls.size>=RULES.maxOutgoing?'Three Bakers are already being called.':'Please wait, or choose an available Baker.'};
   const entries=ids.map(id=>this.reserveCall(id,options.random===true?'random':'manual'));
   this.note('Calling a Baker…');return {ok:true,requestId:entries[0].requestId};
  }
  reserveCall(id,source){const now=this.clock(),call={id,requestId:makeId(),source,waiting:true,state:'connecting',expiresAt:0,setupUntil:now+RULES.setupMs};
   this.calls.set(id,call);this.callTimes=this.callTimes.filter(t=>now-t<RULES.rateWindowMs);this.callTimes.push(now);this.directTimes.set(id,now);this.search?.contacted.add(id);
   while(this.directTimes.size>RULES.maxRecords)this.directTimes.delete(this.directTimes.keys().next().value);
   const ready=()=>{if(this.calls.get(id)!==call)return;if(this.clock()>=call.setupUntil||!this.activeWorksheet()||this.active){this.finishCall(id,'failed');return}
    call.state='delivering';call.setupUntil=Math.min(call.setupUntil,this.clock()+RULES.deliveryMs);
    if(!this.send(id,{kind:'invite',requestId:call.requestId,expiresAt:this.clock()+INVITE_MS}))this.finishCall(id,'failed');this.changed();};
   if(this.d.transport?.sparse)Promise.resolve(this.d.transport.connect(id,{priority:source==='manual'?0:1})).then(ok=>{if(this.calls.get(id)!==call)return;if(ok)ready();else this.finishCall(id,'failed')}).catch(()=>{if(this.calls.get(id)===call)this.finishCall(id,'failed')});else ready();
   this.changed();return call;
  }
  startSearch(){if(this.search?.active)return {ok:true};if(this.active||this.accepting||this.switching||!this.activeWorksheet()||this.calls.size>=RULES.maxOutgoing)return {ok:false,error:'Wait for a calling slot to open.'};
   this.search={active:true,until:this.clock()+RULES.searchMs,contacted:this.search?.contacted||new Set()};this.fillSearch();this.changed();return {ok:true};
  }
  fillSearch(){if(this.filling||!this.search?.active||!this.pickerOpen||this.clock()>=this.search.until||this.active||!this.activeWorksheet())return;
   this.filling=true;try{while(this.calls.size<RULES.maxOutgoing){const ids=[...new Set([...this.d.peers.keys(),...this.d.candidates?.keys()||[]])].filter(id=>this.canCall(id));if(!ids.length)break;
    // Fair tie-breaks use only campaign/contact history, never game/favorite data.
    const unseen=ids.filter(id=>!this.search.contacted.has(id)),pool=unseen.length?unseen:ids;
    const oldest=Math.min(...pool.map(id=>this.directTimes.get(id)??-Infinity)),ties=pool.filter(id=>(this.directTimes.get(id)??-Infinity)===oldest);
    this.reserveCall(ties[Math.min(ties.length-1,Math.floor(this.random()*ties.length))],'random');
   }}finally{this.filling=false}
  }
  stopSearch(){if(this.search)this.search.active=false;for(const c of [...this.calls.values()])if(c.source==='random')this.finishCall(c.id,'cancel');this.changed()}
  finishCall(id,reason='cancel',individual=false){const c=this.calls.get(id);if(!c)return false;
   if(individual&&c.source==='random'&&this.search)this.search.active=false;
   this.calls.delete(id);this.remember(c.requestId);
   if(['cancel','taken','expired','failed'].includes(reason))this.send(id,['cancel','failed'].includes(reason)?{kind:'cancel',requestId:c.requestId}:{kind:'unavailable',requestId:c.requestId,reason});
   if(['cancel','taken','failed','lost'].includes(reason))this.interrupted.set(id,this.clock()+RULES.interruptedCooldownMs);
   while(this.interrupted.size>RULES.maxRecords)this.interrupted.delete(this.interrupted.keys().next().value);
   this.d.transport?.cancelConnect?.(id);
   // Report a completed manual request's real terminal outcome. Automatic
   // searches may probe several peers, so don't spam a toast per candidate.
   const outcome={declined:'Help request declined.',unavailable:'Baker unavailable to help. Check Help Notifications.',expired:'Help request expired.',failed:'Could not send the help request.',lost:'Baker disconnected before answering.'}[reason];
   if(outcome&&c.source==='manual')this.note(outcome);else this.changed();return true;
  }
  decline(requestId){const invitation=this.incoming.get(requestId);if(!invitation)return;
   this.incoming.delete(requestId);this.remember(requestId);this.send(invitation.ownerId,{kind:'decline',requestId});this.changed()}
  accept(requestId,commit){const invitation=this.incoming.get(requestId);
   this.refreshAvailability();if(!invitation||invitation.expiresAt<=this.clock()||!this.d.peers.has(invitation.ownerId)||!this.available&&commit!==SWITCH_COMMIT||this.isBusy())return false;
   for(const [otherId,other] of this.incoming)if(otherId!==requestId)this.send(other.ownerId,{kind:'decline',requestId:otherId});
   this.incoming.clear();this.remember(requestId);this.accepting={requestId,ownerId:invitation.ownerId,expiresAt:invitation.expiresAt};
   this.send(invitation.ownerId,{kind:'accept',requestId});this.broadcastPresence();this.note('Waiting for Baker to confirm…');return true;
  }
  async switchTo(requestId,expected,prepare=()=>true){
   const invitation=this.incoming.get(requestId),current=this.active?.sessionId||null,context=this.context();
   if(this.switching||this.accepting||this.outgoing||this.search?.active||!this.refreshAvailability()||current!==expected||!invitation||invitation.expiresAt<=this.clock())return false;
   this.switching=true;
   try{if(!await prepare())return false;
    if(!this.incoming.has(requestId)||invitation.expiresAt<=this.clock()||(this.active?.sessionId||null)!==expected||!this.d.peers.has(invitation.ownerId)||this.preferences&&!this.preferences.available(context))return false;
    if(this.active)this.end();
    this.switching=false;return this.accept(requestId,SWITCH_COMMIT);
   }finally{this.switching=false;this.changed()}
  }
  cancel(expired=false){const had=this.calls.size>0;this.search=null;for(const id of [...this.calls.keys()])this.finishCall(id,expired?'expired':'cancel');
   if(had){this.broadcastPresence();this.note('Help request canceled.')}return had}
  end(){if(this.outgoing)return this.cancel();if(!this.active)return false;
   const a=this.active;this.active=null;this.send(a.otherId,{kind:'end',sessionId:a.sessionId});this.broadcastPresence();this.note('Help session ended.');return true}
  receive(m){const h=m.help,id=m.player.id,now=this.clock();if(!h||!this.d.peers.has(id))return;
   if(h.kind==='presence'){this.presence.set(id,{available:h.available,status:h.available?'Available':'Unavailable'});this.changed();return}
   if(h.kind==='invite'){
    this.refreshAvailability();if(this.records.has(h.requestId)||this.incoming.has(h.requestId))return;
    // expiresAt is a timestamp in the *caller's* clock. Tablet clocks can be
    // minutes apart, so it cannot validate recency against this device's clock.
    // A fresh, session-bound request ID gets a receiver-local 15-second lease;
    // an obsolete request cannot be assigned by the learner after its own lease.
    if(!this.available){this.remember(h.requestId);this.send(id,{kind:'unavailable',requestId:h.requestId,reason:'busy'});return}
    if(now-(this.callerTimes.get(id)??-Infinity)<RULES.directCooldownMs||[...this.incoming.values()].some(i=>i.ownerId===id)){this.remember(h.requestId);return}
    if(this.incoming.has(h.requestId)||this.incoming.size>=MAX_INVITES)return;
    this.callerTimes.set(id,now);while(this.callerTimes.size>RULES.maxRecords)this.callerTimes.delete(this.callerTimes.keys().next().value);
    const expiresAt=now+INVITE_MS;
    this.remember(h.requestId);this.incoming.set(h.requestId,{requestId:h.requestId,ownerId:id,expiresAt});this.send(id,{kind:'delivered',requestId:h.requestId,expiresAt});this.note(`${m.player.name} #${m.player.number} needs help!`);return;
   }
   if(h.kind==='delivered'){const c=this.calls.get(id);if(!c||c.requestId!==h.requestId||c.state!=='delivering'||c.setupUntil<=now)return;
    // ACK delivery, not a remote wall clock, starts the learner's 15-second
    // actionable window. The helper independently counts down from receipt.
    c.state='calling';c.waiting=false;c.expiresAt=now+INVITE_MS;this.directTimes.set(id,now);this.changed();return;
   }
   if(h.kind==='cancel'){const invite=this.incoming.get(h.requestId);this.remember(h.requestId);if(invite?.ownerId===id||this.accepting?.requestId===h.requestId&&this.accepting.ownerId===id){this.incoming.delete(h.requestId);this.terminal(h.requestId,id,'cancelled the call');if(this.accepting?.requestId===h.requestId)this.accepting=null;this.broadcastPresence();this.changed()}return}
   if(h.kind==='unavailable'){
    const invite=this.incoming.get(h.requestId);
    if(invite?.ownerId===id||this.accepting?.requestId===h.requestId&&this.accepting.ownerId===id){this.incoming.delete(h.requestId);
     if(h.reason==='taken')this.terminal(h.requestId,id,'found help!');
     if(this.accepting?.requestId===h.requestId)this.accepting=null;
     this.broadcastPresence();this.note(h.reason==='taken'?'Already being helped! Another Baker accepted.':'That request is no longer available.');return}
   }
   if(h.kind==='decline'||h.kind==='unavailable'){
    const c=this.calls.get(id);if(!c||c.requestId!==h.requestId)return;
    this.finishCall(id,h.kind==='unavailable'?'unavailable':'declined');this.fillSearch();return;
   }
   if(h.kind==='accept'){
    const o=this.calls.get(id);
    if(!o||o.waiting||o.requestId!==h.requestId||o.expiresAt<=now||!this.activeWorksheet()||this.active){this.send(id,{kind:'unavailable',requestId:h.requestId,reason:o?.expiresAt<=now?'expired':'taken'});return}
    // Owner serializes acceptances. Only the learner can make the helper lock definitive.
    const sessionId=makeId();this.search=null;this.calls.delete(id);for(const other of [...this.calls.keys()])this.finishCall(other,'taken');
    this.active={sessionId,requestId:h.requestId,otherId:id,otherSession:this.d.peers.get(id)?.session,role:'Learner',lostAt:0};
    this.send(id,{kind:'assigned',requestId:h.requestId,sessionId,helperId:id});
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
   if(h.kind==='end'&&this.active?.otherId===id&&this.active.sessionId===h.sessionId&&this.d.peers.get(id)?.session===m.session){this.active=null;this.broadcastPresence();this.note('Your Co-Baker left. You can keep practicing!')}
  }
  tick(){const now=this.clock();let changed=false;
   this.refreshAvailability();
   for(const [id,time]of this.records)if(time<=now)this.records.delete(id);
   for(const [id,t]of this.terminals)if(t.until<=now){this.terminals.delete(id);changed=true}
   for(const [key,v]of this.incoming)if(v.expiresAt<=now){this.incoming.delete(key);changed=true}
   if(this.accepting?.expiresAt<=now){this.accepting=null;changed=true}
   if(!this.activeWorksheet()&&(this.calls.size||this.search)){this.cancel();changed=true}
   if(this.search?.active&&this.search.until<=now){this.stopSearch();changed=true}
   for(const c of [...this.calls.values()])if(c.waiting?c.setupUntil<=now:c.expiresAt<=now){this.finishCall(c.id,c.waiting?'failed':'expired');changed=true}
   this.fillSearch();
   if(this.active){if(this.active.role==='Learner'&&!this.activeWorksheet()){this.end();changed=true}
    else if(this.expired()){this.end();this.note('Your Co-Baker left. You can keep practicing!');changed=true}}
   if(changed)this.changed();
  }
  terminal(requestId,ownerId,text){this.terminals.set(requestId,{ownerId,text,until:this.clock()+2000});while(this.terminals.size>MAX_INVITES)this.terminals.delete(this.terminals.keys().next().value)}
 }
 root.CoBakerHelp=Help;
 root.CoBakerHelpPreferenceKey=PREF;
 root.CoBakerHelpRules=RULES;
})(globalThis);
