/* Panaderya Quest — src/game/state.js
 * Modularized from the original playable prototype.
 * Loaded as classic scripts in index.html, in dependency order.
 */
const fresh=()=>({coins:250,completed:0,mastery:0,permanentLuck:0,owned:[{uid:1,id:'pandesal',level:1,fusion:0,spent:0}],discovered:['pandesal'],uidNext:2,ingredients:{},equipment:{oven:0,mixer:0,fridge:0,display:0},decor:0,staff:{until:0,rate:0},mode:'normal',lives:3,board:[],ticketSeq:0,sound:true,musicOn:false,tutorialArrows:true,guideGraduated:false,menuSlots:4,activeMenu:[1],helpSeen:false,seenUnlocks:[],tutorialIndex:0,learning:{correct:0,mistakes:0},run:null});
let g;try{g=JSON.parse(localStorage.getItem('panaderyaQuestV2'))||fresh()}catch(_){g=fresh()}
// Persisted data from older variants is intentionally not imported; this is a fresh prototype.
if(!g.owned||!g.equipment||!('completed' in g)){g=fresh()}
if(!Number.isInteger(g.menuSlots))g.menuSlots=4;if(!Array.isArray(g.activeMenu))g.activeMenu=g.owned.slice(0,g.menuSlots).map(x=>x.uid);if(typeof g.tutorialArrows!=='boolean')g.tutorialArrows=true;if(typeof g.musicOn!=='boolean')g.musicOn=false;
// Old established players keep their saved guide preference.
if(typeof g.guideGraduated!=='boolean')g.guideGraduated=g.completed>=3;
function graduateGuideAfterOrder(){if(g.completed>=3&&!g.guideGraduated){g.guideGraduated=true;g.tutorialArrows=false;}}
let modal=null;let music=null;let musicTimer=null;let animationTimers=[];let modalReturnFocus=null;
const F=id=>FOOD.find(x=>x.id===id);const infoMode=()=>MODE.find(x=>x.id===g.mode)||MODE[0];
const rarityTag=(r)=>`<span class="tag ${RARITIES[r].toLowerCase()}">${RARITIES[r]}</span>`;
const foodValue=o=>{const f=F(o.id);return f.base*(1+0.20*(o.level-1))*[1,1.6,2.5,4][o.fusion]};
const foodSum=()=>{const best={};for(const o of g.owned.filter(x=>g.activeMenu.includes(x.uid)))best[o.id]=Math.max(best[o.id]||0,foodValue(o));return Object.values(best).reduce((a,b)=>a+b,0)};
const kitchenBonus=()=>1+KITCHEN.reduce((s,k)=>s+(g.equipment[k.id]||0)*k.bonus,0);
const decorBonus=()=>[1,1.08,1.19,1.35,1.55][g.decor]||1;
const bakeryValue=()=>Math.max(1,foodSum())*kitchenBonus()*decorBonus();
const tierLevel=()=>g.completed<2?0:g.completed<4?1:g.completed<7?2:g.completed<11?3:g.completed<16?4:5;
const masterStage=()=>Math.min(5,Math.floor(g.mastery/4));
const highestRarity=()=>Math.min(5,Math.max(tierLevel(), masterStage()));
function ticketRarity(){const cap=highestRarity();const weights=[65,27,7,1,.2,.01];for(let i=0;i<=cap;i++)weights[i]*=(1+i*(g.permanentLuck*.16));for(let i=cap+1;i<6;i++)weights[i]=0;if(g.mastery>=12)weights[0]=0;if(g.mastery>=24)weights[1]=0;if(g.mastery>=40)weights[2]=0;let total=weights.reduce((a,b)=>a+b,0),r=Math.random()*total;for(let i=0;i<6;i++){r-=weights[i];if(r<=0)return i}return cap}
function makeTicket(){const rarity=ticketRarity();const dims=[[2,1],[2,2],[2,2],[3,2],[3,2],[4,2]][rarity];const aMin=10**(dims[0]-1),aMax=10**dims[0]-1,bMin=10**(dims[1]-1),bMax=10**dims[1]-1;const a=aMin+Math.floor(Math.random()*(aMax-aMin+1)),b=bMin+Math.floor(Math.random()*(bMax-bMin+1));const id=++g.ticketSeq;return {id,rarity,a,b,base:Math.round((70+30*dims[0]*dims[1])*(1+rarity*.6))}}
function refillBoard(){while(g.board.length<3)g.board.push(makeTicket())}
function save(){try{localStorage.setItem('panaderyaQuestV2',JSON.stringify(g))}catch(_){}}
function toast(text){const el=document.createElement('div');el.className='toast';el.textContent=text;$('toasts').appendChild(el);setTimeout(()=>el.remove(),3200)}
function showModal(title,html){if(!modal)modalReturnFocus=document.activeElement;modal={title,html};paintModal()}
function closeModal(){modal=null;paintModal();render();if(modalReturnFocus?.isConnected)modalReturnFocus.focus?.({preventScroll:true});modalReturnFocus=null}
function paintModal(){
 const root=$('modals');if(!modal){root.innerHTML='';return}
 root.innerHTML=`<div class="backdrop" onclick="if(event.target===this)closeModal()"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle" tabindex="-1"><div class="modalhead"><h2 id="modalTitle">${modal.title}</h2><span class="dialog-wallet">🪙 ${fmt(g.coins)}</span><button aria-label="Close" class="close" onclick="closeModal()">×</button></div><div class="modalbody">${modal.html}</div></div></div>`;
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
