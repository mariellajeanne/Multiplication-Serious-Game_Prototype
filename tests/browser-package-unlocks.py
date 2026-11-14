"""Earned milestones, safe presentation, durable queue, and real 1/5/10 reveals.
Run: python tests/browser-package-unlocks.py edge webkit
"""
import importlib.util,json,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('support',Path(__file__).with_name('browser-ui-replacement.py'))
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
OUT=s.ROOT/'output/playwright/package-unlocks';OUT.mkdir(parents=True,exist_ok=True)

def shot(p,name):
 p.wait_for_timeout(900);p.screenshot(path=str(OUT/(name+'.png')))

def fits(p):
 return p.locator('#packageUnlock').evaluate('''e=>{const c=e.firstElementChild,r=c.getBoundingClientRect();return e.scrollWidth<=e.clientWidth+1&&r.left>=0&&r.right<=innerWidth&&[...c.querySelectorAll('h1,h2,p,button')].every(n=>n.scrollWidth<=n.clientWidth+1)}''')

def acknowledge(p):
 p.locator('#packageUnlockAwesome').tap();p.wait_for_timeout(230)

def geometry(p):
 return p.evaluate('''()=>['#menu-cabinet','#orders-board','#order-scroller','#package-station','.top-hud','.bottom-nav'].map(sel=>{const r=document.querySelector(sel).getBoundingClientRect();return [r.x,r.y,r.width,r.height]})''')

