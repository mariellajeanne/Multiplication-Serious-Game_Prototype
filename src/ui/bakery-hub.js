/* Approved ZIP presentation connected to production controllers; no demo state. */
let hubCollection=false,hubMountedRun=null,hubMountedPhase=null,hubRenderingWorksheet=false,hubScrollControls=null,hubCollectionFocus=null;
function isBakeryHub(){return typeof document!=='undefined'&&document.body?.dataset.view==='hub'}
function hubEscape(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function hubAsset(name){return 'assets/bakery-ui/'+name}
function hubImage(name,classes='',alt=''){return `<img class="${classes}" src="${hubAsset(name)}" alt="${hubEscape(alt)}" draggable="false">`}
function hubBoostDiamond(){return `<svg class="boost-star" viewBox="0 0 40 52" aria-hidden="true"><defs><linearGradient id="boost-rainbow" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f6a9ce"/><stop offset=".28" stop-color="#f8d788"/><stop offset=".5" stop-color="#a5e5ca"/><stop offset=".73" stop-color="#8dcff1"/><stop offset="1" stop-color="#c3a0ed"/></linearGradient></defs><path d="M20 3 36 26 20 49 4 26Z" fill="url(#boost-rainbow)" stroke="#fff9e5" stroke-width="2" stroke-linejoin="round"/></svg>`}
function boostSparkle(){return `<span class="boost-sparkle" aria-hidden="true"><svg viewBox="0 0 64 80"><path d="M32 2C35 27 39 33 57 39C39 43 36 51 31 78C28 53 25 46 7 41C24 36 29 29 32 2Z" fill="currentColor"/><path d="M32 10C32 30 33 35 48 39C34 40 33 49 31 68C31 49 29 43 17 41C29 39 31 32 32 10Z" fill="#fff" opacity=".65"/></svg><i></i></span>`}
// The ZIP's temporary labels are not catalog mappings. Its sprites follow these identities.
const HUB_FOOD_SPRITES=Object.freeze(Object.fromEntries(ILLUSTRATED_FOODS.map((id,i)=>[id,i+1])));
function hubFoodArt(id,extra=''){
 const food=F(id),sprite=HUB_FOOD_SPRITES[food.id]||1;
 return hubImage(`food-${String(sprite).padStart(2,'0')}.png`,`food-art illustrated-food ${extra}`,food.name);
}
function hubCoinArt(rank,extra=''){return hubImage(`coin-${String(rank+1).padStart(2,'0')}.png`,`coin-tier-art illustrated-coin ${extra}`,COIN_TIERS[rank])}
function hubArtActive(){return isBakeryHub()&&!hubRenderingWorksheet&&!modal?.variant?.includes('package-shop-modal')}
// Keep the original art paths for the two expressly preserved interfaces.
const preservedFoodArt=foodArt,preservedBakeryFoodArt=bakeryFoodArt,preservedCoinArt=illustratedCoinArt;
foodArt=function(id,extra=''){return hubArtActive()?hubFoodArt(id,extra):preservedFoodArt(id,extra)};
bakeryFoodArt=function(id,extra=''){return hubArtActive()?hubFoodArt(id,extra):preservedBakeryFoodArt(id,extra)};
illustratedCoinArt=function(rank){return hubArtActive()?hubCoinArt(rank):preservedCoinArt(rank)};

function hubScrollRail(kind){
 const food=kind==='food',rail=food?'cabinet-scrollbar':'board-scroll-rail',track=food?'cabinet-track':'board-scroll-track',thumb=food?'cabinet-thumb':'board-scroll-thumb',container=food?'cabinet-scroll':'order-scroller';
 if(!food)return `<div class="board-scroll-rail" id="${rail}"><span class="rail-image" aria-hidden="true"></span><button type="button" class="board-scroll-end order-top" data-hub-action="order-up" aria-label="Scroll orders up"></button><div class="board-scroll-track" id="${track}"><span class="board-scroll-thumb" id="${thumb}" role="scrollbar" tabindex="0" aria-label="Order scroll position" aria-controls="${container}" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="thumb-art" aria-hidden="true"></span></span></div><button type="button" class="board-scroll-end order-bottom" data-hub-action="order-down" aria-label="Scroll orders down"></button></div>`;
 return `<div class="${food?'art-scroll':'board-scroll-rail'}" id="${rail}">${hubImage('scroll-rail-clean.png','rail-image')}<button type="button" class="${food?'scroll-end scroll-top':'board-scroll-end order-top'}" data-hub-action="${kind}-up" aria-label="Scroll ${food?'foods':'orders'} up"></button><div class="${food?'scroll-track':'board-scroll-track'}" id="${track}">${hubImage('scroll-thumb-clean.png',food?'scroll-thumb':'board-scroll-thumb').replace(' alt=""',` id="${thumb}" role="scrollbar" tabindex="0" aria-label="${food?'Food':'Order'} scroll position" aria-controls="${container}" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" alt=""`)}</div><button type="button" class="${food?'scroll-end scroll-bottom':'board-scroll-end order-bottom'}" data-hub-action="${kind}-down" aria-label="Scroll ${food?'foods':'orders'} down"></button></div>`;
}
function hubFoodGeometry(n){return {columns:n===1?1:3,width:n===1?400:241,height:n===1?360:n<=3?276:n<=6?218:n<=9?143:180}}
const HUB_AURAS=['#ffd083','#ffd891','#ffc45d','#cda4fa','#e69bf9','#ffe270','#c78bff','#ff96e5'];
function renderHubFoods(foods){
 const geometry=hubFoodGeometry(foods.length);
 return foods.map(o=>{const food=F(o.id),label=multiplierLabel(foodValue(o));return `<button type="button" class="food-cell hub-food r${food.rarity}" data-food="${food.id}" data-uid="${o.uid}" data-rarity="${food.rarity}" style="width:${geometry.width}px;height:${geometry.height}px;--glow:${HUB_AURAS[food.rarity]}" onclick="openHubFood(${o.uid})" aria-label="Manage ${hubEscape(food.name)}, Baker's Boost ×${label}"><span class="food-aura" aria-hidden="true"></span>${hubFoodArt(food.id,'food-image')}${hubImage('glass-compartment.svg','glass-cell-art')}<span class="cell-glare" aria-hidden="true"></span><span class="food-multiplier food-boost-tag" style="font-size:${label.length>10?16:21}px">${hubImage('bakers-sparkle.png')}×${label}</span></button>`}).join('');
}
function hubTicketReward(ticket){return g.orderRuns[ticket.id]?.budget??orderCoinQuote(ticket)}
const HUB_TICKET_PATH='M21 3H379Q393 3 393 17V39C381 40 381 56 393 57V91C381 92 381 108 393 109V129Q393 143 379 143H21Q7 143 7 129V109C19 108 19 92 7 91V57C19 56 19 40 7 39V17Q7 3 21 3Z';
function hubTicketPaper(ticket,rank){
 const id=`order-paper-${ticket.id}`;
 return `<svg class="ticket-frame-art" viewBox="0 0 400 148" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x2="0" y2="1"><stop stop-color="#fff9e7"/><stop offset=".55" style="stop-color:var(--tier-paper)"/><stop offset="1" style="stop-color:var(--tier-paper-bottom)"/></linearGradient></defs><path class="ticket-outer-edge" d="${HUB_TICKET_PATH}" fill="url(#${id})"/><path class="ticket-inner-edge" d="${HUB_TICKET_PATH}" transform="translate(5 3) scale(.975 .955)" fill="none"/><path class="ticket-perforation" d="M105 15V133"/></svg>${rank>=2?'<span class="ticket-corner-accents"></span>':''}${rank>=3?'<span class="ticket-rays"></span>':''}${rank>=4?'<span class="ticket-sparkles"><i></i><i></i></span>':''}${rank>=6?'<span class="ticket-light-sweep"></span>':''}${rank===7?'<span class="ticket-iridescence"></span>':''}`;
}
function renderHubTickets(){
 return g.board.map(ticket=>{
  const food=orderFood(ticket),rank=ticketCoinTier(ticket),run=g.orderRuns[ticket.id],progress=ticketProgress(ticket);
  const label=ticketOrderLabel(ticket),status=run?.phase==='claim'?'Collect':run?'Resume':'Progress';
  return `<button type="button" class="order-ticket hub-ticket ticket coin-tier-${rank}" data-ticket-id="${ticket.id}" data-order-food="${food.id}" onclick="startTicket(${ticket.id})" aria-label="${run?.phase==='claim'?'Collect coins for':run?'Resume':'Start'} ${hubEscape(label)}, ${hubEscape(food.name)}, ${ticket.a} × ${ticket.b}, ${progress}% complete, ${rank+1} star reward"><span class="ticket-shadow" aria-hidden="true"></span><span class="ticket-cutout">${hubTicketPaper(ticket,rank)}<span class="ticket-safe-content"><span class="coin-hero hub-ticket-reward">${hubCoinArt(rank)}<span class="order-tier" aria-hidden="true">★ ${rank+1}</span></span><span class="order-main"><span class="order-name"><span class="order-type-icon" aria-hidden="true">${ticket.orderIcon||COIN_ORDER_ICONS[rank]}</span>${hubEscape(label)}</span><span class="order-math">${hubFoodArt(food.id,'food-symbol')}<span class="order-quantity">${ticket.a}</span><span class="times">×</span>${hubImage('tray-icon.png','tray-symbol','tray')}<span class="order-quantity">${ticket.b}</span></span><span class="hub-ticket-progress" role="progressbar" aria-label="Order progress" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" style="--progress:${progress}%"><span>${status}</span><strong>${progress}%</strong></span></span></span></span></button>`;
 }).join('');
}
function renderHubHome(){
 const foods=g.activeMenu.map(uid=>g.owned.find(o=>o.uid===uid)).filter(Boolean),count=foods.length;
 return `<main id="stage" class="bakery-ui" data-rendered="true" aria-label="My Panaderya bakery">
 ${hubImage('bakery-room.png','stage-background bakery-room-art')}${hubImage('cash-register-facing.png','register-art')}${hubImage('title-sign-refined.png','','My Panaderya').replace('<img ','<img id="title-sign" ')}
 <section id="package-station" class="hub-packages" aria-label="Boutique package display"><button class="alcove-hit" type="button" data-hub-action="packages" aria-label="Open the packages boutique"></button><button id="packages-plaque" class="picture-button hub-package" type="button" data-hub-action="packages" aria-label="Open packages">${hubImage('packages-entry-button.png','','Packages')}</button></section>
 <section id="menu-cabinet" class="hub-showcase showcase-cabinet" data-count="${count}" aria-label="Equipped Filipino bakery food showcase">${hubImage('cabinet-wood.png','cabinet-art')}
 <header class="cabinet-header"><img id="menu-heading-global" src="${hubAsset('menu-heading.png')}" alt="Menu Collection" draggable="false"><button class="boost-status bakery-utility hub-total-boost boost-counter" id="boost-status" type="button" data-hub-action="boost" aria-label="Baker's Boost ×${multiplierLabel(bakeryValue())}">${hubBoostDiamond()}<strong id="bakerBoost" class="boost-number">×${multiplierLabel(bakeryValue())}</strong></button></header>
 <div id="cabinet-inner"><div id="cabinet-scroll" class="showcase-scroll" tabindex="0" aria-label="Equipped food showcase, scroll to browse"><div id="cabinet-grid" class="showcase-grid ${count>9?'is-overflowing':''}" data-columns="${hubFoodGeometry(count).columns}">${count?renderHubFoods(foods):'<button id="chooseEquippedFood" class="showcase-empty" data-hub-action="collection">Choose a recipe<br><small>from your collection</small></button>'}</div></div>${hubScrollRail('food')}</div></section>
 <section id="orders-board" class="hub-orders" aria-labelledby="hubOrdersHeading"><div class="board-frame" aria-hidden="true"></div><div class="board-front"><h2 id="hubOrdersHeading" class="board-title"><svg viewBox="0 0 36 42" aria-hidden="true"><path d="M10 8H5v31h27V8h-6M12 4h12v9H12zM10 21h4m4 0h9M10 28h4m4 0h9M10 34h4m4 0h9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Orders</span></h2><div class="board-utilities"><button class="board-footer bakery-utility hub-refresh" id="refreshOrders" type="button" data-hub-action="refresh"><span>New Orders</span></button><button class="board-footer bakery-utility odds hub-odds" type="button" data-hub-action="odds"><span>Reward Odds</span></button></div></div><div class="board-list"><div id="order-scroller" class="board-paper-scroller hub-order-scroll" tabindex="0" aria-label="Available orders, scroll for more"><div id="order-items">${renderHubTickets()}</div></div></div>${hubScrollRail('order')}</section>
 <div class="top-hud hub-wallet"><button id="wallet-button" class="picture-button wallet-btn" type="button" data-hub-action="wallet" aria-label="View ${amountLabel(g.coins)} coins">${hubImage('hud-coin-shell.png')}<span class="wallet-count" id="walletCoins">${amountLabel(g.coins)}</span></button><button id="help-button" class="picture-button" type="button" data-hub-action="help" aria-label="Help">${hubImage('control-help.svg','','Help')}</button><button id="settings-button" class="picture-button" type="button" data-hub-action="settings" aria-label="Settings">${hubImage('control-settings.svg','','Settings')}</button></div>
 <nav class="bottom-nav hub-navigation" aria-label="Bakery navigation"><button class="picture-button nav-packages" type="button" data-hub-action="packages" aria-label="Packages">${hubImage('nav-packages.png','','Packages')}</button><button class="picture-button nav-play hub-play" type="button" data-hub-action="play" aria-label="${g.run?'Resume Order':'Play Orders'}" ${!g.board.length&&!g.run?'disabled':''}>${hubImage('nav-play.png','','Play Orders')}${g.run?'<span class="resume-indicator">Resume</span>':''}</button><button class="picture-button nav-collection" type="button" data-hub-action="collection" aria-label="Menu Collection">${hubImage('nav-collection.png','','Menu Collection')}</button></nav></main>`;
}
function hubPopupChrome(title,body,{collection=false,variant=''}={}){
 const action=collection?'closeHubCollection()':'closeModal()',titleId=collection?'collectionTitle':'modalTitle';
 const size=collection||/modalgrid|hub-odds-grid|food-choices/.test(body)?'large':/hub-help|hub-boost|settings-list|hub-wallet|coin-order-reward/.test(body)?'medium':'small';
 return `<div class="${collection?'hub-collection-overlay':'backdrop bakery-overlay'} bakery-popup-backdrop" onclick="if(event.target===this)${action}"><section class="bakery-popup popup-${size} ${collection?'collection-modal':'modal'} ${variant}" role="dialog" aria-modal="true" aria-labelledby="${titleId}" tabindex="-1"><header class="${collection?'collection-popup-head':'modalhead'} popup-head"><h2 id="${titleId}">${hubEscape(title)}</h2><button class="picture-button close ${collection?'hub-collection-back':''}" aria-label="${collection?'Back to bakery':'Close'}" onclick="${action}">${hubImage('control-close.svg')}</button></header><div class="${collection?'collection-body':'modalbody'} popup-body">${body}</div></section></div>`;
}
function renderHubFoodCard(o){
 const food=F(o.id),equipped=g.activeMenu.includes(o.uid),selected=selectedFoods.has(o.uid),busy=!!(g.run&&!g.run.paused);
 return `<article class="compact-food collection-card r${food.rarity} ${equipped?'is-equipped':'is-unequipped'} ${selected?'is-selected':''}" data-uid="${o.uid}"><button class="food-card-target" aria-pressed="${selected}" onclick="selectFood(${o.uid})" aria-label="Manage ${hubEscape(food.name)}, ${rarityLabel(food.rarity)}, Mastery ${recipeMastery(o)}">${hubFoodArt(food.id)}<strong>${hubEscape(food.name)}</strong><span class="food-card-rarity">${RARITIES[food.rarity]} · ×${multiplierLabel(foodValue(o))}</span><small class="food-card-bottom">Mastery ${recipeMastery(o)}${availableMastery(o)?` · +${availableMastery(o)} available`:''}</small></button><button class="collection-equip ${equipped?'equipped':''}" onclick="hubToggleEquip(${o.uid})" ${busy||!equipped&&g.activeMenu.length>=g.menuSlots?'disabled':''}>${equipped?'Equipped ✓':'Equip'}</button></article>`;
}
function renderHubCollection(){
 const foods=sortedMenuFoods(g.owned.filter(o=>!hideUnequipped||g.activeMenu.includes(o.uid)));
 return hubPopupChrome('Menu Collection',`<main class="illustrated-collection-content" style="--owned-rows:${Math.min(2,Math.max(1,Math.ceil(foods.length/4)))}"><div class="collection-toolbar"><div class="collection-slot-controls"><b>${g.activeMenu.length}/${g.menuSlots} equipped</b><button class="secondary" ${g.menuSlots>=FOOD.length?'disabled':''} onclick="buyMenuSlot()">${g.menuSlots>=FOOD.length?'All slots owned':`+ Slot · 🪙 ${amountLabel(slotCost())}`}</button><button class="secondary collection-index" onclick="openIndex()">Food Index</button></div><div class="collection-equip-controls"><button class="primary" onclick="equipBest('final')">Equip Best</button>${renderAutoEquipControl()}</div><div class="collection-filter-controls"><button class="secondary" aria-pressed="${hideUnequipped}" onclick="hideUnequipped=!hideUnequipped;render()">${hideUnequipped?'Show All':'Hide Unequipped'}</button><button class="secondary" data-focus="select-foods" aria-pressed="${multiSelect}" onclick="toggleFoodSelection()">${multiSelect?'Done selecting':'Select Foods'}</button><span class="collection-sort-note">Rarity · Boost</span></div></div><div class="menu-grid collection-grid" data-food-count="${foods.length}" tabindex="0" aria-label="Owned foods, scroll to browse">${foods.map(renderHubFoodCard).join('')}${!foods.length?'<p>No foods in this view. Show all foods or open a package.</p>':''}</div><div id="foodPanel">${renderFoodPanel()}</div></main>`,{collection:true,variant:foods.length<5?'small-collection':''});
}
function hubToggleEquip(uid){
 if(suppressFoodTap===uid){suppressFoodTap=null;return false}
 const selection=selectedFoods;selectedFoods=new Set([uid]);
 const ok=selectionEquip(!g.activeMenu.includes(uid));selectedFoods=selection;paintFoodPanel();return ok;
}
function openHubCollection(){hubCollectionFocus=captureFocus(document.activeElement);hubCollection=true;render();const grid=$('hubCollection').querySelector('.menu-grid');if(grid)grid.scrollTop=0;document.querySelector('.hub-collection-back')?.focus({preventScroll:true})}
function closeHubCollection(){selectedFoods.clear();multiSelect=false;hubCollection=false;render();restoreFocus(hubCollectionFocus);if(!document.activeElement?.getClientRects().length||document.activeElement===document.body)document.querySelector('.nav-collection')?.focus({preventScroll:true})}
function openHubFood(uid){hubCollectionFocus=captureFocus(document.activeElement);hubCollection=true;selectedFoods=new Set([uid]);multiSelect=false;render();document.querySelector('.food-panel-close')?.focus({preventScroll:true})}
function playHubOrder(){const ticket=g.run?.ticket||g.board.find(t=>g.orderRuns[t.id])||g.board[0];if(ticket){hubCollection=false;startTicket(ticket.id)}}
function openHubHelp(){showModal('How to Play',`<div class="hub-help"><ol class="help-steps"><li>${bakeryIcon('ticket')}<span><b>Choose an order</b><small>Tap a ticket to start or resume.</small></span></li><li>${bakeryIcon('guide')}<span><b>Multiply, one pair at a time</b><small>Connect digits. Place products and carries.</small></span></li><li>${hubCoinArt(0)}<span><b>Collect your coins</b><small>Finish the worksheet, then collect.</small></span></li><li>${bakeryIcon('inventory')}<span><b>Open packages. Equip foods.</b><small>Grow your Baker's Boost.</small></span></li></ol><details class="worksheet-tips"><summary>Worksheet tips</summary><ul><li>Tap or drag between the digits.</li><li>Tap the × bubble to reveal product tiles.</li><li>Swipe down to add the partial rows.</li><li>Save & Exit keeps your work.</li></ul></details><div class="btnrow"><button class="primary" onclick="closeModal()">Got it!</button><button class="secondary" onclick="openSettings()">Guide & Sound</button></div></div>`)}
function fitHubInterface(){
 if(!isBakeryHub())return;
 const scale=Math.min(innerWidth/2000,innerHeight/1200),stage=$('stage');
 document.body.style.setProperty('--bakery-scale',scale);if(stage)stage.style.transform=`scale(${scale})`;
 hubScrollControls?.update();
}
function syncHubNavigation(){
 if(!isBakeryHub())return;
 for(const [selector,active] of [['.nav-packages',!!modal?.variant?.includes('package-shop-modal')],['.nav-collection',hubCollection],['.nav-play',!!g.run],['#help-button',modal?.title==='How to Play'],['#settings-button',modal?.title==='Settings'],['#boost-status',modal?.title==="Baker's Boost"]])document.querySelector(selector)?.setAttribute('aria-pressed',String(active));
}
function renderBakeryHub(){
 reconcileAutoEquip();refillBoard();reconcileOrderFoods();
 if(!$('hubHome'))$('app').innerHTML='<div id="hubHome" class="hub-home"></div><div id="hubCollection" class="hub-collection" hidden></div><div id="hubOrder" class="hub-order-workspace" hidden></div>';
 const playing=!!g.run&&!g.run.paused,home=$('hubHome'),collection=$('hubCollection'),order=$('hubOrder');
 if(playing)hubCollection=false;
 home.hidden=playing;collection.hidden=playing||!hubCollection;order.hidden=!playing;
 home.inert=hubCollection;document.body.classList.toggle('hub-working',playing);$('app').className=playing?'playing':'browsing';
 const foodScroll=home.querySelector('.showcase-scroll')?.scrollTop||0,orderScroll=home.querySelector('.hub-order-scroll')?.scrollTop||0;
 if(!playing){
  hubScrollControls?.destroy();home.innerHTML=renderHubHome();home.querySelector('.showcase-scroll').scrollTop=foodScroll;home.querySelector('.hub-order-scroll').scrollTop=orderScroll;
  if(typeof bindIllustratedScrollbars==='function')hubScrollControls=bindIllustratedScrollbars(home);
  if(hubCollection){const scroll=collection.querySelector('.menu-grid')?.scrollTop||0;collection.innerHTML=renderHubCollection();collection.querySelector('.menu-grid').scrollTop=scroll;}
 }
 // Preserve the original mounted engine and outer worksheet markup without reskinning.
 if(g.run&&(hubMountedRun!==g.run||hubMountedPhase!==g.run.phase||!order.firstChild)){
  hubMountedRun=g.run;hubMountedPhase=g.run.phase;hubRenderingWorksheet=true;
  try{order.innerHTML=renderWorksheet()}finally{hubRenderingWorksheet=false}
  if(g.run.phase==='engine'){const frame=$('worksheetFrame');frame.onload=()=>sendEngine('hello');frame.src='worksheet/worksheet-engine.html'}
 }else if(!g.run){hubMountedRun=null;hubMountedPhase=null;order.replaceChildren()}
 if(playing&&g.run.phase==='engine')requestAnimationFrame(()=>fitWorksheet());
 if(typeof syncRewardPresentation==='function')syncRewardPresentation();
 paintPurchaseUndo();updateOrderRefresh();fitHubInterface();syncHubNavigation();
}
// Swap only the view layer; package lifecycle/state and modal controls stay original.
const preservedPaintModal=paintModal;
paintModal=function(){
 if(!isBakeryHub()||!modal||modal.variant?.includes('package-shop-modal')){const result=preservedPaintModal();syncHubNavigation();return result}
 fitHubInterface();$('modals').innerHTML=hubPopupChrome(modal.title,modal.html,{variant:modal.variant||''});
 syncHubNavigation();
 requestAnimationFrame(()=>$('modals').querySelector('.modal')?.focus({preventScroll:true}));
};
const preservedUpdateOrderRefresh=updateOrderRefresh;
updateOrderRefresh=function(){
 if(!isBakeryHub())return preservedUpdateOrderRefresh();
 const button=$('refreshOrders');if(!button)return;
 const seconds=Math.ceil(refreshRemaining()/1000);
 button.disabled=false;button.classList.toggle('is-skip',seconds>0);button.querySelector('span').textContent=seconds?`Skip (${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')})`:'New Orders';
 button.setAttribute('aria-label',seconds?`Refresh in ${Math.floor(seconds/60)} minutes ${seconds%60} seconds; review paid refresh`:'New Orders');
};
const preservedOpenProbabilities=openProbabilities;
openProbabilities=function(){
 if(!isBakeryHub())return preservedOpenProbabilities();
 const odds=ticketProbabilities(ticketLuckMastery());
 showModal('Coin Reward Odds',`<div class="odds-luck"><span>★ Permanent Luck <b>+${g.permanentLuck}</b></span><small>New orders · coin rewards only</small></div><div class="hub-odds-grid">${odds.map((chance,rank)=>`<article class="odds-tier-${rank}">${hubCoinArt(rank)}<strong>${rank+1}★ ${COIN_TIERS[rank]}</strong><b>${probabilityLabel(chance).replace('<','&lt;')}</b><span class="odds-meter" aria-hidden="true" style="--chance:${Math.max(.3,chance*100)}%"></span></article>`).join('')}</div><details class="odds-details"><summary>How rewards grow</summary><div class="reward-formula"><span>Base coins</span><b>×</b><span>Baker's Boost</span><b>=</b><span>Order coins</span></div><div class="base-coin-list">${odds.map((_,rank)=>`<span>${rank+1}★ <b>${amountLabel(ticketBase(rank))}</b></span>`).join('')}</div><p>Started orders keep their saved reward. Package food odds are separate.</p></details>`);
};
const preservedShowCoinsInfo=showCoinsInfo,preservedShowBoostInfo=showBoostInfo;
showCoinsInfo=function(){
 if(!isBakeryHub())return preservedShowCoinsInfo();
 showModal('Bakery Coins',`<div class="hub-wallet-detail">${hubCoinArt(2)}<div><span>Your coins</span><strong>${amountLabel(g.coins)}</strong></div></div><div class="reward-formula"><span>${bakeryIcon('ticket')}Solve orders</span><b>→</b><span>${hubCoinArt(0)}Earn coins</span><b>→</b><span>${bakeryIcon('inventory')}Open packages</span></div><div class="btnrow hub-info-actions"><button class="primary" onclick="closeModal();playHubOrder()">Play Orders</button><button class="secondary" onclick="closeModal();openPackages()">Packages</button></div>`,'hud-info-modal');
};
showBoostInfo=function(){
 if(!isBakeryHub())return preservedShowBoostInfo();
 const foods=g.activeMenu.map(uid=>g.owned.find(o=>o.uid===uid)).filter(Boolean);
 showModal("Baker's Boost",`<div class="hub-boost-detail">${hubImage('bakers-sparkle.png','boost-star')}<div><span>Your order multiplier</span><strong id="menuBoostComponent">×${boostComponentLabel(bakeryValue())}</strong></div></div><h3 class="contributions-heading">Equipped foods add up</h3><div class="boost-food-list">${foods.map(o=>`<div>${hubFoodArt(o.id)}<span><b>${hubEscape(F(o.id).name)}</b><small>Mastery ${recipeMastery(o)}</small></span><strong>+${multiplierLabel(foodValue(o))}</strong></div>`).join('')||'<p>No foods equipped.</p>'}</div><div class="mastery-growth">${hubImage('bakers-sparkle.png')}<span>Recipe Mastery ↑ <b>Boost ↑</b><small>Duplicates unlock more Mastery.</small></span></div><div class="btnrow hub-info-actions"><button class="primary" onclick="closeModal();openHubCollection()">Manage Foods</button></div>`,'hud-info-modal');
};
const preservedOpenSettings=openSettings;
openSettings=function(){
 if(!isBakeryHub())return preservedOpenSettings();
 const row=(icon,label,on,action)=>`<div class="settings-row"><b>${bakeryIcon(icon)}${label}</b><button class="secondary setting-toggle" aria-label="${label}" aria-pressed="${on}" onclick="${action}"><span class="toggle-dot" aria-hidden="true"></span>${on?'ON':'OFF'}</button></div>`;
 showModal('Settings',`<div class="settings-list">${row('sound','Sounds',g.sound,'toggleSfx();openSettings()')}${row('guide','Guide',g.tutorialArrows,'toggleArrows();openSettings()')}${row('sound','Music',g.musicOn,'toggleMusic()')}</div><div class="btnrow settings-actions"><button class="secondary" onclick="showTutorial()">${bakeryIcon('guide')}Show me</button><button class="secondary" onclick="openHubHelp()">How to Play</button></div>${g.completed>=3?`<div class="settings-extras">${g.completed>=6?'<button class="secondary" onclick="openStaff()">Helper</button>':''}<button class="secondary" onclick="openModes()">Game modes</button>${g.completed>=5?'<button class="secondary" onclick="openIngredients()">Ingredient pantry</button>':''}</div>`:''}<details class="adult-tools"><summary>Advanced · grown-ups</summary><p>These controls change saved progress.</p><div class="btnrow"><button class="secondary" onclick="unlockDemo()">Demo bakery</button><button class="secondary" onclick="resetGame()">Erase progress…</button></div></details>`,'settings-modal');
};
const preservedRequestSelectedSale=requestSelectedSale;
requestSelectedSale=function(){
 const result=preservedRequestSelectedSale();
 if(!isBakeryHub()||!saleConfirmation||!modal)return result;
 const foods=saleConfirmation.uids.map(uid=>g.owned.find(o=>o.uid===uid)).filter(Boolean),total=foods.reduce((sum,o)=>sum+resalePrice(o),0);
 modal.html=`<div class="selection-review">${foods.map(o=>`<div>${hubFoodArt(o.id)}<b>${hubEscape(F(o.id).name)}</b><strong>+${amountLabel(resalePrice(o))} 🪙</strong></div>`).join('')}</div><p class="warning">Foods and purchased Mastery will be sold.</p><p class="dialog-note">Food Index discoveries and unlocked Mastery stay.</p><div class="btnrow"><button class="secondary" onclick="closeModal()">Keep foods</button><button class="primary" onclick="confirmSelectedSale()">Sell · 🪙 ${fmt(total)}</button></div>`;
 paintModal();return result;
};
const preservedCoinRewardMarkup=coinRewardMarkup;
coinRewardMarkup=function(r){
 if(!isBakeryHub()||hubRenderingWorksheet)return preservedCoinRewardMarkup(r);
 const base=r.baseCoins??r.ticket.base??r.pool,boost=r.bakersBoost??r.pool/base;
 return `<section class="coin-order-reward"><div class="hub-wallet-detail">${hubCoinArt(ticketCoinTier(r.ticket))}<div><span>Coins collected</span><strong class="coin-reward-total">+${amountLabel(r.pool)}</strong></div></div><div class="reward-formula"><span>Base coins<b>${amountLabel(base)}</b></span><b>×</b><span>Baker's Boost<b>×${multiplierLabel(boost)}</b></span><b>=</b><span>Total coins<b>${amountLabel(r.pool)}</b></span></div><div class="btnrow"><button class="primary" onclick="closeModal()">Back to Bakery</button></div></section>`;
};
function dispatchHubAction(action){
 const actions={packages:()=>openPackages(),collection:openHubCollection,play:playHubOrder,boost:showBoostInfo,wallet:showCoinsInfo,help:openHubHelp,settings:openSettings,odds:openProbabilities,refresh:()=>refreshRemaining()>0?requestRefreshSkip():refreshOrders()};
 if(actions[action])return actions[action]();
 const match=/^(food|order)-(up|down)$/.exec(action);
 if(match)$(match[1]==='food'?'cabinet-scroll':'order-scroller')?.scrollBy({top:(match[2]==='up'?-1:1)*180,behavior:'smooth'});
}
if(typeof window!=='undefined'){
 document.addEventListener('click',e=>{const button=e.target.closest('[data-hub-action]');if(button&&!button.disabled)dispatchHubAction(button.dataset.hubAction)});
 document.addEventListener('pointerdown',e=>{const button=e.target.closest('.bakery-ui button:not(:disabled),.bakery-popup button:not(:disabled)');if(button)button.classList.add('is-pressed')});
 const clear=()=>document.querySelectorAll('.is-pressed').forEach(el=>el.classList.remove('is-pressed'));
 for(const type of ['pointerup','pointercancel','lostpointercapture','blur'])window.addEventListener(type,clear);
 window.addEventListener('resize',fitHubInterface);
 document.addEventListener('keydown',e=>{
  if(!hubCollection||modal||e.defaultPrevented)return;
  if(e.key==='Escape'){e.preventDefault();closeHubCollection();return}
  if(e.key!=='Tab')return;
  const root=$('hubCollection'),buttons=[...root.querySelectorAll('button:not(:disabled),select,[tabindex="0"]')].filter(el=>el.getClientRects().length),first=buttons[0],last=buttons.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
 });
 window.render_game_to_text=()=>JSON.stringify({coordinates:{width:2000,height:1200,origin:'top-left',x:'right',y:'down'},view:modal?.title||(!g.run||g.run.paused?(hubCollection?'collection':'bakery'):g.run.phase),coins:g.coins,boost:bakeryValue(),equipped:g.activeMenu.map(uid=>{const o=g.owned.find(o=>o.uid===uid);return o?{uid,id:o.id,value:foodValue(o)}:null}).filter(Boolean),orders:g.board.map(t=>({id:t.id,foodId:t.foodId,a:t.a,b:t.b,coinTier:ticketCoinTier(t),coins:hubTicketReward(t),progress:ticketProgress(t)})),active:g.run?{id:g.run.ticket.id,phase:g.run.phase,paused:!!g.run.paused}:null});
}
