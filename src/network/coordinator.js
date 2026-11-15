/* Transport-independent, advisory leadership. Never authorizes game/save commands. */
(function(root){
 'use strict';
 const HEARTBEAT=3000,SUSPECT=6500,TIMEOUT=10000,GATHER=2500,PROBE_TTL=4500;
 const same=(a,b)=>!!a&&!!b&&a.id===b.id&&a.session===b.session&&a.term===b.term;
 const wins=(a,b)=>!b||a.term>b.term||a.term===b.term&&(a.id<b.id||a.id===b.id&&a.session<b.session);
 class Coordinator{
  constructor(discovery){this.d=discovery;this.active=false;this.term=0;this.floor=0;this.leader=null;this.pending=new Map();this.members=new Map();this.asked=new Map();this.lastTick=this.now()}
  now(){return this.d.now()}
  online(){if(this.active)return;this.active=true;this.resume()}
  offline(){this.active=false;this.leader=null;this.pending.clear();this.members.clear();this.asked.clear()}
  resume(){if(!this.active)return;this.leader=null;this.pending.clear();this.members.clear();this.asked.clear();this.lastTick=this.now();this.electAt=this.now()+GATHER;this.nextPoll=0;this.tick()}
  wake(){if(this.active&&this.now()-this.lastTick>SUSPECT)this.resume()}
  send(id,data){const m=root.CoBakerCore.packet(this.d.profile,this.d.session,'coord');m.coord=data;try{this.d.transport.send(id,m)}catch(_){}return m.id}
  probe(id){
   if(!this.active||!this.d.peers.has(id)||this.now()-(this.asked.get(id)??-Infinity)<1000)return;
   this.asked.set(id,this.now());
   // Install before sending: transports may deliver synchronously in tests.
   const m=root.CoBakerCore.packet(this.d.profile,this.d.session,'coord');m.coord={kind:'probe'};
   this.pending.set(m.id,{id,at:this.now()});
   try{this.d.transport.send(id,m)}catch(_){this.pending.delete(m.id)}
  }
  peer(id){this.probe(id)}
  left(id){this.members.delete(id);this.asked.delete(id);for(const [key,p]of this.pending)if(p.id===id)this.pending.delete(key);if(this.leader?.id===id)this.retire()}
  retire(){if(this.leader)this.floor=Math.max(this.floor,this.leader.term+1);this.term=Math.max(this.term,this.floor);this.leader=null;this.electAt=this.now()+GATHER;this.nextPoll=0}
  receive(m){
   if(!this.active)return;this.wake();const c=m.coord;
   if(c.kind==='probe'){
    this.send(m.player.id,{kind:'state',replyTo:m.id,term:this.term,leader:this.leader?{id:this.leader.id,session:this.leader.session,term:this.leader.term}:null});
    if(this.leader?.id===this.d.profile.id)this.probe(m.player.id);
    return;
   }
   if(c.kind==='notice'){this.probe(m.player.id);return}
   const request=this.pending.get(c.replyTo);
   if(!request||request.id!==m.player.id||this.now()-request.at>PROBE_TTL)return;
   this.pending.delete(c.replyTo);
   this.members.set(m.player.id,{session:m.session,at:this.now()});this.term=Math.max(this.term,c.term);
   // A peer may have retired our epoch just before a partition heals. Rejoin
   // discovery instead of indefinitely advertising a lease it must reject.
   if(this.leader&&c.term>this.leader.term)this.retire();
   const candidate=c.leader;
   if(!candidate)return;
   // Third-party reports help locate a coordinator but cannot renew its lease.
   if(candidate.id!==m.player.id||candidate.session!==m.session){this.probe(candidate.id);return}
   if(candidate.term<this.floor)return;
   if(same(candidate,this.leader)||wins(candidate,this.leader)){
    this.leader={...candidate,at:this.now()};this.term=Math.max(this.term,candidate.term);
   }
  }
  tick(){
   if(!this.active)return;this.wake();this.lastTick=this.now();
   for(const [id,p]of this.pending)if(this.now()-p.at>PROBE_TTL)this.pending.delete(id);
   if(this.leader&&this.leader.id!==this.d.profile.id&&this.now()-this.leader.at>=TIMEOUT)this.retire();
   if(this.now()>=this.nextPoll){
    this.nextPoll=this.now()+HEARTBEAT;
    if(this.leader?.id===this.d.profile.id){for(const id of this.d.peers.keys())this.send(id,{kind:'notice'})}
    else if(this.leader)this.probe(this.leader.id);
    else for(const id of this.d.peers.keys())this.probe(id);
   }
   if(!this.leader&&this.now()>=this.electAt){
    const candidates=[this.d.profile.id,...[...this.members].filter(([id,p])=>this.d.peers.has(id)&&this.now()-p.at<TIMEOUT).map(([id])=>id)].sort();
    if(candidates[0]===this.d.profile.id){
     this.term=Math.max(this.term,this.floor)+1;
     this.leader={id:this.d.profile.id,session:this.d.session,term:this.term,at:this.now()};this.nextPoll=0;
     for(const id of this.d.peers.keys())this.send(id,{kind:'notice'});
    }else this.electAt=this.now()+GATHER;
   }
  }
  snapshot(){
   const leader=this.leader,me=leader?.id===this.d.profile.id,age=leader&&!me?this.now()-leader.at:0;
   return {leader:leader?{...leader}:null,profile:leader?(me?this.d.profile:this.d.peers.get(leader.id)):null,
    role:!this.active?'Offline':!leader?'Pending':me?'Coordinator':'Participant',
    status:!this.active?'Transport unavailable':!leader?'Discovering / electing':age>=SUSPECT?'Heartbeat delayed':'Healthy',
    participants:this.active?this.d.peers.size+1:0,term:leader?.term??this.term,heartbeatAge:age};
  }
 }
 root.CoBakerCoordinator=Coordinator;
})(globalThis);
