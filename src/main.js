/* Header shared by the menu and the focused worksheet. */
let mountedWorksheetRun=null;
function render(){
 if(g.run?.phase==='engine'&&mountedWorksheetRun===g.run&&$('worksheetFrame')){
  const wasPaused=$('liveOrder')?.hidden;paintPausedOrder();if(wasPaused&&!g.run.paused&&typeof fitWorksheet==='function')fitWorksheet();const wallet=$('walletCoins');if(wallet)wallet.textContent=amountLabel(g.coins);return;
 }
 mountedWorksheetRun=g.run?.phase==='engine'?g.run:null;
 reconcileAutoEquip();refillBoard();$('app').dataset.bakeryStage=bakeryStage(g.bakeryLevel);$('app').className=g.run&&!g.run.paused?'playing':'browsing';
 $('app').innerHTML=`<header class="topbar"><div class="brand"><span class="brandlogo" aria-hidden="true">${bakeryIcon('bakery')}</span><h1>My Panaderya</h1><button class="iconbtn" onclick="openSettings()" aria-label="Settings">${bakeryIcon('settings')}</button></div></header><div class="layout">${g.run?`<div id="liveOrder" class="live-order">${renderWorksheet()}</div><div id="pausedMenu" class="paused-menu" hidden></div>`:renderMenu()}${renderRight()}</div>`;
 paintPausedOrder();
 if(typeof syncRewardPresentation==='function')syncRewardPresentation();
 if(g.run&&g.run.phase==='engine'){const fr=$('worksheetFrame');if(fr)fr.src='worksheet/worksheet-engine.html';if(typeof fitWorksheet==='function')fitWorksheet()}
}
if(typeof window!=='undefined')window.addEventListener('resize',()=>{if(g.run?.phase==='engine'&&typeof fitWorksheet==='function')fitWorksheet()});
setInterval(()=>{tickStaff();updateOrderRefresh()},1000);refillBoard();render();save();

function paintPausedOrder(){
 const live=$('liveOrder'),menu=$('pausedMenu');if(!live||!menu)return;
 const paused=!!g.run?.paused;live.hidden=paused;menu.hidden=!paused;
 $('app').className=paused?'browsing':'playing';
 if(paused)menu.innerHTML=`<button class="primary resume-order" onclick="startTicket(${g.run.ticket.id})">Resume order · ${g.run.ticket.a} × ${g.run.ticket.b}</button>${renderMenu()}`;
}
