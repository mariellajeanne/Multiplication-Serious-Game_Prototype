"""Focused V16-latest tablet journeys. python tests/browser-tablet-repairs.py edge webkit"""
import importlib.util, sys
from pathlib import Path

spec=importlib.util.spec_from_file_location('completion',Path(__file__).with_name('browser-order-completion.py'))
completion=importlib.util.module_from_spec(spec);spec.loader.exec_module(completion)
s=completion.s
OUT=s.ROOT/'output/playwright/tablet-repairs';OUT.mkdir(parents=True,exist_ok=True)

def shot(p,name):p.screenshot(path=str(OUT/(name+'.png')))
def frame(p):return p.locator('#worksheetFrame').element_handle().content_frame()
def child(p,code):return frame(p).evaluate(code)
def ready(p):p.wait_for_function("typeof navigateBakery==='function' && document.getElementById('bakeryLoading')?.hidden")
def fixture(p,a,b,offered=False):
 p.evaluate('''({a,b,offered})=>{
  skipWholeBakeryGuide(true);closeModal();g.run=null;g.orderRuns={};g.mathPractice.facts={};g.mathPractice.steps=0;g.mathPractice.lastOffer=-100;
  const id=++g.ticketSeq;let found=false;
  for(let i=0;i<10000;i++){const seed='tablet-'+i;if(goldenChallengeOffer(a%10,b%10,emptyFactProfile(),{seed:seed+'/'+id+'/0:0',step:0}).offered===offered){g.mathPractice.seed=seed;found=true;break}}
  if(!found)throw Error('No deterministic offer fixture');
  g.board=[{id,a,b,coinTier:1,rarity:1,base:ticketBase(1),foodId:'pandesal'}];save();startTicket(id);
 }''',{'a':a,'b':10 if b==0 else b,'offered':offered})
 p.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===g.run.ticket.id")
 p.wait_for_timeout(100)

def drag(p,source,target,touch=False):
 a=source.bounding_box();b=target.bounding_box();assert a and b
 x=a['x']+a['width']/2;y=a['y']+a['height']/2
 ex=b['x']+b['width']/2;ey=b['y']+b['height']/2
 if touch:
  c=p.context.new_cdp_session(p);c.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  for i in range(1,13):c.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+(ex-x)*i/12,'y':y+(ey-y)*i/12}]})
  c.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});c.detach()
 else:
  p.mouse.move(x,y);p.mouse.down();p.mouse.move(ex,ey,steps=12);p.mouse.up()
 p.wait_for_timeout(120)

def connect(p,reverse=False,dragging=False,touch=False):
 st=child(p,'({row:s.row,k:s.k})');f=frame(p)
 top=f.locator(f'[data-top="{st["k"]}"]');bottom=f.locator(f'[data-bottom="{st["row"]}"]')
 source,target=(bottom,top) if reverse else (top,bottom)
 if dragging:drag(p,source,target,touch)
 else:source.click();target.click()
 f.locator('#equationReveal').wait_for(state='visible')

def generate(p,choice=None):
 f=frame(p);f.locator('#equationReveal').tap()
 if choice:f.locator(f'[data-golden-option="{choice}"]').tap()
 elif child(p,'s.goldenOffer&&!s.revealed'):f.locator('[data-golden-option="auto"]').tap()
 if choice=='manual':p.wait_for_selector('.calculation-keypad')
 else:p.wait_for_function("$('worksheetFrame').contentWindow.eval('s.revealed')")

def place(p,dragging=False,touch=False):
 st=child(p,'({row:s.row,k:s.k,incoming:s.incoming,mixed:s.mixed,last:lastDigit(),tens:tens()})');f=frame(p)
 row=st['row'];k=st['k']
 if st['incoming'] and not st['mixed']:
  f.locator(f'[data-carry="{k}"]').click();f.locator('[data-part="ones"]').click()
  p.wait_for_function("$('worksheetFrame').contentWindow.eval('s.mixed')")
  st['tens']=child(p,'tens()')
 for part in ['ones']+(['tens'] if st['tens'] else []):
  source=f.locator(f'[data-part="{part}"]')
  target=f.locator(f'[data-slot="{row}:{row+k+(part=="tens")}"]' if part=='ones' or st['last'] else f'[data-carry="{k+1}"]')
  if dragging:drag(p,source,target,touch)
  else:source.click();target.click()
 p.wait_for_timeout(350)

