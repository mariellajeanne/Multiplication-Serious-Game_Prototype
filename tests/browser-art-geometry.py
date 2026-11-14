"""Lock pre-overhaul geometry while validating replacement art on desktop/tablet."""
import importlib.util,json,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('support',Path(__file__).with_name('browser-ui-replacement.py'))
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
OUT=s.ROOT/'output/art-overhaul';OUT.mkdir(parents=True,exist_ok=True)
# Original production slots in the unchanged 2000 x 1200 coordinate system.
SLOTS={'#title-sign':[510,-6,920,240],'#package-station':[6,110,510,780],'#menu-cabinet':[520,207,900,700],'#cabinet-inner':[575,373,800,462],'#orders-board':[1430,149,410,727],'#order-scroller':[1478,378,314,443],'.bottom-nav':[340,1014,1320,142],'.top-hud':[1508,18,458,87],'.cabinet-header':[568,232,804,86],'#cabinet-scrollbar':[1336,373,39,462],'#board-scroll-rail':[1802,378,27,450]}

def geometry(p):
 return p.evaluate('''slots=>{const stage=$('stage').getBoundingClientRect(),scale=stage.width/2000;return Object.fromEntries(Object.keys(slots).map(sel=>{const r=document.querySelector(sel).getBoundingClientRect();return [sel,[(r.left-stage.left)/scale,(r.top-stage.top)/scale,r.width/scale,r.height/scale]]}))}''',SLOTS)

def check(pw,engine):
 b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
 errors=[];samples=[]
 try:
  for mobile in [False,True]:
   opts={'viewport':{'width':1280 if mobile else 2000,'height':800 if mobile else 1200},'has_touch':True}
   if mobile:opts.update(is_mobile=True,device_scale_factor=2,user_agent='Mozilla/5.0 (Linux; Android 14; Tablet) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36')
   c=b.new_context(**opts);p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
   p.goto(s.URL);p.wait_for_selector('.hub-food');p.wait_for_load_state('networkidle')
   for width,height in ([(1280,800)] if mobile else [(2000,1200),(1280,800)]):
    p.set_viewport_size({'width':width,'height':height});p.evaluate('fitHubInterface()')
    for count in [1,3,5,9,10,16,17]:
     s.fixture(p,count);values=geometry(p)
     for sel,expected in SLOTS.items():
      assert all(abs(x-y)<.2 for x,y in zip(values[sel],expected)),(engine,mobile,width,count,sel,values[sel],expected)
     assert p.locator('#cabinet-scroll').evaluate('e=>getComputedStyle(e).overflowY==="auto"&&e.scrollWidth<=e.clientWidth+1')
     assert p.locator('#order-scroller').evaluate('e=>getComputedStyle(e).overflowX==="hidden"&&e.scrollWidth<=e.clientWidth+1')
     assert p.locator('.ticket-cutout').evaluate_all('es=>es.every(e=>getComputedStyle(e).maskImage.includes("order-ticket-mask.svg")||getComputedStyle(e).webkitMaskImage.includes("order-ticket-mask.svg"))')
     assert p.locator('.register-art').evaluate('e=>(getComputedStyle(e).maskImage||getComputedStyle(e).webkitMaskImage).includes("register-cutout.svg")')
     assert p.locator('.hub-food').count()==count
     if count in [1,17]:p.screenshot(path=str(OUT/f'{engine}-{"android" if mobile else "desktop"}-{width}-foods-{count}.png'),animations='disabled')
    samples.append({'android_emulation':mobile,'viewport':[width,height],'slots':values})
   if mobile:
    s.top(p,'#order-scroller')
    if engine=='edge':s.touch_drag(p,'#order-scroller')
    else:p.locator('#board-scroll-thumb').focus();p.keyboard.press('End')
    assert p.locator('#order-scroller').evaluate('e=>e.scrollTop')>0
    p.locator('#settings-button').tap();assert p.locator('.settings-list').is_visible();p.locator('#modals .close').tap()
    p.locator('.nav-collection').tap();assert p.locator('.collection-card').count()==17
    p.screenshot(path=str(OUT/f'{engine}-android-collection.png'),animations='disabled');p.locator('.hub-collection-back').tap()
   c.close()
  assert not errors,errors
  (OUT/f'{engine}-geometry-results.json').write_text(json.dumps({'passed':True,'original_geometry':SLOTS,'samples':samples,'original_masks_preserved':True,'errors':errors},indent=2))
  print(f'PASS {engine}: original panel/viewport/header/navigation/HUD geometry and masks at both desktop sizes and Android landscape; seven menu counts',flush=True)
 finally:b.close()
try:
 with s.sync_playwright() as pw:
  for engine in sys.argv[1:] or ['edge','webkit']:check(pw,engine)
finally:s.server.shutdown()
