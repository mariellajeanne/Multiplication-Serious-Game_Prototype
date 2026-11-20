// node tests/simulate-package-discovery.mjs [output.json] [scenario-config.json]
// Provisional pacing check: real prices/Boost/odds with expected current step
// payouts. Golden bonuses, staff and Co-Baker earnings are excluded, so actual
// learning/assistance rewards can shorten these predicted order counts.
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {progressionHarness} from './progression-harness.mjs';
const config=process.argv[3]?JSON.parse(readFileSync(process.argv[3],'utf8')):{
 seed:20261121,trials:12,checkpoints:[25,50,100,200],
 policies:{balanced:.3,mastery:.18,collector:.45},
 luck:['normal','unfavorable','favorable','coin_stack_only'],meaningfulGain:.001,secondsPerOrder:90
};
config.stepCoinRewards=true;
const h=progressionHarness();
for(const file of ['src/game/golden-challenges.js','tests/economy-simulation-engine.js'])vm.runInContext(readFileSync(file,'utf8'),h.c);
// Independent known case: 2x1 digit starter order, expected step values 130,
// 176, 237 at probabilities .7/.15/.15, and the starter 1.2 Boost.
assert.equal(h.run('orderCoinQuote({a:79,b:8,coinTier:0},1.2)'),367);
h.c.simulationConfig=config;
const report=h.json("runEconomyTrials(simulationConfig,{name:'package_discovery_coin_v1',version:1})");
const thresholds=h.json('PACKAGE_DISCOVERY_COINS');
assert.ok(thresholds.every((n,i)=>!i||n>thresholds[i-1]));
assert.ok(report.audit.timeline.every(row=>row.coins>=0&&Number.isFinite(row.boost)));
const rows=report.aggregate.filter(row=>row.kind==='unlock');
for(const row of rows)console.log(`${row.policy}/${row.luck}: median unlock orders ${row.acquisition.map(a=>a.orders?.median??'unreached').join(', ')}`);
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify({modelVersion:1,thresholds,config,report},null,2)+'\n');
