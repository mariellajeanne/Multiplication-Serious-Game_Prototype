/* Prices are measured against expected Normal-order earnings, not challenge modes. */
function economyUnit(){return expectedTicketBase(g.mastery)*pricingMenuBase()*decorBonus()}
function earningUnit(){return expectedTicketBase(g.mastery)*bakeryValue()}
function slotCost(){return Math.round(economyUnit()*(2+.6*Math.pow(Math.max(0,g.menuSlots-1),1.15)))}
function packagePrice(rank){return Math.max(1,Math.round(economyUnit()*PACKAGE_SHOP[rank].priceOrders))}
function packageUnlocked(rank){return g.bakeryLevel>=PACKAGE_SHOP[rank].unlock}
function foodEarningShare(o){return expectedTicketBase(g.mastery)*foodValue(o)*decorBonus()}
function foodLevelCost(o){return Math.max(1,Math.round(foodEarningShare(o)*(.75+.45*Math.pow(recipeMastery(o)+1,1.3))))}
function foodLevelPrice(o){return foodLevelCost(o)}
function fusionFee(o,other=null){const tier=other?Math.max(foodTier(o),foodTier(other)):foodTier(o);return Math.max(1,Math.round(expectedTicketBase(g.mastery)*F(o.id).base*decorBonus()*(1.5+.65*Math.pow(tier,1.25))))}
function ingredientNeeds(o){const f=F(o.id),qty=[0,3,7,15,30][foodTier(o)]*(1+Math.floor(f.rarity/2));return f.ingredients.map((name,i)=>({name,need:Math.round(qty*(i===1?.7:1)),have:g.ingredients[name]||0,price:INGREDIENTS.find(x=>x[0]===name)[2]}))}
function fusionIngredientCost(o){return ingredientNeeds(o).reduce((s,x)=>s+Math.max(0,x.need-x.have)*x.price,0)}
function bakeryUpgradeCost(){return Math.max(1,Math.round(economyUnit()*(BAKERY_POWER_CONFIG.priceOrders+BAKERY_POWER_CONFIG.priceGrowth*Math.pow(g.bakeryLevel-1,1.15))))}
function refreshFoodProgress(){
 reconcileAutoEquip();
 // Values are derived from owned foods, never a stored multiplier snapshot.
 const contribution=foodSum(),total=bakeryValue();
 save();render();
 // Dialogs are a separate mount: refresh open inventory/detail content too.
 if(modal?.title==='Food Inventory')openMenu(inventoryIntent,true);
 return {contribution,total};
}
function upgradeFood(uid,inline=false){return buyMastery([uid])}
function buyMastery(uids,expected=null){
 if(g.run&&!g.run.paused)return false;
 const foods=g.owned.filter(o=>uids.includes(o.uid)&&availableMastery(o)>0);
 if(!foods.length)return false;
 const cost=foods.reduce((sum,o)=>sum+foodLevelPrice(o),0);
 const fingerprint=JSON.stringify(foods.map(o=>[o.uid,recipeMastery(o),g.recipeCeilings[o.id],foodLevelPrice(o)]));
 if(expected&&(expected.cost!==cost||expected.fingerprint!==fingerprint)){toast('Mastery or prices changed. Review the purchase again.');return false}
 if(g.coins<cost){toast(`Need ${fmt(cost-g.coins)} more coins for this mastery purchase.`);return false}
 const before={coins:g.coins,owned:JSON.parse(JSON.stringify(g.owned)),activeMenu:[...g.activeMenu],economyPeakBase:g.economyPeakBase};
 commitPurchaseUndo();g.coins-=cost;
 for(const o of foods){o.mastery=recipeMastery(o)+1;o.level=Math.min(5,o.mastery+1)}
 // Charge the quoted pre-upgrade cost, including the exact investment per item.
 for(const original of before.owned){const o=foods.find(x=>x.uid===original.uid);if(o)o.spent=(original.spent||0)+foodLevelPrice(original)}
 registerPurchaseUndo('Recipe Mastery',cost,before);refreshFoodProgress();return true;
}
function duplicateFusionPlan(o,donorUid){const donor=g.owned.find(x=>x.uid===Number(donorUid));return fusionPlan(o,donor,fusionFee(o,donor))}
function fusionFingerprint(foods){return JSON.stringify(foods.map(o=>[o.uid,o.id,o.fusion,o.level,o.spent,o.baseCarry||0,o.resaleBase??null]))}
function applyDuplicateFusion(plan,fingerprint){
 if(g.uniqueFoodsVersion>=1||g.run||g.completed<5||!plan)return false;
 const inputs=plan.inputs.map(uid=>g.owned.find(o=>o.uid===uid));
 if(inputs.some(o=>!o)||fusionFingerprint(inputs)!==fingerprint)return false;
 const verified=duplicateFusionPlan(inputs[0],inputs[1].uid);
 if(!verified||JSON.stringify(verified)!==JSON.stringify(plan)||g.coins<verified.fee)return false;
 g.coins-=verified.fee;const ids=new Set(verified.inputs),primaryUid=verified.inputs[0];
 g.owned=g.owned.filter(o=>!ids.has(o.uid));
 verified.outputs.forEach((o,i)=>g.owned.push({...o,uid:i===0?primaryUid:g.uidNext++}));
 g.foodLevelCredits[inputs[0].id]=(g.foodLevelCredits[inputs[0].id]||0)+verified.levelCredits;
 g.activeMenu=[...new Set(g.activeMenu.map(uid=>ids.has(uid)?primaryUid:uid))].slice(0,g.menuSlots);
 refreshFoodProgress();toast(`Fused ${F(inputs[0].id).name}! All results are in Food Inventory.`);return true;
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
 o.fusion=foodTier(o)+1;refreshFoodProgress();openMenu();toast(`Ingredients fused into ${F(o.id).name}!`);return true;
}
function buyIngredient(name,count){
 if(g.run||!Number.isInteger(count)||count<=0)return false;const data=INGREDIENTS.find(x=>x[0]===name);if(!data)return false;
 const amount=data[2]*count;if(g.coins<amount){toast('Need more coins to buy these ingredients.');return false}
 g.coins-=amount;g.ingredients[name]=(g.ingredients[name]||0)+count;save();render();openIngredients();return true;
}
function baseResale(o){return foodResaleBase(o)}
function resalePrice(o){return baseResale(o)+Math.floor((o.spent||0)*.5)}
function sellFood(uid){if(g.run)return false;const o=g.owned.find(x=>x.uid===uid);if(!o)return false;g.coins+=resalePrice(o);g.owned=g.owned.filter(x=>x.uid!==uid);g.activeMenu=g.activeMenu.filter(x=>x!==uid);save();render();openMenu();toast('Food sold. Its discovery is safe in your Index!');return true}
function upgradeDecor(){
 if(g.run&&!g.run.paused||g.bakeryLevel>BAKERY_POWER_CONFIG.purchases)return false;
 const price=bakeryUpgradeCost();if(g.coins<price){toast('Not enough coins for this Bakery Power upgrade yet.');return false}
 const before={coins:g.coins,bakeryLevel:g.bakeryLevel,bakerySpent:g.bakerySpent,economyPeakBase:g.economyPeakBase};
 const old=decorBonus();commitPurchaseUndo();g.coins-=price;g.bakerySpent+=price;g.bakeryLevel++;
 registerPurchaseUndo('Bakery Power',price,before);save();render();
 toast(`Bakery Power ×${multiplierLabel(old)} → ×${multiplierLabel(decorBonus())} · +${multiplierLabel(decorBonus()-old)} 👑 · Baker's Boost +${((decorBonus()/old-1)*100).toFixed(1)}%`);
 const panel=document.querySelector?.('.bakery-power');panel?.classList.add('power-purchased');return true;
}
function staffRate(){return earningUnit()/360}
function equipBest(mode){if(g.run&&!g.run.paused||!['final','base'].includes(mode))return false;if(g.autoEquip!=='off')g.autoEquip=mode;g.activeMenu=bestMenu(g.owned,g.menuSlots,mode);save();render();return true}
function setAutoEquip(mode,enabled){if(g.run||!['final','base'].includes(mode))return false;g.autoEquip=enabled?mode:g.autoEquip===mode?'off':g.autoEquip;save();render();return true}
function manualMenuAllowed(){if(g.run)return false;if(g.autoEquip!=='off'){toast('Turn Auto Equip off to choose your own menu.');return false}return true}

