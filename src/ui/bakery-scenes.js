/* Original-art reconstruction. View-only: production controllers own all state,
 * transactions and worksheet/Co-Baker sessions. The camera and all scenery share
 * one world; only the screen and the intended inner lists clip their contents. */
const BAKERY_PAGES=Object.freeze(['packages','menu','orders']);
// Dolly the complete world (room, floor, fixtures and their contact shadows).
// Station coordinates and physical gaps are independent of this camera setting.
const BAKERY_CAMERA_ZOOM=1.10;
const BAKERY_PACKAGE_DISPLAY_ORDER=Object.freeze(PACKAGE_SHOP.map(t=>t.rank));
// Centers account for each PNG's visible silhouette, rather than equal page boxes.
// Native visible widths 1592, 1612, 936, each scaled .92. Both floor gaps stay 220.
// Keep these world coordinates independent of the viewport/camera scale.
const BAKERY_CENTERS=Object.freeze([1000,2693.84,4085.92]);
const BAKERY_COMPACT_CENTERS=Object.freeze([1000,2693.84,4214.72]);
function bakeryWorldCenters(){return matchMedia('(max-height:600px) and (orientation:landscape)').matches?BAKERY_COMPACT_CENTERS:BAKERY_CENTERS}
function bakeryCameraX(camera=bakeryCamera){const centers=bakeryWorldCenters(),i=Math.max(0,Math.min(1,Math.floor(camera)));return centers[i]+(centers[i+1]-centers[i])*(camera-i)-1000}
let bakeryPage='menu',bakeryCamera=1,bakeryJourney=null,bakeryFrame=0,bakeryTier=null,bakeryHighestDiscovered=null;
function worldImage(name,classes='',alt=''){
 const approved=['menu-frame','packages-frame','orders-frame'].includes(name);
 const src=typeof BAKERY_ASSETS!=='undefined'&&BAKERY_ASSETS[name]||`assets/${approved?'bakery-approved':'bakery-faithful'}/${name}.png`;
 return `<img src="${src}" class="${classes}" alt="${hubEscape(alt)}" decoding="async" draggable="false">`;
}
function worldButton(label,action,{icon='',classes='',extra=''}={}){
 return `<button type="button" class="scene-button ${classes}" ${action?`data-hub-action="${action}"`:''} ${extra}>${icon?worldImage(icon,'button-icon'):''}<span>${label}</span></button>`;
}
function worldPackageImage(rank,classes=''){
 return worldImage(`package-${String(rank+1).padStart(2,'0')}`,classes,`${PACKAGE_TYPES[rank]} Package`);
}
// The older tiny Ube Ensaymada art had jagged/dirty edges; use the clean numbered sprite 17.
const SCENE_ORIGINAL_FOODS=new Set(['brazo','buko-pie','pianono','ensaymada','ube-pandesal']);
const scenePreservedFoodArt=hubFoodArt;
hubFoodArt=function(id,extra=''){
 return SCENE_ORIGINAL_FOODS.has(id)?worldImage('food-'+id,`food-art illustrated-food ${extra}`,F(id).name):scenePreservedFoodArt(id,extra);
};
function sceneScrollRail(kind){
 const map={food:['cabinet-scroll','cabinet-scrollbar','cabinet-track','cabinet-thumb'],order:['order-scroller','board-scroll-rail','board-scroll-track','board-scroll-thumb']};
 const [sc,rail,track,thumb]=map[kind];
 return `<div id="${rail}" class="scene-scroll-rail ${kind}-rail"><span class="scroll-rail-art" aria-hidden="true"></span><button type="button" class="scene-scroll-end scroll-start" data-scene-scroll="${sc}" data-scroll-direction="-1" aria-label="Scroll ${kind}s backward"></button><div class="scene-scroll-track" id="${track}"><span id="${thumb}" class="scene-scroll-thumb" role="scrollbar" tabindex="0" aria-label="${kind} scroll position" aria-controls="${sc}" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="scroll-thumb-art" aria-hidden="true"></span></span></div><button type="button" class="scene-scroll-end scroll-finish" data-scene-scroll="${sc}" data-scroll-direction="1" aria-label="Scroll ${kind}s forward"></button></div>`;
}
function renderSceneFoods(){
 // The showcase represents owned *menu slots*, not every food in inventory.
 // Do not manufacture locked/undiscovered tiles to pad the grid to eight.
 const equipped=sortedMenuFoods(g.activeMenu.map(uid=>g.owned.find(o=>o.uid===uid)).filter(Boolean));
 const slots=Math.max(0,Math.min(FOOD.length,g.menuSlots));
 let result=equipped.slice(0,slots).map(o=>{const f=F(o.id),label=multiplierLabel(foodValue(o)),level=displayedFoodLevel(o),available=availableMastery(o);
  // All overlays live inside the existing single card button. The level-up
  // indicator opens the same food-details flow, without a nested button.
  return `<button type="button" class="scene-food-card hub-food r${f.rarity}" data-food="${f.id}" data-uid="${o.uid}" onclick="openHubFood(${o.uid})" aria-label="Manage ${hubEscape(f.name)}, ${RARITIES[f.rarity]}, Level ${level}, Baker's Boost ${label}${available?`, ${available} level-ups available`:''}, equipped">${hubFoodArt(f.id,'scene-food-image')}${available?`<span class="food-upgrade-ready" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M12 20V4M5 11l7-7 7 7"/></svg><b>${available}</b></span>`:''}<span class="food-stats" aria-hidden="true"><span class="food-level">Lv. ${level}</span><span class="food-multiplier" style="--boost-font:${label.length>9?18:label.length>7?20:24}px">${hubBoostDiamond()}<b>×${label}</b></span></span></button>`;
 }).join('');
 for(let i=equipped.length;i<slots;i++)result+=worldButton('<b class="slot-plus">+</b><strong>Empty Slot</strong>','collection',{classes:'scene-food-card empty-menu-slot',extra:'aria-label="Empty menu slot. Open Food Inventory to equip a food."'});
 return result;
}
function renderWorldMenu(){
 return `<section class="faithful-menu" aria-label="Menu counter">${worldImage('menu-frame','scene-frame')}
 <div class="scene-menu-opening"><div id="cabinet-scroll" class="scene-food-scroll showcase-scroll" tabindex="0" aria-label="Your real bakery foods, scroll to browse"><div id="cabinet-grid" class="scene-food-grid">${renderSceneFoods()}</div></div>${sceneScrollRail('food')}</div>
 <button type="button" class="counter-packages world-counter-packages hub-package" data-hub-action="packages" aria-label="Visit Packages">${worldImage('counter-gifts')}</button>
 ${worldImage('register','counter-register world-register')}
 <div class="collection-sign" role="group" aria-label="Menu actions"><button type="button" class="scene-button view-all-foods" data-hub-action="collection" aria-label="Open Food Inventory"><span class="inventory-bag-icon" aria-hidden="true"></span><span>Food Inventory</span></button><button type="button" class="scene-button scene-equip-best" data-hub-action="equip-best" aria-label="Equip your best foods"><span>Equip Best</span></button></div>
 </section>`;
}
// Selection stays independent of affordability and survives unrelated renders.
function bakeryCarouselTiers(){
 const next=nextPackageToUnlock();
 return BAKERY_PACKAGE_DISPLAY_ORDER.filter(rank=>packageUnlocked(rank)||rank===next?.rank);
}
function ensureBakeryTier(){
 const highest=PACKAGE_SHOP.filter(t=>packageUnlocked(t.rank)).at(-1).rank;
 if(bakeryHighestDiscovered===null||highest>bakeryHighestDiscovered||bakeryTier===null||!bakeryCarouselTiers().includes(bakeryTier))bakeryTier=highest;
 bakeryHighestDiscovered=highest;
 packageFeaturedRank=bakeryTier;
}
function bakeryMysteryArt(){
 // A solid alpha mask of Gift hides every color/ornament of the unknown tier.
 return `<span class="package-mystery" aria-hidden="true"><span class="package-mystery-shape" style="mask-image:url('${typeof BAKERY_ASSETS!=='undefined'?BAKERY_ASSETS['package-01']:'assets/bakery-faithful/package-01.png'}')"></span><b>?</b></span>`;
}
function bakeryTierLabel(){return packageUnlocked(bakeryTier)?`<span>${bakeryTier+1}\u2605</span><span>${hubEscape(PACKAGE_TYPES[bakeryTier])}</span>`:uiText('Next Discovery')}
function positionBakeryCarouselLabel(){
 const carousel=$('package-carousel'),label=$('package-carousel-label');if(!carousel||!label)return;
 const viewport=carousel.querySelector('.package-carousel-viewport'),button=carousel.querySelector('[aria-pressed="true"]');
 const image=button?.querySelector('img')||carousel.querySelector('img');if(!image?.naturalWidth)return;
 // Measure the contained illustration, not its letterboxed <img> rectangle.
 const artHeight=Math.min(button.clientHeight,button.clientWidth*image.naturalHeight/image.naturalWidth);
 label.style.top=Math.min(carousel.clientHeight-label.offsetHeight-22,viewport.offsetTop+viewport.clientHeight/2+artHeight/2+20)+'px';label.style.bottom='auto';
}
function bakeryCarouselItem(rank,index,selected){
 const known=packageUnlocked(rank),offset=index-selected;
 return `<div class="package-slide" data-carousel-slide="${rank}" style="--offset:${offset}" aria-hidden="${Math.abs(offset)>1}"><button type="button" class="package-preview${known?'':' is-mystery'}" data-world-tier="${rank}" aria-label="${known?`${PACKAGE_TYPES[rank]} Package`:uiText('Next Discovery')}" aria-pressed="${rank===bakeryTier}" tabindex="${Math.abs(offset)>1?-1:0}">${known?worldPackageImage(rank,'carousel-package'):bakeryMysteryArt()}</button></div>`;
}
function bakeryDiscoveryMarkup(){
 const next=nextPackageToUnlock();if(!next)return '';
 const required=PACKAGE_DISCOVERY_COINS[next.rank],progress=Math.min(required,packageCoinCount(g.coinsEarnedSinceLastDiscovery));
 return `<div class="package-discovery scene-meter discovery-meter" role="progressbar" aria-label="Coins earned toward next package discovery" aria-valuemin="0" aria-valuemax="${required}" aria-valuenow="${progress}" aria-valuetext="${fmt(progress)} of ${fmt(required)} coins earned"><i style="width:${progress/required*100}%"></i><strong>${uiText('Next Discovery')}</strong><span>${worldImage('price-coin')}<b>${fmt(progress)} / ${fmt(required)}</b></span></div>`;
}
function bakeryPackageDetails(){
 const rank=bakeryTier,unlocked=packageUnlocked(rank),odds=unlocked?packageProbabilities(rank):[];
 return `<div class="package-heading-group${nextPackageToUnlock()?' has-discovery':''}"><div class="package-title"><b>${unlocked?`${rank+1}\u2605`:'?'}</b><h2>${unlocked?`${hubEscape(PACKAGE_TYPES[rank])} Package`:uiText('Next Discovery')}</h2></div>
 ${bakeryDiscoveryMarkup()}</div>
 ${unlocked?`<div class="chance-panel" aria-label="Food rarity chances"><div class="chance-rows">${odds.map((p,i)=>({p,i})).filter(({p})=>p>0).reverse().map(({p,i})=>`<div class="chance-row world-odds-row chance-${i}" style="--chance-color:${['#dba255','#ee9a50','#0fbdec','#be52ed','#ffc53b','#fa7e91','#9e59ed','#f0b52d'][i]}"><span class="chance-star" aria-hidden="true">\u2727</span><strong>${RARITIES[i]}</strong><span class="scene-meter"><i style="width:${p*100}%"></i></span><b>${probabilityLabel(p).replace('<','&lt;')}</b></div>`).join('')}</div></div>
 <div class="purchase-options">${[1,5,10].map(count=>`<button type="button" class="scene-buy" data-world-buy="${count}" ${packageBatchUnavailable(rank,count)?'disabled':''} aria-label="Open ${count} ${PACKAGE_TYPES[rank]} packages for ${amountLabel(packagePrice(rank)*count)} coins"><strong>Open \u00d7${count}</strong><span>${worldImage('price-coin')}<b>${amountLabel(packagePrice(rank)*count)}</b></span></button>`).join('')}</div>
 <p class="world-purchase-notice package-notice" role="status">${!g.packages[rank]&&g.coins<packagePrice(rank)?'Complete orders to earn more coins.':''}${g.packages[rank]?` <button type="button" data-world-saved>Open saved \u00d7${savedPackageBatch(rank)}</button>`:''}</p>`:`<div class="package-locked-details"><span aria-hidden="true">?</span><strong>${uiText('A new surprise awaits!')}</strong><p>${uiText('Earn coins from playing to discover your next package.')}</p></div>`}`;
}
function renderWorldPackages(){
 ensureBakeryTier();const tiers=bakeryCarouselTiers(),selected=tiers.indexOf(bakeryTier);
 return `<section id="package-station" class="faithful-packages${nextPackageToUnlock()?'':' all-packages-discovered'}" aria-label="Packages counter">${worldImage('packages-frame','scene-frame')}
 <div class="package-interior"><div class="package-showcase"><div id="package-carousel" class="package-carousel" tabindex="0" role="region" aria-roledescription="carousel" aria-label="Packages; select a neighbor, swipe, or use left and right arrow keys"><div class="package-carousel-viewport">${tiers.map((rank,index)=>bakeryCarouselItem(rank,index,selected)).join('')}</div><strong id="package-carousel-label" aria-live="polite" aria-atomic="true">${bakeryTierLabel()}</strong></div></div>
 <div class="package-details">${bakeryPackageDetails()}</div></div></section>`;
}
// Staff and Co-Baker rewards can arrive while browsing. Preserve the carousel
// node, focus and current gesture; replace only a newly discovered silhouette.
function refreshBakeryDiscovery(){
 const previous=bakeryTier;ensureBakeryTier();
 const station=$('package-station'),carousel=$('package-carousel');if(!station||!carousel)return;
 if(previous!==bakeryTier){selectBakeryTier(bakeryTier);return}
 const tiers=bakeryCarouselTiers(),selected=tiers.indexOf(bakeryTier);
 const slides=carousel.querySelectorAll('[data-carousel-slide]');
 if(slides.length!==tiers.length||[...slides].some(slide=>slide.querySelector('.is-mystery')&&packageUnlocked(Number(slide.dataset.carouselSlide)))){
  carousel.querySelector('.package-carousel-viewport').innerHTML=tiers.map((rank,index)=>bakeryCarouselItem(rank,index,selected)).join('');
 }
 station.classList.toggle('all-packages-discovered',!nextPackageToUnlock());
 station.querySelector('.package-details').innerHTML=bakeryPackageDetails();
 $('package-carousel-label').innerHTML=bakeryTierLabel();
 positionBakeryCarouselLabel();
 if(typeof schedulePackageUnlockCelebration==='function')schedulePackageUnlockCelebration();
}
function sceneRewardArt(rank){
 return WorksheetComponents.coinArt(rank,hubAsset(`coin-${String(rank+1).padStart(2,'0')}.png`)).replace('coin-tier-art illustrated-coin','coin-tier-art illustrated-coin scene-reward-image');
}
// Alpha bounds measured from the existing artwork. Crop only its transparent
// margins in the equation viewport; the original food images remain untouched.
const SCENE_FOOD_BOUNDS=Object.freeze([
 [280,280,19,72,276,280],[281,280,18,58,266,278],[281,280,13,49,254,280],
 [280,280,2,68,253,280],[280,281,13,48,280,268],[281,281,14,53,267,263],
 [281,281,0,57,263,253],[280,281,0,39,268,266],[280,280,13,49,279,253],
 [281,280,8,27,272,254],[281,280,0,27,269,259],[280,280,0,48,263,261],
 [280,281,9,24,280,256],[281,281,4,11,276,248],[281,281,0,20,260,248],
 [280,281,0,12,272,250],[280,280,10,21,280,255]
]);
const SCENE_ORIGINAL_FOOD_BOUNDS=Object.freeze({
 'ube-ensaymada':[147,122,4,4,143,118],brazo:[147,121,4,4,143,117],
 'buko-pie':[155,120,4,4,151,116],pianono:[154,120,4,4,150,116],
 ensaymada:[150,119,4,4,146,115],'ube-pandesal':[173,116,4,4,162,104]
});
// These eight approved art sprites have their own square canvas and do not
// need the legacy tight crop applied to the original rectangular food assets.
const SCENE_APPROVED_SQUARE_FOODS=new Set(['brazo','buko-pie','ube-pandesal','pianono','mamon','hopia','ensaymada','kalihim','ube-ensaymada']);
function sceneEquationFood(id){
 if(SCENE_APPROVED_SQUARE_FOODS.has(id)){
  return `<span class="equation-food" style="--food-ratio:1;--food-width:100%;--food-height:100%;--food-left:0%;--food-top:0%">${hubFoodArt(id,'scene-order-food')}</span>`;
 }
 const [iw,ih,x,y,r,b]=SCENE_ORIGINAL_FOOD_BOUNDS[id]||SCENE_FOOD_BOUNDS[(HUB_FOOD_SPRITES[id]||1)-1],w=r-x,h=b-y;
 return `<span class="equation-food" style="--food-ratio:${w/h};--food-width:${100*iw/w}%;--food-height:${100*ih/h}%;--food-left:${-100*x/w}%;--food-top:${-100*y/h}%">${hubFoodArt(id,'scene-order-food')}</span>`;
}
function renderSceneTickets(){
 return g.board.map(ticket=>{const rank=ticketCoinTier(ticket),food=orderFood(ticket),run=g.orderRuns[ticket.id],progress=ticketProgress(ticket);
  const paper=rank===3?'purple':rank===5?'pink':rank===7?'rainbow':'gold';
  return `<button type="button" class="scene-ticket hub-ticket ticket coin-tier-${rank}" data-ticket-id="${ticket.id}" data-order-food="${food.id}" onclick="startTicket(${ticket.id})" aria-label="${run?.phase==='claim'?'Collect':run?'Resume':'Start'} ${hubEscape(ticketOrderLabel(ticket))}, ${hubEscape(food.name)}, ${ticket.a} × ${ticket.b}, ${progress}% complete, ${hubEscape(hubCoinTierName(rank))}">
  ${worldImage('ticket-'+paper,'scene-ticket-shell')}<span class="scene-ticket-coin-paper" aria-hidden="true"></span><span class="scene-ticket-reward">${sceneRewardArt(rank)}<span class="scene-coin-star-badge" aria-hidden="true">${rank+1} ★</span></span>
  <span class="scene-ticket-main"><span class="scene-ticket-equation${String(ticket.a).length>3?' is-wide-math':''}"><span class="equation-group"><strong>${ticket.a}</strong>${sceneEquationFood(food.id)}</span><span class="equation-times">×</span><span class="equation-group"><strong>${ticket.b}</strong>${worldImage('tray','scene-tray')}</span></span><span class="scene-ticket-progress scene-meter" role="progressbar" aria-label="Order progress" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i><span>${run?.phase==='claim'?'Collect':run?'Resume':'Progress'}</span><b>${progress}%</b></span></span></button>`;
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
 <nav class="scene-nav world-nav" aria-label="Bakery navigation">${worldButton('Packages','packages',{icon:'gift-icon',classes:'nav-packages',extra:'data-world-nav="packages"'})}${worldButton('Menu','center',{icon:'hat-icon',classes:'nav-home',extra:'data-world-nav="menu"'})}${worldButton('Orders','orders',{icon:'orders-icon',classes:'nav-orders',extra:'data-world-nav="orders"'})}</nav><span class="scene-announcement" aria-live="polite"></span>`;
}
function fitBakeryWorld(){
 const compact=matchMedia('(max-height:600px) and (orientation:landscape)').matches;
 const scale=(compact?innerWidth/2000:Math.min(innerWidth/2000,innerHeight/1200))*BAKERY_CAMERA_ZOOM,stage=$('stage');
 const viewport=document.querySelector('.scene-window');
 if(viewport&&viewport.dataset.compact!==String(compact)){viewport.scrollTop=0;viewport.dataset.compact=String(compact)}
 document.body.style.setProperty('--bakery-scale',scale);document.body.style.setProperty('--scene-target',`${44/(scale*.92)}px`);
 document.body.style.setProperty('--scene-phone-scale',innerWidth/2000);
 if(stage)stage.style.transform=`scale(${scale})`;
 fitPhoneBakeryKiosks(compact,scale);
 hubScrollControls?.update();paintBakeryCamera();syncBakeryPages();bindBakeryWorld();positionBakeryCarouselLabel();
}
// Fit important content between the floating HUD and navigation. The remaining
// illustrated base may extend behind navigation; each raster scales uniformly.
function phoneBakeryKioskScale(kind,width,contentEnd,availableWidth,availableHeight,worldScale){
 const vertical=kind==='menu'?Math.min((availableHeight-44)/contentEnd,availableHeight/(contentEnd+78)):availableHeight/contentEnd;
 return Math.max(.1,Math.min(worldScale*.92,availableWidth/width,vertical));
}
function fitPhoneBakeryKiosks(compact,worldScale){
 if(!compact)return;
 const viewport=document.querySelector('.scene-window'),hud=document.querySelector('.scene-hud'),nav=document.querySelector('.scene-nav');
 if(!viewport||viewport.closest('[hidden]')||!hud||!nav)return;
 const paddingTop=parseFloat(getComputedStyle(viewport).paddingTop)||0,top=Math.max(paddingTop,hud.getBoundingClientRect().bottom+12),availableHeight=nav.getBoundingClientRect().top-top-6;
 for(const section of document.querySelectorAll('.scene-page>section')){
  const kind=section.closest('[data-world-page]').dataset.worldPage;
  const end=kind==='packages'?section.querySelector('.package-interior').offsetTop+section.querySelector('.package-interior').offsetHeight:
   kind==='menu'?section.querySelector('.collection-sign').offsetTop+Math.max(0,section.querySelector('.collection-sign').offsetHeight-78):
   section.offsetHeight-parseFloat(getComputedStyle(section.querySelector('.scene-order-scroll')).bottom);
  const unit=phoneBakeryKioskScale(kind,section.offsetWidth,end,innerWidth-32,availableHeight,worldScale);
  section.style.setProperty('--phone-kiosk-scale',unit/worldScale);
  section.style.setProperty('--phone-kiosk-unit',unit);
  section.style.setProperty('--phone-kiosk-top',`${(top-paddingTop)/worldScale}px`);
  section.style.setProperty('--scene-target',`${44/unit}px`);
 }
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
 }
 const message=document.querySelector('.scene-announcement');if(message)message.textContent=bakeryPage==='menu'?'Menu':bakeryPage==='packages'?'Packages':'Orders';
}
function bakeryCameraStep(time){
 if(!bakeryJourney)return;
 const t=Math.max(0,Math.min(1,(time-bakeryJourney.started)/bakeryJourney.duration));
 const ease=bakeryJourney.spring?1+2.2*(t-1)**3+1.2*(t-1)**2:t*t*(3-2*t);
 bakeryCamera=bakeryJourney.from+(bakeryJourney.to-bakeryJourney.from)*ease;paintBakeryCamera();
 if(t<1)bakeryFrame=requestAnimationFrame(bakeryCameraStep);else{bakeryJourney=null;bakeryFrame=0}
}
function navigateBakery(page){
 if(!BAKERY_PAGES.includes(page)||g.run&&!g.run.paused)return false;
 if(page==='packages'){ensureBakeryTier();selectBakeryTier(PACKAGE_SHOP.filter(t=>packageUnlocked(t.rank)).at(-1).rank)}
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
 const tiers=bakeryCarouselTiers();if(!Number.isInteger(rank)||!tiers.includes(rank))return false;
 bakeryTier=rank;packageFeaturedRank=rank;
 const carousel=$('package-carousel');if(!carousel)return true;
 const selected=tiers.indexOf(rank),hadFocus=carousel.contains(document.activeElement);
 for(const slide of carousel.querySelectorAll('[data-carousel-slide]')){
  const offset=tiers.indexOf(Number(slide.dataset.carouselSlide))-selected,button=slide.querySelector('button');
  slide.style.setProperty('--offset',offset);slide.setAttribute('aria-hidden',String(Math.abs(offset)>1));
  button.setAttribute('aria-pressed',String(Number(slide.dataset.carouselSlide)===rank));button.tabIndex=Math.abs(offset)>1?-1:0;
 }
 refreshBakeryDiscovery();if(hadFocus)carousel.focus({preventScroll:true});return true;
}
function buyBakeryPackage(count){
 if(packageBatchView||packageBatchUnavailable(bakeryTier,count))return false;
 packageFeaturedRank=bakeryTier;return purchasePackageBatch(quotePackageBatch(bakeryTier,count).id);
}
// Touch-only page gestures. Nested controls and native scroll surfaces own their
// entire gesture, even when their scroll/carousel happens to be at an endpoint.
function bindBakeryPageSwipe(home){
 let swipe=null,frame=0,clickUntil=0;
 const blocked='a,input,select,textarea,iframe,[contenteditable],[draggable="true"],[role="slider"],[role="scrollbar"],#package-carousel,.scene-scroll-rail,.scene-hud,.scene-nav';
 const unavailable=()=>modal||hubCollection||packageBatchView||g.run&&!g.run.paused||$('app')?.inert;
 const draw=()=>{frame=0;if(swipe){bakeryCamera=swipe.camera;paintBakeryCamera()}};
 const finish=(cancel=false)=>{
  if(!swipe)return;
  const s=swipe;cancelAnimationFrame(frame);frame=0;swipe=null;
  if(!s.dragging)return;
  bakeryCamera=s.camera;paintBakeryCamera();clickUntil=performance.now()+400;
  const dx=s.lastX-s.x,elapsed=performance.now()-s.time;
  const fast=elapsed<300&&Math.abs(dx)>=28&&Math.abs(dx)/Math.max(1,elapsed)>.5;
  const next=s.index+(dx<0?1:-1);
  if(!cancel&&!unavailable()&&bakeryPage===s.page&&next>=0&&next<BAKERY_PAGES.length&&(Math.abs(dx)>=Math.min(100,Math.max(55,s.width*.09))||fast)){
   navigateBakery(BAKERY_PAGES[next]);return;
  }
  // Ease out with a small overshoot, returning to the exact original camera.
  const target=BAKERY_PAGES.indexOf(bakeryPage);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){bakeryCamera=target;paintBakeryCamera();return}
  bakeryJourney={from:bakeryCamera,to:target,started:performance.now(),duration:320,spring:true};
  bakeryFrame=requestAnimationFrame(bakeryCameraStep);
 };
 home.addEventListener('touchstart',event=>{
  if(swipe){finish(true);return}
  // A new deliberate touch is never the synthetic click from the prior swipe.
  clickUntil=0;
  if(event.touches.length!==1||unavailable()||!event.target.closest('.scene-window')||event.target.closest(blocked))return;
  for(let node=event.target;node&&node!==home;node=node.parentElement){
   const style=getComputedStyle(node);
   if(/auto|scroll/.test(style.overflowX+' '+style.overflowY)&&!node.matches('.scene-window'))return;
  }
  const t=event.touches[0],stage=$('stage'),index=BAKERY_PAGES.indexOf(bakeryPage);
  swipe={id:t.identifier,x:t.clientX,y:t.clientY,lastX:t.clientX,time:performance.now(),index,page:bakeryPage,camera:index,scale:stage.getBoundingClientRect().width/2000,width:innerWidth,dragging:false};
 },{passive:true});
 home.addEventListener('touchmove',event=>{
  if(!swipe)return;
  if(event.touches.length!==1||unavailable()||bakeryPage!==swipe.page){finish(true);return}
  const t=[...event.touches].find(t=>t.identifier===swipe.id);if(!t)return;
  const dx=t.clientX-swipe.x,dy=t.clientY-swipe.y;
  if(!swipe.dragging){
   if(Math.abs(dy)>10&&Math.abs(dy)>=Math.abs(dx)){swipe=null;return}
   if(Math.abs(dx)<12||Math.abs(dx)<Math.abs(dy)*1.4)return;
   swipe.dragging=true;
   // A new swipe may interrupt the 480ms navigation animation. Continue from
   // the camera's *actual* position instead of throwing away the gesture.
   if(bakeryJourney){cancelAnimationFrame(bakeryFrame);bakeryFrame=0;bakeryJourney=null}
   swipe.camera=bakeryCamera;swipe.startCamera=bakeryCamera;
  }
  if(!event.cancelable){finish(true);return}event.preventDefault();
  swipe.lastX=t.clientX;
  const boundary=swipe.index===0&&dx>0||swipe.index===2&&dx<0;
  const offset=boundary?Math.sign(dx)*36*(1-Math.exp(-Math.abs(dx)/110)):Math.max(-160,Math.min(160,dx*.65));
  const centers=bakeryWorldCenters(),segment=dx>0?Math.max(0,swipe.index-1):Math.min(1,swipe.index);
  swipe.camera=Math.max(0,Math.min(BAKERY_PAGES.length-1,(swipe.startCamera??swipe.index)-offset/(swipe.scale*(centers[segment+1]-centers[segment]))));
  if(!frame)frame=requestAnimationFrame(draw);
 },{passive:false});
 home.addEventListener('touchend',()=>finish());
 home.addEventListener('touchcancel',()=>finish(true));
 window.addEventListener('blur',()=>finish(true));
 window.addEventListener('resize',()=>finish(true));
 home.addEventListener('click',event=>{if(performance.now()<clickUntil){event.preventDefault();event.stopImmediatePropagation()}},true);
}
function bindBakeryWorld(){
 const home=$('hubHome');if(!home||home.dataset.sceneBound)return;home.dataset.sceneBound='true';
 bindBakeryPageSwipe(home);
 let gesture=null,suppressClickUntil=0;
 home.addEventListener('load',event=>{if(event.target.closest?.('#package-carousel'))positionBakeryCarouselLabel()},true);
 home.addEventListener('click',event=>{
  const tier=event.target.closest('[data-world-tier]'),buy=event.target.closest('[data-world-buy]'),scroll=event.target.closest('[data-scene-scroll]');
  if(tier){if(performance.now()<suppressClickUntil){event.preventDefault();return}selectBakeryTier(Number(tier.dataset.worldTier))}
  if(buy&&!buy.disabled)buyBakeryPackage(Number(buy.dataset.worldBuy));
  if(event.target.closest('[data-world-saved]'))openSavedPackageBatch(bakeryTier);
  if(scroll){const sc=$(scroll.dataset.sceneScroll),direction=Number(scroll.dataset.scrollDirection);sc.scrollBy({top:direction*180,behavior:'smooth'})}
 });
 home.addEventListener('keydown',event=>{
  if(!event.target.closest('#package-carousel'))return;
  const tiers=bakeryCarouselTiers(),index=tiers.indexOf(bakeryTier);
  const next=event.key==='Home'?tiers[0]:event.key==='End'?tiers.at(-1):event.key==='ArrowLeft'?tiers[Math.max(0,index-1)]:event.key==='ArrowRight'?tiers[Math.min(tiers.length-1,index+1)]:null;
  if(next!==null){event.preventDefault();selectBakeryTier(next)}
 });
 home.addEventListener('pointerdown',event=>{
  const carousel=event.target.closest('#package-carousel');if(!carousel||!event.isPrimary||event.button!==0)return;
  // A fresh press must work even if the previous carousel swipe just ended.
  suppressClickUntil=0;
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY,carousel,dragged:false};
 });
 home.addEventListener('pointermove',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  if(!gesture.dragged&&Math.abs(dx)>9&&Math.abs(dx)>Math.abs(dy)*1.2){gesture.dragged=true;gesture.carousel.setPointerCapture(event.pointerId);gesture.carousel.classList.add('is-dragging')}
  if(gesture.dragged){
   event.preventDefault();const scale=gesture.carousel.getBoundingClientRect().width/gesture.carousel.offsetWidth;
   gesture.carousel.style.setProperty('--drag',`${Math.max(-180,Math.min(180,dx/scale))}px`);
  }
 });
 const finish=(event,cancel=false)=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  const {carousel,x,y,dragged}=gesture;gesture=null;
  carousel.classList.remove('is-dragging');carousel.style.removeProperty('--drag');
  if(carousel.hasPointerCapture(event.pointerId))carousel.releasePointerCapture(event.pointerId);
  if(dragged){
   suppressClickUntil=performance.now()+400;
   const dx=event.clientX-x,dy=event.clientY-y,tiers=bakeryCarouselTiers(),index=tiers.indexOf(bakeryTier);
   if(!cancel&&Math.abs(dx)>Math.max(28,carousel.getBoundingClientRect().width*.075)&&Math.abs(dx)>Math.abs(dy)*1.2)selectBakeryTier(tiers[Math.max(0,Math.min(tiers.length-1,index+(dx<0?1:-1)))]);
  }
 };
 home.addEventListener('pointerup',event=>finish(event));home.addEventListener('pointercancel',event=>finish(event,true));home.addEventListener('lostpointercapture',event=>{if(event.target===gesture?.carousel)finish(event,true)});
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
window.render_game_to_text=()=>{const state=JSON.parse(sceneText());state.scene={page:bakeryPage,camera:bakeryCamera,cameraX:bakeryCameraX(),zoom:BAKERY_CAMERA_ZOOM,transitioning:!!bakeryJourney,order:BAKERY_PAGES,presentation:'approved-artwork-v3'};if(bakeryPage==='packages'&&!packageBatchView)state.packages.view='scene';state.packages.selected=bakeryTier;state.packages.discovery={earned:g.coinsEarnedSinceLastDiscovery,required:PACKAGE_DISCOVERY_COINS[nextPackageToUnlock()?.rank]??null};state.packages.carousel=bakeryCarouselTiers().map(rank=>({rank:packageUnlocked(rank)?rank:null,label:packageUnlocked(rank)?PACKAGE_TYPES[rank]:'Next Discovery'}));return JSON.stringify(state)};
