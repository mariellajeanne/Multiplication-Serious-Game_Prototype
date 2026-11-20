"""Production three-page world: geometry, camera path, controls and durable actions.
Run: python tests/browser-world.py edge webkit
Artifacts are kept under ignored output/playwright/bakery-world.
"""
import functools
import http.server
import json
import os
from pathlib import Path
import sys
import threading

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(ROOT/'.test-tools/browsers'))
from playwright.sync_api import sync_playwright
from PIL import Image
OUT=ROOT/'output/playwright/approved';OUT.mkdir(parents=True,exist_ok=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}/index.html'

def settle(page):
 page.wait_for_function('!bakeryJourney');page.wait_for_timeout(160)

def navigate(page,name):
 if page.evaluate('bakeryPage')!=name:page.locator(f'[data-world-nav="{name}"]').tap()
 settle(page)
 assert page.evaluate('bakeryPage')==name

def capture(page,name):
 page.wait_for_function('[...document.querySelectorAll("#app img")].every(i=>i.complete&&i.naturalWidth)')
 page.screenshot(path=str(OUT/(name+'.png')))

def check_geometry(page,compact=False):
 # Derive visible bounds from actual PNG alpha, including transparent source margins.
 visible=[]
 for name,selector in [('packages','.faithful-packages'),('menu','.faithful-menu'),('orders','.faithful-orders')]:
  im=Image.open(ROOT/f'assets/bakery-runtime/{name}-frame.webp')
  assert im.mode=='RGBA' and im.getchannel('A').getextrema()==(0,255)
  bounds=im.getchannel('A').point(lambda a:255 if a>127 else 0).getbbox()
  frame=page.locator(selector+' > .scene-frame')
  r=frame.bounding_box()
  assert abs(r['width']/r['height']-im.width/im.height)<.003,(name,'stretched artwork')
  visible.append({'left':r['x']+r['width']*bounds[0]/im.width,'right':r['x']+r['width']*bounds[2]/im.width,'bottom':r['y']+r['height']*bounds[3]/im.height})
 scale=page.evaluate('parseFloat(getComputedStyle(document.body).getPropertyValue("--bakery-scale"))')
 gaps=[(visible[i+1]['left']-visible[i]['right'])/scale for i in range(2)]
 assert all(abs(gap-220)<3 for gap in gaps),('visible station gaps',gaps)
 assert abs(gaps[0]-gaps[1])<3,('unequal visible gaps',gaps)
 assert page.locator('#stage,.scene-page,.world-track').evaluate_all('es=>es.every(e=>getComputedStyle(e).overflowX==="visible")'),'outer artwork trapped in a clipping container'
 current=page.evaluate('BAKERY_PAGES.indexOf(bakeryPage)')
 assert abs((visible[current]['left']+visible[current]['right'])/2-page.viewport_size['width']/2)<2
 if not compact:
  # Closer framing allows decorative bases behind the fixed navigation.
  nav_top=page.locator('.scene-nav').bounding_box()['y']
  content={'menu':'.view-all-foods','packages':'.purchase-options','orders':'.scene-order-scroll'}
  safe=page.locator(content[page.evaluate('bakeryPage')]).bounding_box()
  assert safe['y']+safe['height']<nav_top-8,'navigation obscures content'
 assert page.locator('.scene-ticket-progress').evaluate_all('es=>es.every(e=>{const r=e.getBoundingClientRect();return [...e.querySelectorAll("span,b")].every(c=>{const a=c.getBoundingClientRect();return a.left>=r.left&&a.right<=r.right&&a.top>=r.top&&a.bottom<=r.bottom})})'),'progress label outside bar'
 for selector in ['.scene-utility']:
  assert page.locator(selector).evaluate_all('es=>es.every(e=>{const r=e.getBoundingClientRect(),h=parseFloat(getComputedStyle(e,"::after").height)||0;return Math.max(r.height,h*r.width/e.offsetWidth)>=43.8})'),'small utility touch target'

