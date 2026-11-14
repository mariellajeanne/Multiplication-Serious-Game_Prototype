/* Production Packages views. Legacy workspace remains available at ?view=legacy. */
let packageBrowseScroll=0,packageFeaturedRank=0,packageBatchView=null,packageRecoveryTimer=null;
const packageExperienceOpenPackages=openPackages,packageExperiencePaintModal=paintModal,packageExperienceCloseModal=closeModal;
function packageCoinMarkup(value){return `<span class="package-coin-value"><span aria-hidden="true"><svg class="package-price-coin" viewBox="70 150 310 270"><image href="${hubAsset('coin-01.png')}" width="444" height="444"/></svg></span><b>${amountLabel(value)}</b></span>`}
function packagePortrait(rank,extra=''){return `<div class="package-portrait p${rank} ${extra}" aria-hidden="true">${packageArt()}</div>`}
function packageNextMarkup(){
 const next=nextPackageToUnlock();
 if(!next)return `<section class="packages-next packages-all-unlocked"><span class="packages-milestone-star" aria-hidden="true">✦</span><div><h3>Every package is yours to discover!</h3><p>All package tiers unlocked.</p></div></section>`;
 const progress=Math.min(g.completed,next.orders);
 return `<section class="packages-next">${packagePortrait(next.rank)}<div class="packages-next-copy"><span class="packages-eyebrow">NEXT TO UNLOCK</span><h3>${next.name} Package</h3><p>Keep practicing to unlock!</p></div><div class="packages-practice"><label for="packagePracticeProgress">${progress} / ${next.orders} orders</label><progress id="packagePracticeProgress" max="${next.orders}" value="${progress}">${progress} / ${next.orders}</progress></div></section>`;
}
function packageCollectionMarkup(){
 const stock=g.packages.reduce((sum,n)=>sum+n,0),types=availablePackageTiers();
 return `<div class="packages-browser packages-count-${types.length}">${packageNextMarkup()}<section class="packages-owned"><h3>Your Packages</h3><div class="packages-strip" tabindex="0" aria-label="Your packages, highest tier first">${types.map(type=>`<button class="packages-collection-card" data-package-rank="${type.rank}" onclick="showSelectedPackage(${type.rank})" aria-label="${type.name} Package">${packagePortrait(type.rank)}<strong>${type.name}</strong></button>`).join('')}</div></section>${stock?`<div class="packages-saved"><span>${stock} saved ${stock===1?'package':'packages'}</span><button class="secondary" onclick="openSavedPackageBatch()">Open saved packages</button></div>`:''}</div>`;
}
function showPackageCollection(restoreSelection=false){
 if(packageBatchView)return;
 packageBatchOffers.clear();showModal('Packages',packageCollectionMarkup(),'packages-collection-modal');
 const strip=document.querySelector('.packages-strip');if(strip)strip.scrollLeft=packageBrowseScroll;
 if(restoreSelection)requestAnimationFrame(()=>document.querySelector(`[data-package-rank="${packageFeaturedRank}"]`)?.focus({preventScroll:true}));
}
function packagePurchaseMarkup(rank){
 packageBatchOffers.clear();
 const buttons=[1,5,10].map(count=>{
  const quote=quotePackageBatch(rank,count),unavailable=packageBatchUnavailable(rank,count);
  return `<button class="package-buy-option ${count===1?'primary':''}" data-package-count="${count}" data-package-offer="${quote.id}" ${unavailable?'disabled':''} onclick="purchasePackageBatch('${quote.id}')"><span>Open <b>×${count}</b></span>${packageCoinMarkup(quote.total)}</button>`;
 }).join('');
 const saved=savedPackageBatch(rank),price=packagePrice(rank);
 return `<div class="packages-selected"><section class="packages-featured" aria-label="Featured package">${packagePortrait(rank,'package-featured-art')}<span class="packages-tier">${rank+1}★ ${PACKAGE_TYPES[rank]}</span></section><section class="packages-purchase" aria-label="Open packages"><div class="package-buy-options">${buttons}</div><p class="packages-purchase-note" id="packagePurchaseNotice" role="status">${g.coins<price?'Practice an order to earn more coins.':packageRoom(rank)<1?'Open your saved packages to make room.':'Every package holds a food surprise.'}</p>${saved?`<button class="secondary packages-open-saved" onclick="openSavedPackageBatch(${rank})">Open saved ×${saved} <small>${g.packages[rank]} left</small></button>`:''}<details class="packages-odds"><summary>Food chances</summary>${foodOddsMarkup(rank)}</details></section></div>`;
}
function showSelectedPackage(rank){
 if(packageBatchView||!Number.isInteger(rank)||!packageUnlocked(rank))return false;
 const strip=document.querySelector('.packages-strip');if(strip)packageBrowseScroll=strip.scrollLeft;
 packageFeaturedRank=rank;packageType=rank;
 showModal(`${PACKAGE_TYPES[rank]} Package`,packagePurchaseMarkup(rank),'packages-selected-modal');return true;
}
openPackages=function(tab='buy',rank=null){
 if(!isBakeryHub())return packageExperienceOpenPackages(tab,rank===null?packageType:rank);
 if(packageBatchView)return false;
 if(g.run&&!g.run.paused){toast('Save your order before visiting Packages.');return false}
 if(g.packageBatchReceipt){presentPackageBatch(true);return true}
 endPackageSession();
 if(rank!==null&&packageUnlocked(Number(rank)))return showSelectedPackage(Number(rank));
 packageBrowseScroll=0;showPackageCollection();return true;
};
paintModal=function(){
 const result=packageExperiencePaintModal();
 if(!isBakeryHub()||!modal||!/^packages-(collection|selected)-modal$/.test(modal.variant))return result;
 const head=document.querySelector('#modals .popup-head');if(!head)return result;
 head.querySelector('h2').insertAdjacentHTML('afterend',`<div class="packages-wallet" aria-label="${fmt(g.coins)} coins">${packageCoinMarkup(g.coins)}</div>`);
 if(modal.variant==='packages-selected-modal')head.insertAdjacentHTML('afterbegin','<button class="packages-back" aria-label="Back to packages" onclick="showPackageCollection(true)">←</button>');
 const strip=document.querySelector('.packages-strip');
 strip?.addEventListener('keydown',event=>{
  if(event.target!==strip||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();strip.scrollLeft=event.key==='Home'?0:event.key==='End'?strip.scrollWidth:strip.scrollLeft+(event.key==='ArrowLeft'?-260:260);
 });
 return result;
};
closeModal=function(){if(packageBatchView)return;packageBatchOffers.clear();return packageExperienceCloseModal()};
function syncPackageExperience(){
 if(!isBakeryHub()||packageBatchView||!modal?.variant?.startsWith('packages-'))return;
 const wallet=document.querySelector('.packages-wallet');
 if(wallet){wallet.setAttribute('aria-label',`${fmt(g.coins)} coins`);wallet.querySelector('b').textContent=amountLabel(g.coins)}
 document.querySelectorAll('.package-buy-option').forEach(button=>button.disabled=!!packageBatchUnavailable(packageFeaturedRank,Number(button.dataset.packageCount)));
 const notice=$('packagePurchaseNotice');if(notice)notice.textContent=g.coins<packagePrice(packageFeaturedRank)?'Practice an order to earn more coins.':packageRoom(packageFeaturedRank)<1?'Open your saved packages to make room.':'Every package holds a food surprise.';
}
function purchasePackageBatch(id){
 if(packageBatchView)return false;
 const receipt=commitPackageBatch(id);
 if(!receipt){showSelectedPackage(packageFeaturedRank);return false}
 render();presentPackageBatch();return true;
}
function openSavedPackageBatch(rank=null){
 if(packageBatchView)return false;
 if(rank===null)rank=PACKAGE_SHOP.slice().reverse().find(type=>g.packages[type.rank]>0)?.rank;
 const count=savedPackageBatch(rank);if(!count)return false;
 return purchasePackageBatch(quotePackageBatch(rank,count,'stock').id);
}
function packageRewardCard(reward,index,rank){
 const food=F(reward.foodId);
 return `<article class="batch-reward r${food.rarity}" data-reward-index="${index}" aria-label="Package ${index+1}, not yet revealed"><div class="batch-reward-visual"><div class="batch-package p${rank}" aria-hidden="true">${packageArt()}</div><div class="batch-food" aria-hidden="true">${foodArt(food.id)}</div><span class="batch-reward-flash" aria-hidden="true">✦</span></div><div class="batch-reward-copy" aria-hidden="true"><strong>${food.name}</strong><span>${food.rarity+1}★ ${RARITIES[food.rarity]}</span>${reward.isNew?'<b class="batch-new">NEW!</b>':'<small>+1 Mastery available</small>'}</div></article>`;
}
function presentPackageBatch(resumed=false){
 const receipt=g.packageBatchReceipt;
 if(!receipt||packageBatchView||g.run&&!g.run.paused||document.hidden)return;
 const root=document.createElement('section');root.id='packageBatch';root.className='package-batch-overlay';root.dataset.count=receipt.count;
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','packageBatchTitle');root.setAttribute('aria-describedby','packageBatchProgress');
 const background=['app','modals','notificationDock'].map(id=>$(id)).filter(Boolean).map(node=>({node,inert:node.inert,hidden:node.hidden}));
 packageBatchView={root,receipt,timers:new Set(),background,focus:captureFocus(document.activeElement),complete:false,collecting:false};
 background.forEach(({node})=>{node.inert=true;if(node.id==='modals')node.hidden=true});document.body.classList.add('package-batch-open');
 root.innerHTML=`<header class="batch-heading"><span>${PACKAGE_TYPES[receipt.rank]} Package · ×${receipt.count}</span><h1 id="packageBatchTitle">What’s inside?</h1></header><div class="batch-stage"><div class="batch-grid batch-count-${receipt.count}" style="--batch-rows:${receipt.count===10?2:1}">${receipt.rewards.map((reward,i)=>packageRewardCard(reward,i,receipt.rank)).join('')}</div></div><footer class="batch-footer"><p id="packageBatchProgress" role="status">Ready for a surprise?</p><small class="batch-swipe-hint">Swipe to see all your finds</small><button class="batch-action" id="packageRevealAll" onclick="revealAllPackageRewards()">Reveal All</button><button class="batch-action" id="packageBatchCollect" onclick="finishPackageBatch()" hidden>Collect</button><p id="packageBatchError" role="alert" hidden></p></footer>`;
 document.body.appendChild(root);$('packageRevealAll').focus({preventScroll:true});
 if(resumed||window.matchMedia('(prefers-reduced-motion: reduce)').matches){revealAllPackageRewards();return}
 const view=packageBatchView;
 const later=(callback,delay)=>{const timer=setTimeout(()=>{view.timers.delete(timer);if(packageBatchView===view)callback()},delay);view.timers.add(timer)};
 receipt.rewards.forEach((reward,index)=>{
  later(()=>root.querySelector(`[data-reward-index="${index}"]`).classList.add('is-opening'),180+index*140);
  later(()=>{revealPackageReward(index);if(index===receipt.count-1)completePackageReveal()},540+index*140);
 });
}
function revealPackageReward(index){
 const view=packageBatchView;if(!view)return;
 const reward=view.receipt.rewards[index],food=F(reward.foodId),card=view.root.querySelector(`[data-reward-index="${index}"]`);
 card.classList.add('is-revealed');card.setAttribute('aria-label',`${food.name}, ${RARITIES[food.rarity]}, ${reward.isNew?'new food':'Mastery capacity +1'}`);card.querySelector('.batch-reward-copy').setAttribute('aria-hidden','false');
 $('packageBatchProgress').textContent=`${view.root.querySelectorAll('.is-revealed').length} of ${view.receipt.count} revealed`;
}
function completePackageReveal(){
 const view=packageBatchView;if(!view||view.complete)return;
 view.complete=true;view.root.classList.add('is-complete');$('packageBatchTitle').textContent='Your fresh finds!';
 const hadFocus=document.activeElement===$('packageRevealAll');$('packageRevealAll').hidden=true;$('packageBatchCollect').hidden=false;
 if(hadFocus)$('packageBatchCollect').focus({preventScroll:true});
}
function revealAllPackageRewards(){
 const view=packageBatchView;if(!view)return;
 view.timers.forEach(clearTimeout);view.timers.clear();view.root.classList.add('reveal-instant');
 view.receipt.rewards.forEach((_,index)=>revealPackageReward(index));completePackageReveal();
}
function finishPackageBatch(){
 const view=packageBatchView;if(!view||!view.complete||view.collecting)return false;
 if(!collectPackageBatch(view.receipt.id)){
  $('packageBatchError').hidden=false;$('packageBatchError').textContent='Could not save. Keep this page open and try Collect again.';return false;
 }
 view.collecting=true;view.root.classList.add('is-leaving');
 setTimeout(()=>{
  if(packageBatchView!==view)return;
  view.timers.forEach(clearTimeout);view.root.remove();packageBatchView=null;
  view.background.forEach(({node,inert,hidden})=>{node.inert=inert;node.hidden=hidden});document.body.classList.remove('package-batch-open');
  render();if(packageUnlocked(view.receipt.rank))showSelectedPackage(view.receipt.rank);else showPackageCollection();
  requestAnimationFrame(()=>document.querySelector(`[data-package-count="${view.receipt.count}"]`)?.focus({preventScroll:true}));
 },window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:160);
 return true;
}
function schedulePackageBatchRecovery(){
 if(!isBakeryHub()||!g.packageBatchReceipt||packageBatchView||packageRecoveryTimer!==null)return;
 packageRecoveryTimer=setTimeout(()=>{
  packageRecoveryTimer=null;
  if(!modal&&!(g.run&&!g.run.paused)&&!document.hidden&&!(typeof packageUnlockView!=='undefined'&&packageUnlockView))presentPackageBatch(true);
 },0);
}
document.addEventListener('keydown',event=>{
 if(!packageBatchView)return;
 if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();revealAllPackageRewards()}
 if(event.key==='Tab'){
  event.preventDefault();event.stopImmediatePropagation();(packageBatchView.complete?$('packageBatchCollect'):$('packageRevealAll')).focus({preventScroll:true});
 }
},true);
document.addEventListener('focusin',event=>{
 if(packageBatchView&&!packageBatchView.root.contains(event.target))(packageBatchView.complete?$('packageBatchCollect'):$('packageRevealAll'))?.focus({preventScroll:true});
});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden&&packageBatchView)revealAllPackageRewards();else schedulePackageBatchRecovery();
});
const packageExperienceText=window.render_game_to_text;
window.render_game_to_text=()=>{
 const state=JSON.parse(packageExperienceText());
 state.packages={view:packageBatchView?'rewards':modal?.variant?.startsWith('packages-')?modal.variant:'closed',selected:packageFeaturedRank,available:availablePackageTiers().map(t=>t.rank),next:nextPackageToUnlock()?.rank??null,batch:packageBatchView?{count:packageBatchView.receipt.count,complete:packageBatchView.complete,revealed:packageBatchView.root.querySelectorAll('.is-revealed').length}:null};
 return JSON.stringify(state);
};
