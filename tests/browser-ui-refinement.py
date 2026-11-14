"""Rendered refinement checks in the actual root app, with real controllers."""
import functools, http.server, json, os, sys, threading
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(ROOT/'.test-tools/browsers'))
from playwright.sync_api import sync_playwright
OUT=ROOT/'output/playwright/refinement';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}/index.html'
def shot(p,name):
 p.wait_for_timeout(160);p.screenshot(path=str(OUT/(name+'.png')),animations='disabled')
def popup_checks(p):
 popup=p.locator('.bakery-popup:visible').last
 assert popup.locator('.popup-surface,.popup-heading').count()==0
 assert popup.evaluate('e=>getComputedStyle(e).borderImageSource.includes("popup-frame.svg")')
 assert popup.locator('.popup-body').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
 assert popup.evaluate('e=>{const r=e.getBoundingClientRect();return r.top>=10&&r.bottom<=innerHeight-10&&r.left>=10&&r.right<=innerWidth-10}')
 controls=popup.locator('button:visible,select:visible').evaluate_all('''es=>es.map(e=>({text:e.innerText||e.ariaLabel,r:e.getBoundingClientRect()})).filter(e=>e.r.width<43.8||e.r.height<43.8).map(e=>({text:e.text,w:e.r.width,h:e.r.height}))''')
 assert not controls,controls