// The latest reversible purchase is persisted. Every dependent economy mutation invalidates it.
function undoSignature(){return JSON.stringify([g.coins,g.bakeryLevel,g.bakerySpent,g.menuSlots,g.activeMenu,g.owned,g.recipeCeilings,g.packages,g.ingredients,g.mastery,g.completed,g.autoEquip])}
function registerPurchaseUndo(label,cost,before){reconcileAutoEquip();g.purchaseUndo={id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${g.purchaseSequence=(g.purchaseSequence||0)+1}`,label,cost,before,expires:Date.now()+PURCHASE_UNDO_MS,signature:undoSignature()};paintPurchaseUndo()}
function commitPurchaseUndo(reason=''){if(!g.purchaseUndo)return;g.purchaseUndo=null;paintPurchaseUndo();if(reason)toast(`Purchase kept · ${reason}.`)}
function validatePurchaseUndo(){const tx=g.purchaseUndo;if(!tx)return;if(Date.now()>=tx.expires){g.purchaseUndo=null;paintPurchaseUndo()}else if(tx.signature!==undoSignature())commitPurchaseUndo('Your bakery changed after this purchase')}
function undoPurchase(id){
 validatePurchaseUndo();const tx=g.purchaseUndo;if(!tx||tx.id!==id)return false;
 g.purchaseUndo=null;Object.assign(g,tx.before);save();render();paintPurchaseUndo();toast(`${tx.label} undone · 🪙 ${fmt(tx.cost)} refunded.`);return true;
}
function paintPurchaseUndo(){
 const node=$('purchaseUndo');if(!node)return;const tx=g.purchaseUndo;
 node.hidden=!tx;if(tx)node.innerHTML=`<span>${tx.label} · 🪙 ${fmt(tx.cost)} <small>${Math.max(0,Math.ceil((tx.expires-Date.now())/1000))}s</small></span><button onclick="undoPurchase('${tx.id}')">Undo</button>`;
}
