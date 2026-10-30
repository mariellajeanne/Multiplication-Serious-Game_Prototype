function themeLevel(){return g.decor}
function renderBakery(){
 const level=g.decor+1,stages=['Freshly opened','Cozy bakery','Blooming bakery','Golden bakery','Grand panaderya'];
 const milestones=[2,3,5,7,10,13,17,21,25,30];
 return `<section class="bakery-progression" aria-label="Bakery and decor progression" data-bakery-level="${level}"><div class="bakery-vignette" aria-hidden="true">${bakeryIcon('bakery')}</div><div class="bakery-progress-info"><small>MY LITTLE PANADERYA</small><h2>${stages[g.decor]}</h2><div class="bakery-level"><b>Bakery Lv. ${level}</b><span>Bakery bonus +${Math.round((decorBonus()-1)*100)}%</span></div><div class="bakery-roadmap" aria-label="Milestone preview: levels ${milestones.join(', ')}">${milestones.map(n=>`<span class="${n<=level?'reached':''}" title="Level ${n} milestone">${n}</span>`).join('')}</div><small class="roadmap-caption">30-level milestone preview</small></div><button class="secondary bakery-upgrade" onclick="openDecor()" ${g.completed<4?'disabled':''}>${g.completed<4?'🔒 4 orders':g.decor>=4?'View decor':`Upgrade Bakery <span>🪙 ${fmt(decorCosts[g.decor])}</span>`}</button></section>`;
}
function renderLeft(){
 const links=[['kitchen','Kitchen','openKitchen()',2],['decor','Decor','openDecor()',4],['helper','Helper','openStaff()',6],['modes','Modes','openModes()',3]];
 return `<aside class="leftcol"><nav class="bakery-nav" aria-label="Bakery tools">${links.filter(x=>g.completed>=x[3]).map(([icon,label,fn])=>`<button onclick="${fn}"><span aria-hidden="true">${bakeryIcon(icon)}</span>${label}${fn==='openIndex()'?`<small>${g.discovered.length}/${FOOD.length}</small>`:''}</button>`).join('')}<button onclick="showTutorial()"><span aria-hidden="true">${bakeryIcon('guide')}</span>Guide</button></nav></aside>`;
}
const presentedTicketIds=new Set();
function highlightOrderFood(id){
 for(const card of document.querySelectorAll?.('.menu-grid [data-uid]')||[]){const food=g.owned.find(o=>o.uid===Number(card.dataset.uid));card.classList.toggle('order-highlight',food?.id===id)}
}
function renderTickets(){return `<section class="ticket-board"><h2 class="order-heading">${bakeryIcon('ticket')} Order Tickets</h2>${luckProgress()}<div class="tickets">${g.board.map((t,i)=>{
 const arriving=!g.run&&!presentedTicketIds.has(t.id);if(!g.run)presentedTicketIds.add(t.id);
 const food=orderFood(t),coins=Math.round(t.base*bakeryValue()*modeMultiple());
 return `<button class="ticket r${t.rarity} ${arriving?'ticket-arriving':''} ${g.completed===0&&i===0&&g.tutorialArrows?'first-order':''}" ${g.run?'disabled':''} onclick="startTicket(${t.id})" onpointerenter="highlightOrderFood('${food.id}')" onpointerleave="highlightOrderFood(null)" onfocus="highlightOrderFood('${food.id}')" onblur="highlightOrderFood(null)" aria-label="${RARITIES[t.rarity]} order, ${orderStory(t)}, ${coins} base coins"><span class="slip-kicker">BAKERY ORDER</span><div class="ticket-top"><div class="ticket-reward"><strong>🪙 ${fmt(coins)}</strong><small>×${(bakeryValue()*modeMultiple()).toFixed(2)}${g.mode==='normal'||g.mode==='lookup'?'':` · ${infoMode().name} bonus`}</small></div><span class="rarity-title">✦ ${RARITIES[t.rarity]}</span></div><div class="ticket-order">${foodArt(food.id)}<div><strong class="order-food">${food.name}</strong><span class="eq">${t.a} × ${t.b} ${trayArt()}</span></div></div></button>`;
 }).join('')}</div></section>`}
function renderModePanel(){return ''}
function renderRight(){return `<aside class="rightcol">${renderTickets()}</aside>`}