def run(pw,engine):
 b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
 c=b.new_context(viewport={'width':1280,'height':800},has_touch=True);p=c.new_page();errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 try:
  p.goto(URL);p.wait_for_selector('.hub-food');p.wait_for_load_state('networkidle')
  assert p.locator('#title-sign').get_attribute('src').endswith('illustrated/title.png')
  for selector,asset in [('#help-button','help.png'),('#settings-button','settings.png')]:
   assert p.locator(selector+' img').get_attribute('src').endswith(asset)
   rect=p.locator(selector).bounding_box();p.locator(selector).dispatch_event('pointerdown',{'pointerId':9,'pointerType':'touch'})
   assert p.locator(selector).bounding_box()==rect
   p.locator(selector).dispatch_event('pointercancel',{'pointerId':9,'pointerType':'touch'})
   assert not p.locator(selector).evaluate('e=>e.classList.contains("is-pressed")')
  for width,height in [(2000,1200),(1280,800),(1024,768)]:
   p.set_viewport_size({'width':width,'height':height})
   assert p.locator('#title-sign').evaluate('e=>{const r=e.getBoundingClientRect(),c=document.querySelector("#menu-cabinet").getBoundingClientRect(),h=document.querySelector(".cabinet-header").getBoundingClientRect(),stage=document.querySelector("#stage").getBoundingClientRect(),top=r.top+r.height*29/725,bottom=r.top+r.height*705/725;return Math.abs((r.left+r.right-c.left-c.right)/2)<1&&top>=stage.top&&bottom<h.top}')
   assert p.locator('#boost-status').evaluate('e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest("#boost-status")===e}')
   targets=p.locator('#help-button,#settings-button,.board-footer,.board-scroll-end').evaluate_all('es=>es.every(e=>{const r=e.getBoundingClientRect(),hit=getComputedStyle(e,"::after"),scale=document.querySelector("#stage").getBoundingClientRect().width/2000;return Math.max(r.width,(parseFloat(hit.width)||0)*scale)>=43.8&&Math.max(r.height,(parseFloat(hit.height)||0)*scale)>=43.8})')
   assert targets,'Tablet touch targets shrank with the scene'
   shot(p,f'{engine}-{width}-home')
   for selector in ['#help-button','#settings-button','#boost-status','#wallet-button','[data-hub-action="odds"]']:
    p.locator(selector).tap();popup_checks(p)
    if selector=='#help-button':assert p.locator('.help-steps li').count()==4
    shot(p,f'{engine}-{width}-{selector.strip("#[]").replace(chr(34),"").replace("=", "-")}')
    p.locator('#modals .close').tap()
   p.locator('.nav-collection').tap();popup_checks(p)
   assert p.locator('.collection-modal').bounding_box()['width']<=901
   assert p.locator('.menu-grid').evaluate('e=>e.scrollHeight<=e.clientHeight+2')
   shot(p,f'{engine}-{width}-starter-collection')
   p.locator('.food-card-target').first.tap();popup_checks(p);shot(p,f'{engine}-{width}-food-detail')
   assert p.locator('.food-panel-actions').evaluate('e=>{const r=e.getBoundingClientRect();return r.bottom<=innerHeight-10}')
   p.locator('.food-panel-close').tap();p.locator('.hub-collection-back').tap()
  # Saved settings are operated through their original controllers.
  p.set_viewport_size({'width':1280,'height':800});p.locator('#settings-button').tap()
  before=p.evaluate('({sound:g.sound,guide:g.tutorialArrows,music:g.musicOn})')
  for label,key in [('Sounds','sound'),('Guide','tutorialArrows'),('Music','musicOn')]:
   p.get_by_role('button',name=label,exact=True).tap()
   assert p.evaluate('key=>JSON.parse(localStorage.panaderyaQuestV2)[key]',key)!=before[{'sound':'sound','tutorialArrows':'guide','musicOn':'music'}[key]]
   p.get_by_role('button',name=label,exact=True).tap()
  p.locator('#modals .close').tap()
  # All eight existing types, including widest 4-by-2 digit problems.
  p.evaluate('''()=>{g.board=Array.from({length:8},(_,rank)=>({id:9900+rank,rarity:rank,coinTier:rank,orderLabel:COIN_ORDER_LABELS[rank][1],orderIcon:COIN_ORDER_ICONS[rank],a:rank<3?79:rank<5?799:7999,b:rank?99:9,foodId:'pandesal',base:ticketBase(rank)}));render()}''')
  assert p.locator('.hub-ticket').count()==8
  assert p.locator('.ticket-play,.ticket-reward,.coin-hero small').count()==0
  assert p.locator('.hub-ticket .order-name,.hub-ticket .order-type-icon,.hub-ticket .order-tier').count()==0
  assert p.locator('.hub-ticket').evaluate_all('es=>es.every(e=>e.ariaLabel.includes("Order")||e.ariaLabel.includes("Feast"))')
  assert p.locator('.hub-ticket .hub-ticket-progress').count()==8
  assert p.locator('.hub-ticket .order-math').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)')
  for rank in [0,3,6,7]:
   p.locator(f'.hub-ticket.coin-tier-{rank}').scroll_into_view_if_needed();shot(p,f'{engine}-tier-{rank+1}')
  p.locator('.hub-ticket').first.tap();p.wait_for_selector('#worksheetFrame')
  p.wait_for_function("$('worksheetFrame').contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===9900")
  assert p.locator('#worksheetFrame').get_attribute('src')=='worksheet/worksheet-engine.html'
  p.evaluate("window.refinementFrame=$('worksheetFrame');window.refinementBudget=g.run.budget")
  p.locator('.worksheet-exit').tap();assert p.locator('.hub-ticket-progress').first.inner_text().startswith('Resume')
  p.locator('.hub-ticket').first.tap();assert p.evaluate("refinementFrame===$('worksheetFrame')&&refinementBudget===g.run.budget")
  p.locator('.worksheet-exit').tap()
  # Paid refresh is still confirmed and never drops a started order.
  p.evaluate('g.coins=1e6;g.orderRefreshAt=orderNow()+180000;render()')
  assert p.locator('#refreshOrders').inner_text().startswith('Skip (')
  p.locator('#refreshOrders').tap();popup_checks(p);shot(p,f'{engine}-refresh-confirmation')
  assert p.locator('.popup-small').is_visible();p.locator('#modals .close').tap()
  # The external receipt uses the new popup; claim accounting stays original.
  p.evaluate('g.run.phase="claim";g.run.paused=false;g.run.pool=g.run.budget;save();render();window.receiptWallet=g.coins;window.receiptBudget=g.run.budget')
  p.locator('.claim-screen .primary').tap();popup_checks(p)
  assert p.evaluate('g.coins===receiptWallet+receiptBudget')
  assert not p.evaluate('prizeItems()')
  assert p.locator('.coin-order-reward .coin-reward-total').inner_text().startswith('+')
  shot(p,f'{engine}-completed-order-receipt');p.locator('#modals .close').tap()
  # Full inventory and contribution list use real model values.
  p.evaluate("g.run=null;g.orderRuns={};g.owned=FOOD.map((f,i)=>({uid:i+1,id:f.id,level:1,fusion:1,spent:0}));g.activeMenu=g.owned.map(o=>o.uid);g.menuSlots=17;g.discovered=FOOD.map(f=>f.id);render()")
  p.locator('#boost-status').tap();popup_checks(p);assert p.locator('.boost-food-list>div').count()==17
  shot(p,f'{engine}-full-boost');p.locator('#modals .close').tap()
  p.locator('.nav-collection').tap();popup_checks(p);assert p.locator('.collection-card').count()==17
  shot(p,f'{engine}-full-collection')
  p.get_by_role('button',name='Select Foods',exact=True).tap();p.get_by_role('button',name='Select All',exact=True).tap();popup_checks(p)
  assert p.evaluate('selectedFoods.size')==17
  shot(p,f'{engine}-bulk-food-actions');p.locator('.food-panel-close').tap()
  p.locator('.food-card-target').first.tap();popup_checks(p)
  p.locator('.action-sell').tap();popup_checks(p);shot(p,f'{engine}-sale-confirmation');p.locator('#modals .close').tap()
  p.locator('.food-panel-close').tap();p.get_by_role('button',name='Food Index',exact=True).tap();popup_checks(p);shot(p,f'{engine}-food-index');p.locator('#modals .close').tap();p.locator('.hub-collection-back').tap()
  assert not errors,errors
  (OUT/f'{engine}-results.json').write_text(json.dumps({'passed':True,'viewports':[[2000,1200],[1280,800],[1024,768]],'eight_existing_order_types':True,'real_worksheet_resume':True,'popup_minimum_targets':44,'settings_persistence':True,'errors':errors},indent=2))
  print('PASS',engine,'refinement: all eight tiers, clean responsive popups, 44px controls, settings, original worksheet resume and real inventory',flush=True)
 except Exception:
  shot(p,f'{engine}-FAILURE');print('ERRORS',errors,flush=True);raise
 finally:b.close()
try:
 with sync_playwright() as pw:
  for engine in sys.argv[1:] or ['edge','webkit']:run(pw,engine)
finally:server.shutdown()
