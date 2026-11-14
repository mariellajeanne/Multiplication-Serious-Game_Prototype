"""Real procedural actions, optional fact input, step rewards and settlement.
Run: python tests/browser-golden-worksheet.py edge webkit
"""
import base64,importlib.util,json,sys,tempfile
from pathlib import Path
sp=importlib.util.spec_from_file_location('support',Path(__file__).with_name('browser-ui-replacement.py'))
s=importlib.util.module_from_spec(sp);sp.loader.exec_module(s)
OUT=s.ROOT/'output/playwright/golden-worksheet';OUT.mkdir(parents=True,exist_ok=True)

def shot(p,name):p.screenshot(path=str(OUT/(name+'.png')),animations='disabled')
def frame(p):return p.locator('#worksheetFrame').element_handle().content_frame()
def child(p,code):return frame(p).evaluate(code)
def flush(p):child(p,'bridgePoll()');p.wait_for_timeout(60)
def setup(p,offered=True):
 p.goto(s.URL);p.wait_for_selector('.hub-food');p.wait_for_load_state('networkidle')
 p.evaluate('''offered=>{const id=7701;g.mathPractice.facts={};g.mathPractice.steps=0;g.mathPractice.lastOffer=-100;
  let index=0;while(index<10000){const seed='visual-'+index,decision=goldenChallengeOffer(9,8,emptyFactProfile(),{seed:seed+'/'+id+'/0:0',step:0});if(decision.offered===offered){g.mathPractice.seed=seed;break}index++}
  g.board=[{id,a:79,b:18,coinTier:1,rarity:1,base:ticketBase(1),foodId:'pandesal'}];g.ticketSeq=id;save();startTicket(id)}''',offered)
 p.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===7701");p.wait_for_selector('#calculationExpression')
def connect(p):
 state=child(p,'({k:s.k,row:s.row})');f=frame(p);f.locator(f'[data-top="{state["k"]}"]').click();f.locator(f'[data-bottom="{state["row"]}"]').click();p.wait_for_selector('#generateAnswer:enabled');return state
def generate(p):
 p.locator('#generateAnswer').click();p.wait_for_function("$('worksheetFrame').contentWindow.eval('s.revealed')")
def submit(p,value):
 for digit in str(value):p.locator(f'[data-calc-key="{digit}"]').click()
 p.locator('[data-calc-key="Enter"]').click()
 flush(p)
def place_current(p):
 state=child(p,'({row:s.row,k:s.k,incoming:s.incoming,mixed:s.mixed,last:lastDigit()})');f=frame(p)
 if state['incoming'] and not state['mixed']:
  f.locator(f'[data-carry="{state["k"]}"]').click();f.locator(f'[data-slot="{state["row"]}:{state["row"]+state["k"]}"]').click()
 cc=state['row']+state['k'];has_tens=child(p,'tens()>0')
 f.locator(f'[data-slot="{state["row"]}:{cc}"]').click();submit(p,child(p,'ones()'))
 if has_tens:
  f.locator(f'[data-slot="{state["row"]}:{cc+1}"]' if state['last'] else f'[data-carry="{state["k"]+1}"]').click();submit(p,child(p,'tens()'))
 flush(p)
def complete_addition(p,engine):
 assert child(p,'s.phase')=='sum';assert p.locator('#collectRewards').is_disabled()
 assert p.locator('.calculator-heading h2').inner_text()=='Add the rows' and p.locator('#generateAnswer').count()==0
 if engine=='edge':
  target=frame(p).locator('#sheet');target.scroll_into_view_if_needed();r=target.bounding_box();x=r['x']+r['width']/2;y=r['y']+r['height']/2-35;cdp=p.context.new_cdp_session(p)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  for i in range(1,10):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y+i*8}]});p.wait_for_timeout(20)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach()
 else:frame(p).locator('#addRows').click()
 p.wait_for_function("g.run.procedureComplete===true",timeout=20000)

