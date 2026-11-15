"""Actual browser identity/settings and honest unsupported-native UI. No LAN simulation."""
import importlib.util,sys
from pathlib import Path
sp=importlib.util.spec_from_file_location('support',Path(__file__).with_name('browser-ui-replacement.py'));s=importlib.util.module_from_spec(sp);sp.loader.exec_module(s)
out=s.ROOT/'output/playwright/co-baker';out.mkdir(parents=True,exist_ok=True)
with s.sync_playwright() as pw:
 for engine in sys.argv[1:] or ['edge','webkit']:
  b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge');c=b.new_context(viewport={'width':1280,'height':800},has_touch=True);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.goto(s.URL+'?cobaker=debug');p.wait_for_selector('.hub-food');p.wait_for_function('typeof CoBakerCore!=="undefined"');p.wait_for_load_state('networkidle')
  initial=p.evaluate('JSON.parse(localStorage.panaderyaPlayerV1)');assert initial['name']=='Baker' and len(initial['number'])==4
  game=p.evaluate('JSON.stringify([g.coins,g.owned,g.completed,g.activeMenu])')
  p.locator('#settings-button').click();p.locator('#bakerName').fill('Maria <3');p.get_by_role('button',name='Save name',exact=True).click();p.wait_for_selector('#bakerProfileStatus:text("saved")')
  changed=p.evaluate('JSON.parse(localStorage.panaderyaPlayerV1)');assert changed==dict(initial,name='Maria <3')
  for w,h in [(2000,1200),(1280,800),(1024,768)]:
   p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(200);p.screenshot(path=str(out/f'{engine}-{w}-settings.png'));assert p.locator('.bakery-popup').evaluate('e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&e.querySelector(".popup-body").scrollWidth<=e.querySelector(".popup-body").clientWidth+1}'),p.locator('.bakery-popup').evaluate('e=>({rect:e.getBoundingClientRect().toJSON(),sw:e.scrollWidth,cw:e.clientWidth})')
   p.screenshot(path=str(out/f'{engine}-{w}-settings.png'))
  p.locator('.adult-tools summary').click();p.get_by_role('button',name='Co-Baker network test',exact=True).click();p.wait_for_selector('#coBakerTest');assert 'unavailable' in p.locator('#coBakerTest').inner_text();assert 'Browsers cannot' in p.locator('#coBakerTest').inner_text();assert p.locator('[data-peer]').count()==0
  p.wait_for_timeout(200);p.screenshot(path=str(out/f'{engine}-network-unavailable.png'));p.reload();p.wait_for_selector('.hub-food');p.wait_for_load_state('networkidle');assert p.evaluate('JSON.parse(localStorage.panaderyaPlayerV1)')==changed
  assert p.evaluate('JSON.stringify([g.coins,g.owned,g.completed,g.activeMenu])')==game
  p.goto(s.URL);p.wait_for_selector('.hub-food');p.wait_for_load_state('networkidle');p.locator('#settings-button').click();assert p.get_by_role('button',name='Co-Baker network test',exact=True).count()==0
  p.locator('#modals .close').click();p.locator('.hub-ticket').first.click();p.wait_for_selector('#worksheetFrame');assert p.locator('.worksheet-modern').is_visible();assert not errors,errors
  print('PASS',engine,'persistent profile/name/IDs, settings at 3 sizes, isolated debug screen, browser unavailable status, unchanged solo state and worksheet launch',flush=True);c.close();b.close()
s.server.shutdown()

