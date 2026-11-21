/* Six-step first-bakery journey. This controls UI access only; state changes are
 * exclusively validated and saved by the existing order, package and menu APIs. */
(function(root){
 'use strict';
 const KEY='panaderyaWholeGameTourV2';
 const tasks=[
  ['Solve an Order','ticket'],['Earn Coins','coins'],['Buy a Package','package'],
  ['Unbox a Food','unbox'],['Add Food to Your Menu','food'],['Boost Coins with Equipped Food','boost']
 ];
 const free=new Set(['worksheet','summary','package-reveal']);
 const phases=new Set(['intro','nav-orders','ticket','worksheet','complete','summary','back','nav-packages',
  'buy-package','package-reveal','package-collect','nav-menu','buy-slot','empty-slot','choose-food',
  'equip','close-food','close-inventory','boost','ready']);
 let tour=null,guide=null,currentTarget=null,rendered='',readyAt=0,summaryFinishedAt=0,lastTargetRect='',scheduled=false;
 const $=id=>document.getElementById(id);
 const isHub=()=>document.body?.dataset.view==='hub';
 const valid=el=>{if(!el||el.disabled||el.closest('[hidden],[inert]'))return false;const r=el.getBoundingClientRect();return r.width>2&&r.height>2};
 const find=selector=>[...document.querySelectorAll(selector)].find(valid)||null;
 const saved=()=>{try{return JSON.parse(localStorage.getItem(KEY))}catch(_){return null}};
 function persist(){if(tour)try{localStorage.setItem(KEY,JSON.stringify(tour))}catch(_){}}
 function remove(){currentTarget=null;guide?.remove();guide=null;rendered='';lastTargetRect=''}
 function finish(skip=false){tour=null;remove();try{localStorage.setItem(KEY,skip?'skipped':'done')}catch(_){};if(typeof g!=='undefined'){g.helpSeen=true;save()}}
 function goto(phase){if(!tour||tour.phase===phase)return;tour.phase=phase;
  if(phase==='intro'){readyAt=performance.now()+1500}
  if(phase==='buy-slot'&&tour.slotsAtPurchase===null)tour.slotsAtPurchase=g.menuSlots;
  if(phase==='buy-package'){tour.ownedBefore=g.owned.map(o=>o.uid)}
  if(phase==='package-reveal'&&g.packageBatchReceipt){tour.packageId=g.packageBatchReceipt.id;tour.foodUid=g.packageBatchReceipt.rewards?.[0]?.uid??null}
  persist();rendered='';refresh();
 }
 function start(replay=false){
  if(!isHub()||typeof g==='undefined')return false;
  const previous=saved();
  if(g.run&&!g.run.paused&&(!previous||replay))return false;
  if(!replay&&!g.tutorialStarterVersion)return false; // Never force the new economy tutorial on existing saves.if(!replay&&['done','skipped'].includes(localStorage.getItem(KEY)))return false;
  if(!replay&&g.helpSeen&&!previous)return false;
  if(!replay&&previous&&phases.has(previous.phase))tour=previous;
  else tour={phase:'intro',revealed:1,orderId:null,completedAtStart:g.completed,coinsAtStart:g.coins,
   packageId:null,foodUid:null,ownedBefore:[],slotsAtPurchase:null};
  tour.revealed=Math.max(1,Math.min(6,Number(tour.revealed)||1));
  g.helpSeen=true;g.tutorialArrows=true;save();persist();
  if(tour.phase==='intro'){readyAt=performance.now()+1500;if(hubCollection)closeHubCollection();if(modal)closeModal();navigateBakery('menu')}
  else if(!replay){
   // A save restores bakery data but not temporary food-card/collection UI state.
   // Return to the last durable action, never trap a resumed player behind a missing button.
   if(['choose-food','equip'].includes(tour.phase)&&!hubCollection){tour.phase='empty-slot'}
   if(tour.phase==='close-food'&&!selectedFoods.size){tour.phase=hubCollection?'close-inventory':'boost'}
   if(tour.phase==='close-inventory'&&!hubCollection)tour.phase='boost';
   if(tour.phase==='back'&&!worksheetSummaryView&&g.run?.procedureComplete)tour.phase='complete';
   persist();
  }
  refresh();return true;
 }
 function taskIndex(){
  const p=tour?.phase;
  if(['intro','nav-orders','ticket','worksheet','complete','summary'].includes(p))return 0;
  if(p==='back')return 1;
  if(['nav-packages','buy-package'].includes(p))return 2;
  if(['package-reveal','package-collect'].includes(p))return 3;
  if(['nav-menu','buy-slot','empty-slot','choose-food','equip'].includes(p))return 4;
  return 5;
 }
 function completedCount(){
  const p=tour?.phase;
  if(p==='intro'||['nav-orders','ticket','worksheet','complete','summary'].includes(p))return 0;
  if(p==='back')return 1;
  if(['nav-packages','buy-package'].includes(p))return 2;
  if(['package-reveal','package-collect'].includes(p))return 3;
  if(['nav-menu','buy-slot','empty-slot','choose-food','equip'].includes(p))return 4;
  if(p==='ready')return 6;
  return 5;
 }
 function target(){
  if(!tour)return null;
  const p=tour.phase;
  switch(p){
   case 'nav-orders':return find('[data-world-nav="orders"]');
   case 'ticket':return find('.scene-ticket:not(:disabled),.hub-ticket:not(:disabled)');
   case 'complete':return find('#collectRewards:not(:disabled)');
   case 'back':return find('#acknowledgeWorksheetSummary:not(:disabled)');
   case 'nav-packages':return find('[data-world-nav="packages"]');
   case 'buy-package':return find('[data-world-buy="1"]:not(:disabled)');
   case 'package-collect':return find('#packageBatchCollect:not([hidden]):not(:disabled)');
   case 'nav-menu':return find('[data-world-nav="menu"]');
   case 'buy-slot':return find('[data-tour-target="buy-slot"]:not(:disabled)');
   case 'empty-slot':return find('[data-tour-target="empty-slot"]');
   case 'choose-food':return find(`.collection-card[data-uid="${tour.foodUid}"] .food-card-target`)||find('.collection-card .food-card-target');
   case 'equip':return find('.food-collection-detail-backdrop .action-equip:not(:disabled),.food-detail-redesign .action-equip:not(:disabled)');
   case 'close-food':return find('.food-collection-detail-backdrop .food-panel-close');
   case 'close-inventory':return find('.hub-collection-back');
   case 'boost':return find('#boost-status');
   default:return null;
  }
 }
 function update(){
  if(!tour||!isHub())return;
  const p=tour.phase,orderId=tour.orderId;
  if(p==='nav-orders'&&bakeryPage==='orders'&&!bakeryJourney)goto('ticket');
  else if(p==='ticket'&&g.run&&!g.run.paused){tour.orderId=g.run.ticket.id;persist();goto('worksheet')}
  else if(['worksheet','complete','summary','back'].includes(p)&&g.claimedOrders[orderId]&&!g.run){goto('nav-packages')}
  else if((p==='worksheet'||p==='complete')&&typeof worksheetSummaryView!=='undefined'&&worksheetSummaryView)goto('summary');
  else if(p==='worksheet'&&g.run?.procedureComplete)goto('complete');
  else if(p==='complete'&&g.run?.procedureComplete===false)goto('worksheet');
  else if(p==='summary'&&find('.worksheet-summary[data-summary-phase="finished"]')){
   if(!summaryFinishedAt)summaryFinishedAt=performance.now();
   if(performance.now()-summaryFinishedAt>=500)goto('back');
  }
  else if(p==='nav-packages'&&bakeryPage==='packages'&&!bakeryJourney)goto('buy-package');
  else if(p==='buy-package'&&g.packageBatchReceipt){goto('package-reveal')}
  else if(p==='package-reveal'&&packageBatchView?.complete)goto('package-collect');
  else if(p==='package-collect'&&!g.packageBatchReceipt&&g.owned.some(o=>o.uid===tour.foodUid)&&!packageBatchView)goto('nav-menu');
  else if(p==='nav-menu'&&bakeryPage==='menu'&&!bakeryJourney)goto('buy-slot');
  else if(p==='buy-slot'&&g.menuSlots>tour.slotsAtPurchase)goto('empty-slot');
  else if(p==='empty-slot'&&hubCollection)goto('choose-food');
  else if(p==='choose-food'&&selectedFoods.has(tour.foodUid))goto('equip');
  else if(p==='equip'&&g.activeMenu.includes(tour.foodUid))goto('close-food');
  else if(p==='close-food'&&!selectedFoods.size)goto('close-inventory');
  else if(p==='close-inventory'&&!hubCollection)goto('boost');
  else if(p==='boost'&&modal?.title==="Baker's Boost"&&g.activeMenu.some(uid=>g.owned.some(o=>o.uid===uid)))goto('ready');
  else if(p==='worksheet'&&(!g.run||g.run.paused)){goto('ticket');if(bakeryPage!=='orders')navigateBakery('orders')}
 }
 function icon(type){
  const images={ticket:'assets/bakery-runtime/ticket-gold.webp',coins:'assets/bakery-runtime/price-coin.webp',
   package:'assets/bakery-runtime/package-01.webp',food:'assets/bakery-runtime/food-01.webp',
   boost:'assets/bakery-ui/boost-prism.svg',unbox:'assets/bakery-runtime/package-01.webp'};
  return `<span class="tour-task-art ${type==='unbox'?'is-open':''}" aria-hidden="true"><img src="${images[type]}" alt="">${type==='unbox'?'<span>✦</span>':''}</span>`;
 }
 function markup(){
  const p=tour.phase,show=p==='intro'?tour.revealed:6,done=completedCount(),focus=taskIndex();
  return `<div class="tour-shade" data-shade="top"></div><div class="tour-shade" data-shade="right"></div><div class="tour-shade" data-shade="bottom"></div><div class="tour-shade" data-shade="left"></div>
   <div class="tour-focus-ring" aria-hidden="true"></div>
   <section class="tour-checklist" role="group" aria-label="Your bakery checklist">
    ${p==='intro'?'<h2 class="tour-title">Your Bakery Checklist</h2>':''}
    <div class="tour-paper-stack">${tasks.slice(0,show).map(([label,type],i)=>`<div class="tour-paper ${i<done?'is-done':i===focus?'is-current':'is-pending'} ${p==='intro'&&i===show-1?'is-new':''}" data-task="${i+1}"><span class="tour-task-number">${i+1}.</span>${icon(type)}<span class="tour-task-copy">${label}</span><span class="tour-task-checkbox" aria-label="${i<done?'Completed':'Not completed'}">${i<done?'✓':''}</span></div>`).join('')}</div><div class="tour-mini-progress" aria-label="Task ${focus+1} of 6; ${done} completed"><span>${done} ✓</span><b>Task ${focus+1} / 6</b></div>
    ${p==='intro'?`<button type="button" class="tour-next" data-tour="next" disabled><span class="tour-next-progress"></span><b>${show===6?"Let's Go!":'Next'}</b></button>`:''}
    ${p==='ready'?'<div class="tour-finale"><h2>Your Bakery Is Ready!</h2><p>Your equipped food boosts the coins you earn from orders. Explore your bakery!</p><button class="tour-finish" type="button" data-tour="finish">Let’s Bake!</button></div>':''}
   </section>
   <button type="button" class="tour-skip" data-tour="skip" aria-label="Skip the bakery tutorial">Skip Tutorial</button>`;
 }
 function mount(){if(!guide){guide=document.createElement('div');guide.id='bakeryGameTour';guide.className='bakery-game-tour';document.body.append(guide)}}
 function resetGeometry(){if(!guide)return;for(const node of guide.querySelectorAll('.tour-shade'))Object.assign(node.style,{top:'0px',left:'0px',right:'auto',bottom:'auto',width:'100vw',height:'100dvh'});guide.classList.remove('is-spotlit')}
 function place(){
  if(!guide||!tour)return;const p=tour.phase,card=guide.querySelector('.tour-checklist');if(!card)return;
  const opening=p==='intro'||p==='ready',travel=!!bakeryJourney&&['nav-orders','nav-packages','nav-menu'].includes(p),el=target(),isFree=free.has(p);
  guide.classList.toggle('is-free',isFree);guide.classList.toggle('is-travel',travel);guide.classList.toggle('is-intro',opening);
  currentTarget=!isFree&&!opening&&!travel&&el?el:null;
  if(isFree){card.style.opacity='0';guide.classList.remove('is-spotlit');return}
  card.style.opacity='';
  const w=innerWidth,h=innerHeight,cw=card.offsetWidth,ch=card.offsetHeight,gap=20,edge=12;
  let x=(w-cw)/2,y=(h-ch)/2,side='center';
  if(currentTarget){
   const r=currentTarget.getBoundingClientRect();
   const pref=['buy-slot','empty-slot','choose-food'].includes(p)?'right':p==='boost'?'below':'above';
   const fits={above:r.top-ch-gap>=edge,below:r.bottom+ch+gap<=h-edge,right:r.right+cw+gap<=w-edge,left:r.left-cw-gap>=edge};
   side=fits[pref]?pref:['above','right','left','below'].find(k=>fits[k])||'center';
   if(side==='above'){x=r.left+r.width/2-cw/2;y=r.top-ch-gap}
   else if(side==='below'){x=r.left+r.width/2-cw/2;y=r.bottom+gap}
   else if(side==='right'){x=r.right+gap;y=r.top+r.height/2-ch/2}
   else if(side==='left'){x=r.left-cw-gap;y=r.top+r.height/2-ch/2}
   else{x=r.right+gap;y=r.top+r.height/2-ch/2}
   x=Math.max(edge,Math.min(w-cw-edge,x));y=Math.max(edge,Math.min(h-ch-edge,y));
   const pad=7,left=Math.max(0,r.left-pad),top=Math.max(0,r.top-pad),right=Math.min(w,r.right+pad),bottom=Math.min(h,r.bottom+pad);
   const [upper,east,lower,west]=guide.querySelectorAll('.tour-shade');
   function shape(node,x0,y0,width,height){Object.assign(node.style,{left:x0+'px',top:y0+'px',width:Math.max(0,width)+'px',height:Math.max(0,height)+'px'})}
   shape(upper,0,0,w,top);shape(lower,0,bottom,w,h-bottom);shape(west,0,top,left,bottom-top);shape(east,right,top,w-right,bottom-top);
   const ring=guide.querySelector('.tour-focus-ring');Object.assign(ring.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'});
   guide.classList.add('is-spotlit');
  }else resetGeometry();
  card.dataset.position=side;card.style.left=x+'px';card.style.top=y+'px';
 }
 function refresh(){
  if(!tour||!isHub()){remove();return}
  if(!document.body||($('bakeryLoading')&&!$('bakeryLoading').hidden))return;
  update();if(!tour)return;
  mount();const key=tour.phase+':'+tour.revealed+':'+completedCount();
  if(rendered!==key){
   const old=guide.querySelector('.tour-checklist'),oldRect=old?.getBoundingClientRect();
   const from=rendered.split(':')[0],to=tour.phase;
   const morph=oldRect&&from!=='intro'&&to!=='intro'&&!free.has(from)&&!free.has(to);
   guide.innerHTML=markup();rendered=key;
   if(tour.phase==='intro'){
    readyAt=readyAt||performance.now()+1500;
    const next=guide.querySelector('[data-tour="next"]');
    if(next){next.dataset.ready=String(performance.now()>=readyAt);next.disabled=performance.now()<readyAt}
   }
   const card=guide.querySelector('.tour-checklist');
   if(morph){
    card.style.left=oldRect.left+'px';card.style.top=oldRect.top+'px';card.style.opacity='0';
    // Carry the previous screen-space position into a new DOM card before
    // animating it to the next target. Without the layout read, replacement
    // elements jump straight to their new position instead of transitioning.
    void card.offsetWidth;
    requestAnimationFrame(()=>{
     if(!tour||rendered!==key||!guide?.contains(card))return;
     place();card.style.opacity='';
    });
    return;
   }
   if(to!=='intro'&&!free.has(to))card.classList.add('is-arriving');
  }
  if(tour.phase==='intro'){
   const next=guide.querySelector('[data-tour="next"]');if(next&&performance.now()>=readyAt){next.disabled=false;next.dataset.ready='true'}
  }
  place();
 }
 function allowed(e){
  if(!tour)return true;
  const control=e.target?.closest?.('[data-tour]');if(control)return true;
  if(free.has(tour.phase))return true;
  return !!currentTarget&&(e.target===currentTarget||currentTarget.contains(e.target));
 }
 function handleControl(e){
  const button=e.target?.closest?.('[data-tour]');if(!button||!tour)return false;
  if(e.type!=='click')return true;
  const name=button.dataset.tour;
  if(name==='skip'){finish(true)}
  else if(name==='finish'&&tour.phase==='ready')finish();
  else if(name==='next'&&tour.phase==='intro'&&performance.now()>=readyAt){
   if(tour.revealed<6){tour.revealed++;readyAt=performance.now()+1500;persist();rendered='';refresh()}
   else goto('nav-orders');
  }
  e.preventDefault();e.stopImmediatePropagation();return true;
 }
 for(const type of ['pointerdown','touchstart','click','keydown','touchmove'])document.addEventListener(type,e=>{
  if(!tour)return;
  if(type==='keydown'){
   if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(true);return}
   if(e.key==='Tab'&&!free.has(tour.phase)){
    const targets=[currentTarget,guide?.querySelector('.tour-next:not(:disabled),.tour-finish'),guide?.querySelector('.tour-skip')].filter(Boolean);
    if(targets.length){e.preventDefault();const next=targets[(targets.indexOf(document.activeElement)+(e.shiftKey?targets.length-1:1))%targets.length];next.focus({preventScroll:true})}
    e.stopImmediatePropagation();return;
   }
   if(!['Enter',' '].includes(e.key))return;
  }
  if(type==='touchmove'&&!free.has(tour.phase)){e.preventDefault();e.stopImmediatePropagation();return}
  if(handleControl(e))return;
  if(!allowed(e)){e.preventDefault();e.stopImmediatePropagation();return}
  if(type==='click')queue();
 },{capture:true,passive:false});
 function queue(){if(!tour||scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh()})}
 const previousRender=root.render;
 if(typeof previousRender==='function')root.render=function(...args){const result=previousRender.apply(this,args);queue();return result};
 const previousTutorial=root.showTutorial;
 if(typeof previousTutorial==='function')root.showTutorial=function(...args){
  if(isHub()&&(!g.run||g.run.paused)&&g.tutorialStarterVersion===2&&g.menuSlots===0&&g.owned.length===0){
   if(modal)closeModal();if(hubCollection)closeHubCollection();return start(true)
  }
  return previousTutorial.apply(this,args);
 };
 root.startWholeBakeryGuide=()=>start(true);
 root.skipWholeBakeryGuide=()=>finish(true);
 root.panaderyaTutorialStatus=()=>tour?{phase:tour.phase,task:taskIndex()+1,checked:completedCount(),revealed:tour.revealed,target:currentTarget?.getAttribute('aria-label')||null}:null;
 const previousText=root.render_game_to_text;
 if(typeof previousText==='function')root.render_game_to_text=()=>{
  const state=JSON.parse(previousText());state.bakeryGuide=root.panaderyaTutorialStatus();return JSON.stringify(state)
 };
 addEventListener('resize',queue);document.addEventListener('scroll',queue,true);
 setInterval(()=>{if(tour)refresh()},85);
 const boot=setInterval(()=>{if(document.body?.dataset.view==='environment'){clearInterval(boot);return}if(!isHub()||($('bakeryLoading')&&!$('bakeryLoading').hidden))return;clearInterval(boot);start(false)},120);
})(globalThis);
