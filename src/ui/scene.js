/* Frame 11 bakery progression and independent ticket sessions. */
let bakeryBrowseIndex=null,oddsCollapsed=null,powerChange=null;
function ticketOddsCollapsed(){return oddsCollapsed??(typeof innerWidth!=='undefined'&&innerWidth<1500)}
function toggleTicketOdds(){oddsCollapsed=!ticketOddsCollapsed();render()}
function bakeryUpgradeName(index){return BAKERY_STAGES[Math.min(BAKERY_STAGES.length-1,Math.floor((index-1)/10))]}
function browseBakery(delta){const count=Math.min(BAKERY_POWER_CONFIG.purchases+1,g.bakeryLevel+1);bakeryBrowseIndex=((bakeryBrowseIndex??g.bakeryLevel)-1+delta+count)%count+1;centerBakeryCard()}
function centerBakeryCard(){const rail=$('bakeryCarousel'),card=rail?.querySelector(`[data-upgrade="${bakeryBrowseIndex??g.bakeryLevel}"]`);if(rail&&card)rail.scrollTo({left:card.offsetLeft-rail.clientWidth/2+card.clientWidth/2,behavior:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
function renderBakeryBar(){
 const current=g.bakeryLevel,next=current<=BAKERY_POWER_CONFIG.purchases,power=decorBonus(),goal=nextPackageUnlock(),afford=next&&g.coins>=bakeryUpgradeCost();
 const change=powerChange&&powerChange.until>Date.now()?`<span class="power-change" role="status"><b>×${powerLabel(powerChange.before)} → ×${powerLabel(powerChange.after)}</b>${powerChange.unlock?` · ${powerChange.unlock} packages unlocked!`:''}</span>`:'';
 return `<section class="bakery-bar ${afford?'can-upgrade':''}" aria-label="Bakery Power"><button class="bakery-bar-icon" onclick="openBakeryJourney()" aria-label="See our bakery journey">${bakeryIcon('bakery')}</button><div class="bakery-bar-text"><b>Bakery Power ×${powerLabel(power)} 👑</b><small>${change||(goal?`${goal.unlock-g.bakeryLevel} upgrades to ${goal.name} packages`:'Every package type unlocked!')}</small></div><button class="primary bakery-power-buy" ${!next||!afford?'disabled':''} onclick="upgradeDecor()">${next?`Upgrade · 🪙 ${amountLabel(bakeryUpgradeCost())}`:'Fully upgraded'}</button></section>`;
}
function openBakeryJourney(){
 const current=g.bakeryLevel,next=current<=BAKERY_POWER_CONFIG.purchases,power=decorBonus(),gain=next?bakeryFactor(current+1)-power:0;bakeryBrowseIndex=null;
 showModal('Our bakery journey',`<p class="dialog-note">Bakery Power multiplies your Menu Boost 💎. Each upgrade is permanent.</p><div class="bakery-carousel" id="bakeryCarousel" aria-label="Bakery upgrade history">${Array.from({length:current+(next?1:0)},(_,i)=>{const n=i+1,isCurrent=n===current,isNext=n===current+1;return `<article class="bakery-upgrade-card ${isCurrent?'current':isNext?'next':'acquired'}" data-upgrade="${n}"><span>${isNext?`+${powerLabel(gain)} 👑`:isCurrent?`×${powerLabel(power)} 👑`:'✓ Acquired'}</span>${bakeryIcon('bakery')}<strong>${bakeryUpgradeName(n)}</strong><b>${isCurrent?'CURRENT':isNext?'NEXT':'ACQUIRED'}</b></article>`}).join('')}</div>${renderPowerGoal()}`);
 setTimeout(centerBakeryCard,60);
}
function renderBakery(){
 const current=g.bakeryLevel,next=current<=BAKERY_POWER_CONFIG.purchases,power=decorBonus(),gain=next?bakeryFactor(current+1)-power:0;
 return `<section class="bakery-power"><h2>×${powerLabel(power)} 👑<br>BAKERY POWER</h2>${powerChange&&powerChange.until>Date.now()?`<div class="power-change" role="status"><b>×${powerLabel(powerChange.before)} → ×${powerLabel(powerChange.after)}</b><span>Baker's Boost +${((powerChange.after/powerChange.before-1)*100).toFixed(1)}%</span>${powerChange.unlock?`<b>${powerChange.unlock} packages unlocked!</b>`:""}</div>`:''}<p>Multiplies your <b>Menu Boost 💎</b></p><div class="carousel-controls"><button class="secondary" onclick="browseBakery(-1)" aria-label="Previous bakery">‹</button><span>Our bakery journey</span><button class="secondary" onclick="browseBakery(1)" aria-label="Next bakery">›</button></div><div class="bakery-carousel" id="bakeryCarousel" aria-label="Bakery upgrade history">${Array.from({length:current+(next?1:0)},(_,i)=>{const n=i+1,isCurrent=n===current,isNext=n===current+1;return `<article class="bakery-upgrade-card ${isCurrent?'current':isNext?'next':'acquired'}" data-upgrade="${n}"><span>${isNext?`+${powerLabel(gain)} 👑`:isCurrent?`×${powerLabel(power)} 👑`:'✓ Acquired'}</span>${bakeryIcon('bakery')}<strong>${bakeryUpgradeName(n)}</strong><b>${isCurrent?'CURRENT':isNext?'NEXT':'ACQUIRED'}</b></article>`}).join('')}</div><button class="primary bakery-power-buy" ${!next||g.coins<bakeryUpgradeCost()?'disabled':''} onclick="upgradeDecor()">${next?`Upgrade +${((BAKERY_POWER_CONFIG.factor-1)*100).toFixed(1)}% · 🪙 ${amountLabel(bakeryUpgradeCost())}`:'Your bakery is flourishing!'}</button>${renderPowerGoal()}</section>`;
}
function renderHud(){
 return `<header class="topbar hud"><div class="brand"><span class="brandlogo" aria-hidden="true">${bakeryIcon('bakery')}</span><h1>My Panaderya</h1></div><button class="hud-boost" onclick="showBoostInfo()" aria-label="Baker's Boost ${bakeryValue().toFixed(2)}. Tap to see how it is made."><small>Baker's Boost</small><strong>×${multiplierLabel(bakeryValue())} 💎</strong></button><div class="hud-coins" aria-label="Coin balance"><strong id="walletCoins" title="${fmt(g.coins)} coins">${amountLabel(g.coins)}</strong><span aria-hidden="true">🪙</span></div><nav class="hud-actions" aria-label="Bakery"><button class="hud-btn hud-packages" onclick="openPackages()"><span aria-hidden="true">📦</span>Packages</button><button class="hud-btn" onclick="openIndex()"><span aria-hidden="true">📖</span>Index</button><button class="hud-btn hud-icon" onclick="openSettings()" aria-label="Settings">${bakeryIcon('settings')}</button></nav></header>`;
}
function renderLeft(){return ''}
const presentedTicketIds=new Set();
function highlightOrderFood(id){for(const card of document.querySelectorAll?.('.menu-grid [data-uid]')||[]){const food=g.owned.find(o=>o.uid===Number(card.dataset.uid));card.classList.toggle('order-highlight',food?.id===id)}}
function ticketProgress(ticket){const r=g.orderRuns[ticket.id];if(!r)return 0;if(r.phase==='claim')return 100;const actions=Object.keys(r.worksheetRewards?.actions||{}).length,total=r.steps.reduce((n,s)=>n+worksheetActionKinds(s).length,1);return Math.min(99,Math.round(actions/total*100))}
function renderTicketOdds(){
 return `<section class="ticket-odds"><button class="luck-chip" onclick="openProbabilities()" aria-label="Ticket Luck ${g.permanentLuck}. See package odds."><span aria-hidden="true">🍀</span><b>${g.permanentLuck}</b> Ticket Luck <span class="luck-info" aria-hidden="true">ⓘ</span></button></section>`;
}
function renderTickets(){
 const seconds=Math.ceil(refreshRemaining()/1000);
 return `<section class="ticket-board"><div class="ticket-board-heading"><h2>${bakeryIcon('ticket')} Orders</h2><div class="refresh-controls"><button class="secondary order-refresh" id="refreshOrders" onclick="refreshOrders()" ${seconds?'disabled':''}>${seconds?`Refresh in ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:'Refresh Orders'}</button>${seconds?`<button class="secondary refresh-skip" onclick="requestRefreshSkip()" aria-label="Skip the wait for ${amountLabel(refreshSkipCost())} coins">Skip 🪙 ${amountLabel(refreshSkipCost())}</button>`:''}</div></div><div class="tickets" tabindex="0" aria-label="Available orders, scroll for more">${g.board.map((t,idx)=>{
 const r=g.orderRuns[t.id],food=orderFood(t),coins=r?.budget??Math.round(t.base*bakeryValue()*modeMultiple()),progress=ticketProgress(t),count=t.packages||1;
 const visible=!g.run||g.run.paused,arriving=visible&&!presentedTicketIds.has(t.id);if(visible)presentedTicketIds.add(t.id);
 const label=r?.phase==='claim'?'Collect Rewards':r?'Resume Order':'Start Order';
 return `<button class="ticket package-type p${t.rarity} ${arriving?'ticket-arriving':''} ${g.completed===0&&idx===0?'ticket-first':''}" onclick="startTicket(${t.id})" aria-label="${label}: ${t.a} × ${t.b}, ${progress}% complete, ${count}+ free ${PACKAGE_TYPES[t.rarity]} packages"><span class="ticket-top"><span class="ticket-food">${foodArt(food.id)}<b>${food.name}</b></span><span class="ticket-package"><span class="ticket-pkg-art">${packageArt()}</span><b>${count}+ ${PACKAGE_TYPES[t.rarity]}</b></span></span><strong class="ticket-sum">${t.a} × ${t.b} ${trayArt()}</strong><span class="ticket-progress" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress}%"></span></span><span class="ticket-foot"><b class="ticket-coins">🪙 ${amountLabel(coins)}</b><span class="ticket-start">${r?.phase==='claim'?'Collect':r?`Resume ${progress}%`:'Start'} ▶</span></span></button>`;
 }).join('')}</div>${renderTicketOdds()}</section>`;
}
function renderModePanel(){return ''}
function renderRight(){return `<aside class="rightcol">${renderTickets()}</aside>`}
function updateTicketProgress(){for(const t of g.board){const button=document.querySelector?.(`.ticket[onclick="startTicket(${t.id})"]`),bar=button?.querySelector('[role="progressbar"]');if(bar){const p=ticketProgress(t);bar.setAttribute('aria-valuenow',String(p));bar.firstElementChild.style.width=p+'%'}}}

function renderPowerGoal(){
 const next=nextPackageUnlock();
 return next?`<button class="power-goal text-button" onclick="showPackageUnlock(${next.rank})"><b>${next.name} packages</b><span>${next.unlock-g.bakeryLevel} Power upgrades away</span></button>`:'<p class="power-goal">Every package type is unlocked!</p>';
}