def check_scroll(page,container,thumb,track,engine):
 sc=page.locator(container);sc.evaluate('e=>e.scrollTop=0')
 box=sc.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.wheel(0,300);page.wait_for_timeout(150)
 assert sc.evaluate('e=>e.scrollTop')>0,container
 page.locator(thumb).focus();page.keyboard.press('End');page.wait_for_timeout(70)
 assert sc.evaluate('e=>Math.abs(e.scrollTop-(e.scrollHeight-e.clientHeight))')<2
 assert page.locator(thumb).get_attribute('aria-valuenow')=='100'
 assert page.evaluate('''s=>{const a=document.querySelector(s[0]).getBoundingClientRect(),b=document.querySelector(s[1]).getBoundingClientRect();return Math.abs(a.bottom-b.bottom)<1}''',[thumb,track])
 page.keyboard.press('Home');page.wait_for_timeout(70)
 box=page.locator(thumb).bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2+70,steps=10);page.mouse.up();page.wait_for_timeout(70)
 assert sc.evaluate('e=>e.scrollTop')>0
 sc.evaluate('e=>e.scrollTop=0')
 if engine=='edge':
  box=sc.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']-20
  cdp=page.context.new_cdp_session(page)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  for i in range(1,11):
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-100*i/10}]});page.wait_for_timeout(15)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach();page.wait_for_timeout(200)
  assert sc.evaluate('e=>e.scrollTop')>0,('touch swipe',container)
  assert not page.locator('#hubCollection').is_visible()
  sc.evaluate('e=>e.scrollTop=0')

