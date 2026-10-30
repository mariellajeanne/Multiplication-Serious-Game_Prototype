/* Panaderya Quest — src/game/worksheet-bridge.js
 * Modularized from the original playable prototype.
 * Loaded as classic scripts in index.html, in dependency order.
 */
function sendEngine(type,data={}){const fr=$('worksheetFrame');if(fr?.contentWindow)fr.contentWindow.postMessage({source:'bc-shell',type,...data},'*')}
function toggleArrows(){g.tutorialArrows=!g.tutorialArrows;save();sendEngine('tutorial',{enabled:g.tutorialArrows});const b=$('arrowToggle');if(b){b.textContent=g.tutorialArrows?'➜ Tutorial arrows ON':'➜ Tutorial arrows OFF';b.setAttribute('aria-pressed',String(g.tutorialArrows))}}
function toggleSfx(){g.sound=!g.sound;save();sendEngine('sound',{enabled:g.sound,volume:1});const b=$('sfxToggle');if(b){b.textContent=g.sound?'🔊 Sounds ON':'🔈 Sounds OFF';b.setAttribute('aria-pressed',String(g.sound))}toast(g.sound?'Sounds enabled':'Sounds muted')}

function renderWorksheet(){const r=g.run;return `<main class="panel worksheet-stage theme${Math.min(3,themeLevel())}"><div class="worksheet-actionline"><div><h2 style="margin:0;font-family:Georgia,serif">🧾 Order Worksheet</h2><div class="worksheet-info">${r.ticket.a} × ${r.ticket.b} · ${RARITIES[r.ticket.rarity]} order</div></div><div class="worksheet-controls"><button id="arrowToggle" aria-pressed="${g.tutorialArrows}" class="secondary mini" onclick="toggleArrows()">${g.tutorialArrows?'➜ Tutorial arrows ON':'➜ Tutorial arrows OFF'}</button><button id="sfxToggle" aria-pressed="${g.sound}" class="secondary mini" onclick="toggleSfx()">${g.sound?'🔊 Sounds ON':'🔈 Sounds OFF'}</button><button class="tertiary mini" onclick="abandonTicket()">✕ Exit</button></div></div>${r.phase==='failed'?`<div class=\"introbox\"><h2>💔 Out of lives</h2><p>Retry the ticket, or continue in Normal Mode.</p><div class=\"btnrow\"><button class=\"secondary\" onclick=\"retryRun()\" ${r.retriesLeft<=0?'disabled':''}>↻ Retry (${r.retriesLeft})</button><button class=\"primary\" onclick=\"retryNormal()\">Normal Mode</button></div></div>`:r.phase==='claim'?`<div class="introbox"><div class="introart">🏆</div><h2>Order complete!</h2><div class="value-hero" style="max-width:370px"><div class="caption">Pending Coins</div><div class="number">🪙 ${fmt(r.pool)}</div></div><p>${r.chests.length} treasure chest${r.chests.length===1?'':'s'} waiting!</p><button class="primary" onclick="prizeItems()">🎁 Collect Coins & Open Chests</button></div>`:`<iframe id="worksheetFrame" class="worksheet-frame" title="Interactive long multiplication worksheet" sandbox="allow-scripts allow-same-origin"></iframe><div class="tutorial-step" id="bridgeStatus">${g.tutorialArrows?'Follow the animated arrows in the worksheet.':'Connect digits and solve at your own pace.'}</div>`}<div class="worksheet-prize" id="prizejar"><div><small>🏆 PENDING PRIZE POOL</small><div><strong id="pendingCoins">🪙 ${fmt(r.pool)}</strong> &nbsp; <strong id="pendingChests">🎁 ${r.chests.length}</strong></div></div><div><small>Temporary Luck</small><strong id="pendingLuck">✦ ${r.luck}</strong></div></div></main>`}
function handleWorksheetMessage(ev){const frame=$('worksheetFrame');if(!frame||ev.source!==frame.contentWindow||!ev.data||ev.data.source!=='pq-worksheet')return;const m=ev.data,r=g.run;if(!r)return;
 if(m.type==='ready'){sendEngine('start',{ticket:r.ticket});sendEngine('sound',{enabled:g.sound,volume:1});sendEngine('tutorial',{enabled:g.tutorialArrows});return}
 if(m.type==='started'){r.bridgeDone=0;r.bridgeSig='';return}
 if(m.type==='height'){let el=$('worksheetFrame');if(el)el.style.height= Math.max(570,Math.min(1030,Number(m.height||680)+12))+'px';return}
 if(m.type==='state'){
  if(r.phase!=='engine')return;
  const sig=[m.step,m.done,m.row,m.phase,m.errors,m.carryUp,m.carryDown].join('/');
  if(sig===r.bridgeSig)return;
  const old=r.bridgePrev||{};r.bridgeSig=sig;
  if(m.errors>Number(old.errors||0)){r.mistakes+=m.errors-Number(old.errors||0);g.learning.mistakes+=m.errors-Number(old.errors||0);if(r.mode==='survival'){r.livesLeft=Math.max(0,g.lives-Math.floor(r.mistakes/2));if(r.livesLeft===0){r.phase='failed';save();render();toast('Survival challenge ended. You can retry.');return;}}}
  if(m.done>r.bridgeDone){for(let i=r.bridgeDone;i<m.done;i++){const last=i===r.steps.length-1,step=r.steps[i]||r.steps.at(-1);const chance=clamp(.12+r.luck*.013+step.row*.03,.06,.83);if(Math.random()<chance||(last&&!r.chests.length)){const grade=rollChestRarity(r.ticket.rarity);r.chests.push({rarity:grade});r.luck=Math.round(r.luck*.3);toast(`${RARITIES[grade]} chest discovered! 🎁`)}}r.bridgeDone=m.done;r.correct+=Math.max(0,m.done-Number(old.done||0))*2;earnCoin(1.2,1);}
  else if(m.step!==old.step || m.carryUp>Number(old.carryUp||0)||m.carryDown>Number(old.carryDown||0)){
   earnCoin(m.carryUp>Number(old.carryUp||0)||m.carryDown>Number(old.carryDown||0)?1.2:.65,m.carryUp>Number(old.carryUp||0)||m.carryDown>Number(old.carryDown||0)?2:1);
  }
  if(m.bestCombo>r.bestStreak)r.bestStreak=m.bestCombo;
  r.bridgePrev={...m};r.index=Math.min(r.steps.length-1,m.done||0);
  const pc=$('pendingCoins'),pl=$('pendingLuck'),ph=$('pendingChests');if(pc)pc.textContent='🪙 '+fmt(r.pool);if(pl)pl.textContent='✦ '+r.luck;if(ph)ph.textContent='🎁 '+r.chests.length;
  const st=$('bridgeStatus');if(st)st.textContent=g.tutorialArrows?'Use the animated arrow for the next action.':'Tutorial arrows are off. Keep solving!';
  save();return;
 }
 if(m.type==='complete'){
  if(r.phase!=='engine')return;
  if(!r.chests.length)r.chests.push({rarity:rollChestRarity(r.ticket.rarity)});
  r.correct+=1;finishSum();
 }
}
window.addEventListener('message',handleWorksheetMessage);
