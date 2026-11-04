/* Dialogs expose one primary action; advanced systems use existing unlocks. */
function showTutorial(){
 g.helpSeen=true;
 if(!g.run){g.tutorialArrows=true;save();closeModal();document.querySelector('.ticket')?.focus();toast('Choose an order. Follow the golden trail.');}
 else{save();closeModal();toast(g.tutorialArrows?'Follow the golden trail.':'Switch Guide ON for a hint.');}
}
function skipTutorial(){g.helpSeen=true;save();closeModal()}
let inventorySelection=new Set(),inventoryIntent='manage',pendingInventoryAction=null;
function inventoryActionState(){
 const selected=g.owned.filter(o=>inventorySelection.has(o.uid));
 const adding=selected.filter(o=>!g.activeMenu.includes(o.uid));
 const removing=selected.filter(o=>g.activeMenu.includes(o.uid));
 const slots=Math.max(0,g.menuSlots-g.activeMenu.length);
 return {selected,adding,removing,slots,canAdd:!g.run&&g.autoEquip==='off'&&adding.length>0&&adding.length<=slots,canRemove:!g.run&&g.autoEquip==='off'&&removing.length>0,canSell:!g.run&&selected.length>0};
}
function inventorySelectionMessage(state=inventoryActionState()){
 if(g.run)return 'Finish your order before changing foods.';
 if(g.autoEquip!=='off')return 'Auto Equip chooses the menu. Turn it off for manual Add/Remove; selling still works.';
 if(!state.selected.length)return `Select foods using the checkboxes. ${state.slots} ${state.slots===1?'slot':'slots'} left on your menu.`;
 if(state.adding.length>state.slots)return `${state.selected.length} selected. Only ${state.slots} empty ${state.slots===1?'slot':'slots'} — select fewer foods to add.`;
 return `${state.selected.length} selected · ${state.removing.length} on menu · ${state.slots} empty ${state.slots===1?'slot':'slots'}`;
}
function toggleInventoryFood(uid,checked){
 if(!g.owned.some(o=>o.uid===uid))return;
 const selected=checked===undefined?!inventorySelection.has(uid):!!checked;
 if(selected)inventorySelection.add(uid);else inventorySelection.delete(uid);
 const card=document.querySelector?.(`.inventory-grid [data-uid="${uid}"]`);
 card?.classList.toggle('is-selected',selected);
 const checkbox=card?.querySelector('input[type="checkbox"]');if(checkbox)checkbox.checked=selected;
 const state=inventoryActionState();
 for(const [id,enabled] of [['inventoryAdd',state.canAdd],['inventoryRemove',state.canRemove],['inventorySell',state.canSell]]){const button=$(id);if(button)button.disabled=!enabled;}
 const status=$('inventorySelectionStatus');if(status)status.textContent=inventorySelectionMessage(state);
}
function openMenu(intent='manage',keepSelection=false){pendingInventoryAction=null;inventoryIntent=intent==='add'?'add':'manage';if(!keepSelection)inventorySelection.clear();if(modal)closeModal();hideUnequipped=false;if(!keepSelection)closeFoodPanel();render();}
function addInventorySelection(){
 const state=inventoryActionState();if(!state.canAdd)return false;
 g.activeMenu.push(...state.adding.map(o=>o.uid));inventorySelection.clear();save();render();
 if(inventoryIntent==='add')closeModal();else openMenu(inventoryIntent,true);
 toast(`${state.adding.length} ${state.adding.length===1?'food added':'foods added'} to your menu!`);return true;
}
function inventoryFingerprint(foods){return JSON.stringify(foods.map(o=>[o.uid,o.id,o.level,o.fusion,o.spent,o.baseCarry||0,o.resaleBase??null,g.activeMenu.includes(o.uid),g.autoEquip]))}
function requestInventoryAction(kind){
 const state=inventoryActionState();
 if(kind!=='sell'&&kind!=='remove'||kind==='sell'&&!state.canSell||kind==='remove'&&!state.canRemove)return false;
 const foods=kind==='sell'?state.selected:state.removing;
 pendingInventoryAction={kind,uids:foods.map(o=>o.uid),fingerprint:inventoryFingerprint(foods)};
 const price=foods.reduce((sum,o)=>sum+resalePrice(o),0);
 showModal(kind==='sell'?`Sell ${foods.length} ${foods.length===1?'food':'foods'}?`:'Remove selected foods?',`<div class="selection-review">${foods.map(o=>`<div>${foodArt(o.id)}<span><b>${F(o.id).name}</b><small>Level ${o.level} · Tier ${o.fusion}</small></span>${kind==='sell'?`<strong>🪙 ${fmt(resalePrice(o))}</strong>`:''}</div>`).join('')}</div><p class="warning">${kind==='sell'?'These whole copies and their upgrades will be sold and removed from your menu. Discoveries stay in Food Index.':'These copies stop contributing to the Menu multiplier. Your food and upgrades stay in Food Inventory.'}</p>${kind==='sell'?`<div class="costrow"><span>Total sale · includes existing upgrade refunds</span><strong>+${fmt(price)} 🪙</strong></div>`:''}<div class="btnrow"><button class="secondary" onclick="openMenu(inventoryIntent,true)">Cancel</button><button class="primary" onclick="confirmInventoryAction()">${kind==='sell'?`Sell · ${fmt(price)} 🪙`:'Remove from menu'}</button></div>`);return true;
}
function confirmInventoryAction(){
 const action=pendingInventoryAction;pendingInventoryAction=null;if(!action||g.run)return false;
 const foods=action.uids.map(uid=>g.owned.find(o=>o.uid===uid));
 if(foods.some(o=>!o)||inventoryFingerprint(foods)!==action.fingerprint){openMenu(inventoryIntent,true);toast('These foods changed. Please review your selection again.');return false;}
 const ids=new Set(action.uids);
 if(action.kind==='sell'){g.coins+=foods.reduce((sum,o)=>sum+resalePrice(o),0);g.owned=g.owned.filter(o=>!ids.has(o.uid));}
 g.activeMenu=g.activeMenu.filter(uid=>!ids.has(uid));inventorySelection.clear();save();render();openMenu(inventoryIntent,true);
 toast(action.kind==='sell'?'Foods sold. Your discoveries are safe in Food Index.':'Foods removed. All copies and upgrades are safe in Inventory.');return true;
}

