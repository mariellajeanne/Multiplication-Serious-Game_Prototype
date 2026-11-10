"""Actual Orders: safe board layout, centered controls, die-cut slips and register."""
import importlib.util,json,sys,xml.etree.ElementTree as ET
from pathlib import Path
spec=importlib.util.spec_from_file_location('ui_support',Path(__file__).with_name('browser-ui-replacement.py'))
support=importlib.util.module_from_spec(spec);spec.loader.exec_module(support)
ROOT=support.ROOT;OUT=ROOT/'output/playwright/geometry/orders';OUT.mkdir(parents=True,exist_ok=True);support.OUT=OUT
def fixture(p):
 p.evaluate('''()=>{g.run=null;g.orderRuns={};g.board=Array.from({length:8},(_,rank)=>({id:9100+rank,rarity:rank,coinTier:rank,orderLabel:COIN_ORDER_LABELS[rank][1],orderIcon:COIN_ORDER_ICONS[rank],foodId:'pandesal',a:rank<3?79:rank<5?799:9876,b:rank?98:9,base:ticketBase(rank)}));render();save()}''')
 p.wait_for_function("[...document.querySelectorAll('#stage img')].every(i=>i.complete&&i.naturalWidth)")
def metrics(p):
 return p.evaluate('''()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}},stage=box('#stage'),board=box('#orders-board'),list=box('#order-scroller'),heading=box('.board-title'),utilities=box('.board-utilities'),register=box('.register-art');return {stage,board,list,heading,utilities,register}}''')
