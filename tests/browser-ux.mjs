// Optional real-browser regression runner, using built-in Node APIs and Chromium CDP.
// Run: node tests/browser-worksheet.mjs [path-to-Chromium-or-Edge]
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdtemp,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,extname,join,sep} from 'node:path';
import {spawn} from 'node:child_process';

const root=resolve(import.meta.dirname,'..');
const server=createServer(async(req,res)=>{
  try{
    const file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!file.startsWith(root+sep))throw Error('outside root');
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf'})[extname(file)]||'text/plain');
    res.end(await readFile(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const profile=await mkdtemp(join(tmpdir(),'pq-worksheet-browser-'));
const browser=spawn(process.argv[2]||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[
  '--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
  '--inprivate','--disable-extensions','--disable-component-extensions-with-background-pages','--disable-sync','--disable-background-networking',
  '--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows',
  '--remote-debugging-address=127.0.0.1',`--user-data-dir=${profile}`,'about:blank'
],{windowsHide:true,stdio:'ignore'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let ws,seq=0;
const pending=new Map(),errors=[],requests=[];
try{
  let port;
  for(let i=0;i<100;i++){
    try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await pause(100);}
  }
  assert.ok(port,'Chromium remote debugging did not start');
  const tabs=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws=new WebSocket(tabs.find(t=>t.type==='page'&&t.url==='about:blank').webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  ws.onmessage=event=>{
    const m=JSON.parse(event.data);
    if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
    if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);
  };
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{
    const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor=async(expression)=>{
    for(let i=0;i<150;i++){if(await evaluate(expression))return;await pause(50);}
    const detail=await evaluate(`({phase:g.run?.phase,errors:g.run?.mistakes,
      bridgeDone:g.run?.bridgeDone,actions:g.run&&Object.keys(g.run.worksheetRewards?.actions||{}),
      child:window.auditChild&&auditChild.eval('({phase:s.phase,done:s.done,busy,additionStart,complete:s.complete})')})`);
    throw Error('Timed out: '+expression+' '+JSON.stringify({detail,errors}));
  };
  await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Network.enable');
  await cdp('Page.bringToFront');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1600,height:1200,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/index.html`});
  await waitFor(`typeof startTicket==='function'`);
  await evaluate('document.fonts.ready');
  assert.equal(await evaluate(`Array.from(document.fonts).some(f=>f.family==='Panaderya Rounded'&&f.status==='loaded')`),true,'bundled rounded font actually loads');
  assert.equal(await evaluate(`['body','.topbar','.menu-stage','.bakery-progression','.bakery-vignette','.ticket-board'].every(selector=>!getComputedStyle(document.querySelector(selector)).backgroundImage.includes('url('))`),true,'bakery components use materials and patterns, never scenic wallpaper');
  await pause(500);
  assert.equal(await evaluate(`document.querySelector('.modal')===null`),true,'no reading assignment on first launch');
  assert.equal(await evaluate(`$('walletCoins').textContent`),'250');
  assert.equal(await evaluate(`document.querySelector('.topbar .wallet')===null&&document.querySelector('.menu-valuebar .wallet')!==null`),true);
  const shots=resolve(root,'docs/previews/bakery-components');await mkdir(shots,{recursive:true});
  const screenshot=async name=>{
    await pause(280);
    const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(join(shots,name+'.png'),Buffer.from(shot.data,'base64'));
  };
  for(const [width,height] of [[2000,1200],[1280,800],[1024,768],[768,1024],[390,844]]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await screenshot('main-'+width);
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,`menu overflow at ${width}`);
    if(width===2000)assert.equal(await evaluate(`document.documentElement.scrollHeight<=innerHeight`),true,'main page fits 2000x1200');
  }
  await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await evaluate(`g.completed=16;g.coins=100000;g.owned=FOOD.map((f,i)=>({uid:i+1,id:f.id,level:1,fusion:0,spent:0}));g.discovered=FOOD.map(f=>f.id);g.uidNext=16;g.activeMenu=[1,4,8];render()`);
  await evaluate(`g.mastery=18;g.permanentLuck=4;g.board=[{id:880,a:79,b:18,rarity:1,base:304},{id:881,a:248,b:6,rarity:3,base:640},{id:882,a:123,b:24,rarity:4,base:1200}];render()`);
  for(const [width,height] of [[2000,1200],[1194,834],[1024,768],[768,1024]]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await screenshot('main-progress-'+width);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.food-management')).every(el=>el.getBoundingClientRect().bottom<=el.closest('.food-tile').getBoundingClientRect().bottom)`),true,'management controls stay inside cards');
    if(width===2000)assert.equal(await evaluate(`document.documentElement.scrollHeight<=innerHeight`),true,`three-food menu fits ${width}x${height}`);
  }
  await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  for(const [name,command] of Object.entries({food:'openFoodItem(1)',inventory:'openMenu()',
    fusion:'ingredientFusionInfo(1)',copies:'openFusion(1)',ingredients:'openIngredients()',kitchen:'openKitchen()',
    decor:'openDecor()',staff:'openStaff()',index:'openIndex()',modes:'openModes()',
    settings:'openSettings()',luck:'openProbabilities()',sale:'sellFoodPrompt(1)',assign:'chooseFoodForSlot()'})){
    await evaluate(command);await screenshot(name);
    assert.equal(await evaluate(`document.querySelector('.modal').contains(document.activeElement)`),true,`${name} modal focus`);
    await evaluate('closeModal()');
  }
  for(const [width,height] of [[1194,834],[768,1024],[390,844]]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await evaluate('openMenu()');await screenshot('inventory-'+width);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.inventory-grid .food-tile')).every(card=>{const a=card.querySelector('.inventory-select').getBoundingClientRect(),b=card.querySelector('.tier-banner').getBoundingClientRect();return !(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)})`),true,'rarity labels never sit under checkboxes');
    await evaluate('closeModal()');
  }
  await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  // Exercise the real inventory controls, including checkbox focus/scroll.
  await evaluate(`window.inventoryFixture=structuredClone(g);g.menuSlots=5;openMenu('add')`);
  assert.equal(await evaluate(`$('inventoryAdd').disabled&&$('inventoryRemove').disabled&&$('inventorySell').disabled`),true);
  const inventoryClick=async uid=>{
    await evaluate(`document.querySelector('.inventory-grid [data-uid="${uid}"] input').scrollIntoView({block:'center'})`);await pause(100);
    const p=await evaluate(`(()=>{const r=document.querySelector('.inventory-grid [data-uid="${uid}"] input').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
    await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});
    await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});
  };
  await inventoryClick(2);await inventoryClick(3);
  assert.equal(await evaluate(`inventorySelection.size===2&&!$('inventoryAdd').disabled&&$('inventoryRemove').disabled&&!$('inventorySell').disabled`),true);
  assert.equal(await evaluate(`$('inventoryAdd').getBoundingClientRect().top>=document.querySelector('.modalhead').getBoundingClientRect().bottom`),true,'batch actions stay visible beneath the header while scrolling');
  await screenshot('inventory-selected');
  await evaluate(`$('inventoryAdd').click()`);
  assert.equal(await evaluate(`!document.querySelector('.modal')&&g.activeMenu.includes(2)&&g.activeMenu.includes(3)`),true);
  await evaluate(`openMenu()`);await inventoryClick(2);await inventoryClick(3);
  await evaluate(`$('inventoryRemove').click()`);await screenshot('inventory-remove-confirmation');
  assert.equal(await evaluate(`g.activeMenu.includes(2)&&g.activeMenu.includes(3)`),true,'confirmation has not yet removed foods');
  await evaluate(`document.querySelector('.modal .primary').click()`);
  assert.equal(await evaluate(`!g.activeMenu.includes(2)&&!g.activeMenu.includes(3)&&g.owned.length===15`),true);
  await inventoryClick(2);await inventoryClick(3);
  const salePrice=await evaluate(`resalePrice(g.owned.find(o=>o.uid===2))+resalePrice(g.owned.find(o=>o.uid===3))`),saleWallet=await evaluate('g.coins');
  await evaluate(`$('inventorySell').click()`);await screenshot('inventory-sale-confirmation');
  await evaluate(`document.querySelector('.modal .primary').click();confirmInventoryAction()`);
  assert.equal(await evaluate('g.coins'),saleWallet+salePrice);
  assert.equal(await evaluate(`g.owned.length===13&&g.discovered.includes('monay')&&JSON.parse(localStorage.getItem('panaderyaQuestV2')).owned.length===13`),true);
  await evaluate(`g=structuredClone(inventoryFixture);closeModal();save();render()`);
  const upgradeCost=await evaluate('foodLevelCost(g.owned[0])');
  await evaluate(`document.querySelector('[data-uid="1"] .card-level:not(:disabled)').click()`);
  assert.equal(await evaluate('g.owned[0].level'),2);
  assert.equal(await evaluate(`document.querySelector('.modal')===null`),true,'inline level-up does not open a general popup');
  assert.equal(await evaluate('g.coins'),100000-upgradeCost);
  await evaluate(`for(let i=0;i<3;i++)g.owned.push({uid:g.uidNext++,id:'pandesal',level:1,fusion:0,spent:0});openFusion(1,2)`);
  await screenshot('fusion-quantity');
  assert.equal(await evaluate(`document.getElementById('fusionQty').value`),'2');
  const fusionCost=await evaluate('duplicateFusionPlan(g.owned[0],2).fee'),beforeFusion=await evaluate('g.coins');
  await evaluate(`submitDuplicateFusion();submitDuplicateFusion()`);
  assert.equal(await evaluate('g.owned[0].fusion'),2);assert.equal(await evaluate('g.coins'),beforeFusion-fusionCost);
  assert.equal(await evaluate('g.owned[0].level'),2);
  await evaluate('openFusion(2)');
  const ingredientCost=await evaluate('fusionFee(g.owned[1])+fusionIngredientCost(g.owned[1])'),beforeIngredients=await evaluate('g.coins');
  await evaluate(`document.querySelector('.ingredient-alternative button').click();document.querySelector('.modal .primary').click();closeModal()`);
  assert.equal(await evaluate('g.owned[1].fusion'),1);assert.equal(await evaluate('g.coins'),beforeIngredients-ingredientCost);
  await evaluate(`$('toasts').innerHTML='';g.board=[{id:808,a:79,b:18,rarity:1,base:304}];startTicket(808);$('toasts').innerHTML=''`);
  await waitFor(`$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===808`);
  await evaluate(`window.auditFrame=$('worksheetFrame');window.auditChild=auditFrame.contentWindow;void 0`);
  await evaluate('auditChild.document.fonts.ready');
  assert.equal(await evaluate(`Array.from(auditChild.document.fonts).some(f=>f.family==='Panaderya Rounded'&&f.status==='loaded')`),true,'worksheet uses the same actual rounded font');
  for(const [width,height] of [[2000,1200],[1194,834],[1280,800],[1024,768],[768,1024],[390,844]]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await screenshot('worksheet-'+width);
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,`worksheet overflow at ${width}`);
    assert.equal(await evaluate(`(()=>{const r=$('prizejar').getBoundingClientRect();return r.top>0&&r.bottom<=innerHeight})()`),true,`prize dock at ${width}`);
    assert.equal(await evaluate(`auditChild.eval("getComputedStyle($('additionLab')).display==='none'&&getComputedStyle(document.querySelector('.multiplication-lab')).display==='none'")`),true);
    assert.ok(await evaluate(`auditChild.document.querySelector('[data-carry="0"]').getBoundingClientRect().height>=44`));
    if(width===2000){
      assert.equal(await evaluate(`document.documentElement.scrollHeight<=innerHeight`),true,'worksheet fits 2000x1200');
      assert.ok(await evaluate(`auditChild.document.querySelector('[data-top="0"]').getBoundingClientRect().width>=85`),'math enlarged at target resolution');
    }
  }
  await evaluate(`toggleArrows()`);await pause(180);
  assert.equal(await evaluate(`auditChild.eval("!document.querySelector('.guide-target,.guide-dim')&&$('tutorial').innerHTML===''&&$('additionSwipeGuide').innerHTML===''&&$('guidePrompt').hidden")`),true);
  await evaluate(`openSettings()`);await pause(100);
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',windowsVirtualKeyCode:27});
  await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await evaluate(`!document.querySelector('.modal')&&$('worksheetFrame')===auditFrame`),true);
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await evaluate(`toggleArrows();auditChild.eval("operand('top',0);operand('bottom',0);revealProduct();bridgePoll()")`);
  await pause(100);
  assert.equal(await evaluate(`auditChild.eval("matchMedia('(prefers-reduced-motion: reduce)').matches")`),true);
  const coins=await evaluate('g.run.pool');
  assert.ok(coins>0,'feedback is backed by actual earned actions');
  await waitFor('!rewardFlightsPending()');
  assert.deepEqual(errors,[],'reward presentation exceptions');
  assert.equal(await evaluate(`$('pendingCoins').textContent`),'🪙 '+Math.floor(coins).toLocaleString('en-US'));
  assert.equal(await evaluate('g.run.pool'),coins,'presentation cannot create rewards');
  for(const [width,height] of [[2000,1200],[1194,834],[1024,768],[768,1024]]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await screenshot('worksheet-product-'+width);
    console.log('Layout '+JSON.stringify(await evaluate(`({width:innerWidth,height:innerHeight,cell:auditChild.document.querySelector('[data-top="0"]').getBoundingClientRect().width,prizeBottom:$('prizejar').getBoundingClientRect().bottom,font:getComputedStyle(document.querySelector('.chest-luck-top')).fontFamily})`)));
  }
  // Actual claim transaction using a fixture matching the owner's popup mockup.
  await evaluate(`g=fresh();g.coins=0;g.mastery=3;g.completed=3;
    g.owned.push({uid:2,id:'monay',level:1,fusion:0,spent:0});g.uidNext=3;g.discovered.push('monay');
    g.run={phase:'claim',chests:[{rarity:0},{rarity:1},{rarity:0}],pool:3004,correct:6,mistakes:0,mode:'normal'};
    window.rewardRolls=[0,0,.4];Math.random=()=>rewardRolls.shift()??.999;prizeItems();prizeItems();$('toasts').innerHTML=''`);
  assert.equal(await evaluate('g.coins===3004&&g.permanentLuck===1&&g.owned.length===5'),true);
  assert.equal(await evaluate(`document.querySelectorAll('.package-reward').length===3&&document.querySelectorAll('.new-discovery').length===1`),true);
  for(const [width,height] of [[2000,1200],[1194,834],[1024,768],[768,1024],[390,844]]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await screenshot('order-resolved-'+width);
    assert.equal(await evaluate(`(()=>{const r=document.querySelector('.order-reward-modal').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&Math.abs((r.top+r.bottom)/2-innerHeight/2)<3&&Math.abs((r.left+r.right)/2-document.documentElement.clientWidth/2)<3})()`),true,`reward popup centered and inside viewport at ${width}`);
    if(width>=768)assert.equal(await evaluate(`(()=>{const cards=[...document.querySelectorAll('.package-reward')].map(el=>el.getBoundingClientRect());const button=document.querySelector('.back-to-bakery').getBoundingClientRect();return cards.every(r=>Math.abs(r.top-cards[0].top)<2)&&button.bottom<=innerHeight})()`),true,'three packages share one row and return button stays visible');
    assert.equal(await evaluate(`(()=>{const a=document.querySelector('.order-reward-modal .close').getBoundingClientRect(),b=document.querySelector('.order-reward-modal h2').getBoundingClientRect();return !(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)})()`),true,'popup title and close button have separate space');
  }
  await evaluate(`document.querySelector('.modal .close').click()`);
  assert.equal(await evaluate(`!document.querySelector('.modal')&&g.coins===3004&&g.run===null`),true,'closing results cannot undo or duplicate rewards');
  console.log('PASS UX browser: checkbox multi-add/remove/sell with confirmations and persistence; inline upgrades/fusions; all dialogs; target sizes; attached prize; guide OFF/reduced motion; mockup reward popup centered at five sizes and claim once');
  console.log('UX screenshots: '+shots);
  assert.equal(requests.some(url=>url.includes('bakery-interior-cozy')),false,'scenic asset is not requested by any screen');
  assert.deepEqual(errors,[]);
}finally{
  ws?.close();browser.kill();server.closeAllConnections();await new Promise(r=>server.close(r));
}
