"""Spacing and scene registration at real browser zoom, including 300%."""
import importlib.util,json,tempfile,base64
from pathlib import Path
sp=importlib.util.spec_from_file_location('s',Path(__file__).with_name('browser-ui-replacement.py'));s=importlib.util.module_from_spec(sp);sp.loader.exec_module(s)
OUT=s.ROOT/'output/playwright/spacing-zoom';OUT.mkdir(parents=True,exist_ok=True)
SEL=['#wallet-button','#help-button','#settings-button','#menu-heading-global','#boost-status','#menu-cabinet','#orders-board']
def metrics(p):
 return p.evaluate('''sels=>{const r=$('stage').getBoundingClientRect(),k=2000/r.width;return Object.fromEntries(sels.map(s=>{const b=document.querySelector(s).getBoundingClientRect();return [s,[(b.x-r.x)*k,(b.y-r.y)*k,b.width*k,b.height*k]]}))}''',SEL)
def alignment(p):
 assert p.locator('.hub-ticket').evaluate_all('''es=>es.every(e=>{const row=e.querySelector('.order-math'),rs=[...row.children].map(x=>x.getBoundingClientRect()),centers=rs.map(r=>(r.top+r.bottom)/2);return Math.max(...centers)-Math.min(...centers)<.3&&rs.every((r,i)=>!i||Math.abs(r.left-rs[i-1].right-4*document.querySelector('#stage').getBoundingClientRect().width/2000)<.3)&&row.scrollWidth<=row.clientWidth+1})''')
 assert p.locator('.ticket-tier-plaque').evaluate_all('''es=>es.every(e=>{const r=e.getBoundingClientRect(),t=e.parentElement.getBoundingClientRect();return Math.abs((r.x+r.width/2-t.x)/t.width-.5975)<.002&&Math.abs((r.y+r.height/2-t.y)/t.height-.14)<.002})''')
def fixture(p):
 p.evaluate("g.board=Array.from({length:8},(_,i)=>({id:9700+i,rarity:i,coinTier:i,foodId:'pandesal',a:i<4?79:9876,b:18,base:ticketBase(i)}));render()")
 p.wait_for_load_state('networkidle')
try:
 with s.sync_playwright() as pw:
  for engine in ['edge','webkit']:
   b=pw.chromium.launch(channel='msedge') if engine=='edge' else pw.webkit.launch();p=b.new_page(viewport={'width':2000,'height':1200});p.goto(s.URL);p.wait_for_selector('.hub-food');fixture(p);baseline=metrics(p)
   for w,h in [(2000,1200),(1280,800),(420,267)]:
    p.set_viewport_size({'width':w,'height':h});p.evaluate('fitHubInterface()');now=metrics(p)
    for sel in SEL:assert all(abs(x-y)<.3 for x,y in zip(now[sel],baseline[sel])),(engine,w,sel,now[sel],baseline[sel])
    alignment(p);p.screenshot(path=str(OUT/f'{engine}-{w}.png'),animations='disabled')
   p.set_viewport_size({'width':2000,'height':1200});p.evaluate('fitHubInterface()');p.locator('.coin-tier-1').evaluate("e=>e.scrollIntoView({block:'start'})");p.locator('.coin-tier-1').screenshot(path=str(OUT/f'{engine}-ticket.png'),animations='disabled');b.close();print('PASS',engine,'spacing and normalized anchors across desktop/tablet/small CSS viewports',flush=True)
  with tempfile.TemporaryDirectory(dir=OUT) as folder:
   base=Path(folder);ext=base/'extension';ext.mkdir();(ext/'manifest.json').write_text(json.dumps({'manifest_version':3,'name':'Zoom regression','version':'1.0','permissions':['tabs'],'background':{'service_worker':'background.js'}}));(ext/'background.js').write_text('chrome.runtime.onInstalled.addListener(()=>{});')
   c=pw.chromium.launch_persistent_context(str(base/'profile'),channel='msedge',headless=True,no_viewport=True,args=[f'--disable-extensions-except={ext}',f'--load-extension={ext}','--window-size=1280,900'])
   worker=c.service_workers[0] if c.service_workers else c.wait_for_event('serviceworker');p=c.new_page();p.goto(s.URL);p.wait_for_selector('.hub-food');fixture(p);baseline=metrics(p)
   for factor in [1,1.25,1.5,2,3]:
    actual=worker.evaluate('''async z=>{const t=(await chrome.tabs.query({})).find(t=>t.url.includes('/index.html'));await chrome.tabs.setZoom(t.id,z);return chrome.tabs.getZoom(t.id)}''',factor);assert abs(actual-factor)<.001;p.wait_for_timeout(250);now=metrics(p)
    for sel in SEL:assert all(abs(x-y)<.5 for x,y in zip(now[sel],baseline[sel])),(factor,sel,now[sel],baseline[sel])
    alignment(p);capture=c.new_cdp_session(p).send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False});(OUT/f'edge-real-zoom-{factor}.png').write_bytes(base64.b64decode(capture['data']));print('PASS real Edge zoom',factor,p.evaluate('[innerWidth,innerHeight,devicePixelRatio]'),flush=True)
   c.close()
finally:s.server.shutdown()