let ingredientFusionSelection=null;
function ingredientFusionInfo(uid){
 const o=g.owned.find(x=>x.uid===uid);if(!o||foodTier(o)>=5||g.completed<5||g.run)return;
 const needs=ingredientNeeds(o),fee=fusionFee(o),missing=fusionIngredientCost(o),result={...o,fusion:foodTier(o)+1,spent:(o.spent||0)+fee+needs.reduce((sum,x)=>sum+x.need*x.price,0)};
 ingredientFusionSelection={uid,fingerprint:fusionFingerprint([o]),total:fee+missing,needs:JSON.stringify(needs)};
 showModal('Fuse with ingredients',`<h3>Before</h3>${outputPreview(o)}<h3>Result</h3>${outputPreview(result)}<p>+${((foodValue(result)/foodValue(o)-1)*100).toFixed(1)}% food value. Keeps Recipe Mastery ${recipeMastery(o)}, all prior investment and retained base.</p>${needs.map(x=>`<div class="costrow"><span><b>${x.name}</b><br><small>${x.have}/${x.need} in your pantry</small></span><strong>${x.have>=x.need?'Ready':fmt((x.need-x.have)*x.price)+' coins'}</strong></div>`).join('')}<div class="costrow"><span>Fusion fee</span><b>${fmt(fee)} coins</b></div><p>Missing ingredients: ${fmt(missing)} coins. Already-paid pantry ingredients transfer their value into this food.</p><button class="primary wide" ${g.coins<missing+fee?'disabled':''} onclick="submitIngredientFusion()">Buy missing + fuse · ${fmt(missing+fee)} coins</button><button class="tertiary" onclick="ingredientFusionSelection=null;openFoodItem(${uid})">Back to food</button>`);
}
function submitIngredientFusion(){const selection=ingredientFusionSelection;ingredientFusionSelection=null;if(!selection)return false;const applied=fuseIngredients(selection.uid,selection);if(!applied)toast('Ingredients or prices changed. Please review again.');return applied}
function openIngredients(){if(g.completed<5){toast('Ingredients open after 5 orders.');return}
 showModal('Ingredient pantry',`<p class="dialog-note">For food fusion. Prices stay the same.</p><div class="modalgrid">${INGREDIENTS.map(([name,icon,price])=>`<div class="itemcard"><div class="itemtop"><span style="font-size:32px">${icon}</span><div><h3>${name}</h3><span class="stock-pill">${g.ingredients[name]||0} owned</span></div></div><div class="btnrow"><button class="secondary" ${g.coins<price?'disabled':''} onclick="buyIngredient('${name}',1)">1 · 🪙 ${price}</button><button class="secondary" ${g.coins<price*5?'disabled':''} onclick="buyIngredient('${name}',5)">5 · 🪙 ${price*5}</button></div></div>`).join('')}</div><details class="pantry-recipes"><summary>Use ingredients for recipes</summary><div class="btnrow">${g.owned.filter(o=>foodTier(o)<5).map(o=>`<button class="secondary" ${g.run?'disabled':''} onclick="ingredientFusionInfo(${o.uid})">${F(o.id).name}</button>`).join('')}</div></details>`);
}
function openDecor(){if(modal)closeModal();document.querySelector('.bakery-power')?.scrollIntoView({block:'nearest'});}
function openStaff(){if(g.completed<6){toast('Helpers open after 6 orders.');return}
 const running=g.staff.until>Date.now(),rate=running?g.staff.rate:staffRate(),fee=Math.ceil(staffRate()*36);
 showModal('A helping hand',`<div class="introbox"><div class="introart">👩‍🍳</div><h2>${running?'Your helper is baking!':'Meet your bakery helper'}</h2><div class="tool-preview" style="justify-content:center">🪙 ${rate.toFixed(1)}<small> / second</small></div><p>A 2-minute shift. Complete orders for coins. Packages are at the Package Counter.</p><b id="staffTimer">${running?Math.ceil((g.staff.until-Date.now())/1000)+'s remaining':'Ready to help'}</b><button class="primary" ${running||g.coins<fee||g.run?'disabled':''} onclick="hireStaff()">${running?'Working…':`Hire · 🪙 ${fmt(fee)}`}</button></div>`);
}
function openIndex(){showModal('Food Index',`<p class="dialog-note">${g.discovered.length}/${FOOD.length} discovered · discoveries stay, even after selling.</p><div class="modalgrid food-choices">${FOOD.map(f=>{const seen=g.discovered.includes(f.id),owned=g.owned.filter(o=>o.id===f.id);return `<div class="itemcard">${seen?foodArt(f.id):'<div class="locked-food" aria-hidden="true">?</div>'}<h3>${seen?f.name:'A new discovery'}</h3>${rarityTag(f.rarity)}<small>${seen?`${owned.length} owned`:'Find in a package'}</small>${owned.length?`<button class="secondary" onclick="openFoodItem(${owned[0].uid})">View food</button>`:''}</div>`}).join('')}</div>`)}
function openModes(){
 const descriptions={normal:'Take your time. Unlimited retries.',lookup:'Keep multiplication facts close by.',blindfold:'Recall products before placing digits.',streak:'Build your best chain of correct pairs.',bullseye:'Practice careful, accurate multiplication.',survival:'Limited lives. Choose your challenge.'};
 showModal('Choose how to play',`<div class="modalgrid">${MODE.map(m=>`<div class="itemcard"><div class="itemtop"><span style="font-size:32px">${m.icon}</span><div><h3>${m.name}</h3><small>${g.completed<m.unlock?`${m.unlock} orders to unlock`:g.mode===m.id?'✓ Playing this mode':"Base coins \u00d7 Baker's Boost"}</small></div></div><p>${descriptions[m.id]}</p><button class="${g.mode===m.id?'secondary':'primary'}" ${g.completed<m.unlock||g.run?'disabled':''} onclick="chooseMode('${m.id}')">${g.mode===m.id?'Selected':g.completed<m.unlock?'🔒 Locked':'Play '+m.name}</button></div>`).join('')}</div>${g.completed>=6?`<div class="settings-row"><b>Survival lives</b><div class="btnrow">${[1,3,5].map(n=>`<button class="${g.lives===n?'primary':'secondary'}" ${g.run?'disabled':''} aria-pressed="${g.lives===n}" onclick="chooseLives(${n});openModes()">${n} ♥</button>`).join('')}</div></div><p class="dialog-note">Choose the lives you want. Normal is always here.</p>`:''}`);
}
function openSettings(){showModal('Make yourself at home',`<div class="settings-row"><b><span>🔊</span>Sounds</b><button class="secondary" aria-pressed="${g.sound}" onclick="toggleSfx();openSettings()">${g.sound?'ON':'OFF'}</button></div><div class="settings-row"><b><span>☝</span>Guide</b><button class="secondary" aria-pressed="${g.tutorialArrows}" onclick="toggleArrows();openSettings()">${g.tutorialArrows?'ON':'OFF'}</button></div><div class="settings-row"><b><span>🎵</span>Music</b><button class="secondary" aria-pressed="${g.musicOn}" onclick="toggleMusic()">${g.musicOn?'ON':'OFF'}</button></div><div class="settings-row"><b>Need a hand?</b><button class="secondary" onclick="showTutorial()">Show me</button></div>${g.completed>=3?`<div class="btnrow">${g.completed>=6?'<button class="secondary" onclick="openStaff()">Helper</button>':''}<button class="secondary" onclick="openModes()">Game modes</button>${g.completed>=5?'<button class="secondary" onclick="openIngredients()">Ingredient pantry</button>':''}</div>`:''}<details class="adult-tools"><summary>For grown-ups · testing & reset</summary><p>These controls change saved progress.</p><div class="btnrow"><button class="secondary" onclick="unlockDemo()">Demo bakery</button><button class="secondary" onclick="resetGame()">Erase progress…</button></div></details>`)}
function openProbabilities(){
 const odds=ticketProbabilities(ticketLuckMastery());
 showModal('Coin Reward Tier Odds',`<p>\u{1f340} Permanent Luck grows as you complete orders. It increases the chance of higher coin tiers on new Order Tickets.</p><div class="package-odds-table">${odds.map((p,i)=>`<div><b>${i+1}\u2605 ${COIN_TIERS[i]}</b><span>${probabilityLabel(p).replace('<','&lt;')}</span></div>`).join('')}</div><p>Base coins \u00d7 Baker's Boost = total coins. A ticket keeps its tier until it is finished or replaced.</p><p>Packages are available from the Package Counter. Permanent Luck does not change package contents.</p>`);
}
function sellFoodPrompt(uid){const o=g.owned.find(x=>x.uid===uid);if(!o)return;showModal('Sell this whole food?',`<div class="food-detail">${foodArt(o.id)}<div><h2>${F(o.id).name}</h2><p>Level ${o.level} · Fusion ${o.fusion}</p><div class="tool-preview">🪙 +${fmt(resalePrice(o))}</div></div></div><div class="warning">This removes this copy and its upgrades from your menu. Your discovery stays in Food Index.</div><p class="dialog-note" style="margin-top:12px">${fmt(baseResale(o))} base + ${fmt(Math.floor(o.spent*.5))} upgrade refund</p><div class="btnrow"><button class="primary" onclick="closeModal()">Keep my food</button><button class="secondary" onclick="sellFood(${uid})">Sell for 🪙 ${fmt(resalePrice(o))}</button></div>`)}
function unlockDemo(){if(g.run){toast('Finish your current order before changing bakery upgrades.');return;}if(!confirm('Demo shortcut: unlock every feature and add test coins? You can reset afterward.'))return;g.completed=Math.max(g.completed,16);g.mastery=Math.max(g.mastery,28);g.permanentLuck=Math.floor(g.mastery/4);g.coins+=100000;for(const id of ['spanish-bread','spanish-bread','ensaymada','ensaymada','ube-pandesal','hopia']){g.owned.push({uid:g.uidNext++,id,level:1,fusion:1,spent:0});if(!g.discovered.includes(id))g.discovered.push(id)}g.activeMenu=[...new Set(g.owned.map(x=>x.id))].slice(0,g.menuSlots).map(id=>g.owned.find(x=>x.id===id).uid);g.board=[];refillBoard();save();closeModal();toast('🧪 All systems unlocked! Sample Filipino foods and coins added.');}
function resetGame(){if(!confirm('Erase all saved My Panaderya progress?'))return;try{localStorage.removeItem('panaderyaQuestV2');localStorage.removeItem('panaderyaQuestV2BeforeProgression')}catch(_){}g=fresh();refillBoard();save();closeModal();render();showTutorial()}
function toggleMusic(){g.musicOn=!g.musicOn;save();if(g.musicOn){startMusic()}else stopMusic();openSettings()}
function startMusic(){if(musicTimer)return;try{music=new(window.AudioContext||window.webkitAudioContext)();let i=0;musicTimer=setInterval(()=>{if(!g.musicOn)return;const extra=g.decor>=2?2:0;const seq=[60,64,67,72,67,64,62,67,65,62,60,67];const midi=seq[i++%seq.length]+(extra&&i%8===0?12:0);const osc=music.createOscillator(),gain=music.createGain();osc.type='sine';osc.frequency.value=440*Math.pow(2,(midi-69)/12);gain.gain.setValueAtTime(.0001,music.currentTime);gain.gain.exponentialRampToValueAtTime(.017,music.currentTime+.04);gain.gain.exponentialRampToValueAtTime(.0001,music.currentTime+.32);osc.connect(gain).connect(music.destination);osc.start();osc.stop(music.currentTime+.34)},400)}catch(e){g.sound=false;toast('Music unavailable in this browser.')}}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}if(music){music.close();music=null}}

