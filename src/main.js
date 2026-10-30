/* Live worksheet identity is preserved across all dialog rendering. */
let mountedWorksheetRun=null;
function render(){
 if(g.run?.phase==='engine'&&mountedWorksheetRun===g.run&&$('worksheetFrame')){
  const wallet=$('walletCoins');if(wallet)wallet.textContent=fmt(g.coins);return;
 }
 mountedWorksheetRun=g.run?.phase==='engine'?g.run:null;
 refillBoard();$('app').className=g.run?'playing':'browsing';
 $('app').innerHTML=`<header class="topbar"><div class="brand"><div class="brandlogo" aria-hidden="true">🥖</div><div><h1>Panaderya Quest</h1><div class="tagline">A little math. A lot of delicious.</div></div></div><div class="topstats"><div class="wallet"><span aria-hidden="true">🪙</span><div><small>Your coins</small><strong id="walletCoins">${fmt(g.coins)}</strong></div></div><button class="iconbtn" onclick="openSettings()" aria-label="Settings">⚙</button></div></header><div class="layout">${renderLeft()}${g.run?renderWorksheet():renderMenu()}${renderRight()}</div>`;
 if(typeof syncRewardPresentation==='function')syncRewardPresentation();
 if(g.run&&g.run.phase==='engine'){const fr=$('worksheetFrame');if(fr)fr.src='worksheet/worksheet-engine.html'}
}
setInterval(tickStaff,1000);refillBoard();render();save();
