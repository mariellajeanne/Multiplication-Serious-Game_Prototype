function themeLevel(){return g.decor}
function renderBakery(){return ''}
function renderLeft(){
 const links=[['🥣','Kitchen','openKitchen()',2],['🌷','Decor','openDecor()',4],['👩‍🍳','Helper','openStaff()',6],['🎮','Modes','openModes()',3]];
 return `<aside class="leftcol"><nav class="bakery-nav" aria-label="Bakery tools">${links.filter(x=>g.completed>=x[3]).map(([icon,label,fn])=>`<button onclick="${fn}"><span aria-hidden="true">${icon}</span>${label}${fn==='openIndex()'?`<small>${g.discovered.length}/${FOOD.length}</small>`:''}</button>`).join('')}<button onclick="showTutorial()"><span aria-hidden="true">☝</span>Guide</button></nav></aside>`;
}
const presentedTicketIds=new Set();
function renderTickets(){return `<section class="ticket-board"><h2 class="order-heading">🎟 Order Tickets</h2>${luckProgress()}<div class="tickets">${g.board.map((t,i)=>{
 const arriving=!g.run&&!presentedTicketIds.has(t.id);if(!g.run)presentedTicketIds.add(t.id);
 const food=orderFood(t),coins=Math.round(t.base*bakeryValue()*modeMultiple());
 return `<button class="ticket r${t.rarity} ${arriving?'ticket-arriving':''} ${g.completed===0&&i===0&&g.tutorialArrows?'first-order':''}" ${g.run?'disabled':''} onclick="startTicket(${t.id})" aria-label="${RARITIES[t.rarity]} order, ${orderStory(t)}, ${coins} base coins"><div class="ticket-top"><div class="ticket-reward"><strong>🪙 ${fmt(coins)}</strong><small>×${(bakeryValue()*modeMultiple()).toFixed(2)}${g.mode==='normal'||g.mode==='lookup'?'':` · ${infoMode().name} bonus`}</small></div><span class="rarity-title">✦ ${RARITIES[t.rarity]}</span></div><div class="ticket-order">${foodArt(food.id)}<div><strong class="order-food">${food.name}</strong><span class="eq">${t.a} × ${t.b} ${trayArt()}</span></div></div></button>`;
 }).join('')}</div></section>`}
function renderModePanel(){return ''}
function renderRight(){return `<aside class="rightcol">${renderTickets()}</aside>`}
