import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,initial,clone} from './helper-rewards-harness.mjs';

const earned=h=>h.a.json('Object.values(g.coBakerRewards.outbox).filter(e=>e.earned)');
const received=h=>h.b.json('Object.values(g.coBakerRewards.receivedRewards||{})');
const balance=h=>h.b.run('g.coins');
const deliver=(from,to,help)=>to.d.receive({kind:'message',message:{...from.c.CoBakerCore.packet(from.d.profile,from.d.session,'help'),help:clone(help)}});

test('matching verified action earns and delivers immediately before completion or claim',()=>{
 const h=setup(),before=h.b.json('g');h.contribute();assert.equal(earned(h).length,1);assert.equal(received(h).length,1);
 const entry=earned(h)[0];assert.equal(entry.coins,h.a.c.CoBakerRewards.reward(entry.message.base,1));assert.equal(balance(h),250+entry.coins);assert.equal(entry.acknowledged,true);
 assert.equal(h.a.run('g.run.procedureComplete'),false);assert.equal(h.a.run('Object.keys(g.claimedOrders).length'),0);
 for(const key of ['mastery','permanentLuck','completed','mathPractice','owned','packages','run'])assert.deepEqual(h.b.json('g.'+key),before[key]);
});

test('delivered suggestion survives helper refresh before the learner action',()=>{
 const h=setup();h.cue();h.b.d.stop();h.flush();const helper=h.join(2,true);h.flush();h.a.action(0,0,'connect');h.flush();
 assert.equal(earned(h).length,1);assert.ok(helper.run('g.coins')>250);assert.equal(helper.run('Object.keys(g.coBakerRewards.receivedRewards).length'),1);
});

test('closed helper rejoins as ordinary participant after an action and collects once',()=>{
 const h=setup();h.cue();h.b.d.stop();h.flush();h.advance(3600000);assert.equal(h.a.d.help.active,null);
 h.a.action(0,0,'connect');h.flush();assert.equal(earned(h).length,1);assert.equal(balance(h),250);
 const helper=h.join(2,true);h.flush();h.advance();assert.ok(helper.run('g.coins')>250);assert.equal(helper.d.help.active,null);
 const coins=helper.run('g.coins');helper.d.stop();h.flush();const again=h.join(2,true);h.flush();h.advance();assert.equal(again.run('g.coins'),coins);
});

test('session termination/expiry revokes new cues but preserves already delivered suggestions indefinitely',()=>{
 for(const end of ['end','expiry']){const h=setup();h.cue();if(end==='end'){h.a.d.help.end();h.flush()}else {h.b.d.stop();h.flush();h.advance(86400000)}
  assert.equal(h.b.guidance.send('hint','next'),false);h.a.action(0,0,'connect');h.flush();assert.equal(earned(h).length,1);
 }
});

test('learner abandonment and Save & Exit retain both pending suggestions and earned receipts',()=>{
 for(const beforeAction of [false,true]){const h=setup();h.cue();h.b.d.stop();h.flush();if(beforeAction)h.a.c.abandonTicket();
  h.a.action(0,0,'connect');h.flush();h.a.c.abandonTicket();h.flush();assert.equal(h.a.run('g.run.paused'),true);assert.equal(earned(h).length,1);
  h.a.d.stop();h.flush();const learner=h.join(1,true);h.flush();const helper=h.join(2,true);h.flush();h.advance();assert.equal(learner.d.help.active,null);assert.equal(helper.d.help.active,null);assert.ok(helper.run('g.coins')>250);
 }
});

test('learner refresh preserves a delivered suggestion before the matching action',()=>{
 const h=setup();h.cue();h.a.d.stop();h.flush();const learner=h.join(1,true);h.flush();h.advance(16000);learner.action(0,0,'connect');h.flush();assert.ok(balance(h)>250);
});

test('both participants restart with saved suggestions/receipts; reconciliation needs no help reservation',()=>{
 const h=setup();h.cue();h.b.d.stop();h.a.d.stop();h.flush();h.advance(60000);const learner=h.join(1,true);h.flush();learner.action(0,0,'connect');h.flush();
 learner.d.stop();h.flush();const again=h.join(1,true),helper=h.join(2,true);h.flush();h.advance();assert.ok(helper.run('g.coins')>250);assert.equal(helper.d.help.active,null);assert.equal(again.run('Object.values(g.coBakerRewards.outbox)[0].acknowledged'),true);
});

