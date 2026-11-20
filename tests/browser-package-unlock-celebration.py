"""Focused unlock artwork, layout, dismissal, queue and save integration."""
import importlib.util
from pathlib import Path
import sys
spec=importlib.util.spec_from_file_location('support',Path(__file__).with_name('browser-package-reveal.py'))
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
OUT=s.ROOT/'output/playwright/package-unlock';OUT.mkdir(parents=True,exist_ok=True)

def show(p,ranks):
 p.evaluate("""ranks=>{g.packageTierUnlocks=PACKAGE_SHOP.map(t=>t.rank);g.packageCelebrations.acknowledged=g.packageTierUnlocks.filter(r=>!ranks.includes(r));localStorage.removeItem('panaderyaQuestV2');save();presentPackageUnlock()}""",ranks)
 p.wait_for_selector('#packageUnlock')
 assert not p.locator('#packageUnlockHint').is_visible()
 p.mouse.click(2,2);p.touchscreen.tap(2,2)
 assert p.evaluate('!!packageUnlockView&&!packageUnlockView.closing')
 p.wait_for_function('packageUnlockView.dismissReady')

def run(pw,engine):
 b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
 p=b.new_page(viewport={'width':2000,'height':1200},has_touch=True);errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 try:
  p.goto(s.URL);s.ready(p)
  before=p.evaluate('JSON.stringify([g.coins,g.owned,g.packages,g.completed])')
  for width,height in [(2000,1200),(1280,800),(844,390),(640,360)]:
   p.set_viewport_size({'width':width,'height':height})
   for rank in [1,5,6,7]:
    show(p,[rank])
    assert p.locator('#packageUnlockTitle').inner_text()=='New Package Unlocked!'
    assert p.locator('#packageUnlock').get_by_text('Tap to close',exact=True).count()==1
    assert p.locator('#packageUnlock button,#packageUnlock .package-art,.package-unlock-message').count()==0
    assert p.locator('.package-unlock-art img').evaluate("""(img,r)=>img.complete&&img.naturalWidth>0&&img.getAttribute('src')===BAKERY_ASSETS[`package-${String(r+1).padStart(2,'0')}`]&&getComputedStyle(img).objectFit==='contain'""",rank)
    assert p.evaluate("""()=>{const r=q=>document.querySelector(q).getBoundingClientRect(),t=r('.package-unlock-heading'),a=r('.package-unlock-reveal'),n=r('.package-unlock-name'),h=r('.package-unlock-hint');return t.top>=0&&h.bottom<=innerHeight&&a.left>=0&&a.right<=innerWidth&&a.top-t.bottom>n.top-a.bottom&&n.top>=a.bottom&&n.top-a.bottom<=10&&h.top-n.bottom>=16&&document.querySelector('#packageUnlockName').scrollWidth<=n.width+1}""")
    p.screenshot(path=str(OUT/f'{engine}-{width}-tier-{rank}.png'))
    target=['#packageUnlockTitle','.package-unlock-art img','#packageUnlockName','.package-unlock-hint'][rank%4]
    p.locator(target).tap();p.wait_for_selector('#packageUnlock',state='detached')
    assert p.evaluate('!document.getElementById("app").inert')
    assert p.evaluate('pendingPackageCelebrations(g).length')==0
  # Background tap, queued reveals and repeat-click protection.
  show(p,[5,6]);p.mouse.click(2,2);p.mouse.click(2,2)
  p.wait_for_function('packageUnlockView?.rank===6');p.wait_for_function('packageUnlockView.dismissReady')
  assert p.evaluate('pendingPackageCelebrations(g).join()')=='6'
  p.keyboard.press('Enter');p.wait_for_selector('#packageUnlock',state='detached')
  # Failed saves remain retryable without consuming the acknowledgement.
  show(p,[7])
  p.evaluate('window.unlockSave=save;save=()=>false');p.locator('#packageUnlockName').tap()
  assert p.locator('#packageUnlockError').is_visible()
  assert p.evaluate('pendingPackageCelebrations(g).join()')=='7'
  p.evaluate('save=window.unlockSave');p.keyboard.press('Escape');p.wait_for_selector('#packageUnlock',state='detached')
  p.emulate_media(reduced_motion='reduce');show(p,[6]);p.mouse.click(2,2);p.wait_for_selector('#packageUnlock',state='detached')
  assert p.evaluate('JSON.stringify([g.coins,g.owned,g.packages,g.completed])')==before
  p.reload();s.ready(p);assert p.evaluate('pendingPackageCelebrations(g).length')==0
  p.evaluate('g.packageTierUnlocks=[0,1,2];g.packageCelebrations.acknowledged=[0,1,2];navigateBakery("packages")')
  assert p.evaluate('bakeryTier')==2
  p.evaluate('selectBakeryTier(0);refreshBakeryDiscovery()');assert p.evaluate('bakeryTier')==0
  p.evaluate('navigateBakery("menu");navigateBakery("packages")');assert p.evaluate('bakeryTier')==2
  p.evaluate('selectBakeryTier(0);g.packageTierUnlocks.push(3);g.packageCelebrations.acknowledged.push(3);refreshBakeryDiscovery()')
  assert p.evaluate('bakeryTier')==3
  assert p.locator('[data-world-tier="3"]').get_attribute('aria-pressed')=='true'
  p.evaluate('selectBakeryTier(1);refreshBakeryDiscovery()');assert p.evaluate('bakeryTier')==1
  assert not errors,errors
  print('PASS',engine,'unlock art, four viewports, any-area tap, keyboard, queue, retry and persistence',flush=True)
 finally:b.close()
try:
 with s.sync_playwright() as pw:
  for engine in sys.argv[1:] or ['edge','webkit']:run(pw,engine)
finally:s.server.shutdown()

