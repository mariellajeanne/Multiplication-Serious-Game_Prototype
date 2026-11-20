"""Production carousel, pointer/touch/keyboard, artwork, purchases and discovery.
Run: python tests/browser-package-carousel.py edge webkit
"""
import functools, http.server, json, os, sys, threading
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(ROOT/'.test-tools/browsers'))
from playwright.sync_api import sync_playwright
OUT=ROOT/'output/playwright/packages-carousel';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}/index.html'
def ready(p):p.wait_for_function('document.body.dataset.view==="hub"&&!document.getElementById("app").inert')
def settle(p):p.wait_for_timeout(300)
def selected(p):return p.evaluate('bakeryTier')
def shot(p,name):settle(p);p.screenshot(path=str(OUT/(name+'.png')))
def fixture(p,highest=5,earned=72000):
 p.evaluate('''v=>{g.packageTierUnlocks=PACKAGE_SHOP.slice(0,v.highest+1).map(t=>t.rank);g.packageCelebrations.acknowledged=[...g.packageTierUnlocks];g.coinsEarnedSinceLastDiscovery=v.earned;g.coins=1e9;save()}''',{'highest':highest,'earned':earned})
 p.reload();ready(p);p.locator('[data-world-nav="packages"]').tap();p.wait_for_function('!bakeryJourney');settle(p)
def check_layout(p):
 return p.evaluate('''()=>{
  const rect=s=>document.querySelector(s).getBoundingClientRect(),c=rect('#package-carousel'),title=rect('.package-title'),strip=document.querySelector('.package-discovery'),odds=document.querySelector('.chance-panel');
  const chosen=document.querySelector('.package-preview[aria-pressed="true"]'),art=chosen.querySelector('img,.package-mystery'),a=art.getBoundingClientRect();
  const bar=strip?.querySelector('[role="progressbar"]'),texts=bar?[bar.querySelector('strong'),bar.querySelector('span')]:[];
  const label=rect('#package-carousel-label'),image=chosen.querySelector('img')||document.querySelector('.carousel-package');
  const drawnHeight=Math.min(a.height,a.width*image.naturalHeight/image.naturalWidth),gap=label.top-(a.top+a.height/2+drawnHeight/2);
  const panel=rect('.package-interior'),station=rect('#package-station'),scale=station.width/1670;
  return {center:Math.abs(a.x+a.width/2-c.x-c.width/2)<1,
   noOld:!document.querySelector('.package-tier-list,#package-scrollbar,.world-package-selector'),
   header:!strip||Math.abs(strip.getBoundingClientRect().width-title.width)<1&&strip.getBoundingClientRect().top>=title.bottom&&strip.getBoundingClientRect().bottom<=odds?.getBoundingClientRect().top,
   textInside:!bar||texts.every(t=>{const r=t.getBoundingClientRect(),b=bar.getBoundingClientRect();return r.left>=b.left&&r.right<=b.right&&r.top>=b.top&&r.bottom<=b.bottom}),
   noOverflow:document.documentElement.scrollWidth<=innerWidth+1&&c.left>0&&c.right<innerWidth,
   labelInside:label.left>c.left&&label.right<c.right&&label.bottom<c.bottom&&gap>5&&gap<30,
   fillsParent:c.height/rect('.package-showcase').height>.97,
   sharedParent:document.querySelector('.package-interior')?.children.length===2&&parseFloat(getComputedStyle(document.querySelector('.package-interior')).borderLeftWidth)>=6&&getComputedStyle(document.querySelector('.package-interior')).borderLeftColor==='rgb(120, 64, 38)'&&getComputedStyle(document.querySelector('.package-interior')).boxShadow==='none'&&parseFloat(getComputedStyle(document.querySelector('#package-carousel')).borderLeftWidth)===0,
   coversOldRim:!document.querySelector('.package-paper')&&(panel.left-station.left)/scale<=154&&(panel.top-station.top)/scale<=194&&(panel.right-station.left)/scale>=1516&&(panel.bottom-station.top)/scale>=812,
   fullSectionProgress:!bar||bar===strip&&bar.parentElement.classList.contains('package-heading-group')&&getComputedStyle(bar).borderRadius==='0px'&&bar.querySelectorAll('[role="progressbar"]').length===0,
   groupedOdds:!odds||parseFloat(getComputedStyle(odds).borderLeftWidth)>0&&[...odds.querySelectorAll('.chance-row')].every(row=>getComputedStyle(row).borderRadius==='0px'),
   rowContentFits:!odds||[...odds.querySelectorAll('.chance-row')].every(row=>row.scrollHeight<=row.clientHeight+1&&row.scrollWidth<=row.clientWidth+1),
   noScroll:document.querySelector('#package-carousel').scrollHeight===document.querySelector('#package-carousel').clientHeight};
 }''')
