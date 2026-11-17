/* Sparse Android radio adapter. Candidate metadata never creates a participant
 * or authorizes worksheet access. Existing protocol handles connected peers. */
(function(root){
 'use strict';
 class NearbyTransport{
  constructor(bridge,receive){this.bridge=bridge;this.receive=receive;this.label='Nearby Connections (Experimental)';this.sparse=true;this.maxLinks=3;this.waiting=new Map();this.connected=new Set();this.idle=new Map();this.generation=0;this.nextScan=0;this.nextReconcile=0;this.retry=new Map();this.receiptLeases=new Map();this.discovering=false}
  start(hello){this.generation++;this.localId=hello.player.id;this.nextScan=0;this.active=true;this.bridge.start(JSON.stringify(hello))}
  stop(){this.active=false;this.discovering=false;this.generation++;this.bridge.stop();this.connected.clear();this.idle.clear();this.receiptLeases.clear();for(const w of this.waiting.values()){clearTimeout(w.timer);w.resolve(false)}this.waiting.clear()}
  send(id,m){if(!this.connected.has(id))throw new Error('Baker is not connected');this.bridge.send(id,JSON.stringify(m))}
  scan(){if(this.active&&Date.now()>=this.nextScan){this.nextScan=Date.now()+12000;this.bridge.scan()}}
  setDiscovering(value){this.discovering=!!value;if(value){this.nextScan=0;this.scan()}else{this.nextScan=0;this.bridge.stopScan?.()}}
  connect(id,{priority=2}={}){if(this.connected.has(id))return Promise.resolve(true);if(this.waiting.has(id)){const w=this.waiting.get(id);w.priority=Math.min(w.priority,priority);return w.promise}if(!this.active||this.waiting.size>=8)return Promise.resolve(false);
   let resolve;const promise=new Promise(r=>resolve=r),timer=setTimeout(()=>this.cancelConnect(id),32000);this.waiting.set(id,{promise,resolve,timer,priority,started:false});
   // One radio/authentication setup at a time. Manual calls precede queued
   // automatic calls and receipt reconciliation; logical slots remain reserved.
   Promise.resolve().then(()=>this.pump());return promise;
  }
  pump(){if(!this.active||[...this.waiting.values()].some(w=>w.started)||this.connected.size>=this.maxLinks)return;const entry=[...this.waiting].sort((a,b)=>a[1].priority-b[1].priority)[0];if(!entry)return;entry[1].started=true;try{this.bridge.connect(entry[0])}catch(_){this.cancelConnect(entry[0])}}
  cancelConnect(id){const w=this.waiting.get(id);if(!w)return;clearTimeout(w.timer);this.waiting.delete(id);if(w.started)this.bridge.release?.(id);w.resolve(false);this.pump()}
  event(event){if(!this.active)return;
   if(event.kind==='message'&&root.CoBakerCore.validPacket(event.message)&&event.message.player.id!==this.localId){const id=event.message.player.id;this.connected.add(id);const w=this.waiting.get(id);if(w){clearTimeout(w.timer);this.waiting.delete(id);w.resolve(true)}}
   if(event.kind==='connection-failed')this.cancelConnect(event.playerId);
   if(event.kind==='status'&&event.status!=='searching'){this.connected.clear();for(const w of this.waiting.values()){clearTimeout(w.timer);w.resolve(false)}this.waiting.clear()}
   if(event.kind==='left'){this.connected.delete(event.playerId);this.idle.delete(event.playerId);this.receiptLeases.delete(event.playerId)}
   this.receive(event);this.pump();
  }
  availability(value){this.bridge.availability(value)}
  maintain(d){const h=d.help,retain=new Set();if(h?.active)retain.add(h.active.otherId);if(h?.accepting)retain.add(h.accepting.ownerId);for(const id of h?.calls?.keys()||h?.outgoing?.recipients||[])retain.add(id);for(const i of h?.incoming.values()||[])retain.add(i.ownerId);
   if(this.discovering)this.scan();
   const ledger=d.rewards?.a.state().coBakerRewards;
   const pending=[...new Set(Object.values(ledger?.outbox||{}).filter(e=>!e.acknowledged).map(e=>e.helperId))];
   if(pending.length&&Date.now()>=this.nextReconcile){this.nextReconcile=Date.now()+60000;this.scan();}
   for(const id of this.receiptLeases.keys())if(!pending.includes(id))this.receiptLeases.delete(id);
   for(const id of pending){if(this.connected.has(id)){if(!this.receiptLeases.has(id))this.receiptLeases.set(id,Date.now()+20000);if(Date.now()<this.receiptLeases.get(id))retain.add(id);}else if(!h?.calls?.size&&d.candidates.has(id)&&Date.now()>=(this.retry.get(id)||0)){this.retry.set(id,Date.now()+60000);this.connect(id)}}
   // Reconnect only an existing authorized session; never connect all candidates.
   if(h?.active?.lostAt){this.scan();if(d.candidates.has(h.active.otherId))this.connect(h.active.otherId,{priority:-1});}
   this.bridge.retain(JSON.stringify([...retain].slice(0,3)));
   // Small grace lets cancellation/ending and any in-flight receipt ACK drain.
   for(const id of this.connected){if(retain.has(id)){this.idle.delete(id);continue}if(!this.idle.has(id))this.idle.set(id,Date.now());else if(Date.now()-this.idle.get(id)>=1000){this.bridge.release?.(id);this.idle.delete(id)}}
   this.pump();
   while(this.retry.size>128)this.retry.delete(this.retry.keys().next().value);
  }
 }
 root.NearbyTransport=NearbyTransport;
})(globalThis);
