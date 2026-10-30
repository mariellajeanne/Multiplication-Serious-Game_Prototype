/* Shared, deterministic progression rules. No DOM, random draws or transactions. */
const PROGRESSION_VERSION=3, MAX_FOOD_LEVEL=5, MAX_FOOD_TIER=5, MAX_KITCHEN_LEVEL=20;
const TIER_FACTORS=[0,1,2,3.5,5.5,8], LEVEL_FACTORS=[0,1,1.25,1.55,1.9,2.3];
const BAKERY_MILESTONES=[2,3,5,7,10,13,17,21,25,30];
const BAKERY_STAGES=['Freshly opened','Warm welcome','Cozy counter','Neighborhood bakery','Blooming bakery','Golden counter','Artisan bakery','Celebration bakery','Grand panaderya','Master bakery','Crown panaderya'];
const TICKET_DIMS=[[2,1],[2,2],[2,2],[3,2],[3,2],[4,2],[4,2],[4,2]];
const ORDER_LIMIT=5, ORDER_REFRESH_MS=180000;
function foodTier(o){return clamp(Math.floor(Number(o.fusion)||1),1,MAX_FOOD_TIER)}
function amountLabel(value){return Math.abs(value)<1e6?fmt(value):new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(value)}
function multiplierLabel(value){return Math.abs(value)<1e4?value.toFixed(2):new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(value)}
function tierBase(o){return (FOOD.find(f=>f.id===o.id)?.base||0)*TIER_FACTORS[foodTier(o)]+Math.max(0,Number(o.baseCarry)||0)}
function individualValue(o){return tierBase(o)*LEVEL_FACTORS[clamp(Math.floor(Number(o.level)||1),1,MAX_FOOD_LEVEL)]}
function bakeryFactor(level){return Math.pow(1.085,clamp(level||1,1,30)-1)}
function bakeryStage(level){return BAKERY_MILESTONES.filter(n=>n<=level).length}
function binomialRanks(p){
 const coefficients=[1,7,21,35,35,21,7,1];
 const weights=coefficients.map((c,i)=>c*Math.pow(p,i)*Math.pow(1-p,7-i));
 const total=weights.reduce((a,b)=>a+b,0);return weights.map(w=>w/total);
}
// Increasing p couples seven Bernoulli draws: every upper tail is nondecreasing.
function ticketProbabilities(mastery){return binomialRanks(.04+.68*(1-Math.exp(-Math.max(0,mastery||0)/80)))}
function packageProbabilities(ticketRank){return binomialRanks(.08+.84*clamp(ticketRank,0,7)/7)}
function drawRank(probabilities,random=Math.random()){
 let cumulative=0;for(let i=0;i<probabilities.length;i++){cumulative+=probabilities[i];if(random<cumulative)return i}return probabilities.length-1;
}
function ticketBase(rank){const d=TICKET_DIMS[rank];return Math.round((70+30*d[0]*d[1])*(1+rank*.6))}
function expectedTicketBase(mastery){return ticketProbabilities(mastery).reduce((sum,p,i)=>sum+p*ticketBase(i),0)}
function tierRecipe(a,b){
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<1||a>=5||b>=5)return null;
 const sum=a+b;return sum>5?[5,sum-5]:a===b&&a>1?[sum-1,1]:[sum];
}
function splitInteger(total,weights){
 const sum=weights.reduce((a,b)=>a+b,0);let remaining=Math.floor(total);
 return weights.map((weight,i)=>{const part=i===weights.length-1?remaining:Math.floor(total*weight/sum);remaining-=part;return part});
}
function foodResaleBase(o){return Number.isFinite(o.resaleBase)?Math.max(0,Math.floor(o.resaleBase)):Math.round((FOOD.find(f=>f.id===o.id)?.base||0)*45)}
function fusionPlan(a,b,fee){
 if(!a||!b||a.uid===b.uid||a.id!==b.id)return null;
 const tiers=tierRecipe(foodTier(a),foodTier(b));if(!tiers)return null;
 let progress=(a.level-1)+(b.level-1);
 const outputs=tiers.map(fusion=>{const points=Math.min(4,progress);progress-=points;return {id:a.id,fusion,level:points+1,spent:0,baseCarry:0,resaleBase:0}});
 const incoming=[individualValue(a),individualValue(b)],totalBefore=incoming.reduce((s,v)=>s+v,0);
 const others=outputs.slice(1).reduce((s,o)=>s+individualValue(o),0);
 const primaryMinimum=Math.max(...incoming,totalBefore-others);
 const carry=Math.max(0,primaryMinimum-individualValue(outputs[0]));
 outputs[0].baseCarry=carry/LEVEL_FACTORS[outputs[0].level];
 const values=outputs.map(individualValue),investment=Math.floor((a.spent||0)+(b.spent||0)+fee);
 const spent=splitInteger(investment,values),resale=splitInteger(foodResaleBase(a)+foodResaleBase(b),values);
 outputs.forEach((o,i)=>{o.spent=spent[i];o.resaleBase=resale[i]});
 return {inputs:[a.uid,b.uid],outputs,fee,levelCredits:progress,investment,totalBefore,totalAfter:values.reduce((s,v)=>s+v,0),strongestBefore:Math.max(...incoming),strongestAfter:Math.max(...values)};
}
function bestMenu(owned,capacity,mode){
 const sorted=[...owned].filter(o=>FOOD.some(f=>f.id===o.id)).sort((a,b)=>
  (mode==='base'?tierBase(b)-tierBase(a):individualValue(b)-individualValue(a))||a.uid-b.uid);
 const seen=new Set();return sorted.filter(o=>{if(seen.has(o.id))return false;seen.add(o.id);return true}).slice(0,capacity).map(o=>o.uid);
}
function pricingMenuBase(){
 const ids=new Set(bestMenu(g.owned,g.menuSlots,'final'));
 return Math.max(1,g.economyPeakBase||0,g.owned.filter(o=>ids.has(o.uid)).reduce((sum,o)=>sum+individualValue(o),0));
}
function migrateProgression(state){
 if(state.progressionVersion>=PROGRESSION_VERSION)return state;
 const ranks=[...(state.board||[]).map(t=>t.rarity),state.run?.ticket?.rarity,...(state.run?.chests||[]).map(c=>typeof c==='number'?c:c.rarity)];
 const seven=state.rarityCount===7||state.rarityNames?.length===7||ranks.includes(6);
 const map=seven?[0,1,2,3,4,6,7]:[0,1,2,3,4,7];
 const migrateRank=r=>map[clamp(Math.floor(r||0),0,map.length-1)];
 for(const ticket of state.board||[])ticket.rarity=migrateRank(ticket.rarity);
 if(state.run?.ticket)state.run.ticket.rarity=migrateRank(state.run.ticket.rarity);
 if(state.run?.chests)state.run.chests=state.run.chests.map(c=>typeof c==='number'?migrateRank(c):{...c,rarity:migrateRank(c.rarity)});
 for(const o of state.owned||[]){o.fusion=clamp((Number(o.fusion)||0)+1,1,5);o.level=clamp(Number(o.level)||1,1,5);o.spent=Math.max(0,Number(o.spent)||0)}
 const oldDecor=clamp(state.decor||0,0,4),oldBonus=[1,1.08,1.19,1.35,1.55][oldDecor];
 state.bakeryLevel=Math.max(state.bakeryLevel||1,Math.ceil(Math.log(oldBonus)/Math.log(1.085)-1e-10)+1);
 state.bakerySpent=state.bakerySpent??[550,2200,8800,35000].slice(0,oldDecor).reduce((a,b)=>a+b,0);
 state.legacyDecor=state.legacyDecor??oldDecor;state.decor=oldDecor;
 state.autoEquip=['final','base'].includes(state.autoEquip)?state.autoEquip:'off';
 state.foodLevelCredits=state.foodLevelCredits||{};
 state.ticketSeq=Math.max(state.ticketSeq||0,...(state.board||[]).map(t=>Number(t.id)||0),Number(state.run?.ticket?.id)||0);
 state.uidNext=Math.max(state.uidNext||1,...(state.owned||[]).map(o=>(Number(o.uid)||0)+1));
 state.orderClock=Math.max(0,Number(state.orderClock)||0);state.orderRefreshAt=Math.max(0,Number(state.orderRefreshAt)||0);
 state.rarityCount=8;state.progressionVersion=PROGRESSION_VERSION;return state;
}

function themeLevel(){return Math.min(4,Math.floor(bakeryStage(g.bakeryLevel)/2))}