test('accepting, unreceived cues, irrelevant cues and no action yield no reward',()=>{
 const h=setup();h.cue('hint','carry');h.cue('point','top:1');h.a.action(0,0,'connect');h.flush();assert.equal(earned(h).length,0);assert.equal(balance(h),250);
 const lost=setup();assert.ok(lost.b.guidance.send('hint','next'));lost.queue.length=0;lost.a.action(0,0,'connect');lost.flush();assert.equal(earned(lost).length,0);
 const idle=setup();for(let i=0;i<8;i++)idle.cue();idle.advance(86400000);assert.equal(earned(idle).length,0);assert.equal(balance(idle),250);
});

test('unrelated actions, invalid/foreign frames, stale attempts and forged engine events cannot qualify',()=>{
 const h=setup();h.cue();h.a.action(0,1,'connect');h.a.action(0,0,'connect',false);h.flush();assert.equal(earned(h).length,0);
 const data={source:'pq-worksheet',type:'state',attemptId:'stale',actions:[{id:'stale/0/0/connect',row:0,col:0,kind:'connect'}]};
 for(const [source,origin]of [[h.b.frame.contentWindow,'http://local'],[h.a.frame.contentWindow,'http://foreign'],[h.a.frame.contentWindow,'http://local']])h.a.c.handleWorksheetMessage({source,origin,data});
 assert.equal(balance(h),250);
});

test('a delivered suggestion cannot target a new order or a different attempt',()=>{
 const h=setup();h.cue();h.a.run('g.run.ticket.id=99');h.a.action(0,0,'connect');h.flush();assert.equal(earned(h).length,0);
 const other=setup();other.cue();other.a.c.ensureWorksheetRewards(other.a.run('g.run'),true);other.a.session().attemptId=other.a.run('g.run.worksheetRewards.attemptId');other.a.action(0,0,'connect');other.flush();assert.equal(earned(other).length,0);
});

test('already accepted actions cannot be credited retroactively',()=>{
 const h=setup();h.a.session().actions.push({id:h.a.run('g.run.worksheetRewards.attemptId')+'/0/0/connect',row:0,col:0,kind:'connect'});h.cue();h.a.action(0,0,'connect');h.flush();assert.equal(earned(h).length,0);
});

test('spam, Undo, repeated actions and replacement reservations retain one semantic receipt',()=>{
 const h=setup();h.contribute();const coins=balance(h);for(let i=0;i<5;i++){h.a.state(initial);h.cue();h.a.action(0,0,'connect');h.flush()}
 h.a.d.help.end();h.flush();h.reserve();h.a.state(initial);h.cue();h.a.action(0,0,'connect');h.flush();assert.equal(balance(h),coins);assert.equal(earned(h).length,1);
});

test('abandon/restart, retry and legacy run recreation cannot reset the per-order action budget',()=>{
 for(const legacy of [false,true]){const h=setup({legacy});h.contribute();const coins=balance(h);
  h.a.d.help.end();h.flush();h.a.run('const ticket=g.run.ticket;delete g.orderRuns[ticket.id];g.run=null;startTicket(ticket.id)');
  h.a.session().attemptId=h.a.run('g.run.worksheetRewards.attemptId');h.a.session().actions=[];h.a.state(initial);h.reserve();h.cue();h.a.action(0,0,'connect');h.flush();assert.equal(balance(h),coins);assert.equal(earned(h).length,1);
 }
});

test('normal board refresh cannot discard started orders to farm their first assisted action',()=>{
 const h=setup();h.contribute();const ids=h.a.json('g.board.map(t=>t.id)');
 for(const id of ids)h.a.run(`startTicket(${id});g.run.paused=true;save()`);
 h.a.run('g.orderRefreshAt=0');assert.equal(h.a.c.refreshOrders(),false);assert.deepEqual(h.a.json('g.board.map(t=>t.id)'),ids);assert.equal(earned(h).length,1);
});

test('completed/claimed order and a failed claim do not revoke or duplicate already earned rewards',()=>{
 const h=setup();h.cue();h.b.d.stop();h.flush();h.a.action(0,0,'connect');h.flush();h.a.complete();h.a.fail(true);assert.equal(h.a.claim(),false);h.a.fail(false);assert.ok(h.a.claim());assert.equal(h.a.run('g.run'),null);
 const helper=h.join(2,true);h.flush();h.advance();assert.ok(helper.run('g.coins')>250);assert.equal(helper.run('Object.keys(g.coBakerRewards.receivedRewards).length'),1);
});