def check(pw,engine):
 b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
 c=b.new_context(viewport={'width':1280,'height':800},has_touch=True);p=c.new_page();errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 try:
  p.goto(s.URL);p.wait_for_selector('.hub-food');p.wait_for_load_state('networkidle')
  assert p.locator('#packageUnlock').count()==0
  # Earn the first gate through the existing order claim. Active and paused
  # worksheets and the completed-order result all retain their own screens.
  p.evaluate("g.completed=3;g.board=[{id:9001,rarity:1,coinTier:1,a:79,b:18,base:ticketBase(1),foodId:'pandesal'}];g.ticketSeq=9001;refillBoard();save();startTicket(9001)")
  p.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===9001")
  p.evaluate('g.completed=4;save();render()');p.wait_for_timeout(1100)
  assert p.locator('#packageUnlock').count()==0 and p.locator('#worksheetFrame').is_visible()
  p.locator('.worksheet-exit').tap();p.wait_for_timeout(1100)
  assert p.locator('#packageUnlock').count()==0
  p.evaluate('g.completed=3;g.run.phase="claim";g.run.pool=g.run.budget;prizeItems()');p.wait_for_timeout(1100)
  assert p.locator('.coin-reward-modal').is_visible() and p.locator('#packageUnlock').count()==0
  original_geometry=geometry(p)
  p.locator('.coin-reward-modal .primary').tap();p.wait_for_selector('#packageUnlock')
  assert p.locator('#packageUnlockName').inner_text()=='Lucky Package'
  assert p.evaluate("['app','modals','notificationDock'].every(id=>$(id).inert)")
  assert p.evaluate("$('packageUnlockAwesome')===document.activeElement")
  assert p.locator('.package-unlock-art').evaluate('e=>{const actual=document.createElement("div");actual.innerHTML=packageArt();return actual.firstElementChild.isEqualNode(e.firstElementChild)}')
  assert p.locator('#app').evaluate('e=>getComputedStyle(e).filter==="blur(4px)"')
  assert geometry(p)==original_geometry
  p.keyboard.press('Tab');assert p.locator('#packageUnlockAwesome').evaluate('e=>e===document.activeElement')
  p.keyboard.press('Shift+Tab');p.keyboard.press('Escape');assert p.locator('#packageUnlock').is_visible()
  p.locator('#packageUnlock').click(position={'x':5,'y':5});assert p.locator('#packageUnlock').is_visible()
  assert fits(p);shot(p,engine+'-lucky-1280')
  p.reload();p.wait_for_selector('#packageUnlock');assert p.locator('#packageUnlockName').inner_text()=='Lucky Package'
  acknowledge(p);assert p.locator('#packageUnlock').count()==0
  assert geometry(p)==original_geometry
  assert p.evaluate("['app','modals','notificationDock'].every(id=>!$(id).inert)")
  p.reload();p.wait_for_selector('.hub-food');p.wait_for_timeout(1100);assert p.locator('#packageUnlock').count()==0
  p.locator('.nav-packages').tap();assert p.locator('[data-package-rank="1"]').is_visible()
  assert p.locator('.packages-collection-card').evaluate_all('es=>es.map(e=>+e.dataset.packageRank)')==[1,0]
  p.locator('#modals .close').tap()
  # An outstanding reward flight defers the next tier even without a modal.
  p.evaluate('g.completed=12;save();render();rewardPresentation.pending=1');p.wait_for_timeout(1100)
  assert p.locator('#packageUnlock').count()==0
  p.evaluate('rewardPresentation.pending=0');p.wait_for_selector('#packageUnlockName');assert p.locator('#packageUnlockName').inner_text()=='Fortunate Package'
  acknowledge(p)
  # Several earned tiers share one locked backdrop and appear in tier order.
  p.locator('#settings-button').tap();p.evaluate('g.completed=260;save();render()');p.wait_for_timeout(1100)
  assert p.locator('#packageUnlock').count()==0
  p.locator('#modals .close').tap();p.wait_for_selector('#packageUnlock')
  for rank,name in enumerate(['Charmed','Blessed','Miraculous','Divine','Fate','Sovereign'],3):
   assert p.locator('#packageUnlockName').inner_text()==name+' Package'
   assert p.locator('#packageUnlock').count()==1
   if rank==3:
    for w,h in [(2000,1200),(1280,800),(390,844),(420,267)]:
     p.set_viewport_size({'width':w,'height':h});assert fits(p);p.locator('#packageUnlockAwesome').scroll_into_view_if_needed();shot(p,f'{engine}-charmed-{w}')
    p.set_viewport_size({'width':1280,'height':800})
   if rank==8:shot(p,engine+'-sovereign')
   acknowledge(p)
  assert p.locator('#packageUnlock').count()==0
  # Reduced motion disables entrance, reveal, particles, and exit motion.
  p.emulate_media(reduced_motion='reduce');p.evaluate('g.packageCelebrations.acknowledged=[0,1,2,3,4,5,6,7];localStorage.setItem("panaderyaQuestV2",JSON.stringify(g));render()');p.wait_for_selector('#packageUnlock')
  assert p.locator('#packageUnlock').evaluate('e=>e.getAnimations({subtree:true}).length')==0
  shot(p,engine+'-reduced-motion');acknowledge(p);p.emulate_media(reduced_motion='no-preference')
  # The production batch presentation reuses actual food/Mastery accounting.
  for width,height in [(2000,1200),(1280,800)]:
   p.set_viewport_size({'width':width,'height':height})
   for quantity in [1,5,10]:
    p.evaluate('g.coins=1e12;save();openPackages("buy",0)')
    p.locator(f'[data-package-count="{quantity}"]').tap();assert p.locator('.batch-reward').count()==quantity
    shot(p,f'{engine}-{width}-x{quantity}-packages')
    p.evaluate('revealAllPackageRewards()');assert p.locator('.batch-reward.is-revealed').count()==quantity
    assert p.locator('.batch-reward').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1)')
    assert p.locator('#packageBatch').evaluate('e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1')
    assert p.locator('.batch-food .food-art').evaluate_all('es=>es.every(e=>getComputedStyle(e).objectFit==="contain")')
    shot(p,f'{engine}-{width}-x{quantity}-rewards')
    p.locator('#packageBatchCollect').tap();p.wait_for_selector('#packageBatch',state='detached');p.locator('#modals .close').tap()
  assert errors==[],errors
  print(f'PASS {engine}: earned claim, worksheet/results/flight deferral, durable ordered queue, focus/inert, reduced motion, responsive celebration and x1/x5/x10 real rewards',flush=True)
 except Exception:
  p.screenshot(path=str(OUT/(engine+'-failure.png')));print('ERRORS',errors,flush=True);raise
 finally:c.close();b.close()

try:
 with s.sync_playwright() as pw:
  for engine in sys.argv[1:] or ['edge','webkit']:check(pw,engine)
finally:s.server.shutdown()
