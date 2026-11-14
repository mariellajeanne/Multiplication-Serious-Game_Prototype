"""Actual production collection, featured purchases, durable unboxing and rewards."""
import importlib.util,json,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('support',Path(__file__).with_name('browser-ui-replacement.py'))
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
OUT=s.ROOT/'output/playwright/package-experience';OUT.mkdir(parents=True,exist_ok=True)

def shot(p,name):
 p.screenshot(path=str(OUT/(name+'.png')),animations='disabled')

def home_geometry(p):
 return p.evaluate('''()=>['#title-sign','#package-station','#menu-cabinet','#orders-board','#order-scroller','.top-hud','.bottom-nav'].map(sel=>{const r=document.querySelector(sel).getBoundingClientRect();return [r.x,r.y,r.width,r.height]})''')

def popup_fits(p):
 assert p.locator('#modals .bakery-popup').evaluate('''e=>{const r=e.getBoundingClientRect(),b=e.querySelector('.popup-body');return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&b.scrollWidth<=b.clientWidth+1}''')
 assert p.locator('#modals button:visible').evaluate_all('''es=>es.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1})''')

def collect(p):
 p.locator('#packageBatchCollect').tap();p.wait_for_selector('#packageBatch',state='detached')

def check(pw,engine):
 b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
 c=b.new_context(viewport={'width':1280,'height':800},has_touch=True);p=c.new_page();errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 try:
  p.goto(s.URL);p.wait_for_selector('.hub-food');p.wait_for_load_state('networkidle');baseline=home_geometry(p)
  p.locator('.nav-packages').tap();popup_fits(p)
  assert p.locator('.packages-collection-card').count()==1
  assert p.locator('#packagePracticeProgress').get_attribute('max')=='4'
  assert p.locator('#packagePracticeProgress').get_attribute('value')=='0'
  shot(p,engine+'-starter-collection')
  p.evaluate('g.completed=24;g.packageCelebrations.acknowledged=[0,1,2,3];save();showPackageCollection()')
  assert p.locator('.packages-collection-card').evaluate_all('es=>es.map(e=>+e.dataset.packageRank)')==[3,2,1,0]
  assert p.locator('#packagePracticeProgress').get_attribute('max')=='45'
  assert p.locator('.packages-next h3').inner_text()=='Blessed Package'
  assert p.locator('.packages-collection-card').evaluate_all('es=>es.every(e=>!e.innerText.includes("Unlocked"))')
  shot(p,engine+'-practice-progress')
  p.evaluate('g.completed=260;g.coins=1e12;g.packageCelebrations.acknowledged=PACKAGE_SHOP.map(t=>t.rank);save();showPackageCollection()')
  assert p.locator('.packages-collection-card').evaluate_all('es=>es.map(e=>+e.dataset.packageRank)')==list(range(8,-1,-1))
  assert p.locator('.packages-all-unlocked').is_visible() and p.locator('#packagePracticeProgress').count()==0
  strip=p.locator('.packages-strip');p.wait_for_timeout(100);strip.focus();p.keyboard.press('End');p.wait_for_timeout(100);assert strip.evaluate('e=>e.scrollLeft')>0
  p.keyboard.press('Home');p.wait_for_function('document.querySelector(".packages-strip").scrollLeft<=5')
  if engine=='edge':
   r=strip.bounding_box();x=r['x']+r['width']-30;y=r['y']+r['height']/2;cdp=c.new_cdp_session(p)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
   for i in range(1,13):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-i*30,'y':y}]})
   cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});p.wait_for_timeout(400);assert strip.evaluate('e=>e.scrollLeft')>20
   strip.evaluate('e=>e.scrollLeft=0');cdp.detach();p.wait_for_timeout(350)
  shot(p,engine+'-all-tiers-collection')
  for width,height in [(2000,1200),(1280,800),(1024,768)]:
   p.set_viewport_size({'width':width,'height':height});p.evaluate('showSelectedPackage(0)');popup_fits(p)
   assert p.locator('.package-featured-art').evaluate('e=>{const r=e.getBoundingClientRect();return Math.abs(r.width-r.height)<1}')
   assert p.locator('.package-buy-option').evaluate_all('''es=>{const rs=es.map(e=>e.getBoundingClientRect());return rs.every(r=>Math.abs(r.width-rs[0].width)<1)&&es.every(e=>{const a=e.firstElementChild.getBoundingClientRect(),b=e.lastElementChild.getBoundingClientRect();return Math.abs(a.top+a.height/2-b.top-b.height/2)<1})}''')
   shot(p,f'{engine}-{width}-selected')
   for count in [1,5,10]:
    button=p.locator(f'[data-package-count="{count}"]');offer=button.get_attribute('data-package-offer')
    before,total=p.evaluate('id=>[g.coins,packageBatchOffers.get(id).total]',offer)
    assert total==p.evaluate('n=>packagePrice(0)*n',count)
    assert button.locator('.package-coin-value b').inner_text()==p.evaluate('n=>amountLabel(packagePrice(0)*n)',count)
    button.tap();p.wait_for_selector('#packageBatch');assert p.evaluate('g.coins')==before-total
    if width==1280 and count==5:
     p.wait_for_timeout(600);revealed=p.locator('.batch-reward.is-revealed').count();assert 0<revealed<5,revealed
     assert p.locator('.batch-reward').evaluate_all('es=>es.every((e,i)=>!e.classList.contains("is-revealed")||i===0||es[i-1].classList.contains("is-revealed"))')
    assert p.locator('.batch-reward').count()==count
    assert p.evaluate('id=>purchasePackageBatch(id)',offer)==False
    assert p.locator('#modals').evaluate('e=>e.hidden&&e.inert') and p.locator('#app').evaluate('e=>e.inert')
    assert p.locator('.batch-grid').evaluate('e=>getComputedStyle(e).gridTemplateColumns.split(" ").length')==(1 if count==1 else 5)
    assert len(set(p.locator('.batch-reward').evaluate_all('es=>es.map(e=>e.offsetTop)')))==(2 if count==10 else 1)
    shot(p,f'{engine}-{width}-x{count}-packages')
    if width==1280 and count==5:
     p.wait_for_selector('#packageBatchCollect')
    else:p.evaluate('revealAllPackageRewards()')
    assert p.locator('.batch-reward.is-revealed').count()==count
    if count==1:
     assert p.locator('.batch-reward').evaluate('e=>{const r=e.getBoundingClientRect();return r.width>=400&&Math.abs(r.left+r.width/2-innerWidth/2)<1}')
    assert p.locator('.batch-reward').evaluate_all('''es=>es.every(e=>{const r=e.getBoundingClientRect();return e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1&&[...e.querySelectorAll('.batch-reward-copy>*')].every(n=>{const c=n.getBoundingClientRect();return c.left>=r.left&&c.right<=r.right&&c.top>=r.top&&c.bottom<=r.bottom})})''')
    assert p.locator('#packageBatch').evaluate('e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1')
    assert p.locator('.batch-food .food-art').evaluate_all('es=>es.every(e=>getComputedStyle(e).objectFit==="contain")')
    shot(p,f'{engine}-{width}-x{count}-rewards')
    receipt=p.evaluate('JSON.stringify([g.coins,g.owned,g.recipeCeilings])');collect(p)
    assert p.evaluate('JSON.stringify([g.coins,g.owned,g.recipeCeilings])')==receipt
    assert p.locator('.packages-selected-modal').is_visible()
   p.locator('.packages-back').tap();popup_fits(p);shot(p,f'{engine}-{width}-collection');p.locator('#modals .close').tap()
   assert not p.locator('#app').evaluate('e=>e.inert')
  p.set_viewport_size({'width':1280,'height':800});p.evaluate('fitHubInterface()');assert home_geometry(p)==baseline
  # A durable receipt survives interrupt/reload; Collect does not reroll foods.
  p.evaluate('showSelectedPackage(0)');p.locator('[data-package-count="10"]').tap();snapshot=p.evaluate('JSON.stringify([g.coins,g.owned,g.recipeCeilings,g.packageBatchReceipt])')
  p.reload();p.wait_for_selector('#packageBatchCollect');assert p.locator('.is-revealed').count()==10
  assert p.evaluate('JSON.stringify([g.coins,g.owned,g.recipeCeilings,g.packageBatchReceipt])')==snapshot
  collect(p);p.reload();p.wait_for_selector('.hub-food');assert p.locator('#packageBatch').count()==0
  # Narrow and heavily zoomed CSS viewports scroll within the layer; controls
  # remain reachable and neither popup nor reward grid overflows horizontally.
  for width,height in [(834,600),(420,267),(390,844)]:
   p.set_viewport_size({'width':width,'height':height});p.evaluate('showPackageCollection()');popup_fits(p)
   p.evaluate('showSelectedPackage(0)');popup_fits(p);p.locator('[data-package-count="10"]').scroll_into_view_if_needed();p.locator('[data-package-count="10"]').tap()
   p.evaluate('revealAllPackageRewards()');assert p.locator('#packageBatch').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
   p.locator('#packageBatchCollect').scroll_into_view_if_needed();shot(p,f'{engine}-{width}-small-rewards');collect(p);p.locator('#modals .close').tap()
  p.set_viewport_size({'width':1280,'height':800});p.evaluate('fitHubInterface()')
  # Low funds disable only unavailable quantities; they never charge or animate.
  p.evaluate('g.coins=packagePrice(0)*5;save();showSelectedPackage(0)')
  assert p.locator('[data-package-count="1"]').is_enabled() and p.locator('[data-package-count="5"]').is_enabled() and p.locator('[data-package-count="10"]').is_disabled()
  p.evaluate('g.coins=0;save();showSelectedPackage(0)');assert p.locator('.package-buy-option:disabled').count()==3
  assert 'earn more coins' in p.locator('#packagePurchaseNotice').inner_text();shot(p,engine+'-insufficient-coins')
  # Guaranteed stock stays usable even when the practice gate is not yet earned.
  p.evaluate('g.completed=0;g.packages[8]=2;g.legacyPackageFoods[8]=[7,7];save();showPackageCollection()');p.get_by_role('button',name='Open saved packages',exact=True).tap()
  assert p.evaluate('g.coins')==0 and p.evaluate('g.packages[8]')==1 and p.evaluate('F(g.packageBatchReceipt.rewards[0].foodId).rarity')==7
  p.evaluate('revealAllPackageRewards()');collect(p)
  # Reduced motion presents the committed food results immediately.
  p.emulate_media(reduced_motion='reduce');p.evaluate('g.coins=1e9;save();showSelectedPackage(0)');p.locator('[data-package-count="5"]').tap()
  assert p.locator('#packageBatch').evaluate('e=>e.getAnimations({subtree:true}).length')==0
  assert p.locator('#packageBatchCollect').is_visible();shot(p,engine+'-reduced-motion');collect(p);p.emulate_media(reduced_motion='no-preference')
  # Highest-rarity art, long food names, and stronger tier effects fit 5x2 too.
  p.evaluate('g.completed=260;g.coins=1e12;save();showSelectedPackage(8);window.realPackageRandom=Math.random;Math.random=()=>.999999999');p.locator('[data-package-count="10"]').tap()
  p.locator('#packageRevealAll').tap();assert p.locator('.batch-reward.r7.is-revealed').count()==10
  assert p.locator('.batch-reward').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1)')
  shot(p,engine+'-crown-rewards');p.evaluate('Math.random=realPackageRandom');collect(p)
  # A newly earned tier cannot overlay a reveal, or the purchase view afterward.
  p.evaluate('g.completed=3;g.packageCelebrations.acknowledged=[0];localStorage.setItem("panaderyaQuestV2",JSON.stringify(g));showSelectedPackage(0)');p.locator('[data-package-count="1"]').tap()
  p.evaluate('g.completed=4;save()');p.wait_for_timeout(1100);assert p.locator('#packageUnlock').count()==0
  p.evaluate('revealAllPackageRewards()');collect(p);assert p.locator('#packageUnlock').count()==0
  p.locator('#modals .close').tap();p.wait_for_selector('#packageUnlock');p.locator('#packageUnlockAwesome').tap();p.wait_for_selector('#packageUnlock',state='detached')
  assert home_geometry(p)==baseline
  assert not errors,errors
  print(f'PASS {engine}: unlocked browsing, touch/keyboard, real gates/prices, x1/x5/x10 cascade/rewards at 3 tablet sizes, reload, exactly-once, stock, reduced motion, unlock deferral and unchanged home geometry',flush=True)
 except Exception:
  shot(p,engine+'-FAILURE');print('ERRORS',errors,flush=True);raise
 finally:c.close();b.close()

try:
 with s.sync_playwright() as pw:
  for engine in sys.argv[1:] or ['edge','webkit']:check(pw,engine)
finally:s.server.shutdown()
