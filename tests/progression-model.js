/* Executable Normal-order model: production actions, claims, purchases and five-ticket board. */
function simulateDesign(config,variant){
 const seedRandom=seed=>{let n=seed>>>0;return ()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296}};
 const initialize=scenario=>{
  g=fresh();g.completed=scenario.completed;g.mastery=scenario.mastery;g.bakeryLevel=scenario.bakery;g.menuSlots=scenario.slots;
  g.owned=scenario.foods.map((id,i)=>({id,uid:i+1,mastery:scenario.recipeMastery,level:Math.min(5,scenario.recipeMastery+1),fusion:scenario.tier,spent:0}));
  g.discovered=[...scenario.foods];g.uidNext=g.owned.length+1;
  g.recipeCeilings=Object.fromEntries(scenario.foods.map(id=>[id,scenario.recipeMastery+4]));if(scenario.name==='early')g.recipeCeilings.pandesal=0;
  g.equipment=Object.fromEntries(KITCHEN.map(k=>[k.id,scenario.kitchen]));g.autoEquip='final';g.activeMenu=bestMenu(g.owned,g.menuSlots,'final');g.economyPeakBase=pricingMenuBase();
 };
 const powerPrice=()=>Math.max(1,Math.round(economyUnit()*(variant.power.base+variant.power.growth*Math.pow(g.bakeryLevel-1,variant.power.exponent))));
 const shopPrice=rank=>Math.max(1,Math.round(economyUnit()*variant.packageBase*Math.pow(variant.packageFactor,rank)));
 bakeryUpgradeCost=powerPrice;packagePrice=shopPrice;
 const quantile=(values)=>{const a=[...values].sort((x,y)=>x-y);return {p10:a[Math.floor(a.length*.1)],p50:a[Math.floor(a.length*.5)],p90:a[Math.floor(a.length*.9)]}};
 const quotes=config.scenarios.map(s=>{initialize(s);const unit=earningUnit();return {scenario:s.name,powerOrders:powerPrice()/unit,kitchenOrders:KITCHEN.map(k=>equipmentCost(k)/unit),slotOrders:slotCost()/unit,packageOrders:PACKAGE_TYPES.map((_,r)=>shopPrice(r)/unit),mastery:g.owned.filter(o=>g.activeMenu.includes(o.uid)).map(o=>({id:o.id,costOrders:foodLevelPrice(o)/unit,gain:foodValue(o)/foodSum()*(masteryFactor(recipeMastery(o)+1)/masteryFactor(recipeMastery(o))-1)}))}});
 const metrics=[];
 for(const scenario of config.scenarios)for(const policy of config.policies){
  const rows=Object.fromEntries(config.horizons.map(n=>[n,[]]));
  for(let trial=0;trial<config.trials;trial++){
   initialize(scenario);Math.random=seedRandom(config.seed+trial);refillBoard();const initial=bakeryValue();
   const purchases={slot:0,mastery:0,kitchen:0,power:0,package:0,ingredient:0};
   let freePackages=0,boughtPackages=0,duplicates=0,newFoods=0,firstPurchase=null,dry=0,maxDry=0,availableTotal=0,zeroAvailable=0,firstUnlock=null,earned=0,spent=0;
   const countRewards=rewards=>{for(const r of rewards){if(r.isNew)newFoods++;else duplicates++}};
   for(let order=1;order<=Math.max(...config.horizons);order++){
    Math.random=seedRandom(config.seed+trial*1009+order*7919);
    // Growth chooses coins per digit pair; collector chooses Luck, younger chooses a random ticket.
    const ticket=policy==='younger'?g.board[Math.floor(Math.random()*g.board.length)]:[...g.board].sort((a,b)=>policy==='collector'?b.rarity-a.rarity:b.base/generateSteps(b.a,b.b).length-a.base/generateSteps(a.a,a.b).length)[0];
    startTicket(ticket.id);const r=g.run,ledger=ensureWorksheetRewards(r);
    for(const step of r.steps)applyWorksheetActions(r,worksheetActionKinds(step).map(kind=>({id:worksheetActionId(ledger.attemptId,step.row,step.col,kind),row:step.row,col:step.col,kind})));
    finishSum();const n=r.chests.length;freePackages+=n;earned+=r.pool;
    const beforeDiscover=discoverFood;discoverFood=food=>{const reward=beforeDiscover(food);countRewards([reward]);return reward};prizeItems();discoverFood=beforeDiscover;
    reconcileAutoEquip();g.economyPeakBase=pricingMenuBase();
    const candidates=[],sum=foodSum(),value=bakeryValue();
    const add=(kind,cost,gain,apply)=>{if(Number.isFinite(cost)&&gain>0)candidates.push({kind,cost,gain,score:gain/cost,apply})};
    if(g.menuSlots<FOOD.length){const ids=bestMenu(g.owned,g.menuSlots+1,'final');const after=g.owned.filter(o=>ids.includes(o.uid)).reduce((n,o)=>n+foodValue(o),0);add('slot',slotCost(),after/Math.max(1,sum)-1,()=>buyMenuSlot())}
    for(const o of g.owned.filter(o=>g.activeMenu.includes(o.uid)&&availableMastery(o)>0))add('mastery',foodLevelPrice(o),foodValue(o)/Math.max(1,sum)*(masteryFactor(recipeMastery(o)+1)/masteryFactor(recipeMastery(o))-1),()=>buyMastery([o.uid]));
    if(g.completed>=2)for(const k of KITCHEN)if(g.equipment[k.id]<MAX_KITCHEN_LEVEL)add('kitchen',equipmentCost(k),k.bonus,()=>upgradeEquipment(k.id));
    if(g.bakeryLevel<=BAKERY_POWER_CONFIG.purchases)add('power',powerPrice(),BAKERY_POWER_CONFIG.factor-1,()=>upgradeDecor());
    if(g.completed>=5)for(const o of g.owned.filter(o=>g.activeMenu.includes(o.uid)&&foodTier(o)<5))add('ingredient',fusionFee(o)+fusionIngredientCost(o),(foodValue({...o,fusion:foodTier(o)+1})-foodValue(o))/Math.max(1,sum),()=>fuseIngredients(o.uid));
    const affordable=candidates.filter(c=>c.cost<=g.coins);availableTotal+=affordable.length;if(!affordable.length)zeroAvailable++;
    candidates.sort((a,b)=>b.score-a.score);let choice=candidates.find(c=>c.cost<=g.coins);
    const highest=PACKAGE_SHOP.filter(t=>packageUnlocked(t.rank)).at(-1).rank;
    if(policy==='collector'||policy==='balanced'&&order%3===0){const rank=highest;choice=g.coins>=shopPrice(rank)?{kind:'package',cost:shopPrice(rank),apply:()=>{g.coins-=shopPrice(rank);countRewards([discoverFood(drawFood(rank))]);boughtPackages++;return true}}:policy==='collector'?null:choice}
    if(policy==='power')choice=candidates.find(c=>c.kind==='power'&&c.cost<=g.coins);
    if(policy==='younger'){
     const options=[...affordable];if(g.coins>=shopPrice(highest))options.push({kind:'package',cost:shopPrice(highest),apply:()=>{g.coins-=shopPrice(highest);countRewards([discoverFood(drawFood(highest))]);boughtPackages++;return true}});
     choice=options[Math.floor(Math.random()*options.length)];
    }
    if(choice){const coins=g.coins;if(!choice.apply())throw Error('Rejected modeled purchase '+choice.kind);spent+=coins-g.coins;purchases[choice.kind]++;firstPurchase??=order;dry=0}else{dry++;maxDry=Math.max(maxDry,dry)}
    reconcileAutoEquip();g.economyPeakBase=pricingMenuBase();if(g.bakeryLevel>=11)firstUnlock??=order;
    if(g.coins<0||g.packages.some(n=>n<0)||new Set(g.owned.map(o=>o.id)).size!==g.owned.length||g.menuSlots>FOOD.length||Math.abs(250+earned-spent-g.coins)>.1)throw Error('Economy invariant failed');
    if(config.horizons.includes(order))rows[order].push({growth:bakeryValue()/initial,coins:g.coins,discoveries:g.discovered.length,newFoods,duplicates,freePackages,boughtPackages,firstPurchase:firstPurchase??order+1,firstUnlock:firstUnlock??null,maxDry,meanAvailable:availableTotal/order,zeroAvailableFraction:zeroAvailable/order,powerLevel:g.bakeryLevel,purchases:{...purchases}});
   }
  }
  for(const horizon of config.horizons){const a=rows[horizon],distributions={};for(const key of ['growth','coins','discoveries','newFoods','duplicates','freePackages','boughtPackages','firstPurchase','maxDry','meanAvailable','zeroAvailableFraction','powerLevel'])distributions[key]=quantile(a.map(r=>r[key]));metrics.push({scenario:scenario.name,policy,horizon,distributions,unlockFraction:a.filter(r=>r.firstUnlock!==null).length/a.length,meanPurchases:Object.fromEntries(Object.keys(a[0].purchases).map(k=>[k,a.reduce((n,r)=>n+r.purchases[k],0)/a.length]))})}
 }
 return {variant,quotes,metrics};
}
