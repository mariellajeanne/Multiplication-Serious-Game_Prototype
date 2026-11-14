// Production policy, deterministic seeds, and tunable command-line overrides.
// node tests/simulate-golden-challenges.mjs [--rate=.16] [--high=.12] [--out=output/golden-balance.json]
import vm from 'node:vm';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import assert from 'node:assert/strict';
const ctx=vm.createContext({Math});
for(const file of ['src/data/catalog.js','src/game/economy-balance.js','src/game/progression.js','src/game/golden-challenges.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx);
const {offer,options,empty,defaults}=vm.runInContext('({offer:goldenChallengeOffer,options:stepCoinOptions,empty:emptyFactProfile,defaults:GOLDEN_CHALLENGE_CONFIG})',ctx);
const args=Object.fromEntries(process.argv.slice(2).map(arg=>arg.replace(/^--/,'').split('=')));
const config={...defaults,...(args.rate?{offerRate:Number(args.rate)}:{}),...(args.high?{highMultiplierChance:Number(args.high)}:{})};
function random(seed){let value=seed;return ()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
// Exact model cases: 70% advertised, two 15% neighbors; existing denominations.
for(let rank=0;rank<8;rank++){
 const p=options(rank,config);assert.equal(p.length,3);assert.ok(Math.abs(p.reduce((s,o)=>s+o.chance,0)-1)<1e-12);
 assert.equal(p.find(o=>o.rank===rank).chance,.7);assert.ok(p.every(o=>o.base>0));
}
const scenarios=[];
const noChallenges={...config,offerRate:0,needWeight:0};
for(let i=0;i<1000;i++)assert.equal(offer(8,9,empty(),{seed:`baseline/${i}`,step:i},noChallenges).offered,false);
for(const [name,accuracy,deliberateMisses] of [['new learner',.55,0],['developing',.75,0],['fluent',.98,0],['struggling',.18,0],['intentional third-try answers',1,2]]){
 const totals=[];
 for(const seed of [17,91,4201]){
  const rng=random(seed),facts=new Map();let lastOffer=-100,offered=0,high=0,bonus=0,totalMult=0,max=0,ticketRemaining=0,ticketOffers=0,ticketCap=1;
  for(let step=0;step<20000;step++){
   if(!ticketRemaining){ticketRemaining=[2,4,6,9][Math.floor(rng()*4)];ticketCap=Math.max(1,Math.floor(ticketRemaining*config.maxTicketFraction));ticketOffers=0}
   ticketRemaining--;
   const a=Math.floor(rng()*10),b=Math.floor(rng()*10),key=[a,b].sort().join('x');
   if(!facts.has(key))facts.set(key,empty());const p=facts.get(key);
   const result=offer(a,b,p,{seed:`${seed}/${step}`,step,spaced:step-lastOffer>=config.minStepGap,withinCap:ticketOffers<ticketCap},config);
   assert.ok(result.multiplier>=2&&result.multiplier<=15);
   if(!result.offered)continue;
   lastOffer=step;p.lastOffer=step;ticketOffers++;assert.ok(ticketOffers<=ticketCap);offered++;high+=result.multiplier>=10?1:0;totalMult+=result.multiplier;max=Math.max(max,result.multiplier);
   let correct=false;
   for(let attempt=0;attempt<3;attempt++){
    correct=attempt>=deliberateMisses&&rng()<accuracy;p.attempts++;p[correct?'correct':'incorrect']++;
    p.recent.push(correct?1:0);p.recent=p.recent.slice(-config.recentWindow);p.lastPractice=step;
    if(correct){p.successByTry[attempt]++;p.consecutiveFailures=0;bonus+=result.multiplier-1;break}
   }
   if(!correct){p.failedChallenges++;p.consecutiveFailures++}
  }
  totals.push({seed,offerRate:offered/20000,meanMultiplier:totalMult/offered,highShare:high/offered,max,rewardRatio:1+bonus/20000});
 }
 const average=field=>totals.reduce((sum,r)=>sum+r[field],0)/totals.length;
 const row={name,offerRate:average('offerRate'),meanMultiplier:average('meanMultiplier'),highShare:average('highShare'),rewardRatio:average('rewardRatio'),seeds:totals};
 assert.ok(row.offerRate<.25);assert.ok(row.highShare<.15);assert.ok(row.rewardRatio<1.8,'Optional facts must not dominate ordinary procedural rewards');scenarios.push(row);
}
const repeated=empty();repeated.failedChallenges=8;repeated.consecutiveFailures=8;repeated.recent=[0,0,0];
for(let i=0;i<1000;i++)assert.ok(offer(8,9,repeated,{seed:`failure/${i}`,step:1000},config).multiplier<=config.repeatFailureCap);
const result={model:'production golden challenge policy v1',seeds:[17,91,4201],stepsPerSeed:20000,ticketStepCounts:[2,4,6,9],assumption:'Accept every offer; reward ratios measure expected base coins versus generating every answer, with the same coin rolls and Boost.',config,rounding:'Math.round(sum of base step rewards × frozen food-only Boost), once',scenarios};
if(args.out){mkdirSync(dirname(args.out),{recursive:true});writeFileSync(args.out,JSON.stringify(result,null,2)+'\n')}
console.table(scenarios.map(({seeds,...row})=>row));console.log('PASS: production gates, probability totals, multiplier bounds, repeat-failure cap and ordinary/adversarial reward ratios.');