def generated_guidance(p,engine):
 p.goto(s.URL);p.wait_for_selector('.hub-food');p.wait_for_load_state('networkidle')
 p.evaluate('''()=>{g.board=[{id:8801,a:84,b:17,coinTier:1,rarity:1,base:ticketBase(1),foodId:'pandesal'}];save();startTicket(8801)}''')
 p.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===8801");connect(p);generate(p)
 assert p.locator('.calculation-keypad button').count()==12 and frame(p).locator('[data-part]').count()==0
 assert child(p,'s.done')==0 and child(p,'Object.keys(s.rows[0]).length')==0
 # Only Enter spends a procedural mistake. Correct digit / wrong column first.
 frame(p).locator('[data-slot="0:2"]').focus();p.keyboard.press('Enter');flush(p)
 assert child(p,'worksheetDigitEntry.selected.c')==2 and p.evaluate('g.learning.mistakes')==0
 submit(p,8)
 assert p.locator('.calculator-note').inner_text()=='Try again!';assert p.evaluate('g.learning.mistakes')==1;shot(p,engine+'-placement-first-error')
 frame(p).locator('[data-slot="0:0"]').click();p.locator('[data-calc-key="2"]').click();p.locator('[data-calc-key="Backspace"]').click()
 assert p.evaluate('g.learning.mistakes')==1 and child(p,'s.done')==0
 submit(p,2);assert 'carry row' in p.locator('.calculator-note').inner_text();shot(p,engine+'-placement-second-error')
 # Preserve unresolved guidance, selection and unsubmitted digit through exit/reload.
 p.locator('[data-calc-key="8"]').click();p.locator('.worksheet-exit').click();p.locator('[data-ticket-id="8801"]').click();p.wait_for_selector('#worksheetDigitInput')
 p.reload();p.wait_for_selector('#worksheetDigitInput');assert p.locator('#worksheetDigitInput').inner_text()=='8'
 assert child(p,'worksheetDigitEntry.guidance["0:0/ones"].mistakes')==2 and frame(p).locator('[data-slot="0:0"]').evaluate('e=>e.classList.contains("entry-selected")')
 frame(p).locator('#undo').click();p.wait_for_function("$('worksheetFrame').contentWindow.eval('s.revealed')")
 assert child(p,'worksheetDigitEntry.guidance["0:0/ones"].mistakes')==2
 frame(p).locator('[data-carry="0"]').click();submit(p,8)
 assert p.locator('.calculator-note').inner_text()=='Put 8 in the ones column.'
 assert frame(p).locator('[data-slot="0:0"]').evaluate('e=>e.classList.contains("entry-hint")') and child(p,'s.rows[0][0]') is None
 shot(p,engine+'-placement-third-error')
 # Even the explicit hint still requires the student to type and submit.
 frame(p).locator('[data-slot="0:0"]').click();p.locator('[data-calc-key="8"]').click()
 assert child(p,'s.rows[0][0]') is None and p.evaluate('g.run.stepCoins.baseTotal')==0
 for width,height in [(2000,1200),(1280,800),(1024,768)]:
  p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(120);shot(p,f'{engine}-{width}-selected-digit')
  assert p.locator('.worksheet-modern').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
 p.set_viewport_size({'width':1280,'height':800});p.locator('[data-calc-key="Enter"]').click();assert child(p,'s.rows[0][0]')==8 and child(p,'s.done')==0
 frame(p).locator('[data-carry="0"]').click();submit(p,2);assert p.locator('.calculator-note').inner_text()=='Try again!'
 frame(p).locator('[data-carry="1"]').click();submit(p,2);p.wait_for_function('g.run.bridgeDone===1')
 assert child(p,'s.phase')=='select' and p.locator('#calculationExpression').inner_text()=='8 × 7'
 assert p.locator('.calculation-keypad').count()==0;shot(p,engine+'-next-pair-needs-connection')
 connect(p);generate(p);place_current(p)
 connect(p);generate(p);place_current(p)
 connect(p);generate(p);place_current(p)
 complete_addition(p,engine);assert child(p,'s.a*s.b')==1428
 assert p.evaluate('g.mathPractice.lifetimeCoins.reduce((a,b)=>a+b,0)')==4 and p.evaluate('Object.keys(g.run.stepCoins.receipts).length')==4
 p.locator('#collectRewards').click();p.wait_for_selector('#acknowledgeWorksheetSummary:enabled');p.locator('#acknowledgeWorksheetSummary').click();p.wait_for_selector('.hub-home:visible')
 print(f'PASS {engine}: generated 84x17 typed through all columns/carries, 3 guidance stages, wrong digit/column/carry, editing, Undo, save/resume, draft lock-in, expected next-pair connection and 4 unique rewards',flush=True)

