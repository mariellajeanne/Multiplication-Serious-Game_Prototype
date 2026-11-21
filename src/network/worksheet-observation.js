/* Phases 3A-3C: bounded observation, recovery and ephemeral guidance; no game commands. */
(function(root){
 'use strict';
 const ID=/^[a-f0-9]{32}$/;
 const validId=v=>typeof v==='string'&&ID.test(v);
 const hints=Object.freeze({ones:'Check the ones column!',carry:"Don't forget the carry!",next:'Look at the next digit!',place:'Check where this number goes!',add:'Remember to add the rows!',retry:'Try that step again!'});
 const validTarget=t=>typeof t==='string'&&/^(?:(?:top|bottom|carry|sum):[0-6]|slot:[01]:[0-6]|calculator:(?:product|tray|ones|tens|carry)|control:(?:generate|undo|add|challenge))$/.test(t);
 function targetExists(t,data){
  if(!validTarget(t)||!validSnapshot(data))return false;
  const [kind,a,b]=t.split(':'),s=data.state,c=data.presentation?.calculator;
  if(kind==='top'||kind==='carry')return +a<s.A.length;
  if(kind==='bottom')return +a<s.B.length;
  if(kind==='sum')return s.complete&&s.B.length>1&&+a<s.cols;
  if(kind==='slot')return +a<s.B.length&&+b<s.cols&&(+a<=s.row||s.phase==='sum'||s.complete)&&(!s.complete||+a===0);
  if(kind==='calculator')return c?.mode==='fact'&&(a==='product'||s.phase==='product'&&s.revealed&&(a==='ones'||a==='tens'&&Math.floor((s.raw+(s.mixed?s.incoming:0))/10)>0)||!!c.tray&&(a==='tray'||a==='carry'&&c.tray.waiting>0||c.tray.digits.some(d=>d.part===a)));
  return a==='undo'||a==='add'&&s.phase==='sum'||a==='generate'&&(!!c?.generate||s.phase==='product'&&!s.revealed&&!c?.manual)||a==='challenge'&&!!c?.offered;
 }
 function validCue(h){
  return keys(h,['kind','sessionId','streamId','recipientId','cueToken','sequence','stateVersion','target','hint'])&&Number.isSafeInteger(h.stateVersion)&&h.stateVersion>0&&
   ['sessionId','streamId','recipientId','cueToken'].every(k=>typeof h[k]==='string'&&ID.test(h[k]))&&Number.isSafeInteger(h.sequence)&&h.sequence>0&&
   (h.kind==='point'?!('hint'in h)&&validTarget(h.target):h.kind==='hint'&&!('target'in h)&&typeof h.hint==='string'&&Object.hasOwn(hints,h.hint));
 }
 const fields=['a','b','A','B','cols','row','k','first','phase','revealed','raw','mixed','incoming','onesPlaced','tensPlaced','tensLocation','chosen','carrySlots','rows','sum','sumCol','sumCarry','done','boxes','complete','carryArmed'];
 const connectionFields=['expressionOrder','expressionActivated','goldenOffer'];
 const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const keys=(v,list)=>object(v)&&Object.keys(v).every(k=>list.includes(k));
 const int=(v,max)=>Number.isInteger(v)&&v>=0&&v<=max;
 const digits=(v,max=6)=>object(v)&&Object.keys(v).length<=max+1&&Object.entries(v).every(([k,n])=>/^[0-6]$/.test(k)&&int(n,9));
 function validState(s){
  if(!keys(s,[...fields,...connectionFields])||fields.some(k=>!(k in s)))return false;
  if(s.expressionOrder!==undefined&&(!Array.isArray(s.expressionOrder)||s.expressionOrder.length!==2||!s.expressionOrder.every(n=>int(n,9))))return false;
  if(['expressionActivated','goldenOffer'].some(k=>s[k]!==undefined&&typeof s[k]!=='boolean'))return false;
  if(!int(s.a,99999)||s.a<1||!int(s.b,99)||s.b<1)return false;
  const rev=n=>String(n).split('').reverse().map(Number);
  if(JSON.stringify(s.A)!==JSON.stringify(rev(s.a))||JSON.stringify(s.B)!==JSON.stringify(rev(s.b))||s.cols!==String(s.a*s.b).length)return false;
  if(!int(s.row,s.B.length-1)||!int(s.k,s.A.length)||!int(s.done,s.A.length*s.B.length)||!int(s.boxes,10)||!int(s.raw,81)||!int(s.incoming,9)||!int(s.sumCol,7)||!int(s.sumCarry,9))return false;
  if(!['select','product','sum','complete'].includes(s.phase)||!['revealed','mixed','onesPlaced','tensPlaced','complete','carryArmed'].every(k=>typeof s[k]==='boolean'))return false;
  if(s.phase==='product'&&s.k>=s.A.length)return false;
  if(![null,'ones','tens'].includes(s.chosen)||![null,'row','carry'].includes(s.tensLocation))return false;
  if(s.first!==null&&(!keys(s.first,['kind','c'])||!['top','bottom'].includes(s.first.kind)||!int(s.first.c,s.first.kind==='top'?s.A.length-1:s.B.length-1)))return false;
  return Array.isArray(s.rows)&&s.rows.length===s.B.length&&s.rows.every(r=>digits(r))&&digits(s.sum)&&object(s.carrySlots)&&Object.keys(s.carrySlots).length<=6&&Object.entries(s.carrySlots).every(([k,v])=>/^[0-5]$/.test(k)&&keys(v,['value','provisional'])&&int(v.value,9)&&typeof v.provisional==='boolean');
 }
 const text=(s,max=240)=>typeof s==='string'&&s.length<=max&&!/[\u0000-\u001f]/.test(s);
 const target=t=>t===null||keys(t,['kind','r','c'])&&['slot','carry'].includes(t.kind)&&int(t.c,6)&&(t.kind==='carry'?!('r'in t):int(t.r,1));
 function validPresentation(p){
  if(!keys(p,['calculator','phase','tutorial','guideLevel','entry','rewards','order'])||!['connect','calculate','carry','place','add','complete'].includes(p.phase)||typeof p.tutorial!=='boolean'||!int(p.guideLevel,2))return false;
  if(p.order!==undefined&&(!keys(p.order,['foodId','sprite'])||!int(p.order.sprite,17)||p.order.sprite<1||!text(p.order.foodId,60)||!(/^[a-z0-9-]+$/).test(p.order.foodId)))return false;
  if(p.rewards!==undefined&&(!Array.isArray(p.rewards)||p.rewards.length>3||!p.rewards.every(o=>keys(o,['rank','name','chance','base','count'])&&int(o.rank,7)&&text(o.name,80)&&typeof o.chance==='number'&&o.chance>=0&&o.chance<=1&&int(o.base,1000000000)&&int(o.count,100))))return false;
  const e=p.entry;
  if(!keys(e,['selected','value','feedback','level','hintTargets'])||!target(e.selected)||!/^\d?$/.test(e.value)||!text(e.feedback)||!int(e.level,3)||!Array.isArray(e.hintTargets)||e.hintTargets.length>2||!e.hintTargets.every(t=>t!==null&&target(t)))return false;
  const c=p.calculator;
  if(!keys(c,['mode','expression','display','carryEquation','golden','manual','offered','multiplier','tray','status','placementError','generate','active','guide']))return false;
  if(c.mode==='sum'||c.mode==='complete')return Object.keys(c).length===1;
  if(c.mode!=='fact'||!text(c.expression,20)||!/^\d{1,2}$|^[?—]$/.test(c.display)||!text(c.carryEquation,32)||!text(c.status)||!int(c.multiplier,15)||c.multiplier<1||!['golden','manual','offered','placementError','generate','active','guide'].every(k=>typeof c[k]==='boolean'))return false;
  if(c.tray===null)return true;
  const t=c.tray;
  return keys(t,['waiting','armed','label','digits','selected','demo','demoDigit'])&&int(t.waiting,9)&&typeof t.armed==='boolean'&&['Add the waiting carry','Place the digits'].includes(t.label)&&[null,'ones','tens'].includes(t.selected)&&typeof t.demo==='boolean'&&/^\d?$/.test(t.demoDigit)&&Array.isArray(t.digits)&&t.digits.length<=2&&t.digits.every(d=>keys(d,['part','value'])&&['ones','tens'].includes(d.part)&&int(d.value,9))&&new Set(t.digits.map(d=>d.part)).size===t.digits.length;
 }
 function validSnapshot(data){return keys(data,['schema','state','presentation'])&&validState(data.state)&&(data.schema===1?!('presentation'in data):data.schema===2&&validPresentation(data.presentation))}
 function snapshot(session,presentation){
  if(!session?.state)return null;
  const state={};for(const key of [...fields,...connectionFields])if(session.state[key]!==undefined)state[key]=session.state[key];
  const data={schema:presentation?2:1,state:JSON.parse(JSON.stringify(state)),...(presentation?{presentation:JSON.parse(JSON.stringify(presentation))}:{})};return validSnapshot(data)?data:null;
 }
 function validMessage(h){
  if(h?.kind==='point'||h?.kind==='hint')return validCue(h);
  if(h?.kind==='resume')return keys(h,['kind','sessionId','previousSession'])&&validId(h.sessionId)&&validId(h.previousSession);
  if(!validId(h?.sessionId)||!validId(h?.streamId))return false;
  if(!Number.isSafeInteger(h.watchVersion)||h.watchVersion<1)return false;
  if(h.kind==='watch')return keys(h,['kind','sessionId','streamId','watchVersion','previousSession'])&&(!('previousSession'in h)||validId(h.previousSession));
  return h.kind==='worksheet'&&keys(h,['kind','sessionId','streamId','watchVersion','version','snapshot','cueToken'])&&(!('cueToken'in h)||typeof h.cueToken==='string'&&ID.test(h.cueToken))&&Number.isSafeInteger(h.version)&&h.version>0&&validSnapshot(h.snapshot);
 }
 class Observation{
  constructor(discovery,options={}){
   this.d=discovery;this.storage=options.storage;try{this.storage=this.storage||root.sessionStorage}catch(_){}
   this.recoveryKey=options.recoveryKey||(()=>null);
   this.activeId=null;this.streamId=null;this.version=0;this.received=0;this.watchVersion=0;this.latest=null;this.signature='';this.listeners=new Set();this.lastRequest=0;this.cueToken=null;this.cueExpires=0;this.cueTokens=new Map();this.suspended=false;this.connection=discovery.session;this.lastContact=0;
   discovery.observation=this;
   // Tab-local reservation metadata only. A learner must still own the exact
   // persisted worksheet attempt. Never restore remote math/actions or rewards.
   try{const saved=JSON.parse(this.storage?.getItem('panaderyaObserverV1')||'null');
    if(saved?.expires>this.now()&&saved.expires<=this.now()+15000&&saved.owner===discovery.profile.id&&ID.test(saved.connection)&&['Helper','Learner'].includes(saved.active?.role)&&['sessionId','requestId','otherId','otherSession'].every(k=>ID.test(saved.active[k]))&&['version','received','watchVersion'].every(k=>Number.isSafeInteger(saved[k])&&saved[k]>=0)&&(saved.active.role==='Helper'||saved.attempt&&saved.attempt===this.recoveryKey())){
     discovery.help.active={...saved.active,lostAt:saved.expires-15000};this.previousSession=saved.connection;this.restored=saved;
     discovery.peerSessions.set(saved.active.otherId,saved.active.otherSession);
    }
   }catch(_){}
   discovery.help.observe(()=>this.refresh());
  }
  now(){return this.d.help.clock()}
  persist(){const a=this.d.help.active;try{if(a)this.storage?.setItem('panaderyaObserverV1',JSON.stringify({owner:this.d.profile.id,connection:this.previousSession||this.d.session,active:a,attempt:a.role==='Learner'?this.recoveryKey():null,version:this.version,received:this.received,watchVersion:this.watchVersion,expires:a.lostAt?a.lostAt+15000:this.now()+15000}));else this.storage?.removeItem('panaderyaObserverV1')}catch(_){}}
  observe(fn){this.listeners.add(fn);fn(this);return ()=>this.listeners.delete(fn)}
  changed(){for(const fn of this.listeners)fn(this)}
  revoke(){this.cueToken=null;this.cueExpires=0;this.cueTokens.clear()}
  refresh(){
   const a=this.d.help.active,now=this.now();
   if(a?.sessionId!==this.activeId){this.activeId=a?.sessionId||null;this.streamId=null;this.latest=null;this.signature='';this.version=0;this.received=0;this.lastRequest=0;
    this.watchVersion=0;this.lastContact=now;this.suspended=false;this.revoke();
    if(this.restored){for(const k of ['version','received','watchVersion'])this[k]=this.restored[k];this.restored=null}
    else this.previousSession=null;
   }
   if(a&&this.connection!==this.d.session){this.previousSession=this.previousSession||this.connection;this.connection=this.d.session;this.d.help.reconnecting();return}
   this.connection=this.d.session;
   // Discovery alone is not proof that observation has synchronized. A new
   // stream rejects buffered snapshots from before this interruption.
   if(a?.lostAt&&!this.suspended){this.suspended=true;this.revoke();this.signature='';this.lastRequest=0;if(a.role==='Helper')this.streamId=null;}
   this.persist();
   if(!a||this.d.help.expired()){this.changed();return}
   if(!a.lostAt&&now-this.lastContact>9000){this.d.help.reconnecting();return}
   const online=this.d.running&&['connected','searching'].includes(this.d.status)&&this.d.peers.has(a.otherId);
   if(online&&now-this.lastRequest>=3000){
    if(a.role==='Helper'){
     if(!this.streamId)this.streamId=root.CoBakerCore.packet(this.d.profile,this.d.session,'hello').id;
     this.lastRequest=now;++this.watchVersion;this.persist();
     this.d.help.send(a.otherId,{kind:'watch',sessionId:a.sessionId,streamId:this.streamId,watchVersion:this.watchVersion,...(this.previousSession?{previousSession:this.previousSession}:{})});
    }else if(this.previousSession){this.lastRequest=now;this.d.help.send(a.otherId,{kind:'resume',sessionId:a.sessionId,previousSession:this.previousSession})}
   }
   this.changed();
  }
  publish(session){
   const a=this.d.help.active;
   if(!a||a.role!=='Learner'||a.lostAt||!this.streamId||!this.d.help.activeWorksheet()||this.d.peers.get(a.otherId)?.session!==a.otherSession)return false;
   const data=snapshot(session,this.presentation?.(session));if(!data)return false;
   const signature=JSON.stringify(data);if(signature===this.signature)return false;
   // Tokens identify a particular visual state, including calculator entry.
   // A point for a reused digit/column must never land on a later step.
   if(this.latest&&JSON.stringify(this.latest)!==signature)this.revoke();
   if(!this.cueToken)this.lease();
   ++this.version;this.persist();
   const ok=this.d.help.send(a.otherId,{kind:'worksheet',sessionId:a.sessionId,streamId:this.streamId,watchVersion:this.watchVersion,version:this.version,snapshot:data,...(this.cueToken?{cueToken:this.cueToken}:{})});
   if(ok){this.signature=signature;this.latest=data}return ok;
  }
  lease(){this.cueToken=root.CoBakerCore.packet(this.d.profile,this.d.session,'hello').id;this.cueExpires=this.now()+6500;
   for(const [token,lease]of this.cueTokens)if(lease.expires<=this.now())this.cueTokens.delete(token);
   this.cueTokens.set(this.cueToken,{expires:this.cueExpires,firstVersion:this.version+1});while(this.cueTokens.size>3)this.cueTokens.delete(this.cueTokens.keys().next().value);
  }
  receive(m){
   const a=this.d.help.active,h=m.help;
   if(!validMessage(h))return;
   if(['watch','resume'].includes(h.kind)&&(!a||a.sessionId!==h.sessionId)){
    this.d.help.send(m.player.id,{kind:'end',sessionId:h.sessionId});return;
   }
   if(!a||a.sessionId!==h.sessionId||a.otherId!==m.player.id||this.d.peers.get(a.otherId)?.session!==m.session)return;
   if(this.d.help.expired()){this.d.help.end();return}
   if(h.kind==='resume'&&a.role==='Helper'){
    if(m.session!==a.otherSession&&(!a.lostAt||h.previousSession!==a.otherSession))return;
    a.otherSession=m.session;this.d.help.reconnecting();this.lastRequest=0;this.refresh();return;
   }
   if(h.kind==='watch'&&a.role==='Learner'&&this.d.help.activeWorksheet()){
    if(h.watchVersion<=this.watchVersion||m.session!==a.otherSession&&(!a.lostAt||h.previousSession!==a.otherSession))return;
    a.otherSession=m.session;this.streamId=h.streamId;this.watchVersion=h.watchVersion;this.previousSession=null;this.lastContact=this.now();this.suspended=false;
    this.d.help.reconnected();this.lease();this.signature='';this.onSnapshot?.();this.persist();return;
   }
   if(h.kind==='worksheet'&&a.role==='Helper'&&m.session===a.otherSession&&h.streamId===this.streamId&&h.watchVersion===this.watchVersion&&h.version>this.received){this.previousSession=null;this.received=h.version;this.latest=h.snapshot;this.cueToken=h.cueToken||null;this.lastContact=this.now();this.suspended=false;this.d.help.reconnected();this.persist();this.changed()}
  }
 }
 // Ephemeral presentation messages only. No worksheet command or save access.
 class Guidance{
  constructor(d){this.d=d;d.guidance=this;this.listeners=new Set();this.key=null;this.sequence=0;this.received=0;this.sentAt={};this.acceptedAt={};d.help.observe(()=>this.refresh());d.observation?.observe(()=>this.refresh());}
  observe(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn)}
  emit(cue){for(const fn of this.listeners)fn(cue)}
  refresh(){const a=this.d.help.active,key=a&&!a.lostAt?`${a.sessionId}:${a.otherSession}:${this.d.observation?.streamId}`:null;if(key!==this.key){this.key=key;this.sequence=0;this.received=0;this.sentAt={};this.acceptedAt={};this.emit(null)}}
  send(kind,value){
   const d=this.d,a=d.help.active,o=d.observation,now=d.help.clock();
   if(!a||a.role!=='Helper'||a.lostAt||!o?.cueToken||!o.latest||d.peers.get(a.otherId)?.session!==a.otherSession||!['point','hint'].includes(kind))return false;
   if(kind==='point'?!targetExists(value,o.latest):typeof value!=='string'||!Object.hasOwn(hints,value))return false;
   if(now-(this.sentAt[kind]??-Infinity)<(kind==='hint'?2500:600))return false;
   const h={kind,sessionId:a.sessionId,streamId:o.streamId,recipientId:a.otherId,cueToken:o.cueToken,stateVersion:o.received,sequence:++this.sequence,...(kind==='point'?{target:value}:{hint:value})};
   if(!d.help.send(a.otherId,h))return false;
   this.sentAt[kind]=now;this.emit({...h,own:true});return true;
  }
  receive(m){
   const d=this.d,a=d.help.active,o=d.observation,h=m.help,now=d.help.clock();
   const lease=o?.cueTokens.get(h?.cueToken);
   if(!validCue(h)||!a||a.role!=='Learner'||a.lostAt||!d.help.activeWorksheet()||a.sessionId!==h.sessionId||a.otherId!==m.player.id||h.recipientId!==d.profile.id||a.otherSession!==m.session||d.peers.get(a.otherId)?.session!==m.session||h.streamId!==o?.streamId||!(lease?.expires>now)||h.stateVersion<lease.firstVersion||h.stateVersion>o.version||h.sequence<=this.received)return false;
   // Consume the sequence even when rate limited; it cannot be replayed later.
   this.received=h.sequence;
   if(now-(this.acceptedAt[h.kind]??-Infinity)<(h.kind==='hint'?2500:600))return false;
   if(h.kind==='point'&&(!targetExists(h.target,o.latest)||!this.targetVisible?.(h.target)))return false;
   this.acceptedAt[h.kind]=now;this.emit({...h,name:d.peers.get(a.otherId).name});return true;
  }
 }
 root.CoBakerWorksheet={snapshot,validState,validPresentation,validSnapshot,validMessage,validCue,validTarget,targetExists,hints,Observation,Guidance};
})(globalThis);
