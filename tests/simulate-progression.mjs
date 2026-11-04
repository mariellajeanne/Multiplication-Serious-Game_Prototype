// Usage: node tests/simulate-progression.mjs [output.json] [configuration.json]
import {progressionHarness} from './progression-harness.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const configPath=process.argv[3]?resolve(process.argv[3]):fileURLToPath(new URL('./game-design-current.json',import.meta.url));
let config=JSON.parse(readFileSync(configPath,'utf8'));
if(config.extends)config={...JSON.parse(readFileSync(resolve(dirname(configPath),config.extends),'utf8')),...config};
if(!config.horizons){config.horizons=[config.orders];config.variants=[{name:'runtime'}];config.policies=config.policies.map(p=>p==='mixed'?'balanced':p)}
assert.ok(config.trials>0&&config.trials<=10000&&config.horizons.every(n=>n>0&&n<=10000));
const h=progressionHarness();h.c.window={addEventListener(){}};
h.run(readFileSync(new URL('../src/game/worksheet-bridge.js',import.meta.url),'utf8'));
h.run(readFileSync(new URL('./progression-model.js',import.meta.url),'utf8'));
// Omit storage serialization and presentation work; production transactions still run.
h.run('save=()=>{reconcileAutoEquip();return true};coinFly=()=>{};graduateGuideAfterOrder=()=>{};renderOrderRewards=()=>""');
h.c.simulationConfig=config;
const reports=[];
const runtime=h.json('({name:"runtime",power:{base:BAKERY_POWER_CONFIG.priceOrders,growth:BAKERY_POWER_CONFIG.priceGrowth,exponent:BAKERY_POWER_CONFIG.priceExponent??1.15},packageBase:PACKAGE_SHOP[0].priceOrders,packageFactor:PACKAGE_SHOP[1].priceOrders/PACKAGE_SHOP[0].priceOrders})');
for(const specified of config.variants){const variant=specified.name==='runtime'?runtime:specified;h.c.simulationVariant=variant;reports.push(h.json('simulateDesign(simulationConfig,simulationVariant)'));console.error(`Completed ${variant.name}`)}
const report={modelVersion:3,seed:config.seed,trials:config.trials,horizons:config.horizons,scenarios:config.scenarios,variants:reports,
 modelChanges:['Production worksheet action ledger, Package Luck/reset, guaranteed floors and atomic claim','Actual five-ticket board with policy-specific selection','All four kitchen tools, ingredient fusion and highest unlocked package purchases','25/50/100/200 checkpoints, affordability and purchase-gap distributions'],
 assumptions:['Normal mode only; no prediction of real session duration','One purchase decision per completed order; strongest menu equipped','Collector saves for highest unlocked package; balanced buys it every third order when affordable','Younger chooses random useful affordable purchases and random tickets','No staff, selling or paid refresh in core traces; these optional systems retain their runtime rules','Middle and late are independent snapshots, not progression-time claims','firstPurchase above its horizon is a censored sentinel, not an observed purchase','Power-only policy stops purchasing at the Power cap; its maxDry includes that intentional tail'],
 validation:['Production action validation and transactions used directly','Per-order nonnegative coins/stock, unique foods, slot cap and coin conservation','Paired deterministic seeds for every variant'],
 probabilities:h.json('({tickets:[0,40,160].map(mastery=>({mastery,odds:ticketProbabilities(mastery)})),packages:PACKAGE_TYPES.map((name,i)=>({name,odds:packageProbabilities(i)}))})')};
for(const row of [...report.probabilities.tickets,...report.probabilities.packages])assert.ok(Math.abs(row.odds.reduce((a,b)=>a+b,0)-1)<1e-12);
const output=JSON.stringify(report,null,2)+'\n';if(process.argv[2])writeFileSync(process.argv[2],output);else console.log(output);
