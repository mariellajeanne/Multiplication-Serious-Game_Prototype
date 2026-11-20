"""Shared learner/helper layout, variable operands and accessible reward details.
Run: python tests/browser-worksheet-layout.py
Helper layout uses a validated observation fixture; the relay suite tests live sync.
"""
import importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('support',ROOT/'tests/browser-ui-replacement.py')
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
OUT=ROOT/'output/playwright/worksheet-layout';OUT.mkdir(parents=True,exist_ok=True)
with s.sync_playwright() as pw:
 for engine in ['edge','webkit']:
  browser=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
  for a,b in [(9,9),(79,18),(663,68),(5155,71),(99999,99)]:
   print('CHECK',engine,a,b,flush=True)
   context=browser.new_context(viewport={'width':2000,'height':1200},has_touch=True)
   p=context.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   p.goto(s.URL);p.wait_for_selector('.hub-food');p.wait_for_load_state('networkidle')
   p.evaluate('([a,b])=>{g.helpSeen=true;closeModal();g.board=[{id:9901,a,b,rarity:1,coinTier:1,base:176,foodId:"pandesal"}];save();startTicket(9901)}',[a,b])
   p.wait_for_function("$('worksheetFrame')?.worksheetStarted===true")
   frame=p.locator('#worksheetFrame').element_handle().content_frame()
   for w,h in [(2000,1200),(1280,800),(844,390),(932,430)]:
    p.set_viewport_size({'width':w,'height':h});p.evaluate('fitWorksheet()');p.wait_for_timeout(350)
    assert p.locator('.worksheet-modern').evaluate('e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth&&e.scrollWidth<=e.clientWidth+1}'),(engine,a,b,w)
    assert p.locator('.worksheet-complete-bar').evaluate('e=>[...e.querySelectorAll("button")].every(b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&r.height>=44})')
    assert frame.locator('[data-top]').first.evaluate('e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.left>=0&&r.right<=innerWidth}'),(a,b,w)
    frame.wait_for_function('document.getElementById("scroller").scrollWidth<=document.getElementById("scroller").clientWidth+1')
    if a==663:p.screenshot(path=str(OUT/f'{engine}-{w}-learner.png'))
   p.locator('.reward-info').first.tap();assert p.locator('.reward-popover').is_visible()
   p.locator('.reward-popover').get_by_role('button',name='Close reward details').tap();assert p.locator('.reward-popover').count()==0
   p.locator('.reward-info').first.focus();assert p.locator('.reward-popover').is_visible();p.keyboard.press('Escape');assert p.locator('.reward-popover').count()==0
   p.evaluate('''()=>{const obs=panaderyaCoBaker.observation;const snapshot=CoBakerWorksheet.snapshot(g.run.worksheetSession,obs.presentation(g.run.worksheetSession));if(!snapshot)throw Error('Invalid fixture');Object.defineProperty(obs,'latest',{get:()=>snapshot,set:()=>{},configurable:true});obs.received=1;panaderyaCoBaker.help.active={role:'Helper',otherId:'b'.repeat(32),otherSession:'c'.repeat(32),sessionId:'a'.repeat(32),lostAt:0};openCoBakerObservation()}''')
   p.wait_for_selector('#coBakerObservation iframe');observer=p.locator('#coBakerObservation iframe').element_handle().content_frame()
   observer.wait_for_selector('.reward-info')
   for w,h in [(2000,1200),(844,390),(932,430)]:
    p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(650)
    assert p.locator('#coBakerObservation').evaluate('e=>{const r=e.querySelector("iframe").getBoundingClientRect(),h=e.querySelector("header").getBoundingClientRect();return r.top>=0&&r.bottom<=h.top+1&&h.bottom<=innerHeight}'),(engine,w,'helper controls overlap')
    assert observer.locator('#observedWorkbench').evaluate('e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.right<=innerWidth&&e.scrollWidth<=e.clientWidth+1}'),(engine,w)
    assert observer.locator('#calculationPanel button:enabled').count()==0
    assert observer.locator('[data-ticket-count]').all_text_contents()==p.evaluate('g.run.stepCoins.options.map(o=>String(g.run.stepCoins.counts[o.rank]))')
    if a==663:p.screenshot(path=str(OUT/f'{engine}-{w}-helper.png'))
   assert not errors,errors
   context.close()
  browser.close();print('PASS',engine,'five operand widths; tablet/landscape phone learner and helper; controls, reward details/counts and read-only permissions',flush=True)
s.server.shutdown()
