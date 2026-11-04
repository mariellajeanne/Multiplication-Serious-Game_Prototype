/* Panaderya Quest — src/game/state.js
 * Modularized from the original playable prototype.
 * Loaded as classic scripts in index.html, in dependency order.
 */
const fresh=()=>({progressionVersion:PROGRESSION_VERSION,frame11Version:1,uniqueFoodsVersion:1,recipeCeilings:{pandesal:0},orderRuns:{},claimedOrders:{},packages:Array(8).fill(0),rarityCount:8,bakeryLevel:1,bakerySpent:0,autoEquip:'off',foodLevelCredits:{},orderClock:0,orderRefreshAt:0,coins:250,completed:0,mastery:0,permanentLuck:0,owned:[{uid:1,id:'pandesal',level:1,fusion:1,spent:0}],discovered:['pandesal'],uidNext:2,ingredients:{},equipment:{oven:0,mixer:0,fridge:0,display:0},decor:0,staff:{until:0,rate:0},mode:'normal',lives:3,board:[],ticketSeq:0,sound:true,musicOn:false,tutorialArrows:true,guideGraduated:false,menuSlots:1,activeMenu:[1],helpSeen:false,seenUnlocks:[],tutorialIndex:0,learning:{correct:0,mistakes:0},run:null});
let g,previousSave;try{previousSave=localStorage.getItem('panaderyaQuestV2');g=JSON.parse(previousSave)||fresh()}catch(_){g=fresh()}
if(!g.owned||!g.equipment||!('completed' in g)){g=fresh()}
if(g.progressionVersion!==PROGRESSION_VERSION){
 try{if(previousSave&&!localStorage.getItem('panaderyaQuestV2BeforeProgression'))localStorage.setItem('panaderyaQuestV2BeforeProgression',previousSave)}catch(_){}
 migrateProgression(g);
}
if(!Number.isInteger(g.menuSlots))g.menuSlots=1;if(!Array.isArray(g.activeMenu))g.activeMenu=g.owned.slice(0,g.menuSlots).map(x=>x.uid);if(typeof g.tutorialArrows!=='boolean')g.tutorialArrows=true;if(typeof g.musicOn!=='boolean')g.musicOn=false;
function migrateFrame11(state){
 state.orderRuns=state.orderRuns||{};state.claimedOrders=state.claimedOrders||{};
 state.packages=Array.from({length:8},(_,i)=>Math.max(0,Math.floor(state.packages?.[i]||0)));
 state.recipeCeilings=state.recipeCeilings||{};
 if(!state.frame11Version){
  // Previously earned chests guaranteed a food rarity. Keep that promise for
  // pending legacy rewards instead of reinterpreting them as a Luck-type draw.
  for(const run of [state.run,...Object.values(state.orderRuns)].filter(Boolean))
   run.chests=(run.chests||[]).map(chest=>typeof chest==='number'?{rarity:chest,legacyFoodRarity:chest}:{...chest,legacyFoodRarity:chest.rarity});
  for(const food of FOOD){const copies=state.owned.filter(o=>o.id===food.id);if(!copies.length)continue;
   state.recipeCeilings[food.id]=Math.max(...copies.map(recipeMastery))+copies.length-1+(state.foodLevelCredits?.[food.id]||0);
  }
  state.frame11Version=1;
 }
 if(state.run){const existing=state.orderRuns[state.run.ticket.id];state.run=existing||state.run;state.orderRuns[state.run.ticket.id]=state.run;}
 for(const r of Object.values(state.orderRuns))if(!state.claimedOrders[r.ticket.id]&&!state.board.some(t=>t.id===r.ticket.id))state.board.unshift(r.ticket);
 const started=state.board.filter(t=>state.orderRuns[t.id]);
 state.board=[...started,...state.board.filter(t=>!state.orderRuns[t.id]).slice(0,Math.max(0,ORDER_LIMIT-started.length))];
 state.ticketSeq=Math.max(state.ticketSeq||0,...state.board.map(t=>Number(t.id)||0));
 // Retain unique recipes and consolidate older multiple-copy investments before assignment validation.
 consolidateOwnedFoods(state);
 const seen=new Set();state.activeMenu=state.activeMenu.filter(uid=>{const o=state.owned.find(x=>x.uid===uid);if(!o||seen.has(o.id))return false;seen.add(o.id);return true}).slice(0,state.menuSlots);
 return state;
}
if(previousSave&&g.uniqueFoodsVersion!==1){try{if(!localStorage.getItem('panaderyaQuestV2BeforeUniqueFoods'))localStorage.setItem('panaderyaQuestV2BeforeUniqueFoods',previousSave)}catch(_){} }
migrateFrame11(g);
// Old established players keep their saved guide preference.
if(typeof g.guideGraduated!=='boolean')g.guideGraduated=g.completed>=3;
function graduateGuideAfterOrder(){if(g.completed>=3&&!g.guideGraduated){g.guideGraduated=true;g.tutorialArrows=false;}}
let modal=null;let music=null;let musicTimer=null;let animationTimers=[];let modalReturnFocus=null;
const F=id=>FOOD.find(x=>x.id===id);const infoMode=()=>MODE.find(x=>x.id===g.mode)||MODE[0];
const rarityLabel=r=>`★${r+1} · ${RARITIES[r]}`;
const rarityTag=r=>`<span class="tag rarity-r${r} ${RARITIES[r].toLowerCase().replaceAll(' ','-')}">${rarityLabel(r)}</span>`;
const foodValue=individualValue;
const foodSum=()=>{const best={};for(const o of g.owned.filter(x=>g.activeMenu.includes(x.uid)))best[o.id]=Math.max(best[o.id]||0,foodValue(o));return Object.values(best).reduce((a,b)=>a+b,0)};
const kitchenBonus=()=>KITCHEN.reduce((product,k)=>product*Math.pow(1+k.bonus,g.equipment[k.id]||0),1);
const decorBonus=()=>bakeryFactor(g.bakeryLevel);
const bakeryValue=()=>Math.max(1,foodSum())*kitchenBonus()*decorBonus();
const tierLevel=()=>g.completed<2?0:g.completed<4?1:g.completed<7?2:g.completed<11?3:g.completed<16?4:5;
const masterStage=()=>Math.min(5,Math.floor(g.mastery/4));
const highestRarity=()=>7;
function ticketRarity(){return drawRank(ticketProbabilities(g.mastery))}
function makeTicket(){const rarity=ticketRarity(),dims=TICKET_DIMS[rarity];const aMin=10**(dims[0]-1),aMax=10**dims[0]-1,bMin=10**(dims[1]-1),bMax=10**dims[1]-1;const a=aMin+Math.floor(Math.random()*(aMax-aMin+1)),b=bMin+Math.floor(Math.random()*(bMax-bMin+1));const id=++g.ticketSeq;return {id,rarity,a,b,base:ticketBase(rarity),packages:1+Math.floor(rarity/3)}}
function refillBoard(){while(g.board.length<ORDER_LIMIT)g.board.push(makeTicket())}
function reconcileAutoEquip(){if((!g.run||g.run.paused)&&['final','base'].includes(g.autoEquip)){const next=bestMenu(g.owned,g.menuSlots,g.autoEquip);if(JSON.stringify(next)!==JSON.stringify(g.activeMenu))g.activeMenu=next}}
function orderNow(){g.orderClock=Math.max(g.orderClock||0,Date.now());return g.orderClock}
function refreshRemaining(){return Math.max(0,(g.orderRefreshAt||0)-orderNow())}
function syncRefreshDeadline(){
 // Stale tabs and their staff ticks cannot erase an already-saved cooldown.
 try{const stored=JSON.parse(localStorage.getItem('panaderyaQuestV2'));if(stored?.orderRefreshAt>g.orderRefreshAt)g.orderRefreshAt=stored.orderRefreshAt;g.orderClock=Math.max(g.orderClock||0,stored?.orderClock||0)}catch(_){}
}
function refreshOrders(paid=false){
 syncRefreshDeadline();
 if(g.run){g.orderRuns[g.run.ticket.id]=g.run;if(!g.board.some(t=>t.id===g.run.ticket.id))g.board.unshift(g.run.ticket)}
 const eligible=g.board.filter(t=>!g.orderRuns[t.id]);if(!eligible.length&&g.board.length>=ORDER_LIMIT){toast('All orders have saved progress. Finish one to make room.');return false}
 if(refreshRemaining()>0&&!paid)return false;
 const cost=paid?refreshSkipCost():0;if(g.coins<cost)return false;
 commitPurchaseUndo('Order tickets refreshed');g.coins-=cost;
 g.orderRefreshAt=orderNow()+ORDER_REFRESH_MS;g.board=g.board.filter(t=>g.orderRuns[t.id]);refillBoard();save();render();toast('Fresh orders have arrived! Saved orders are kept.');return true;
}
function refreshSkipCost(){return Math.max(1,Math.round(economyUnit()*.5))}
function requestRefreshSkip(){const cost=refreshSkipCost();showModal('Refresh untouched orders?',`<p>Saved orders and their rewards stay exactly where they are.</p><button class="primary" ${g.coins<cost?'disabled':''} onclick="if(refreshOrders(true))closeModal()">Skip · 🪙 ${fmt(cost)}</button>`)}
function updateOrderRefresh(){const button=$('refreshOrders');if(!button)return;const remaining=refreshRemaining(),seconds=Math.ceil(remaining/1000);button.disabled=remaining>0;button.textContent=remaining?`Refresh in ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:'Refresh Orders';}
function save(){reconcileAutoEquip();g.economyPeakBase=pricingMenuBase();syncRefreshDeadline();orderNow();if(g.run)g.orderRuns[g.run.ticket.id]=g.run;if(typeof validatePurchaseUndo==='function')validatePurchaseUndo();try{localStorage.setItem('panaderyaQuestV2',JSON.stringify(g));return true}catch(_){if(typeof document.createElement==='function')toast('Saving is unavailable. Keep this page open to retain your progress.');return false}}
let toastTimer=null;
function clearNotifications(){clearTimeout(toastTimer);const root=$('toasts');if(root)root.replaceChildren()}
function toast(text){
 const root=$('toasts');if(!root)return;
 clearNotifications();
 if(modal){let note=document.querySelector?.('.modal .dialog-notice');if(!note){note=document.createElement('p');note.className='dialog-notice';note.setAttribute('role','status');document.querySelector?.('.modalbody')?.appendChild(note)}note.textContent=text;return}
 const el=document.createElement('div');el.className='toast';el.textContent=text;root.appendChild(el);toastTimer=setTimeout(()=>el.remove(),2800);
}
function captureFocus(el){return el?{node:el,id:el.id,key:el.getAttribute?.('data-focus'),action:el.getAttribute?.('onclick'),label:el.getAttribute?.('aria-label')}:null}
function restoreFocus(target){
 if(!target)return;let el=target.node?.isConnected?target.node:target.id?$(target.id):null;
 if(!el)el=[...(document.querySelectorAll?.('button,summary,[role="tab"]')||[])].find(node=>target.key?node.getAttribute('data-focus')===target.key:target.action?node.getAttribute('onclick')===target.action:target.label&&node.getAttribute('aria-label')===target.label);
 if(!el)el=document.querySelector?.('.iconbtn');el?.focus?.({preventScroll:true});
}
let modalTriggerFocus=null;
document.addEventListener?.('click',event=>{const trigger=event.target.closest?.('button,summary,[role="tab"]');if(trigger){modalTriggerFocus=captureFocus(trigger);setTimeout(()=>modalTriggerFocus=null,0)}},true);
function showModal(title,html,variant=''){if(!modal)modalReturnFocus=modalTriggerFocus||captureFocus(document.activeElement);clearNotifications();modal={title,html,variant};paintModal()}
function closeModal(){const focus=modalReturnFocus;modal=null;modalReturnFocus=null;clearNotifications();paintModal();render();restoreFocus(focus)}
function paintModal(){
 const root=$('modals');if(!modal){root.innerHTML='';return}
 root.innerHTML=`<div class="backdrop" onclick="if(event.target===this)closeModal()"><div class="modal ${modal.variant||''}" role="dialog" aria-modal="true" aria-labelledby="modalTitle" tabindex="-1"><div class="modalhead"><h2 id="modalTitle">${modal.title}</h2><span class="dialog-wallet">🪙 ${amountLabel(g.coins)}</span><button aria-label="Close" class="close" onclick="closeModal()">×</button></div><div class="modalbody">${modal.html}</div></div></div>`;
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>root.querySelector?.('.modal')?.focus());
}
document.addEventListener?.('keydown',event=>{
 if(!modal)return;
 if(event.key==='Escape'){event.preventDefault();closeModal();return}
 if(event.key!=='Tab')return;
 const root=document.querySelector('.modal');if(!root)return;
 const targets=[...root.querySelectorAll('button:not(:disabled),input:not(:disabled),select,summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);
 if(!targets.length){event.preventDefault();root.focus();return}
 const first=targets[0],last=targets.at(-1);
 if(event.shiftKey&&(document.activeElement===first||document.activeElement===root)){event.preventDefault();last.focus()}
 else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===root)){event.preventDefault();first.focus()}
});
