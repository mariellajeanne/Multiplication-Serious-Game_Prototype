"""Production cross-frame mouse/touch placement, carry gates and whole orders."""
import importlib.util,sys
from pathlib import Path
sp=importlib.util.spec_from_file_location('support',Path(__file__).with_name('browser-ui-replacement.py'));s=importlib.util.module_from_spec(sp);sp.loader.exec_module(s)
OUT=s.ROOT/'output/playwright/worksheet-drag';OUT.mkdir(parents=True,exist_ok=True)
def frame(p):return p.locator('#worksheetFrame').element_handle().content_frame()
def state(p):return frame(p).evaluate('({row:s.row,k:s.k,phase:s.phase,mixed:s.mixed,incoming:s.incoming,ones:ones(),tens:tens(),last:lastDigit(),done:s.done})')
def shot(p,name):p.screenshot(path=str(OUT/(name+'.png')),animations='disabled')
def start(p,a,b,id=9901):
 p.goto(s.URL);p.wait_for_selector('.hub-food');p.wait_for_load_state('networkidle')
 # Four completed fixtures legitimately unlock the next package. Acknowledge it
 # through its real button before starting another worksheet scenario.
 while p.locator('#packageUnlockAwesome').count():
  p.locator('#packageUnlockAwesome').click();p.wait_for_selector('#packageUnlock',state='detached')
 p.evaluate('''args=>{g.ticketSeq=Math.max(g.ticketSeq,args.id);g.board=[{id:args.id,a:args.a,b:args.b,rarity:1,coinTier:1,base:176,foodId:'pandesal'}];save();startTicket(args.id)}''',dict(a=a,b=b,id=id));p.wait_for_function(f"$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id==={id}")
def connect(p):
 st=state(p);frame(p).locator(f'[data-top="{st["k"]}"]').click();frame(p).locator(f'[data-bottom="{st["row"]}"]').click();p.wait_for_selector('#generateAnswer:enabled')
def generate(p):p.locator('#generateAnswer').click();p.wait_for_function("$('worksheetFrame').contentWindow.eval('s.revealed')")
def drag(p,source,target,touch=False):
 a=source.bounding_box();b=target.bounding_box();x=a['x']+a['width']/2;y=a['y']+a['height']/2;tx=b['x']+b['width']/2;ty=b['y']+b['height']/2
 if touch:
  c=p.context.new_cdp_session(p);c.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  for i in range(1,13):c.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+(tx-x)*i/12,'y':y+(ty-y)*i/12}]});p.wait_for_timeout(18)
  c.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});c.detach()
 else:p.mouse.move(x,y);p.mouse.down();p.mouse.move(tx,ty,steps=15);p.mouse.up()
 p.wait_for_timeout(160)
def place(p,part,st,tap=False,touch=False,target=None):
 target=target or (f'[data-slot="{st["row"]}:{st["row"]+st["k"]}"]' if part=='ones' else f'[data-slot="{st["row"]}:{st["row"]+st["k"]+1}"]' if st['last'] else f'[data-carry="{st["k"]+1}"]')
 tile=p.locator(f'[data-answer-digit="{part}"]');dest=frame(p).locator(target)
 if tap:tile.click();dest.click();p.wait_for_timeout(100)
 else:drag(p,tile,dest,touch)
