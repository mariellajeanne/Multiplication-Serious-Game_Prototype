/* Panaderya Quest — src/game/worksheet-bridge.js
 * Modularized from the original playable prototype.
 * Loaded as classic scripts in index.html, in dependency order.
 */
function sendEngine(type,data={}){const fr=$('worksheetFrame');if(fr?.contentWindow)fr.contentWindow.postMessage({source:'bc-shell',type,...data},'*')}
function worksheetGuideLabel(){return `${bakeryIcon('guide')}<span>Guide ${g.tutorialArrows?'ON':'OFF'}</span>`}
function worksheetSoundLabel(){return `${bakeryIcon(g.sound?'sound':'mute')}<span>Sound ${g.sound?'ON':'OFF'}</span>`}
function toggleArrows(){g.tutorialArrows=!g.tutorialArrows;save();sendEngine('tutorial',{enabled:g.tutorialArrows});const b=$('arrowToggle');if(b){b.innerHTML=worksheetGuideLabel();b.setAttribute('aria-pressed',String(g.tutorialArrows))}}
function toggleSfx(){g.sound=!g.sound;save();sendEngine('sound',{enabled:g.sound,volume:1});const b=$('sfxToggle');if(b){b.innerHTML=worksheetSoundLabel();b.setAttribute('aria-pressed',String(g.sound))}}

