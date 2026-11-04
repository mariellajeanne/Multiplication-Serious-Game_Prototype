/* Runs in production's classic-script context. Multiple purchases; no DOM/saving. */
function runEconomyTrials(config,model){
 const rng=seed=>{let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}};
 const quantile=(v,p)=>{const a=[...v].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(a.length*p))]};
 const summarize=v=>({mean:v.reduce((a,b)=>a+b,0)/v.length,p10:quantile(v,.1),median:quantile(v,.5),p90:quantile(v,.9)});
 const originalTicketRarity=ticketRarity;
 const sync=()=>{g.activeMenu=bestMenu(g.owned,g.menuSlots,'final');g.economyPeakBase=pricingMenuBase()};
 function offers(){
  const menu=Math.max(1,foodSum()),result=[];
  const add=(kind,cost,gain,uid=null)=>{if(gain>=config.meaningfulGain&&Number.isFinite(cost)&&cost>0)result.push({kind,cost,gain,uid})};
  if(g.bakeryLevel<=BAKERY_POWER_CONFIG.purchases)add('bakery',bakeryUpgradeCost(),bakeryFactor(g.bakeryLevel+1)/decorBonus()-1);
  if(g.menuSlots<FOOD.length){const next=bestMenu(g.owned,g.menuSlots+1,'final'),sum=g.owned.filter(o=>next.includes(o.uid)).reduce((n,o)=>n+foodValue(o),0);add('slot',slotCost(),sum/menu-1)}
  for(const o of g.owned.filter(o=>g.activeMenu.includes(o.uid))){
   if(availableMastery(o)>0)add('mastery',foodLevelPrice(o),tierBase(o)*(masteryFactor(recipeMastery(o)+1)-masteryFactor(recipeMastery(o)))/menu,o.uid);
   if(g.completed>=5&&foodTier(o)<MAX_FOOD_TIER)add('fusion',fusionFee(o)+fusionIngredientCost(o),F(o.id).base*(TIER_FACTORS[foodTier(o)+1]-TIER_FACTORS[foodTier(o)])*masteryFactor(recipeMastery(o))/menu,o.uid);
  }
  return result;
 }
 function buy(o){
  g.coins-=o.cost;
  if(o.kind==='bakery'){g.bakeryLevel++;g.bakerySpent+=o.cost}
  else if(o.kind==='slot')g.menuSlots++;
  else{const food=g.owned.find(f=>f.uid===o.uid);food.spent+=o.cost;
   if(o.kind==='mastery'){food.mastery=recipeMastery(food)+1;food.level=Math.min(5,food.mastery+1)}
   else{for(const need of ingredientNeeds(food))g.ingredients[need.name]=Math.max(0,(g.ingredients[need.name]||0)-need.need);food.fusion++}
  }
  sync();
 }
 function purchaseUpgrades(policy,available){
  const counts={bakery:0,mastery:0,slot:0,fusion:0};let n=0,spent=0;
  while(n<256){
   const score=o=>o.gain/o.cost*(policy==='bakery'&&o.kind==='bakery'?3:policy==='collector'&&o.kind==='mastery'?1.4:1);
   const choice=offers().filter(o=>o.cost<=available()).sort((a,b)=>score(b)-score(a)||a.cost-b.cost)[0];
   if(!choice)break;spent+=choice.cost;buy(choice);counts[choice.kind]++;n++;
  }
  return {count:n,counts,spent,limitHit:n===256};
 }
 function affordable(reward){
  const original=g;g={...g,coins:reward,owned:g.owned.map(o=>({...o})),activeMenu:[...g.activeMenu],ingredients:{...g.ingredients}};
  const result=purchaseUpgrades('balanced',()=>g.coins);g=original;return result.count;
 }
 function doubleBakeryCost(){
  if(g.bakeryLevel+1>BAKERY_POWER_CONFIG.purchases)return Infinity;
  const a=bakeryUpgradeCost();g.bakeryLevel++;const b=bakeryUpgradeCost();g.bakeryLevel--;return a+b;
 }
 const runs=[];
 for(const [policy,share] of Object.entries(config.policies))for(const luck of config.luck)for(let trial=0;trial<config.trials;trial++){
  const orderRng=rng(config.seed+trial*101),foodRng=rng(config.seed+trial*101+700001),problemRng=rng(config.seed+trial*101+900001);
  Math.random=problemRng;
  ticketRarity=()=>{const u=orderRng(),r=luck==='unfavorable'?u*.4:luck==='favorable'?.6+u*.4:u;return luck==='coin_stack_only'?0:drawRank(ticketProbabilities(ticketLuckMastery()),r)};
  g=fresh();g.run=null;sync();refillBoard();
  let fund=0,target=null,turn=0,drought=0,maxDrought=0;
  const firstUnlocked=Array(8).fill(null),firstOpened=Array(8).fill(null),firstFood=Array(8).fill(null);firstUnlocked[0]=0;firstFood[0]=0;
  const timeline=[];
  for(let order=1;order<=Math.max(...config.checkpoints);order++){
   const ticket=g.board.shift(),reward=Math.round(ticket.base*bakeryValue()),beforeBoost=bakeryValue();
   const canDouble=reward>=doubleBakeryCost(),capacity=affordable(reward);
   g.coins+=reward;g.completed++;g.mastery++;g.permanentLuck=Math.max(g.permanentLuck,Math.floor(g.mastery/4));
   const walletBefore=g.coins-reward;fund+=reward*share;let packages=0,packageSpent=0;
   for(let n=0;n<100;n++){
    const highest=PACKAGE_SHOP.filter(t=>packageUnlocked(t.rank)).at(-1).rank;
    if(target===null){const rotation=policy==='collector'?[highest]:policy==='bakery'?[0,0,highest]:[0,highest,Math.max(0,highest-1)];target=rotation[turn++%rotation.length]}
    const price=packagePrice(target);if(price>fund||price>g.coins)break;
    g.coins-=price;fund-=price;packageSpent+=price;g.packages[target]++;if(g.packages[target]>50)throw Error('Package capacity exceeded');
    Math.random=foodRng;const food=drawFood(target);Math.random=problemRng;
    g.packages[target]--;discoverFood(food);sync();packages++;firstOpened[target]??=order;firstFood[food.rarity]??=order;target=null;
   }
   const upgrade=purchaseUpgrades(policy,()=>Math.max(0,g.coins-fund));
   if(Math.abs(walletBefore+reward-packageSpent-upgrade.spent-g.coins)>1e-10*Math.max(1,g.coins,reward))throw Error('Coin conservation failed');
   for(const type of PACKAGE_SHOP)if(packageUnlocked(type.rank))firstUnlocked[type.rank]??=order;
   const next=offers().sort((a,b)=>a.cost-b.cost)[0],gap=next?Math.max(0,next.cost-Math.max(0,g.coins-fund)):Infinity;
   if(!upgrade.count){drought++;maxDrought=Math.max(maxDrought,drought)}else drought=0;
   timeline.push({order,reward,spent:packageSpent+upgrade.spent,tier:ticketCoinTier(ticket),upgrades:upgrade.count,affordable:capacity,canDouble,actualDouble:upgrade.counts.bakery>=2,counts:upgrade.counts,packages,boost:bakeryValue(),growth:bakeryValue()/beforeBoost,bakery:g.bakeryLevel,coins:g.coins,discoveries:g.discovered.length,masteryAvailable:g.owned.reduce((n,o)=>n+availableMastery(o),0),expectedWait:next?Math.ceil(gap/earningUnit()):null,stackWait:next?Math.ceil(gap/(ticketBase(0)*bakeryValue())):null,exhausted:!next,limitHit:upgrade.limitHit});
   const values=[g.coins,bakeryValue(),earningUnit(),bakeryUpgradeCost(),slotCost(),...g.owned.map(foodLevelPrice),...PACKAGE_SHOP.map(t=>packagePrice(t.rank))];
   if(values.some(n=>!Number.isFinite(n)||n<0)||new Set(g.owned.map(o=>o.id)).size!==g.owned.length)throw Error('Economy invariant failed');
   refillBoard();
  }
  runs.push({policy,luck,trial,timeline,maxDrought,firstUnlocked,firstOpened,firstFood});
 }
 ticketRarity=originalTicketRarity;
 const aggregate=[];
 const windows=config.checkpoints.map((to,i)=>[i?config.checkpoints[i-1]+1:1,to]);
 if(config.checkpoints.includes(100))windows.push([26,100]);
 for(const policy of Object.keys(config.policies))for(const luck of config.luck){
  const selected=runs.filter(r=>r.policy===policy&&r.luck===luck);
  for(const [from,to] of windows){
   const data=selected.flatMap(r=>r.timeline.slice(from-1,to)),end=selected.map(r=>r.timeline[to-1]);
   aggregate.push({policy,luck,from,to,orders:data.length,actualUpgrades:summarize(data.map(r=>r.upgrades)),affordableUpgrades:summarize(data.map(r=>r.affordable)),doubleBakeryChance:data.filter(r=>r.canDouble).length/data.length,actualDoubleBakery:data.filter(r=>r.actualDouble).length/data.length,zeroUpgradeRate:data.filter(r=>!r.upgrades).length/data.length,expectedWait:summarize(data.map(r=>r.expectedWait??1e9)),stackWait:summarize(data.map(r=>r.stackWait??1e9)),boost:summarize(end.map(r=>r.boost)),reward:summarize(end.map(r=>r.reward)),bakery:summarize(end.map(r=>r.bakery)),discoveries:summarize(end.map(r=>r.discoveries)),masteryAvailable:summarize(end.map(r=>r.masteryAvailable)),exhaustedOrders:data.filter(r=>r.exhausted).length,loopLimitHits:data.filter(r=>r.limitHit).length,meanPackages:data.reduce((n,r)=>n+r.packages,0)/data.length,meanPurchases:Object.fromEntries(['bakery','mastery','slot','fusion'].map(kind=>[kind,data.reduce((n,r)=>n+r.counts[kind],0)/data.length]))});
  }
  for(const [kind,key] of [['unlock','firstUnlocked'],['open','firstOpened'],['food','firstFood']])aggregate.push({policy,luck,kind,acquisition:Array.from({length:8},(_,rank)=>{const v=selected.map(r=>r[key][rank]).filter(n=>n!==null);return {rank,reached:v.length/selected.length,orders:v.length?summarize(v):null}})});
 }
 return {name:model.name,model,aggregate,worstDrought:Math.max(...runs.map(r=>r.maxDrought)),audit:runs.find(r=>r.policy==='balanced'&&r.luck==='normal'&&r.trial===0)};
}
