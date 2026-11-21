/* Action-validated in-world guide. The worksheet owns its procedural tutorial. */
(function(root){
 'use strict';
 const KEY='panaderyaWholeGameTourV1';
 const stages=['food','close-food','orders','ticket','worksheet','claim','summary','packages'];
 let active=false,step=0,highlight=null,baseline=0,scheduled=false;
 const isHub=()=>typeof isBakeryHub==='function'&&isBakeryHub();
 const t=msg=>typeof uiText==='function'?uiText(msg):msg;
 function read(){try{return JSON.parse(localStorage.getItem(KEY))}catch(_){return null}}
 function persist(){try{localStorage.setItem(KEY,JSON.stringify({step,baseline}))}catch(_){}}
 function clear(){highlight?.classList.remove('bakery-tour-highlight');highlight=null;document.getElementById('bakeryGameTour')?.remove()}
 function complete(skipped=false){
  active=false;clear();try{localStorage.setItem(KEY,skipped?'skipped':'done')}catch(_){}
  if(typeof g!=='undefined'){g.helpSeen=true;save()}
 }
 function move(next){step=next;persist()}
 function queue(){if(!active||scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh()})}
 function start(replay=false){
  if(!isHub()||typeof g==='undefined'||g.run&&!g.run.paused)return false;
  const saved=read();
  let finished=false;try{finished=['done','skipped'].includes(localStorage.getItem(KEY))}catch(_){}
  if(!replay&&!saved&&(g.helpSeen||finished))return false;
  active=true;step=!replay&&Number.isInteger(saved?.step)&&saved.step>=0&&saved.step<stages.length?saved.step:0;
  baseline=!replay&&Number.isInteger(saved?.baseline)?saved.baseline:g.completed;
  g.helpSeen=true;g.tutorialArrows=true;save();persist();
  if(step===0){if(hubCollection)closeHubCollection();navigateBakery('menu')}
  else if(step===2||step===3)navigateBakery('orders');
  refresh();return true;
 }
 function visible(selector){return [...document.querySelectorAll(selector)].find(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&!el.closest('[hidden],[inert]')&&!el.disabled})||null}
 function target(){
  if(typeof modal!=='undefined'&&modal&&step!==6)return null;
  switch(stages[step]){
   case 'food':return visible('.scene-food-card.hub-food,.view-all-foods');
   case 'close-food':return visible('.food-panel-close,.hub-collection-back');
   case 'orders':return visible('[data-world-nav="orders"],.nav-orders');
   case 'ticket':return visible('.scene-ticket,.hub-ticket');
   case 'claim':return visible('#collectRewards');
   case 'summary':return visible('#acknowledgeWorksheetSummary:enabled')||visible('#skipWorksheetSummary');
   case 'packages':return visible('[data-world-nav="packages"],.nav-packages');
   default:return null;
  }
 }
 function refresh(){
  if(!active)return;
  if(!isHub()){clear();return}
  // Only successful state transitions advance the guide, never a raw click.
  if(step===0&&hubCollection)move(1);
  if(step===1&&!hubCollection)move(2);
  if(step===2&&bakeryPage==='orders'&&!bakeryJourney)move(3);
  if(step===3&&g.run&&!g.run.paused)move(4);
  if(step===4){
   if(g.run?.procedureComplete)move(5);
   else if(!g.run||g.run.paused){move(3);navigateBakery('orders')}
  }
  if(step===5&&document.querySelector('.worksheet-summary'))move(6);
  if(step>=4&&g.completed>baseline)move(7);
  if(step===7&&bakeryPage==='packages'&&!bakeryJourney){complete();return}
  const el=target();
  if(el!==highlight){highlight?.classList.remove('bakery-tour-highlight');highlight=el;highlight?.classList.add('bakery-tour-highlight')}
  let guide=document.getElementById('bakeryGameTour');
  if(!guide){
   guide=document.createElement('div');guide.id='bakeryGameTour';guide.className='bakery-game-tour';
   const arrow=document.createElement('span');arrow.className='tour-arrow';arrow.textContent='▼';arrow.setAttribute('aria-hidden','true');
   const skip=document.createElement('button');skip.type='button';skip.dataset.tour='skip';skip.textContent=t('Skip');skip.setAttribute('aria-label',t('Skip bakery guide'));
   guide.append(arrow,skip);document.body.append(guide);
  }
  guide.dataset.step=stages[step];guide.classList.toggle('has-target',!!el);
  if(el){const r=el.getBoundingClientRect();guide.style.setProperty('--target-x',Math.max(24,Math.min(innerWidth-24,r.left+r.width/2))+'px');guide.style.setProperty('--target-y',Math.max(4,r.top-40)+'px')}
 }
 function allowed(event){
  if(!active||!highlight)return true;
  if(event.target.closest?.('[data-tour="skip"]')||highlight.contains(event.target))return true;
  // Keep native scrolling/scrollbar gestures available around a live target.
  return event.type!=='click'&&event.target.contains?.(highlight)&&!event.target.closest?.('button,a,input,select,summary');
 }
 for(const type of ['pointerdown','touchstart','click','keydown'])document.addEventListener(type,event=>{
  if(!active)return;
  if(type==='keydown'&&event.key==='Escape'){complete(true);event.preventDefault();event.stopImmediatePropagation();return}
  if(type==='keydown'&&!['Enter',' '].includes(event.key))return;
  if(!allowed(event)){event.preventDefault();event.stopImmediatePropagation();return}
  if(type==='click'&&event.target.closest?.('[data-tour="skip"]')){complete(true);event.preventDefault();event.stopImmediatePropagation();return}
  queue();
 },{capture:true,passive:false});
 const previousRender=root.render;
 if(typeof previousRender==='function')root.render=function(...args){const result=previousRender.apply(this,args);queue();return result};
 const previousTutorial=root.showTutorial;
 if(typeof previousTutorial==='function')root.showTutorial=function(...args){
  if(isHub()&&typeof g!=='undefined'&&(!g.run||g.run.paused)){if(typeof modal!=='undefined'&&modal)closeModal();start(true);return}
  return previousTutorial.apply(this,args);
 };
 root.startWholeBakeryGuide=()=>start(true);root.skipWholeBakeryGuide=complete;
 const previousText=root.render_game_to_text;
 if(typeof previousText==='function')root.render_game_to_text=()=>{const state=JSON.parse(previousText());state.bakeryGuide={active,stage:active?stages[step]:null,target:highlight?.getAttribute('aria-label')||null};return JSON.stringify(state)};
 addEventListener('resize',queue);document.addEventListener('scroll',queue,true);
 // Also observes successful asynchronous navigation, rewards and missing targets.
 setInterval(()=>{if(active)refresh()},200);
 setTimeout(()=>{
  const saved=read();
  if(saved&&Number.isInteger(saved.step)&&g.run&&!g.run.paused){active=true;step=saved.step;baseline=saved.baseline;refresh()}
  else start(false);
 },650);
})(globalThis);