function renderWorksheet(){
 const r=g.run,food=orderFood(r.ticket),claim=r.phase==='claim',failed=r.phase==='failed';
 return `<main class="worksheet-stage ${claim?'order-complete':''}"><div class="worksheet-toolbar"><div class="worksheet-controls"><button id="arrowToggle" aria-pressed="${g.tutorialArrows}" class="secondary" onclick="toggleArrows()">${worksheetGuideLabel()}</button><button id="sfxToggle" aria-pressed="${g.sound}" class="secondary" onclick="toggleSfx()">${worksheetSoundLabel()}</button></div><button class="worksheet-exit" onclick="${claim?'prizeItems()':'abandonTicket()'}">${claim?'Collect':'✕ Exit'}</button></div><div class="worksheet-order">${foodArt(food.id)}<div><h2>${food.name}</h2><div class="order-equation">${r.ticket.a} × ${r.ticket.b} ${trayArt()}</div><small>${r.ticket.b} trays · ${r.ticket.a} each</small></div></div>${renderChestLuck(r)}<div class="reward-shelf" aria-hidden="true"></div>${failed?`<div class="claim-screen"><h2>Let's try again</h2><div class="btnrow"><button class="secondary" onclick="retryRun()" ${r.retriesLeft<=0?'disabled':''}>Retry (${r.retriesLeft})</button><button class="primary" onclick="retryNormal()">Play Normal</button></div></div>`:claim?`<section class="claim-screen" role="region" aria-label="Completed order" aria-live="polite"><div class="claim-art">📦</div><h2>Order ready!</h2><p><strong>${fmt(r.ticket.a*r.ticket.b)} ${food.name}</strong> for your customer</p><div class="claim-coins">🪙 ${fmt(r.pool)}</div><p>${r.chests.length} package${r.chests.length===1?'':'s'} to open</p><button class="primary" onclick="prizeItems()">Collect & open packages</button><small class="claim-saved">Your prize is saved until you collect it.</small></section>`:`<iframe id="worksheetFrame" class="worksheet-frame" title="Work out your customer's order" sandbox="allow-scripts allow-same-origin"></iframe><span id="bridgeStatus" hidden></span>${r.mode==='lookup'?`<details class="lookup-aid"><summary>🔢 Multiplication facts</summary><div class="lookup">${Array.from({length:81},(_,i)=>`<div>${Math.floor(i/9)+1}×${i%9+1}=${(Math.floor(i/9)+1)*(i%9+1)}</div>`).join('')}</div></details>`:''}`}${renderPrizeDock(r)}</main>`;
}
function renderChestLuck(r){
 const row=r.steps[Math.min(r.index,r.steps.length-1)]?.row||0,chance=Math.round(clamp(.12+r.luck*.013+row*.03,.06,.83)*100);
 return `<div class="chest-luck-top" aria-label="Temporary Package Luck"><span class="package-luck-icon">${packageArt()}</span><div class="package-luck-copy"><div><span>Package Luck</span><strong id="pendingLuck">+${r.luck}</strong><div class="progress"><div id="chestChanceBar" class="bar" style="width:${chance}%"></div></div></div><small id="chestChance">This order · ${chance}% next pair · 1+ package guaranteed</small></div></div>`;
}
function renderPrizeDock(r){return `<div class="worksheet-prize" id="prizejar" aria-label="Order prize pool"><div class="pool-totals"><div class="pool-coins"><small>YOUR ORDER PRIZE</small><strong id="pendingCoins">🪙 ${fmt(r.pool)}</strong></div><div class="pool-chests"><span aria-hidden="true">${packageArt()}</span><div><strong id="pendingChests">${r.chests.length}</strong><small>packages</small></div><div class="chest-tokens" id="chestTokens">${renderChestTokens(r.chests)}</div></div></div></div>`}
function renderChestTokens(chests){return chests.slice(-4).map(c=>`<span class="chest-token r${c.rarity}" title="${RARITIES[c.rarity]} package">${packageArt()}</span>`).join('')}
function fitWorksheet(){
 if(!g.run||g.run.phase!=='engine'||typeof document.querySelector!=='function'||typeof innerWidth==='undefined')return;
 const stage=document.querySelector('.worksheet-stage');if(!stage)return;
 if(typeof syncRewardPresentation==='function')syncRewardPresentation();
 const cols=String(g.run.ticket.a*g.run.ticket.b).length,rows=String(g.run.ticket.b).length;
 const gap=innerWidth<560?5:8,gutter=innerWidth<560?46:80,mathPadding=innerWidth<560?42:58;
 const maxWidth=innerWidth-24;
 stage.style.setProperty('--workspace-width',Math.min(maxWidth,1000)+'px');
 const margins=el=>{const st=getComputedStyle(el);return parseFloat(st.marginTop)+parseFloat(st.marginBottom)};
 const header=['.worksheet-toolbar','.worksheet-order'].map(selector=>stage.querySelector(selector)?.getBoundingClientRect()).filter(Boolean);
 const headerHeight=header.length?Math.max(...header.map(r=>r.bottom))-Math.min(...header.map(r=>r.top)):0;
 const chrome=headerHeight+['.chest-luck-top','.reward-shelf','#prizejar'].reduce((height,selector)=>{
  const el=stage.querySelector(selector);return height+(el?el.getBoundingClientRect().height+margins(el):0);
 },0);
 const style=getComputedStyle(stage),padding=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)+4;
 const available=innerHeight-stage.getBoundingClientRect().top-chrome-padding-64-40;
 const byHeight=Math.floor((available-50)/(rows+3.6));
 const byWidth=Math.floor((maxWidth-32-gutter*2-mathPadding-gap*(cols-1))/cols);
 const cell=Math.max(44,Math.min(148,byHeight,byWidth));
 const width=Math.min(maxWidth,Math.max(innerWidth<560?0:760,cols*cell+gap*(cols-1)+mathPadding+gutter*2+46));
 stage.style.setProperty('--workspace-width',width+'px');
 sendEngine('layout',{cell,gap,rows});
}
// Reward domain actions, never poll stages or increasing click/carry counters.
function applyWorksheetActions(r,actions){
 if(!Array.isArray(actions))return;
 const ledger=ensureWorksheetRewards(r);
 for(const action of actions){
  if(!action||!Number.isInteger(action.row)||!Number.isInteger(action.col))continue;
  const index=r.steps.findIndex(step=>step.row===action.row&&step.col===action.col);
  const step=r.steps[index];
  if(!step||!worksheetActionKinds(step).includes(action.kind))continue;
  const id=worksheetActionId(ledger.attemptId,step.row,step.col,action.kind);
  if(action.id!==id||ledger.actions[id])continue;
  // A combo is sealed only after all of its necessary placements/carries.
  if(action.kind==='combo'&&!worksheetActionKinds(step).filter(k=>k!=='combo')
   .every(k=>ledger.actions[worksheetActionId(ledger.attemptId,step.row,step.col,k)]))continue;
  ledger.actions[id]=true;
  r.index=index;
  if(action.kind==='combo'){
   const last=index===r.steps.length-1;
   const chance=clamp(.12+r.luck*.013+step.row*.03,.06,.83);
   if(Math.random()<chance||(last&&!r.chests.length)){
    const grade=rollChestRarity(r.ticket.rarity);r.chests.push({rarity:grade});
    r.luck=Math.round(r.luck*.3);
    if(typeof animateChestReward==='function')animateChestReward(grade,action.point);
   }
   r.bridgeDone=Math.max(r.bridgeDone||0,index+1);r.correct+=2;
  }
  const carry=action.kind==='carry-up'||action.kind==='carry-down';
  earnCoin(carry||action.kind==='combo'?1.2:.65,carry?2:1,{point:action.point});
 }
}
function updateWorksheetPool(){
 const r=g.run;if(!r)return;
 if(typeof paintRewardDock==='function'){
  if(!rewardFlightsPending())paintRewardDock(r);
  return;
 }
 const pc=$('pendingCoins'),pl=$('pendingLuck'),ph=$('pendingChests');
 if(pc)pc.textContent='🪙 '+fmt(r.pool);if(pl)pl.textContent='+'+r.luck;if(ph)ph.textContent=String(r.chests.length);
 const st=$('bridgeStatus');if(st)st.textContent=g.tutorialArrows?'Use the animated arrow for the next action.':'Tutorial arrows are off. Keep solving!';
}
function handleWorksheetMessage(ev){
 const frame=$('worksheetFrame');
 if(!frame||ev.source!==frame.contentWindow||!ev.data||ev.data.source!=='pq-worksheet')return;
 const m=ev.data,r=g.run;if(!r||r.phase!=='engine')return;
 const ledger=ensureWorksheetRewards(r);
 if(m.type==='ready'){
  // Duplicate ready notifications must not restart an already mounted document.
  if(frame.worksheetAttemptId===ledger.attemptId)return;
  frame.worksheetAttemptId=ledger.attemptId;
  save();sendEngine('start',{ticket:r.ticket,attemptId:ledger.attemptId});
  sendEngine('sound',{enabled:g.sound,volume:1});sendEngine('tutorial',{enabled:g.tutorialArrows});sendEngine('theme',{level:themeLevel()});fitWorksheet();return;
 }
 if(m.attemptId!==ledger.attemptId)return;
 if(m.type==='started'){
  if(frame.worksheetStarted)return;
  frame.worksheetStarted=true;r.bridgePrev={};r.bridgeSig='';return;
 }
 if(m.type==='height'){frame.style.height=Math.max(200,Math.min(1000,Number(m.height||460)+2))+'px';return;}
 if(m.type!=='state'&&m.type!=='complete')return;
 if(m.type==='complete'&&(m.ticket?.id!==r.ticket.id||m.top!==r.ticket.a||m.bottom!==r.ticket.b))return;
 if(m.type==='state'){
  if(m.surface)frame.worksheetSurface=m.surface;
  const old=r.bridgePrev||{};
  if(m.errors>Number(old.errors||0)){
   r.mistakes+=m.errors-Number(old.errors||0);g.learning.mistakes+=m.errors-Number(old.errors||0);
   if(r.mode==='survival'){
    r.livesLeft=Math.max(0,g.lives-Math.floor(r.mistakes/2));
    if(r.livesLeft===0){r.phase='failed';save();render();toast('Survival challenge ended. You can retry.');return;}
   }
  }
  if(m.bestCombo>r.bestStreak)r.bestStreak=m.bestCombo;
  r.bridgePrev={...m,errors:Math.max(Number(old.errors||0),Number(m.errors||0))};
 }
 applyWorksheetActions(r,m.actions);
 // A verified completed state is a second delivery path if the final event was lost.
 if(m.type==='complete'||m.complete===true){
  if(m.ticket?.id!==r.ticket.id||m.top!==r.ticket.a||m.bottom!==r.ticket.b)return;
  if(!r.steps.every(step=>ledger.actions[worksheetActionId(ledger.attemptId,step.row,step.col,'combo')]))return;
  const id=`${ledger.attemptId}/complete`;
  if(ledger.actions[id])return;
  ledger.actions[id]=true;
  sendEngine('completion-ack',{attemptId:ledger.attemptId});
  if(!r.chests.length)r.chests.push({rarity:rollChestRarity(r.ticket.rarity)});
  r.correct+=1;earnCoin(.65,1);finishSum();return;
 }
 updateWorksheetPool();save();
}
window.addEventListener('message',handleWorksheetMessage);
