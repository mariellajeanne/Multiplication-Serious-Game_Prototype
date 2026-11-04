/* Owned collection and sticky recipe details; selection is presentation state only. */
let selectedFoods=new Set(),multiSelect=false,hideUnequipped=false,foodHold=null,suppressFoodTap=null,foodReturnFocus=null;
function buyMenuSlot(){
 if(g.menuSlots>=FOOD.length||g.run&&!g.run.paused)return false;
 const cost=slotCost();if(g.coins<cost){toast(`Need ${fmt(cost-g.coins)} more coins for a menu slot.`);return false}
 const before={coins:g.coins,menuSlots:g.menuSlots,economyPeakBase:g.economyPeakBase};commitPurchaseUndo();g.coins-=cost;g.menuSlots++;
 registerPurchaseUndo('Menu slot',cost,before);save();render();return true;
}
function sortedMenuFoods(foods){return [...foods].sort((a,b)=>F(b.id).rarity-F(a.id).rarity||foodValue(b)-foodValue(a)||a.uid-b.uid)}
function renderFoodCard(o,inventory=false){
 const f=F(o.id),equipped=g.activeMenu.includes(o.uid),available=availableMastery(o),selected=selectedFoods.has(o.uid);
 return `<article class="food-tile compact-food r${f.rarity} ${equipped?'is-equipped':'is-unequipped'} ${selected?'is-selected':''}" data-uid="${o.uid}" aria-label="${f.name}">
 <button class="food-card-target" aria-pressed="${selected}" onclick="selectFood(${o.uid})" aria-label="${f.name}, ${rarityLabel(f.rarity)}, contribution ${foodValue(o).toFixed(2)}, Mastery ${recipeMastery(o)}, ${equipped?'equipped':'unequipped'}">
 <span class="food-card-top"><b>×${multiplierLabel(foodValue(o))} 💎</b><span>${f.rarity+1}★</span></span>
 ${foodArt(f.id)}<strong>${f.name}</strong><span class="food-card-rarity">${RARITIES[f.rarity]}</span>
 <span class="food-card-bottom"><span>${equipped?'On menu':'Unequipped'}</span><b>♛ ${recipeMastery(o)} ${available?`<span class="mastery-ready" title="${available} unlocked mastery upgrades" aria-label="${available} mastery upgrades available">↑</span>`:''}</b></span></button></article>`;
}
function selectFood(uid){
 if(suppressFoodTap===uid){suppressFoodTap=null;return}
 if(!g.owned.some(o=>o.uid===uid))return;
 if(!multiSelect)foodReturnFocus=captureFocus(document.querySelector?.(`[data-uid="${uid}"] .food-card-target`));
 if(multiSelect){selectedFoods.has(uid)?selectedFoods.delete(uid):selectedFoods.add(uid)}else selectedFoods=new Set([uid]);
 paintFoodPanel();
}
function openFoodItem(uid){if(modal)closeModal();if(!$('foodPanel'))render();selectedFoods=new Set([uid]);multiSelect=false;paintFoodPanel();foodReturnFocus=captureFocus(document.querySelector?.(`[data-uid="${uid}"] .food-card-target`));}
function closeFoodPanel(){selectedFoods.clear();multiSelect=false;paintFoodPanel();restoreFocus(foodReturnFocus);foodReturnFocus=null}
function toggleFoodSelection(){multiSelect=!multiSelect;selectedFoods.clear();foodReturnFocus=captureFocus(document.activeElement);paintFoodPanel();const button=document.querySelector?.('[data-focus="select-foods"]');button?.setAttribute('aria-pressed',String(multiSelect));if(button)button.textContent=multiSelect?'Done selecting':'Select Foods'}
function selectAllFoods(){multiSelect=true;selectedFoods=new Set(g.owned.filter(o=>!hideUnequipped||g.activeMenu.includes(o.uid)).map(o=>o.uid));paintFoodPanel()}
function selectionState(){const foods=g.owned.filter(o=>selectedFoods.has(o.uid));return {foods,adding:foods.filter(o=>!g.activeMenu.includes(o.uid)),removing:foods.filter(o=>g.activeMenu.includes(o.uid)),eligible:foods.filter(o=>availableMastery(o)>0)}}
function selectionEquip(equip){
 if(g.run&&!g.run.paused)return false;
 const {adding,removing}=selectionState(),target=equip?adding:removing;if(!target.length)return false;
 if(equip){
  const ids=[...g.activeMenu.map(uid=>g.owned.find(o=>o.uid===uid)?.id),...adding.map(o=>o.id)];
  if(new Set(ids).size!==ids.length){toast('Equip one copy of each recipe. Unequip its other copy first.');return false}
  if(g.activeMenu.length+adding.length>g.menuSlots){toast(`Need ${g.activeMenu.length+adding.length-g.menuSlots} more menu slot(s) to equip this selection.`);return false}
 }
 commitPurchaseUndo('Equipped recipes changed');g.autoEquip='off';
 g.activeMenu=equip?[...g.activeMenu,...adding.map(o=>o.uid)]:g.activeMenu.filter(uid=>!removing.some(o=>o.uid===uid));save();render();if(typeof feedbackPulse==='function')feedbackPulse(document.querySelector('.boost-counter'));toast(`${target.length} ${target.length===1?'food':'foods'} ${equip?'put on':'taken off'} your menu.`);return true;
}
function assignFood(uid){selectedFoods=new Set([uid]);return selectionEquip(true)}
function unassignFood(uid){selectedFoods=new Set([uid]);return selectionEquip(false)}
function removeFoodPrompt(uid){return unassignFood(uid)}
function chooseFoodForSlot(){hideUnequipped=false;render();toast('Tap a food, then Equip. Long-press to select several.')}
function selectionBlockedReason(state){
 const {foods,adding}=state;if(!foods.length)return 'Tap foods to select them. Long-press also selects several.';
 if(g.run&&!g.run.paused)return 'Return to orders before changing the menu.';
 const ids=[...g.activeMenu.map(uid=>g.owned.find(o=>o.uid===uid)?.id),...adding.map(o=>o.id)];
 if(new Set(ids).size!==ids.length)return 'One copy of each recipe can be on the menu. Take its other copy off first.';
 const missing=g.activeMenu.length+adding.length-g.menuSlots;
 return missing>0?`Buy ${missing} more menu ${missing===1?'slot':'slots'} to put all selected foods on your menu.`:'';
}
function renderSelectionActions(state){
 const {foods,adding,removing,eligible}=state,total=eligible.reduce((sum,o)=>sum+foodLevelPrice(o),0),mixed=adding.length&&removing.length;
 const blocked=selectionBlockedReason(state),masteryNote=!eligible.length&&foods.length?'Find another copy to unlock more Recipe Mastery.':eligible.length&&g.coins<total?`Need ${fmt(total-g.coins)} more coins for Mastery.`:'';
 return `<div class="food-action-area"><p class="food-action-status" role="status">${blocked||masteryNote||`${foods.length} selected · ${Math.max(0,g.menuSlots-g.activeMenu.length)} empty menu slots`}</p>${foods.length?`<div class="food-panel-actions"><button class="secondary" onclick="requestSelectedSale()">Sell…</button><button class="primary" ${!eligible.length||g.coins<total?'disabled':''} onclick="requestSelectedMastery()">+1 ♛ ${multiSelect?'Selected':'Mastery'} · 🪙 ${amountLabel(total)}</button>${adding.length?`<button class="secondary" ${blocked?'disabled':''} onclick="selectionEquip(true)">${mixed?`Equip (${adding.length})`:multiSelect?'Equip Selected':'Equip'}<small aria-hidden="true">Put on Menu</small></button>`:''}${removing.length?`<button class="secondary" onclick="selectionEquip(false)">${mixed?`Unequip (${removing.length})`:multiSelect?'Unequip Selected':'Unequip'}<small aria-hidden="true">Take off Menu</small></button>`:''}</div>`:''}</div>`;
}
function renderFoodPanel(){
 const state=selectionState(),{foods}=state;if(!foods.length&&!multiSelect)return '';
 return `<section class="sticky-food-panel" aria-label="Selected food details"><button class="close food-panel-close" onclick="closeFoodPanel()" aria-label="Close food details">×</button><div class="food-panel-scroll">${multiSelect?`<div class="selection-tools"><button class="secondary" onclick="selectedFoods.clear();paintFoodPanel()">Deselect All</button><button class="secondary" onclick="selectAllFoods()">Select All</button><strong>${foods.length} selected</strong></div><div class="selected-food-list">${foods.map(o=>`<div>${foodArt(o.id)}<span><b>${F(o.id).name}</b><small>Mastery ${recipeMastery(o)} ♛ Available +${availableMastery(o)}</small></span><strong>×${multiplierLabel(foodValue(o))} 💎</strong></div>`).join('')}</div>`:foods.map(o=>{const f=F(o.id),next=foodValue({...o,mastery:recipeMastery(o)+1})-foodValue(o);return `<div class="recipe-detail"><div>${foodArt(o.id)}${rarityTag(f.rarity)}</div><div><h2>${f.name}</h2><strong class="detail-contribution">×${multiplierLabel(foodValue(o))} 💎</strong><small>Base ×${multiplierLabel(tierBase(o))} 💎</small><p><b>Recipe Mastery: ${recipeMastery(o)} ♛</b><br>Mastery bonus +${multiplierLabel(foodValue(o)-tierBase(o))} 💎</p><div class="mastery-availability">Available +${availableMastery(o)} ♛ · Next +${multiplierLabel(next)} 💎</div></div></div>`}).join('')}${!multiSelect&&g.completed>=5&&foods[0]?`<details class="recipe-more"><summary>More recipe options</summary><div class="btnrow"><button class="secondary" onclick="ingredientFusionInfo(${foods[0].uid})">Use ingredients</button></div></details>`:''}${!multiSelect?'<p class="selection-hint">☝ Long-press any food to select several.</p>':''}</div>${renderSelectionActions(state)}</section>`;
}
function paintFoodPanel(){
 selectedFoods=new Set([...selectedFoods].filter(uid=>g.owned.some(o=>o.uid===uid)));
 const panel=$('foodPanel');if(panel)panel.innerHTML=renderFoodPanel();
 for(const card of document.querySelectorAll?.('.menu-grid [data-uid]')||[]){const selected=selectedFoods.has(Number(card.dataset.uid));card.classList.toggle('is-selected',selected);card.querySelector('button')?.setAttribute('aria-pressed',String(selected))}
}
let masteryConfirmation=null,saleConfirmation=null;
function requestSelectedMastery(){
 const {eligible}=selectionState();if(!eligible.length)return;
 const cost=eligible.reduce((sum,o)=>sum+foodLevelPrice(o),0);
 masteryConfirmation={uids:eligible.map(o=>o.uid),cost,fingerprint:JSON.stringify(eligible.map(o=>[o.uid,recipeMastery(o),g.recipeCeilings[o.id],foodLevelPrice(o)]))};
 showModal('Buy Recipe Mastery?',`<p>+1 Mastery for ${eligible.length} eligible ${eligible.length===1?'food':'foods'}. Other selected foods stay as they are.</p><p>Total: <b>🪙 ${fmt(cost)}</b></p><button class="primary" ${g.coins<cost?'disabled':''} onclick="confirmSelectedMastery()">Buy +1 Mastery · 🪙 ${fmt(cost)}</button>`);
}
function confirmSelectedMastery(){const pending=masteryConfirmation;masteryConfirmation=null;if(!pending)return false;const ok=buyMastery(pending.uids,pending);if(ok){closeModal();if(typeof feedbackPulse==='function')feedbackPulse(document.querySelector('.detail-contribution'))}return ok}
function requestSelectedSale(){
 const {foods}=selectionState();if(!foods.length)return;
 saleConfirmation={uids:foods.map(o=>o.uid),fingerprint:inventoryFingerprint(foods)};
 const total=foods.reduce((sum,o)=>sum+resalePrice(o),0);
 showModal(`Sell ${foods.length} food${foods.length===1?'':'s'}?`,`<p>This permanently removes the selected foods and their purchased Mastery. Your discoveries and unlocked recipe ceilings stay.</p><div class="selection-review">${foods.map(o=>`<div><b>${F(o.id).name}</b><strong>🪙 ${fmt(resalePrice(o))}</strong></div>`).join('')}</div><button class="secondary" onclick="closeModal()">Keep foods</button><button class="primary" onclick="confirmSelectedSale()">Sell · 🪙 ${fmt(total)}</button>`);
}
function confirmSelectedSale(){
 const tx=saleConfirmation;saleConfirmation=null;if(!tx||g.run&&!g.run.paused)return false;
 const foods=tx.uids.map(uid=>g.owned.find(o=>o.uid===uid));if(foods.some(o=>!o)||inventoryFingerprint(foods)!==tx.fingerprint){toast('Foods changed. Review the sale again.');return false}
 commitPurchaseUndo('Foods sold');g.coins+=foods.reduce((sum,o)=>sum+resalePrice(o),0);g.owned=g.owned.filter(o=>!tx.uids.includes(o.uid));g.activeMenu=g.activeMenu.filter(uid=>!tx.uids.includes(uid));selectedFoods.clear();save();closeModal();return true;
}
function renderMenu(){
 const items=sortedMenuFoods(g.owned.filter(o=>!hideUnequipped||g.activeMenu.includes(o.uid)));
 return `<main class="menu-stage collection-stage"><header class="menu-header"><div class="menu-brand"><span class="menu-bakery-icon" aria-hidden="true">${bakeryIcon('bakery')}</span><h1>My Panaderya</h1><button class="menu-settings iconbtn" onclick="openSettings()" aria-label="Settings">${bakeryIcon('settings')}</button></div><div class="menu-counters"><button class="hud-counter boost-counter" onclick="showBoostInfo()" aria-label="Baker's Boost" aria-haspopup="dialog"><span id="bakerBoost">×${multiplierLabel(bakeryValue())}</span> <span aria-hidden="true">💎</span></button><button class="hud-counter coins-counter" onclick="showCoinsInfo()" aria-label="Coins" aria-haspopup="dialog"><span id="walletCoins">${amountLabel(g.coins)}</span> <span aria-hidden="true">🪙</span></button></div></header><div class="collection-toolbar"><b>${g.activeMenu.length}/${g.menuSlots} Slots Used</b><button class="secondary" ${g.menuSlots>=FOOD.length?'disabled':''} onclick="buyMenuSlot()">${g.menuSlots>=FOOD.length?'All recipe slots owned':`+1 Slot · 🪙 ${amountLabel(slotCost())}`}</button><button class="secondary" aria-pressed="${hideUnequipped}" onclick="hideUnequipped=!hideUnequipped;render()">${hideUnequipped?'Show All':'Hide Unequipped'}</button><button class="secondary" data-focus="select-foods" aria-pressed="${multiSelect}" onclick="toggleFoodSelection()">${multiSelect?'Done selecting':'Select Foods'}</button><button class="secondary" onclick="equipBest('final')">Equip Best</button></div><div class="menu-grid" tabindex="0" aria-label="Owned foods, scroll to browse">${items.map(o=>renderFoodCard(o)).join('')}${g.activeMenu.length<g.menuSlots?'<button class="food-tile empty" onclick="chooseFoodForSlot()"><strong>+</strong><small>Choose a food to equip</small></button>':''}${!items.length?'<p>No foods in this view. Show all foods or open a package.</p>':''}</div><div id="foodPanel">${renderFoodPanel()}</div></main>`;
}
function renderEquipBest(){return `<button class="secondary" onclick="equipBest('final')">Equip Best</button>`}
function boostComponentLabel(value){return new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)}
function showBoostInfo(){showModal("Baker's Boost 💎",`<div class="boost-components"><div><h3>Total Menu 💎</h3><strong id="menuBoostComponent">${boostComponentLabel(Math.max(1,foodSum()))}</strong></div><span class="boost-times" aria-label="multiplied by">×</span><div><h3>Bakery Power 👑</h3><strong id="bakeryPowerComponent">${boostComponentLabel(decorBonus())}</strong></div></div>`,'hud-info-modal')}
function showCoinsInfo(){showModal('Coins 🪙',`<div class="coins-help"><p>Complete orders to earn coins!</p><p>Your Baker's Boost multiplies the coins you earn.</p></div>`,'hud-info-modal')}
document.addEventListener?.('pointerdown',event=>{
 const card=event.target.closest?.('.menu-grid [data-uid]');if(!card)return;
 const uid=Number(card.dataset.uid);foodHold={x:event.clientX,y:event.clientY,uid,timer:setTimeout(()=>{multiSelect=true;selectedFoods.add(uid);suppressFoodTap=uid;paintFoodPanel()},500)};
});
function cancelFoodHold(){if(foodHold)clearTimeout(foodHold.timer);foodHold=null}
document.addEventListener?.('pointermove',event=>{if(foodHold&&Math.hypot(event.clientX-foodHold.x,event.clientY-foodHold.y)>12)cancelFoodHold()},{passive:true});
document.addEventListener?.('pointerup',cancelFoodHold);document.addEventListener?.('pointercancel',cancelFoodHold);
document.addEventListener?.('keydown',event=>{const card=event.target.closest?.('.menu-grid [data-uid]');if(card&&event.shiftKey&&(event.key===' '||event.key==='Enter')){event.preventDefault();multiSelect=true;selectedFoods.add(Number(card.dataset.uid));paintFoodPanel()}});
document.addEventListener?.('contextmenu',event=>{if(event.target.closest?.('.menu-grid [data-uid]'))event.preventDefault()});
let fusionSelection=null;
function outputPreview(o){return `<div class="fusion-output">${foodArt(o.id)}<div><b>${F(o.id).name}</b><span>Tier ${foodTier(o)} · Mastery ${recipeMastery(o)}</span><span>Base ×${tierBase(o).toFixed(2)} +${Math.round((masteryFactor(recipeMastery(o))-1)*100)}% = <b>×${foodValue(o).toFixed(2)}</b></span><small>Paid investment: ${fmt(o.spent||0)} coins${o.baseCarry>0?` · includes ×${o.baseCarry.toFixed(2)} retained base`:''}</small></div></div>`}
function openFusion(uid,donorUid=null){
 if(g.uniqueFoodsVersion>=1){ingredientFusionInfo(uid);return}
 const o=g.owned.find(x=>x.uid===uid);if(!o||foodTier(o)>=5)return;
 if(g.run||g.completed<5){toast('Fusion opens after 5 orders.');return}
 const donors=g.owned.filter(x=>x.id===o.id&&x.uid!==uid&&foodTier(x)<5).sort((a,b)=>foodTier(a)-foodTier(b)||a.uid-b.uid);
 const donor=donors.find(x=>x.uid===Number(donorUid))||donors[0],plan=donor?duplicateFusionPlan(o,donor.uid):null;
 fusionSelection=plan?{plan,fingerprint:fusionFingerprint([o,donor])}:null;
 showModal('Fuse '+F(o.id).name,`<div class="fusion-review">${outputPreview(o)}<label class="fusion-donor" for="fusionDonor">Use 1 other copy <select id="fusionDonor" onchange="openFusion(${uid},this.value)" ${donors.length?'':'disabled'}>${donors.map(d=>`<option value="${d.uid}" ${d.uid===donor?.uid?'selected':''}>Tier ${foodTier(d)} · Level ${d.level} · ×${foodValue(d).toFixed(2)} · copy #${d.uid}</option>`).join('')||'<option>No eligible copy</option>'}</select></label>${donor?`<h3>Inputs · 1 of each</h3>${outputPreview(donor)}`:''}${plan?`<h3>All results · ${plan.outputs.length} ${plan.outputs.length===1?'food':'foods'}</h3>${plan.outputs.map(outputPreview).join('')}<div class="costrow"><span>Total food value</span><b>×${plan.totalBefore.toFixed(2)} → ×${plan.totalAfter.toFixed(2)} (+${((plan.totalAfter/plan.totalBefore-1)*100).toFixed(1)}%)</b></div><p>Transfers ${fmt(plan.investment-plan.fee)} paid coins + ${fmt(plan.fee)} fee into these results. ${plan.levelCredits?`${plan.levelCredits} saved Level credit${plan.levelCredits===1?'':'s'} for future ${F(o.id).name} upgrades.`:'All invested Level steps transfer into the results.'} Extra results stay safely in inventory; no new menu slot is bought.</p>`:'<p>Find another copy of this food, or use ingredients. Tier 5 copies cannot be consumed.</p>'}<div class="fusion-actions"><button class="secondary" onclick="fusionSelection=null;closeModal()">Cancel</button><button class="primary" ${!plan||g.coins<plan.fee?'disabled':''} onclick="submitDuplicateFusion()">Fuse · ${fmt(plan?.fee||fusionFee(o))} 🪙</button></div><div class="ingredient-alternative"><button class="text-button" onclick="fusionSelection=null;ingredientFusionInfo(${uid})">Use ingredients instead ↗</button></div></div>`);
}
function submitDuplicateFusion(){
 const selection=fusionSelection;fusionSelection=null;if(!selection)return false;
 const applied=applyDuplicateFusion(selection.plan,selection.fingerprint);
 if(applied)openMenu();else toast('These foods or prices changed. Please review the fusion again.');return applied;
}
