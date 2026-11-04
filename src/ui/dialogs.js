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
function openMenu(intent='manage',keepSelection=false){pendingInventoryAction=null;inventoryIntent=intent==='add'?'add':'manage';if(!keepSelection)inventorySelection.clear();if(modal)closeModal();menuTab='menu';hideUnequipped=false;if(!keepSelection)closeFoodPanel();render();}
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
 showModal('Ingredient pantry',`<p class="dialog-note">For food fusion. Prices stay the same.</p><div class="modalgrid">${INGREDIENTS.map(([name,icon,price])=>`<div class="itemcard"><div class="itemtop"><span style="font-size:32px">${icon}</span><div><h3>${name}</h3><span class="stock-pill">${g.ingredients[name]||0} owned</span></div></div><div class="btnrow"><button class="secondary" ${g.coins<price?'disabled':''} onclick="buyIngredient('${name}',1)">1 · 🪙 ${price}</button><button class="secondary" ${g.coins<price*5?'disabled':''} onclick="buyIngredient('${name}',5)">5 · 🪙 ${price*5}</button></div></div>`).join('')}</div>`);
}
function openKitchen(){if(g.completed<2){toast('Kitchen opens after 2 orders.');return}
 showModal('A better kitchen',`<p class="dialog-note">Every tool multiplies the value of all menu foods. Upgrade prices remember your best menu. Levels 0–20.</p><div class="modalgrid">${KITCHEN.map(k=>{const level=g.equipment[k.id]||0,cost=equipmentCost(k),factor=Math.pow(1+k.bonus,level);return `<div class="itemcard"><div class="itemtop"><span style="font-size:36px">${k.icon}</span><div><h3>${k.name}</h3><span>Level ${level}/${MAX_KITCHEN_LEVEL}</span></div></div><div class="tool-preview"><b>+${((factor-1)*100).toFixed(1)}%</b>${level<MAX_KITCHEN_LEVEL?`<small>→ +${((factor*(1+k.bonus)-1)*100).toFixed(1)}%</small>`:''}</div><p>Menu ×${bakeryValue().toFixed(2)}${level<MAX_KITCHEN_LEVEL?` → ×${(bakeryValue()*(1+k.bonus)).toFixed(2)} (+${(k.bonus*100).toFixed(1)}%)`:''}</p><div class="progress"><div class="bar" style="width:${level/MAX_KITCHEN_LEVEL*100}%"></div></div><button class="primary" ${level>=MAX_KITCHEN_LEVEL||g.coins<cost||g.run?'disabled':''} onclick="upgradeEquipment('${k.id}')">${level>=MAX_KITCHEN_LEVEL?'Fully upgraded':`${level?'Upgrade':'Buy'} · ${fmt(cost)} coins`}</button></div>`}).join('')}</div>`);
}
function openDecor(){if(modal)closeModal();document.querySelector('.bakery-power')?.scrollIntoView({block:'nearest'});}
function openStaff(){if(g.completed<6){toast('Helpers open after 6 orders.');return}
 const running=g.staff.until>Date.now(),rate=running?g.staff.rate:staffRate(),fee=Math.ceil(staffRate()*36);
 showModal('A helping hand',`<div class="introbox"><div class="introart">👩‍🍳</div><h2>${running?'Your helper is baking!':'Meet your bakery helper'}</h2><div class="tool-preview" style="justify-content:center">🪙 ${rate.toFixed(1)}<small> / second</small></div><p>A 2-minute shift. Orders also earn food packages and practice stars.</p><b id="staffTimer">${running?Math.ceil((g.staff.until-Date.now())/1000)+'s remaining':'Ready to help'}</b><button class="primary" ${running||g.coins<fee||g.run?'disabled':''} onclick="hireStaff()">${running?'Working…':`Hire · 🪙 ${fmt(fee)}`}</button></div>`);
}
function openIndex(){showModal('Food Index',`<p class="dialog-note">${g.discovered.length}/${FOOD.length} discovered · discoveries stay, even after selling.</p><div class="modalgrid food-choices">${FOOD.map(f=>{const seen=g.discovered.includes(f.id),owned=g.owned.filter(o=>o.id===f.id);return `<div class="itemcard">${seen?foodArt(f.id):'<div class="locked-food" aria-hidden="true">?</div>'}<h3>${seen?f.name:'A new discovery'}</h3>${rarityTag(f.rarity)}<small>${seen?`${owned.length} owned`:'Find in a package'}</small>${owned.length?`<button class="secondary" onclick="openFoodItem(${owned[0].uid})">View food</button>`:''}</div>`}).join('')}</div>`)}
function openModes(){
 const descriptions={normal:'Take your time. Unlimited retries.',lookup:'Keep multiplication facts close by.',blindfold:'The same worksheet with a coin bonus.',streak:'A chain of correct pairs boosts coins.',bullseye:'Accuracy affects your final coins.',survival:'Limited lives. Choose your challenge.'};
 showModal('Choose how to play',`<div class="modalgrid">${MODE.map(m=>`<div class="itemcard"><div class="itemtop"><span style="font-size:32px">${m.icon}</span><div><h3>${m.name}</h3><small>${g.completed<m.unlock?`${m.unlock} orders to unlock`:g.mode===m.id?'✓ Playing this mode':`×${m.id==='survival'?modeMultipleForLives(g.lives):m.base} base coins`}</small></div></div><p>${descriptions[m.id]}</p><button class="${g.mode===m.id?'secondary':'primary'}" ${g.completed<m.unlock||g.run?'disabled':''} onclick="chooseMode('${m.id}')">${g.mode===m.id?'Selected':g.completed<m.unlock?'🔒 Locked':'Play '+m.name}</button></div>`).join('')}</div>${g.completed>=6?`<div class="settings-row"><b>Survival lives</b><div class="btnrow">${[1,3,5].map(n=>`<button class="${g.lives===n?'primary':'secondary'}" ${g.run?'disabled':''} aria-pressed="${g.lives===n}" onclick="chooseLives(${n});openModes()">${n} ♥</button>`).join('')}</div></div><p class="dialog-note">Fewer lives, more potential coins. Normal is always here.</p>`:''}`);
}
function modeMultipleForLives(lives){return {1:4,3:2.6,5:1.8}[lives]||2.6}
function openSettings(){showModal('Make yourself at home',`<div class="settings-row"><b><span>🔊</span>Sounds</b><button class="secondary" aria-pressed="${g.sound}" onclick="toggleSfx();openSettings()">${g.sound?'ON':'OFF'}</button></div><div class="settings-row"><b><span>☝</span>Guide</b><button class="secondary" aria-pressed="${g.tutorialArrows}" onclick="toggleArrows();openSettings()">${g.tutorialArrows?'ON':'OFF'}</button></div><div class="settings-row"><b><span>🎵</span>Music</b><button class="secondary" aria-pressed="${g.musicOn}" onclick="toggleMusic()">${g.musicOn?'ON':'OFF'}</button></div><div class="settings-row"><b>Need a hand?</b><button class="secondary" onclick="showTutorial()">Show me</button></div>${g.completed>=3?`<div class="btnrow">${g.completed>=6?'<button class="secondary" onclick="openStaff()">Helper</button>':''}<button class="secondary" onclick="openModes()">Game modes</button>${g.completed>=5?'<button class="secondary" onclick="openIngredients()">Ingredient pantry</button>':''}</div>`:''}<details class="adult-tools"><summary>For grown-ups · testing & reset</summary><p>These controls change saved progress.</p><div class="btnrow"><button class="secondary" onclick="unlockDemo()">Demo bakery</button><button class="secondary" onclick="resetGame()">Erase progress…</button></div></details>`)}
function openProbabilities(){
 const odds=ticketProbabilities(g.mastery);
 showModal('Ticket Package Odds',`<p>🍀 Ticket Luck grows from completed orders and never decreases for mistakes. It changes the package types offered on new tickets.</p><div class="package-odds-table">${odds.map((p,i)=>`<div><b>${PACKAGE_TYPES[i]}</b><span>${probabilityLabel(p).replace('<','&lt;')}</span></div>`).join('')}</div><p>Totals 100% before rounding. Tickets do not currently apply adaptive rank restrictions.</p><p>A package type measures Luck, not the rarity of its contents. Each package randomizes its food rarity using the distribution shown in Buy Packages.</p><p>During an order, correct math actions increase Package Luck: more chances for extra packages. These chances do not change a package type's food-rarity distribution.</p>`);
}
function showPackageOdds(rank){const node=$('packageOdds');if(node)node.innerHTML=foodOddsMarkup(Number(rank))}
function sellFoodPrompt(uid){const o=g.owned.find(x=>x.uid===uid);if(!o)return;showModal('Sell this whole food?',`<div class="food-detail">${foodArt(o.id)}<div><h2>${F(o.id).name}</h2><p>Level ${o.level} · Fusion ${o.fusion}</p><div class="tool-preview">🪙 +${fmt(resalePrice(o))}</div></div></div><div class="warning">This removes this copy and its upgrades from your menu. Your discovery stays in Food Index.</div><p class="dialog-note" style="margin-top:12px">${fmt(baseResale(o))} base + ${fmt(Math.floor(o.spent*.5))} upgrade refund</p><div class="btnrow"><button class="primary" onclick="closeModal()">Keep my food</button><button class="secondary" onclick="sellFood(${uid})">Sell for 🪙 ${fmt(resalePrice(o))}</button></div>`)}
function unlockDemo(){if(g.run){toast('Finish your current order before changing bakery upgrades.');return;}if(!confirm('Demo shortcut: unlock every feature and add test coins? You can reset afterward.'))return;g.completed=Math.max(g.completed,16);g.mastery=Math.max(g.mastery,28);g.permanentLuck=Math.floor(g.mastery/4);g.coins+=100000;for(const id of ['spanish-bread','spanish-bread','ensaymada','ensaymada','ube-pandesal','hopia']){g.owned.push({uid:g.uidNext++,id,level:1,fusion:1,spent:0});if(!g.discovered.includes(id))g.discovered.push(id)}g.activeMenu=[...new Set(g.owned.map(x=>x.id))].slice(0,g.menuSlots).map(id=>g.owned.find(x=>x.id===id).uid);g.board=[];refillBoard();save();closeModal();toast('🧪 All systems unlocked! Sample Filipino foods and coins added.');}
function resetGame(){if(!confirm('Erase all saved My Panaderya progress?'))return;try{localStorage.removeItem('panaderyaQuestV2');localStorage.removeItem('panaderyaQuestV2BeforeProgression')}catch(_){}g=fresh();refillBoard();save();closeModal();render();showTutorial()}
function toggleMusic(){g.musicOn=!g.musicOn;save();if(g.musicOn){startMusic()}else stopMusic();openSettings()}
function startMusic(){if(musicTimer)return;try{music=new(window.AudioContext||window.webkitAudioContext)();let i=0;musicTimer=setInterval(()=>{if(!g.musicOn)return;const extra=g.decor>=2?2:0;const seq=[60,64,67,72,67,64,62,67,65,62,60,67];const midi=seq[i++%seq.length]+(extra&&i%8===0?12:0);const osc=music.createOscillator(),gain=music.createGain();osc.type='sine';osc.frequency.value=440*Math.pow(2,(midi-69)/12);gain.gain.setValueAtTime(.0001,music.currentTime);gain.gain.exponentialRampToValueAtTime(.017,music.currentTime+.04);gain.gain.exponentialRampToValueAtTime(.0001,music.currentTime+.32);osc.connect(gain).connect(music.destination);osc.start();osc.stop(music.currentTime+.34)},400)}catch(e){g.sound=false;toast('Music unavailable in this browser.')}}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}if(music){music.close();music=null}}

