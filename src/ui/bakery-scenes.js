/* Original-art reconstruction. View-only: production controllers own all state,
 * transactions and worksheet/Co-Baker sessions. The camera and all scenery share
 * one world; only the screen and the intended inner lists clip their contents. */
const BAKERY_PAGES=Object.freeze(['packages','menu','orders']);
// Centers account for each PNG's visible silhouette, rather than equal page boxes.
// Frame widths: Packages 1592, Menu 1612, Orders 936; both visible gaps are 220.
const BAKERY_CENTERS=Object.freeze([1000,2822,4316]);
const BAKERY_COMPACT_CENTERS=Object.freeze([1000,2822,4456]);
function bakeryWorldCenters(){return matchMedia('(max-height:600px) and (orientation:landscape)').matches?BAKERY_COMPACT_CENTERS:BAKERY_CENTERS}
function bakeryCameraX(camera=bakeryCamera){const centers=bakeryWorldCenters(),i=Math.min(1,Math.floor(camera));return centers[i]+(centers[i+1]-centers[i])*(camera-i)-1000}
let bakeryPage='menu',bakeryCamera=1,bakeryJourney=null,bakeryFrame=0,bakeryTier=0,bakeryCarouselScroll=0;
function worldImage(name,classes='',alt=''){
 const approved=['menu-frame','packages-frame','orders-frame'].includes(name);
 return `<img src="assets/${approved?'bakery-approved':'bakery-faithful'}/${name}.png" class="${classes}" alt="${hubEscape(alt)}" draggable="false">`;
}
function worldButton(label,action,{icon='',classes='',extra=''}={}){
 return `<button type="button" class="scene-button ${classes}" ${action?`data-hub-action="${action}"`:''} ${extra}>${icon?worldImage(icon,'button-icon'):''}<span>${label}</span></button>`;
}
function worldPackageImage(rank,classes=''){
 return worldImage(`package-${String(rank+1).padStart(2,'0')}`,classes,`${PACKAGE_TYPES[rank]} Package`);
}
const SCENE_ORIGINAL_FOODS=new Set(['ube-ensaymada','brazo','buko-pie','pianono','ensaymada','ube-pandesal']);
const scenePreservedFoodArt=hubFoodArt;
hubFoodArt=function(id,extra=''){
 return SCENE_ORIGINAL_FOODS.has(id)?worldImage('food-'+id,`food-art illustrated-food ${extra}`,F(id).name):scenePreservedFoodArt(id,extra);
};
function sceneScrollRail(kind){
 const map={food:['cabinet-scroll','cabinet-scrollbar','cabinet-track','cabinet-thumb'],order:['order-scroller','board-scroll-rail','board-scroll-track','board-scroll-thumb'],package:['package-carousel','package-scrollbar','package-track','package-thumb']};
 const [sc,rail,track,thumb]=map[kind];
 return `<div id="${rail}" class="scene-scroll-rail ${kind}-rail"><span class="scroll-rail-art" aria-hidden="true"></span><button type="button" class="scene-scroll-end scroll-start" data-scene-scroll="${sc}" data-scroll-direction="-1" aria-label="Scroll ${kind}s backward"></button><div class="scene-scroll-track" id="${track}"><span id="${thumb}" class="scene-scroll-thumb" role="scrollbar" tabindex="0" aria-label="${kind} scroll position" aria-controls="${sc}" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="scroll-thumb-art" aria-hidden="true"></span></span></div><button type="button" class="scene-scroll-end scroll-finish" data-scene-scroll="${sc}" data-scroll-direction="1" aria-label="Scroll ${kind}s forward"></button></div>`;
}
function renderSceneFoods(){
 const foods=sortedMenuFoods([...g.owned]),equipped=new Set(g.activeMenu);
 const slot=g.menuSlots>=FOOD.length?'':worldButton(`<b class="slot-plus">+</b><strong>Add Menu Slot</strong><small>${amountLabel(slotCost())} coins</small>`,'slot',{classes:'scene-food-card slot-card'});
 let result=slot+foods.map(o=>{const f=F(o.id),label=multiplierLabel(foodValue(o));
  return `<button type="button" class="scene-food-card hub-food r${f.rarity}" data-food="${f.id}" data-uid="${o.uid}" onclick="openHubFood(${o.uid})" aria-label="Manage ${hubEscape(f.name)}, ${RARITIES[f.rarity]}, Mastery ${recipeMastery(o)}, Boost ${label}"><span class="food-meta">${f.rarity+1}★ · Lv ${recipeMastery(o)+1}${equipped.has(o.uid)?'':' · Owned'}</span>${hubFoodArt(f.id,'scene-food-image')}<span class="food-multiplier" style="--boost-font:${label.length>9?23:30}px">${hubBoostDiamond()}<b>×${label}</b></span></button>`;
 }).join('');
 for(let i=foods.length+(slot?1:0);i<8;i++)result+=`<div class="scene-food-card unfilled-slot" aria-label="${i<g.menuSlots?'Available menu slot':'More menu slots to unlock'}">${worldImage('hat-icon')}<span>${i<g.menuSlots?'Ready for a recipe':'More recipes to discover'}</span></div>`;
 return result;
}
function renderWorldMenu(){
 return `<section class="faithful-menu" aria-label="Menu counter">${worldImage('menu-frame','scene-frame')}
 <div class="scene-menu-opening"><div id="cabinet-scroll" class="scene-food-scroll showcase-scroll" tabindex="0" aria-label="Your real bakery foods, scroll to browse"><div id="cabinet-grid" class="scene-food-grid">${renderSceneFoods()}</div></div>${sceneScrollRail('food')}</div>
 <button type="button" class="counter-packages world-counter-packages hub-package" data-hub-action="packages" aria-label="Visit Packages">${worldImage('counter-gifts')}</button>
 ${worldImage('register','counter-register world-register')}
 </section>`;
}
function renderWorldPackages(){
 const rank=bakeryTier,next=nextPackageToUnlock(),odds=packageProbabilities(rank),unlocked=packageUnlocked(rank);
 return `<section id="package-station" class="faithful-packages" aria-label="Packages counter"><div class="package-paper"></div>${worldImage('packages-frame','scene-frame')}
 <div class="package-showcase">${worldPackageImage(rank,'featured-package')}<strong>${rank+1}★ ${PACKAGE_TYPES[rank]}</strong></div>
 <div id="package-carousel" class="package-carousel world-package-selector" data-scroll-axis="vertical" tabindex="0" role="group" aria-label="Package tiers, scroll vertically or use up and down arrow keys"><div class="package-tier-list">${PACKAGE_SHOP.map(type=>`<button type="button" class="package-tier ${packageUnlocked(type.rank)?'':'is-locked'}" data-world-tier="${type.rank}" aria-pressed="${type.rank===rank}" aria-label="${type.name} Package${packageUnlocked(type.rank)?'':`, unlock at ${type.orders} orders`}">${worldPackageImage(type.rank)}<span><b>${type.rank+1}★</b> ${type.name}<small>${packageUnlocked(type.rank)?'Available':`${type.orders} orders`}</small></span></button>`).join('')}</div></div>${sceneScrollRail('package')}
 <div class="package-discovery"><strong>${worldImage('gift-icon')}Next Discovery</strong><span>${next?`${Math.min(g.completed,next.orders)} / ${next.orders} orders`:'All tiers unlocked'}</span><div class="scene-meter discovery-meter" role="progressbar" aria-label="Next package unlock" aria-valuemin="0" aria-valuemax="${next?.orders||1}" aria-valuenow="${next?Math.min(g.completed,next.orders):1}"><i style="width:${next?Math.min(100,g.completed/next.orders*100):100}%"></i></div></div>
 <div class="package-title"><b>${rank+1}★</b><h2>${hubEscape(PACKAGE_TYPES[rank])} Package</h2></div>
 <div class="chance-panel" aria-label="Food rarity chances"><div class="chance-rows">${odds.map((p,i)=>p?`<div class="chance-row world-odds-row chance-${i}" style="--chance-color:${['#dba255','#ee9a50','#0fbdec','#be52ed','#ffc53b','#fa7e91','#9e59ed','#f0b52d'][i]}"><span class="chance-star" aria-hidden="true">✧</span><strong>${RARITIES[i]}</strong><span class="scene-meter"><i style="width:${p*100}%"></i></span><b>${probabilityLabel(p).replace('<','&lt;')}</b></div>`:'').join('')}</div></div>
 <div class="purchase-options">${[1,5,10].map(count=>`<button type="button" class="scene-buy" data-world-buy="${count}" ${packageBatchUnavailable(rank,count)?'disabled':''} aria-label="Open ${count} ${PACKAGE_TYPES[rank]} packages for ${amountLabel(packagePrice(rank)*count)} coins"><strong>Open ×${count}</strong><span>${worldImage('price-coin')}<b>${amountLabel(packagePrice(rank)*count)}</b></span></button>`).join('')}</div>
 <p class="world-purchase-notice package-notice" role="status">${!unlocked?`Unlock after ${PACKAGE_SHOP[rank].orders} completed orders.`:g.coins<packagePrice(rank)?'Complete orders to earn more coins.':''}${g.packages[rank]?` <button type="button" data-world-saved>Open saved ×${savedPackageBatch(rank)}</button>`:''}</p>
 </section>`;
}
function sceneRewardArt(rank){
 const name={3:'bucket',4:'cart',5:'chest',7:'crown'}[rank];
 return name?worldImage('reward-'+name,'scene-reward-image',hubCoinTierName(rank)):hubCoinArt(rank,'scene-reward-image');
}
function renderSceneTickets(){
 return g.board.map(ticket=>{const rank=ticketCoinTier(ticket),food=orderFood(ticket),run=g.orderRuns[ticket.id],progress=ticketProgress(ticket);
  const paper=rank===3?'purple':rank===5?'pink':rank===7?'rainbow':'gold';
  return `<button type="button" class="scene-ticket hub-ticket ticket coin-tier-${rank}" data-ticket-id="${ticket.id}" data-order-food="${food.id}" onclick="startTicket(${ticket.id})" aria-label="${run?.phase==='claim'?'Collect':run?'Resume':'Start'} ${hubEscape(ticketOrderLabel(ticket))}, ${hubEscape(food.name)}, ${ticket.a} × ${ticket.b}, ${progress}% complete, ${hubEscape(hubCoinTierName(rank))}">
  ${worldImage('ticket-'+paper,'scene-ticket-shell')}<span class="scene-ticket-reward">${sceneRewardArt(rank)}</span><span class="scene-ticket-plaque">${hubEscape(hubCoinTierName(rank))}</span>
  <span class="scene-ticket-main"><span class="scene-ticket-equation"><span class="equation-group">${hubFoodArt(food.id,'scene-order-food')}<strong>× ${ticket.a}</strong></span><span class="equation-group">${worldImage('tray','scene-tray')}<strong>× ${ticket.b}</strong></span></span><span class="scene-ticket-progress scene-meter" role="progressbar" aria-label="Order progress" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i><span>${run?.phase==='claim'?'Collect':run?'Resume':'Progress'}</span><b>${progress}%</b></span></span></button>`;
 }).join('');
}
function renderWorldOrders(){
 return `<section class="faithful-orders" aria-label="Orders kiosk">${worldImage('orders-frame','scene-frame')}
 <div class="scene-order-tools">${worldButton('<span>New Orders</span>','refresh',{icon:'refresh-icon',classes:'scene-utility',extra:'id="refreshOrders"'})}${worldButton('Reward Odds','odds',{icon:'utility-gift',classes:'scene-utility'})}</div>
 <div id="order-scroller" class="scene-order-scroll hub-order-scroll" tabindex="0" aria-label="Orders, scroll to browse"><div id="order-items">${renderSceneTickets()}</div></div>${sceneScrollRail('order')}</section>`;
}
function renderBakeryWorld(){
 return `<div class="scene-window"><main id="stage" class="bakery-ui faithful-world" data-rendered="true" aria-label="My Panaderya bakery"><div class="world-track" style="transform:translate3d(${-bakeryCameraX()}px,0,0)"><div class="scene-room" aria-hidden="true"></div>${BAKERY_PAGES.map((name,i)=>`<div class="scene-page" data-world-page="${name}" style="left:${BAKERY_CENTERS[i]-1000}px">${name==='menu'?renderWorldMenu():name==='packages'?renderWorldPackages():renderWorldOrders()}</div>`).join('')}</div></main></div>
 <div class="scene-hud world-hud" aria-label="Bakery controls"><button type="button" class="scene-wallet" id="wallet-button" data-hub-action="wallet" aria-label="View ${amountLabel(g.coins)} coins">${worldImage('price-coin')}<span id="walletCoins">${amountLabel(g.coins)}</span></button><button type="button" class="scene-boost boost-counter" id="boost-status" data-hub-action="boost" aria-label="Baker's Boost ×${multiplierLabel(bakeryValue())}">${hubBoostDiamond()}<b id="bakerBoost">×${multiplierLabel(bakeryValue())}</b></button><button type="button" class="scene-round scene-help" id="help-button" data-hub-action="help" aria-label="Help">${bakeryIcon('help')}</button><button type="button" class="scene-round scene-settings" id="settings-button" data-hub-action="settings" aria-label="Settings">${bakeryIcon('settings')}</button></div>
 <nav class="scene-nav world-nav" aria-label="Bakery navigation">${worldButton('Packages','packages',{icon:'gift-icon',classes:'nav-packages',extra:'data-world-nav="packages"'})}${worldButton(bakeryPage==='menu'?'View All Foods':'Menu','center',{icon:'hat-icon',classes:'nav-home',extra:'data-world-nav="menu"'})}${worldButton('Orders','orders',{icon:'orders-icon',classes:'nav-orders',extra:'data-world-nav="orders"'})}</nav><span class="scene-announcement" aria-live="polite"></span>`;
}
function fitBakeryWorld(){
 const compact=matchMedia('(max-height:600px) and (orientation:landscape)').matches;
 const scale=compact?innerWidth/2000:Math.min(innerWidth/2000,innerHeight/1200),stage=$('stage');
 document.body.style.setProperty('--bakery-scale',scale);document.body.style.setProperty('--scene-target',`${44/scale}px`);
 document.body.style.setProperty('--scene-phone-scale',innerWidth/2000);
 if(stage)stage.style.transform=`scale(${scale})`;
 const carousel=$('package-carousel');if(carousel&&!carousel.dataset.restored){carousel.scrollTop=bakeryCarouselScroll;carousel.dataset.restored='true'}
 hubScrollControls?.update();paintBakeryCamera();syncBakeryPages();bindBakeryWorld();
}
function paintBakeryCamera(){
 const track=document.querySelector('.world-track');
 if(track)track.style.transform=`translate3d(${-bakeryCameraX()}px,0,0)`;
 for(const page of document.querySelectorAll('[data-world-page]'))page.style.left=(bakeryWorldCenters()[BAKERY_PAGES.indexOf(page.dataset.worldPage)]-1000)+'px';
}
function syncBakeryPages(){
 document.body.style.setProperty('--scene-phone-height',`${bakeryPage==='orders'?1395:1094}px`);
 for(const page of document.querySelectorAll('[data-world-page]')){const active=page.dataset.worldPage===bakeryPage;page.inert=!active;page.setAttribute('aria-hidden',String(!active))}
 for(const button of document.querySelectorAll('[data-world-nav]')){
  const active=button.dataset.worldNav===bakeryPage;button.setAttribute('aria-pressed',String(active));
  if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  if(button.dataset.worldNav==='menu'){
   button.querySelector('span').textContent=bakeryPage==='menu'?'View All Foods':'Menu';
   button.querySelector('.button-icon').src=`assets/bakery-faithful/${bakeryPage==='menu'?'book-icon':'hat-icon'}.png`;
  }
 }
 const message=document.querySelector('.scene-announcement');if(message)message.textContent=bakeryPage==='menu'?'Menu':bakeryPage==='packages'?'Packages':'Orders';
}
function bakeryCameraStep(time){
 if(!bakeryJourney)return;
 const t=Math.max(0,Math.min(1,(time-bakeryJourney.started)/bakeryJourney.duration));
 bakeryCamera=bakeryJourney.from+(bakeryJourney.to-bakeryJourney.from)*t*t*(3-2*t);paintBakeryCamera();
 if(t<1)bakeryFrame=requestAnimationFrame(bakeryCameraStep);else{bakeryJourney=null;bakeryFrame=0}
}
function navigateBakery(page){
 if(!BAKERY_PAGES.includes(page)||g.run&&!g.run.paused)return false;
 if(page===bakeryPage)return true;
 if(hubCollection)closeHubCollection();
 const viewport=document.querySelector('.scene-window');if(viewport)viewport.scrollTop=0;
 const oldFocus=document.activeElement?.closest('[data-world-page]');bakeryPage=page;cancelAnimationFrame(bakeryFrame);
 const target=BAKERY_PAGES.indexOf(page),distance=Math.abs(target-bakeryCamera);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){bakeryCamera=target;bakeryJourney=null;paintBakeryCamera()}
 else{bakeryJourney={from:bakeryCamera,to:target,started:performance.now(),duration:distance>1?740:480};bakeryFrame=requestAnimationFrame(bakeryCameraStep)}
 syncBakeryPages();if(oldFocus)document.querySelector(`[data-world-nav="${page}"]`)?.focus({preventScroll:true});return true;
}
function selectBakeryTier(rank){
 if(!Number.isInteger(rank)||!PACKAGE_SHOP[rank])return false;
 bakeryCarouselScroll=$('package-carousel')?.scrollTop||0;bakeryTier=rank;packageFeaturedRank=rank;render();
 const strip=$('package-carousel'),selected=strip?.querySelector(`[data-world-tier="${rank}"]`);
 if(selected){selected.focus({preventScroll:true});if(selected.offsetTop<strip.scrollTop)strip.scrollTop=selected.offsetTop;else if(selected.offsetTop+selected.offsetHeight>strip.scrollTop+strip.clientHeight)strip.scrollTop=selected.offsetTop+selected.offsetHeight-strip.clientHeight;bakeryCarouselScroll=strip.scrollTop;hubScrollControls?.update()}
 return true;
}
function buyBakeryPackage(count){
 if(packageBatchView||packageBatchUnavailable(bakeryTier,count))return false;
 packageFeaturedRank=bakeryTier;return purchasePackageBatch(quotePackageBatch(bakeryTier,count).id);
}
function bindBakeryWorld(){
 const home=$('hubHome');if(!home||home.dataset.sceneBound)return;home.dataset.sceneBound='true';
 home.addEventListener('click',event=>{
  const tier=event.target.closest('[data-world-tier]'),buy=event.target.closest('[data-world-buy]'),scroll=event.target.closest('[data-scene-scroll]');
  if(tier)selectBakeryTier(Number(tier.dataset.worldTier));if(buy&&!buy.disabled)buyBakeryPackage(Number(buy.dataset.worldBuy));
  if(event.target.closest('[data-world-saved]'))openSavedPackageBatch(bakeryTier);
  if(scroll){const sc=$(scroll.dataset.sceneScroll),direction=Number(scroll.dataset.scrollDirection);sc.scrollBy({top:direction*180,behavior:'smooth'})}
 });
 home.addEventListener('scroll',event=>{if(event.target.id==='package-carousel')bakeryCarouselScroll=event.target.scrollTop},true);
 home.addEventListener('keydown',event=>{
  if(!event.target.closest('#package-carousel'))return;
  const next=event.key==='Home'?0:event.key==='End'?PACKAGE_SHOP.length-1:['ArrowLeft','ArrowUp'].includes(event.key)?Math.max(0,bakeryTier-1):['ArrowRight','ArrowDown'].includes(event.key)?Math.min(PACKAGE_SHOP.length-1,bakeryTier+1):null;
  if(next!==null){event.preventDefault();selectBakeryTier(next)}
 });
}
const sceneOpenPackages=openPackages,sceneShowPackageCollection=showPackageCollection,sceneShowSelectedPackage=showSelectedPackage;
openPackages=function(tab='buy',rank=null){
 if(!isBakeryHub())return sceneOpenPackages(tab,rank);
 if(packageBatchView||g.run&&!g.run.paused)return false;
 if(g.packageBatchReceipt){presentPackageBatch(true);return true}
 if(modal)closeModal();navigateBakery('packages');if(rank!==null)selectBakeryTier(Number(rank));return true;
};
showPackageCollection=function(restore=false){if(!isBakeryHub())return sceneShowPackageCollection(restore);navigateBakery('packages')};
showSelectedPackage=function(rank){if(!isBakeryHub())return sceneShowSelectedPackage(rank);navigateBakery('packages');return selectBakeryTier(rank)};
const sceneText=window.render_game_to_text;
window.render_game_to_text=()=>{const state=JSON.parse(sceneText());state.scene={page:bakeryPage,camera:bakeryCamera,cameraX:bakeryCameraX(),transitioning:!!bakeryJourney,order:BAKERY_PAGES,presentation:'approved-artwork-v3'};if(bakeryPage==='packages'&&!packageBatchView)state.packages.view='scene';state.packages.selected=bakeryTier;return JSON.stringify(state)};