def solve(p,engine,carry_after=False):
 turns=0
 while state(p)['phase'] not in ['sum','complete']:
  turns+=1;assert turns<30,('Worksheet did not advance',state(p),p.locator('#calculationPanel').inner_text())
  st=state(p)
  if st['phase']=='select':connect(p);generate(p);st=state(p)
  if not st['mixed']:
   assert p.locator('[data-answer-digit="ones"]').count()==1
   if carry_after:
    previous=p.evaluate('Object.keys(g.run.stepCoins.receipts).length');place(p,'ones',st,tap=engine=='webkit',touch=engine=='edge');assert not state(p)['mixed']
    assert frame(p).evaluate('s.onesPlaced') and p.evaluate('Object.keys(g.run.stepCoins.receipts).length')==previous
    if st['row']==1 and st['k']==1:
     shot(p,engine+'-97-provisional');p.locator('.worksheet-exit').click();p.locator('[data-ticket-id="9903"]').click();p.reload();p.wait_for_function("$('worksheetFrame')?.worksheetStarted===true");p.wait_for_selector('.carry-source');assert frame(p).evaluate('s.onesPlaced&&!s.mixed')
    if engine=='edge':drag(p,frame(p).locator(f'[data-carry="{st["k"]}"]'),frame(p).locator(f'[data-slot="{st["row"]}:{st["row"]+st["k"]}"]'),True)
    else:frame(p).locator(f'[data-carry="{st["k"]}"]').click();frame(p).locator(f'[data-slot="{st["row"]}:{st["row"]+st["k"]}"]').click();p.wait_for_timeout(100)
   elif engine=='edge':drag(p,frame(p).locator(f'[data-carry="{st["k"]}"]'),p.locator('#carryResultTarget'),True)
   else:p.locator('.carry-source').click();p.locator('#carryResultTarget').click();p.wait_for_timeout(100)
   assert state(p)['mixed'];st=state(p)
   if st['row']==0 and st['k']==1 and p.evaluate('g.run.ticket.a')==84:assert st['ones']==8 and st['tens']==5;shot(p,engine+'-carry-58')
  assert p.locator('.calculation-keypad').count()==0
  if p.locator('[data-answer-digit="ones"]').count():place(p,'ones',st,tap=st['done']%2==1,touch=engine=='edge' and st['done']%2==0)
  if st['tens'] and p.locator('[data-answer-digit="tens"]').count():place(p,'tens',state(p),tap=st['done']%2==0,touch=engine=='edge' and st['done']%2==1)
  p.wait_for_timeout(80)
 if state(p)['phase']=='sum':frame(p).locator('#addRows').click()
 p.wait_for_function('g.run.procedureComplete===true',timeout=15000)
 if p.evaluate('g.run.ticket.a')==84:assert frame(p).evaluate('s.rows')==[{'0':8,'1':8,'2':5},{'0':0,'1':6,'2':3,'3':3}]
 if p.evaluate('g.run.ticket.a')==97:assert frame(p).evaluate('s.rows[1]')=={'0':0,'1':4,'2':9,'3':1}
 total=p.evaluate('stepCoinTotals(g.run).total');wallet=p.evaluate('g.coins');steps=p.evaluate('g.run.steps.length');assert p.evaluate('Object.keys(g.run.stepCoins.receipts).length')==steps
 p.locator('#collectRewards').click();p.wait_for_selector('#acknowledgeWorksheetSummary:enabled');shot(p,engine+'-summary');p.locator('#acknowledgeWorksheetSummary').click();p.wait_for_selector('.hub-home:visible');assert p.evaluate('g.coins')==wallet+total;assert not p.evaluate('acknowledgeWorksheetSummary()')
