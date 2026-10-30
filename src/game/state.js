/* Panaderya Quest — src/game/state.js
 * Modularized from the original playable prototype.
 * Loaded as classic scripts in index.html, in dependency order.
 */
const fresh=()=>({progressionVersion:PROGRESSION_VERSION,rarityCount:8,bakeryLevel:1,bakerySpent:0,autoEquip:'off',foodLevelCredits:{},orderClock:0,orderRefreshAt:0,coins:250,completed:0,mastery:0,permanentLuck:0,owned:[{uid:1,id:'pandesal',level:1,fusion:1,spent:0}],discovered:['pandesal'],uidNext:2,ingredients:{},equipment:{oven:0,mixer:0,fridge:0,display:0},decor:0,staff:{until:0,rate:0},mode:'normal',lives:3,board:[],ticketSeq:0,sound:true,musicOn:false,tutorialArrows:true,guideGraduated:false,menuSlots:4,activeMenu:[1],helpSeen:false,seenUnlocks:[],tutorialIndex:0,learning:{correct:0,mistakes:0},run:null});
let g,previousSave;try{previousSave=localStorage.getItem('panaderyaQuestV2');g=JSON.parse(previousSave)||fresh()}catch(_){g=fresh()}
if(!g.owned||!g.equipment||!('completed' in g)){g=fresh()}
if(g.progressionVersion!==PROGRESSION_VERSION){
 try{if(previousSave&&!localStorage.getItem('panaderyaQuestV2BeforeProgression'))localStorage.setItem('panaderyaQuestV2BeforeProgression',previousSave)}catch(_){}
 migrateProgression(g);
}
if(!Number.isInteger(g.menuSlots))g.menuSlots=4;if(!Array.isArray(g.activeMenu))g.activeMenu=g.owned.slice(0,g.menuSlots).map(x=>x.uid);if(typeof g.tutorialArrows!=='boolean')g.tutorialArrows=true;if(typeof g.musicOn!=='boolean')g.musicOn=false;
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
function makeTicket(){const rarity=ticketRarity(),dims=TICKET_DIMS[rarity];const aMin=10**(dims[0]-1),aMax=10**dims[0]-1,bMin=10**(dims[1]-1),bMax=10**dims[1]-1;const a=aMin+Math.floor(Math.random()*(aMax-aMin+1)),b=bMin+Math.floor(Math.random()*(bMax-bMin+1));const id=++g.ticketSeq;return {id,rarity,a,b,base:ticketBase(rarity)}}
function refillBoard(){while(g.board.length<ORDER_LIMIT)g.board.push(makeTicket())}
function reconcileAutoEquip(){if(!g.run&&['final','base'].includes(g.autoEquip)){const next=bestMenu(g.owned,g.menuSlots,g.autoEquip);if(JSON.stringify(next)!==JSON.stringify(g.activeMenu))g.activeMenu=next}}
function orderNow(){g.orderClock=Math.max(g.orderClock||0,Date.now());return g.orderClock}
function refreshRemaining(){return Math.max(0,(g.orderRefreshAt||0)-orderNow())}
function syncRefreshDeadline(){
 // Stale tabs and their staff ticks cannot erase an already-saved cooldown.
 try{const stored=JSON.parse(localStorage.getItem('panaderyaQuestV2'));if(stored?.orderRefreshAt>g.orderRefreshAt)g.orderRefreshAt=stored.orderRefreshAt;g.orderClock=Math.max(g.orderClock||0,stored?.orderClock||0)}catch(_){}
}
function refreshOrders(){
 syncRefreshDeadline();
 if(refreshRemaining()>0)return false;
 g.orderRefreshAt=orderNow()+ORDER_REFRESH_MS;g.board=[];refillBoard();save();render();toast('Fresh orders have arrived!');return true;
}
function updateOrderRefresh(){const button=$('refreshOrders');if(!button)return;const remaining=refreshRemaining(),seconds=Math.ceil(remaining/1000);button.disabled=remaining>0;button.textContent=remaining?`Refresh in ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:'Refresh Orders';}
function save(){reconcileAutoEquip();g.economyPeakBase=pricingMenuBase();syncRefreshDeadline();orderNow();try{localStorage.setItem('panaderyaQuestV2',JSON.stringify(g))}catch(_){}}
function toast(text){const el=document.createElement('div');el.className='toast';el.textContent=text;$('toasts').appendChild(el);setTimeout(()=>el.remove(),3200)}
function showModal(title,html,variant=''){if(!modal)modalReturnFocus=document.activeElement;modal={title,html,variant};paintModal()}
function closeModal(){modal=null;paintModal();render();if(modalReturnFocus?.isConnected)modalReturnFocus.focus?.({preventScroll:true});modalReturnFocus=null}
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
