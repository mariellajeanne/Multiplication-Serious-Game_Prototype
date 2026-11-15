/* Phase 3A: bounded semantic worksheet snapshots; no input commands or saves. */
(function(root){
 'use strict';
 const ID=/^[a-f0-9]{32}$/;
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
 function snapshot(session){
  if(!session?.state)return null;
  const state={};for(const key of fields)state[key]=session.state[key];
  const data={schema:1,state:JSON.parse(JSON.stringify(state))};return validState(data.state)?data:null;
 }
 function validMessage(h){
  if(!ID.test(h?.sessionId)||!ID.test(h?.streamId))return false;
  if(h.kind==='watch')return keys(h,['kind','sessionId','streamId','previousSession'])&&(!('previousSession'in h)||ID.test(h.previousSession));
  return h.kind==='worksheet'&&keys(h,['kind','sessionId','streamId','version','snapshot'])&&Number.isSafeInteger(h.version)&&h.version>0&&keys(h.snapshot,['schema','state'])&&h.snapshot.schema===1&&validState(h.snapshot.state);
 }
 class Observation{
  constructor(discovery){
   this.d=discovery;this.activeId=null;this.streamId=null;this.version=0;this.received=0;this.latest=null;this.signature='';this.listeners=new Set();this.lastRequest=0;
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
    if(a?.role==='Helper')this.streamId=root.CoBakerCore.packet(this.d.profile,this.d.session,'hello').id;
   }
   if(a?.role==='Helper'&&!a.lostAt&&this.d.peers.has(a.otherId)&&(!this.latest||Date.now()-this.lastRequest>3000)){
    this.lastRequest=Date.now();this.d.help.send(a.otherId,{kind:'watch',sessionId:a.sessionId,streamId:this.streamId,...(this.previousSession?{previousSession:this.previousSession}:{})});
   }
   this.changed();
  }
  publish(session){
   const a=this.d.help.active;
   if(!a||a.role!=='Learner'||a.lostAt||!this.streamId||!this.d.help.activeWorksheet()||this.d.peers.get(a.otherId)?.session!==a.otherSession)return false;
   const data=snapshot(session);if(!data)return false;
   const signature=JSON.stringify(data);if(signature===this.signature)return false;
   const ok=this.d.help.send(a.otherId,{kind:'worksheet',sessionId:a.sessionId,streamId:this.streamId,version:++this.version,snapshot:data});
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
    this.signature='';this.onSnapshot?.();return;
   }
   if(h.kind==='worksheet'&&a.role==='Helper'&&h.streamId===this.streamId&&h.version>this.received){this.previousSession=null;this.received=h.version;this.latest=h.snapshot;this.changed()}
  }
 }
 root.CoBakerWorksheet={snapshot,validState,validMessage,Observation};
})(globalThis);
