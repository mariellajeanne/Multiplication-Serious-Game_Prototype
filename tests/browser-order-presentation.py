"""Production illustrated tickets: bounds, live data, scrolling and worksheet continuity."""
import importlib.util,json,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('ui_support',Path(__file__).with_name('browser-ui-replacement.py'))
support=importlib.util.module_from_spec(spec);spec.loader.exec_module(support)
ROOT=support.ROOT;OUT=ROOT/'output/playwright/orders-revision/checks';OUT.mkdir(parents=True,exist_ok=True);support.OUT=OUT

def fixture(p):
 p.evaluate('''()=>{g.run=null;g.orderRuns={};g.board=Array.from({length:8},(_,rank)=>({id:9100+rank,rarity:rank,coinTier:rank,orderLabel:COIN_ORDER_LABELS[rank][1],orderIcon:COIN_ORDER_ICONS[rank],foodId:'pandesal',a:rank<3?79:rank<5?799:9876,b:rank?98:9,base:ticketBase(rank)}));render();save()}''')
 p.wait_for_function("[...document.querySelectorAll('#stage img')].every(i=>i.complete&&i.naturalWidth)")

def run(pw,engine):
 b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
 c=b.new_context(viewport={'width':2000,'height':1200},has_touch=True);p=c.new_page();errors=[];scroll_metrics=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 try:
  p.goto(support.URL);p.wait_for_selector('.hub-ticket');p.wait_for_load_state('networkidle')
  p.evaluate('g.orderRefreshAt=0;updateOrderRefresh()');old_ids=p.evaluate('g.board.map(t=>t.id)')
  p.locator('#refreshOrders').tap();assert p.evaluate('g.board.map(t=>t.id)')!=old_ids
  assert p.locator('#refreshOrders').inner_text().startswith('Skip (')
  coins=p.evaluate('g.coins');p.locator('#refreshOrders').tap()
  assert p.locator('#modalTitle').inner_text()=='Refresh untouched orders?'
  p.locator('#modals .close').tap();assert p.evaluate('g.coins')==coins
  fixture(p)
  assert p.locator('.ticket-tier-plaque').all_text_contents()==p.evaluate('COIN_TIERS.map((_,rank)=>hubCoinTierName(rank))')
  assert len(set(p.locator('.ticket-frame-art').evaluate_all('es=>es.map(e=>e.src)')))==8
  assert p.locator('.ticket-play,.ticket-reward,.coin-hero small,.order-name,.order-type-icon,.order-tier').count()==0
  assert p.locator('.hub-ticket').evaluate_all('es=>es.every(e=>e.ariaLabel.includes("reward")&&e.ariaLabel.includes("complete"))')
  for width,height in [(2000,1200),(1280,800),(1024,768)]:
   p.set_viewport_size({'width':width,'height':height});support.top(p,'#order-scroller');p.wait_for_timeout(100)
   assert p.locator('.hub-ticket').evaluate_all('''es=>es.every(e=>{const r=e.getBoundingClientRect(),m=e.querySelector('.order-math'),q=e.querySelector('.hub-ticket-progress');return Math.abs(r.width/r.height-304/112)<.02&&m.scrollWidth<=m.clientWidth+1&&q.scrollWidth<=q.clientWidth+1})''')
   assert p.locator('.order-quantity').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1)')
   assert p.locator('.board-utilities button').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height>=43.8)')
   assert p.evaluate('''()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),head=r('.board-title'),utils=r('.board-utilities'),list=r('#order-scroller'),board=r('#orders-board'),reg=r('.register-art'),cab=r('#menu-cabinet'),stage=r('#stage');return head.bottom<=utils.top&&utils.bottom<list.top&&Math.abs(board.top+58*(stage.width/2000)-cab.top)<2&&board.right<stage.right&&reg.top<board.bottom&&reg.bottom<=stage.bottom&&list.bottom<=board.bottom}''')
   assert p.locator('.hub-ticket').evaluate_all('''es=>es.every(e=>{const r=e.getBoundingClientRect(),s=document.querySelector('#order-scroller').getBoundingClientRect();return r.left>s.left&&r.right<s.right&&Math.abs((r.left+r.right-s.left-s.right)/2)<1})''')
   assert p.locator('.hub-ticket').evaluate_all('''es=>es.every(e=>{const m=e.querySelector('.order-math').getBoundingClientRect(),q=e.querySelector('.hub-ticket-progress').getBoundingClientRect(),r=e.getBoundingClientRect();return Math.abs(m.left-q.left)<1&&m.top>r.top&&q.bottom<r.bottom})''')
   before=p.locator('.board-utilities').bounding_box();p.evaluate('g.orderRefreshAt=orderNow()+180000;updateOrderRefresh()')
   assert p.locator('.board-utilities').bounding_box()==before
   assert p.locator('#refreshOrders').inner_text().startswith('Skip (')
   for rank in range(8):
    ticket=p.locator(f'.hub-ticket.coin-tier-{rank}');ticket.evaluate("e=>e.scrollIntoView({block:'start'})");p.wait_for_timeout(100)
    # Full ticket, including its name plaque and lower ornament, clears the register.
    assert ticket.bounding_box()['y']+ticket.bounding_box()['height']<p.locator('.register-art').bounding_box()['y']
    ticket.screenshot(path=str(OUT/f'{engine}-{width}-tier-{rank+1}.png'),animations='disabled')
   support.top(p,'#order-scroller');support.screenshot(p,f'{engine}-{width}-top')
   support.test_scroll(p,engine,'#order-scroller','#board-scroll-track','#board-scroll-thumb','[data-hub-action="order-down"]')
   for fraction in [0,.5,1]:
    p.locator('#order-scroller').evaluate('(e,f)=>e.scrollTop=f*(e.scrollHeight-e.clientHeight)',fraction);p.wait_for_timeout(150)
    mapping=p.evaluate('''()=>{const sc=$('order-scroller'),track=$('board-scroll-track').getBoundingClientRect(),thumb=$('board-scroll-thumb').getBoundingClientRect(),art=document.querySelector('#board-scroll-thumb .thumb-art').getBoundingClientRect(),fraction=sc.scrollTop/(sc.scrollHeight-sc.clientHeight);return {center:(thumb.left+thumb.right-track.left-track.right)/2,artCenter:(art.left+art.right-track.left-track.right)/2,error:thumb.top-track.top-fraction*(track.height-thumb.height),top:thumb.top-track.top,bottom:track.bottom-thumb.bottom}}''')
    scroll_metrics.append({'viewport':[width,height],'fraction':fraction,**mapping})
    assert abs(mapping['center'])<.15 and abs(mapping['artCenter'])<.15 and abs(mapping['error'])<.15,mapping
    if fraction==0:assert abs(mapping['top'])<.1,mapping
    if fraction==1:assert abs(mapping['bottom'])<.1,mapping
   for end in ['top','bottom']:
    thumb=p.locator('#board-scroll-thumb').bounding_box();track=p.locator('#board-scroll-track').bounding_box();x=thumb['x']+thumb['width']/2
    p.mouse.move(x,thumb['y']+thumb['height']/2);p.mouse.down();p.mouse.move(x,track['y']-80 if end=='top' else track['y']+track['height']+80,steps=12);p.mouse.up();p.wait_for_timeout(140)
    assert p.locator('#order-scroller').evaluate("(e,end)=>Math.abs(e.scrollTop-(end==='top'?0:e.scrollHeight-e.clientHeight))<1",end)
   support.screenshot(p,f'{engine}-{width}-scrolled')
  p.set_viewport_size({'width':1280,'height':800});p.locator('.coin-tier-7').evaluate("e=>e.scrollIntoView({block:'start'})");p.wait_for_timeout(150)
  before=p.locator('.coin-tier-7 .ticket-safe-content').bounding_box();p.wait_for_timeout(350)
  assert p.locator('.coin-tier-7 .ticket-safe-content').bounding_box()==before
  assert p.locator('.coin-tier-7 .ticket-sparkles i').first.evaluate('e=>getComputedStyle(e).animationName')=='order-sparkle'
  p.emulate_media(reduced_motion='reduce')
  assert p.locator('.ticket-sparkles i').evaluate_all('es=>es.every(e=>getComputedStyle(e).animationName==="none")')
  support.screenshot(p,f'{engine}-reduced-motion')
  p.emulate_media(reduced_motion='no-preference')
  ticket=p.locator('.hub-ticket.coin-tier-3');ticket.evaluate("e=>e.scrollIntoView({block:'start'})");p.wait_for_timeout(120)
  box=ticket.bounding_box();ticket.tap(position={'x':box['width']*.2,'y':box['height']*.55})
  p.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===9103")
  assert p.locator('#worksheetFrame').get_attribute('src')=='worksheet/worksheet-engine.html'
  p.evaluate("window.orderFrame=$('worksheetFrame');window.orderBudget=g.run.budget")
  p.locator('.worksheet-exit').tap();p.locator('[data-ticket-id="9103"]').tap()
  assert p.evaluate("orderFrame===$('worksheetFrame')&&orderBudget===g.run.budget")
  p.locator('.worksheet-exit').tap();budget=p.evaluate('g.run.budget');p.reload();p.wait_for_selector('.hub-ticket');p.locator('[data-ticket-id="9103"]').tap()
  assert p.evaluate('g.run.budget')==budget
  assert not errors,errors
  (OUT/f'{engine}-results.json').write_text(json.dumps({'passed':True,'viewports':[[2000,1200],[1280,800],[1024,768]],'eight_distinct_illustrated_tiers':True,'ticket_size':[304,112],'all_tiers_clear_register':True,'mouse_touch_keyboard_scroll':True,'reduced_motion':True,'original_worksheet_resume_reload':True,'scroll_metrics':scroll_metrics,'errors':errors},indent=2))
  print('PASS',engine,'illustrated Orders: eight tiers, readable live math, ratio, clipping, pointer/touch/keyboard scroll, exact endpoints and worksheet continuity',flush=True)
 except Exception:
  support.screenshot(p,f'{engine}-FAILURE');print('ERRORS',errors,flush=True);raise
 finally:b.close()
try:
 with support.sync_playwright() as pw:
  for engine in sys.argv[1:] or ['edge','webkit']:run(pw,engine)
finally:support.server.shutdown()
