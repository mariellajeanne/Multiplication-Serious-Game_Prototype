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
 // Timing (ms). A completed checkbox stays visibly checked, at the place the child
 // last saw the checklist, before focus and the checklist move to the next task.
 const READ_MS=1500,CHECK_HOLD_MS=1000,RESULT_PAUSE_MS=500;
 // Content that belongs to the current step stays bright and uncovered: the
 // spotlight hole includes it and the checklist is placed beside it. 'own' means
 // the popup already provides its own dimmed backdrop, so the guide adds none.
 const contexts={
  complete:{avoid:['#worksheetFrame@#sheet']},
  back:{bright:'.worksheet-summary-modal',shade:'own'},
  'package-collect':{bright:'.batch-grid .batch-reward'},
  equip:{avoid:['.food-collection-detail-backdrop .food-detail-showcase','.food-collection-detail-backdrop .food-detail-boost']},
  'close-food':{avoid:['.food-collection-detail-backdrop .food-detail-showcase','.food-collection-detail-backdrop .food-detail-boost']},
  ready:{bright:'#modals .modal',shade:'own'}
 };
 let tour=null,guide=null,currentTarget=null,rendered='',readyAt=0,summaryFinishedAt=0,revealFinishedAt=0,worksheetDoneAt=0,scheduled=false;
 let shownDone=0,celebration=null,compactKey='',compactOn=false,introAnchor={key:'',top:0},revealedFor='';
 const $=id=>document.getElementById(id);
 const isHub=()=>document.body?.dataset.view==='hub';
 const valid=el=>{if(!el||el.disabled||el.closest('[hidden],[inert]'))return false;const r=el.getBoundingClientRect();return r.width>2&&r.height>2};
 const find=selector=>[...document.querySelectorAll(selector)].find(valid)||null;
 const saved=()=>{try{return JSON.parse(localStorage.getItem(KEY))}catch(_){return null}};
 const now=()=>performance.now();
 function persist(){if(tour)try{localStorage.setItem(KEY,JSON.stringify(tour))}catch(_){}}
 function remove(){currentTarget=null;celebration=null;guide?.remove();guide=null;rendered='';document.body?.removeAttribute('data-tour-phase')}
 function finish(skip=false){tour=null;remove();try{localStorage.setItem(KEY,skip?'skipped':'done')}catch(_){};if(typeof g!=='undefined'){g.helpSeen=true;save()}}
 function goto(phase){if(!tour||tour.phase===phase)return;tour.phase=phase;
  if(phase==='intro'){readyAt=now()+READ_MS}
  if(phase==='buy-slot'&&tour.slotsAtPurchase===null)tour.slotsAtPurchase=g.menuSlots;
  if(phase==='buy-package'){tour.ownedBefore=g.owned.map(o=>o.uid)}
  if(phase==='package-reveal'&&g.packageBatchReceipt){tour.packageId=g.packageBatchReceipt.id;tour.foodUid=g.packageBatchReceipt.rewards?.[0]?.uid??null}
  summaryFinishedAt=0;revealFinishedAt=0;worksheetDoneAt=0;
  persist();rendered='';refresh();
 }
 function start(replay=false){
  if(!isHub()||typeof g==='undefined')return false;
  const previous=saved();
  if(g.run&&!g.run.paused&&(!previous||replay))return false;
  // Never force the new economy tutorial on existing saves.
  if(!replay&&!g.tutorialStarterVersion)return false;
  let stored=null;try{stored=localStorage.getItem(KEY)}catch(_){}
  if(!replay&&['done','skipped'].includes(stored))return false;
  if(!replay&&g.helpSeen&&!previous)return false;
  if(!replay&&previous&&phases.has(previous.phase))tour=previous;
  else tour={phase:'intro',revealed:1,orderId:null,completedAtStart:g.completed,coinsAtStart:g.coins,
   packageId:null,foodUid:null,ownedBefore:[],slotsAtPurchase:null};
  tour.revealed=Math.max(1,Math.min(6,Number(tour.revealed)||1));
  g.helpSeen=true;g.tutorialArrows=true;save();persist();
  if(tour.phase==='intro'){readyAt=now()+READ_MS;if(hubCollection)closeHubCollection();if(modal)closeModal();navigateBakery('menu')}
  else if(!replay){
   // A save restores bakery data but not temporary food-card/collection UI state.
   // Return to the last durable action, never trap a resumed player behind a missing button.
   if(['choose-food','equip'].includes(tour.phase)&&!hubCollection){tour.phase='empty-slot'}
   if(tour.phase==='close-food'&&!selectedFoods.size){tour.phase=hubCollection?'close-inventory':'boost'}
   if(tour.phase==='close-inventory'&&!hubCollection)tour.phase='boost';
   if(tour.phase==='back'&&!worksheetSummaryView&&g.run?.procedureComplete)tour.phase='complete';
   persist();
  }
  // Checks already earned before a reload are shown as done, not re-celebrated.
  shownDone=completedCount();celebration=null;rendered='';
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
  else if(p==='worksheet'&&g.run?.procedureComplete){
   // Let the last coin finish flying to the shelf and the answer be seen before dimming.
   if(typeof rewardFlightsPending==='function'&&rewardFlightsPending())worksheetDoneAt=0;
   else{if(!worksheetDoneAt)worksheetDoneAt=now();if(now()-worksheetDoneAt>=RESULT_PAUSE_MS)goto('complete')}
  }
  else if(p==='complete'&&g.run?.procedureComplete===false)goto('worksheet');
  else if(p==='summary'&&find('.worksheet-summary[data-summary-phase="finished"]')){
   // Let the finished reward settle before guiding Back to Bakery.
   if(!summaryFinishedAt)summaryFinishedAt=now();
   if(now()-summaryFinishedAt>=RESULT_PAUSE_MS)goto('back');
  }
  else if(p==='nav-packages'&&bakeryPage==='packages'&&!bakeryJourney)goto('buy-package');
  else if(p==='buy-package'&&g.packageBatchReceipt){goto('package-reveal')}
  else if(p==='package-reveal'&&packageBatchView?.complete){
   // The unboxed food stays unobstructed for a moment before Collect is guided.
   if(!revealFinishedAt)revealFinishedAt=now();
   if(now()-revealFinishedAt>=RESULT_PAUSE_MS)goto('package-collect');
  }
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
  const images={ticket:'assets/bakery-runtime/orders-icon.webp',coins:'assets/bakery-runtime/price-coin.webp',
   package:'assets/bakery-runtime/package-01.webp',food:'assets/bakery-runtime/food-01.webp',
   boost:'assets/bakery-ui/boost-prism.svg',unbox:'assets/bakery-runtime/package-01.webp'};
  return `<span class="tour-task-art ${type==='unbox'?'is-open':''}" aria-hidden="true"><img src="${images[type]}" alt="">${type==='unbox'?'<span>✦</span>':''}</span>`;
 }
 // A drawn tick: the font's ✓ glyph resembles a square-root sign in this typeface.
 const tick='<svg class="tour-tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.8l4.6 4.6L19.6 6.9"/></svg>';
 function paper(i,state,extra=''){
  const [label,type]=tasks[i],done=state==='is-done';
  return `<div class="tour-paper ${state} ${extra}" data-task="${i+1}" style="--i:${i}"><span class="tour-task-number">${i+1}.</span>${icon(type)}<span class="tour-task-copy">${label}</span><span class="tour-task-checkbox" role="img" aria-label="${done?'Completed':'Not completed'}">${tick}</span></div>`;
 }
 function visualState(){
  // During a celebration, the newly finished strip(s) keep the emphasis.
  const done=completedCount();
  if(celebration)return {done,focus:Math.max(0,celebration.to-1),fresh:[celebration.from,celebration.to]};
  return {done,focus:taskIndex(),fresh:null};
 }
 function markup(){
  const p=tour.phase,show=p==='intro'?tour.revealed:6,{done,focus,fresh}=visualState();
  const papers=tasks.slice(0,show).map((_,i)=>{
   const state=i<done?'is-done':i===focus?'is-current':'is-pending';
   const extra=[fresh&&i>=fresh[0]&&i<fresh[1]?'is-just-done':'',celebration&&i===focus?'is-celebrating':'',p==='intro'&&i===show-1&&i>0?'is-new':''].join(' ');
   return paper(i,state,extra);
  }).join('');
  const finale=p==='ready'&&!celebration;
  return `<div class="tour-shade" data-shade="top"></div><div class="tour-shade" data-shade="right"></div><div class="tour-shade" data-shade="bottom"></div><div class="tour-shade" data-shade="left"></div>
   <div class="tour-focus-ring" aria-hidden="true"></div>
   <section class="tour-checklist" role="group" aria-label="Your bakery checklist" data-phase="${p}">
    ${p==='intro'?'<h2 class="tour-title">Your Bakery Checklist</h2>':''}
    <div class="tour-paper-stack">${papers}</div><div class="tour-mini-progress" aria-label="Task ${focus+1} of 6; ${done} completed"><span>${done} ✓</span><b>Task ${focus+1} / 6</b></div>
    ${p==='intro'?`<button type="button" class="tour-next" data-tour="next" disabled><span class="tour-next-progress"></span><b>${show===6?"Let's Go!":'Next'}</b></button>`:''}
    ${finale?'<div class="tour-finale"><h2>Your Bakery Is Ready!</h2><p>Your equipped food boosts the coins you earn from orders. Explore your bakery!</p><button class="tour-finish" type="button" data-tour="finish">Let’s Bake!</button></div>':''}
   </section>
   <button type="button" class="tour-skip" data-tour="skip" aria-label="Skip the bakery tutorial">Skip Tutorial</button>`;
 }
 function mount(){if(!guide){guide=document.createElement('div');guide.id='bakeryGameTour';guide.className='bakery-game-tour';document.body.append(guide)}}
 function fullShade(){if(!guide)return;for(const node of guide.querySelectorAll('.tour-shade:not(.tour-shade-patch)'))Object.assign(node.style,{top:'0px',left:'0px',right:'auto',bottom:'auto',width:'100vw',height:'100dvh'});guide.classList.remove('is-spotlit')}
 const area=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
 const box=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
 const union=(a,b)=>box(Math.min(a.left,b.left),Math.min(a.top,b.top),Math.max(a.right,b.right)-Math.min(a.left,b.left),Math.max(a.bottom,b.bottom)-Math.min(a.top,b.top));
 function rectOf(selector){
  // 'host@inner' maps an element inside a same-origin iframe into page space.
  const [host,inner]=selector.split('@'),el=find(host);if(!el)return null;
  const r=el.getBoundingClientRect();if(!inner)return r.width>2&&r.height>2?r:null;
  try{
   const node=el.contentDocument?.querySelector(inner);if(!node)return null;
   const q=node.getBoundingClientRect(),sx=r.width/(el.clientWidth||r.width),sy=r.height/(el.clientHeight||r.height);
   return box(r.left+q.left*sx,r.top+q.top*sy,q.width*sx,q.height*sy);
  }catch(_){return null}
 }
 function choosePlace(r,cw,ch,w,h,pref,avoid){
  const gap=20,edge=12,cx=r.left+r.width/2,cy=r.top+r.height/2;
  const clamp=(x,y)=>[Math.max(edge,Math.min(w-cw-edge,x)),Math.max(edge,Math.min(h-ch-edge,y))];
  const options=[];
  const add=(side,x,y,bias=0)=>{const [px,py]=clamp(x,y);options.push({side,x:px,y:py,bias})};
  add('above',cx-cw/2,r.top-ch-gap,pref==='above'?0:40);
  add('below',cx-cw/2,r.bottom+gap,pref==='below'?0:40);
  add('right',r.right+gap,cy-ch/2,pref==='right'?0:40);
  add('left',r.left-cw-gap,cy-ch/2,pref==='left'?0:40);
  for(const a of avoid){
   add('right',a.right+gap,cy-ch/2,80);add('left',a.left-cw-gap,cy-ch/2,80);
   add('above',cx-cw/2,a.top-ch-gap,80);add('below',cx-cw/2,a.bottom+gap,80);
  }
  const ring=box(r.left-10,r.top-10,r.width+20,r.height+20);
  let best=null;
  for(const o of options){
   const c=box(o.x,o.y,cw,ch);
   const cover=area(c,ring),hidden=avoid.reduce((n,a)=>n+area(c,a),0);
   const distance=Math.hypot(o.x+cw/2-cx,o.y+ch/2-cy);
   const score=cover*1e4+hidden*20+distance+o.bias;
   if(!best||score<best.score)best={...o,score,cover,hidden};
  }
  return best||{side:'center',x:(w-cw)/2,y:(h-ch)/2,cover:0,hidden:0};
 }
 function shapeShades(hole){
  const w=innerWidth,h=innerHeight,[upper,east,lower,west]=guide.querySelectorAll('.tour-shade:not(.tour-shade-patch)');
  const left=Math.max(0,hole.left),top=Math.max(0,hole.top),right=Math.min(w,hole.right),bottom=Math.min(h,hole.bottom);
  const shape=(node,x0,y0,width,height)=>Object.assign(node.style,{left:x0+'px',top:y0+'px',width:Math.max(0,width)+'px',height:Math.max(0,height)+'px'});
  shape(upper,0,0,w,top);shape(lower,0,bottom,w,h-bottom);shape(west,0,top,left,bottom-top);shape(east,right,top,w-right,bottom-top);
 }
 function patchShades(outer,open){
  // Dim the parts of a combined spotlight that belong to neither bright region,
  // so the gap between a reward card and its button never looks interactive.
  const clear=()=>{for(const node of guide.querySelectorAll('.tour-shade-patch'))node.remove()};
  if(!outer){if(guide.dataset.patches){clear();guide.dataset.patches=''}return}
  const xs=[...new Set([outer.left,outer.right,...open.flatMap(r=>[r.left,r.right])])].filter(v=>v>=outer.left&&v<=outer.right).sort((a,b)=>a-b);
  const ys=[...new Set([outer.top,outer.bottom,...open.flatMap(r=>[r.top,r.bottom])])].filter(v=>v>=outer.top&&v<=outer.bottom).sort((a,b)=>a-b);
  const html=[];
  for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++){
   const cx=(xs[i]+xs[i+1])/2,cy=(ys[j]+ys[j+1])/2;
   if(open.some(r=>cx>r.left&&cx<r.right&&cy>r.top&&cy<r.bottom))continue;
   html.push(`<div class="tour-shade tour-shade-patch" style="left:${xs[i]}px;top:${ys[j]}px;width:${xs[i+1]-xs[i]}px;height:${ys[j+1]-ys[j]}px"></div>`);
  }
  const markup=html.join('');if(guide.dataset.patches===markup&&guide.querySelector('.tour-shade-patch'))return;
  clear();guide.dataset.patches=markup;guide.querySelector('.tour-focus-ring').insertAdjacentHTML('beforebegin',markup);
 }
 function revealTarget(el,p){
  // Guided steps block swiping, so a target clipped by a scrolling list (e.g. the
  // Menu Collection on a short tablet) is brought into view once for the child.
  if(revealedFor===p)return;
  const r=el.getBoundingClientRect();let clip={left:0,top:0,right:innerWidth,bottom:innerHeight};
  for(let node=el.parentElement;node&&node!==document.body;node=node.parentElement){
   const cs=getComputedStyle(node);
   if(/(auto|scroll)/.test(cs.overflowY+cs.overflowX)&&(node.scrollHeight>node.clientHeight+1||node.scrollWidth>node.clientWidth+1)){
    const q=node.getBoundingClientRect();clip={left:Math.max(clip.left,q.left),top:Math.max(clip.top,q.top),right:Math.min(clip.right,q.right),bottom:Math.min(clip.bottom,q.bottom)};
   }
  }
  revealedFor=p;
  if(r.top<clip.top-1||r.bottom>clip.bottom+1||r.left<clip.left-1||r.right>clip.right+1){
   const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
   el.scrollIntoView({block:'center',inline:'nearest',behavior:reduce?'auto':'smooth'});
  }
 }
 function place(){
  if(!guide||!tour)return;const p=tour.phase,card=guide.querySelector('.tour-checklist');if(!card)return;
  const opening=p==='intro'||(p==='ready'&&!celebration),travel=!!bakeryJourney&&['nav-orders','nav-packages','nav-menu'].includes(p),el=target(),isFree=free.has(p);
  const ctx=contexts[p]||{},own=ctx.shade==='own';
  guide.classList.toggle('is-free',isFree);guide.classList.toggle('is-travel',travel);guide.classList.toggle('is-intro',opening&&!own);
  guide.classList.toggle('is-own-backdrop',own&&!isFree);guide.classList.toggle('is-celebrating',!!celebration);
  guide.classList.toggle('is-worksheet',['complete','back'].includes(p));
  document.body.dataset.tourPhase=p;
  currentTarget=!isFree&&!travel&&el&&p!=='ready'?el:null;
  if(isFree){card.style.opacity='0';guide.classList.remove('is-spotlit');return}
  if(!currentTarget&&!celebration){guide.classList.remove('is-compact');compactKey='';compactOn=false}
  card.style.opacity='';
  const w=innerWidth,h=innerHeight,cw=card.offsetWidth,ch=card.offsetHeight;
  const bright=ctx.bright?rectOf(ctx.bright):null;
  const avoid=[bright,...(ctx.avoid||[]).map(rectOf)].filter(Boolean);
  let x=(w-cw)/2,y=(h-ch)/2,side='center';
  if(p==='intro'){
   // Anchor the stack to its final six-strip height so it grows downward smoothly.
   // Computed once per viewport, so later (taller, two-line) strips never shift it.
   const key=w+'x'+h;
   if(introAnchor.key!==key){
    const stack=card.querySelector('.tour-paper-stack'),strip=Math.max(...[...(stack?.children||[])].map(e=>e.offsetHeight),50);
    const final=ch+(6-tour.revealed)*(strip+5)+8;introAnchor={key,top:Math.max(12,(h-final)/2)};
   }
   y=introAnchor.top;
  }else if(p==='ready'&&bright){
   // Keep the Boost popup readable: narrow the finale to the free side if needed
   // (every strip is already checked, so the compact finale omits them).
   card.style.width='';guide.classList.remove('is-compact');
   let fw=card.offsetWidth,fh=card.offsetHeight;const room=Math.max(w-bright.right,bright.left)-32;
   if(!celebration&&room<fw&&room>=230){guide.classList.add('is-compact');card.style.width=room+'px';fw=card.offsetWidth;fh=card.offsetHeight}
   const o=choosePlace(bright,fw,fh,w,h,'right',[bright]);x=o.x;y=o.y;side=o.side;
  }else card.style.width='';
  if(currentTarget&&!celebration)revealTarget(currentTarget,p);
  if(currentTarget){
   const r=currentTarget.getBoundingClientRect();
   if(!celebration||celebration.anchor==='new'){
    const pref=['buy-slot','empty-slot','choose-food'].includes(p)?'right':p==='boost'?'below':'above';
    // If the full stack can only sit on top of the step's content, fall back to
    // the single-strip checklist (decided once per layout to avoid class flapping).
    const layoutKey=p+':'+w+'x'+h;
    const measure=compact=>{guide.classList.toggle('is-compact',compact);return choosePlace(r,card.offsetWidth,card.offsetHeight,w,h,pref,avoid)};
    let o;
    if(compactKey!==layoutKey){
     compactKey=layoutKey;const full=measure(false);o=full;compactOn=false;
     if(full.cover+full.hidden>0){const small=measure(true);if(small.cover+small.hidden<full.cover+full.hidden){o=small;compactOn=true}else measure(false)}
    }else o=measure(compactOn);
    x=o.x;y=o.y;side=o.side;
   }
   const pad=7,spot=box(r.left-pad,r.top-pad,r.width+pad*2,r.height+pad*2);
   // Own-backdrop popups get transparent blockers; the target itself stays open.
   if(bright&&!own){const all=union(bright,spot);shapeShades(all);patchShades(all,[bright,spot])}
   else{shapeShades(spot);patchShades(null,[])}
   const ring=guide.querySelector('.tour-focus-ring');
   Object.assign(ring.style,{left:(r.left-pad)+'px',top:(r.top-pad)+'px',width:(r.width+pad*2)+'px',height:(r.height+pad*2)+'px'});
   guide.classList.toggle('is-spotlit',!celebration);
  }else if(bright&&!own){shapeShades(bright);patchShades(null,[]);guide.classList.remove('is-spotlit')}
  else{fullShade();patchShades(null,[])}
  if(celebration&&celebration.anchor==='stay'&&celebration.left!=null){x=celebration.left;y=celebration.top;side=card.dataset.position||side}
  card.dataset.position=side;card.style.left=x+'px';card.style.top=y+'px';
 }
 function cardVisible(){
  const card=guide?.querySelector('.tour-checklist');if(!card)return null;
  if(guide.classList.contains('is-free')||guide.classList.contains('is-travel'))return null;
  const style=getComputedStyle(card);if(Number(style.opacity)<.5)return null;
  const r=card.getBoundingClientRect();return r.width>2?r:null;
 }
 function trackCelebration(){
  // Decide whether newly earned checks must be shown before focus moves on.
  const p=tour.phase,done=completedCount();
  if(done<shownDone){shownDone=done;celebration=null;return}
  const visible=!free.has(p)&&!(bakeryJourney&&['nav-orders','nav-packages','nav-menu'].includes(p));
  if(celebration){
   if(done>celebration.to){
    // Another check arrived mid-hold: keep the card where the child sees it now.
    const prior=cardVisible();
    if(prior)Object.assign(celebration,{anchor:'stay',left:prior.left,top:prior.top});
    celebration.to=done;shownDone=done;celebration.until=Math.max(celebration.until,now()+CHECK_HOLD_MS*.8);
   }
   if(now()>=celebration.until)celebration=null;
   return;
  }
  if(done>shownDone&&visible){
   const prior=cardVisible();
   celebration={from:shownDone,to:done,until:now()+CHECK_HOLD_MS,anchor:prior?'stay':'new',left:prior?.left??null,top:prior?.top??null};
   shownDone=done;
  }
 }
 function refresh(){
  if(!tour||!isHub()){remove();return}
  if(!document.body||($('bakeryLoading')&&!$('bakeryLoading').hidden))return;
  update();if(!tour)return;
  mount();trackCelebration();
  const key=tour.phase+':'+tour.revealed+':'+completedCount()+':'+(celebration?'c'+celebration.to:'');
  if(rendered!==key){
   const old=guide.querySelector('.tour-checklist'),oldRect=old&&cardVisible();
   const from=rendered.split(':')[0],to=tour.phase,fromCelebration=rendered.split(':')[3];
   // Intro strips are added in place so earlier strips, the card and Next never jump.
   if(from==='intro'&&to==='intro'&&old&&old.dataset.phase==='intro'){
    const stack=old.querySelector('.tour-paper-stack'),count=stack.children.length;
    for(let i=count;i<tour.revealed;i++){
     for(const prev of stack.children)prev.classList.remove('is-new','is-current');stack.lastElementChild?.classList.add('is-pending');
     stack.insertAdjacentHTML('beforeend',paper(i,'is-current','is-new'));
    }
    const next=old.querySelector('[data-tour="next"]');
    if(next){next.querySelector('b').textContent=tour.revealed===6?"Let's Go!":'Next';next.disabled=true;next.dataset.ready='false';
     const bar=next.querySelector('.tour-next-progress');const fresh=bar.cloneNode();bar.replaceWith(fresh)}
    rendered=key;place();return;
   }
   guide.innerHTML=markup();rendered=key;
   if(tour.phase==='intro'){
    readyAt=readyAt||now()+READ_MS;
    const next=guide.querySelector('[data-tour="next"]');
    if(next){next.dataset.ready=String(now()>=readyAt);next.disabled=now()<readyAt}
   }
   const card=guide.querySelector('.tour-checklist');
   const morph=oldRect&&from!=='intro'&&to!=='intro'&&!free.has(from)&&!free.has(to);
   if(morph&&celebration?.anchor==='stay'){
    // Hold the card exactly where the child last saw it while the tick lands.
    card.style.left=oldRect.left+'px';card.style.top=oldRect.top+'px';place();return;
   }
   if(morph||(fromCelebration&&oldRect)){
    card.style.left=oldRect.left+'px';card.style.top=oldRect.top+'px';
    // Carry the previous screen-space position into a new DOM card before
    // animating it to the next target. Without the layout read, replacement
    // elements jump straight to their new position instead of transitioning.
    void card.offsetWidth;
    requestAnimationFrame(()=>{if(!tour||rendered!==key||!guide?.contains(card))return;place()});
    return;
   }
   if(to!=='intro'&&!free.has(to))card.classList.add('is-arriving');
  }
  if(tour.phase==='intro'){
   const next=guide.querySelector('[data-tour="next"]');if(next&&now()>=readyAt){next.disabled=false;next.dataset.ready='true'}
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
  else if(name==='finish'&&tour.phase==='ready'&&!celebration)finish();
  else if(name==='next'&&tour.phase==='intro'&&now()>=readyAt){
   if(tour.revealed<6){tour.revealed++;readyAt=now()+READ_MS;persist();refresh()}
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
 root.panaderyaTutorialStatus=()=>tour?{phase:tour.phase,task:taskIndex()+1,checked:completedCount(),shownChecked:celebration?celebration.to:shownDone,celebrating:!!celebration,focus:visualState().focus+1,revealed:tour.revealed,target:currentTarget?.getAttribute('aria-label')||null}:null;
 const previousText=root.render_game_to_text;
 if(typeof previousText==='function')root.render_game_to_text=()=>{
  const state=JSON.parse(previousText());state.bakeryGuide=root.panaderyaTutorialStatus();return JSON.stringify(state)
 };
 addEventListener('resize',queue);document.addEventListener('scroll',queue,true);
 setInterval(()=>{if(tour)refresh()},85);
 const boot=setInterval(()=>{if(document.body?.dataset.view==='environment'){clearInterval(boot);return}if(!isHub()||($('bakeryLoading')&&!$('bakeryLoading').hidden))return;clearInterval(boot);start(false)},120);
})(globalThis);
