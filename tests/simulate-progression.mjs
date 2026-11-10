// Food-only production simulation. Historical Power reports remain archival evidence.
// node tests/simulate-progression.mjs [report.json] [config.json]
import vm from 'node:vm';
import {readFileSync,writeFileSync} from 'node:fs';
import {progressionHarness} from './progression-harness.mjs';
const config=JSON.parse(readFileSync(process.argv[3]||new URL('./hub-progression-scenarios.json',import.meta.url),'utf8'));
const h=progressionHarness();
vm.runInContext(readFileSync(new URL('./economy-simulation-engine.js',import.meta.url),'utf8'),h.c);
h.c.simulationConfig=config;
const report=h.json("runEconomyTrials(simulationConfig,{name:'food_only_hub'})");
const output=JSON.stringify({modelVersion:6,config,reports:[report]},null,2)+'\n';
if(process.argv[2])writeFileSync(process.argv[2],output);else console.log(output);
for(const row of report.aggregate.filter(r=>r.policy==='balanced'&&r.luck==='normal'&&r.from))
 console.error(`${row.from}-${row.to}: ${row.actualUpgrades.mean.toFixed(2)} purchases/order; ${row.discoveries.median} recipes; x${row.boost.median.toFixed(2)} Boost`);