test('multiple offline receipts deliver exactly once after ordinary reconnection and coordinator failover',()=>{
 const h=setup(),send=h.a.d.transport.send;h.a.d.transport.send=(to,m)=>{if(m.help?.kind!=='reward-earned')send(to,m)};
 h.contribute();h.contribute(0,0,'reveal','retry');h.contribute(0,0,'place-ones','ones');assert.equal(balance(h),250);assert.equal(earned(h).length,3);
 h.b.d.stop();h.flush();h.other.d.stop();h.flush();h.advance(16000);h.a.d.stop();h.flush();const learner=h.join(1,true);h.flush();const helper=h.join(2,true);h.flush();h.advance();
 assert.equal(helper.run('g.coins'),250+Math.round(earned(h)[0].message.base*.03));assert.equal(helper.run('Object.keys(g.coBakerRewards.receivedRewards).length'),3);assert.equal(learner.d.help.active,null);
});

test('old earned rewards deliver during a replacement helper session without restoring old access',()=>{
 const h=setup();h.cue();h.b.d.stop();h.flush();h.advance(16000);h.a.action(0,0,'connect');h.flush();h.reserve(h.other);const session=h.a.d.help.active.sessionId;
 const helper=h.join(2,true);h.flush();h.advance();assert.ok(helper.run('g.coins')>250);assert.equal(helper.d.help.active,null);assert.equal(helper.o.latest,null);assert.equal(helper.guidance.send('hint','next'),false);assert.equal(h.a.d.help.active.sessionId,session);
});

test('global five-action cap and cumulative rounding survive replacement helpers and early payments',()=>{
 const h=setup();h.contribute();h.contribute(0,0,'reveal','retry');h.contribute(0,0,'place-ones','ones');h.a.d.help.end();h.flush();h.reserve(h.other);
 h.contribute(0,0,'carry-up','carry',h.other);h.contribute(0,1,'connect','next',h.other);h.contribute(0,1,'reveal','retry',h.other);
 assert.equal(earned(h).length,5);const base=earned(h)[0].message.base;assert.equal(balance(h)+h.other.run('g.coins')-500,Math.round(base*.05));
 assert.equal(h.a.run('g.completed'),0);assert.equal(h.a.run('g.mastery'),0);
});

test('numeric sweep: immediate rounded deltas sum to 1% per action, 5% cap, no minimum or split inflation',()=>{
 const api=setup().a.c.CoBakerRewards;
 for(let base=0;base<=10000;base++){let paid=0;for(let n=1;n<=8;n++){paid+=api.actionReward(base,n);assert.equal(paid,Math.round(base*Math.min(n,5)/100));assert.ok(api.actionReward(base,n)>=0)}}
 assert.equal(api.actionReward(49,1),0);assert.equal(api.actionReward(150,1)+api.actionReward(150,2)+api.actionReward(150,3)+api.actionReward(150,4)+api.actionReward(150,5),8);
});

test('frozen base quote excludes Boost/Golden and never changes after later order outcomes',()=>{
 const h=setup(),quote=h.a.run('orderCoinQuote(g.run.ticket,1)');h.a.run('g.run.bakersBoost=999;g.run.factAnswers["0:0"]={status:"success",multiplier:15}');h.contribute();const coins=balance(h);
 assert.equal(earned(h)[0].message.base,quote);assert.equal(coins,250+Math.round(quote*.01));h.a.complete();assert.ok(h.a.claim());h.advance();assert.equal(balance(h),coins);
});

test('duplicate packets, new receipt IDs for old actions, out-of-order delivery and acknowledgement loss are safe',()=>{
 const h=setup();h.contribute();h.contribute(0,0,'reveal','retry');const entries=earned(h),coins=balance(h);
 for(const e of entries.reverse())for(let i=0;i<3;i++)deliver(h.a,h.b,e.message);h.flush();assert.equal(balance(h),coins);
 const forged=clone(entries[0].message);forged.id='f'.repeat(32);deliver(h.a,h.b,forged);h.flush();assert.equal(balance(h),coins);
 h.a.run('for(const e of Object.values(g.coBakerRewards.outbox))e.acknowledged=false;save()');h.advance();assert.equal(balance(h),coins);assert.ok(earned(h).every(e=>e.acknowledged));
});

test('failed suggestion save cannot authorize a reward; failed earning save can retry once',()=>{
 const h=setup();h.a.fail(true);h.cue();h.a.fail(false);h.a.action(0,0,'connect');h.flush();assert.equal(earned(h).length,0);
 const retry=setup();retry.cue();retry.a.fail(true);retry.a.action(0,0,'connect');retry.flush();assert.equal(earned(retry).length,0);retry.a.fail(false);retry.a.action(0,0,'connect');retry.flush();assert.equal(earned(retry).length,1);assert.ok(balance(retry)>250);
});

