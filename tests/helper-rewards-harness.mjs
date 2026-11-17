import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';

const files=['src/data/catalog.js','src/game/economy-balance.js','src/game/progression.js','src/game/golden-challenges.js','src/game/state.js','src/game/rewards.js','src/game/progression-economy.js','src/game/economy.js','src/ui/bakery-art.js','src/game/worksheet-bridge.js','src/network/worksheet-observation.js','src/network/helper-rewards.js','src/network/co-baker.js','src/network/coordinator.js','src/network/help-requests.js'];
const sources=files.map(f=>readFileSync(new URL('../'+f,import.meta.url),'utf8'));
export const initial={a:79,b:18,A:[9,7],B:[8,1],cols:4,row:0,k:0,first:null,phase:'select',revealed:false,raw:0,mixed:false,incoming:0,onesPlaced:false,tensPlaced:false,tensLocation:null,chosen:null,carrySlots:{},rows:[{},{0:0}],sum:{},sumCol:0,sumCarry:0,done:0,boxes:0,complete:false,carryArmed:false};
export const final={...initial,phase:'complete',complete:true,done:4,k:2,row:1,rows:[{0:2,1:3,2:6},{0:0,1:9,2:7}],sum:{0:2,1:2,2:4,3:1}};
export const clone=v=>JSON.parse(JSON.stringify(v));
export function setup({legacy=false}={}){
 let now=Date.now();const queue=[],clients=new Map(),stores=new Map();
 const flush=()=>{let limit=5000;while(queue.length){assert.ok(--limit>0,'message loop');const [to,m]=queue.shift();clients.get(to)?.d.receive(clone(m))}};
 function join(n,restore=false){
  const store=stores.get(n)||new Map();stores.set(n,store);let h,fail=false;
  const frame={contentWindow:{postMessage(){}},style:{}},c=vm.createContext({crypto:webcrypto,console,Date,Math:Object.assign(Object.create(Math),{random:()=>.5}),location:{origin:'http://local'},document:{getElementById:id=>id==='worksheetFrame'?frame:null,querySelector:()=>null},setTimeout:()=>{},clearTimeout:()=>{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>{if(fail)throw Error('disk full');store.set(k,v)}}});
  c.window=c;c.addEventListener=()=>{};for(const source of sources)vm.runInContext(source,c);
  const run=code=>vm.runInContext(code,c),json=code=>clone(run(code));
  run('render=()=>{};toast=()=>{};showModal=()=>{};coinFly=()=>{};checkUnlocks=()=>{};if(!g.run){g.board=[{id:41,a:79,b:18,rarity:1,coinTier:1,base:ticketBase(1)}];startTicket(41)}');
  if(legacy&&!restore)run('delete g.run.stepCoins;g.run.baseCoins=g.run.ticket.base;save()');
  const profile={id:n.toString(16).padStart(32,'0'),name:'Baker',number:'0000'};
  const transport={start(hello){clients.set(profile.id,h);queue.push([profile.id,{kind:'status',status:'searching'}]);for(const peer of clients.values())if(peer!==h){queue.push([peer.d.profile.id,{kind:'message',message:hello}]);queue.push([profile.id,{kind:'message',message:peer.c.CoBakerCore.packet(peer.d.profile,peer.d.session,'hello')}])}},stop(){clients.delete(profile.id);for(const p of clients.values())queue.push([p.d.profile.id,{kind:'left',playerId:profile.id}])},send(to,m){queue.push([to,{kind:'message',message:m}])}};
  const d=new c.CoBakerCore.Discovery(profile,transport,()=>now);c.panaderyaCoBaker=d;d.help.clock=()=>now;d.help.worksheet=()=>!!run('g.run?.phase==="engine"&&!g.run.paused&&!g.run.procedureComplete');
  const o=new c.CoBakerWorksheet.Observation(d),guidance=new c.CoBakerWorksheet.Guidance(d);guidance.targetVisible=()=>true;
  let session={attemptId:run('g.run.worksheetRewards.attemptId'),state:clone(initial),actions:[]};
  frame.contentWindow.getWorksheetSession=()=>session;
  c.liveSession=()=>session;
  const adapter=run(`({state:()=>g,run:()=>g.run,save:()=>save(),session:()=>liveSession(),context:(r,id,sessionId)=>({id,sessionId,orderId:r.ticket.id,a:r.ticket.a,b:r.ticket.b,tier:ticketCoinTier(r.ticket),bases:usesStepCoins(r)?r.stepCoins.options.map(o=>o.base):[r.baseCoins],legacy:!usesStepCoins(r)}),quote:c=>c.legacy?c.bases[0]:orderCoinQuote({a:c.a,b:c.b,coinTier:c.tier},1),validContext:c=>c.legacy?c.bases.length===1&&c.bases[0]===ticketBase(c.tier):JSON.stringify(c.bases)===JSON.stringify(stepCoinOptions(c.tier).map(o=>o.base)),denominations:r=>usesStepCoins(r)?r.steps.map(s=>r.stepCoins.receipts[worksheetStepKey(s)].denomination):[r.baseCoins]})`);
  const rewards=new c.CoBakerRewards.Rewards(d,adapter),events=[];rewards.observe(e=>events.push(e));o.onSnapshot=()=>o.publish(session);
  h={c,d,o,guidance,rewards,events,run,json,frame,store,fail:v=>{fail=v},session:()=>session,
   state(s){session.state=clone(s);run('g.run').worksheetSession=session;o.publish(session)},
   action(row,col,kind,verified=true){const id=run(`worksheetActionId(g.run.worksheetRewards.attemptId,${row},${col},'${kind}')`),action={id,row,col,kind};if(verified){session.actions.push(action);const s=session.state,raw=s.A[col]*s.B[row],incoming=Math.floor((s.a%10**col)*s.B[row]/10**col),cc=row+col;s.row=row;s.k=col;s.phase='product';
    if(kind==='reveal'){s.raw=raw;s.revealed=true;s.incoming=incoming;s.mixed=!incoming}
    if(kind==='place-ones'){s.raw=raw;s.revealed=true;s.onesPlaced=true;s.rows[row][cc]=(raw+(s.mixed?incoming:0))%10}
    if(kind==='carry-down'){s.raw=raw;s.revealed=true;s.incoming=incoming;s.mixed=true}
    if(kind==='carry-up'){s.raw=raw;s.revealed=true;s.incoming=incoming;s.mixed=true;s.tensPlaced=true;s.tensLocation='carry';s.carrySlots[col+1]={value:Math.floor((raw+incoming)/10),provisional:false}}
    if(kind==='place-tens'){s.raw=raw;s.revealed=true;s.incoming=incoming;s.mixed=true;s.tensPlaced=true;s.rows[row][cc+1]=Math.floor((raw+incoming)/10)}
    if(kind==='combo')s.done=Math.max(s.done,row*s.A.length+col+1);
   }c.handleWorksheetMessage({source:frame.contentWindow,origin:'http://local',data:{source:'pq-worksheet',type:'state',attemptId:session.attemptId,actions:[action],errors:0,session}});return action},
   complete(){const r=run('g.run');for(const s of r.steps)for(const kind of run(`worksheetActionKinds(g.run.steps[${r.steps.indexOf(s)}])`))this.action(s.row,s.col,kind);this.state(final);c.handleWorksheetMessage({source:frame.contentWindow,origin:'http://local',data:{source:'pq-worksheet',type:'complete',attemptId:session.attemptId,actions:session.actions,ticket:r.ticket,top:79,bottom:18,complete:true,session}});r.settlement={};if(c.usesStepCoins(r))assert.equal(c.completeWorksheetProcedure(r),true);else assert.equal(r.phase,'claim')},
   claim(){return c.creditCompletedOrder()}
  };
  if(restore&&run('g.run.worksheetSession'))session=run('g.run.worksheetSession');d.start();return h;
 }
 const a=join(1),b=join(2),other=join(3);flush();
 function reserve(helper=b){const last=a.d.help.directTimes.get(helper.d.profile.id);if(last!==undefined)now=Math.max(now,last+30000);assert.equal(a.d.help.request([helper.d.profile.id]).ok,true);flush();helper.d.help.accept([...helper.d.help.incoming.keys()][0]);flush();a.rewards.lastSend=-Infinity;a.rewards.tick();flush();assert.ok(helper.d.help.active);assert.ok(helper.json('g.coBakerRewards?.inbox'))}
 reserve();
 function advance(ms=3100){now+=ms;for(const h of clients.values()){h.d.help.tick();h.o.lastContact=now;h.o.refresh();h.rewards.tick()}flush()}
 function cue(kind='hint',value='next',helper=b){advance();assert.ok(helper.guidance.send(kind,value));flush()}
 function contribute(row=0,col=0,kind='connect',hint='next',helper=b){const changes=kind==='connect'?{phase:'select'}:kind==='reveal'?{phase:'product',raw:72}:kind==='carry-down'?{phase:'product',raw:56,revealed:true,incoming:7,mixed:false}:kind==='place-ones'?{phase:'product',raw:72,revealed:true,mixed:true}:kind==='carry-up'?{phase:'product',raw:72,revealed:true,mixed:true,onesPlaced:true}:{phase:'sum'};a.state({...initial,...changes,row,k:col});flush();cue('hint',hint,helper);a.action(row,col,kind);flush()}
 return {a,b,other,queue,clients,flush,advance,cue,contribute,reserve,join,now:()=>now};
}

