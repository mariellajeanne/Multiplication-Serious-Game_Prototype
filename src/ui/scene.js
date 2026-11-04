/* Frame 11 bakery progression and independent ticket sessions. */
let oddsCollapsed=null;
function ticketOddsCollapsed(){return oddsCollapsed??(typeof innerWidth!=='undefined'&&innerWidth<1500)}
function toggleTicketOdds(){oddsCollapsed=!ticketOddsCollapsed();render()}
function bakeryUpgradeName(index){return BAKERY_STAGES[Math.min(BAKERY_STAGES.length-1,Math.floor((index-1)/10))]}
function bakeryGainLabel(value){return powerLabel(Number(value.toPrecision(12)))}
function bakeryProgressRows(){
 const current=g.bakeryLevel,last=BAKERY_POWER_CONFIG.purchases+1;
 return [current-1,current,current+1,current+2].filter(n=>n>=1&&n<=last).map(index=>{
  const status=index<current?'unlocked':index===current?'current':index===current+1?'next':'locked';
  return {index,status,name:status==='locked'?'???':bakeryUpgradeName(index),gain:status==='locked'?null:index===1?bakeryFactor(1):bakeryFactor(index)-bakeryFactor(index-1)};
 });
}
function revealCurrentBakery(){
 const list=$('bakeryProgressList'),current=list?.querySelector('[aria-current="step"]');
 if(list&&current)list.scrollTop=Math.max(0,current.offsetTop-(list.clientHeight-current.offsetHeight)/2);
}
function showBakeryPowerInfo(){showModal('Bakery Power 👑','<p class="bakery-power-help">Boosts the coins you earn from every order!</p>','hud-info-modal')}
function renderBakery(){
 const next=g.bakeryLevel<=BAKERY_POWER_CONFIG.purchases,cost=next?bakeryUpgradeCost():null;
 const gain=next?bakeryFactor(g.bakeryLevel+1)-decorBonus():null;
 return `<section class="bakery-power" aria-label="Bakery Power"><button class="bakery-power-value" onclick="showBakeryPowerInfo()" aria-label="About Bakery Power" aria-haspopup="dialog">×${powerLabel(decorBonus())} 👑</button><h2 class="bakery-power-heading">BAKERY POWER <button class="text-button" onclick="showBakeryPowerInfo()" aria-label="About Bakery Power" aria-haspopup="dialog">ⓘ</button></h2><figure class="current-bakery-preview">${bakeryIcon('bakery')}<figcaption>${bakeryUpgradeName(g.bakeryLevel)}</figcaption></figure><div class="bakery-progress-list" id="bakeryProgressList" role="list" tabindex="0" aria-label="Bakery progression">${bakeryProgressRows().map(row=>`<article class="bakery-row ${row.status}" data-upgrade="${row.index}" role="listitem" ${row.status==='current'?'aria-current="step"':''}><div class="bakery-row-copy"><strong>${row.name}</strong><div class="bakery-row-status"><b>${row.status==='locked'?'UNLOCK PREVIOUS':row.status.toUpperCase()}</b>${row.status==='next'?`<span class="bakery-unlock-price">${amountLabel(cost)} 🪙</span>`:''}</div></div><strong class="bakery-row-gain">${row.gain===null?'+???':`+${bakeryGainLabel(row.gain)} 👑`}</strong></article>`).join('')}</div><div class="bakery-upgrade-action"><button class="primary bakery-power-buy" ${!next||g.coins<cost?'disabled':''} onclick="upgradeDecor()">${next?`<span>UPGRADE +${bakeryGainLabel(gain)} 👑</span><span>${amountLabel(cost)} 🪙</span>`:'UPGRADE'}</button></div></section>`;
}
function possiblePackageReward(){
 const odds=ticketProbabilities(g.mastery);
 return [...PACKAGE_SHOP].reverse().find(type=>odds[type.rank]>0)||PACKAGE_SHOP[0];
}
function renderPackagePanel(){
 const unopened=g.packages.reduce((sum,count)=>sum+count,0),reward=possiblePackageReward();
 return `<section class="package-panel" aria-label="Packages"><header class="package-counter"><span aria-hidden="true">${packageArt()}</span><h2>PACKAGE COUNTER</h2><strong id="unopenedPackages" title="${fmt(unopened)} unopened packages">${amountLabel(unopened)}</strong></header><div class="package-possible"><div class="package-illustration" aria-hidden="true">${packageArt()}</div><div class="package-possible-copy"><p>POSSIBLE REWARD</p><strong>${reward.rank+1}★ ${reward.name.toUpperCase()}</strong></div></div><div class="package-panel-action"><button class="primary" onclick="openPackages('buy')">BUY PACKAGES!</button></div></section>`;
}
function renderLeft(){return `<aside class="leftcol">${renderBakery()}${renderPackagePanel()}</aside>`}
const presentedTicketIds=new Set();
function highlightOrderFood(id){for(const card of document.querySelectorAll?.('.menu-grid [data-uid]')||[]){const food=g.owned.find(o=>o.uid===Number(card.dataset.uid));card.classList.toggle('order-highlight',food?.id===id)}}
function ticketProgress(ticket){const r=g.orderRuns[ticket.id];if(!r)return 0;if(r.phase==='claim')return 100;const actions=Object.keys(r.worksheetRewards?.actions||{}).length,total=r.steps.reduce((n,s)=>n+worksheetActionKinds(s).length,1);return Math.min(99,Math.round(actions/total*100))}
function renderTicketOdds(){
 const odds=ticketProbabilities(g.mastery),collapsed=ticketOddsCollapsed();
 return `<section class="ticket-odds"><div class="odds-heading"><b>🍀 ${g.permanentLuck} Ticket Luck</b><button class="text-button" onclick="openProbabilities()" aria-label="About Ticket Luck">ⓘ</button><button class="secondary" aria-expanded="${!collapsed}" aria-controls="ticketOddsChart" onclick="toggleTicketOdds()">${collapsed?'Odds':'Hide'}</button></div>${collapsed?'':`<h3>Ticket Package Odds</h3><p>Package types on new tickets</p><div class="package-odds-chart" id="ticketOddsChart" role="img" aria-label="${odds.map((p,i)=>`${PACKAGE_TYPES[i]} ${(p*100).toPrecision(6)} percent`).join(', ')}">${odds.map((p,i)=>`<div class="odds-column p${i}"><b>${PACKAGE_TYPES[i]}</b><span style="--chance:${p*100}%"></span><small>${probabilityLabel(p).replace('<','&lt;')}</small></div>`).join('')}</div>`}</section>`;
}
function renderTickets(){
 const seconds=Math.ceil(refreshRemaining()/1000);
 return `<section class="ticket-board"><div class="ticket-board-heading"><h2>${bakeryIcon('ticket')} Order Tickets</h2><button class="secondary" onclick="openIndex()" aria-label="Food Index">Index</button></div>${g.completed===0?'<p class="first-order-prompt">Choose an order to bake and earn coins.</p>':''}<div class="refresh-controls"><button class="secondary order-refresh" id="refreshOrders" onclick="refreshOrders()" ${seconds?'disabled':''}>${seconds?`Refresh in ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:'Refresh Orders'}</button>${seconds?`<button class="secondary" onclick="requestRefreshSkip()">Skip 🪙 ${amountLabel(refreshSkipCost())}</button>`:''}</div><div class="tickets" tabindex="0" aria-label="Available orders, scroll for more">${g.board.map(t=>{
 const r=g.orderRuns[t.id],food=orderFood(t),coins=r?.budget??Math.round(t.base*bakeryValue()*modeMultiple()),progress=ticketProgress(t),count=t.packages||1;
 const visible=!g.run||g.run.paused,arriving=visible&&!presentedTicketIds.has(t.id);if(visible)presentedTicketIds.add(t.id);
 return `<button class="ticket package-type p${t.rarity} ${arriving?'ticket-arriving':''}" onclick="startTicket(${t.id})" aria-label="${r?.phase==='claim'?'Collect rewards for':r?'Resume order':'Start order'} ${t.a} × ${t.b}, ${progress}% complete, ${count}+ free ${PACKAGE_TYPES[t.rarity]} packages"><span class="ticket-package"><b>${count}+ FREE</b>${packageArt()}<strong>${PACKAGE_TYPES[t.rarity]}</strong><small>Luck type</small></span><span class="ticket-math"><span>${foodArt(food.id)}<b>${food.name}</b></span><strong>${t.a} × ${t.b} ${trayArt()}</strong><span class="ticket-progress" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress}%"></span></span><span class="ticket-start">${r?.phase==='claim'?'Collect Rewards':r?'Resume Order':'Start Order'} <small>${progress}%</small></span><b>🪙 ${amountLabel(coins)} ${r?'saved reward':'base coins'}</b></span></button>`;
 }).join('')}</div>${renderTicketOdds()}</section>`;
}
function renderModePanel(){return ''}
function renderRight(){return `<aside class="rightcol">${renderTickets()}</aside>`}
function updateTicketProgress(){for(const t of g.board){const button=document.querySelector?.(`.ticket[onclick="startTicket(${t.id})"]`),bar=button?.querySelector('[role="progressbar"]');if(bar){const p=ticketProgress(t);bar.setAttribute('aria-valuenow',String(p));bar.firstElementChild.style.width=p+'%'}}}
