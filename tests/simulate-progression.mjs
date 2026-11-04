// Conservative Normal-order model. Uses production formulas, not DOM code.
// Usage: node tests/simulate-progression.mjs [output.json] [scenarios.json]
import {progressionHarness} from './progression-harness.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const config=JSON.parse(readFileSync(process.argv[3]||new URL('./progression-scenarios.json',import.meta.url),'utf8'));
assert.ok(config.trials>0&&config.trials<=10000&&config.orders>0&&config.orders<=10000);
const h=progressionHarness();h.c.simulationConfig=config;
const report=h.json(`(()=>{
 const config=simulationConfig;
 const seedRandom=seed=>{let n=seed>>>0;return ()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296}};
 const initialize=scenario=>{
  g=fresh();g.completed=scenario.completed;g.mastery=scenario.mastery;g.bakeryLevel=scenario.bakery;g.menuSlots=scenario.slots;
  g.owned=scenario.foods.map((id,i)=>({id,uid:i+1,mastery:scenario.recipeMastery,level:Math.min(5,scenario.recipeMastery+1),fusion:scenario.tier,spent:0}));
  g.discovered=[...scenario.foods];g.uidNext=g.owned.length+1;g.activeMenu=bestMenu(g.owned,g.menuSlots,'final');
  g.recipeCeilings=Object.fromEntries(scenario.foods.map(id=>[id,scenario.recipeMastery+4]));if(scenario.name==='early')g.recipeCeilings.pandesal=0;
  g.economyPeakBase=pricingMenuBase();
 };
 const quotes=config.scenarios.map(s=>{
  initialize(s);const income=earningUnit(),o=g.owned.find(o=>g.activeMenu.includes(o.uid));
  return {scenario:s.name,expectedCoinsPerOrder:income,pricesInExpectedOrders:{nextMastery:foodLevelPrice(o)/income,nextBakery:bakeryUpgradeCost()/income,standardPackage:packagePrice(0)/income,nextSlot:g.menuSlots<FOOD.length?slotCost()/income:null},gainsPercent:{masteryOnSelectedFood:(masteryFactor(recipeMastery(o)+1)/masteryFactor(recipeMastery(o))-1)*100,bakery:(BAKERY_POWER_CONFIG.factor-1)*100},activeToHelperRatio:config.secondsPerOrder.map(seconds=>({secondsPerOrder:seconds,ratio:income/seconds/staffRate()}))};
 });
 const metrics=[];
 for(const scenario of config.scenarios)for(const policy of config.policies){
  const trials=[];
  for(let trial=0;trial<config.trials;trial++){
   Math.random=seedRandom(config.seed+trial);initialize(scenario);const startValue=bakeryValue();
   const purchases={slot:0,mastery:0,bakery:0,package:0};let firstPurchase=null;
   for(let order=1;order<=config.orders;order++){
    const ticket=makeTicket();g.coins+=Math.round(ticket.base*bakeryValue());
    // Only advertised minimum packages; additional per-pair chances are omitted.
    for(let n=0;n<ticket.packages;n++)discoverFood(drawFood(ticket.rarity));
    g.completed++;g.mastery++;g.permanentLuck=Math.floor(g.mastery/4);g.activeMenu=bestMenu(g.owned,g.menuSlots,'final');
    const candidates=[];const add=(kind,cost,apply,gain)=>{if(cost<=g.coins&&gain>0)candidates.push({kind,cost,apply,score:gain/cost})};
    if(g.menuSlots<FOOD.length){const next=bestMenu(g.owned,g.menuSlots+1,'final'),sum=g.owned.filter(o=>next.includes(o.uid)).reduce((n,o)=>n+individualValue(o),0);add('slot',slotCost(),()=>g.menuSlots++,sum/Math.max(1,foodSum())-1)}
    for(const o of g.owned.filter(o=>g.activeMenu.includes(o.uid)&&availableMastery(o)>0))add('mastery',foodLevelPrice(o),()=>{o.spent+=foodLevelPrice(o);o.mastery=recipeMastery(o)+1;o.level=Math.min(5,o.mastery+1)},foodValue(o)/Math.max(1,foodSum())*(masteryFactor(recipeMastery(o)+1)/masteryFactor(recipeMastery(o))-1));
    if(g.bakeryLevel<=BAKERY_POWER_CONFIG.purchases)add('bakery',bakeryUpgradeCost(),()=>g.bakeryLevel++,BAKERY_POWER_CONFIG.factor-1);
    candidates.sort((a,b)=>b.score-a.score);let choice=candidates[0];
    if((policy==='collector'||policy==='mixed'&&order%3===0)&&g.coins>=packagePrice(0))choice={kind:'package',cost:packagePrice(0),apply:()=>discoverFood(drawFood(0))};
    if(choice){g.coins-=choice.cost;choice.apply();purchases[choice.kind]++;firstPurchase??=order}
    g.activeMenu=bestMenu(g.owned,g.menuSlots,'final');g.economyPeakBase=pricingMenuBase();
    if(g.coins<0||new Set(g.owned.map(o=>o.id)).size!==g.owned.length||g.menuSlots>FOOD.length)throw Error('Economy invariant failed');
   }
   trials.push({firstPurchase,growth:bakeryValue()/startValue,discoveries:g.discovered.length,purchases});
  }
  const distribution=key=>{const a=trials.map(t=>t[key]).sort((a,b)=>a-b);return {p10:a[Math.floor(a.length*.1)],p50:a[Math.floor(a.length*.5)],p90:a[Math.floor(a.length*.9)]}};
  metrics.push({scenario:scenario.name,policy,trials:trials.length,firstPurchaseOrder:distribution('firstPurchase'),powerGrowth:distribution('growth'),discoveries:distribution('discoveries'),meanPurchases:Object.fromEntries(Object.keys(trials[0].purchases).map(k=>[k,trials.reduce((n,t)=>n+t.purchases[k],0)/trials.length]))});
 }
 return {modelVersion:config.modelVersion,seed:config.seed,trialCount:config.trials,orders:config.orders,configuration:{bakery:BAKERY_POWER_CONFIG,packageShop:PACKAGE_SHOP,masteryStep:MASTERY_STEP},quotes,metrics,probabilities:[0,40,160].map(mastery=>({mastery,tickets:ticketProbabilities(mastery)})),packageProbabilities:PACKAGE_TYPES.map((name,i)=>({name,foods:packageProbabilities(i)})),assumptions:['Normal orders only; no speed target','Strongest menu chosen after rewards; one purchase decision per order','Only advertised minimum free packages; additional action packages omitted','No helper income, sales, fusion, refresh spending or optional modes','Early starts with 250 coins; middle/late are independent snapshots'],modelValidation:['Production price/probability functions used directly','Each order checks nonnegative coins, unique recipes and Food Index slot cap','Policies compare marginal gain per coin and collection preferences']};
})()`);
for(const row of [...report.probabilities.map(p=>p.tickets),...report.packageProbabilities.map(p=>p.foods)])assert.ok(Math.abs(row.reduce((a,b)=>a+b,0)-1)<1e-12);
const output=JSON.stringify(report,null,2)+'\n';if(process.argv[2])writeFileSync(process.argv[2],output);else console.log(output);