def run(pw,engine):
 b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge');errors=[]
 def page():
  c=b.new_context(viewport={'width':1280,'height':800},has_touch=True);p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)));return c,p
 c,p=page()
 try:
  if '--entry-only' in sys.argv:
   generated_guidance(p,engine);c.close();c,p=page();setup(p,True);connect(p);p.locator('#goldenChallenge').click();submit(p,72)
   attempts=p.evaluate('g.run.factAnswers["0:0"].attempts.length');frame(p).locator('[data-slot="0:2"]').click();submit(p,2)
   assert p.evaluate('g.run.factAnswers["0:0"].attempts.length')==attempts and child(p,'worksheetDigitEntry.level')==2
   place_current(p);assert p.evaluate('g.run.stepCoins.receipts["0:0"].multiplier')==p.evaluate('g.run.factAnswers["0:0"].multiplier')
   assert not errors,errors;print(f'PASS {engine}: keyboard tile activation and Golden placement input remain separate from calculation attempts',flush=True);return
  setup(p,True)
  for width,height in [(2000,1200),(1280,800),(1024,768)]:
   p.set_viewport_size({'width':width,'height':height});p.evaluate('fitWorksheet()');p.wait_for_timeout(250)
   assert p.locator('.worksheet-modern').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
   assert p.locator('.worksheet-reward-row .worksheet-coin-display').count()==3
   assert p.locator('.worksheet-coin-art .coin-tier-art').evaluate_all('es=>es.every(e=>getComputedStyle(e).opacity==="1"&&getComputedStyle(e).objectFit==="contain")')
   shot(p,f'{engine}-{width}-initial')
  p.set_viewport_size({'width':1280,'height':800});p.evaluate('fitWorksheet()');connect(p)
  assert frame(p).locator('#equationReveal').count()==0 and p.locator('.calculation-keypad').count()==0
  assert p.locator('#goldenChallenge').is_visible();advertised=p.evaluate('g.run.factAnswers["0:0"].multiplier');shot(p,engine+'-offered')
  p.locator('#goldenChallenge').click();assert p.locator('.calculation-keypad button').count()==12
  p.locator('[data-calc-key="Enter"]').click();assert p.evaluate('g.run.factAnswers["0:0"].attempts.length')==0
  p.locator('[data-calc-key="7"]').click();p.locator('[data-calc-key="Enter"]').click();assert p.evaluate('g.run.factAnswers["0:0"].attempts.length')==0
  p.locator('[data-calc-key="Backspace"]').click();submit(p,11);submit(p,12)
  assert p.evaluate('g.run.factAnswers["0:0"].attempts.length')==2;shot(p,engine+'-keypad-third-try')
  # Reopening/reloading cannot reset accepted state, attempts, entry or multiplier.
  attempt=p.evaluate('g.run.worksheetRewards.attemptId');p.locator('.worksheet-exit').click();p.locator('[data-ticket-id="7701"]').click();p.wait_for_selector('[data-calc-key="Enter"]')
  p.reload();p.wait_for_selector('[data-calc-key="Enter"]');assert p.evaluate('g.run.factAnswers["0:0"].attempts.length')==2
  assert p.evaluate('g.run.factAnswers["0:0"].multiplier')==advertised and p.evaluate('g.run.worksheetRewards.attemptId')==attempt
  # Physical keyboard works even while focus is inside the procedural iframe.
  p.wait_for_function("$('worksheetFrame').contentWindow.eval('worksheetChallengeInput')")
  frame(p).locator('#sheet').click(position={'x':8,'y':8});p.keyboard.type('72');p.keyboard.press('Enter')
  p.wait_for_function('g.run.factAnswers["0:0"].status==="success"');p.wait_for_function("$('worksheetFrame').contentWindow.eval('s.revealed')")
  assert p.evaluate('g.run.stepCoins.baseTotal')==0 and p.evaluate('g.mathPractice.lifetimeCoins.reduce((a,b)=>a+b,0)')==0
  assert child(p,'s.done')==0;shot(p,engine+'-correct-still-needs-placement')
  place_current(p);p.wait_for_function('g.run.stepCoins.counts.reduce((a,b)=>a+b,0)===1')
  first=p.evaluate('g.run.stepCoins.receipts["0:0"]');assert first['multiplier']==advertised and first['baseAmount']==first['denomination']*advertised
  assert p.evaluate('g.mathPractice.lifetimeCoins.reduce((a,b)=>a+b,0)')==1
  if p.locator('.worksheet-step-flight').count():shot(p,engine+'-coin-hold')
  p.wait_for_function('!rewardFlightsPending()')
  assert p.locator(f'[data-lifetime-count="{first["rank"]}"]').inner_text()=='1'
  # Undo and resealing use the same durable reward identity.
  frame(p).locator('#undo').click();p.wait_for_function("$('worksheetFrame').contentWindow.eval('s.phase')==='product'")
  f=frame(p);f.locator('[data-carry="1"]').click();submit(p,7);flush(p)
  assert p.evaluate('g.mathPractice.lifetimeCoins.reduce((a,b)=>a+b,0)')==1
  # 7x8 requires a waiting carry; Generate Answer keeps fact mastery separate.
  connect(p);assert p.locator('.calculation-keypad').count()==0 and p.locator('#goldenChallenge').count()==0
  generate(p);assert p.locator('#calculationAnswer').inner_text()=='56';place_current(p)
  connect(p);generate(p);place_current(p)
  connect(p);generate(p);place_current(p)
  complete_addition(p,engine)
  assert p.evaluate('Object.keys(g.run.stepCoins.receipts).length')==4
  assert p.evaluate('g.mathPractice.lifetimeCoins.reduce((a,b)=>a+b,0)')==4
  assert p.evaluate('g.mathPractice.facts["8x9"].successByTry[2]')==1
  assert p.evaluate('g.learning.mistakes')==0,'Optional fact attempts do not penalize procedural accuracy/lives'
  totals=p.evaluate('stepCoinTotals(g.run)');wallet=p.evaluate('g.coins');p.locator('#collectRewards').click();p.wait_for_selector('.worksheet-summary-modal')
  assert p.locator('#worksheetFrame').count()==1 and p.evaluate('g.run!==null') and p.locator('#app').evaluate('e=>e.inert')
  assert p.evaluate('g.coins')==wallet
  p.wait_for_selector('#acknowledgeWorksheetSummary:enabled');assert p.locator('#worksheetFinalCoins').inner_text()==p.evaluate('n=>fmt(n)',totals['total'])
  assert totals['total']==round(totals['base']*totals['boost'])
  shot(p,engine+'-summary')
  for width,height in [(2000,1200),(1024,768),(1280,800)]:
   p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(120)
   assert p.locator('.worksheet-summary-modal').evaluate('e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth+1}')
   p.locator('#acknowledgeWorksheetSummary').scroll_into_view_if_needed();shot(p,f'{engine}-{width}-summary')
  # The pending summary is saved before payout; reload restores it over the worksheet.
  p.emulate_media(reduced_motion='reduce');p.reload();p.wait_for_selector('#acknowledgeWorksheetSummary:enabled');assert p.evaluate('g.coins')==wallet
  assert p.locator('.worksheet-summary').get_attribute('data-summary-stage')=='6'
  p.locator('#acknowledgeWorksheetSummary').click();p.wait_for_selector('.hub-home:visible')
  assert p.evaluate('g.coins')==wallet+totals['total'] and p.evaluate('g.completed')==1
  assert not p.evaluate('acknowledgeWorksheetSummary()');p.reload();p.wait_for_selector('.hub-food')
  assert p.evaluate('g.coins')==wallet+totals['total'] and p.evaluate('g.mathPractice.lifetimeCoins.reduce((a,b)=>a+b,0)')==4
  c.close()
  c,p=page();generated_guidance(p,engine);c.close()
  # Three wrong attempts auto-generate, and abandoning never removes earned coins.
  for scenario in ['first','second','failed','forfeited','ordinary']:
   c,p=page();setup(p,scenario!='ordinary');connect(p)
   if scenario=='ordinary':
    assert p.locator('#goldenChallenge').count()==0 and p.locator('.calculation-keypad').count()==0;generate(p)
   else:
    p.locator('#goldenChallenge').click()
    if scenario=='first':submit(p,72)
    elif scenario=='second':submit(p,11);submit(p,72)
    elif scenario=='failed':submit(p,11);submit(p,12);submit(p,13)
    else:submit(p,11);p.locator('#generateAnswer').click()
    p.wait_for_function("$('worksheetFrame').contentWindow.eval('s.revealed')");assert p.evaluate('g.run.factAnswers["0:0"].status')==('success' if scenario in ['first','second'] else scenario)
   assert p.evaluate('g.run.pool')==0
   if scenario=='first':
    attempts=p.evaluate('g.run.factAnswers["0:0"].attempts.length');frame(p).locator('[data-slot="0:2"]').click();submit(p,2)
    assert p.evaluate('g.run.factAnswers["0:0"].attempts.length')==attempts and child(p,'worksheetDigitEntry.level')==2
   if scenario=='ordinary':p.emulate_media(reduced_motion='reduce')
   place_current(p)
   assert p.evaluate('g.run.stepCoins.receipts["0:0"].multiplier')==(p.evaluate('g.run.factAnswers["0:0"].multiplier') if scenario in ['first','second'] else 1)
   if scenario=='ordinary':assert p.locator('.worksheet-step-flight').count()==0
   shot(p,engine+'-'+scenario)
   if scenario=='ordinary':
    before=p.evaluate('JSON.stringify([g.run.stepCoins,g.mathPractice])');p.evaluate('captureActiveWorksheet();render()');flush(p)
    assert p.evaluate('JSON.stringify([g.run.stepCoins,g.mathPractice])')==before
   c.close()
  assert not errors,errors
  print(f'PASS {engine}: actual 79x18 carrying/swipe, optional keypad, full third-try bonus, failure/abandon, normal generation, no early/repeated coins, save/reload, independent mastery, summary/Boost/one payout, and 3 worksheet sizes',flush=True)
 except Exception:
  shot(p,engine+'-FAILURE');print('ERRORS',errors,flush=True);raise
 finally:
  try:c.close()
  except Exception:pass
  b.close()