def check(pw,engine):
 browser=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
 context=browser.new_context(viewport={'width':2000,'height':1200},has_touch=True)
 page=context.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 try:
  page.goto(URL);page.wait_for_selector('.world-track');page.wait_for_load_state('networkidle')
  assert page.locator('[data-world-page]').count()==3
  assert page.locator('.world-hud button').count()==4
  assert page.locator('.world-counter-packages img').is_visible() and page.locator('.world-register').is_visible()
  capture(page,f'{engine}-2000-menu-starter')
  # Real catalog, quantities, odds and unlocked tier identities, never demo values.
  page.evaluate("g.coins=1e12;g.completed=300;g.packageCelebrations.acknowledged=PACKAGE_SHOP.map(t=>t.rank);g.autoEquip='off';g.owned=FOOD.map((f,i)=>({uid:i+1,id:f.id,level:1,fusion:1,spent:0}));g.activeMenu=g.owned.map(o=>o.uid);g.discovered=g.owned.map(o=>o.id);g.menuSlots=17;g.uidNext=18;save();render()")
  fixed=['#wallet-button','#boost-status','#help-button','#settings-button','.world-nav .nav-packages','.world-nav .nav-home','.world-nav .nav-orders']
  for width,height in [(2000,1200),(1280,800),(1024,768),(1920,1080),(854,480),(800,360)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100)
   baseline=[page.locator(s).bounding_box() for s in fixed]
   for name in ['menu','packages','orders']:
    navigate(page,name)
    for selector,expected in zip(fixed,baseline):
     actual=page.locator(selector).bounding_box()
     assert all(abs(actual[k]-expected[k])<.1 for k in expected),(selector,actual,expected)
    assert page.locator('[data-world-page]:not([inert])').get_attribute('data-world-page')==name
    assert page.locator('[aria-current="page"]').get_attribute('data-world-nav')==name
    assert page.evaluate("scrollX===0&&scrollY===0")
    check_geometry(page,height<=600)
    capture(page,f'{engine}-{width}-{name}')
    if height<=600:
     page.locator('.scene-window').evaluate('e=>e.scrollTop=e.scrollHeight');page.wait_for_timeout(50)
     capture(page,f'{engine}-{width}-{name}-scrolled')
     assert page.locator('.scene-nav').is_visible()
   assert page.evaluate('''()=>[...document.querySelectorAll('.world-hud button,.world-nav button')].every(e=>{const r=e.getBoundingClientRect();return r.width>=43.9&&r.height>=43.9&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})''')
  page.set_viewport_size({'width':1280,'height':800});navigate(page,'packages')
  # Pause a real camera journey at a known intermediate frame for visual QA.
  page.set_viewport_size({'width':2000,'height':1200})
  stationary=[page.locator(s).bounding_box() for s in fixed]
  page.evaluate("navigateBakery('orders');cancelAnimationFrame(bakeryFrame);bakeryCameraStep(bakeryJourney.started+bakeryJourney.duration*.42);cancelAnimationFrame(bakeryFrame)")
  capture(page,f'{engine}-2000-mid-transition')
  for selector,expected in zip(fixed,stationary):
   actual=page.locator(selector).bounding_box();assert all(abs(actual[k]-expected[k])<.1 for k in expected)
  page.evaluate("bakeryJourney.started=performance.now()-bakeryJourney.duration*.42;bakeryFrame=requestAnimationFrame(bakeryCameraStep)");settle(page)
  page.set_viewport_size({'width':1280,'height':800});navigate(page,'packages')
  # Sample actual animation frames, verify monotonic travel and the center crossing.
  for destination,direction in [('orders',1),('packages',-1)]:
   samples=page.evaluate('''async target=>{const samples=[];navigateBakery(target);await new Promise(resolve=>{function read(){samples.push({camera:bakeryCamera,rect:document.querySelector('.world-hud').getBoundingClientRect().x});if(bakeryJourney)requestAnimationFrame(read);else resolve()}requestAnimationFrame(read)});return samples}''',destination)
   # Windows' WebKit port can sample at 4 Hz. Check the path independently
   # of its frame rate; the Node test also exercises every camera step.
   assert len(samples)>=3,(engine,destination,samples)
   assert all((b['camera']-a['camera'])*direction>=-1e-6 for a,b in zip(samples,samples[1:]))
   assert min(s['camera'] for s in samples)<1<max(s['camera'] for s in samples)
   assert max(s['rect'] for s in samples)-min(s['rect'] for s in samples)<.1
  # Rapid retargeting preserves position; endpoint presses do not wrap or restart.
  page.evaluate("navigateBakery('orders')");page.wait_for_timeout(100)
  assert page.evaluate("(()=>{const before=bakeryCamera;navigateBakery('menu');return Math.abs(before-bakeryCamera)<.01})()");settle(page)
  navigate(page,'menu');check_scroll(page,'#cabinet-scroll','#cabinet-thumb','#cabinet-track',engine)
  assert page.locator('.hub-food').count()==17
  assert page.evaluate('''()=>{const r=document.querySelector('#cabinet-scroll').getBoundingClientRect();return [...document.querySelectorAll('.hub-food')].every(e=>{const a=e.getBoundingClientRect(),b=e.querySelector('.food-multiplier').getBoundingClientRect();return a.left>=r.left-1&&a.right<=r.right+1&&b.left>=a.left-1&&b.right<=a.right+1})}''')
  # Collection and all four fixed controls invoke production dialogs.
  page.locator('[data-world-nav="menu"]').tap();assert not page.locator('#hubCollection').is_visible()
  page.locator('.view-all-foods').tap();assert page.locator('.collection-card').count()==17
  page.locator('.hub-collection-back').tap()
  for selector,title in [('#wallet-button','Bakery Coins'),('#boost-status',"Baker's Boost"),('#help-button','How to Play'),('#settings-button','Settings')]:
   page.locator(selector).tap();assert page.locator('#modalTitle').inner_text()==title
   page.locator('#modals .close').tap()
  navigate(page,'orders');check_scroll(page,'#order-scroller','#board-scroll-thumb','#board-scroll-track',engine)
  page.locator('[data-hub-action="odds"]').tap();assert page.locator('.hub-odds-grid article').count()==8;page.locator('#modals .close').tap()
  page.locator('#refreshOrders').tap();assert page.evaluate('refreshRemaining()>0');assert 'Skip' in page.locator('#refreshOrders').inner_text()
  page.locator('#refreshOrders').tap();assert page.locator('#modals .modal').is_visible();page.locator('#modals .close').tap()
  navigate(page,'packages')
  check_scroll(page,'#package-carousel','#package-thumb','#package-track',engine)
  assert page.locator('[data-world-tier]').evaluate_all('es=>es.map(e=>+e.dataset.worldTier)')==list(range(7,-1,-1))
  page.locator('[data-world-tier="0"]').focus();page.keyboard.press('Home');assert page.locator('[data-world-tier="7"]').get_attribute('aria-pressed')=='true'
  page.keyboard.press('ArrowDown');assert page.locator('[data-world-tier="6"]').get_attribute('aria-pressed')=='true'
  page.keyboard.press('End');assert page.locator('[data-world-tier="0"]').get_attribute('aria-pressed')=='true'
  for rank in [0,4,7]:
   page.evaluate('selectBakeryTier',rank)
   assert page.locator('.package-title h2').inner_text()==page.evaluate('r=>PACKAGE_TYPES[r]+" Package"',rank)
   assert page.locator('.world-odds-row b').all_text_contents()==page.evaluate('r=>packageProbabilities(r).filter(p=>p>0).map(probabilityLabel)',rank)
   before=page.evaluate('g.coins');count=5 if rank==4 else 1
   page.locator(f'[data-world-buy="{count}"]').tap();assert page.locator('#packageBatch').is_visible()
   assert before-page.evaluate('g.coins')==page.evaluate('r=>packagePrice(r[0])*r[1]',[rank,count])
   receipt=page.evaluate('g.packageBatchReceipt.id');page.evaluate('revealAllPackageRewards()')
   assert page.locator('.batch-reward.is-revealed').count()==count
   assert not page.evaluate('buyBakeryPackage(1)')
   page.locator('#packageBatchCollect').tap();page.wait_for_selector('#packageBatch',state='detached')
   assert not page.evaluate('id=>collectPackageBatch(id)',receipt)
   assert page.evaluate('bakeryPage')=='packages'
  # Locked preview is informative, never purchasable; stock opening stays functional.
  page.evaluate('g.completed=0;g.packageTierUnlocks=[0];render();selectBakeryTier(5)')
  assert page.locator('[data-world-buy]:disabled').count()==3
  assert '75' in page.locator('.world-purchase-notice').inner_text()
  page.evaluate('g.packages[0]=1;g.packageRevision++;save();render();selectBakeryTier(0)')
  page.locator('[data-world-saved]').tap();page.evaluate('revealAllPackageRewards()');page.locator('#packageBatchCollect').tap();page.wait_for_selector('#packageBatch',state='detached');assert page.evaluate('g.packages[0]')==0
  # Worksheet iframe/payout is mounted once and preserved through page trips.
  page.evaluate("g.board=[{id:9001,rarity:1,coinTier:1,a:79,b:18,base:ticketBase(1),foodId:'pandesal'}];g.ticketSeq=9001;refillBoard();save();render()")
  navigate(page,'orders');page.locator('[data-ticket-id="9001"]').tap()
  page.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===9001")
  page.evaluate("window.originalFrame=$('worksheetFrame');window.originalBudget=g.run.budget")
  capture(page,f'{engine}-worksheet-79x18')
  page.locator('.worksheet-exit').tap();navigate(page,'packages');navigate(page,'orders');page.locator('[data-ticket-id="9001"]').tap()
  assert page.evaluate("originalFrame===$('worksheetFrame')&&originalBudget===g.run.budget")
  page.locator('.worksheet-exit').tap();page.reload();page.wait_for_selector('.world-track')
  assert page.evaluate('g.run.paused&&g.run.budget===g.orderRuns[9001].budget')
  page.emulate_media(reduced_motion='reduce');navigate(page,'orders');assert page.evaluate('bakeryCamera===2&&!bakeryJourney')
  page.goto(URL+'?view=legacy');page.wait_for_selector('#app .layout');assert page.locator('.world-track').count()==0
  assert errors==[],errors
  print(f'PASS {engine}: three scenes, camera path, fixed HUD, scrolling, all tiers, real purchases, dialogs and saved worksheet',flush=True)
 finally:
  browser.close()

try:
 with sync_playwright() as pw:
  for engine in (sys.argv[1:] or ['edge','webkit']):check(pw,engine)
finally:
 server.shutdown()
