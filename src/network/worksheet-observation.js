/* Phases 3A/3B: bounded observation and ephemeral guidance; no game commands. */
(function(root){
 'use strict';
 const ID=/^[a-f0-9]{32}$/;
 const hints=Object.freeze({ones:'Check the ones column!',carry:"Don't forget the carry!",next:'Look at the next digit!',place:'Check where this number goes!',add:'Remember to add the rows!',retry:'Try that step again!'});
 const validTarget=t=>typeof t==='string'&&/^(?:(?:top|bottom|carry|sum):[0-6]|slot:[01]:[0-6]|calculator:(?:product|tray|ones|tens|carry)|control:(?:generate|undo|add|challenge))$/.test(t);
 function targetExists(t,data){
  if(!validTarget(t)||!validSnapshot(data))return false;
  const [kind,a,b]=t.split(':'),s=data.state,c=data.presentation?.calculator;
  if(kind==='top'||kind==='carry')return +a<s.A.length;
  if(kind==='bottom')return +a<s.B.length;
  if(kind==='sum')return s.complete&&s.B.length>1&&+a<s.cols;
  if(kind==='slot')return +a<s.B.length&&+b<s.cols&&(+a<=s.row||s.phase==='sum'||s.complete)&&(!s.complete||+a===0);
  if(kind==='calculator')return c?.mode==='fact'&&(a==='product'||!!c.tray&&(a==='tray'||a==='carry'&&c.tray.waiting>0||c.tray.digits.some(d=>d.part===a)));
  return a==='undo'||a==='add'&&s.phase==='sum'||a==='generate'&&!!c?.generate||a==='challenge'&&!!c?.offered;
 }
 function validCue(h){
  return keys(h,['kind','sessionId','streamId','recipientId','cueToken','sequence','target','hint'])&&
   ['sessionId','streamId','recipientId','cueToken'].every(k=>typeof h[k]==='string'&&ID.test(h[k]))&&Number.isSafeInteger(h.sequence)&&h.sequence>0&&
   (h.kind==='point'?!('hint'in h)&&validTarget(h.target):h.kind==='hint'&&!('target'in h)&&typeof h.hint==='string'&&Object.hasOwn(hints,h.hint));
 }
 const fields=['a','b','A','B','cols','row','k','first','phase','revealed','raw','mixed','incoming','onesPlaced','tensPlaced','tensLocation','chosen','carrySlots','rows','sum','sumCol','sumCarry','done','boxes','complete','carryArmed'];
 const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const keys=(v,list)=>object(v)&&Object.keys(v).every(k=>list.includes(k));
 const int=(v,max)=>Number.isInteger(v)&&v>=0&&v<=max;
 const digits=(v,max=6)=>object(v)&&Object.keys(v).length<=max+1&&Object.entries(v).every(([k,n])=>/^[0-6]$/.test(k)&&int(n,9));
 function validState(s){
  if(!keys(s,fields)||fields.some(k=>!(k in s)))return false;
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
  if(!keys(p,['calculator','phase','tutorial','guideLevel','entry'])||!['connect','calculate','carry','place','add','complete'].includes(p.phase)||typeof p.tutorial!=='boolean'||!int(p.guideLevel,2))return false;
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
  const state={};for(const key of fields)state[key]=session.state[key];
  const data={schema:presentation?2:1,state:JSON.parse(JSON.stringify(state)),...(presentation?{presentation:JSON.parse(JSON.stringify(presentation))}:{})};return validSnapshot(data)?data:null;
 }
 function validMessage(h){
  if(h?.kind==='point'||h?.kind==='hint')return validCue(h);
  if(!ID.test(h?.sessionId)||!ID.test(h?.streamId))return false;
  if(h.kind==='watch')return keys(h,['kind','sessionId','streamId','previousSession'])&&(!('previousSession'in h)||ID.test(h.previousSession));
  return h.kind==='worksheet'&&keys(h,['kind','sessionId','streamId','version','snapshot','cueToken'])&&(!('cueToken'in h)||typeof h.cueToken==='string'&&ID.test(h.cueToken))&&Number.isSafeInteger(h.version)&&h.version>0&&validSnapshot(h.snapshot);
 }
 class Observation{
  constructor(discovery){
   this.d=discovery;this.activeId=null;this.streamId=null;this.version=0;this.received=0;this.latest=null;this.signature='';this.listeners=new Set();this.lastRequest=0;this.cueToken=null;this.cueExpires=0;this.cueTokens=new Map();
   discovery.observation=this;
   // Tab-local, short-lived reservation only; never write the bakery save.
   try{const saved=JSON.parse(root.sessionStorage?.getItem('panaderyaObserverV1')||'null');
    if(saved?.expires>Date.now()&&saved.expires<=Date.now()+15000&&saved.owner===discovery.profile.id&&ID.test(saved.connection)&&saved.active?.role==='Helper'&&['sessionId','requestId','otherId','otherSession'].every(k=>ID.test(saved.active[k]))){discovery.help.active={...saved.active,lostAt:discovery.help.clock()};this.previousSession=saved.connection;}
   }catch(_){}
   discovery.help.observe(()=>this.refresh());
  }
  observe(fn){this.listeners.add(fn);fn(this);return ()=>this.listeners.delete(fn)}
  changed(){for(const fn of this.listeners)fn(this)}
  refresh(){
   const a=this.d.help.active;
   try{if(a?.role==='Helper')root.sessionStorage?.setItem('panaderyaObserverV1',JSON.stringify({owner:this.d.profile.id,connection:this.previousSession||this.d.session,active:a,expires:Date.now()+15000}));else root.sessionStorage?.removeItem('panaderyaObserverV1')}catch(_){}
   if(a?.sessionId!==this.activeId){this.activeId=a?.sessionId||null;this.streamId=null;this.latest=null;this.signature='';this.version=0;this.received=0;this.lastRequest=0;
    this.cueToken=null;this.cueExpires=0;this.cueTokens.clear();
    if(a?.role==='Helper')this.streamId=root.CoBakerCore.packet(this.d.profile,this.d.session,'hello').id;
   }
   if(a?.lostAt){this.cueToken=null;this.cueExpires=0;this.cueTokens.clear();}
   if(a?.role==='Helper'&&!a.lostAt&&this.d.peers.has(a.otherId)&&(!this.latest||Date.now()-this.lastRequest>3000)){
    this.lastRequest=Date.now();this.d.help.send(a.otherId,{kind:'watch',sessionId:a.sessionId,streamId:this.streamId,...(this.previousSession?{previousSession:this.previousSession}:{})});
   }
   this.changed();
  }
  publish(session){
   const a=this.d.help.active;
   if(!a||a.role!=='Learner'||a.lostAt||!this.streamId||!this.d.help.activeWorksheet()||this.d.peers.get(a.otherId)?.session!==a.otherSession)return false;
   const data=snapshot(session,this.presentation?.(session));if(!data)return false;
   const signature=JSON.stringify(data);if(signature===this.signature)return false;
   const ok=this.d.help.send(a.otherId,{kind:'worksheet',sessionId:a.sessionId,streamId:this.streamId,version:++this.version,snapshot:data,...(this.cueToken?{cueToken:this.cueToken}:{})});
   if(ok){this.signature=signature;this.latest=data}return ok;
  }
  receive(m){
   const a=this.d.help.active,h=m.help;
   if(validMessage(h)&&h.kind==='watch'&&(!a||a.sessionId!==h.sessionId)){
    this.d.help.send(m.player.id,{kind:'end',sessionId:h.sessionId});return;
   }
   if(a?.role==='Learner'&&h.kind==='watch'&&validMessage(h)&&a.sessionId===h.sessionId&&a.otherId===m.player.id&&h.previousSession===a.otherSession&&this.d.peers.get(a.otherId)?.session===m.session&&a.lostAt&&this.d.help.clock()-a.lostAt<15000){
    a.otherSession=m.session;a.lostAt=0;this.streamId=null;this.signature='';this.d.help.changed();
   }
   if(!a||!validMessage(h)||a.sessionId!==h.sessionId||a.otherId!==m.player.id||a.otherSession!==m.session||this.d.peers.get(a.otherId)?.session!==m.session||a.lostAt)return;
   if(h.kind==='watch'&&a.role==='Learner'&&this.d.help.activeWorksheet()){
    // Each request is a fresh snapshot. Versions never decrease within a stream.
    if(this.streamId!==h.streamId){if(this.streamId)return;this.streamId=h.streamId;}
    this.cueToken=root.CoBakerCore.packet(this.d.profile,this.d.session,'hello').id;this.cueExpires=this.d.help.clock()+6500;
    // Briefly overlapping leases let a cue already in flight survive a watch
    // refresh. Never extend an older lease; disconnect revokes all of them.
    for(const [token,expires]of this.cueTokens)if(expires<=this.d.help.clock())this.cueTokens.delete(token);
    this.cueTokens.set(this.cueToken,this.cueExpires);while(this.cueTokens.size>3)this.cueTokens.delete(this.cueTokens.keys().next().value);
    this.signature='';this.onSnapshot?.();return;
   }
   if(h.kind==='worksheet'&&a.role==='Helper'&&h.streamId===this.streamId&&h.version>this.received){this.previousSession=null;this.received=h.version;this.latest=h.snapshot;this.cueToken=h.cueToken||null;this.changed()}
  }
 }
 // Ephemeral presentation messages only. No worksheet command or save access.
 class Guidance{
  constructor(d){this.d=d;d.guidance=this;this.listeners=new Set();this.key=null;this.sequence=0;this.received=0;this.sentAt={};this.acceptedAt={};d.help.observe(()=>this.refresh());}
  observe(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn)}
  emit(cue){for(const fn of this.listeners)fn(cue)}
  refresh(){const a=this.d.help.active,key=a&&!a.lostAt?`${a.sessionId}:${a.otherSession}`:null;if(key!==this.key){this.key=key;this.sequence=0;this.received=0;this.sentAt={};this.acceptedAt={};this.emit(null)}}
  send(kind,value){
   const d=this.d,a=d.help.active,o=d.observation,now=d.help.clock();
   if(!a||a.role!=='Helper'||a.lostAt||!o?.cueToken||!o.latest||d.peers.get(a.otherId)?.session!==a.otherSession||!['point','hint'].includes(kind))return false;
   if(kind==='point'?!targetExists(value,o.latest):typeof value!=='string'||!Object.hasOwn(hints,value))return false;
   if(now-(this.sentAt[kind]??-Infinity)<(kind==='hint'?2500:600))return false;
   const h={kind,sessionId:a.sessionId,streamId:o.streamId,recipientId:a.otherId,cueToken:o.cueToken,sequence:++this.sequence,...(kind==='point'?{target:value}:{hint:value})};
   if(!d.help.send(a.otherId,h))return false;
   this.sentAt[kind]=now;this.emit({...h,own:true});return true;
  }
  receive(m){
   const d=this.d,a=d.help.active,o=d.observation,h=m.help,now=d.help.clock();
   if(!validCue(h)||!a||a.role!=='Learner'||a.lostAt||!d.help.activeWorksheet()||a.sessionId!==h.sessionId||a.otherId!==m.player.id||h.recipientId!==d.profile.id||a.otherSession!==m.session||d.peers.get(a.otherId)?.session!==m.session||h.streamId!==o?.streamId||!(o.cueTokens.get(h.cueToken)>now)||h.sequence<=this.received)return false;
   // Consume the sequence even when rate limited; it cannot be replayed later.
   this.received=h.sequence;
   if(now-(this.acceptedAt[h.kind]??-Infinity)<(h.kind==='hint'?2500:600))return false;
   if(h.kind==='point'&&(!targetExists(h.target,o.latest)||!this.targetVisible?.(h.target)))return false;
   this.acceptedAt[h.kind]=now;this.emit({...h,name:d.peers.get(a.otherId).name});return true;
  }
 }
 root.CoBakerWorksheet={snapshot,validState,validPresentation,validSnapshot,validMessage,validCue,validTarget,targetExists,hints,Observation,Guidance};
})(globalThis);
