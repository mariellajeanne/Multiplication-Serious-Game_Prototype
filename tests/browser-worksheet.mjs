// Optional real-browser regression runner, using built-in Node APIs and Chromium CDP.
// Run: node tests/browser-worksheet.mjs [path-to-Chromium-or-Edge]
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,extname,join,sep} from 'node:path';
import {spawn} from 'node:child_process';

const root=resolve(import.meta.dirname,'..');
const server=createServer(async(req,res)=>{
  try{
    const file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!file.startsWith(root+sep))throw Error('outside root');
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]||'text/plain');
    res.end(await readFile(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const profile=await mkdtemp(join(tmpdir(),'pq-worksheet-browser-'));
const browser=spawn(process.argv[2]||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[
  '--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
  '--remote-debugging-address=127.0.0.1',`--user-data-dir=${profile}`,'about:blank'
],{windowsHide:true,stdio:'ignore'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let ws,seq=0;
const pending=new Map(),errors=[];
try{
  let port;
  for(let i=0;i<100;i++){
    try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break;}catch{await pause(100);}
  }
  assert.ok(port,'Chromium remote debugging did not start');
  const tabs=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  ws.onmessage=event=>{
    const m=JSON.parse(event.data);
    if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
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
  await cdp('Runtime.enable');await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1600,height:1200,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/index.html`});
  await waitFor(`typeof startTicket==='function'`);
  await evaluate(`g.helpSeen=true;closeModal();g.board=[{id:9001,a:79,b:18,rarity:1,base:304}];startTicket(9001);`);
  await waitFor(`$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===9001`);
  await evaluate(`window.auditFrame=$('worksheetFrame');window.auditChild=auditFrame.contentWindow;
    auditChild.eval("operand('bottom',0)")`);
  const preserve=async()=>{
    const before=await evaluate(`JSON.stringify(auditChild.eval('({s,history,tutorial,sound})'))`);
    for(const dialog of ['openSettings()','showTutorial(2)','openProbabilities()','openMenu()']){
      await evaluate(`${dialog};closeModal();render()`);
      assert.ok(await evaluate(`$('worksheetFrame')===auditFrame&&auditFrame.contentWindow===auditChild`));
      assert.equal(await evaluate(`JSON.stringify(auditChild.eval('({s,history,tutorial,sound})'))`),before);
    }
  };
  await preserve();
  await evaluate(`auditChild.eval("operand('top',0)")`);await preserve();
  await evaluate(`auditChild.eval('revealProduct()')`);await preserve();
  await evaluate(`auditChild.eval("place('ones','slot',0)")`);
  await waitFor(`auditChild.eval('!busy&&s.onesPlaced')`);await preserve();
  await evaluate(`auditChild.eval("place('tens','slot',1)")`);
  await waitFor(`auditChild.eval('!busy&&s.tensPlaced')`);await preserve();
  await evaluate(`auditChild.eval('liftTens()')`);
  await waitFor(`auditChild.eval("!busy&&s.k===1")`);await preserve();
  await evaluate(`toggleArrows();toggleSfx()`);await pause(100);await preserve();
  assert.equal(await evaluate(`auditChild.eval('tutorial')`),false);
  assert.equal(await evaluate(`auditChild.eval('sound')`),false);
  console.log('PASS browser: dialogs retain frame, connection, floating product, provisional digits, carry, history and settings');

  // Continue the same actual worksheet with mouse/pointer events and its normal
  // animations. Geometry is measured through both documents; no test-fast mode.
  const point=async selector=>evaluate(`(()=>{
    window.scrollTo(0,auditFrame.getBoundingClientRect().top+scrollY-110);
    const el=auditChild.document.querySelector(${JSON.stringify(selector)});
    if(!el)throw Error('Missing target: '+${JSON.stringify(selector)});
    const a=el.getBoundingClientRect(),b=auditFrame.getBoundingClientRect();
    return {x:b.left+a.left+a.width/2,y:b.top+a.top+a.height/2};
  })()`);
  const click=async selector=>{
    await waitFor(`auditChild.document.querySelector(${JSON.stringify(selector)})!==null`);
    const p=await point(selector);
    await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});
    await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});
    await pause(35);
  };
  const drag=async(from,to)=>{
    const a=await point(from),b=await point(to);
    await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...a});
    for(let i=1;i<=8;i++){
      await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,
        x:a.x+(b.x-a.x)*i/8,y:a.y+(b.y-a.y)*i/8});
      await pause(20);
    }
    await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...b});
  };
  const flush=async()=>{
    await evaluate(`auditChild.eval('bridgePoll()')`);await pause(60);
  };
  const rewardSnapshot=()=>evaluate(`JSON.stringify({pool:g.run.pool,luck:g.run.luck,
    chests:g.run.chests,correct:g.run.correct,actions:g.run.worksheetRewards.actions})`);
  await flush();const previousRewards=await rewardSnapshot();
  await evaluate(`auditChild.eval("report('ready');report('state',JSON.parse(lastReport));report('state',JSON.parse(lastReport))")`);
  await pause(100);await preserve();assert.equal(await rewardSnapshot(),previousRewards);
  console.log('PASS browser: duplicate ready/state messages and parent renders do not add rewards or reset the frame');
  // Fix RNG only in this isolated test profile to guarantee that all earlier
  // chest rolls miss. The last-combo guarantee and the claim can then be exact.
  await evaluate(`Math.random=()=>.999`);
  const initialWallet=await evaluate('g.coins'),budget=await evaluate('g.run.budget');
  await click('[data-bottom="0"]');await click('[data-top="1"]');
  await waitFor(`auditChild.document.querySelector('#equationReveal')!==null`);
  await click('#equationReveal');await flush();
  const revealRewards=await rewardSnapshot();
  await click('#undo');
  await waitFor(`auditChild.document.querySelector('#equationReveal')!==null`);
  await click('#equationReveal');await flush();
  assert.equal(await rewardSnapshot(),revealRewards,'undo/reveal must not farm coins or Luck');
  await click('[data-part="ones"]');await click('[data-slot="0:1"]');
  await waitFor(`auditChild.eval('!busy&&s.onesPlaced')`);await preserve();
  await click('[data-carry="1"]');await click('[data-slot="0:1"]');
  await waitFor(`auditChild.eval('!busy&&s.mixed')`);await preserve();
  assert.equal(await evaluate(`auditChild.eval('s.rows[0][1]')`),3,'56 + carry 7 updates placed ones to 3');
  await drag('[data-part="tens"]','[data-slot="0:2"]');
  await waitFor(`auditChild.eval('!busy&&s.row===1')`);await preserve();
  for(let col=0;col<2;col++){
    await drag('[data-bottom="1"]',`[data-top="${col}"]`);
    await waitFor(`auditChild.document.querySelector('#equationReveal')!==null`);
    await click('#equationReveal');
    await drag('[data-part="ones"]',`[data-slot="1:${col+1}"]`);
    await waitFor(col===0?`auditChild.eval('!busy&&s.k===1')`:`auditChild.eval("!busy&&s.phase==='sum'")`);
  }
  await preserve();await flush();
  assert.deepEqual(await evaluate(`auditChild.eval('[s.rows[0],s.rows[1]]')`),
    [{'0':2,'1':3,'2':6},{'0':0,'1':9,'2':7}]);
  const guideOff=await evaluate(`auditChild.document.querySelectorAll('#additionSwipeGuide .drop-guide').length===0`);
  console.log(`KNOWN baseline: addition hint respects Tutorial OFF: ${guideOff} (not changed by these stages)`);
  // Swipe starts on the math surface outside buttons, as required by current UX.
  const swipe=await evaluate(`(()=>{const a=auditChild.document.getElementById('sheet').getBoundingClientRect(),
    b=auditFrame.getBoundingClientRect();return {x:b.left+a.left+7,y:b.top+a.top+75}})()`);
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...swipe});
  await pause(60);
  await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',buttons:1,x:swipe.x,y:swipe.y+70});
  await pause(60);
  await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:swipe.x,y:swipe.y+70});
  await waitFor(`g.run?.phase==='claim'`);
  assert.equal(await evaluate('g.run.pool'),budget);
  assert.equal(await evaluate('g.run.chests.length'),1);
  assert.equal(await evaluate('g.run.correct'),9);
  assert.equal(await evaluate('Object.keys(g.run.worksheetRewards.actions).length'),20);
  await evaluate(`window.completedAttempt=structuredClone(g.run);prizeItems();prizeItems()`);
  assert.equal(await evaluate('g.coins'),initialWallet+budget);
  assert.equal(await evaluate('g.completed'),1);
  console.log(`PASS browser: 79 × 18 = 1422, click/drag, carry after placement, undo/reveal dedup, downward swipe; ${budget} coins and one chest claimed exactly once`);

  // Separate one-row carrying case: incoming carry creates a new leading digit.
  await evaluate(`closeModal();g.sound=true;g.tutorialArrows=true;
    g.board=[{id:9002,a:19,b:9,rarity:0,base:130}];startTicket(9002)`);
  await waitFor(`$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===9002`);
  await evaluate(`auditFrame=$('worksheetFrame');auditChild=auditFrame.contentWindow;void 0`);
  await click('[data-top="0"]');await click('[data-bottom="0"]');await click('#equationReveal');
  await drag('[data-part="tens"]','[data-carry="1"]');await waitFor(`auditChild.eval('!busy&&s.tensPlaced')`);
  await drag('[data-part="ones"]','[data-slot="0:0"]');await waitFor(`auditChild.eval('!busy&&s.k===1')`);
  await drag('[data-top="1"]','[data-bottom="0"]');await click('#equationReveal');
  await drag('[data-carry="1"]','[data-part="ones"]');await waitFor(`auditChild.eval('!busy&&s.mixed')`);
  assert.equal(await evaluate(`auditChild.eval('value()')`),17,'9 + carry 8 creates leading tens');await preserve();
  assert.equal(await evaluate(`auditChild.eval('sound&&tutorial')`),true);
  await drag('[data-part="tens"]','[data-slot="0:2"]');await waitFor(`auditChild.eval('!busy&&s.tensPlaced')`);
  await click('[data-part="ones"]');await click('[data-slot="0:1"]');
  await waitFor(`g.run?.phase==='claim'`);
  assert.equal(await evaluate('g.run.pool'),await evaluate('g.run.budget'));
  assert.equal(await evaluate('g.run.chests.length'),1);
  console.log('PASS browser: 19 × 9 = 171, direct outgoing carry and incoming carry before placement; tutorial/SFX enabled');
  assert.deepEqual(errors,[],'browser runtime exceptions');
}finally{
  ws?.close();browser.kill();await new Promise(r=>server.close(r));
  // Leave the isolated OS-temp profile to OS cleanup; never touch the user browser profile.
}