/* One package workspace. Stock/foods persist; revealed slots live only in this session. */
const PACKAGE_CAPACITY=50;
let packageType=0,packageQuantity=1,packagePurchaseReview=null,packageQuote=null;
let packageSession=null,packageSessionSequence=0;
function endPackageSession(){packageSession=null;packageQuote=null;packagePurchaseReview=null}
function ensurePackageSession(){
 if(!packageSession)packageSession={id:++packageSessionSequence,sequence:0,view:0,busy:false,slots:Array.from({length:8},()=>[])};
 for(let rank=0;rank<8;rank++){
  const slots=packageSession.slots[rank],unopened=slots.filter(slot=>!slot.reward);
  let excess=unopened.length-g.packages[rank];
  while(excess-->0){const slot=unopened.pop();slots.splice(slots.indexOf(slot),1)}
  for(let i=unopened.length;i<g.packages[rank];i++)slots.push({id:`${packageSession.id}-${++packageSession.sequence}`,rank,reward:null});
 }
 return packageSession;
}
function packageRoom(rank=packageType){return Math.max(0,PACKAGE_CAPACITY-g.packages[rank])}
function packageQuantityMaximum(){return packageUnlocked(packageType)?Math.min(packageRoom(),Math.floor(g.coins/packagePrice(packageType))):0}
function foodOddsMarkup(rank){return `<div class="package-food-odds">${packageProbabilities(rank).map((p,i)=>`<div class="package-odds-row r${i}"><span>${i+1}\u2605 ${RARITIES[i]}</span><span class="package-food-bar" aria-hidden="true"><i style="width:${p*100}%"></i></span><b>${probabilityLabel(p).replace('<','&lt;')}</b></div>`).join('')}</div>`}
function packageBuyLabel(){return `BUY ${packageQuantity} ${PACKAGE_TYPES[packageType].toUpperCase()} PACKAGES`}
function quotePackagePurchase(){
 const session=ensurePackageSession();
 packageQuote={id:`${session.id}-buy-${++session.sequence}`,rank:packageType,count:packageQuantity,price:packagePrice(packageType),stock:g.packages[packageType]};
 packageQuote.total=packageQuote.price*packageQuote.count;
 return packageQuote;
}
function renderPackageTypes(){return PACKAGE_SHOP.map(type=>{
 const unlocked=packageUnlocked(type.rank);
 return `<button class="package-type package-type-card p${type.rank} ${type.rank===packageType?'chosen':''} ${unlocked?'':'locked'}" data-package-type="${type.rank}" aria-pressed="${type.rank===packageType}" aria-label="${type.rank+1} star ${type.name} package${unlocked?'':', needs higher Bakery Power'}" onclick="openPackages('buy',${type.rank})"><span class="package-card-art">${packageArt()}${unlocked?`<b class="package-card-price">${amountLabel(packagePrice(type.rank))} \u{1fa99}</b>`:'<span class="package-locked-label">NEEDS HIGHER<br><strong>BAKERY POWER \u{1f451}</strong></span>'}<span class="package-card-stars" aria-hidden="true">${'\u2605'.repeat(type.rank+1)}</span></span><strong class="package-card-name">${type.rank+1}\u2605 ${type.name.toUpperCase()}</strong></button>`;
 }).join('')}