def drag(p,touch=False,reverse=False):
 r=p.locator('#package-carousel').bounding_box();x=r['x']+r['width']*(.35 if reverse else .65);y=r['y']+r['height']*.55;dx=r['width']*(.3 if reverse else -.3)
 if touch:
  c=p.context.new_cdp_session(p);c.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  for i in range(1,13):c.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+dx*i/12,'y':y}]});p.wait_for_timeout(16)
  c.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});c.detach()
 else:
  p.mouse.move(x,y);p.mouse.down();p.mouse.move(x+dx,y,steps=14);p.mouse.up()
 settle(p)
def floating_phone(p,engine):
 for width,height in [(844,390),(800,360),(932,430)]:
  p.set_viewport_size({'width':width,'height':height});p.evaluate('navigateBakery("packages")');p.wait_for_function('!bakeryJourney')
  p.locator('.scene-window').evaluate('e=>e.scrollTop=0');settle(p)
  metrics=p.evaluate('''()=>{
   const viewport=document.querySelector('.scene-window').getBoundingClientRect(),hud=document.querySelector('.scene-hud').getBoundingClientRect(),nav=document.querySelector('.scene-nav').getBoundingClientRect(),art=document.querySelector('#package-station>.scene-frame').getBoundingClientRect(),room=document.querySelector('.scene-room').getBoundingClientRect();
   return {fullScene:viewport.top===0&&viewport.bottom===innerHeight,backgroundBehindControls:room.top<=0&&room.bottom>=innerHeight,
    transparent:[...document.querySelectorAll('.scene-hud,.scene-nav')].every(e=>{const s=getComputedStyle(e);return s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.backgroundImage==='none'&&s.boxShadow==='none'}),
    headerClear:art.top>hud.bottom+8,navSafe:nav.bottom<=innerHeight-10,
    targets:[...document.querySelectorAll('.scene-hud button,.scene-nav button')].every(e=>{const r=e.getBoundingClientRect();return r.width>=43.9&&r.height>=43.9})};
  }''');assert all(metrics.values()),('floating controls',engine,width,metrics)
  shot(p,f'{engine}-floating-phone-{width}-initial')
  # Show lower controls above the floating navigation, with scenery still
  # visible through the gaps and no separate safe-area background bands.
  p.locator('.scene-window').evaluate('e=>e.scrollTop=e.scrollHeight');settle(p)
  assert p.locator('.scene-window').evaluate('e=>e.scrollTop')==0
  assert p.locator('[data-world-buy="1"]').evaluate('e=>{const r=e.getBoundingClientRect(),nav=document.querySelector(".scene-nav").getBoundingClientRect();return r.bottom<nav.top&&r.top>0}')
  shot(p,f'{engine}-floating-phone-{width}-scrolled')
  p.locator('#help-button').tap();assert p.locator('#modals .modal').is_visible();p.locator('#modals .close').tap()
  for name in ['menu','orders','packages']:
   p.locator(f'[data-world-nav="{name}"]').tap();p.wait_for_function('!bakeryJourney')
   assert p.evaluate('bakeryPage')==name
   assert p.locator('.scene-window').evaluate('e=>e.getBoundingClientRect().height===innerHeight')
   metrics=p.evaluate('''name=>{
    const root=document.querySelector(`[data-world-page="${name}"]>section`),r=root.getBoundingClientRect(),hud=document.querySelector('.scene-hud').getBoundingClientRect(),nav=document.querySelector('.scene-nav').getBoundingClientRect();
    const selectors=name==='packages'?['.package-heading-group','.chance-panel','.purchase-options']:name==='menu'?['.scene-menu-opening','.view-all-foods']:['.scene-order-tools','.scene-order-scroll'];
    return {headerClear:r.top>=hud.bottom+10,withinWidth:r.left>=12&&r.right<=innerWidth-12,
     uniformScale:Math.abs(r.width/root.offsetWidth-r.height/root.offsetHeight)<.001,
     labelsFit:[...root.querySelectorAll('.scene-utility,[data-world-buy]')].every(e=>e.scrollWidth<=e.clientWidth+1),
     utilityBounds:name!=='orders'||[...root.querySelectorAll('.scene-utility')].every(e=>{const b=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return b.left>=p.left-.5&&b.right<=p.right+.5}),
     singleLineOpen:name!=='packages'||[...root.querySelectorAll('[data-world-buy]>strong')].every(e=>e.getBoundingClientRect().height<18),
     contentClear:selectors.every(s=>{const b=root.querySelector(s).getBoundingClientRect();return b.top>=hud.bottom+8&&b.bottom<=nav.top-4}),
     targets:[...root.querySelectorAll(name==='packages'?'[data-world-buy]':name==='menu'?'.view-all-foods,.scene-food-card:not(.unfilled-slot)':'.scene-utility,.scene-ticket')].filter(e=>{const b=e.getBoundingClientRect(),host=e.closest('.scene-food-scroll,.scene-order-scroll');if(!host)return true;const h=host.getBoundingClientRect();return b.top>=h.top&&b.bottom<=h.bottom}).every(e=>{const b=e.getBoundingClientRect();return b.width>=43.8&&b.height>=43.8})};
   }''',name);assert all(metrics.values()),('kiosk fit',engine,width,name,metrics)
   shot(p,f'{engine}-phone-fit-{width}-{name}')
   if name in ['menu','orders']:
    sc=p.locator('#cabinet-scroll' if name=='menu' else '#order-scroller');sc.evaluate('e=>e.scrollTop=0');r=sc.bounding_box();p.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);p.mouse.wheel(0,350);settle(p)
    assert sc.evaluate('e=>e.scrollTop')>0
    if engine=='edge' and width==844:
     sc.evaluate('e=>e.scrollTop=0');r=sc.bounding_box();x=r['x']+r['width']/2;y=r['y']+r['height']-12;end=r['y']+12;cdp=p.context.new_cdp_session(p)
     cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
     for i in range(1,13):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y+(end-y)*i/12}]});p.wait_for_timeout(16)
     cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach();settle(p)
     assert sc.evaluate('e=>e.scrollTop')>0
   if name=='menu':
    p.locator('.view-all-foods').tap();assert p.locator('#hubCollection').is_visible();p.locator('.hub-collection-back').tap()
   if name=='orders':
    p.locator('[data-hub-action="odds"]').tap();assert p.locator('#modals .modal').is_visible();p.locator('#modals .close').tap()
  if width==844:
   progress=p.evaluate('g.coinsEarnedSinceLastDiscovery');p.locator('[data-world-buy="1"]').tap();p.wait_for_selector('#packageBatch')
   p.evaluate('revealAllPackageRewards()');p.wait_for_function('packageBatchView.complete');p.locator('#packageBatchCollect').tap();p.wait_for_function('!packageBatchView')
   assert p.evaluate('g.coinsEarnedSinceLastDiscovery')==progress
 p.set_viewport_size({'width':1280,'height':800});settle(p)
 assert p.locator('.scene-window').evaluate('e=>e.scrollTop')==0
