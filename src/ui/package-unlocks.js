/* Milestone presentation is independent of the worksheet, rewards and shop.
 * The durable queue is derived from earned availability minus saved receipts. */
let packageUnlockView=null,packageUnlockTimer=null;
function packageUnlockMomentIsSafe(){
 return !document.hidden&&(!$('bakeryLoading')||$('bakeryLoading').hidden)&&!g.run&&!modal&&!g.packageBatchReceipt&&!(typeof packageBatchView!=='undefined'&&packageBatchView)&&!(typeof rewardFlightsPending==='function'&&rewardFlightsPending())&&!packageSession?.busy;
}
function schedulePackageUnlockCelebration(){
 if(packageUnlockView||packageUnlockTimer!==null||!pendingPackageCelebrations(g).length)return;
 // Defer beyond the current transaction: prizeItems renders before mounting
 // its results dialog. Never replace that dialog or a worksheet in this stack.
 packageUnlockTimer=setTimeout(()=>{
  packageUnlockTimer=null;
  if(packageUnlockMomentIsSafe())presentPackageUnlock();
 },0);
}
function packageUnlockMarkup(rank){
 const type=PACKAGE_SHOP[rank],sparkles=rank>=5?6:4;
 return `<div class="package-unlock-content p${rank}">
  <header class="package-unlock-heading"><h1 id="packageUnlockTitle">New Package Unlocked!</h1></header>
  <div class="package-unlock-reveal" aria-hidden="true">
   <div class="package-unlock-art">${worldPackageImage(rank)}</div>
   <div class="package-unlock-sparkles">${Array.from({length:sparkles},(_,i)=>`<svg style="--spark:${i}" viewBox="0 0 32 40"><path d="M16 2Q18 17 30 20Q18 23 16 38Q14 23 2 20Q14 17 16 2Z" fill="#fff4b9" stroke="#e6af42" stroke-width="2"/></svg>`).join('')}</div>
  </div>
  <h2 class="package-unlock-name" id="packageUnlockName">${type.name} Package</h2>
  <p class="package-unlock-hint" id="packageUnlockHint">Tap to close</p>
  <p class="package-unlock-error" id="packageUnlockError" role="alert" hidden></p>
 </div>`;
}
function presentPackageUnlock(){
 const rank=pendingPackageCelebrations(g)[0];if(rank===undefined||!packageUnlockMomentIsSafe())return;
 if(!packageUnlockView){
  const root=document.createElement('section');root.id='packageUnlock';root.className='package-unlock-overlay';
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','packageUnlockTitle packageUnlockName');root.setAttribute('aria-describedby','packageUnlockHint');root.tabIndex=-1;
  const background=['app','modals','notificationDock'].map(id=>$(id)).filter(Boolean).map(node=>({node,inert:node.inert}));
  packageUnlockView={root,background,returnFocus:document.activeElement,rank,closing:false,ignoreClicksUntil:0};
  root.addEventListener('click',event=>{
   event.stopPropagation();
   const premature=packageUnlockView?.prematurePointer;
   if(packageUnlockView)packageUnlockView.prematurePointer=false;
   if(premature||event.detail>1||performance.now()<packageUnlockView?.ignoreClicksUntil)return;
   dismissPackageUnlock();
  });
  root.addEventListener('pointerdown',()=>{if(packageUnlockView)packageUnlockView.prematurePointer=!packageUnlockView.dismissReady});
  background.forEach(({node})=>node.inert=true);
  document.body.classList.add('package-unlock-open');document.body.appendChild(root);
 }
 const view=packageUnlockView;view.rank=rank;view.closing=false;view.dismissReady=false;
 clearTimeout(view.dismissTimer);view.root.classList.remove('is-dismissible');
 view.root.classList.remove('is-leaving');view.root.dataset.tier=rank;view.root.innerHTML=packageUnlockMarkup(rank);
 view.root.focus({preventScroll:true});
 const entrance=[...view.root.querySelectorAll('.package-unlock-content,.package-unlock-art')].flatMap(node=>node.getAnimations());
 Promise.all(entrance.map(animation=>animation.finished.catch(()=>{}))).then(()=>{
  if(packageUnlockView!==view||view.rank!==rank||view.closing)return;
  view.dismissTimer=setTimeout(()=>{
   if(packageUnlockView!==view||view.rank!==rank||view.closing)return;
   view.dismissReady=true;view.root.classList.add('is-dismissible');
  },500);
 });
}
function dismissPackageUnlock(){
 const view=packageUnlockView;if(!view||view.closing||!view.dismissReady)return;
 if(!acknowledgePackageUnlock(view.rank)){
  const error=$('packageUnlockError');error.hidden=false;error.textContent='Could not save your acknowledgement. Keep this page open and tap again to try closing.';return;
 }
 view.closing=true;view.ignoreClicksUntil=performance.now()+350;view.root.classList.add('is-leaving');
 setTimeout(()=>{
  if(packageUnlockView!==view)return;
  // Keep the backdrop and background lock between queued celebrations.
  if(pendingPackageCelebrations(g).length&&packageUnlockMomentIsSafe()){presentPackageUnlock();return}
  view.root.remove();view.background.forEach(({node,inert})=>node.inert=inert);
  document.body.classList.remove('package-unlock-open');packageUnlockView=null;
  if(view.returnFocus?.isConnected)view.returnFocus.focus?.({preventScroll:true});
  schedulePackageUnlockCelebration();
 },window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:180);
}
document.addEventListener('keydown',event=>{
 if(!packageUnlockView)return;
 if(['Escape','Enter',' ','Tab'].includes(event.key)){
  event.preventDefault();event.stopImmediatePropagation();
  if(event.key!=='Tab'&&!event.repeat)dismissPackageUnlock();
  else packageUnlockView.root.focus({preventScroll:true});
 }
},true);
document.addEventListener('focusin',event=>{
 if(packageUnlockView&&!packageUnlockView.root.contains(event.target))packageUnlockView.root.focus({preventScroll:true});
});
document.addEventListener('visibilitychange',schedulePackageUnlockCelebration);
window.addEventListener('storage',event=>{
 if(event.key!=='panaderyaQuestV2'||!event.newValue)return;
 try{mergePackageAcknowledgements(g,JSON.parse(event.newValue))}catch(_){}
 schedulePackageUnlockCelebration();
});
