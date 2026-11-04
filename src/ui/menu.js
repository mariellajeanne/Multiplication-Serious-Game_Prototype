/* Owned collection and sticky recipe details; selection is presentation state only. */
let selectedFoods=new Set(),multiSelect=false,hideUnequipped=false,menuTab='menu',foodHold=null,suppressFoodTap=null,foodReturnFocus=null;
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
 if(multiSelect){selectedFoods.has(uid)?selectedFoods.delete(uid):selectedFoods.add(uid)}else if(selectedFoods.size===1&&selectedFoods.has(uid)){closeFoodPanel();return}else selectedFoods=new Set([uid]);
 paintFoodPanel();document.querySelector?.(`.menu-grid [data-uid="${uid}"]`)?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
}
function openFoodItem(uid){menuTab='menu';if(modal)closeModal();if(!$('foodPanel'))render();selectedFoods=new Set([uid]);multiSelect=false;paintFoodPanel();foodReturnFocus=captureFocus(document.querySelector?.(`[data-uid="${uid}"] .food-card-target`));}
function closeFoodPanel(){selectedFoods.clear();multiSelect=false;paintFoodPanel();restoreFocus(foodReturnFocus);foodReturnFocus=null}
function toggleFoodSelection(){multiSelect=!multiSelect;selectedFoods.clear();foodReturnFocus=captureFocus(document.activeElement);paintFoodPanel();const button=document.querySelector?.('[data-focus="select-foods"]');button?.setAttribute('aria-pressed',String(multiSelect));if(button)button.textContent=multiSelect?'Done':'Select'}
function switchMenuTab(tab){const focus=captureFocus(document.activeElement);menuTab=tab;render();restoreFocus(focus)}
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
 g.activeMenu=equip?[...g.activeMenu,...adding.map(o=>o.uid)]:g.activeMenu.filter(uid=>!removing.some(o=>o.uid===uid));save();render();if(typeof feedbackPulse==='function')feedbackPulse(document.querySelector('.hud-boost'));toast(`${target.length} ${target.length===1?'food':'foods'} ${equip?'put on':'taken off'} your menu.`);return true;
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
 return `<section class="sticky-food-panel" aria-label="Selected food details"><button class="close food-panel-close" onclick="closeFoodPanel()" aria-label="Close food details">×</button><div class="food-panel-scroll">${multiSelect?`<div class="selection-tools"><button class="secondary" onclick="selectedFoods.clear();paintFoodPanel()">Deselect All</button><button class="secondary" onclick="selectAllFoods()">Select All</button><strong>${foods.length} selected</strong></div><div class="selected-food-list">${foods.map(o=>`<div>${foodArt(o.id)}<span><b>${F(o.id).name}</b><small>Mastery ${recipeMastery(o)} ♛ Available +${availableMastery(o)}</small></span><strong>×${multiplierLabel(foodValue(o))} 💎</strong></div>`).join('')}</div>`:foods.map(o=>{const f=F(o.id),avail=availableMastery(o),nextGain=foodValue({...o,mastery:recipeMastery(o)+1})-foodValue(o);return `<div class="recipe-detail">${foodArt(o.id)}<div class="recipe-detail-text"><h2>${f.name} ${rarityTag(f.rarity)}</h2><strong class="detail-contribution">×${multiplierLabel(foodValue(o))} 💎</strong><small>Mastery ${recipeMastery(o)} ♛${avail?` · <b class="mastery-ready-text">+${avail} ready · next +${multiplierLabel(nextGain)} 💎</b>`:''}</small>${avail?masteryBenefitMarkup(o):''}</div></div>`}).join('')}${!multiSelect&&g.completed>=5&&foods[0]?`<details class="recipe-more"><summary>More recipe options</summary><div class="btnrow"><button class="secondary" onclick="ingredientFusionInfo(${foods[0].uid})">Use ingredients</button></div></details>`:''}</div>${renderSelectionActions(state)}</section>`;
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
 showModal('Buy Recipe Mastery?',`<p>+1 Mastery for ${eligible.length} eligible ${eligible.length===1?'food':'foods'}. Other selected foods stay as they are.</p><div class="mastery-review">${eligible.map(o=>`<p><b>${F(o.id).name}</b>${masteryBenefitMarkup(o)}</p>`).join('')}</div><p>Total: <b>🪙 ${fmt(cost)}</b></p><button class="primary" ${g.coins<cost?'disabled':''} onclick="confirmSelectedMastery()">Buy +1 Mastery · 🪙 ${fmt(cost)}</button>`);
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
function renderKitchenTab(){return `<div class="kitchen-tab"><p>Kitchen tools multiply every equipped recipe.</p>${KITCHEN.map(k=>{const level=g.equipment[k.id]||0,cost=equipmentCost(k);return `<div class="itemcard"><h3>${k.icon} ${k.name}</h3><p>Level ${level}/${MAX_KITCHEN_LEVEL} · +${(k.bonus*100).toFixed(1)}% next upgrade</p><button class="primary" ${g.completed<2||level>=MAX_KITCHEN_LEVEL||g.coins<cost?'disabled':''} onclick="upgradeEquipment('${k.id}')">${g.completed<2?'Opens after 2 orders':`Upgrade · 🪙 ${fmt(cost)}`}</button></div>`}).join('')}</div>`}
function renderMenu(){
 const items=sortedMenuFoods(g.owned.filter(o=>!hideUnequipped||g.activeMenu.includes(o.uid))),slotsFull=g.menuSlots>=FOOD.length;
 return `<main class="menu-stage collection-stage">${renderBakeryBar()}${renderBakeryIdea()}<div class="menu-tabs" role="tablist"><button role="tab" aria-selected="${menuTab==='menu'}" onclick="switchMenuTab('menu')">🍽 Menu</button><button role="tab" aria-selected="${menuTab==='kitchen'}" onclick="switchMenuTab('kitchen')">🍳 Kitchen</button></div>${menuTab==='kitchen'?renderKitchenTab():`<div class="collection-toolbar"><span class="slot-chip" aria-label="${g.activeMenu.length} of ${g.menuSlots} menu slots used"><b>${g.activeMenu.length}/${g.menuSlots}</b> slots</span><button class="secondary" ${slotsFull?'disabled':''} onclick="buyMenuSlot()">${slotsFull?'All slots owned':`＋ Slot · 🪙 ${amountLabel(slotCost())}`}</button><span class="toolbar-spacer"></span><button class="secondary" aria-pressed="${hideUnequipped}" onclick="hideUnequipped=!hideUnequipped;render()">${hideUnequipped?'Show all':'On menu only'}</button><button class="secondary" data-focus="select-foods" aria-pressed="${multiSelect}" onclick="toggleFoodSelection()">${multiSelect?'Done':'Select'}</button><button class="secondary" onclick="equipBest('final')">Equip Best</button></div><div class="menu-grid" tabindex="0" aria-label="Owned foods, scroll to browse">${items.map(o=>renderFoodCard(o)).join('')}${g.activeMenu.length<g.menuSlots?'<button class="food-tile empty" onclick="chooseFoodForSlot()"><strong>+</strong><small>Add a food</small></button>':''}${!items.length?'<p>No foods in this view. Show all foods or open a package.</p>':''}</div><div id="foodPanel">${renderFoodPanel()}</div>`}</main>`;
}
function renderEquipBest(){return `<button class="secondary" onclick="equipBest('final')">Equip Best</button>`}
function showBoostInfo(){showModal("Baker's Boost",`<p>Equipped recipe contributions add up to Menu Boost. Kitchen tools improve that total. Bakery Power multiplies it to make Baker's Boost.</p><p>×${foodSum().toFixed(2)} recipes × ${kitchenBonus().toFixed(3)} kitchen × ${decorBonus().toFixed(3)} Bakery Power = <b>×${bakeryValue().toFixed(2)} 💎</b></p>`)}
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