def run(pw,engine):
 b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
 c=b.new_context(viewport={'width':2000,'height':1200},has_touch=True);p=c.new_page();errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 try:
  p.goto(URL);ready(p)
  for width,height in [(2000,1200),(1280,800)]:
   p.set_viewport_size({'width':width,'height':height});shot(p,f'{engine}-home-{width}')
  floating_phone(p,engine)
  p.set_viewport_size({'width':2000,'height':1200});fixture(p)
  assert selected(p)==5
  assert p.locator('[data-world-tier]').count()==7 and p.locator('.is-mystery').count()==1
  assert p.locator('#package-station').get_by_text('Cosmic',exact=False).count()==0
  assert p.locator('#package-station').get_by_text('Divine',exact=False).count()==0
  assert p.locator('#package-station img[src*="package-07"],#package-station img[src*="package-08"]').count()==0
  assert p.locator('.package-mystery-shape').evaluate('e=>getComputedStyle(e).maskImage.includes("package-01")')
  for width,height in [(2000,1200),(1280,800),(1024,768),(844,390)]:
   p.set_viewport_size({'width':width,'height':height});settle(p)
   if height<600:p.locator('.package-interior').scroll_into_view_if_needed()
   metrics=check_layout(p);assert all(metrics.values()),(engine,width,metrics)
   assert p.locator('.world-odds-row').count()==3
   assert p.locator('.chance-row>strong').all_text_contents()==p.evaluate('PACKAGE_FOOD_RARITIES[bakeryTier].slice().reverse().map(r=>RARITIES[r])')
   shot(p,f'{engine}-mythical-{width}')
  # Large progress totals and legacy stock remain readable within shared groups.
  p.evaluate('g.coins=0;g.packages[5]=5;g.coinsEarnedSinceLastDiscovery=29000000;render()');settle(p)
  p.locator('.package-interior').scroll_into_view_if_needed()
  metrics=check_layout(p);assert all(metrics.values()),('phone stock',engine,metrics)
  shot(p,f'{engine}-phone-stock')
  p.evaluate('g.coins=1e9;g.packages[5]=0;g.coinsEarnedSinceLastDiscovery=72000;render()');settle(p)
  p.set_viewport_size({'width':1280,'height':800});settle(p)
  # Tap the real visible neighbor, then return from the locked silhouette.
  carousel=p.locator('#package-carousel');r=carousel.bounding_box()
  p.touchscreen.tap(r['x']+r['width']*.95,r['y']+r['height']*.55);settle(p)
  assert selected(p)==6 and p.locator('#package-carousel-label').inner_text()=='Next Discovery'
  assert p.locator('.world-odds-row,[data-world-buy],[data-world-saved]').count()==0
  assert p.locator('.package-title h2').inner_text()=='Next Discovery'
  assert p.locator('.discovery-meter').get_attribute('aria-valuenow')=='72000'
  shot(p,f'{engine}-mystery-1280')
  carousel.focus();p.keyboard.press('ArrowRight');assert selected(p)==6
  p.keyboard.press('ArrowLeft');settle(p);assert selected(p)==5
  p.keyboard.press('Home');settle(p);assert selected(p)==0
  p.keyboard.press('ArrowLeft');assert selected(p)==0
  assert p.locator('.discovery-meter').get_attribute('aria-valuenow')=='72000'
  drag(p);assert selected(p)==1
  drag(p,reverse=True);assert selected(p)==0
  if engine=='edge':drag(p,touch=True);assert selected(p)==1
  p.wait_for_timeout(420);carousel.focus();p.keyboard.press('End');settle(p);assert selected(p)==6
  # A qualifying reward replaces the silhouette without resetting the selection.
  p.evaluate('creditGameplayCoins(g,PACKAGE_DISCOVERY_COINS[6]);g.packageCelebrations.acknowledged=[...g.packageTierUnlocks];save();refreshBakeryDiscovery()');settle(p)
  assert selected(p)==6 and p.locator('.package-title h2').inner_text()=='Cosmic Package'
  assert p.locator('[data-world-tier]').count()==8 and p.locator('.is-mystery').count()==1
  assert p.locator('.discovery-meter').get_attribute('aria-valuenow')=='0'
  assert p.locator('#package-station img[src*="package-08"]').count()==0
  p.evaluate('creditGameplayCoins(g,12345);save();refreshBakeryDiscovery()')
  p.reload();ready(p);p.evaluate('openPackages()');p.wait_for_function('!bakeryJourney')
  assert selected(p)==6 and p.locator('.discovery-meter').get_attribute('aria-valuenow')=='12345'
  # Keep the existing real x1/x5/x10 purchasing, reveal, collect and repeat protection.
  p.evaluate('selectBakeryTier(0)');settle(p)
  for count in [1,5,10]:
   before=p.evaluate('g.coins');price=p.evaluate('n=>packagePrice(0)*n',count)
   p.locator(f'[data-world-buy="{count}"]').tap();p.wait_for_selector('#packageBatch')
   assert p.evaluate('g.coins')==before-price
   assert p.evaluate('buyBakeryPackage(1)') is False
   assert p.evaluate('g.coinsEarnedSinceLastDiscovery')==12345
   p.evaluate('revealAllPackageRewards()');p.wait_for_function('packageBatchView.complete')
   assert p.locator('.batch-reward').count()==count
   p.locator('#packageBatchCollect').tap();p.wait_for_function('!packageBatchView');settle(p)
   assert selected(p)==0 and p.locator('.world-odds-row').count()==3
  # All artwork, including wider Secret/Cosmic/Divine, preserves object fit.
  fixture(p,7,0);assert selected(p)==7
  assert p.locator('.package-discovery,.is-mystery').count()==0
  for rank in range(8):
   p.evaluate('r=>selectBakeryTier(r)',rank);settle(p)
   assert p.locator('.world-odds-row').count()==3
   assert p.locator('.carousel-package').evaluate_all('es=>es.every(i=>i.complete&&i.naturalWidth&&getComputedStyle(i).objectFit==="contain")')
   assert check_layout(p)['center']
   shot(p,f'{engine}-tier-{rank+1}')
  p.emulate_media(reduced_motion='reduce');carousel=p.locator('#package-carousel');carousel.focus();p.keyboard.press('Home')
  assert selected(p)==0
  assert p.locator('.package-slide').first.evaluate('e=>getComputedStyle(e).transitionDuration')=='0s'
  assert not errors,errors
  (OUT/f'{engine}-state.json').write_text(p.evaluate('render_game_to_text()'),encoding='utf-8')
  print(f'PASS {engine}: carousel/touch/drag/keyboard/boundaries, migration/progress, all tiers, x1/x5/x10, layouts and console',flush=True)
 finally:c.close();b.close()
with sync_playwright() as pw:
 for engine in sys.argv[1:] or ['edge','webkit']:run(pw,engine)
server.shutdown()
