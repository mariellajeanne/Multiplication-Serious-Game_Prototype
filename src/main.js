/* Header shared by the menu and the focused worksheet. */
let mountedWorksheetRun=null;
function render(){
 if(g.run?.phase==='engine'&&mountedWorksheetRun===g.run&&$('worksheetFrame')){
  const wallet=$('walletCoins');if(wallet)wallet.textContent=fmt(g.coins);return;
 }
 mountedWorksheetRun=g.run?.phase==='engine'?g.run:null;
 refillBoard();$('app').className=g.run?'playing':'browsing';
 $('app').innerHTML=`<header class="topbar"><div class="brand"><span class="brandlogo" aria-hidden="true">${bakeryIcon('bakery')}</span><h1>My Panaderya</h1><button class="iconbtn" onclick="openSettings()" aria-label="Settings">${bakeryIcon('settings')}</button></div></header><div class="layout">${renderLeft()}${g.run?renderWorksheet():renderMenu()}${renderRight()}</div>`;
 if(typeof syncRewardPresentation==='function')syncRewardPresentation();
 if(g.run&&g.run.phase==='engine'){const fr=$('worksheetFrame');if(fr)fr.src='worksheet/worksheet-engine.html';if(typeof fitWorksheet==='function')fitWorksheet()}
}
if(typeof window!=='undefined')window.addEventListener('resize',()=>{if(g.run?.phase==='engine'&&typeof fitWorksheet==='function')fitWorksheet()});
setInterval(tickStaff,1000);refillBoard();render();save();
