/* Main rendering preserves the mounted worksheet between menu visits. */
let mountedWorksheetRun=null;
function render(){
 if(g.run?.phase==='engine'&&mountedWorksheetRun===g.run&&$('worksheetFrame')){
  const wasPaused=$('liveOrder')?.hidden,scroll=document.querySelector?.('.menu-grid')?.scrollTop||0;paintPausedOrder();
  const grid=document.querySelector?.('.menu-grid');if(grid)grid.scrollTop=scroll;
  if(g.run.paused){const left=document.querySelector?.('.leftcol'),right=document.querySelector?.('.rightcol');if(left)left.outerHTML=renderLeft();if(right)right.outerHTML=renderRight();if(typeof centerBakeryCard==='function')centerBakeryCard()}
  if(wasPaused&&!g.run.paused&&typeof fitWorksheet==='function')fitWorksheet();const wallet=$('walletCoins');if(wallet)wallet.textContent=amountLabel(g.coins);if(typeof paintPurchaseUndo==='function')paintPurchaseUndo();return;
 }
 mountedWorksheetRun=g.run?.phase==='engine'?g.run:null;
 const gridScroll=document.querySelector?.('.menu-grid')?.scrollTop||0;
 reconcileAutoEquip();refillBoard();$('app').dataset.bakeryStage=bakeryStage(g.bakeryLevel);$('app').className=g.run&&!g.run.paused?'playing':'browsing';
 $('app').innerHTML=`<div class="layout">${renderLeft()}${g.run?`<div id="liveOrder" class="live-order">${renderWorksheet()}</div><div id="pausedMenu" class="paused-menu" hidden></div>`:renderMenu()}${renderRight()}</div>`;
 paintPausedOrder();const grid=document.querySelector?.('.menu-grid');if(grid)grid.scrollTop=gridScroll;if(typeof centerBakeryCard==='function')centerBakeryCard();if(typeof paintPurchaseUndo==='function')paintPurchaseUndo();
 if(typeof syncRewardPresentation==='function')syncRewardPresentation();
 if(g.run&&g.run.phase==='engine'){const fr=$('worksheetFrame');if(fr){fr.onload=()=>sendEngine('hello');fr.src='worksheet/worksheet-engine.html'}if(typeof fitWorksheet==='function')fitWorksheet()}
}
if(typeof window!=='undefined')window.addEventListener('resize',()=>{if(g.run?.phase==='engine'&&typeof fitWorksheet==='function')fitWorksheet();if(typeof centerBakeryCard==='function')centerBakeryCard();if((!g.run||g.run.paused)&&oddsCollapsed===null){const odds=document.querySelector('.ticket-odds');if(odds)odds.outerHTML=renderTicketOdds()}});
setInterval(()=>{tickStaff();updateOrderRefresh();validatePurchaseUndo();paintPurchaseUndo()},1000);refillBoard();render();save();

function paintPausedOrder(){
 const live=$('liveOrder'),menu=$('pausedMenu');if(!live||!menu)return;
 const paused=!!g.run?.paused;live.hidden=paused;menu.hidden=!paused;
 $('app').className=paused?'browsing':'playing';
 if(paused)menu.innerHTML=`<button class="primary resume-order" onclick="startTicket(${g.run.ticket.id})">Resume order · ${g.run.ticket.a} × ${g.run.ticket.b}</button>${renderMenu()}`;
}
