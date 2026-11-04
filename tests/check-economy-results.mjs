// Run after simulate-progression.mjs; checks design outcomes, not just numeric validity.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const data=JSON.parse(readFileSync(process.argv[2]||new URL('../docs/progression-simulation.json',import.meta.url),'utf8'));
const before=data.reports.find(r=>r.name==='before');
const after=data.reports.find(r=>r.name==='bakery_milestones');
assert.ok(before&&after,'Both historical baseline and selected model must finish.');
assert.ok(data.config.trials>=24,'Final validation needs at least 24 independent seeds.');
assert.equal(Object.keys(data.config.policies).length,3);
assert.equal(data.config.luck.length,4);
const row=(report,from,to,policy='balanced',luck='normal')=>report.aggregate.find(r=>r.policy===policy&&r.luck===luck&&r.from===from&&r.to===to);
const stages=[[1,25],[26,100],[101,200]];
const bands=[[2,4],[3,6],[5,12]];
const selected=stages.map(([from,to])=>row(after,from,to));
for(let i=0;i<stages.length;i++){
 const r=selected[i],old=row(before,...stages[i]);
 assert.ok(r.affordableUpgrades.median>=bands[i][0]&&r.affordableUpgrades.median<=bands[i][1]);
 assert.ok(r.actualUpgrades.mean>old.actualUpgrades.mean);
 if(i)assert.ok(r.actualUpgrades.mean>selected[i-1].actualUpgrades.mean);
 console.log(`${r.from}-${r.to}: purchases/order ${old.actualUpgrades.mean.toFixed(2)} -> ${r.actualUpgrades.mean.toFixed(2)}, median one-payout upgrades ${old.affordableUpgrades.median} -> ${r.affordableUpgrades.median}, double Bakery ${(100*old.doubleBakeryChance).toFixed(1)}% -> ${(100*r.doubleBakeryChance).toFixed(1)}%`);
}
assert.ok(selected[0].doubleBakeryChance>=.2&&selected[0].doubleBakeryChance<.85);
assert.ok(selected[1].doubleBakeryChance>selected[0].doubleBakeryChance);
assert.ok(selected[2].doubleBakeryChance>=selected[1].doubleBakeryChance);
for(const policy of Object.keys(data.config.policies))for(const luck of data.config.luck){
 for(const to of data.config.checkpoints){
  const r=after.aggregate.find(r=>r.policy===policy&&r.luck===luck&&r.to===to&&r.from);
  assert.ok(r,`Missing ${policy}/${luck}/${to}`);
  assert.equal(r.exhaustedOrders,0);assert.equal(r.loopLimitHits,0);
  assert.ok(r.stackWait.p90<=1,'A floor-tier order must cover the next ordinary upgrade.');
 }
 assert.ok(row(after,101,200,policy,luck).affordableUpgrades.median>=2);
}
assert.ok(after.worstDrought<=2);
const packages=after.aggregate.find(r=>r.policy==='balanced'&&r.luck==='normal'&&r.kind==='open');
assert.ok(packages.acquisition.every(r=>r.reached===1),'Every package milestone must be bought within the horizon.');
console.log('PASS: all strategies/luck bands retain meaningful progression; package milestones remain reachable.');