def worksheet(p,engine):
 touch=engine=='edge'
 for a,b,reverse in [(9,0,False),(6,7,False),(6,7,True)]:
  fixture(p,a,b);connect(p,reverse,True,touch)
  assert frame(p).locator('#equationReveal').inner_text()==f'{b if reverse else a} × {a if reverse else b}'
  generate(p);assert p.locator('#generateAnswer').count()==0
  assert frame(p).locator('[data-part]').all_text_contents()==(['0'] if b==0 else ['4','2'])
  shot(p,f'{engine}-{a}x{b}-tiles-{reverse}');place(p,True,touch)
  assert child(p,'s.done')==1
 for choice in ['auto','manual']:
  fixture(p,6,7,True);connect(p);generate(p,choice)
  if choice=='manual':
   assert p.locator('.calculation-keypad button').count()==12
   for digit in '42':p.locator(f'[data-calc-key="{digit}"]').click()
   p.locator('[data-calc-key="Enter"]').click()
   p.wait_for_function('g.run.factAnswers["0:0"].status==="success"')
   p.wait_for_function("$('worksheetFrame').contentWindow.eval('s.revealed')")
  assert frame(p).locator('[data-part]').all_text_contents()==['4','2'];place(p,True,touch)
  assert child(p,'s.done')==1
 fixture(p,79,18);connect(p);generate(p);place(p,True,touch)
 p.locator('[data-worksheet-control="undo"]').click();p.wait_for_timeout(200)
 assert child(p,'s.done')==0
 frame(p).locator('[data-part="tens"]').click();frame(p).locator('[data-carry="1"]').click();p.wait_for_timeout(300)
 assert child(p,'s.done')==1
 before=child(p,'JSON.stringify(s)');p.locator('.worksheet-exit').click()
 p.evaluate('navigateBakery("orders")');p.locator('[data-ticket-id]').first.click()
 p.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===g.run.ticket.id")
 assert child(p,'JSON.stringify(s)')==before
 p.reload();ready(p);p.wait_for_selector('#worksheetFrame');p.wait_for_timeout(200)
 assert child(p,'JSON.stringify(s)')==before
 for guide in [False,True]:
  p.evaluate('(v)=>{if(g.tutorialArrows!==v)toggleArrows()}',guide)
  p.wait_for_timeout(100);assert child(p,'tutorial')==guide
 while child(p,'s.phase')!='sum':connect(p);generate(p);place(p,True,touch)
 assert child(p,'s.done')==4
 completion.g.complete_addition(p,engine)
 assert p.evaluate('g.run.procedureComplete')
 p.locator('#collectRewards').click();completion.finished(p)
 totals=p.evaluate('g.run.settlement');wallet=p.evaluate('g.coins')
 p.locator('#acknowledgeWorksheetSummary').click()
 assert p.evaluate('g.coins')==wallet+totals['total']
 assert not p.evaluate('acknowledgeWorksheetSummary()')
 p.evaluate("setGameLanguage('tl')");p.reload();ready(p);fixture(p,6,7,True);connect(p)
 frame(p).locator('#equationReveal').click()
 assert 'Subukan Mo Muna' in frame(p).locator('[data-golden-option="manual"]').inner_text()
 assert frame(p).locator('[data-golden-option="auto"]').inner_text()=='Ipakita ang Sagot'
 p.evaluate("setGameLanguage('en');abandonTicket()");p.reload();ready(p)
 print(f'PASS {engine} P0: pointer connect/generate/drag/place 9x0, 6x7 both directions, Golden auto/manual, 79x18 carry, Undo, reopen/reload, guides, swipe/add and one claim',flush=True)

