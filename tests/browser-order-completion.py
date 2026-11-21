"""Production Order Complete: real settlement, choreography and interruption safety.
Run: python tests/browser-order-completion.py edge webkit
"""
import importlib.util,sys
from pathlib import Path
golden_path=Path(__file__).with_name('browser-golden-worksheet.py')
spec=importlib.util.spec_from_file_location('golden',golden_path)
g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
s=g.s;OUT=s.ROOT/'output/playwright/order-completion';OUT.mkdir(parents=True,exist_ok=True)

def shot(p,name):p.screenshot(path=str(OUT/(name+'.png')))
def finished(p):p.wait_for_function("document.querySelector('.worksheet-summary')?.dataset.summaryStage==='6'")
def expected(p):return p.evaluate('g.run.settlement')
def check_final(p):
 t=expected(p)
 assert p.locator('#worksheetFinalCoins').inner_text()==p.evaluate('n=>fmt(n)',t['total'])
 assert p.locator('#acknowledgeWorksheetSummary').is_enabled() and p.locator('#acknowledgeWorksheetSummary').is_visible()
 assert not p.locator('#skipWorksheetSummary').is_visible()
 assert p.locator('.summary-equation').is_visible() and not p.locator('.summary-boost').is_visible()
 assert p.locator('.summary-flight').count()==0
 active=p.evaluate("document.querySelector('.worksheet-summary').getAnimations({subtree:true}).filter(a=>a.playState==='running').map(a=>({name:a.animationName,target:a.effect.target.className}))")
 assert not active,active

def fixture(p,n=3,boost=133.915):
 # Exercise the real receipt/action ledger, then the real settlement entry.
 p.evaluate('''({n,boost})=>{
  if(worksheetSummaryView)closeModal();
  g.packageCelebrations.acknowledged=PACKAGE_SHOP.map(t=>t.rank);
  const id=++g.ticketSeq;g.board=[{id,a:79,b:18,coinTier:1,rarity:1,base:ticketBase(1),foodId:'pandesal'}];startTicket(id);
  const r=g.run;r.bakersBoost=boost;const original=rollStepCoin;let stepIndex=0;
  rollStepCoin=options=>options[stepIndex++%n];
  for(const step of r.steps){
   grantWorksheetStepCoin(r,step);
   for(const kind of worksheetActionKinds(step)){
    const id=worksheetActionId(r.worksheetRewards.attemptId,step.row,step.col,kind);
    r.worksheetRewards.actions[id]={id,row:step.row,col:step.col,kind};
   }
  }
  rollStepCoin=original;if(!completeWorksheetProcedure(r))throw Error('Unsealed fixture');
  if(!beginWorksheetSettlement())throw Error('Settlement refused');
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const root=document.querySelector('.worksheet-summary');
   if(document.querySelector('#worksheetFinalCoins').textContent!=='0'||getComputedStyle(root.querySelector('.summary-type')).visibility!=='hidden'||document.querySelector('#skipWorksheetSummary').hidden||getComputedStyle(document.querySelector('#skipWorksheetSummary')).position!=='absolute')throw Error('Incorrect opening state');
  }
  window.summaryTrace=[];window.summaryObserver?.disconnect();
  window.summaryObserver=new MutationObserver(()=>summaryTrace.push({phase:document.querySelector('.worksheet-summary')?.dataset.summaryPhase,value:document.querySelector('#worksheetFinalCoins')?.textContent}));
  summaryObserver.observe(document.querySelector('#worksheetFinalCoins'),{childList:true});
 }''',{'n':n,'boost':boost})

def bounds(p):
 result=p.evaluate('''()=>{
  const modal=document.querySelector('.worksheet-summary-modal'),body=modal.querySelector('.modalbody'),r=modal.getBoundingClientRect();
  const rect=s=>modal.querySelector(s).getBoundingClientRect(),art=rect('.summary-coin-types'),total=rect('.summary-total'),details=rect('.summary-details'),back=rect('.summary-actions');
  const row=rect('.summary-total-value'),num=rect('#worksheetFinalCoins');
  return {viewport:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,
   scroll:body.scrollHeight<=body.clientHeight+1&&body.scrollWidth<=body.clientWidth+1,
   ordered:art.bottom<=total.top&&total.bottom<=details.top&&details.bottom<=back.top,
   number:num.left>=row.left-1&&num.right<=row.right+1,
   groups:[...modal.querySelectorAll('.summary-type')].map(e=>{const a=e.getBoundingClientRect();return a.left>=r.left&&a.right<=r.right}),
   dims:[r.x,r.y,r.width,r.height,body.scrollHeight,body.clientHeight]};
 }''')
 assert result['viewport'] and result['scroll'] and result['ordered'] and result['number'] and all(result['groups']),result