def run_zoom(pw):
 # Actual browser zoom changes CSS viewport and DPR, unlike pinch emulation.
 with tempfile.TemporaryDirectory(prefix='panaderya-golden-zoom-') as folder:
  base=Path(folder);extension=base/'extension';extension.mkdir()
  (extension/'manifest.json').write_text(json.dumps({'manifest_version':3,'name':'Worksheet zoom check','version':'1.0','permissions':['tabs'],'background':{'service_worker':'background.js'}}))
  (extension/'background.js').write_text('chrome.runtime.onInstalled.addListener(()=>{});')
  c=pw.chromium.launch_persistent_context(str(base/'profile'),channel='msedge',headless=True,no_viewport=True,args=[f'--disable-extensions-except={extension}',f'--load-extension={extension}','--window-size=2000,1200'])
  try:
   worker=c.service_workers[0] if c.service_workers else c.wait_for_event('serviceworker');p=c.new_page();cdp=c.new_cdp_session(p);setup(p,True);connect(p);p.locator('#goldenChallenge').click()
   for factor in [1,.8,1.25,1.5,2,3]:
    actual=worker.evaluate('''async factor=>{const tab=(await chrome.tabs.query({})).find(t=>t.url.includes('/index.html'));await chrome.tabs.setZoomSettings(tab.id,{mode:'automatic',scope:'per-tab'});await chrome.tabs.setZoom(tab.id,factor);return chrome.tabs.getZoom(tab.id)}''',factor)
    assert abs(actual-factor)<.001;p.wait_for_timeout(200)
    assert p.locator('.worksheet-modern').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    assert p.locator('.worksheet-order-header').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    assert p.locator('.calculation-keypad button').evaluate_all('es=>es.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&e.scrollWidth<=e.clientWidth+1})')
    p.locator('[data-calc-key="Enter"]').scroll_into_view_if_needed();p.locator('#generateAnswer').scroll_into_view_if_needed()
    capture=cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False});(OUT/f'edge-zoom-{factor}-calculator.png').write_bytes(base64.b64decode(capture['data']))
    p.locator('.worksheet-settings').scroll_into_view_if_needed();p.locator('.worksheet-settings').click();p.wait_for_selector('#arrowToggle');p.locator('.modal .close').click()
    assert p.evaluate('g.run.factAnswers["0:0"].attempts.length')==0
    print('PASS actual worksheet Edge browser zoom',factor,p.evaluate('[innerWidth,innerHeight,devicePixelRatio]'),flush=True)
  finally:c.close()
try:
 with s.sync_playwright() as pw:
  requested=sys.argv[1:] or ['edge','webkit']
  for engine in [e for e in requested if not e.startswith('--')]:run(pw,engine)
  if ('edge' in requested and '--entry-only' not in requested) or '--zoom-only' in requested:run_zoom(pw)
finally:s.server.shutdown()