function renderPackageSlots(){return packageSession.slots[packageType].map(slot=>slot.reward?renderOpenedPackage(slot.reward,slot.id):`<button class="package-open-slot package-type p${packageType}" data-package-token="${slot.id}" aria-label="Open one ${PACKAGE_TYPES[packageType]} package" onclick="openPackageSlot(${packageType},'${slot.id}')">${packageArt()}<span aria-hidden="true">${'\u2605'.repeat(packageType+1)}</span></button>`).join('')}
function renderPackageWorkspace(){
 const session=ensurePackageSession(),max=packageQuantityMaximum();packageQuantity=max?clamp(packageQuantity||1,1,max):0;
 const quote=quotePackagePurchase(),rank=packageType;
 session.view++;session.viewId=`${session.id}-view-${session.view}`;
 return `<div class="package-workspace"><section class="package-types-column" aria-label="Package types"><h2>PACKAGES</h2><nav class="package-type-list" aria-label="Choose a package type" tabindex="0">${renderPackageTypes()}</nav></section><section class="package-purchase-column" aria-label="Package purchasing"><h2 id="packageSelectedHeading">${rank+1}\u2605 ${PACKAGE_TYPES[rank].toUpperCase()} PACKAGE</h2><section class="package-odds-section" aria-label="Food item odds"><h3>FOOD ITEM ODDS</h3><div id="packageOdds">${foodOddsMarkup(rank)}</div></section><section class="package-order-section" aria-label="Order packages"><h3>ORDER PACKAGES</h3><div class="package-order-controls"><div class="package-purchase-form"><div class="package-quantity-summary"><div class="package-quantity-card"><label for="packageQuantity">NO. OF ${rank+1}\u2605 PACKAGES</label><output id="packageQuantityLabel">${packageQuantity}</output><span id="packageCapacity" aria-label="Selected quantity / available package spaces">${packageQuantity}/${packageRoom()}</span></div><b id="packageCost" class="package-cost-badge">${fmt(quote.total)} \u{1fa99}</b></div><div class="package-quantity-controls"><button id="packageMinus" class="secondary" ${packageQuantity<=1?'disabled':''} onclick="setPackageQuantity(packageQuantity-1)" aria-label="One fewer package">\u22121</button><button id="packageMinusFive" class="secondary" ${packageQuantity<=1?'disabled':''} onclick="setPackageQuantity(packageQuantity-5)" aria-label="Five fewer packages">\u22125</button><input id="packageQuantity" type="range" min="${max?1:0}" max="${Math.max(1,max)}" value="${packageQuantity}" ${!max?'disabled':''} oninput="setPackageQuantity(this.value)" aria-label="Purchase quantity"><button id="packagePlus" class="secondary" ${packageQuantity>=max?'disabled':''} onclick="setPackageQuantity(packageQuantity+1)" aria-label="One more package">+1</button><button id="packagePlusFive" class="secondary" ${packageQuantity>=max?'disabled':''} onclick="setPackageQuantity(packageQuantity+5)" aria-label="Five more packages">+5</button></div><button id="packageMax" class="secondary package-max" ${!max?'disabled':''} onclick="setPackageQuantity(packageQuantityMaximum())">MAX AFFORDABLE</button></div><button id="packageBuy" class="primary package-buy" ${!max?'disabled':''} onclick="requestPackagePurchase('${quote.id}')"><span id="packageBuyLabel">${packageBuyLabel()}</span><strong id="packageBuyTotal">${fmt(quote.total)} \u{1fa99}</strong></button></div></section></section><section class="package-opening-column" aria-label="Opening packages"><h2 id="packageOpeningHeading">OPEN ${rank+1}\u2605 PACKAGES</h2><div class="package-opening-grid" id="packageOpeningGrid" tabindex="0" aria-label="${PACKAGE_TYPES[rank]} packages and opened foods">${renderPackageSlots()}</div><div class="package-opening-footer"><button id="packageOpenAll" class="package-open-all" ${!g.packages[rank]?'disabled':''} onclick="unboxAllPackages('${session.viewId}')">OPEN ALL PACKAGES</button></div></section></div>`;
}
function paintPackageWorkspace(focus=null){
 const list=document.querySelector?.('.package-type-list'),grid=$('packageOpeningGrid'),scroll=[list?.scrollTop||0,grid?.scrollTop||0];
 const html=renderPackageWorkspace(),body=document.querySelector?.('.package-shop-modal .modalbody');
 if(body&&modal?.variant==='package-shop-modal'){modal.html=html;body.innerHTML=html;clearNotifications()}
 else showModal('Packages',html,'package-shop-modal');
 const nextList=document.querySelector?.('.package-type-list'),nextGrid=$('packageOpeningGrid');
 if(nextList)nextList.scrollTop=scroll[0];if(nextGrid)nextGrid.scrollTop=scroll[1];
 // Repainting keeps pointer/keyboard focus on the action or its revealed result.
 if(focus&&typeof requestAnimationFrame==='function')requestAnimationFrame(()=>{
  const target=document.querySelector(`[data-package-token="${focus}"]`)||$(focus);target?.focus?.({preventScroll:true});
 });
}
// Keep the established entry signature for Package Counter links; buying and opening are simultaneous now.
function openPackages(tab='buy',rank=packageType){
 if(!Number.isInteger(Number(rank))||Number(rank)<0||Number(rank)>7)return false;
 if(!packageSession||packageType!==Number(rank))packageQuantity=1;
 packageType=Number(rank);packagePurchaseReview=null;paintPackageWorkspace();return true;
}
function setPackageQuantity(value){
 const max=packageQuantityMaximum();packageQuantity=max?clamp(Math.floor(Number(value)||1),1,max):0;
 const quote=quotePackagePurchase(),input=$('packageQuantity');
 if(input){input.min=max?1:0;input.max=Math.max(1,max);input.value=packageQuantity;input.disabled=!max}
 const texts={packageQuantityLabel:packageQuantity,packageCapacity:`${packageQuantity}/${packageRoom()}`,packageCost:`${fmt(quote.total)} \u{1fa99}`,packageBuyLabel:packageBuyLabel(),packageBuyTotal:`${fmt(quote.total)} \u{1fa99}`};
 for(const [id,value] of Object.entries(texts)){const el=$(id);if(el)el.textContent=value}
 for(const [id,disabled] of [['packageMinus',packageQuantity<=1],['packageMinusFive',packageQuantity<=1],['packagePlus',packageQuantity>=max],['packagePlusFive',packageQuantity>=max],['packageMax',!max],['packageBuy',!max]]){const button=$(id);if(button)button.disabled=disabled}
 const buy=$('packageBuy');if(buy)buy.setAttribute('onclick',`requestPackagePurchase('${quote.id}')`);
}
function packageStockIsCurrent(){
 try{const latest=JSON.parse(localStorage.getItem('panaderyaQuestV2'));if((latest?.packageRevision||0)!==(g.packageRevision||0)){toast('Packages changed in another tab. Reload to continue.');return false}}catch(_){}
 return true;
}
function requestPackagePurchase(id=packageQuote?.id){
 if(!packageQuote||packageQuote.id!==id)return false;
 packagePurchaseReview=packageQuote;packageQuote=null;return confirmPackagePurchase();
}
function confirmPackagePurchase(){
 const tx=packagePurchaseReview;packagePurchaseReview=null;
 if(!tx||packageSession?.busy||tx.rank!==packageType||tx.count!==packageQuantity||!Number.isInteger(tx.count)||tx.count<1||tx.count>packageRoom(tx.rank)||!packageUnlocked(tx.rank)||tx.price!==packagePrice(tx.rank)||tx.total!==tx.price*tx.count||tx.stock!==g.packages[tx.rank]||g.coins<tx.total||!packageStockIsCurrent())return false;
 const backup=JSON.stringify(g);commitPurchaseUndo('Packages purchased');g.coins-=tx.total;g.packages[tx.rank]+=tx.count;g.packageRevision=(g.packageRevision||0)+1;
 if(!save()){g=JSON.parse(backup);migrateFrame11(g);paintPackageWorkspace('packageBuy');return false}
 render();paintPackageWorkspace('packageBuy');return true;
}
function openPackageSlot(rank,id){
 if(rank!==packageType||!packageSession)return false;
 const slot=packageSession.slots[rank].find(item=>item.id===id);
 return slot&&!slot.reward?commitPackageOpening(rank,[slot],id):false;
}
function unboxPackages(rank,count){
 if(!Number.isInteger(rank)||rank<0||rank>7||!Number.isInteger(count)||count<1||g.packages[rank]<count)return false;
 packageType=rank;const session=ensurePackageSession();
 return commitPackageOpening(rank,session.slots[rank].filter(slot=>!slot.reward).slice(0,count));
}
function unboxAllPackages(viewId=null){
 if(!packageSession||viewId!==null&&viewId!==packageSession.viewId)return false;
 return unboxPackages(packageType,g.packages[packageType]);
}
function commitPackageOpening(rank,slots,focus='packageOpenAll'){
 const session=packageSession;
 if(!session||session.busy||!slots.length||slots.length>g.packages[rank]||slots.some(slot=>slot.reward||!session.slots[rank].includes(slot))||!packageStockIsCurrent())return false;
 const backup=JSON.stringify(g),rewards=[];session.busy=true;
 try{
  commitPurchaseUndo('Packages opened');g.packages[rank]-=slots.length;g.packageRevision=(g.packageRevision||0)+1;
  for(const slot of slots){const legacy=g.legacyPackageFoods?.[rank]?.shift();rewards.push(discoverFood(Number.isInteger(legacy)?pick(FOOD.filter(food=>food.rarity===legacy)):drawFood(rank)))}
  if(!save()){g=JSON.parse(backup);migrateFrame11(g);return false}
  // Only successful durable transactions reveal foods. Replayed slot IDs are spent.
  slots.forEach((slot,i)=>slot.reward=rewards[i]);
 }catch(error){g=JSON.parse(backup);migrateFrame11(g);throw error}
 finally{session.busy=false}
 render();paintPackageWorkspace(focus);return true;
}
