/* Shared balance parameters and pure quotes; the simulator uses these same rules. */
const ECONOMY_BALANCE={
 "version": 1,
 "coinBase": 130,
 "coinGrowth": 1.35,
 "bakeryCap": 5000,
 "bakeryGain": 1.085,
 "priceGrowth": 1.085,
 "menuElasticity": 0.9,
 "bakeryOrders": 0.85,
 "bakeryCurve": 0.016,
 "efficiency": 0.7,
 "efficiencyOrders": 75,
 "masteryOrders": 0.16,
 "masteryCurve": 0.03,
 "masteryExponent": 0.7,
 "slotOrders": 0.4,
 "slotCurve": 0.08,
 "slotExponent": 1.3,
 "packageOrders": 0.16,
 "packagePower": 0.97,
 "packageGrowth": 2.35,
 "resaleMargin": 1.2,
 "fusionOrders": 2,
 "fusionCurve": 1.2,
 "unlocks": [
  1,
  12,
  30,
  60,
  110,
  190,
  300,
  450
 ]
};
function balancedPriceUnit(menuPeak,bakeryLevel,completed=0){
 // Income uses the full Menu and Power. Prices use sublinear Menu growth and
 // practice efficiency, so progress buys more upgrades instead of repricing it away.
 return ECONOMY_BALANCE.coinBase*Math.pow(Math.max(1,menuPeak),ECONOMY_BALANCE.menuElasticity)*Math.pow(ECONOMY_BALANCE.priceGrowth,Math.min(ECONOMY_BALANCE.bakeryCap,Math.max(0,bakeryLevel-1)))/Math.pow(1+Math.max(0,completed)/ECONOMY_BALANCE.efficiencyOrders,ECONOMY_BALANCE.efficiency);
}
function balancedBakeryCost(menuPeak,bakeryLevel,completed=0){
 return Math.max(1,Math.round(balancedPriceUnit(menuPeak,bakeryLevel,completed)*(ECONOMY_BALANCE.bakeryOrders+ECONOMY_BALANCE.bakeryCurve*Math.sqrt(Math.max(0,bakeryLevel-1)))));
}
function balancedMasteryCost(recipeBase,mastery,bakeryLevel,completed=0){
 // Charge against the recipe's base, not its already purchased Mastery bonus.
 return Math.max(1,Math.round(balancedPriceUnit(recipeBase,bakeryLevel,completed)*(ECONOMY_BALANCE.masteryOrders+ECONOMY_BALANCE.masteryCurve*Math.pow(mastery+1,ECONOMY_BALANCE.masteryExponent))));
}
function balancedSlotCost(menuPeak,bakeryLevel,slots,completed=0){
 return Math.max(1,Math.round(balancedPriceUnit(menuPeak,bakeryLevel,completed)*(ECONOMY_BALANCE.slotOrders+ECONOMY_BALANCE.slotCurve*Math.pow(Math.max(0,slots-1),ECONOMY_BALANCE.slotExponent))));
}
const PACKAGE_RESALE_EXPECTATIONS=[];
function expectedPackageResale(rank){
 if(PACKAGE_RESALE_EXPECTATIONS[rank]!==undefined)return PACKAGE_RESALE_EXPECTATIONS[rank];
 return PACKAGE_RESALE_EXPECTATIONS[rank]=packageProbabilities(rank).reduce((sum,p,rarity)=>{
  const foods=FOOD.filter(food=>food.rarity===rarity);
  return sum+p*foods.reduce((n,food)=>n+Math.round(food.base*45),0)/foods.length;
 },0);
}
function balancedPackagePrice(rank,menuPeak,bakeryLevel,completed=0){
 const purchases=Math.min(ECONOMY_BALANCE.bakeryCap,Math.max(0,bakeryLevel-1));
 const indexedPower=Math.pow(ECONOMY_BALANCE.priceGrowth,purchases)*Math.pow(ECONOMY_BALANCE.bakeryGain,purchases*(ECONOMY_BALANCE.packagePower-1));
 const cost=balancedPriceUnit(menuPeak,1,completed)*indexedPower*ECONOMY_BALANCE.packageOrders*Math.pow(ECONOMY_BALANCE.packageGrowth,rank);
 // Protect resale economics while letting milestone packages become affordable during continued growth.
 return Math.max(1,Math.ceil(expectedPackageResale(rank)*ECONOMY_BALANCE.resaleMargin),Math.round(cost));
}

function balancedFusionFee(recipeBase,bakeryLevel,tier,completed=0){
 return Math.max(1,Math.round(balancedPriceUnit(recipeBase,bakeryLevel,completed)*(ECONOMY_BALANCE.fusionOrders+ECONOMY_BALANCE.fusionCurve*Math.pow(tier,1.25))));
}
// Keep large balances readable without changing their stored numeric values.
function largeNumberLabel(value,digits=2){
 const units=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
 const magnitude=Math.floor(Math.log10(Math.max(1,Math.abs(value)))/3);
 if(magnitude>=units.length)return value.toExponential(digits).replace('e+','e');
 if(magnitude<=0)return new Intl.NumberFormat('en-US',{maximumFractionDigits:digits}).format(value);
 return new Intl.NumberFormat('en-US',{maximumFractionDigits:digits}).format(value/1000**magnitude)+units[magnitude];
}