function renderBakeryIdea(){
 const idea=bakeryIdeas()[0];if(!idea||idea.kind==='power')return '';
 const gap=Math.max(0,idea.cost-g.coins);
 return `<button class="bakery-idea" onclick="showBakeryIdea()"><span>Bakery idea · <b>${idea.label}</b><small>${idea.kind==='equip'?'Baker\'s Boost grows for free':`+${(idea.gain/bakeryValue()*100).toFixed(1)}% · 🪙 ${amountLabel(idea.cost)}${gap?` · ${amountLabel(gap)} to go`:' · Ready!'}`}</small></span><span aria-hidden="true">›</span></button>`;
}
function masteryBenefitMarkup(o){const p=masteryPreview(o);return `<small class="mastery-outcome">${p.after>p.before?`Baker's Boost ×${multiplierLabel(p.before)} → ×${multiplierLabel(p.after)} (+${((p.after/p.before-1)*100).toFixed(1)}%)`:'Put this recipe on your menu to improve earnings.'}</small>`}
function showBakeryIdea(){
 const idea=bakeryIdeas()[0];if(!idea)return;
 if(idea.kind==='equip'){equipBest('final');return}
 if(idea.kind==='mastery'){openFoodItem(idea.uid);return}
 if(idea.kind==='kitchen'){switchMenuTab('kitchen');return}
 const button=document.querySelector(idea.kind==='power'?'.bakery-power-buy':'.collection-toolbar>button');
 button?.scrollIntoView({block:'nearest'});button?.focus();if(typeof feedbackPulse==='function')feedbackPulse(button);
}
