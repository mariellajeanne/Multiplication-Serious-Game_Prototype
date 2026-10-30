/* Panaderya Quest — src/main.js
 * Modularized from the original playable prototype.
 * Loaded as classic scripts in index.html, in dependency order.
 */
// Keep the live worksheet document (including transient gesture/animation state)
// mounted while rendering dialogs or refreshing the same active order.
let mountedWorksheetRun=null;
function render(){
 if(g.run?.phase==='engine'&&mountedWorksheetRun===g.run&&$('worksheetFrame')){
  const wallet=$('walletCoins');if(wallet)wallet.textContent=fmt(g.coins);
  return;
 }
 mountedWorksheetRun=g.run?.phase==='engine'?g.run:null;
 refillBoard();$('app').innerHTML=`<header class="topbar"><div class="brand"><div class="brandlogo">🥖</div><div><h1>Panaderya Quest</h1><div class="tagline">Bake • Multiply • Grow</div></div></div><div class="topstats"><div class="statpill"><span class="ico">🏆</span><div><div class="label">Bakery Multiplier</div><div class="val num">×${bakeryValue().toFixed(2)}</div></div></div><div class="statpill"><span class="ico">🪙</span><div><div class="label">Coins</div><div class="val num" id="walletCoins">${fmt(g.coins)}</div></div></div><div class="statpill"><span class="ico">🎟️</span><div><div class="label">Ticket Luck</div><div class="val num">+${g.permanentLuck}</div></div></div><button class="iconbtn" onclick="openSettings()" title="Settings and tutorial">⚙️</button></div></header><div class="layout">${renderLeft()}${g.run?renderWorksheet():renderMenu()}${renderRight()}</div>`;if(g.run&&g.run.phase==='engine'){const fr=$('worksheetFrame');if(fr)fr.src='worksheet/worksheet-engine.html'}}
setInterval(tickStaff,1000);refillBoard();render();if(!g.helpSeen)setTimeout(()=>showTutorial(0),400);save();
