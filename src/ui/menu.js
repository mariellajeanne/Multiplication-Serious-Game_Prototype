/* Active food menu: identity, next upgrade, and collection slots. */
function slotCost(){return Math.round(420*Math.pow(1.9,Math.max(0,g.menuSlots-4)))}
function buyMenuSlot(){if(g.run){toast('Finish your order first.');return}if(g.coins<slotCost()){toast('Earn more coins from an order.');return}g.coins-=slotCost();g.menuSlots++;save();render();toast('A new spot for something delicious!')}
function openFoodItem(uid){
 const o=g.owned.find(x=>x.uid===uid);if(!o)return;const f=F(o.id),cost=foodLevelCost(o),next=foodValue({...o,level:Math.min(3,o.level+1)});
 showModal(f.name,`<div class="food-detail r${f.rarity}">${foodArt(f.id)}<div>${rarityTag(f.rarity)}<h2>${f.name}</h2><div class="level-dots" aria-label="Level ${o.level} of 3">${[1,2,3].map(i=>`<span class="${i<=o.level?'filled':''}">★</span>`).join('')}</div><div class="value-preview"><strong>×${foodValue(o).toFixed(2)}</strong>${o.level<3?`<span>→</span><strong>×${next.toFixed(2)}</strong>`:'<span>Max level!</span>'}</div></div></div><button class="primary wide" ${o.level>=3||g.coins<cost||g.run?'disabled':''} onclick="upgradeFood(${uid})">${o.level>=3?'★ Fully leveled':`Level up · 🪙 ${fmt(cost)}`}</button>${o.level<3&&g.coins<cost?`<p class="need-coins">🪙 ${fmt(cost-g.coins)} more coins · try an order!</p>`:''}${g.completed>=5?`<details class="fusion-options"><summary>✦ Fusion · ${o.fusion}/3</summary><p>Combine to make this food stronger.</p><div class="btnrow"><button class="secondary" ${o.fusion>=3?'disabled':''} onclick="ingredientFusionInfo(${uid})">🧺 Use ingredients</button><button class="secondary" ${o.fusion>=3?'disabled':''} onclick="openFusion(${uid})">Same food + 🪙 ${fmt(fusionFee(o))}</button></div></details>`:''}<div class="detail-secondary"><button class="tertiary" onclick="${g.activeMenu.includes(uid)?`removeFoodPrompt(${uid})`:`assignFood(${uid})`}" ${!g.activeMenu.includes(uid)&&g.activeMenu.length>=g.menuSlots?'disabled':''}>${g.activeMenu.includes(uid)?'Remove from menu':'Add to menu'}</button><button class="tertiary" onclick="sellFoodPrompt(${uid})">Sell…</button></div>`);
}
function unassignFood(uid){if(g.run){toast('Finish your order first.');return}g.activeMenu=g.activeMenu.filter(x=>x!==uid);save();closeModal();toast('Food kept in your collection.')}
function chooseFoodForSlot(){
 const available=g.owned.filter(x=>!g.activeMenu.includes(x.uid));
 showModal('Add to your menu',available.length?`<p class="dialog-note">New foods grow your bakery. Only the strongest copy of each food counts.</p><div class="modalgrid food-choices">${available.map(o=>`<button class="itemcard" onclick="assignFood(${o.uid})">${foodArt(o.id)}<b>${F(o.id).name}</b>${rarityTag(F(o.id).rarity)}<strong>×${foodValue(o).toFixed(2)}</strong>${g.activeMenu.some(uid=>g.owned.find(x=>x.uid===uid)?.id===o.id)?'<small>Another copy is on your menu</small>':''}</button>`).join('')}</div>`:'<div class="empty-collection">🎁<h2>More food is on the way!</h2><p>Finish an order to open a package.</p><button class="primary" onclick="closeModal()">Pick an order</button></div>');
}
function assignFood(uid){if(g.run){toast('Finish your order first.');return}if(g.activeMenu.length>=g.menuSlots||g.activeMenu.includes(uid))return;const o=g.owned.find(x=>x.uid===uid);if(!o)return;g.activeMenu.push(uid);save();closeModal();toast(`${F(o.id).name} is on the menu!`)}
function sortedMenuFoods(foods){return [...foods].sort((a,b)=>F(b.id).rarity-F(a.id).rarity||foodValue(b)-foodValue(a)||a.uid-b.uid)}
function renderFoodCard(o,inventory=false){
  const f=F(o.id),levelCost=foodLevelCost(o),fusionFactor=[1,1.6,2.5,4][o.fusion];
  return `<article class="food-tile r${f.rarity}" data-uid="${o.uid}" data-tier="${o.fusion}" aria-label="${f.name}"><div class="food-value">×${foodValue(o).toFixed(2)} <span aria-hidden="true">🪙</span><small>Base ×${f.base.toFixed(2)}</small></div>${inventory?`<span class="equipped-label ${g.activeMenu.includes(o.uid)?'equipped':''}">${g.activeMenu.includes(o.uid)?'On menu':'In inventory'}</span>`:''}<div class="tier-banner">✦ ${RARITIES[f.rarity]}</div><button class="food-identity" onclick="openFoodItem(${o.uid})" aria-label="More options for ${f.name}">${foodArt(f.id)}<strong class="food-name">${f.name}</strong></button><div class="food-progress"><div><b>Lv. ${o.level}</b><small>+${(o.level-1)*20}%</small><button class="primary card-level" ${o.level>=3||g.coins<levelCost||g.run?'disabled':''} onclick="upgradeFood(${o.uid},true);${inventory?'openMenu()':''}">${o.level>=3?'Max level':`Level up <span>${fmt(levelCost)} 🪙</span>`}</button></div><div><b>Tier ${o.fusion}</b><small>×${fusionFactor.toFixed(2)}</small><button class="secondary card-fuse" ${o.fusion>=3||g.completed<5||g.run?'disabled':''} onclick="openFusion(${o.uid})">${o.fusion>=3?'Max tier':g.completed<5?'🔒 5 orders':`Fuse <span>${fmt(fusionFee(o))} 🪙</span>`}</button></div></div><div class="food-management"><button ${g.run?'disabled':''} onclick="${g.activeMenu.includes(o.uid)?`removeFoodPrompt(${o.uid})`:`assignFood(${o.uid})`}" ${!g.activeMenu.includes(o.uid)&&g.activeMenu.length>=g.menuSlots?'disabled':''}>${g.activeMenu.includes(o.uid)?'Remove':'Add to menu'}</button><button ${g.run?'disabled':''} onclick="sellFoodPrompt(${o.uid})">Sell…</button></div></article>`;

}
function removeFoodPrompt(uid){
 const o=g.owned.find(x=>x.uid===uid);if(!o||!g.activeMenu.includes(uid)||g.run)return;
 showModal('Remove from the menu?',`<div class="food-detail">${foodArt(o.id)}<div><h2>${F(o.id).name}</h2><strong>×${foodValue(o).toFixed(2)}</strong></div></div><p class="warning">This copy stops contributing to your Menu multiplier. Your food and all its upgrades stay in Food Inventory. You can add it again any time.</p><div class="btnrow"><button class="primary" onclick="closeModal()">Keep on menu</button><button class="secondary" onclick="unassignFood(${uid})">Remove from menu</button></div>`);
}
function renderMenu(){
 const items=sortedMenuFoods(g.activeMenu.map(uid=>g.owned.find(x=>x.uid===uid)).filter(Boolean));
 const tiles=items.map(o=>renderFoodCard(o)).join('');
 const empty=Array.from({length:Math.max(0,g.menuSlots-items.length)},()=>'<button class="food-tile empty" onclick="chooseFoodForSlot()"><span class="plus-mark">+</span><span class="slot-help">Add food</span></button>').join('');
 return `<main class="menu-stage"><nav class="food-navigation" aria-label="Food collection"><button onclick="openMenu()">🍞 Food Inventory <span>${g.owned.length}</span></button><button onclick="openIndex()">📖 Food Index <span>${g.discovered.length}/${FOOD.length}</span></button></nav><div class="value-hero menu-valuebar"><div class="menu-value"><h2>Menu</h2><span class="menu-divider" aria-hidden="true"></span><strong class="number" aria-label="Bakery Value Multiplier ${bakeryValue().toFixed(2)}">×${bakeryValue().toFixed(2)} <span aria-hidden="true">🪙</span></strong></div><div class="wallet" aria-label="Coin balance"><span aria-hidden="true">🪙</span><strong id="walletCoins">${fmt(g.coins)}</strong></div></div><div class="menu-grid"><div class="menu-slots">${empty}<button class="food-tile buy-slot" onclick="buyMenuSlot()"><span class="plus-mark">+</span><strong>Buy Slot</strong><span class="slot-price">🪙 ${fmt(slotCost())}</span></button></div>${tiles}</div></main>`;
}
/* Quantity means sequential existing one-copy/one-tier fusions, never a new rule. */
let fusionSelection=null;
function duplicateFusionPlan(o,count){
 const available=g.owned.filter(x=>x.id===o.id&&x.uid!==o.uid).length;
 const max=Math.min(3-o.fusion,available);
 if(!Number.isInteger(count)||count<1||count>max)return null;
 const fee=Array.from({length:count},(_,i)=>fusionFee({...o,fusion:o.fusion+i})).reduce((a,b)=>a+b,0);
 return {count,fee,nextTier:o.fusion+count,value:foodValue({...o,fusion:o.fusion+count}),available,max};
}
function openFusion(uid,count=1){
 const o=g.owned.find(x=>x.uid===uid);if(!o||o.fusion>=3)return;
 if(g.run||g.completed<5){toast('Fusion opens after 5 orders.');return}
 const available=g.owned.filter(x=>x.id===o.id&&x.uid!==uid).length,max=Math.min(3-o.fusion,available);
 count=Math.max(1,Math.min(max||1,Math.floor(Number(count)||1)));
 const plan=duplicateFusionPlan(o,count),fee=plan?.fee||fusionFee(o),nextTier=plan?.nextTier||o.fusion+1;
 fusionSelection={uid,count,tier:o.fusion};
 showModal('Fuse '+F(o.id).name,`<div class="fusion-dialog"><div class="fusion-food">${foodArt(o.id)}<h2>${F(o.id).name}</h2>${rarityTag(F(o.id).rarity)}</div><div class="fusion-plan"><div class="value-preview"><strong>×${foodValue(o).toFixed(2)}</strong><span>→</span><strong>×${foodValue({...o,fusion:nextTier}).toFixed(2)}</strong></div><h3>Tier ${o.fusion} → Tier ${nextTier}</h3><label for="fusionQty">Copies to use</label><div class="quantity-control"><button class="secondary" aria-label="Use one fewer copy" onclick="changeFusionQuantity(-1)" ${count<=1?'disabled':''}>−</button><input id="fusionQty" aria-label="Copies to fuse" type="number" min="1" max="${max||1}" value="${count}" ${max?'':'disabled'} onchange="openFusion(${uid},this.value)"><button class="secondary" aria-label="Use one more copy" onclick="changeFusionQuantity(1)" ${count>=max?'disabled':''}>+</button></div><button class="text-button" ${max?'':'disabled'} onclick="openFusion(${uid},${max||1})">All usable (${max})</button><p>${available} available · one copy per tier</p><div class="costrow"><span>Fusion fee${count>1?'s':''}</span><strong>${fmt(fee)} 🪙</strong></div></div></div><div class="fusion-actions"><button class="secondary" onclick="fusionSelection=null;closeModal()">Cancel</button><button class="primary" ${!plan||g.coins<fee?'disabled':''} onclick="submitDuplicateFusion()">Fuse · ${fmt(fee)} 🪙</button></div><div class="ingredient-alternative"><span>Keep your copies?</span><button class="text-button" onclick="fusionSelection=null;ingredientFusionInfo(${uid})">🧺 Use ingredients instead ↗</button></div>`);
}
function changeFusionQuantity(delta){if(fusionSelection)openFusion(fusionSelection.uid,fusionSelection.count+delta)}
function submitDuplicateFusion(){
 const selected=fusionSelection;if(!selected||g.run)return;
 const o=g.owned.find(x=>x.uid===selected.uid);
 if(!o||o.fusion!==selected.tier){fusionSelection=null;return}
 const plan=duplicateFusionPlan(o,selected.count);
 if(!plan||g.coins<plan.fee){openFusion(o.uid,selected.count);return}
 fusionSelection=null;
 for(let i=0;i<plan.count;i++)fuseDuplicate(o.uid);
 closeModal();
}
