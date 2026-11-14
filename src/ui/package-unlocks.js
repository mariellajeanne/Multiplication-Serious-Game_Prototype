/* Milestone presentation is independent of the worksheet, rewards and shop.
 * The durable queue is derived from earned availability minus saved receipts. */
let packageUnlockView=null,packageUnlockTimer=null;
function packageUnlockMomentIsSafe(){
 return !document.hidden&&!g.run&&!modal&&!g.packageBatchReceipt&&!(typeof packageBatchView!=='undefined'&&packageBatchView)&&!(typeof rewardFlightsPending==='function'&&rewardFlightsPending())&&!packageSession?.busy;
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
  <header class="package-unlock-heading"><h1 id="packageUnlockTitle"><span>NEW PACKAGE</span> <span>UNLOCKED!</span></h1><h2 id="packageUnlockName">${type.name} Package</h2></header>
  <div class="package-unlock-reveal" aria-hidden="true">
   <svg class="package-unlock-rays" viewBox="0 0 320 320"><g fill="currentColor">${Array.from({length:12},(_,i)=>`<path d="M151 118 143 18Q160 7 177 18L169 118Z" transform="rotate(${i*30} 160 160)"/>`).join('')}</g></svg>
   <div class="package-unlock-art">${packageArt()}</div>
   <div class="package-unlock-sparkles">${Array.from({length:sparkles},(_,i)=>`<svg style="--spark:${i}" viewBox="0 0 32 40"><path d="M16 2Q18 17 30 20Q18 23 16 38Q14 23 2 20Q14 17 16 2Z" fill="#fff4b9" stroke="#e6af42" stroke-width="2"/></svg>`).join('')}</div>
  </div>
  <p class="package-unlock-message" id="packageUnlockMessage">A new surprise awaits!</p>
  <button class="package-unlock-awesome" id="packageUnlockAwesome" type="button">Awesome!</button>
  <p class="package-unlock-error" id="packageUnlockError" role="alert" hidden></p>
 </div>`;
}
function presentPackageUnlock(){
 const rank=pendingPackageCelebrations(g)[0];if(rank===undefined||!packageUnlockMomentIsSafe())return;
 if(!packageUnlockView){
  const root=document.createElement('section');root.id='packageUnlock';root.className='package-unlock-overlay';
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','packageUnlockTitle packageUnlockName');root.setAttribute('aria-describedby','packageUnlockMessage');
  const background=['app','modals','notificationDock'].map(id=>$(id)).filter(Boolean).map(node=>({node,inert:node.inert}));
  packageUnlockView={root,background,returnFocus:document.activeElement,rank,closing:false};
  background.forEach(({node})=>node.inert=true);
  document.body.classList.add('package-unlock-open');document.body.appendChild(root);
 }
 const view=packageUnlockView;view.rank=rank;view.closing=false;
 view.root.classList.remove('is-leaving');view.root.dataset.tier=rank;view.root.innerHTML=packageUnlockMarkup(rank);
 $('packageUnlockAwesome').addEventListener('click',dismissPackageUnlock);
 $('packageUnlockAwesome').focus({preventScroll:true});
}
function dismissPackageUnlock(){
 const view=packageUnlockView;if(!view||view.closing)return;
 if(!acknowledgePackageUnlock(view.rank)){
  const error=$('packageUnlockError');error.hidden=false;error.textContent='Could not save your acknowledgement. Keep this page open and tap Awesome! to try again.';return;
 }
 view.closing=true;view.root.classList.add('is-leaving');
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
 if(event.key==='Escape'||event.key==='Tab'){
  event.preventDefault();event.stopImmediatePropagation();$('packageUnlockAwesome')?.focus({preventScroll:true});
 }
},true);
document.addEventListener('focusin',event=>{
 if(packageUnlockView&&!packageUnlockView.root.contains(event.target))$('packageUnlockAwesome')?.focus({preventScroll:true});
});
document.addEventListener('visibilitychange',schedulePackageUnlockCelebration);
window.addEventListener('storage',event=>{
 if(event.key!=='panaderyaQuestV2'||!event.newValue)return;
 try{mergePackageAcknowledgements(g,JSON.parse(event.newValue))}catch(_){}
 schedulePackageUnlockCelebration();
});