def run(pw,engine):
 b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge');c=b.new_context(viewport={'width':1280,'height':800},has_touch=True);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 try:
  start(p,84,47);connect(p);generate(p)
  for width,height in [(2000,1200),(1640,926),(1280,800),(1024,768)]:
   p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(150);p.evaluate('fitWorksheet()');p.wait_for_timeout(150)
   assert p.locator('.worksheet-modern').evaluate('e=>{const r=e.getBoundingClientRect();return r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth+1}')
   assert p.locator('.worksheet-modern').evaluate('e=>{const r=e.getBoundingClientRect();return Math.abs((r.left+r.right)/2-innerWidth/2)<1}')
   assert p.locator('.worksheet-coin-display').evaluate_all('es=>es.every(e=>{const r=e.getBoundingClientRect();return Math.abs(r.width-r.height)<1&&e.scrollWidth<=e.clientWidth+1&&e.querySelector(".worksheet-coin-art").getBoundingClientRect().height>=55})')
   sheet=p.locator('.worksheet-left').bounding_box();fr=p.locator('#worksheetFrame').bounding_box();line=frame(p).locator('.bottomline').bounding_box()
   assert abs(line['x']+line['width']/2-sheet['x']-sheet['width']/2)<14,(sheet,line)
   shot(p,f'{engine}-{width}-tray')
  p.set_viewport_size({'width':1280,'height':800});p.wait_for_timeout(150)
  drag(p,p.locator('[data-answer-digit="ones"]'),p.locator('.worksheet-order-expression'));assert p.evaluate('g.learning.mistakes')==0
  for attempt in range(3):
   place(p,'ones',state(p),target='[data-slot="0:3"]');assert frame(p).evaluate('worksheetDigitEntry.level')==attempt+1;assert state(p)['done']==0
   if attempt==1:p.locator('.worksheet-exit').click();p.locator('[data-ticket-id="9901"]').click();p.reload();p.wait_for_function("$('worksheetFrame')?.worksheetStarted===true");p.wait_for_selector('[data-answer-digit="ones"]');assert frame(p).evaluate('worksheetDigitEntry.guidance["0:0/ones"].mistakes')==2
  shot(p,engine+'-third-hint');place(p,'ones',state(p));p.locator('.worksheet-complete-bar button').first.click();p.wait_for_timeout(100);assert state(p)['done']==0
  place(p,'tens',state(p),tap=True,target='[data-slot="0:1"]');place(p,'ones',state(p),tap=True);assert state(p)['done']==0
  drag(p,frame(p).locator('[data-slot="0:1"]'),frame(p).locator('[data-carry="1"]'),engine=='edge');assert state(p)['done']==1
  solve(p,engine)
  start(p,97,28,9903);solve(p,engine,carry_after=True)
  start(p,97,28,9904);solve(p,engine)
  start(p,54321,67,9902);p.emulate_media(reduced_motion='reduce');p.evaluate('g.tutorialArrows=false;sendEngine("tutorial",{enabled:false})');solve(p,engine)
  for index,path in enumerate(['success','failed','skipped']):
   start(p,79,18,9990+index)
   p.evaluate('''()=>{g.mathPractice.facts={};g.mathPractice.steps=0;g.mathPractice.lastOffer=-100;for(let i=0;i<10000;i++){const seed='drag-'+i;if(goldenChallengeOffer(9,8,emptyFactProfile(),{seed:seed+'/'+g.run.ticket.id+'/0:0',step:0}).offered){g.mathPractice.seed=seed;break}}save()}''')
   connect(p);p.locator('#goldenChallenge').click();assert p.locator('.calculation-keypad').count()==1
   for value in ([11,12,72] if path=='success' else [11,12,13] if path=='failed' else [11]):
    for digit in str(value):p.locator(f'[data-calc-key="{digit}"]').click()
    p.locator('[data-calc-key="Enter"]').click();p.wait_for_timeout(70)
   if path=='skipped':p.locator('#generateAnswer').click()
   p.wait_for_selector('[data-answer-digit="ones"]');assert p.locator('.calculation-keypad').count()==0 and p.evaluate('g.run.stepCoins.baseTotal')==0
   st=state(p);place(p,'ones',st,tap=True);place(p,'tens',state(p),tap=True)
   expected=p.evaluate('g.run.factAnswers["0:0"].multiplier') if path=='success' else 1
   assert p.evaluate('g.run.stepCoins.receipts["0:0"].multiplier')==expected
   assert p.evaluate('g.run.factAnswers["0:0"].attempts.length')==(3 if path!='skipped' else 1)
   # A fresh browser context prevents the next isolated scenario sharing a live run.
   p.evaluate('abandonTicket()')
  assert not errors,errors;print('PASS',engine,'84x47 = 3948 with first row 588; 54321x67 = 3639507; mouse/touch drag, tap, both carry orders (97x28 row1940 / total2716), 3 hints, Undo/resume, 4 landscape sizes, reduced motion and exactly-once settlement',flush=True)
 except Exception:shot(p,engine+'-FAILURE');print(errors,flush=True);raise
 finally:c.close();b.close()
try:
 with s.sync_playwright() as pw:
  for engine in sys.argv[1:] or ['edge','webkit']:run(pw,engine)
finally:s.server.shutdown()
