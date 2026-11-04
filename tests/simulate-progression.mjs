// node tests/simulate-progression.mjs [report.json] [config.json]
import vm from 'node:vm';
import {readFileSync,writeFileSync} from 'node:fs';
import {progressionHarness} from './progression-harness.mjs';
const config=JSON.parse(readFileSync(process.argv[3]||new URL('./progression-scenarios.json',import.meta.url),'utf8'));
const baseline=JSON.parse(readFileSync(new URL('./fixtures/economy-before.json',import.meta.url),'utf8'));
const engine=readFileSync(new URL('./economy-simulation-engine.js',import.meta.url),'utf8');
const rules=readFileSync(new URL('../src/game/economy-balance.js',import.meta.url),'utf8');
const reports=[];
for(const model of config.candidates){
 const h=progressionHarness();
 if(!h.run("typeof ECONOMY_BALANCE!=='undefined'"))vm.runInContext(rules,h.c);
 h.c.simulationConfig=config;h.c.simulationModel=model;h.c.baseline=baseline;
 h.run(`productionPricingMenuBase=pricingMenuBase;productionStaffRate=staffRate;Object.assign(BAKERY_POWER_CONFIG,baseline.bakery);baseline.shop.forEach((t,i)=>Object.assign(PACKAGE_SHOP[i],t));
  for(const [name,source] of Object.entries(baseline.functions))eval(name+' = ('+source+')');`);
 if(model.kind==='discount')h.run(`for(const name of ['slotCost','packagePrice','foodLevelCost','fusionFee','bakeryUpgradeCost']){
   const original=eval(name);globalThis['discount_'+name]=original;
   eval(name+' = (...args)=>Math.max(1,Math.round(discount_'+name+'(...args)*simulationModel.discount))');
  }`);
 if(model.kind==='balanced')h.run(`pricingMenuBase=productionPricingMenuBase;staffRate=productionStaffRate;Object.assign(ECONOMY_BALANCE,simulationConfig.defaults,simulationModel.parameters);
  Object.assign(BAKERY_POWER_CONFIG,{purchases:ECONOMY_BALANCE.bakeryCap,factor:ECONOMY_BALANCE.bakeryGain});
  PACKAGE_SHOP.forEach((t,i)=>Object.assign(t,{unlock:ECONOMY_BALANCE.unlocks[i],priceOrders:ECONOMY_BALANCE.packageOrders*ECONOMY_BALANCE.packageGrowth**i}));
  ticketBase=rank=>Math.round(ECONOMY_BALANCE.coinBase*ECONOMY_BALANCE.coinGrowth**clamp(rank,0,7));
  economyUnit=()=>balancedPriceUnit(pricingMenuBase(),g.bakeryLevel,g.completed);
  bakeryUpgradeCost=()=>balancedBakeryCost(pricingMenuBase(),g.bakeryLevel,g.completed);
  slotCost=()=>balancedSlotCost(pricingMenuBase(),g.bakeryLevel,g.menuSlots,g.completed);
  packagePrice=rank=>balancedPackagePrice(rank,pricingMenuBase(),g.bakeryLevel,g.completed);
  foodLevelCost=o=>balancedMasteryCost(tierBase(o),recipeMastery(o),g.bakeryLevel,g.completed);
  fusionFee=(o,other=null)=>balancedFusionFee(F(o.id).base,g.bakeryLevel,other?Math.max(foodTier(o),foodTier(other)):foodTier(o),g.completed);`);
 vm.runInContext(engine,h.c);
 const report=h.json('runEconomyTrials(simulationConfig,simulationModel)');reports.push(report);
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify({modelVersion:config.modelVersion,baselineRevision:baseline.revision,config,reports},null,2)+'\n');
 const rows=report.aggregate.filter(r=>r.policy==='balanced'&&r.luck==='normal'&&r.from);
 console.error(model.name,rows.map(r=>`${r.to}: ${r.actualUpgrades.mean.toFixed(2)} bought, ${r.affordableUpgrades.median} affordable, ${(r.doubleBakeryChance*100).toFixed(0)}% double, B${r.bakery.median}, ${r.discoveries.median} foods`).join(' | '));
}
const output=JSON.stringify({modelVersion:config.modelVersion,baselineRevision:baseline.revision,config,reports},null,2)+'\n';
if(process.argv[2])writeFileSync(process.argv[2],output);else console.log(output);
