/* Phase 4: peer receipts, never remote worksheet commands. Both sides retain
 * their own durable evidence. Accepted suggestions survive sessions; verified
 * actions atomically create outbox receipts, independently of order claims. */
(function(root){
 'use strict';
 const CONFIG=Object.freeze({stepPercent:1,capPercent:5,retryMs:3000});
 const ID=/^[a-f0-9]{32}$/;
 const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const keys=(v,list)=>object(v)&&Object.keys(v).length===list.length&&list.every(k=>Object.hasOwn(v,k));
 const id=v=>typeof v==='string'&&ID.test(v);
 const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
 const amount=v=>Number.isFinite(v)&&v>=0&&v<=Number.MAX_SAFE_INTEGER;
 const step=v=>typeof v==='string'&&/^(?:[01]:[0-4]:(?:connect|reveal|carry-down|carry-up|place-ones|place-tens)|complete)$/.test(v);
 const context=c=>(keys(c,['id','sessionId','orderId','a','b','tier','bases','legacy'])||keys(c,['id','sessionId','orderId','a','b','tier','bases','legacy','quote'])&&integer(c.quote,1,Number.MAX_SAFE_INTEGER))&&id(c.id)&&id(c.sessionId)&&integer(c.orderId,1,Number.MAX_SAFE_INTEGER)&&integer(c.a,1,99999)&&integer(c.b,1,99)&&integer(c.tier,0,7)&&Array.isArray(c.bases)&&c.bases.length>=1&&c.bases.length<=3&&c.bases.every(v=>amount(v)&&v>0)&&typeof c.legacy==='boolean';
 const credit=c=>keys(c,['step','sessionId','streamId','cueToken','sequence'])&&step(c.step)&&['sessionId','streamId','cueToken'].every(k=>id(c[k]))&&integer(c.sequence,1,Number.MAX_SAFE_INTEGER);
 const sameCredit=(a,b)=>!!a&&!!b&&['step','sessionId','streamId','cueToken','sequence'].every(k=>a[k]===b[k]);
 const shares=v=>Array.isArray(v)&&v.length>0&&v.length<=5&&v.every(s=>keys(s,['helperId','count'])&&id(s.helperId)&&integer(s.count,1,5))&&new Set(v.map(s=>s.helperId)).size===v.length&&v.reduce((n,s)=>n+s.count,0)<=CONFIG.capPercent/CONFIG.stepPercent;
 function validMessage(h){
  if(h?.kind==='reward-context')return keys(h,['kind','context'])&&context(h.context);
  if(h?.kind==='reward-credit'||h?.kind==='reward-suggested')return keys(h,['kind','id','credit'])&&id(h.id)&&credit(h.credit);
  if(h?.kind==='reward-ack')return keys(h,['kind','id'])&&id(h.id);
  if(h?.kind==='reward-earned')return keys(h,['kind','id','contextId','credit','base','ordinal','proof'])&&id(h.id)&&id(h.contextId)&&credit(h.credit)&&integer(h.base,1,Number.MAX_SAFE_INTEGER)&&integer(h.ordinal,1,CONFIG.capPercent/CONFIG.stepPercent)&&(h.proof===null||root.CoBakerWorksheet?.validSnapshot(h.proof));
  return h?.kind==='reward-settle'&&keys(h,['kind','id','credits','denominations','proof','shares'])&&id(h.id)&&Array.isArray(h.credits)&&h.credits.length>0&&h.credits.length<=CONFIG.capPercent/CONFIG.stepPercent&&h.credits.every(credit)&&new Set(h.credits.map(c=>c.step)).size===h.credits.length&&shares(h.shares)&&Array.isArray(h.denominations)&&h.denominations.length>=1&&h.denominations.length<=10&&h.denominations.every(amount)&&root.CoBakerWorksheet?.validSnapshot(h.proof);
 }
 const reward=(base,count)=>Math.round(base*Math.min(CONFIG.capPercent,Math.max(0,count)*CONFIG.stepPercent)/100);
 const actionReward=(base,ordinal)=>reward(base,ordinal)-reward(base,ordinal-1);
 // Round the whole order's helper budget once, then distribute its integer
 // coins by largest remainder. Splitting help among identities cannot turn
 // five 1.5-coin shares into ten coins from a rounded eight-coin budget.
 function allocatedReward(base,participants,helperId){
  const total=reward(base,participants.reduce((n,s)=>n+s.count,0));
  const parts=participants.map(s=>{const raw=base*s.count*CONFIG.stepPercent/100;return {...s,coins:Math.floor(raw),remainder:raw-Math.floor(raw)}});
  let left=total-parts.reduce((n,s)=>n+s.coins,0);
  parts.sort((a,b)=>b.remainder-a.remainder||(a.helperId<b.helperId?-1:a.helperId>b.helperId?1:0));
  for(const s of parts)if(left>0){s.coins++;left--}
  return parts.find(s=>s.helperId===helperId)?.coins??0;
 }
 const copy=v=>JSON.parse(JSON.stringify(v));
 // One cue identifies ONE action in the currently visible pair. Undo, optional
 // provisional placements, automatic combo sealing and calculator keystrokes
 // never qualify. A generic hint is useful only for the next procedural action.
 function nextAction(s){
  if(!s||s.complete)return null;
  if(s.phase==='sum')return 'complete';
  if(s.phase==='select')return 'connect';
  if(s.phase!=='product')return null;
  if(!s.revealed)return 'reveal';
  if(s.incoming&&!s.mixed)return 'carry-down';
  if(!s.onesPlaced)return 'place-ones';
  const tens=Math.floor((s.raw+s.incoming)/10);
  if(tens&&(!s.tensPlaced||s.tensLocation==='row'&&s.k<s.A.length-1))return s.k===s.A.length-1?'place-tens':'carry-up';
  return null;
 }
 function cueStep(h,data){
  const s=data?.state,kind=nextAction(s);if(!kind)return null;
  const cc=s.row+s.k;
  if(h.kind==='hint'){
   const allowed={ones:['place-ones'],carry:['carry-down','carry-up'],next:['connect'],place:['place-ones','place-tens','carry-up'],add:['complete'],retry:['connect','reveal','carry-down','place-ones','carry-up','place-tens','complete']};
   if(!allowed[h.hint]?.includes(kind))return null;
  }else if(h.kind==='point'){
   const targets={connect:[`top:${s.k}`,`bottom:${s.row}`],reveal:['calculator:product','control:generate'],
    'carry-down':[`carry:${s.k}`,'calculator:carry','calculator:tray'],
    'place-ones':[`slot:${s.row}:${cc}`,'calculator:ones'],
    'place-tens':[`slot:${s.row}:${cc+1}`,'calculator:tens'],
    'carry-up':[`carry:${s.k+1}`,'calculator:tens',...(s.tensLocation==='row'?[`slot:${s.row}:${cc+1}`]:[])],complete:['control:add']};
   if(!targets[kind]?.includes(h.target))return null;
  }else return null;
  return kind==='complete'?kind:`${s.row}:${s.k}:${kind}`;
 }
 const witnessKey=c=>`${c.sessionId}/${c.streamId}/${c.cueToken}/${c.sequence}`;
 function completed(proof,c){
  const s=proof?.state;if(!root.CoBakerWorksheet.validSnapshot(proof)||s.a!==c.a||s.b!==c.b||!s.complete||s.phase!=='complete'||s.done!==s.A.length*s.B.length)return false;
  const value=row=>Object.entries(row).reduce((n,[col,digit])=>n+digit*10**Number(col),0);
  // Read the engine's retained partial products, independent of its collapsed
  // final-answer presentation, and verify the resulting multiplication.
  if(s.rows.some((row,i)=>value(row)!==s.a*s.B[i]*10**i))return false;
  if(s.B.length>1&&value(s.sum)!==s.a*s.b)return false;
  if(s.B.length===1&&value(s.rows[0])!==s.a*s.b)return false;
  return true;
 }
 function verifiedStep(proof,key,c){
  if(!root.CoBakerWorksheet.validSnapshot(proof))return false;
  const s=proof.state;if(s.a!==c.a||s.b!==c.b)return false;
  if(key==='complete')return completed(proof,c);
  const [r,k,kind]=key.split(':'),row=+r,col=+k,index=row*s.A.length+col;
  if(row>=s.B.length||col>=s.A.length)return false;
  if(s.done>index)return true; // The engine sealed this pair before reporting.
  if(s.phase!=='product'||s.row!==row||s.k!==col)return false;
  if(kind==='connect')return true;
  const raw=s.A[col]*s.B[row],incoming=Math.floor((s.a%10**col)*s.B[row]/10**col),cc=row+col;
  if(!s.revealed||s.raw!==raw)return false;
  if(kind==='reveal')return true;
  if(kind==='carry-down')return incoming>0&&s.incoming===incoming&&s.mixed;
  if(kind==='place-ones')return s.onesPlaced&&s.rows[row][cc]===(raw+(s.mixed?incoming:0))%10;
  const tens=Math.floor((raw+incoming)/10);
  return kind==='place-tens'?col===s.A.length-1&&s.tensPlaced&&s.rows[row][cc+1]===tens:
   kind==='carry-up'&&col<s.A.length-1&&s.tensPlaced&&s.tensLocation==='carry'&&s.carrySlots[col+1]?.value===tens;
 }
 class Rewards{
  constructor(d,adapter){this.d=d;this.a=adapter;this.listeners=new Set();this.lastSend=-Infinity;this.savedContexts=new Set();this.needsSave=false;d.rewards=this;
   this.upgrade();
   d.guidance?.observe(cue=>{if(cue?.own)this.witness(cue);else if(cue)this.arm(cue)});
   d.help.observe(()=>{const key=d.help.active?`${d.help.active.sessionId}/${d.observation?.streamId}`:null;if(this.activeKey!==key){this.activeKey=key;this.lastSend=-Infinity}this.tick()});
  }
  observe(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn)}
  emit(event){for(const fn of this.listeners)fn(event)}
  ledger(){const s=this.a.state();return s.coBakerRewards||(s.coBakerRewards={version:2,inbox:{},outbox:{},orders:{},receivedRewards:{}})}
  upgrade(){
   const l=this.a.state().coBakerRewards;if(!l||l.version===2)return;
   l.version=2;l.orders=l.orders||{};l.receivedRewards=l.receivedRewards||{};this.needsSave=true;
   const runs=new Map(Object.values(this.a.state().orderRuns||{}).map(r=>[r.ticket.id,r]));if(this.a.run())runs.set(this.a.run().ticket.id,this.a.run());
   for(const r of runs.values()){
    const old=r.coBakerRewards;if(!old)continue;
    const order=this.runLedger(r);if(!order)continue;
    // Previously earned v1 credits must not be revoked by the new policy.
    for(const [helperId,e]of Object.entries(order.helpers))for(const c of e.credits){
     if(order.earned?.[c.step]||Object.values(l.outbox).some(x=>x.orderId===r.ticket.id&&!x.earned))continue;
     this.queueEarned(r,order,helperId,e.id,c,null);
    }
   }
  }
  active(role){const a=this.d.help.active;return a?.role===role&&!a.lostAt&&!this.d.help.expired()&&this.d.peers.get(a.otherId)?.session===a.otherSession?a:null}
  runLedger(r){
   const root=this.ledger();root.orders=root.orders||{};
   let l=root.orders[r.ticket.id];
   if(!l){l=r.coBakerRewards||{credits:{},helpers:{}};Object.assign(l,{a:r.ticket.a,b:r.ticket.b,base:this.a.quote(this.a.context(r,'0'.repeat(32),'0'.repeat(32))),suggestions:{},earned:{}});root.orders[r.ticket.id]=l}
   if(l.a!==r.ticket.a||l.b!==r.ticket.b)return null;
   r.coBakerRewards=l;return l;
  }
  contextFor(r,helper,sessionId){
   const l=this.runLedger(r);if(!l)return null;if(!l.helpers[helper])l.helpers[helper]={id:root.CoBakerCore.packet(this.d.profile,this.d.session,'hello').id,credits:[]};
   return {...this.a.context(r,l.helpers[helper].id,sessionId),quote:l.base};
  }
  tick(){
   const now=this.d.help.clock();if(now-this.lastSend<CONFIG.retryMs||!this.d.running)return;this.lastSend=now;
   if(this.needsSave){if(!this.a.save())return;this.needsSave=false}
   const a=this.active('Learner'),r=this.a.run();
   if(a&&r){const c=this.contextFor(r,a.otherId,a.sessionId);if(c&&(this.savedContexts.has(c.id)||this.a.save())){this.savedContexts.add(c.id);this.d.help.send(a.otherId,{kind:'reward-context',context:c})}}
   // Compatibility confirmations precede migrated per-action receipts.
   for(const order of Object.values(this.a.state().coBakerRewards?.orders||{}))for(const [helperId,e]of Object.entries(order.helpers))if(this.d.peers.has(helperId))for(const credit of e.credits)this.d.help.send(helperId,{kind:'reward-credit',id:e.id,credit});
   for(const order of Object.values(this.a.state().coBakerRewards?.orders||{}))for(const p of Object.values(order.suggestions))this.suggestionAck(p);
   // No dependence on coordinator or an active observation reservation. An
   // offline helper can return days later using its same persisted identity.
   for(const entry of Object.values(this.a.state().coBakerRewards?.outbox||{}))if(!entry.acknowledged&&this.d.peers.has(entry.helperId))this.d.help.send(entry.helperId,entry.message);
  }
  inboxFor(learner,sessionId){return Object.values(this.ledger().inbox).reverse().find(e=>e.learnerId===learner&&e.context.sessionId===sessionId&&!e.received)}
  witness(h){
   const a=this.active('Helper'),o=this.d.observation;if(!a||!o?.latest)return;
   const e=this.inboxFor(a.otherId,a.sessionId),s=cueStep(h,o.latest);
   if(!e||!s||o.latest.state.a!==e.context.a||o.latest.state.b!==e.context.b)return;
   const k=witnessKey(h);e.witnesses[k]={step:s,sessionId:h.sessionId,streamId:h.streamId,cueToken:h.cueToken,sequence:h.sequence};
   // Learner acknowledgements pin delivered suggestions indefinitely. Unreceived
   // spam is bounded and can never evict acknowledged or previously earned cues.
   for(const key of Object.keys(e.witnesses))if(Object.keys(e.witnesses).length>128&&key!==k&&!e.pinned?.[key]&&!e.credits.some(c=>witnessKey(c)===key))delete e.witnesses[key];
   this.a.save();
  }
  arm(h){
   const a=this.active('Learner'),r=this.a.run(),o=this.d.observation,session=this.a.session();
   // Guidance has already validated the live state-bound lease. Watch refreshes
   // can rotate a token without changing the state; retain that in-flight cue.
   if(!a||!r||!session||session.attemptId!==r.worksheetRewards?.attemptId||JSON.stringify(root.CoBakerWorksheet.snapshot(session)?.state)!==JSON.stringify(o.latest?.state))return;
   const s=cueStep(h,o.latest);if(!s)return;
   const l=this.runLedger(r);if(!l||l.credits[s]||Object.keys(l.credits).length>=CONFIG.capPercent/CONFIG.stepPercent)return;
   if(l.suggestions[s]?.attempt===session.attemptId){this.suggestionAck(l.suggestions[s]);return}
   const actionId=s==='complete'?`${session.attemptId}/complete`:`${session.attemptId}/${s.replaceAll(':','/')}`;
   if(r.worksheetRewards.actions[actionId]||(session.actions||[]).some(x=>x.id===actionId))return;
   const context=this.contextFor(r,a.otherId,a.sessionId);
   const previous=l.suggestions[s];l.suggestions[s]={helperId:a.otherId,attempt:session.attemptId,id:context.id,credit:{step:s,sessionId:a.sessionId,streamId:h.streamId,cueToken:h.cueToken,sequence:h.sequence}};
   if(!this.a.save()){if(previous)l.suggestions[s]=previous;else delete l.suggestions[s];return}
   this.suggestionAck(l.suggestions[s]);
  }
  suggestionAck(p){if(this.d.running&&this.d.peers.has(p.helperId))this.d.help.send(p.helperId,{kind:'reward-suggested',id:p.id,credit:p.credit})}
  accepted(r,action){
   const s=action.kind==='complete'?'complete':`${action.row}:${action.col}:${action.kind}`;
   const l=this.a.state().coBakerRewards?.orders?.[r.ticket.id],p=l?.suggestions?.[s];
   if(!p||r.worksheetRewards?.attemptId!==p.attempt||l.a!==r.ticket.a||l.b!==r.ticket.b||l.credits[s]||Object.keys(l.credits).length>=CONFIG.capPercent/CONFIG.stepPercent)return false;
   // Read the local engine directly as well as using the existing source/origin,
   // attempt and action-ledger validation in the shell. Network packets never
   // enter this path, nor can a fabricated shell event supply this evidence.
   const session=this.a.session();if(session?.attemptId!==p.attempt||!(action.kind==='complete'?session.state.complete:(session.actions||[]).some(x=>x.id===action.id&&x.kind===action.kind)))return false;
   const proof=root.CoBakerWorksheet.snapshot(session);if(!verifiedStep(proof,s,r.ticket))return false;
   const entry=this.queueEarned(r,l,p.helperId,p.id,p.credit,proof);
   delete l.suggestions[s];
   if(!this.a.save()){l.suggestions[s]=p;delete l.credits[s];delete l.earned[s];delete this.ledger().outbox[entry.message.id];return 'retry'}
   this.needsSave=false;
   this.deliver(entry);return true;
  }
  queueEarned(r,l,helperId,contextId,c,proof){
   const ordinal=Object.keys(l.earned).length+1,id=root.CoBakerCore.packet(this.d.profile,this.d.session,'hello').id;
   const message={kind:'reward-earned',id,contextId,credit:copy(c),base:l.base,ordinal,proof};
   l.credits[c.step]=helperId;l.earned[c.step]=id;
   const entry={helperId,orderId:r.ticket.id,earned:true,coins:actionReward(l.base,ordinal),message,acknowledged:false};this.ledger().outbox[id]=entry;return entry;
  }
  deliver(entry){if(this.d.running&&this.d.peers.has(entry.helperId))this.d.help.send(entry.helperId,entry.message)}
  confirm(e,c){
   const w=e.witnesses[witnessKey(c)];if(!sameCredit(w,c))return false;
   if(!e.credits.some(x=>x.step===c.step))e.credits.push(copy(c));return true;
  }
  receive(m){
   const h=m.help;if(!validMessage(h)||this.d.peers.get(m.player.id)?.session!==m.session)return false;
   const l=this.ledger();
   if(h.kind==='reward-context'){
    const a=this.active('Helper'),c=h.context;if(!a||a.otherId!==m.player.id||c.sessionId!==a.sessionId||!this.a.validContext(c))return false;
    const old=l.inbox[c.id];
    if(old){if(old.learnerId!==m.player.id||old.received||['orderId','a','b','tier','bases','legacy'].some(k=>JSON.stringify(old.context[k])!==JSON.stringify(c[k])))return false;if(old.context.sessionId===c.sessionId&&old.context.quote===c.quote)return true;old.context=copy(c)}
    else {if(Object.values(l.inbox).some(e=>e.learnerId===m.player.id&&e.context.orderId===c.orderId))return false;l.inbox[c.id]={learnerId:m.player.id,context:copy(c),witnesses:{},credits:[],received:false}}
    return this.a.save();
   }
   if(h.kind==='reward-ack'){
    const e=l.outbox[h.id];if(!e||e.helperId!==m.player.id||!e.earned&&!this.a.state().claimedOrders[e.orderId])return false;
    e.acknowledged=true;if(!this.a.save()){e.acknowledged=false;return false}return true;
   }
   if(h.kind==='reward-earned')return this.receiveEarned(m);
   const e=l.inbox[h.id];if(!e||e.learnerId!==m.player.id)return false;
   if(h.kind==='reward-suggested'){
    const k=witnessKey(h.credit);if(!sameCredit(e.witnesses[k],h.credit))return false;
    e.pinned=e.pinned||{};if(e.pinned[k])return true;e.pinned[k]=true;
    if(!this.a.save()){delete e.pinned[k];return false}return true;
   }
   if(h.kind==='reward-credit'){
    const count=e.credits.length;if(e.received||!this.confirm(e,h.credit))return false;
    if(e.credits.length===count)return true;
    if(!this.a.save()){e.credits.length=count;return false}
    if(e.credits.length>count)this.emit({kind:'contribution',count:e.credits.length});return true;
   }
   if(e.received){this.d.help.send(m.player.id,{kind:'reward-ack',id:h.id});return true}
   if(!completed(h.proof,e.context)||h.credits.some(c=>!sameCredit(e.witnesses[witnessKey(c)],c)))return false;
   const c=e.context,n=c.legacy?1:String(c.a).length*String(c.b).length;
   if(h.denominations.length!==n||h.denominations.some(v=>!c.bases.includes(v)))return false;
   if(h.shares.find(s=>s.helperId===this.d.profile.id)?.count!==h.credits.length)return false;
   const coins=allocatedReward(h.denominations.reduce((a,b)=>a+b,0),h.shares,this.d.profile.id);
   // The helper's own save commits balance + receipt in one localStorage write.
   // Stale-tab protection in save() prevents overwriting another tab's receipt.
   const state=this.a.state(),before=state.coins,oldCredits=e.credits,undo=this.a.creditCoins?.(coins);if(!undo)state.coins+=coins;e.received=true;e.coins=coins;e.credits=copy(h.credits);
   if(!this.a.save()){if(undo)undo();else state.coins=before;e.received=false;e.credits=oldCredits;delete e.coins;return false}
   this.emit({kind:'settled',coins});this.d.help.send(m.player.id,{kind:'reward-ack',id:h.id});return true;
  }
  receiveEarned(m){
   const h=m.help,l=this.ledger(),e=l.inbox[h.contextId];
   if(!e||e.learnerId!==m.player.id||!sameCredit(e.witnesses[witnessKey(h.credit)],h.credit)||h.base!==(e.context.quote??this.a.quote(e.context)))return false;
   if(h.proof===null?!e.credits.some(c=>sameCredit(c,h.credit)):!verifiedStep(h.proof,h.credit.step,e.context))return false;
   l.receivedRewards=l.receivedRewards||{};
   const old=l.receivedRewards[h.id];
   if(old){if(old.learnerId!==m.player.id||old.contextId!==h.contextId||old.step!==h.credit.step||old.ordinal!==h.ordinal||old.base!==h.base)return false;this.d.help.send(m.player.id,{kind:'reward-ack',id:h.id});return true}
   // A legacy combined receipt already paid this entire helper/order context.
   if(e.received){this.d.help.send(m.player.id,{kind:'reward-ack',id:h.id});return true}
   if(Object.values(l.receivedRewards).some(x=>x.learnerId===m.player.id&&x.orderId===e.context.orderId&&(x.step===h.credit.step||x.ordinal===h.ordinal)))return false;
   const state=this.a.state(),before=state.coins,coins=actionReward(h.base,h.ordinal);
   const undo=this.a.creditCoins?.(coins);if(!undo)state.coins+=coins;l.receivedRewards[h.id]={learnerId:m.player.id,contextId:h.contextId,orderId:e.context.orderId,step:h.credit.step,ordinal:h.ordinal,base:h.base,coins};
   if(!this.a.save()){if(undo)undo();else state.coins=before;delete l.receivedRewards[h.id];return false}
   this.emit({kind:'settled',coins});this.d.help.send(m.player.id,{kind:'reward-ack',id:h.id});return true;
  }
 }
 root.CoBakerRewards={CONFIG,validMessage,reward,actionReward,allocatedReward,cueStep,completed,verifiedStep,Rewards};
})(globalThis);