test('failed recipient coin write rolls back coins/receipt and sends no acknowledgement',()=>{
 const h=setup();h.cue();h.b.fail(true);h.a.action(0,0,'connect');h.flush();assert.equal(balance(h),250);assert.equal(earned(h)[0].acknowledged,false);
 h.b.fail(false);h.advance();const coins=balance(h);assert.ok(coins>250);h.advance();assert.equal(balance(h),coins);
});

test('forged receipts without sent-cue witnesses, wrong base/sender or impossible action proof pay nothing',()=>{
 const h=setup();h.cue();h.a.action(0,0,'connect');h.queue.length=0;const m=earned(h)[0].message;
 deliver(h.other,h.b,m);deliver(h.a,h.b,{...m,base:999999});deliver(h.a,h.b,{...m,contextId:'f'.repeat(32)});const fake=clone(m);fake.credit.sequence+=999;deliver(h.a,h.b,fake);
 const wrong=clone(m);wrong.proof.state.phase='select';deliver(h.a,h.b,wrong);assert.equal(balance(h),250);deliver(h.a,h.b,m);h.flush();assert.ok(balance(h)>250);
});

test('receipt serialization order and stale-tab balance protection remain correct',()=>{
 const h=setup(),old=h.b.json('g');h.cue();h.a.action(0,0,'connect');h.queue.length=0;const m=earned(h)[0].message;m.credit=Object.fromEntries(Object.entries(m.credit).reverse());deliver(h.a,h.b,m);h.flush();assert.ok(balance(h)>250);
 const saved=h.b.store.get('panaderyaQuestV2');h.b.c.old=old;h.b.run('g=old');assert.equal(h.b.c.save(),false);assert.equal(h.b.store.get('panaderyaQuestV2'),saved);
});

test('v1 verified unsettled contributions migrate to earned receipts without completion',()=>{
 const h=setup();h.cue();const order=h.a.run('g.run.coBakerRewards'),p=order.suggestions['0:0:connect'];
 h.a.run('g.run.worksheetRewards.actions[g.run.worksheetRewards.attemptId+"/0/0/connect"]=true');order.credits[p.credit.step]=p.helperId;order.helpers[p.helperId].credits=[clone(p.credit)];
 h.a.run('g.coBakerRewards.version=1;delete g.coBakerRewards.orders;delete g.coBakerRewards.receivedRewards;save()');h.a.d.stop();h.flush();h.join(1,true);h.flush();h.advance();assert.ok(balance(h)>250);assert.equal(received(h).length,1);
});

test('already-paid v1 combined receipts are acknowledged without a second migration payment',()=>{
 const h=setup();h.cue();const order=h.a.run('g.run.coBakerRewards'),p=order.suggestions['0:0:connect'];
 order.credits[p.credit.step]=p.helperId;order.helpers[p.helperId].credits=[clone(p.credit)];
 const inbox=h.b.run('Object.values(g.coBakerRewards.inbox)[0]');inbox.received=true;inbox.credits=[clone(p.credit)];h.b.run('g.coins+=17;save()');
 h.a.run('g.coBakerRewards.version=1;delete g.coBakerRewards.orders;delete g.coBakerRewards.receivedRewards;save()');h.a.d.stop();h.flush();const learner=h.join(1,true);h.flush();h.advance();assert.equal(balance(h),267);assert.ok(learner.run('Object.values(g.coBakerRewards.outbox)[0].acknowledged'));
});

test('delivered-suggestion acknowledgement pins its witness against later hint spam',()=>{
 const h=setup();h.cue();const p=h.a.run('Object.values(g.coBakerRewards.orders)[0].suggestions["0:0:connect"]');
 for(let i=0;i<135;i++)h.cue();h.b.d.stop();h.flush();h.advance(86400000);h.a.action(0,0,'connect');h.flush();const helper=h.join(2,true);h.flush();h.advance();assert.ok(helper.run('g.coins')>250);assert.equal(earned(h)[0].message.credit.sequence,p.credit.sequence);
});

test('reward schema rejects arbitrary coins, invalid ordinals, unknown fields and malformed IDs',()=>{
 const h=setup();h.contribute();const api=h.a.c.CoBakerRewards,m=earned(h)[0].message;assert.ok(api.validMessage(m));
 for(const change of [{ordinal:0},{ordinal:6},{coins:99},{base:'100'},{contextId:[]},{proof:{}}])assert.equal(api.validMessage({...m,...change}),false);
});