def guide(p,engine):
 # The six-task tutorial (f843056) replaced the older data-step tour; its full
 # timed journey is tests/browser-six-task-tutorial.py. This keeps P1's intents:
 # reset starts it, unrelated input is blocked, reload resumes, Show Me replays,
 # skip persists and a missing target never traps the child.
 status=lambda:p.evaluate('window.panaderyaTutorialStatus?.()')
 phase=lambda ph:p.wait_for_function('ph=>window.panaderyaTutorialStatus?.()?.phase===ph',arg=ph)
 p.evaluate('closeModal()');p.locator('#settings-button').click();p.locator('.adult-tools summary').click()
 p.once('dialog',lambda d:d.accept());p.get_by_role('button',name='Erase progress…',exact=True).click()
 ready(p);phase('intro')
 assert p.evaluate('g.completed===0&&g.coins===250&&g.owned.length===0&&g.menuSlots===0')
 p.locator('[data-world-nav="orders"]').dispatch_event('click');p.wait_for_timeout(250)
 assert p.evaluate('bakeryPage')=='menu' and status()['phase']=='intro'
 for _ in range(5):p.locator('[data-tour="next"]').dispatch_event('click')
 assert status()['revealed']==1,'reading interval must not be skippable'
 for _ in range(6):
  p.wait_for_function('!document.querySelector("[data-tour=next]").disabled');p.locator('[data-tour="next"]').click()
 phase('nav-orders');p.reload();ready(p);phase('nav-orders')
 p.wait_for_function('!window.panaderyaTutorialStatus().celebrating');p.locator('[data-world-nav="orders"]').click();phase('ticket')
 shot(p,engine+'-guide')
 p.locator('[data-tour="skip"]').click();assert status() is None
 assert p.evaluate('localStorage.panaderyaWholeGameTourV2')=='skipped'
 p.reload();ready(p);p.wait_for_timeout(750);assert status() is None
 p.locator('#settings-button').click();p.get_by_role('button',name='Show Me',exact=True).click();phase('intro')
 for _ in range(6):
  p.wait_for_function('!document.querySelector("[data-tour=next]").disabled');p.locator('[data-tour="next"]').click()
 phase('nav-orders');p.evaluate("document.querySelectorAll('[data-world-nav=\"orders\"]').forEach(e=>e.remove())")
 p.wait_for_timeout(250);skip=p.locator('[data-tour="skip"]');assert skip.is_visible()
 r=skip.bounding_box();hit=p.evaluate('([x,y])=>!!document.elementFromPoint(x,y)?.closest("[data-tour=skip]")',[r['x']+r['width']/2,r['y']+r['height']/2]);assert hit
 skip.click();assert status() is None
 print(f'PASS {engine} P1: reset starts the six-task tutorial, unrelated input blocked, unskippable reading, reload/resume, Show Me replay, persistent skip, missing-target escape',flush=True)