def run(pw,engine):
 b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
 c=b.new_context(viewport={'width':2000,'height':1200},has_touch=True);p=c.new_page();errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 try:
  # Actual 79 x 18 connect/generate/place/carry/swipe sequence, then payout.
  g.setup(p,False)
  for _ in range(4):g.connect(p);g.generate(p);g.place_current(p)
  g.complete_addition(p,engine);wallet=p.evaluate('g.coins');p.locator('#collectRewards').click()
  finished(p);check_final(p);t=expected(p);assert p.evaluate('g.coins')==wallet
  p.locator('#acknowledgeWorksheetSummary').click();assert p.evaluate('g.coins')==wallet+t['total']
  assert not p.evaluate('acknowledgeWorksheetSummary()')
  # Each earned group and each exact intermediate base endpoint.
  for n in [1,2,3]:
   fixture(p,n);wallet=p.evaluate('g.coins');t=expected(p)
   assert p.locator('.summary-type').count()==n
   assert p.locator('.summary-type').evaluate_all('es=>es.every(e=>!/(containers|base coins)/.test(e.textContent))')
   p.wait_for_function("document.querySelector('.worksheet-summary').dataset.summaryPhase==='contribution'")
   shot(p,f'{engine}-{n}-contributions')
   finished(p);check_final(p);bounds(p)
   trace=p.evaluate('summaryTrace.map(e=>e.value)');subtotal=0
   for value in [v for v in t['subtotals'] if v>0]:
    subtotal+=value;assert p.evaluate('n=>fmt(n)',subtotal) in trace,(subtotal,trace)
   assert p.evaluate('g.coins')==wallet
   assert p.locator('.summary-quantity').all_text_contents()==p.evaluate('t=>t.counts.filter(v=>v>0).map(v=>"×"+fmt(v))',t)
   shot(p,f'{engine}-{n}-finished');p.locator('.worksheet-summary-modal .close').click()
   assert p.evaluate('g.coins')==wallet+t['total']
  # Skip at several causal stages; then ensure no old frame changes the result.
  for phase in ['containers','contribution','boost','final-total']:
   fixture(p);p.wait_for_function('phase=>document.querySelector(".worksheet-summary").dataset.summaryPhase===phase',arg=phase)
   wallet=p.evaluate('g.coins');p.locator('#skipWorksheetSummary').tap();check_final(p)
   final=p.locator('#worksheetFinalCoins').inner_text();p.wait_for_timeout(350)
   assert p.locator('#worksheetFinalCoins').inner_text()==final and p.evaluate('g.coins')==wallet
   p.locator('#acknowledgeWorksheetSummary').tap()
  # Close during animation grants exactly once, with no leftover animation or inert shell.
  for delay in [0,450,1800]:
   fixture(p);wallet=p.evaluate('g.coins');t=expected(p);p.wait_for_timeout(delay)
   p.locator('.worksheet-summary-modal .close').tap();p.wait_for_timeout(100)
   assert p.locator('.worksheet-summary').count()==0 and p.evaluate('worksheetSummaryView===null&&!$("app").inert')
   assert p.evaluate('g.coins')==wallet+t['total'];assert not p.evaluate('acknowledgeWorksheetSummary()')
  # Pending reload; reduced motion is an immediate stable final state.
  p.emulate_media(reduced_motion='reduce');fixture(p,2);finished(p);check_final(p)
  wallet=p.evaluate('g.coins');t=expected(p);p.reload();p.wait_for_selector('#acknowledgeWorksheetSummary:enabled');check_final(p)
  assert p.evaluate('g.coins')==wallet;p.locator('#acknowledgeWorksheetSummary').tap()
  assert p.evaluate('g.coins')==wallet+t['total'] and p.evaluate('!$("app").inert')
  # Compact landscapes, target tablets, portrait fallback and long exact totals.
  for n in [1,2,3]:
   for width,height in [(2000,1200),(1280,800),(1280,720),(1024,768),(960,540),(844,390),(640,360),(375,812)]:
    p.set_viewport_size({'width':width,'height':height});fixture(p,n,13391512345.6789);finished(p);bounds(p);check_final(p)
    shot(p,f'{engine}-{n}-{width}x{height}')
    p.locator('#acknowledgeWorksheetSummary').tap()
  # Failed persistence keeps a usable retry and exact unclaimed reward.
  fixture(p);wallet=p.evaluate('g.coins');t=expected(p)
  p.evaluate('()=>{window.savedSetter=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error("quota")}}')
  p.locator('.worksheet-summary-modal .close').tap();assert p.locator('#worksheetSettlementError').is_visible()
  assert p.evaluate('g.coins')==wallet and p.locator('#acknowledgeWorksheetSummary').is_enabled()
  p.evaluate('()=>{Storage.prototype.setItem=savedSetter}');p.locator('#acknowledgeWorksheetSummary').tap()
  assert p.evaluate('g.coins')==wallet+t['total']
  # External unmount disposes presentation; reopening the saved settlement is safe.
  p.emulate_media(reduced_motion='no-preference');fixture(p);wallet=p.evaluate('g.coins')
  p.evaluate('showModal("Other popup","<p>Replacement</p>")')
  p.wait_for_function('worksheetSummaryView===null');assert p.evaluate('!$("app").inert&&g.coins')==wallet
  p.evaluate('closeModal()');p.wait_for_selector('.worksheet-summary');p.locator('#skipWorksheetSummary').tap();check_final(p)
  p.keyboard.press('Escape');assert p.locator('.worksheet-summary').count()==0
  for width,height in [(2000,1200),(1280,800)]:
   p.set_viewport_size({'width':width,'height':height});shot(p,f'{engine}-home-{width}')
  gem=c.new_page();gem.goto(s.URL.rsplit('/',1)[0]+'/assets/bakery-ui/boost-prism.svg#still')
  assert gem.locator('.reflection').evaluate('e=>getComputedStyle(e).animationName')=='none'
  gem.goto(s.URL.rsplit('/',1)[0]+'/assets/bakery-ui/boost-prism.svg')
  assert gem.locator('.reflection').evaluate('e=>getComputedStyle(e).animationName')=='prism-shimmer'
  gem.close()
  assert not errors,errors
  print(f'PASS {engine}: actual carrying order, 1/2/3 groups, exact endpoints, skip/close/reload/unmount/retry, eight sizes and large totals',flush=True)
 except Exception:
  shot(p,f'{engine}-FAILURE');print('PAGE ERRORS',errors,flush=True);raise
 finally:c.close();b.close()

if __name__=='__main__':
 with s.sync_playwright() as pw:
  for engine in sys.argv[1:] or ['edge','webkit']:run(pw,engine)
 s.server.shutdown()
