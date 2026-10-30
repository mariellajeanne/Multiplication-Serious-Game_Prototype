import assert from 'node:assert/strict';
export async function checkProgression({evaluate,cdp,screenshot,waitFor,pause}){
 const click=async selector=>{
  const point=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await pause(70);
  await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});await pause(100);
 };
 await cdp('Emulation.setDeviceMetricsOverride',{width:2000,height:1200,deviceScaleFactor:1,mobile:false});
 await evaluate(`g.completed=20;g.coins=1e15;g.menuSlots=3;
  g.owned=[{uid:1,id:'pandesal',fusion:1,level:5,spent:1000},{uid:2,id:'monay',fusion:1,level:1,spent:0},{uid:3,id:'pandesal',fusion:1,level:1,spent:0},{uid:4,id:'ensaymada',fusion:2,level:2,spent:800}];g.uidNext=5;render()`);
 await click('.equip-best summary');await click(`.equip-options button[onclick*="equipBest('final')"]`);
 assert.deepEqual(await evaluate('[...g.activeMenu]'),[4,1,2]);
 await click('.equip-best summary');await click('.equip-options input');
 assert.equal(await evaluate(`g.autoEquip==='final'&&document.querySelector('.equip-best summary').textContent.includes('Auto: Final')`),true);
 await evaluate(`g.owned.push({uid:g.uidNext++,id:'ube-ensaymada',fusion:3,level:1,spent:0});save();render()`);
 assert.equal(await evaluate('g.activeMenu.includes(5)&&!g.activeMenu.includes(2)'),true);
 await evaluate(`openMenu();toggleInventoryFood(1)`);
 assert.equal(await evaluate(`$('inventoryAdd').disabled&&$('inventoryRemove').disabled&&!$('inventorySell').disabled`),true);
 await evaluate(`closeModal();setAutoEquip('base',true)`);
 assert.equal(await evaluate(`g.autoEquip==='base'&&!g.activeMenu.includes(3)`),true);
 await cdp('Page.reload');await waitFor(`typeof g!=='undefined'&&g.autoEquip==='base'&&document.querySelector('.equip-best')`);
 assert.deepEqual(await evaluate('[...g.activeMenu]'),[5,4,2]);
 await evaluate(`setAutoEquip('base',false);openMenu('add');toggleInventoryFood(3)`);
 assert.equal(await evaluate(`g.autoEquip==='off'&&$('inventoryRemove').disabled`),true);await evaluate('closeModal()');
 for(const [a,b,result] of [[1,1,[2]],[1,2,[3]],[2,2,[3,1]],[2,3,[5]],[3,3,[5,1]],[4,4,[5,3]]]){
  await evaluate(`g.owned=[{uid:1,id:'pandesal',fusion:${a},level:4,spent:1001},{uid:2,id:'pandesal',fusion:${b},level:5,spent:2002}];g.uidNext=3;g.activeMenu=[1];g.menuSlots=1;openFusion(1,2);window.preview=structuredClone(fusionSelection.plan);window.coinsBefore=g.coins;`);
  assert.equal(await evaluate(`document.querySelectorAll('.fusion-output').length`),2+result.length);
  assert.equal(await evaluate(`document.querySelector('#fusionDonor').value`),'2');
  if(a===4)await screenshot('fusion-overflow');
  await click('.fusion-actions .primary');await evaluate('submitDuplicateFusion()');
  assert.deepEqual(await evaluate('g.owned.map(o=>o.fusion)'),result);
  assert.equal(await evaluate('g.coins===coinsBefore-preview.fee&&g.owned.reduce((s,o)=>s+o.spent,0)===3003+preview.fee'),true);
  assert.equal(await evaluate('g.activeMenu.length===1&&g.owned.length===preview.outputs.length'),true);await evaluate('closeModal()');
 }
 await evaluate(`g.owned=[{uid:1,id:'pandesal',fusion:1,level:3,spent:100}];g.activeMenu=[1];g.ingredients={Flour:2,Yeast:1};ingredientFusionInfo(1);window.ingredientFee=ingredientFusionSelection.total;window.coinsBefore=g.coins`);
 await click('.modal .primary');await evaluate('submitIngredientFusion()');
 assert.equal(await evaluate('g.owned[0].fusion===2&&g.owned[0].level===3&&g.coins===coinsBefore-ingredientFee'),true);await evaluate('closeModal()');
 await evaluate(`g.orderRefreshAt=0;g.orderClock=Date.now();localStorage.removeItem('panaderyaQuestV2');g.board=[];refillBoard();render();window.oldIds=g.board.map(t=>t.id)`);
 await click('#refreshOrders');
 assert.equal(await evaluate(`g.board.length===5&&g.board.every(t=>!oldIds.includes(t.id))&&$('refreshOrders').disabled`),true);
 await evaluate(`window.savedBoard=JSON.stringify(g.board);refreshOrders()`);assert.equal(await evaluate('JSON.stringify(g.board)===savedBoard'),true);
 const board=await evaluate('JSON.stringify(g.board)'),deadline=await evaluate('g.orderRefreshAt');
 await cdp('Page.reload');await waitFor(`typeof g!=='undefined'&&g.orderRefreshAt===${deadline}&&$('refreshOrders')`);
 assert.equal(await evaluate('JSON.stringify(g.board)'),board);assert.equal(await evaluate('refreshOrders()'),false);
 await evaluate(`window.realClock=Date.now;Date.now=()=>g.orderClock-60000`);assert.equal(await evaluate('refreshOrders()'),false);
 await evaluate(`window.nowAfterCooldown=g.orderRefreshAt;Date.now=()=>nowAfterCooldown`);assert.equal(await evaluate('refreshOrders()'),true);
 await evaluate(`Date.now=realClock;g.orderClock=Date.now();g.orderRefreshAt=0;localStorage.removeItem('panaderyaQuestV2')`);
 await evaluate(`g.mastery=160;g.permanentLuck=40;g.coins=1e12;g.bakeryLevel=25;g.menuSlots=4;
  g.owned=FOOD.map((f,i)=>({uid:i+1,id:f.id,fusion:i%5+1,level:i%5+1,spent:100}));g.uidNext=FOOD.length+1;g.discovered=FOOD.map(f=>f.id);g.activeMenu=[15,16,17];g.equipment=Object.fromEntries(KITCHEN.map(k=>[k.id,17]));g.board=Array.from({length:5},(_,i)=>({id:100+i,rarity:i+3,a:1234,b:18,base:ticketBase(i+3)}));render()`);
 for(const [width,height] of [[2000,1200],[1194,834],[1024,768],[768,1024]]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await screenshot('stage-cd-main-'+width);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`progression menu overflow ${width}`);
  assert.equal(await evaluate(`(()=>{const p=document.querySelector('.menu-valuebar').getBoundingClientRect(),n=document.querySelector('.menu-value .number').getBoundingClientRect(),w=document.querySelector('.wallet').getBoundingClientRect();return n.right<w.left&&w.right<=p.right})()`),true,`large menu numbers fit ${width}`);
  await evaluate('openMenu()');await screenshot('stage-cd-inventory-'+width);
  assert.equal(await evaluate(`document.querySelector('.modal').scrollWidth<=document.querySelector('.modal').clientWidth`),true);
  assert.equal(await evaluate(`new Set([...document.querySelectorAll('.inventory-grid .tier-banner')].map(n=>n.textContent.trim())).size===8`),true);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.inventory-grid .food-tile')).every(card=>{const a=card.querySelector('.inventory-select').getBoundingClientRect(),b=card.querySelector('.tier-banner').getBoundingClientRect();return !(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)})`),true);
  await evaluate('closeModal()');
 }
 await cdp('Emulation.setDeviceMetricsOverride',{width:2000,height:1200,deviceScaleFactor:1,mobile:false});
 let previousStage=0;
 for(let level=1;level<=30;level++){
  await evaluate(`g.bakeryLevel=${level};render()`);
  const stage=await evaluate(`Number(document.querySelector('.bakery-progression').dataset.bakeryStage)`);
  assert.equal(stage-previousStage,[2,3,5,7,10,13,17,21,25,30].includes(level)?1:0);previousStage=stage;
  if([1,7,17,30].includes(level))await screenshot('bakery-level-'+level);
 }
 await evaluate(`g.bakeryLevel=29;g.completed=40;g.coins=1e20;openDecor();window.oldBakeryValue=bakeryValue()`);
 await click('.modal .primary');assert.equal(await evaluate('g.bakeryLevel===30&&Math.abs(bakeryValue()/oldBakeryValue-1.085)<1e-10'),true);
 assert.equal(await evaluate(`document.querySelector('.modal .primary').disabled`),true);await evaluate('closeModal()');
 await evaluate(`g.equipment.oven=19;openKitchen();window.oldKitchenValue=bakeryValue()`);await click(`.modal button[onclick="upgradeEquipment('oven')"]`);
 assert.equal(await evaluate('g.equipment.oven===20&&Math.abs(bakeryValue()/oldKitchenValue-1.055)<1e-10'),true);await evaluate('closeModal()');
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate('render();openMenu()');
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.ticket')).animationName==='none'`),true);await evaluate('closeModal()');
 await cdp('Emulation.setEmulatedMedia',{features:[]});
 await evaluate(`g=fresh();localStorage.removeItem('panaderyaQuestV2');save();render()`);
 console.log('PASS C/D browser: Equip Best and Auto/persistence; six fusion recipes, overflow and ingredient preview; refresh cooldown/reload/rollback; eight rarities/five tiers; bakery 30/kitchen 20; four target sizes and reduced motion');
}
