/* Three bounded scenes. Scene coordinates are independent of the fixed HUD.
 * All quantities, prices, odds, tickets and receipts use production controllers. */
const BAKERY_PAGES=Object.freeze(['packages','menu','orders']);
let bakeryPage='menu',bakeryCamera=1,bakeryJourney=null,bakeryFrame=0,bakeryTier=0,bakeryViewportScroll=null;
function worldImage(name,classes='',alt=''){
 return `<img src="assets/bakery-world/${name}.png" class="${classes}" alt="${hubEscape(alt)}" draggable="false">`;
}
function worldButton(label,action,{icon='',classes='',extra=''}={}){
 return `<button type="button" class="world-button ${classes}" ${action?`data-hub-action="${action}"`:''} ${extra}>${icon?worldImage(icon,'world-button-icon'):''}<span>${label}</span></button>`;
}
function worldPackageImage(rank,classes=''){
 // The source has eight illustrations; the existing ninth tier keeps its identity.
 return worldImage(`package-${String(Math.min(8,rank+1)).padStart(2,'0')}`,classes,`${PACKAGE_TYPES[rank]} Package`);
}
function renderWorldPackages(){
 const rank=bakeryTier,unlocked=packageUnlocked(rank),next=nextPackageToUnlock();
 const odds=packageProbabilities(rank);
 return `<section id="package-station" class="world-packages" aria-label="Packages counter">
 ${worldImage('packages-frame','world-frame')}
 <div class="world-package-showcase">${worldPackageImage(rank,'world-featured-package')}<strong class="world-featured-name">${rank+1}★ ${PACKAGE_TYPES[rank]}</strong></div>
 <div class="world-package-selector" role="group" aria-label="Package tiers, swipe or use arrow keys" tabindex="0">${PACKAGE_SHOP.map(type=>`<button type="button" data-world-tier="${type.rank}" aria-pressed="${type.rank===rank}" aria-label="${type.name} Package${packageUnlocked(type.rank)?'':`, unlock at ${type.orders} orders`}" class="world-tier ${packageUnlocked(type.rank)?'':'is-locked'}">${worldPackageImage(type.rank)}<span>${type.rank+1}★</span></button>`).join('')}</div>
 <div class="world-discovery"><strong>${next?`Next: ${hubEscape(next.name)}`:'All tiers unlocked'}</strong><span>${next?`${Math.min(g.completed,next.orders)} / ${next.orders} orders`:'Keep discovering foods'}</span><div class="world-meter" role="progressbar" aria-label="Next package discovery" aria-valuemin="0" aria-valuemax="${next?.orders||1}" aria-valuenow="${next?Math.min(g.completed,next.orders):1}"><i style="width:${next?Math.min(100,g.completed/next.orders*100):100}%"></i></div></div>
 <div class="world-package-details"><h2>${rank+1}★ ${hubEscape(PACKAGE_TYPES[rank])} Package</h2><div class="world-food-odds" aria-label="Food chances">${odds.map((p,i)=>`<div class="world-odds-row" style="--rarity:${HUB_AURAS[i]}"><span>${hubEscape(RARITIES[i])}</span><span class="world-meter"><i style="width:${p*100}%"></i></span><b>${probabilityLabel(p).replace('<','&lt;')}</b></div>`).join('')}</div>
 <div class="world-purchase-options">${[1,5,10].map(count=>worldButton(`Open ×${count}<small>${amountLabel(packagePrice(rank)*count)} coins</small>`,'',{classes:'world-buy',extra:`data-world-buy="${count}" ${packageBatchUnavailable(rank,count)?'disabled':''} aria-label="Open ${count} ${PACKAGE_TYPES[rank]} packages for ${amountLabel(packagePrice(rank)*count)} coins"`})).join('')}</div>
 <p class="world-purchase-notice" role="status">${!unlocked?`Unlock after ${PACKAGE_SHOP[rank].orders} completed orders.`:g.coins<packagePrice(rank)?'Complete orders to earn coins.':'A food surprise in every package.'}</p>
 ${g.packages[rank]?worldButton(`Open saved ×${savedPackageBatch(rank)}`,'',{classes:'world-saved',extra:'data-world-saved="true"'}):''}</div></section>`;
}
function renderWorldMenu(){
 const foods=sortedMenuFoods(g.activeMenu.map(uid=>g.owned.find(o=>o.uid===uid)).filter(Boolean));
 return `<section id="menu-cabinet" class="world-menu" aria-label="Menu counter">
 ${worldImage('menu-frame','world-frame')}
 <div id="cabinet-inner"><div id="cabinet-scroll" class="showcase-scroll" tabindex="0" aria-label="Equipped foods, scroll to browse"><div id="cabinet-grid" class="showcase-grid" data-count="${foods.length}">${foods.length?renderHubFoods(foods):worldButton('Choose a recipe','collection')}</div></div>${hubScrollRail('food')}</div>
 <button type="button" class="world-counter-packages hub-package" data-hub-action="packages" aria-label="Visit Packages">${worldPackageImage(0)}</button>
 ${hubImage('cash-register-facing.png','world-register')}
 ${worldButton('View All Foods','collection',{icon:'icon-menu',classes:'world-collection nav-collection'})}
 </section>`;
}
function renderWorldOrders(){
 return `<section id="orders-board" class="world-orders" aria-label="Orders board">${worldImage('orders-frame','world-frame')}
 <div class="world-order-tools">${worldButton('<span>New Orders</span>','refresh',{icon:'icon-refresh',extra:'id="refreshOrders"',classes:'world-utility'})}${worldButton('Reward Odds','odds',{icon:'icon-packages',classes:'world-utility'})}</div>
 <div id="order-scroller" class="hub-order-scroll" tabindex="0" aria-label="Available orders, scroll to browse"><div id="order-items">${renderHubTickets()}</div></div>${hubScrollRail('order')}</section>`;
}
function renderBakeryWorld(){
 return `<div class="world-backdrop" aria-hidden="true"></div><div class="world-viewport"><div class="world-canvas"><main id="stage" class="bakery-ui bakery-world" data-rendered="true" aria-label="My Panaderya bakery">
 <div class="world-track" style="transform:translate3d(${-bakeryCamera*2000}px,0,0)">
 <div class="world-page" data-world-page="packages">${renderWorldPackages()}</div><div class="world-page" data-world-page="menu">${renderWorldMenu()}</div><div class="world-page" data-world-page="orders">${renderWorldOrders()}</div></div></main></div></div>
 <div class="world-hud top-hud hub-wallet" aria-label="Bakery controls">
 <button type="button" class="world-stat world-coins" id="wallet-button" data-hub-action="wallet" aria-label="View ${amountLabel(g.coins)} coins">${hubCoinArt(0)}<span id="walletCoins">${amountLabel(g.coins)}</span></button>
 <button type="button" class="world-stat world-boost boost-counter" id="boost-status" data-hub-action="boost" aria-label="Baker's Boost ×${multiplierLabel(bakeryValue())}">${hubBoostDiamond()}<span id="bakerBoost">×${multiplierLabel(bakeryValue())}</span></button>
 <button type="button" class="world-round" id="help-button" data-hub-action="help" aria-label="Help">${worldImage('help')}</button><button type="button" class="world-round" id="settings-button" data-hub-action="settings" aria-label="Settings">${worldImage('settings')}</button></div>
 <nav class="world-nav" aria-label="Bakery navigation">${worldButton('Packages','packages',{icon:'icon-packages',classes:'nav-packages',extra:'data-world-nav="packages"'})}${worldButton('Menu','home',{icon:'icon-menu',classes:'nav-home',extra:'data-world-nav="menu"'})}${worldButton('Orders','orders',{icon:'icon-orders',classes:'nav-orders',extra:'data-world-nav="orders"'})}</nav><span class="world-page-announcement sr-only" aria-live="polite"></span>`;
}
function fitBakeryWorld(){
 const compact=matchMedia('(max-height:600px) and (orientation:landscape)').matches;
 const scale=compact?innerWidth/2000:Math.min(innerWidth/2000,(innerHeight-120)/1060),stage=$('stage');
 document.body.style.setProperty('--bakery-scale',Math.max(.1,scale));
 if(stage){stage.style.transform=`scale(${Math.max(.1,scale)})`;stage.style.top='50%'}
 const viewport=document.querySelector('.world-viewport');
 if(compact&&viewport)viewport.scrollTop=bakeryViewportScroll??Math.round((bakeryPage==='menu'?220:0)*scale);
 hubScrollControls?.update();paintBakeryCamera();syncBakeryPages();bindBakeryWorld();
}
function paintBakeryCamera(){
 const track=document.querySelector('.world-track'),backdrop=document.querySelector('.world-backdrop');
 if(track)track.style.transform=`translate3d(${-bakeryCamera*2000}px,0,0)`;
 if(backdrop)backdrop.style.setProperty('--room-camera',bakeryCamera);
}
function syncBakeryPages(){
 for(const page of document.querySelectorAll('[data-world-page]')){
  const active=page.dataset.worldPage===bakeryPage;
  page.inert=!active;page.setAttribute('aria-hidden',String(!active));
 }
 for(const button of document.querySelectorAll('[data-world-nav]')){
  const active=button.dataset.worldNav===bakeryPage;
  button.setAttribute('aria-pressed',String(active));
  if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 }
 const announcement=document.querySelector('.world-page-announcement');
 if(announcement)announcement.textContent=bakeryPage==='menu'?'Menu':bakeryPage==='orders'?'Orders':'Packages';
}
function bakeryCameraStep(time){
 if(!bakeryJourney)return;
 const t=Math.min(1,Math.max(0,(time-bakeryJourney.started)/bakeryJourney.duration));
 // Smooth endpoints with a single monotonic path, including both-page trips.
 const eased=t*t*(3-2*t);
 bakeryCamera=bakeryJourney.from+(bakeryJourney.to-bakeryJourney.from)*eased;paintBakeryCamera();
 if(t<1)bakeryFrame=requestAnimationFrame(bakeryCameraStep);else{bakeryJourney=null;bakeryFrame=0}
}
function navigateBakery(page){
 if(!BAKERY_PAGES.includes(page)||g.run&&!g.run.paused)return false;
 if(page===bakeryPage)return true;
 if(hubCollection)closeHubCollection();
 const focused=document.activeElement,oldPage=focused?.closest('[data-world-page]');
 bakeryPage=page;cancelAnimationFrame(bakeryFrame);
 if(matchMedia('(max-height:600px) and (orientation:landscape)').matches){bakeryViewportScroll=Math.round((page==='menu'?220:0)*innerWidth/2000);document.querySelector('.world-viewport').scrollTop=bakeryViewportScroll}
 const target=BAKERY_PAGES.indexOf(page),distance=Math.abs(target-bakeryCamera);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){bakeryCamera=target;bakeryJourney=null;paintBakeryCamera()}
 else{bakeryJourney={from:bakeryCamera,to:target,started:performance.now(),duration:distance>1?740:480};bakeryFrame=requestAnimationFrame(bakeryCameraStep)}
 syncBakeryPages();
 if(oldPage)document.querySelector(`[data-world-nav="${page}"]`)?.focus({preventScroll:true});
 return true;
}
function selectBakeryTier(rank){
 if(!Number.isInteger(rank)||!PACKAGE_SHOP[rank])return false;
 const scroll=document.querySelector('.world-package-selector')?.scrollLeft||0;
 bakeryTier=rank;packageFeaturedRank=rank;
 $('package-station').outerHTML=renderWorldPackages();
 const strip=document.querySelector('.world-package-selector');strip.scrollLeft=scroll;
 const selected=strip.querySelector(`[data-world-tier="${rank}"]`);
 selected?.focus({preventScroll:true});
 // Scroll only the strip; scrollIntoView can move the entire camera's ancestors.
 if(selected.offsetLeft<strip.scrollLeft)strip.scrollLeft=selected.offsetLeft;
 else if(selected.offsetLeft+selected.offsetWidth>strip.scrollLeft+strip.clientWidth)strip.scrollLeft=selected.offsetLeft+selected.offsetWidth-strip.clientWidth;
 return true;
}
function buyBakeryPackage(count){
 if(packageBatchView||packageBatchUnavailable(bakeryTier,count))return false;
 packageFeaturedRank=bakeryTier;
 return purchasePackageBatch(quotePackageBatch(bakeryTier,count).id);
}
function bindBakeryWorld(){
 const root=$('hubHome');if(!root||root.dataset.worldBound)return;
 root.dataset.worldBound='true';
 root.addEventListener('scroll',event=>{if(event.target.matches('.world-viewport'))bakeryViewportScroll=event.target.scrollTop},true);
 root.addEventListener('click',event=>{
  const tier=event.target.closest('[data-world-tier]'),buy=event.target.closest('[data-world-buy]');
  if(tier)selectBakeryTier(Number(tier.dataset.worldTier));
  if(buy&&!buy.disabled)buyBakeryPackage(Number(buy.dataset.worldBuy));
  if(event.target.closest('[data-world-saved]'))openSavedPackageBatch(bakeryTier);
 });
 root.addEventListener('keydown',event=>{
  const strip=event.target.closest('.world-package-selector');if(!strip)return;
  const key=event.key,next=key==='Home'?0:key==='End'?PACKAGE_SHOP.length-1:key==='ArrowLeft'?Math.max(0,bakeryTier-1):key==='ArrowRight'?Math.min(PACKAGE_SHOP.length-1,bakeryTier+1):null;
  if(next!==null){event.preventDefault();selectBakeryTier(next)}
 });
}
// Existing popup entry points now lead to the appropriate fixed world scene.
const worldOpenPackages=openPackages,worldShowPackageCollection=showPackageCollection,worldShowSelectedPackage=showSelectedPackage;
openPackages=function(tab='buy',rank=null){
 if(!isBakeryHub())return worldOpenPackages(tab,rank);
 if(packageBatchView||g.run&&!g.run.paused)return false;
 if(g.packageBatchReceipt){presentPackageBatch(true);return true}
 if(modal)closeModal();
 navigateBakery('packages');if(rank!==null)selectBakeryTier(Number(rank));return true;
};
showPackageCollection=function(restoreSelection=false){if(!isBakeryHub())return worldShowPackageCollection(restoreSelection);navigateBakery('packages')};
showSelectedPackage=function(rank){if(!isBakeryHub())return worldShowSelectedPackage(rank);navigateBakery('packages');return selectBakeryTier(rank)};
const worldText=window.render_game_to_text;
window.render_game_to_text=()=>{
 const state=JSON.parse(worldText());
 state.scene={page:bakeryPage,camera:bakeryCamera,transitioning:!!bakeryJourney,order:BAKERY_PAGES};
 if(bakeryPage==='packages'&&!packageBatchView)state.packages.view='scene';
 state.packages.selected=bakeryTier;
 return JSON.stringify(state);
};