/* Coin-only package purchasing and saved unboxing stock. No storage limit. */
let packageTab='buy',packageType=0,packageQuantity=1,packagePurchaseReview=null;
function foodOddsMarkup(rank){return `<div class="food-odds">${packageProbabilities(rank).map((p,i)=>`<span>${RARITIES[i]} <b>${probabilityLabel(p).replace('<','&lt;')}</b></span>`).join('')}</div>`}
function packageQuantityMaximum(){return packageTab==='buy'?Math.min(1000,Math.floor(g.coins/packagePrice(packageType))):g.packages[packageType]}
function showPackageUnlock(rank){const upgrades=PACKAGE_SHOP[rank].unlock-g.bakeryLevel;showModal(`${PACKAGE_TYPES[rank]} Packages`, `<div class="package-selected package-type p${rank}">${packageArt()}<div><h3>Keep growing your bakery</h3><p>Buy ${upgrades} more Bakery Power upgrade${upgrades===1?'':'s'} to unlock ${PACKAGE_TYPES[rank]} packages.</p><p>Unlocks at Bakery Power ×${powerLabel(bakeryFactor(PACKAGE_SHOP[rank].unlock))}.</p></div></div><button class="secondary" onclick="openPackages('buy',${packageType})">Back to packages</button>`)}
function openPackages(tab=packageTab,rank=packageType){
 packageTab=tab;packageType=clamp(Number(rank)||0,0,7);packageQuantity=1;packagePurchaseReview=null;
 const unlocked=PACKAGE_SHOP.filter(t=>packageUnlocked(t.rank)),locked=PACKAGE_SHOP.find(t=>!packageUnlocked(t.rank)),stock=g.packages.reduce((a,b)=>a+b,0);
 if(tab==='buy'&&!packageUnlocked(packageType))packageType=unlocked.at(-1).rank;
 if(tab==='unbox'&&!g.packages[packageType])packageType=Math.max(0,g.packages.findIndex(n=>n>0));
 const rankNow=packageType,price=packagePrice(rankNow),max=packageQuantityMaximum();if(!max)packageQuantity=0;
 showModal('Bakery Packages',`<div class="package-shop-tabs"><button class="secondary" aria-pressed="${tab==='buy'}" onclick="openPackages('buy')">Buy Packages</button><button class="secondary" aria-pressed="${tab==='unbox'}" onclick="openPackages('unbox')">Unbox Packages · ${stock}</button></div>${tab==='buy'?`<div class="package-type-list">${[...unlocked,...locked?[locked]:[]].map(t=>`<button class="package-type p${t.rank} ${t.rank===rankNow?'chosen':''} ${packageUnlocked(t.rank)?'':'locked'}" aria-pressed="${t.rank===rankNow}" onclick="${packageUnlocked(t.rank)?`openPackages('buy',${t.rank})`:`showPackageUnlock(${t.rank})`}">${packageArt()}<b>${t.name}</b><small>${packageUnlocked(t.rank)?`🪙 ${amountLabel(packagePrice(t.rank))}`:'Locked · Tap to see how'}</small></button>`).join('')}</div>`:`<div class="package-type-list">${PACKAGE_TYPES.map((name,i)=>g.packages[i]?`<button class="package-type p${i} ${i===rankNow?'chosen':''}" aria-pressed="${i===rankNow}" onclick="openPackages('unbox',${i})">${packageArt()}<b>${name}</b><span>${g.packages[i]} saved</span></button>`:'').join('')||'<p>Your shelf is empty. Buy packages or complete an order.</p>'}</div>`}<div class="package-selected package-type p${rankNow}">${packageArt()}<div><h3>${PACKAGE_TYPES[rankNow]} · Luck type</h3><p>A surprise food inside. ${PACKAGE_TYPES[rankNow]} does not guarantee ${RARITIES[rankNow]} food.</p></div></div><p class="package-discovery-chance"><b>New recipe chance: ${probabilityLabel(packageDiscoveryChance(rankNow)).replace('<','&lt;')}</b><small>Collected recipes unlock optional Mastery instead.</small></p><details><summary>Food rarity odds inside ${PACKAGE_TYPES[rankNow]}</summary>${foodOddsMarkup(rankNow)}</details><label class="package-quantity-label" for="packageQuantity">How many? <output id="packageQuantityLabel">${packageQuantity}</output></label><div class="package-quantity"><button id="packageMinus" class="secondary" aria-label="One fewer package" disabled onclick="setPackageQuantity(packageQuantity-1)">−</button><input id="packageQuantity" type="range" min="${max?1:0}" max="${Math.max(1,max)}" value="${packageQuantity}" ${!max?'disabled':''} oninput="setPackageQuantity(this.value)" aria-label="Package quantity"><button id="packagePlus" class="secondary" aria-label="One more package" ${max<=1?'disabled':''} onclick="setPackageQuantity(packageQuantity+1)">+</button><button id="packageMax" class="secondary" ${!max?'disabled':''} onclick="setPackageQuantity(packageQuantityMaximum())">MAX</button></div><small class="quantity-help">${tab==='buy'?'MAX = the most you can afford, up to 1,000 at a time.':`MAX = all saved ${PACKAGE_TYPES[rankNow]} packages.`}</small><p id="packageCost">${tab==='buy'?`Total 🪙 ${fmt(price*packageQuantity)}${max?'':' · Not enough coins'}`:`${g.packages[rankNow]} available to open`}</p>${tab==='buy'?`<button id="packageBuy" class="primary wide" ${!max?'disabled':''} onclick="requestPackagePurchase()">Buy & save ${packageQuantity} package${packageQuantity===1?'':'s'}</button>`:`<div class="btnrow"><button id="packageOpen" class="primary" ${!max?'disabled':''} onclick="unboxPackages(packageType,packageQuantity)">Open Selected</button><button id="packageInstant" class="secondary" ${!max?'disabled':''} onclick="unboxPackages(packageType,packageQuantity,true)">Open Selected Instantly</button><button class="secondary" ${!stock?'disabled':''} onclick="unboxAllPackages()">Open All ${stock} Packages</button></div><small class="quantity-help">Open All includes every saved package type.</small>`}`);
}
function setPackageQuantity(value){
 const max=packageQuantityMaximum();packageQuantity=max?clamp(Math.floor(Number(value)||1),1,max):0;
 const input=$('packageQuantity');if(input){input.min=max?1:0;input.max=Math.max(1,max);input.value=packageQuantity;input.disabled=!max}const output=$('packageQuantityLabel');if(output)output.textContent=packageQuantity;
 for(const [id,disabled] of [['packageMinus',packageQuantity<=1],['packagePlus',packageQuantity>=max],['packageMax',!max]]){const button=$(id);if(button)button.disabled=disabled}
 const cost=$('packageCost');if(cost)cost.textContent=packageTab==='buy'?`Total 🪙 ${fmt(packagePrice(packageType)*packageQuantity)}${max?'':' · Not enough coins'}`:`Opening ${packageQuantity} of ${g.packages[packageType]} saved ${PACKAGE_TYPES[packageType]} packages`;
 const buy=$('packageBuy');if(buy)buy.textContent=`Buy & save ${packageQuantity} package${packageQuantity===1?'':'s'}`;
}
function requestPackagePurchase(){
 const rank=packageType,count=packageQuantity,total=packagePrice(rank)*count;
 if(!packageUnlocked(rank)||g.coins<total)return false;
 packagePurchaseReview={rank,count,total,price:packagePrice(rank)};
 if(total>=Math.max(1,economyUnit()*3)||total>=g.coins*.25)showModal('Buy these packages?',`<p>${count} ${PACKAGE_TYPES[rank]} packages · <b>🪙 ${fmt(total)}</b></p><p>Saved for later opening. Randomized purchases cannot be undone.</p><button class="secondary" onclick="openPackages('buy',${rank})">Cancel</button><button class="primary" onclick="confirmPackagePurchase()">Confirm · 🪙 ${fmt(total)}</button>`);
 else return confirmPackagePurchase();
}
function confirmPackagePurchase(){
 const tx=packagePurchaseReview;packagePurchaseReview=null;if(!tx||!Number.isInteger(tx.count)||tx.count<1||tx.count>1000||!packageUnlocked(tx.rank)||tx.price!==packagePrice(tx.rank)||tx.total!==tx.price*tx.count||g.coins<tx.total)return false;
 const backup=JSON.stringify(g);commitPurchaseUndo('Packages purchased');g.coins-=tx.total;g.packages[tx.rank]+=tx.count;
 if(!save()){g=JSON.parse(backup);migrateFrame11(g);return false}
 render();openPackages('unbox',tx.rank);toast(`${tx.count} ${PACKAGE_TYPES[tx.rank]} packages saved!`);return true;
}
function unboxPackages(rank,count,skip=false){
 if(!Number.isInteger(rank)||rank<0||rank>7||!Number.isInteger(count)||count<1||g.packages[rank]<count)return false;
 const quantities=Array(8).fill(0);quantities[rank]=count;return openPackageBatch(quantities,skip);
}
function unboxAllPackages(){return openPackageBatch([...g.packages],true)}
function openPackageBatch(quantities,skip=false){
 if(!Array.isArray(quantities)||quantities.length!==8||quantities.some((n,i)=>!Number.isInteger(n)||n<0||n>g.packages[i])||!quantities.some(n=>n))return false;
 const backup=JSON.stringify(g);commitPurchaseUndo('Packages opened');const rewards=[];
 quantities.forEach((count,rank)=>{g.packages[rank]-=count;for(let i=0;i<count;i++)rewards.push(discoverFood(drawFood(rank)))});
 if(!save()){g=JSON.parse(backup);migrateFrame11(g);return false}
 render();showModal('Fresh from your packages!',renderOrderRewards(rewards,0,0,'packages'),'order-reward-modal');if(skip||typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion:reduce)').matches)document.querySelector?.('.order-reward-modal')?.classList.add('skip-unbox');return true;
}
