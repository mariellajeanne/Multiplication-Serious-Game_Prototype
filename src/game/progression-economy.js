/* Prices are measured against expected Normal-order earnings, not challenge modes. */
function economyUnit(){return expectedTicketBase(g.mastery)*pricingMenuBase()*kitchenBonus()*decorBonus()}
function earningUnit(){return expectedTicketBase(g.mastery)*bakeryValue()}
function foodEarningShare(o){return expectedTicketBase(g.mastery)*foodValue(o)*kitchenBonus()*decorBonus()}
function foodLevelCost(o){return Math.max(1,Math.round(foodEarningShare(o)*(.75+.45*Math.pow(o.level,1.3))))}
function foodLevelPrice(o){return (g.foodLevelCredits[o.id]||0)>0?0:foodLevelCost(o)}
function fusionFee(o,other=null){const tier=other?Math.max(foodTier(o),foodTier(other)):foodTier(o);return Math.max(1,Math.round(expectedTicketBase(g.mastery)*F(o.id).base*kitchenBonus()*decorBonus()*(1.5+.65*Math.pow(tier,1.25))))}
function ingredientNeeds(o){const f=F(o.id),qty=[0,3,7,15,30][foodTier(o)]*(1+Math.floor(f.rarity/2));return f.ingredients.map((name,i)=>({name,need:Math.round(qty*(i===1?.7:1)),have:g.ingredients[name]||0,price:INGREDIENTS.find(x=>x[0]===name)[2]}))}
function fusionIngredientCost(o){return ingredientNeeds(o).reduce((s,x)=>s+Math.max(0,x.need-x.have)*x.price,0)}
function equipmentCost(k){const level=g.equipment[k.id]||0;return Math.max(1,Math.round(economyUnit()*(.85+.22*Math.pow(level,1.15))*(1+.1*KITCHEN.indexOf(k))))}
function bakeryUpgradeCost(){return Math.max(1,Math.round(economyUnit()*(2.5+.2*Math.pow(g.bakeryLevel-1,1.15))))}
function upgradeFood(uid,inline=false){
 if(g.run)return false;const o=g.owned.find(x=>x.uid===uid);if(!o||o.level>=MAX_FOOD_LEVEL)return false;
 const cost=foodLevelPrice(o);if(g.coins<cost){toast('Not enough coins yet — solve another order!');return false}
 g.coins-=cost;o.spent=(o.spent||0)+cost;if(!cost)g.foodLevelCredits[o.id]--;o.level++;
 save();render();if(!inline)openMenu();toast(`${F(o.id).name} is now Level ${o.level}!`);return true;
}
function duplicateFusionPlan(o,donorUid){const donor=g.owned.find(x=>x.uid===Number(donorUid));return fusionPlan(o,donor,fusionFee(o,donor))}
function fusionFingerprint(foods){return JSON.stringify(foods.map(o=>[o.uid,o.id,o.fusion,o.level,o.spent,o.baseCarry||0,o.resaleBase??null]))}
function applyDuplicateFusion(plan,fingerprint){
 if(g.run||g.completed<5||!plan)return false;
 const inputs=plan.inputs.map(uid=>g.owned.find(o=>o.uid===uid));
 if(inputs.some(o=>!o)||fusionFingerprint(inputs)!==fingerprint)return false;
 const verified=duplicateFusionPlan(inputs[0],inputs[1].uid);
 if(!verified||JSON.stringify(verified)!==JSON.stringify(plan)||g.coins<verified.fee)return false;
 g.coins-=verified.fee;const ids=new Set(verified.inputs),primaryUid=verified.inputs[0];
 g.owned=g.owned.filter(o=>!ids.has(o.uid));
 verified.outputs.forEach((o,i)=>g.owned.push({...o,uid:i===0?primaryUid:g.uidNext++}));
 g.foodLevelCredits[inputs[0].id]=(g.foodLevelCredits[inputs[0].id]||0)+verified.levelCredits;
 g.activeMenu=[...new Set(g.activeMenu.map(uid=>ids.has(uid)?primaryUid:uid))].slice(0,g.menuSlots);
 save();render();toast(`Fused ${F(inputs[0].id).name}! All results are in Food Inventory.`);return true;
}
function fuseDuplicate(uid,donorUid){const o=g.owned.find(x=>x.uid===uid),plan=o&&duplicateFusionPlan(o,donorUid);return plan?applyDuplicateFusion(plan,fusionFingerprint(plan.inputs.map(id=>g.owned.find(x=>x.uid===id)))):false}
function fuseIngredients(uid,expected=null){
 if(g.run||g.completed<5)return false;const o=g.owned.find(x=>x.uid===uid);if(!o||foodTier(o)>=5)return false;
 const needs=ingredientNeeds(o),fee=fusionFee(o),buy=fusionIngredientCost(o),total=fee+buy;
 if(expected&&(expected.fingerprint!==fusionFingerprint([o])||expected.total!==total||expected.needs!==JSON.stringify(needs)))return false;
 if(g.coins<total){toast(`Need ${fmt(total-g.coins)} more coins for this fusion.`);return false}
 g.coins-=total;
 // Purchased pantry stock is paid investment too; only missing stock is charged now.
 o.spent=(o.spent||0)+fee+needs.reduce((sum,i)=>sum+i.need*i.price,0);
 for(const i of needs)g.ingredients[i.name]=Math.max(0,(g.ingredients[i.name]||0)-i.need);
 o.fusion=foodTier(o)+1;save();render();openMenu();toast(`Ingredients fused into ${F(o.id).name}!`);return true;
}
function buyIngredient(name,count){
 if(g.run||!Number.isInteger(count)||count<=0)return false;const data=INGREDIENTS.find(x=>x[0]===name);if(!data)return false;
 const amount=data[2]*count;if(g.coins<amount){toast('Need more coins to buy these ingredients.');return false}
 g.coins-=amount;g.ingredients[name]=(g.ingredients[name]||0)+count;save();render();openIngredients();return true;
}
function baseResale(o){return foodResaleBase(o)}
function resalePrice(o){return baseResale(o)+Math.floor((o.spent||0)*.5)}
function sellFood(uid){if(g.run)return false;const o=g.owned.find(x=>x.uid===uid);if(!o)return false;g.coins+=resalePrice(o);g.owned=g.owned.filter(x=>x.uid!==uid);g.activeMenu=g.activeMenu.filter(x=>x!==uid);save();render();openMenu();toast('Food sold. Its discovery is safe in your Index!');return true}
function upgradeEquipment(id){
 if(g.run||g.completed<2)return false;const k=KITCHEN.find(x=>x.id===id);if(!k||(g.equipment[id]||0)>=MAX_KITCHEN_LEVEL)return false;
 const cost=equipmentCost(k);if(g.coins<cost){toast('That upgrade is a little expensive. Try another path!');return false}
 g.coins-=cost;g.equipment[id]=(g.equipment[id]||0)+1;g.kitchenSpent=(g.kitchenSpent||0)+cost;save();render();openKitchen();toast(`${k.name} improved! All menu foods gain ${(k.bonus*100).toFixed(1)}%.`);return true;
}
function upgradeDecor(){
 if(g.run||g.completed<4||g.bakeryLevel>=30)return false;const price=bakeryUpgradeCost();if(g.coins<price){toast('Not enough coins for this bakery upgrade yet.');return false}
 const before=bakeryStage(g.bakeryLevel);g.coins-=price;g.bakerySpent+=price;g.bakeryLevel++;
 save();render();openDecor();toast(bakeryStage(g.bakeryLevel)>before?`New bakery stage: ${BAKERY_STAGES[bakeryStage(g.bakeryLevel)]}!`:`Bakery Level ${g.bakeryLevel} — menu value +8.5%!`);return true;
}
function staffRate(){return earningUnit()/360}
function equipBest(mode){if(g.run||!['final','base'].includes(mode))return false;if(g.autoEquip!=='off')g.autoEquip=mode;g.activeMenu=bestMenu(g.owned,g.menuSlots,mode);save();render();return true}
function setAutoEquip(mode,enabled){if(g.run||!['final','base'].includes(mode))return false;g.autoEquip=enabled?mode:g.autoEquip===mode?'off':g.autoEquip;save();render();return true}
function manualMenuAllowed(){if(g.run)return false;if(g.autoEquip!=='off'){toast('Turn Auto Equip off to choose your own menu.');return false}return true}
