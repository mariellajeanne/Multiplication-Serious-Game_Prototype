import {progressionHarness} from './progression-harness.mjs';
import {writeFileSync} from 'node:fs';
const h=progressionHarness();
const report=h.json(`(()=>{
 const probabilities=[0,40,160,240].map(mastery=>({mastery,percent:ticketProbabilities(mastery).map(p=>+(p*100).toFixed(4))}));
 const scenarios=[{name:'early',mastery:0,tier:1,level:1,kitchen:0,bakery:1,foods:['pandesal']},{name:'middle',mastery:40,tier:3,level:3,kitchen:7,bakery:10,foods:['pandesal','pan-de-coco','ensaymada','mamon','buko-pie']},{name:'late',mastery:160,tier:5,level:5,kitchen:17,bakery:25,foods:['mamon','buko-pie','brazo','butter-mamon','celebration-ensaymada','ube-ensaymada']}];
 const economy=scenarios.map(s=>{
  g=fresh();g.mastery=s.mastery;g.completed=200;g.bakeryLevel=s.bakery;g.equipment=Object.fromEntries(KITCHEN.map(k=>[k.id,s.kitchen]));
  g.owned=s.foods.map((id,i)=>({id,uid:i+1,fusion:s.tier,level:s.level,spent:0}));g.activeMenu=g.owned.map(o=>o.uid);g.menuSlots=g.owned.length;
  const unit=earningUnit(),rates={secondsPerOrder:90,activePerSecond:unit/90,staffPerSecond:staffRate(),ratio:unit/90/staffRate()};
  const prices={foodLevelOrders:s.level<5?foodLevelCost(g.owned[0])/unit:null,fusionFeeOrders:s.tier<5?fusionFee(g.owned[0])/unit:null,kitchenOrders:equipmentCost(KITCHEN[0])/unit,bakeryOrders:bakeryUpgradeCost()/unit};
  // Purchase a sequence using earned coins, updating subsequent costs and payouts.
  let orders=0,earned=0;g.coins=0;let purchases=[];
  const buy=(kind,cost,apply)=>{const before=bakeryValue();let need=cost();while(g.coins<need){const payout=earningUnit();g.coins+=payout;earned+=payout;orders++;}g.coins-=need;apply();purchases.push({kind,cumulativeOrders:orders,cost:Math.round(need),nextOrder:Math.round(earningUnit()),gainPercent:+((bakeryValue()/before-1)*100).toFixed(3)})};
  if(s.level<5)buy('Food level',()=>foodLevelCost(g.owned[0]),()=>g.owned[0].level++);
  buy('Oven',()=>equipmentCost(KITCHEN[0]),()=>g.equipment.oven++);
  buy('Bakery',()=>bakeryUpgradeCost(),()=>g.bakeryLevel++);
  return {name:s.name,multiplier:+bakeryValue().toFixed(2),initialOrder:Math.round(unit),rates,prices,purchases};
 });
 g=fresh();g.completed=200;let bakeryOrders=0;for(let level=1;level<30;level++){g.bakeryLevel=level;bakeryOrders+=bakeryUpgradeCost()/economyUnit()}
 return {probabilities,economy,bakeryTrackEquivalentOrders:+bakeryOrders.toFixed(2),paceAssumption:'90 seconds per Normal ticket; not a timer or learner target'};
})()`);
const json=JSON.stringify(report,null,2)+'\n';
if(process.argv[2])writeFileSync(process.argv[2],json);else console.log(json);
