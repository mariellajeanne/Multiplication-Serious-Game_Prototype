/*
 * My Panaderya — Illustrated functional UI demonstration
 * Real interactive DOM/image components: NO single-screen image hotspots.
 * Values, ticket numbers and simple answer input are DEMO state, not production gameplay.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const asset=(what,i)=>`assets/${what}-${String(i).padStart(2,'0')}.png`;
const fmt=n=>Math.round(n).toLocaleString('en-US');
const foods=[
 ['Pandesal',1.20,'common'],['Monay',1.45,'common'],['Mamon',1.75,'uncommon'],['Hopia Baboy',2.15,'uncommon'],
 ['Spanish Bread',2.40,'rare'],['Ensaymada',3.10,'rare'],['Strawberry Bun',3.70,'rare'],['Cheese Bun',4.10,'epic'],
 ['Hopia',4.90,'epic'],['Butter Mamon',5.55,'legendary'],['Cake Roll',6.20,'legendary'],['Ube Bun',7.40,'mythic'],
 ['Buko Pie',8.65,'epic'],['Yema Roll',9.80,'legendary'],['Butter Cake',11.60,'mythic'],['Special Ensaymada',14.00,'divine'],['Ube Ensaymada',17.80,'divine']
].map(([name,multiplier,rarity],i)=>({id:i+1,name,multiplier,rarity}));
const coins=[
 ['Coin Stack',20],['Coin Jar',55],['Coin Bag',160],['Coin Bucket',380],['Coin Cart',1000],
 ['Treasure Chest',3500],['Golden Vault',10000],['Divine Treasury',40000]
].map(([name,base],i)=>({id:i+1,name,base}));
const packs=[
 ['Starter Bag',300],['Bakery Box',750],['Sweet Box',1200],['Deluxe Box',1800],['Treat Package',2650],
 ['Pastry Bundle',3800],['Premium Crate',5200],["Baker's Chest",7800],['Grand Bakery Pack',12000]
].map(([name,cost],i)=>({id:i+1,name,cost}));
const defaultFoods=[1,6,3,5,9,12,13,14,17];
const state={coins:12750,owned:new Set(defaultFoods),equipped:[...defaultFoods],tickets:[],active:null,completed:0,modal:null};
let toastTimeout=null;
const glow={common:'#ffd083',uncommon:'#ffd891',rare:'#ffc45d',epic:'#e69bf9',legendary:'#ffe270',mythic:'#c78bff',divine:'#ff96e5'};
function boost(){return state.equipped.reduce((sum,id)=>sum+(foods[id-1]?.multiplier||0),0)||1;}
function fit(){const s=Math.min(innerWidth/2000,innerHeight/1200);$('stage').style.transform=`scale(${s})`;updateCabinetScrollbar();updateOrderScrollbar();}
function toast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),2300);}
function updateWallet(){// Real text over original illustrated coin meter.
 $('wallet-value').textContent=fmt(state.coins);
 $('boost-value').textContent=`×${boost().toFixed(2)}`;
 $('wallet-button').setAttribute('aria-label',`View ${fmt(state.coins)} coins`);
 $('boost-status').setAttribute('aria-label',`Baker's Boost ×${boost().toFixed(2)}; open collection`);
}
function cabinetGeometry(n){
 // The cabinet/header never move. The last row centers through flex layout.
 const available=$('cabinet-scroll').clientWidth-8;
 const columns=n===1?1:3;
 const cw=n===1?Math.min(400,available):Math.floor((available-20)/3);
 const ch=n===1?360:n<=3?276:n<=6?218:n<=9?143:180;
 return {columns,cw,ch};
}
function renderMenu(){
 const n=state.equipped.length,g=cabinetGeometry(Math.max(1,n));
 const grid=$('cabinet-grid'),sc=$('cabinet-scroll');
 grid.innerHTML='';grid.dataset.columns=String(g.columns);grid.style.setProperty('--cell-w',`${g.cw}px`);
 grid.classList.toggle('is-overflowing',n>9);
 state.equipped.forEach(id=>{
  const f=foods[id-1]; if(!f)return;
  const btn=document.createElement('button');btn.type='button';btn.className='food-cell';btn.style.width=`${g.cw}px`;btn.style.height=`${g.ch}px`;
  btn.style.setProperty('--glow',glow[f.rarity]);btn.dataset.rarity=f.rarity;btn.setAttribute('aria-label',`${f.name}, Baker's Boost multiplier ${f.multiplier.toFixed(2)}; view food`);
  btn.dataset.foodId=id;
  btn.innerHTML=`<span class="food-aura"></span><img class="food-image" src="${asset('food',id)}" alt="${f.name}" draggable="false"><img class="glass-cell-art" src="assets/glass-compartment.svg" alt="" draggable="false"><span class="cell-glare"></span><span class="food-multiplier"><img src="assets/bakers-sparkle.png" alt="" draggable="false">×${f.multiplier.toFixed(2)}</span>`;
  btn.addEventListener('click',()=>openFood(id));grid.appendChild(btn);
 });
 sc.scrollTop=0;updateWallet();requestAnimationFrame(updateCabinetScrollbar);
}
function syncScrollbar(sc,box,track,thumb){
 const max=Math.max(0,sc.scrollHeight-sc.clientHeight);
 box.classList.toggle('is-idle',max<2);
 box.setAttribute('aria-hidden',String(max<2));
 box.querySelectorAll('button,[role=scrollbar]').forEach(el=>el.tabIndex=max<2?-1:0);
 const size=Math.max(44,Math.min(track.clientHeight,track.clientHeight*sc.clientHeight/Math.max(1,sc.scrollHeight)));
 thumb.style.height=`${size}px`;
 thumb.style.top=`${max?Math.max(0,Math.min(1,sc.scrollTop/max))*(track.clientHeight-size):0}px`;
 thumb.setAttribute('aria-valuenow',String(max?Math.round(sc.scrollTop/max*100):0));
}
function updateCabinetScrollbar(){
 syncScrollbar($('cabinet-scroll'),$('cabinet-scrollbar'),$('cabinet-track'),$('cabinet-thumb'));
}
function seedOrders(){
 const ids=state.equipped.length?state.equipped:[1];
 const examples=[[23,14,3],[36,27,4],[58,32,6],[72,19,1],[41,26,5],[27,35,8],[64,12,2]];
 state.tickets=examples.map(([n,m,tier],i)=>({id:i+1+state.completed*1000,n,m,tier,food:ids[(i+1)%ids.length]}));
 renderTickets();
}
function renderTickets(){
 const list=$('order-items');list.innerHTML='';
 state.tickets.forEach(o=>{
  const f=foods[o.food-1]||foods[0],c=coins[o.tier-1];
  const ticket=document.createElement('button');ticket.type='button';ticket.className='order-ticket';
  ticket.setAttribute('aria-label',`${f.name}: ${o.n} foods times ${o.m} trays; reward ${c.name}`);
  ticket.dataset.orderId=o.id;
  ticket.innerHTML=`<span class="coin-hero"><img src="${asset('coin',c.id)}" alt="${c.name}" draggable="false"><small>${c.name}</small></span><span class="order-main"><span class="order-name">${f.name}</span><span class="ticket-reward">${fmt(Math.round(c.base*boost()))} coins</span><span class="order-math"><img class="food-symbol" src="${asset('food',f.id)}" alt="${f.name}" draggable="false"><span class="order-quantity">${o.n}</span><span class="times">×</span><img class="tray-symbol" src="assets/tray-icon.png" alt="tray" draggable="false"><span class="order-quantity">${o.m}</span></span></span><img class="ticket-play" src="assets/ticket-play-clean.png" alt="Play" draggable="false">`;
  ticket.addEventListener('click',()=>openOrder(o.id));list.appendChild(ticket);
 });
 document.querySelector('.nav-play').disabled=state.tickets.length===0;
 requestAnimationFrame(updateOrderScrollbar);
}
function updateOrderScrollbar(){
 syncScrollbar($('order-scroller'),$('board-scroll-rail'),$('board-scroll-track'),$('board-scroll-thumb'));
}
let returnFocus=null;
function setModal(key,html){
 if(!state.modal)returnFocus=document.activeElement;
 state.modal=key;
 const title=({packages:'Choose a Package',order:'Order Ticket',collection:'Menu Collection',complete:'Order Complete!',orders:'Bakery Orders',opened:'Package Opened!',food:'Food Details',odds:'Coin Rewards',wallet:'Bakery Coins',help:'How to Play',settings:'Settings',confirm:'Confirm Action'})[key]||key;
 $('modal-heading').src='assets/popup-heading.png';$('modal-heading').alt='';
 $('modal-title').textContent=title;
 $('modal-content').innerHTML=html;
 $('modal-overlay').hidden=false;
 // Reset after revealing: a hidden scroll box can retain its old offset.
 $('modal-content').scrollTop=0;
 $('modal').setAttribute('aria-label',title);
 [...$('stage').children].forEach(el=>{if(el.id!=='modal-overlay'&&el.id!=='toast')el.inert=true;});
 document.querySelectorAll('.bottom-nav [data-action]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.action===key||(el.dataset.action==='play'&&['order','orders','complete'].includes(key)))));
 requestAnimationFrame(()=>($('modal-content').querySelector('[autofocus]')||$('modal-close')).focus({preventScroll:true}));
}
function closeModal(){
 state.modal=null;$('modal-overlay').hidden=true;
 [...$('stage').children].forEach(el=>el.inert=false);
 document.querySelectorAll('.bottom-nav [aria-pressed]').forEach(el=>el.setAttribute('aria-pressed','false'));
 const target=returnFocus?.isConnected&&!returnFocus.disabled?returnFocus:document.querySelector('.nav-play:not(:disabled)')||$('settings-button');
 target.focus({preventScroll:true});
}
function packages(){
 setModal('packages',`<div class="package-grid">${packs.map(p=>`<div class="package-card"><img src="${asset('package',p.id)}" alt="${p.name}"><div class="package-info"><strong>${p.name}</strong><span class="price"><span class="coin-dot">●</span> ${fmt(p.cost)}</span><button type="button" class="buy-art" data-buy="${p.id}" aria-label="Buy ${p.name} for ${p.cost} coins" ${state.coins<p.cost?'disabled':''}><img src="assets/buy-button.png" alt="Buy"></button></div></div>`).join('')}</div><p class="scroll-info">Nine package tiers · food collectibles come only from opening packages</p>`);
}
function buyPackage(n){
 const p=packs[n-1];if(!p)return;
 if(state.coins<p.cost){toast('Not enough demo coins.');return;}
 state.coins-=p.cost;updateWallet();
 // Illustrative prize only. Real rarity odds and duplication belong to original production game.
 const pool=Math.min(17,Math.max(4,n*2));const id=1+Math.floor(Math.random()*pool);
 const f=foods[id-1],isNew=!state.owned.has(id);state.owned.add(id);
 setModal('opened',`<div class="detail-wrap"><img src="${asset('food',id)}" alt="${f.name}"><div><h3>${f.name}</h3><p class="card-rarity">${f.rarity.toUpperCase()}</p><p>${isNew?'New Filipino bakery food discovered!':'Duplicate collectible obtained!'}</p><p>✦ Baker's Boost ×${f.multiplier.toFixed(2)}</p><p class="muted">Equip owned foods in your collection to build Baker's Boost.</p></div></div><div class="modal-actions"><button class="art-action green" data-action="collection">View Collection</button><button class="art-action" data-action="packages">More Packages</button></div>`);
}
function collection(){
 setModal('collection',`<p style="text-align:center" class="muted">${state.equipped.length} equipped foods · Baker's Boost <strong>×${boost().toFixed(2)}</strong> · maximum 16 in this demo</p><div class="collection-grid">${foods.map(f=>{
  const own=state.owned.has(f.id),isEquipped=state.equipped.includes(f.id);
  return `<div class="collection-card ${own?'':'locked'}"><img src="${asset('food',f.id)}" alt="${f.name}"><strong>${f.name}</strong><small>✦ ×${f.multiplier.toFixed(2)}</small><button type="button" class="${isEquipped?'equipped':''}" data-equip="${f.id}" ${own?'':'disabled'}>${!own?'Locked':isEquipped?'Equipped ✓':'Equip'}</button></div>`;
 }).join('')}</div>`);
}
function toggleEquip(id){
 if(!state.owned.has(id))return;
 if(state.equipped.includes(id)){
  if(state.equipped.length===1){toast('Keep at least one menu food equipped.');return;}
  state.equipped=state.equipped.filter(x=>x!==id);
 }else{
  if(state.equipped.length>=16){toast('Maximum 16 equipped foods in this demo.');return;}
  state.equipped.push(id);
 }
 renderMenu();seedOrders();collection();
}
function openFood(id){const f=foods[id-1];setModal('food',`<div class="detail-wrap"><img src="${asset('food',id)}" alt="${f.name}"><div><h3>${f.name}</h3><p class="card-rarity">${f.rarity.toUpperCase()}</p><p class="big">✦ ×${f.multiplier.toFixed(2)}</p><p>This food contributes to your equipped menu's Baker's Boost.</p></div></div><div class="modal-actions"><button class="art-action primary" data-action="collection">Manage Collection</button><button class="art-action" data-action="close">Back to Bakery</button></div>`)}
function openOrders(){
 setModal('orders',`<div class="order-list-modal">${state.tickets.map(o=>{let f=foods[o.food-1],c=coins[o.tier-1];return `<div class="order-line"><img src="${asset('coin',o.tier)}" alt="${c.name}"><img class="food" src="${asset('food',o.food)}" alt="${f.name}"><div><strong>${f.name}</strong><div class="num">${o.n} × ${o.m}</div><small>${c.name}</small></div><button class="art-action primary" data-order="${o.id}">Play ▶</button></div>`}).join('')}</div><div class="modal-actions"><button class="art-action" data-action="refresh">Refresh Tickets</button><button class="art-action" data-action="odds">Reward Odds</button></div>`);
}
function openOrder(id){
 const o=state.tickets.find(x=>x.id===id);if(!o){openOrders();return;}state.active=id;
 const f=foods[o.food-1],c=coins[o.tier-1];
 setModal('order',`<div class="worksheet"><img class="dish" src="${asset('food',f.id)}" alt="${f.name}"><div><h3>${f.name} × Trays</h3><p class="muted">${o.n} on each tray · ${o.m} trays. How many altogether?</p><div class="problem">${o.n} × ${o.m} = ?</div><input id="answer" type="number" inputmode="numeric" placeholder="Answer" aria-label="Answer" autofocus><p id="answer-error" class="error-text" role="status"></p></div></div><div class="modal-actions"><button class="art-action green" data-solve="${o.id}">Complete Order</button><button class="art-action" data-action="orders">Back to Tickets</button></div>`);
}
function solveOrder(id){
 const o=state.tickets.find(x=>x.id===id);if(!o)return;
 const v=$('answer')?.value;if(v===''||Number(v)!==o.n*o.m){$('answer-error').textContent='Not quite! Check the multiplication and try again.';return;}
 const c=coins[o.tier-1],b=boost(),total=Math.round(c.base*b);state.coins+=total;state.completed++;state.tickets=state.tickets.filter(x=>x.id!==id);renderTickets();updateWallet();
 setModal('complete',`<div class="result-wrap"><img src="${asset('coin',o.tier)}" alt="${c.name}"><div><h3>${c.name}</h3><p>Order fulfilled!</p><div class="number">+${fmt(total)} coins</div><p class="muted">Foods can only come from packages.</p></div></div><div class="formula">${fmt(c.base)} Base Coins × ✦ ${b.toFixed(2)} Baker's Boost<br>= <strong>${fmt(total)} Coins Awarded</strong></div><div class="modal-actions"><button class="art-action primary" data-action="orders">Next Ticket</button><button class="art-action" data-action="close">Back to Bakery</button></div>`);
}
function rewardOdds(){setModal('odds',`<p style="text-align:center" class="muted">Illustrative coin-reward tiers and demo base values. Actual odds belong to the game logic.</p><div class="odds-grid">${coins.map(c=>`<div><img src="${asset('coin',c.id)}" alt="${c.name}"><strong>${c.name}</strong><span>${fmt(c.base)} base coins</span></div>`).join('')}</div>`)}
function wallet(){setModal('wallet',`<div class="result-wrap"><img src="${asset('coin',3)}" alt="Coins"><div><h3>Current Coin Balance</h3><div class="number">${fmt(state.coins)}</div><p>Complete math orders to earn coins; spend them on packages to discover foods.</p></div></div><div class="modal-actions"><button class="art-action primary" data-action="orders">Play Orders</button><button class="art-action" data-action="packages">Browse Packages</button></div>`)}
function help(){setModal('help',`<div class="check-list"><p><strong>1. Take bakery orders.</strong> Each ticket shows an equipped Filipino food, the number ordered, the number of trays, and a prominently displayed coin reward container.</p><p><strong>2. Solve multiplication.</strong> The demonstration uses a basic answer field; the real game retains its own long-multiplication worksheet.</p><p><strong>3. Earn coins only.</strong> Each order grants Base Coins × Baker's Boost, never food or packages.</p><p><strong>4. Buy packages.</strong> The nine-tier package list is reached by clicking the Packages station or navigation button. Only packages award foods.</p><p><strong>5. Equip food.</strong> Owned Filipino foods can be equipped to build Baker's Boost and fill the glass showcase. The showcase and order clipboard scroll independently.</p></div><div class="modal-actions"><button class="art-action green" data-action="close">Got It!</button></div>`)}
function settings(){setModal('settings',`<h3 style="text-align:center">Showcase & Interaction Preview</h3><p class="muted" style="text-align:center">Change the number of equipped foods to test the scrollable glass showcase.</p><div class="settings-row">${[1,3,5,9,10,12,16].map(n=>`<button type="button" class="art-action ${state.equipped.length===n?'primary':''}" data-preview="${n}">${n} Food${n===1?'':'s'}</button>`).join('')}</div><p style="text-align:center">Demo: ${state.equipped.length} equipped foods · Baker's Boost <strong>×${boost().toFixed(2)}</strong></p><p class="muted" style="text-align:center">The 2000 ? 1200 bakery scales proportionally to fit your screen.</p><div class="modal-actions"><button class="art-action green" data-action="close">Return to Bakery</button></div>`)}
function setPreview(n){state.equipped=foods.slice(0,n).map(f=>f.id);state.equipped.forEach(id=>state.owned.add(id));renderMenu();seedOrders();toast(`${n} equipped menu food${n===1?'':'s'}`);settings();}
function refresh(){
 const a=state.equipped.length?state.equipped:[1];
 state.tickets=Array.from({length:7},(_,i)=>({id:state.completed*1000+200+i,n:12+Math.floor(Math.random()*79),m:2+Math.floor(Math.random()*89),tier:1+Math.floor(Math.random()*8),food:a[Math.floor(Math.random()*a.length)]}));
 renderTickets();if(state.modal)openOrders();else toast('Fresh bakery tickets arrived!');
}
function dispatch(action){switch(action){case'packages':packages();break;case'collection':collection();break;case'orders':openOrders();break;case'play':openOrder(state.tickets[0]?.id);break;case'wallet':wallet();break;case'help':help();break;case'settings':settings();break;case'odds':rewardOdds();break;case'refresh':refresh();break;case'close':closeModal();break;case'food-up':$('cabinet-scroll').scrollBy({top:-180,behavior:'smooth'});break;case'food-down':$('cabinet-scroll').scrollBy({top:180,behavior:'smooth'});break;case'order-up':$('order-scroller').scrollBy({top:-190,behavior:'smooth'});break;case'order-down':$('order-scroller').scrollBy({top:190,behavior:'smooth'});break;}}
// Feedback remains local to the pressed artwork; a native swipe cancels it.
$('stage').addEventListener('pointerdown',e=>{const btn=e.target.closest('button:not(:disabled)');if(btn)btn.classList.add('is-pressed');});
const clearPress=()=>document.querySelectorAll('.is-pressed').forEach(b=>b.classList.remove('is-pressed'));
for(const ev of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(ev,clearPress);
window.addEventListener('blur',clearPress);
$('stage').addEventListener('click',e=>{
 const buy=e.target.closest('[data-buy]');if(buy){buyPackage(Number(buy.dataset.buy));return;}
 const equip=e.target.closest('[data-equip]');if(equip){toggleEquip(Number(equip.dataset.equip));return;}
 const order=e.target.closest('[data-order]');if(order){openOrder(Number(order.dataset.order));return;}
 const solve=e.target.closest('[data-solve]');if(solve){solveOrder(Number(solve.dataset.solve));return;}
 const prev=e.target.closest('[data-preview]');if(prev){setPreview(Number(prev.dataset.preview));return;}
 const act=e.target.closest('[data-action]');if(act){dispatch(act.dataset.action);return;}
});
$('modal-overlay').addEventListener('click',e=>{if(e.target===$('modal-overlay'))closeModal()});
$('stage').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='answer'){e.preventDefault();solveOrder(state.active)}});
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&state.modal){e.preventDefault();closeModal();}
 if(e.key==='Tab'&&state.modal){
  const targets=[...$('modal').querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
  const first=targets[0],last=targets.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
 }
});
window.addEventListener('resize',fit);
$('cabinet-scroll').addEventListener('scroll',updateCabinetScrollbar);
$('order-scroller').addEventListener('scroll',updateOrderScrollbar);
function wireScrollbar(trackId,containerId,thumbId){
 const track=$(trackId),sc=$(containerId),thumb=$(thumbId);
 let drag=null;
 track.addEventListener('pointerdown',e=>{
  if(e.target===thumb||e.button!==0)return;
  e.preventDefault();
  const r=track.getBoundingClientRect(),h=thumb.getBoundingClientRect().height;
  const fraction=Math.max(0,Math.min(1,(e.clientY-r.top-h/2)/Math.max(1,r.height-h)));
  sc.scrollTop=fraction*(sc.scrollHeight-sc.clientHeight);
 });
 thumb.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  const travel=track.getBoundingClientRect().height-thumb.getBoundingClientRect().height;
  drag={pointer:e.pointerId,y:e.clientY,top:sc.scrollTop,travel};
  thumb.setPointerCapture(e.pointerId);e.preventDefault();
 });
 thumb.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer||drag.travel<=0)return;
  sc.scrollTop=drag.top+(e.clientY-drag.y)*(sc.scrollHeight-sc.clientHeight)/drag.travel;
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])thumb.addEventListener(type,()=>drag=null);
 thumb.addEventListener('keydown',e=>{
  const delta={ArrowDown:60,ArrowUp:-60,PageDown:sc.clientHeight*.9,PageUp:-sc.clientHeight*.9};
  if(e.key==='Home'){e.preventDefault();sc.scrollTop=0;}
  else if(e.key==='End'){e.preventDefault();sc.scrollTop=sc.scrollHeight;}
  else if(e.key in delta){e.preventDefault();sc.scrollTop+=delta[e.key];}
 });
}
wireScrollbar('cabinet-track','cabinet-scroll','cabinet-thumb');
wireScrollbar('board-scroll-track','order-scroller','board-scroll-thumb');
const resizeObserver=new ResizeObserver(()=>{updateCabinetScrollbar();updateOrderScrollbar();});
for(const id of ['cabinet-scroll','cabinet-grid','order-scroller','order-items'])resizeObserver.observe($(id));
// Read-only integration hook used by the installed web-game Playwright client.
window.render_game_to_text=()=>JSON.stringify({
 coordinates:{width:2000,height:1200,origin:'top-left',x:'right',y:'down'},
 mode:state.modal||'bakery',coins:state.coins,boost:boost(),completed:state.completed,
 owned:[...state.owned],equipped:state.equipped.map(id=>({id,name:foods[id-1].name,multiplier:foods[id-1].multiplier})),
 tickets:state.tickets.map(o=>({...o,reward:Math.round(coins[o.tier-1].base*boost())})),active:state.active,
 scrolls:Object.fromEntries(['cabinet-scroll','order-scroller'].map(id=>[id,{top:$(id).scrollTop,max:$(id).scrollHeight-$(id).clientHeight}]))
});
window.advanceTime=ms=>new Promise(resolve=>{
 const target=performance.now()+Math.max(0,Number(ms)||0);
 const step=now=>{if(now<target)requestAnimationFrame(step);else{updateCabinetScrollbar();updateOrderScrollbar();resolve();}};
 requestAnimationFrame(step);
});
seedOrders();renderMenu();updateWallet();fit();
})();