def presentation(p,engine):
 p.evaluate('skipWholeBakeryGuide(true);closeModal();g.run=null;g.orderRuns={};render()')
 for n in [1,2,3]:
  completion.fixture(p,n)
  assert p.locator('.summary-type').count()==n
  assert p.locator('#acknowledgeWorksheetSummary').is_disabled()
  p.wait_for_function("document.querySelector('.worksheet-summary')?.dataset.summaryPhase==='boost'")
  assert p.locator('.summary-boost').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)>=38')
  assert p.locator('.worksheet-summary').evaluate("e=>['none','normal'].includes(getComputedStyle(e,'::before').content)")
  # Order Complete now has a properly dimmed backdrop (QA requirement), still without blur.
  assert p.locator('.bakery-popup-backdrop:has(.worksheet-summary)').evaluate("e=>{const m=getComputedStyle(e).backgroundColor.match(/rgba?\(([^)]+)\)/);return !!m&&Number((m[1].split(',')[3]??'1').trim())>=.45&&getComputedStyle(e).backdropFilter==='none'}")
  shot(p,f'{engine}-summary-{n}-boost')
  completion.finished(p);completion.check_final(p);completion.bounds(p)
  total=p.evaluate('g.run.settlement.total');wallet=p.evaluate('g.coins')
  shot(p,f'{engine}-summary-{n}-final');p.locator('#acknowledgeWorksheetSummary').click()
  assert p.evaluate('g.coins')==wallet+total
 p.evaluate('''()=>{
  g.run=null;g.orderRuns={};g.owned=FOOD.map((f,i)=>({uid:i+1,id:f.id,level:1,fusion:1,spent:0}));
  g.discovered=FOOD.map(f=>f.id);g.menuSlots=8;g.activeMenu=g.owned.slice(0,8).map(o=>o.uid);g.uidNext=18;
  g.board=Array.from({length:8},(_,rank)=>({id:++g.ticketSeq,a:79,b:18,coinTier:rank,rarity:rank,base:ticketBase(rank),foodId:g.owned[rank].id}));
  g.coins=1e9;g.packageCelebrations.acknowledged=PACKAGE_SHOP.map(t=>t.rank);save();render();navigateBakery('orders');
 }''')
 p.wait_for_function('!bakeryJourney')
 tickets=p.locator('.scene-ticket');assert tickets.count()==8
 for i in [0,3,7]:
  ticket=tickets.nth(i);ticket.scroll_into_view_if_needed()
  assert ticket.locator('.scene-coin-star-badge').inner_text()==f'{i+1} ★'
  assert ticket.evaluate('''e=>{const r=e.getBoundingClientRect(),b=e.querySelector('.scene-coin-star-badge').getBoundingClientRect();return b.left>=r.left&&b.top>=r.top&&b.right<=r.right&&b.bottom<=r.bottom}''')
  assert ticket.locator('svg.scene-reward-image').count()==1
  shot(p,f'{engine}-orders-tier-{i+1}')
 p.locator('[data-world-nav="menu"]').click();p.wait_for_function('!bakeryJourney')
 assert p.locator('.scene-food-card.hub-food').count()==8
 for width,height in [(2000,1200),(1280,800)]:
  p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(150);shot(p,f'{engine}-menu-{width}')
 p.set_viewport_size({'width':2000,'height':1200})
 p.locator('.scene-equip-best').click()
 assert p.locator('.collection-grid').count()==0 and p.evaluate('g.activeMenu.length')==8
 p.locator('.view-all-foods').click();p.locator('.collection-card').first.wait_for()
 assert p.locator('.collection-grid img.food-art').evaluate_all('es=>es.length===17&&es.every(e=>e.complete&&e.naturalWidth>0)')
 assert p.locator('.collection-toolbar-actions').evaluate('''e=>{const a=e.querySelector('.collection-browse-controls').getBoundingClientRect(),b=e.querySelector('.collection-equip-pill').getBoundingClientRect();return (a.bottom<=b.top||a.right<=b.left)&&e.scrollWidth<=e.clientWidth+1}''')
 assert p.locator('.collection-popup-head').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
 p.get_by_label('Sort foods',exact=True).select_option('name')
 assert p.locator('.collection-card-name').first.inner_text()==p.evaluate('getHubCollectionFoods().map(o=>F(o.id).name)[0]')
 p.get_by_label('Filter foods',exact=True).select_option('unequipped');assert p.locator('.collection-card').count()==9
 p.get_by_label('Filter foods',exact=True).select_option('all')
 grid=p.locator('.collection-grid');r=grid.bounding_box();p.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);p.mouse.wheel(0,500);p.wait_for_timeout(150)
 assert grid.evaluate('e=>e.scrollTop')>0
 grid.evaluate('e=>e.scrollTop=0');shot(p,engine+'-collection')
 p.locator('.food-card-target').first.click();p.locator('.food-collection-detail-backdrop').wait_for()
 assert p.locator('.collection-grid').count()==1
 p.locator('.food-panel-close').click()
 p.locator('.collection-index').click();p.get_by_role('button',name='View food',exact=True).first.click()
 p.locator('.food-collection-detail-backdrop').wait_for();assert p.locator('.collection-grid').count()==1
 p.locator('.food-panel-close').click();p.locator('.hub-collection-back').click()
 p.locator('.scene-food-card.hub-food').first.click();p.locator('.food-direct-backdrop').wait_for()
 assert p.locator('.collection-grid').count()==0
 shot(p,engine+'-food-detail');p.locator('.food-panel-close').click()
 p.evaluate('openIndex()');p.get_by_role('button',name='View food',exact=True).first.click()
 assert p.locator('.collection-grid').count()==0;p.locator('.food-panel-close').click()
 p.locator('#settings-button').click()
 assert p.locator('.baker-number-prefix').evaluate('e=>{const n=document.querySelector("#bakerName").getBoundingClientRect(),r=e.getBoundingClientRect(),s=e.parentElement.getBoundingClientRect();return r.left>=n.right-1&&r.right<=s.right}')
 panel=p.locator('.settings-modal .popup-body');panel.evaluate('e=>e.scrollTop=e.scrollHeight')
 before=panel.evaluate('e=>e.scrollTop')
 p.get_by_role('button',name='Guide arrows',exact=True).click();p.wait_for_timeout(80)
 assert abs(p.locator('.settings-modal .popup-body').evaluate('e=>e.scrollTop')-before)<2
 shot(p,engine+'-settings-bottom');p.locator('.settings-modal .close').click()
 p.locator('[data-world-nav="packages"]').click();p.wait_for_function('!bakeryJourney')
 for n in [1,5,10]:
  p.locator(f'[data-world-buy="{n}"]').click();p.wait_for_selector('#packageBatch')
  assert not p.locator('#packageBatchCollect').is_visible()
  assert p.evaluate('finishPackageBatch()') is False
  p.wait_for_function("[...document.querySelectorAll('.batch-reward')].length>0&&[...document.querySelectorAll('.batch-reward')].every(e=>e.dataset.phase==='settled')",timeout=25000)
  assert p.locator('.batch-reward').count()==n
  assert p.locator('.batch-reward').evaluate_all('''es=>es.every(e=>{const r=s=>e.querySelector(s).getBoundingClientRect(),food=r('.batch-food>.food-art'),chips=r('.batch-card-indicators'),name=r('.batch-reward-copy');return food.top>=chips.bottom&&food.bottom<=name.top+1&&Math.abs((food.top+food.bottom)/2-(chips.bottom+name.top)/2)<20})''')
  assert p.locator('.batch-reward-copy>strong').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1)')
  shot(p,f'{engine}-packages-{n}');p.locator('#packageBatchCollect').click();p.wait_for_selector('#packageBatch',state='detached')
 print(f'PASS {engine} P2/P3: 1/2/3-coin bright rewards and exact Boost payout; ticket tiers 1/4/8; Menu 2000/1280; collection scroll/sort/filter/detail; Settings toggle scroll; natural x1/x5/x10 package reveals',flush=True)

def run(pw,engine):
 b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge',headless=True)
 c=b.new_context(viewport={'width':2000,'height':1200},has_touch=True);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 try:
  p.goto(s.URL);ready(p)
  if '--ui-only' not in sys.argv:worksheet(p,engine)
  if '--p0-only' not in sys.argv:
   if '--ui-only' not in sys.argv:guide(p,engine)
   presentation(p,engine)
  assert not errors,errors
 except Exception:
  shot(p,engine+'-failure');print('ERRORS',errors,flush=True);raise
 finally:c.close();b.close()

if __name__=='__main__':
 try:
  with s.sync_playwright() as pw:
   for engine in [x for x in sys.argv[1:] if not x.startswith('--')] or ['edge','webkit']:run(pw,engine)
 finally:s.server.shutdown()