def run(pw,engine):
 b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
 c=b.new_context(viewport={'width':2000,'height':1200},has_touch=True);p=c.new_page();errors=[];scroll_metrics=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 try:
  p.goto(support.URL);p.wait_for_selector('.hub-ticket');p.wait_for_load_state('networkidle')
  support.screenshot(p,f'{engine}-starter-home')
  # Both presentations of the same refresh controller remain functional.
  p.evaluate('g.orderRefreshAt=0;updateOrderRefresh()')
  old_ids=p.evaluate('g.board.map(t=>t.id)')
  p.locator('#refreshOrders').tap()
  assert p.evaluate('g.board.map(t=>t.id)')!=old_ids
  assert p.locator('#refreshOrders').inner_text().startswith('Skip (')
  coins=p.evaluate('g.coins');p.locator('#refreshOrders').tap()
  assert p.locator('#modalTitle').inner_text()=='Refresh untouched orders?'
  p.locator('#modals .close').tap();assert p.evaluate('g.coins')==coins
  p.evaluate('g.orderRefreshAt=0;updateOrderRefresh()')
  fixture(p)
  path=ET.parse(ROOT/'assets/bakery-ui/order-ticket-mask.svg').getroot()[0].attrib['d']
  assert p.locator('.ticket-outer-edge').evaluate_all('es=>es.map(e=>e.getAttribute("d"))')==[path]*8
  assert p.locator('.ticket-cutout').evaluate_all('es=>es.every(e=>getComputedStyle(e).maskImage.includes("order-ticket-mask.svg")||getComputedStyle(e).webkitMaskImage.includes("order-ticket-mask.svg"))')
  assert p.locator('.ticket-play,.ticket-reward,.coin-hero small').count()==0
  for rank in range(8):
   ticket=p.locator(f'.hub-ticket.coin-tier-{rank}')
   assert ticket.locator('.ticket-sparkles').count()==int(rank>=4)
   assert ticket.locator('.ticket-rays').count()==int(rank>=3)
   assert ticket.locator('.ticket-light-sweep').count()==int(rank>=6)
   assert ticket.locator('.ticket-iridescence').count()==int(rank==7)
  for width,height in [(2000,1200),(1280,800),(1024,768)]:
   p.set_viewport_size({'width':width,'height':height});support.top(p,'#order-scroller');p.wait_for_timeout(100)
   m=metrics(p);s=m['stage'];r=m['register'];l=m['list'];bnd=m['board'];h=m['heading'];u=m['utilities']
   assert h['bottom']<=u['y'] and u['bottom']<l['y'],m
   assert u['bottom']<r['y']<l['bottom']<=bnd['bottom'],m
   assert abs(r['w']/s['w']*2000-280)<1,m
   assert s['y']+s['h']*.76<r['bottom']<s['y']+s['h']*.825,m
   assert p.locator('.register-art').get_attribute('src').endswith('cash-register-facing.png')
   assert p.locator('.ticket-safe-content').evaluate_all('''es=>es.every(e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return r.left>p.left+8&&r.right<p.right-8&&r.top>p.top&&r.bottom<p.bottom})''')
   assert p.locator('.order-math,.order-name,.hub-ticket-progress').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1)')
   assert p.locator('.board-utilities button').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height>=43.8)')
   # Board body aligns with the cabinet, clearing the window's left boundary.
   assert p.evaluate('''()=>{const stage=$('stage').getBoundingClientRect(),board=$('orders-board').getBoundingClientRect(),menu=$('menu-cabinet').getBoundingClientRect(),scale=stage.width/2000,cap=parseFloat(getComputedStyle($('orders-board')).getPropertyValue('--board-cap-height'));return Math.abs(board.top+cap*scale-menu.top)<1&&board.right<=stage.left+1850*scale}''')
   # Independent sections have real gaps; icon/text and both utility labels center.
   assert u['y']-h['bottom']>=11.9*s['w']/2000 and l['y']-u['bottom']>=17*s['w']/2000,m
   assert p.locator('.board-title svg,.board-title span,.board-utilities button>span').evaluate_all('''es=>es.every(e=>{const r=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return Math.abs((r.top+r.bottom-b.top-b.bottom)/2)<1&&(!e.parentElement.matches('button')||Math.abs((r.left+r.right-b.left-b.right)/2)<1)})''')
   # Three whole ticket objects, including their effect margins, fit at rest.
   assert p.evaluate('''()=>{const sc=$('order-scroller').getBoundingClientRect(),board=$('orders-board').getBoundingClientRect(),rail=$('board-scroll-rail').getBoundingClientRect(),scale=$('stage').getBoundingClientRect().width/2000,tickets=[...document.querySelectorAll('.hub-ticket')].map(e=>e.getBoundingClientRect());return tickets.filter(r=>r.top>=sc.top&&r.bottom<=sc.bottom).length===3&&tickets.every(r=>r.left>=sc.left+5*scale&&r.right<=sc.right-5*scale&&r.left>=board.left+40*scale&&r.right+10*scale<rail.left)&&['hidden','clip'].includes(getComputedStyle($('order-scroller')).overflowX)}''')
   assert p.locator('#boost-status').inner_text()==p.locator('#bakerBoost').inner_text()
   assert p.locator('#boost-status .boost-star').count()==1 and p.locator('.boost-caption,.boost-panel-bg').count()==0
   assert p.locator('.bakery-utility').evaluate_all('''es=>es.every(e=>{const s=getComputedStyle(e,'::before');return !s.backgroundImage.includes('url(')&&parseFloat(s.borderRadius)>=999&&parseFloat(s.borderTopWidth)>0&&s.boxShadow.includes('inset')})''')
   # Header anchors share a centerline, exact equal insets and content-sized Boost.
   assert p.evaluate("""()=>{const box=s=>document.querySelector(s).getBoundingClientRect(),cab=box('#menu-cabinet'),title=box('#menu-heading-global'),boost=box('#boost-status'),icon=box('.boost-star'),value=box('#bakerBoost'),scale=box('#stage').width/2000;return Math.abs((title.top+title.bottom-boost.top-boost.bottom)/2)<.1&&Math.abs((title.left-cab.left)-(cab.right-boost.right))<.1&&title.right+24*scale<=boost.left&&Math.abs(boost.width-(parseFloat(getComputedStyle(document.querySelector('.boost-star')).width)*scale+value.width+58*scale))<1&&icon.left>boost.left&&icon.right<boost.right&&icon.top>boost.top&&icon.bottom<boost.bottom}""")
   assert p.locator('.boost-star path').get_attribute('fill')=='url(#boost-rainbow)'
   assert p.locator('.board-front .board-title,.board-front .board-utilities').count()==2
   assert p.locator('.board-list').evaluate("e=>getComputedStyle(e).overflow==='hidden'&&parseFloat(getComputedStyle(e).borderTopLeftRadius)>0")
   assert p.evaluate("""()=>{const board=$('orders-board').getBoundingClientRect(),opening=document.querySelector('.board-list').getBoundingClientRect(),rail=$('board-scroll-rail').getBoundingClientRect(),scale=$('stage').getBoundingClientRect().width/2000;return rail.left>=opening.right&&rail.right<board.right&&Math.abs((rail.left+rail.right)/2-(board.right-24.5*scale))<.1}""")
   assert p.locator('.board-footer').evaluate_all("es=>es.every(e=>parseFloat(getComputedStyle(e,'::before').height)===46)")
   refresh_box=p.locator('#refreshOrders').bounding_box()
   p.evaluate('g.orderRefreshAt=orderNow()+180000;updateOrderRefresh()')
   assert p.locator('#refreshOrders').bounding_box()==refresh_box
   assert p.locator('#refreshOrders').evaluate('''e=>{const b=e.getBoundingClientRect(),r=e.firstElementChild.getBoundingClientRect();return e.classList.contains('is-skip')&&Math.abs((r.top+r.bottom-b.top-b.bottom)/2)<1&&Math.abs((r.left+r.right-b.left-b.right)/2)<1&&e.scrollWidth<=e.clientWidth}''')
   support.screenshot(p,f'{engine}-{width}-skip')
   p.evaluate('g.orderRefreshAt=0;updateOrderRefresh()')
   for rank in range(8):
    ticket=p.locator(f'.hub-ticket.coin-tier-{rank}');ticket.scroll_into_view_if_needed();p.wait_for_timeout(120)
    ticket.screenshot(path=str(OUT/f'{engine}-{width}-tier-{rank+1}.png'),animations='disabled')
   support.top(p,'#order-scroller');support.screenshot(p,f'{engine}-{width}-top')
   support.test_scroll(p,engine,'#order-scroller','#board-scroll-track','#board-scroll-thumb','[data-hub-action="order-down"]')
   # True endpoints and centering of both thumb target and visible artwork.
   for fraction in [0,.5,1]:
    p.locator('#order-scroller').evaluate('(e,f)=>e.scrollTop=f*(e.scrollHeight-e.clientHeight)',fraction);p.wait_for_timeout(150)
    mapping=p.evaluate("""()=>{const sc=$('order-scroller'),track=$('board-scroll-track').getBoundingClientRect(),thumb=$('board-scroll-thumb').getBoundingClientRect(),art=document.querySelector('#board-scroll-thumb .thumb-art').getBoundingClientRect(),fraction=sc.scrollTop/(sc.scrollHeight-sc.clientHeight);return {center:(thumb.left+thumb.right-track.left-track.right)/2,artCenter:(art.left+art.right-track.left-track.right)/2,error:thumb.top-track.top-fraction*(track.height-thumb.height),top:thumb.top-track.top,bottom:track.bottom-thumb.bottom}}""")
    scroll_metrics.append({'viewport':[width,height],'fraction':fraction,**mapping})
    assert abs(mapping['center'])<.001 and abs(mapping['artCenter'])<.001 and abs(mapping['error'])<.1,mapping
    if fraction==0:assert abs(mapping['top'])<.1,mapping
    if fraction==1:assert abs(mapping['bottom'])<.1,mapping
    support.screenshot(p,f'{engine}-{width}-scroll-{fraction}')
    p.locator('#orders-board').screenshot(path=str(OUT/f'{engine}-{width}-rail-{fraction}.png'),animations='disabled')
   # Overshoot both drag limits using real pointer capture.
   for end in ['top','bottom']:
    thumb=p.locator('#board-scroll-thumb').bounding_box();track=p.locator('#board-scroll-track').bounding_box()
    x=thumb['x']+thumb['width']/2
    p.mouse.move(x,thumb['y']+thumb['height']/2);p.mouse.down()
    p.mouse.move(x,track['y']-80 if end=='top' else track['y']+track['height']+80,steps=12);p.mouse.up();p.wait_for_timeout(140)
    assert p.locator('#order-scroller').evaluate("(e,end)=>Math.abs(e.scrollTop-(end==='top'?0:e.scrollHeight-e.clientHeight))<1",end)
   # Every ticket can be brought above the register, including the final slip.
   for rank in range(8):
    p.locator(f'.hub-ticket.coin-tier-{rank}').evaluate("e=>e.scrollIntoView({block:'start'})");p.wait_for_timeout(120)
    assert p.locator(f'.hub-ticket.coin-tier-{rank}').bounding_box()['y']+p.locator(f'.hub-ticket.coin-tier-{rank}').bounding_box()['height']<r['y']
   support.top(p,'#order-scroller')
   # Rounded corner hit testing proves the moving paper stays beneath the wood.
   assert p.evaluate("""()=>{const r=$('order-scroller').getBoundingClientRect();return !document.elementFromPoint(r.left+1,r.top+1)?.closest('.hub-ticket')}""")
   now=metrics(p);assert now['heading']==m['heading'] and now['utilities']==m['utilities'] and now['register']==m['register']
   support.screenshot(p,f'{engine}-{width}-scrolled')
  # Highest-tier motions preserve content bounds, and reduced motion disables them.
  p.set_viewport_size({'width':1280,'height':800});p.locator('.coin-tier-7').scroll_into_view_if_needed();p.wait_for_timeout(200)
  before=p.locator('.coin-tier-7 .ticket-safe-content').bounding_box();p.wait_for_timeout(350)
  assert p.locator('.coin-tier-7 .ticket-safe-content').bounding_box()==before
  assert p.locator('.coin-tier-7 .ticket-light-sweep').evaluate('e=>getComputedStyle(e).animationName')=='order-sweep'
  p.emulate_media(reduced_motion='reduce')
  assert p.locator('.ticket-sparkles i,.ticket-light-sweep,.ticket-iridescence').evaluate_all('es=>es.every(e=>getComputedStyle(e).animationName==="none")')
  support.screenshot(p,f'{engine}-reduced-motion');p.emulate_media(reduced_motion='no-preference')
  # Tap the actual reward-art region: the whole ticket starts its real worksheet.
  ticket=p.locator('.hub-ticket.coin-tier-3');box=ticket.bounding_box();ticket.tap(position={'x':box['width']*.17,'y':box['height']*.4});p.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===9103")
  assert p.locator('#worksheetFrame').get_attribute('src')=='worksheet/worksheet-engine.html'
  p.evaluate("window.orderFrame=$('worksheetFrame');window.orderBudget=g.run.budget")
  p.locator('.worksheet-exit').tap();p.locator('[data-ticket-id="9103"]').tap()
  assert p.evaluate("orderFrame===$('worksheetFrame')&&orderBudget===g.run.budget")
  p.locator('.worksheet-exit').tap();budget=p.evaluate('g.run.budget');p.reload();p.wait_for_selector('.hub-ticket')
  p.locator('[data-ticket-id="9103"]').tap();assert p.evaluate('g.run.budget')==budget
  assert not errors,errors
  (OUT/f'{engine}-results.json').write_text(json.dumps({'passed':True,'viewports':[[2000,1200],[1280,800],[1024,768]],'all_existing_tiers':8,'die_cut_mask_matches_artwork':True,'mouse_touch_scrollbar_keyboard':True,'stationary_heading_controls':True,'centered_title_and_utility_labels':True,'three_complete_contained_slips':True,'board_aligned_and_clear_of_window':True,'spark_and_multiplier_only':True,'css_button_corners':True,'refresh_and_paid_skip_cancel':True,'register_grounded_lower_board_overlap':True,'header_symmetric_and_content_sized':True,'thumb_centered_exact_endpoints':True,'reduced_motion':True,'original_worksheet_resume_reload':True,'scroll_metrics':scroll_metrics,'errors':errors},indent=2))
  print('PASS',engine,'order presentation: matched silhouettes, all tiers, scrolling, stationary controls, grounded register, reduced motion and original worksheet resume/reload',flush=True)
 except Exception:
  support.screenshot(p,f'{engine}-FAILURE');print('ERRORS',errors,flush=True);raise
 finally:b.close()
try:
 with support.sync_playwright() as pw:
  for engine in sys.argv[1:] or ['edge','webkit']:run(pw,engine)
finally:support.server.shutdown()
