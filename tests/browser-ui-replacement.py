"""The ACTUAL index.html: transferred art, real state/actions, native touch and preservation.
Run: python tests/browser-ui-replacement.py edge webkit
"""
import functools,http.server,json,os,re,sys,threading
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(ROOT/'.test-tools/browsers'))
from playwright.sync_api import sync_playwright
OUT=ROOT/'output/playwright/production';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}/index.html'
def screenshot(page,name):
 page.wait_for_timeout(180);page.screenshot(path=str(OUT/(name+'.png')),animations='disabled')
def top(page,selector):
 page.locator(selector).evaluate('e=>e.scrollTop=0');page.wait_for_timeout(80)
def touch_drag(page,selector,thumb=False):
 r=page.locator(selector).bounding_box();x=r['x']+r['width']/2;y=r['y']+(r['height']/2 if thumb else r['height']-25)
 end=y+100 if thumb else r['y']+25
 cdp=page.context.new_cdp_session(page)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
 for i in range(1,15):
  cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y+(end-y)*i/14}]});page.wait_for_timeout(15)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach();page.wait_for_timeout(350)
def test_scroll(page,engine,viewport,track,thumb,arrow):
 top(page,viewport);r=page.locator(viewport).bounding_box();page.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);page.mouse.wheel(0,400);page.wait_for_timeout(200)
 assert page.locator(viewport).evaluate('e=>e.scrollTop')>0,('wheel',viewport)
 assert int(page.locator(thumb).get_attribute('aria-valuenow'))>0
 top(page,viewport);page.locator(arrow).tap();page.wait_for_timeout(400)
 assert page.locator(viewport).evaluate('e=>e.scrollTop')>0,('arrow',viewport)
 top(page,viewport);r=page.locator(track).bounding_box();x=r['x']+r['width']/2;y=r['y']+r['height']-2
 hit=page.evaluate('''p=>{const e=document.elementFromPoint(p.x,p.y);return e?.outerHTML.slice(0,250)}''',{'x':x,'y':y})
 page.mouse.click(x,y);page.wait_for_timeout(180)
 assert page.locator(viewport).evaluate('e=>Math.abs(e.scrollTop-(e.scrollHeight-e.clientHeight))')<3,('track',viewport,hit,page.locator(viewport).evaluate('e=>[e.scrollTop,e.scrollHeight,e.clientHeight]'))
 top(page,viewport);r=page.locator(thumb).bounding_box();page.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);page.mouse.down();page.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2+110,steps=12);page.mouse.up()
 assert page.locator(viewport).evaluate('e=>e.scrollTop')>0,('thumb',viewport)
 page.locator(thumb).focus();page.keyboard.press('End');page.wait_for_timeout(70)
 assert page.locator(viewport).evaluate('e=>Math.abs(e.scrollTop-(e.scrollHeight-e.clientHeight))')<3
 page.keyboard.press('Home');page.wait_for_timeout(70)
 if engine=='edge':
  touch_drag(page,viewport);assert page.locator(viewport).evaluate('e=>e.scrollTop')>0,('native touch swipe',viewport)
  assert not page.locator('#hubCollection').is_visible() and page.locator('#modals .modal').count()==0
  assert page.locator('.is-pressed').count()==0
  top(page,viewport);touch_drag(page,thumb,True);assert page.locator(viewport).evaluate('e=>e.scrollTop')>0,('native touch thumb',viewport)
 page.locator(thumb).focus();page.keyboard.press('End')
def fixture(page,count):
 page.evaluate('''n=>{g.run=null;g.orderRuns={};g.autoEquip='off';g.owned=FOOD.slice(0,n).map((f,i)=>({uid:i+1,id:f.id,level:1,fusion:1,spent:0}));g.activeMenu=g.owned.map(o=>o.uid);g.discovered=g.owned.map(o=>o.id);g.menuSlots=n;g.uidNext=n+1;render()}''',count)
 page.wait_for_function("[...document.querySelectorAll('#stage img')].every(i=>i.complete&&i.naturalWidth)")
def normalize(value):return re.sub(r'http://127\.0\.0\.1:\d+','http://local',json.dumps(value,sort_keys=True))
def preserved_interfaces(page,engine):
 page.evaluate("g.coins=1e9;g.completed=300;save();openPackages('buy',0)")
 page.wait_for_timeout(150)
 assert page.locator('.package-workspace').is_visible() and page.locator('.package-type-card').count()==9
 assert page.locator('.package-shop-modal.bakery-popup').count()==0
 if engine=='edge':
  before=json.loads((ROOT/'tests/fixtures/preserved-interfaces.json').read_text(encoding='utf-8'))['package']
  now=page.locator('.package-shop-modal').evaluate('''root=>[root,...root.querySelectorAll('*')].map(el=>{const s=getComputedStyle(el);return [el.tagName,el.className,...['display','position','fontFamily','fontSize','fontWeight','color','background','border','borderRadius','boxShadow','padding','gap','minHeight'].map(k=>s[k])]})''')
  assert normalize(before)==normalize(now),'Original Packages appearance changed'
 screenshot(page,f'{engine}-preserved-packages')
 page.evaluate("closeModal();g.board=[{id:9001,rarity:1,coinTier:1,a:79,b:18,base:ticketBase(1),foodId:'pandesal'}];g.ticketSeq=9001;refillBoard();save();startTicket(9001)")
 page.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===9001")
 if engine=='edge':
  before=json.loads((ROOT/'tests/fixtures/preserved-interfaces.json').read_text(encoding='utf-8'))['worksheet']
  now=page.locator('.hub-order-workspace').evaluate('''root=>[root,...root.querySelectorAll('*')].filter(e=>e.tagName!=='IFRAME').map(el=>{const s=getComputedStyle(el);return [el.tagName,el.className?.baseVal??el.className,...['display','position','fontFamily','fontSize','fontWeight','color','background','border','borderRadius','boxShadow','padding','gap','minHeight'].map(k=>s[k])]})''')
  assert normalize(before)==normalize(now),'Original worksheet shell appearance changed'
 assert page.locator('#worksheetFrame').get_attribute('src')=='worksheet/worksheet-engine.html'
 assert page.locator('#answer').count()==0
 screenshot(page,f'{engine}-preserved-worksheet')
 page.evaluate("window.originalFrame=$('worksheetFrame');window.originalBudget=g.run.budget")
 page.locator('.worksheet-exit').tap();page.locator('.nav-play').tap()
 assert page.evaluate("originalFrame===$('worksheetFrame')&&originalBudget===g.run.budget")
 page.locator('.worksheet-exit').tap()
def run(pw,engine):
 browser=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
 context=browser.new_context(viewport={'width':1280,'height':800},has_touch=True);page=context.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 try:
  page.goto(URL);page.wait_for_selector('.hub-food');page.wait_for_load_state('networkidle')
  assert page.locator('.stage-background').get_attribute('src')=='assets/bakery-ui/bakery-room.png'
  assert page.locator('.hub-brand,.package-shelf-art,.hub-package-grid,.illustrated-room,.showcase-heading').count()==0
  preserved_interfaces(page,engine)
  for width,height in [(2000,1200),(1280,800)]:
   page.set_viewport_size({'width':width,'height':height});stationary=page.locator('#menu-cabinet').bounding_box()
   for count in [1,3,5,9,10,16,17]:
    fixture(page,count);assert page.locator('.hub-food').count()==count
    box=page.locator('#menu-cabinet').bounding_box();assert all(abs(box[k]-stationary[k])<1 for k in box)
    assert page.locator('#bakerBoost').inner_text()==page.evaluate("'×'+multiplierLabel(bakeryValue())")
    assert page.evaluate('''()=>g.board.every(t=>menuRecipes().includes(t.foodId))''')
    assert page.evaluate('''()=>{const cells=[...document.querySelectorAll('.hub-food')],r=document.querySelector('#cabinet-scroll').getBoundingClientRect();return cells.every(e=>{const c=e.getBoundingClientRect(),b=e.querySelector('.food-multiplier').getBoundingClientRect();return c.left>=r.left-1&&c.right<=r.right+1&&b.left>=c.left&&b.right<=c.right&&b.top>=c.top&&b.bottom<=c.bottom})}''')
    assert page.evaluate('''()=>{const all=[...document.querySelectorAll('.hub-food')].map(e=>e.getBoundingClientRect()),y=Math.max(...all.map(r=>r.top)),last=all.filter(r=>Math.abs(r.top-y)<1),g=document.querySelector('#cabinet-grid').getBoundingClientRect();return Math.abs((last[0].left+last.at(-1).right-g.left-g.right)/2)<2}''')
    assert page.locator('#cabinet-scroll').evaluate('e=>e.scrollHeight>e.clientHeight+2')==(count>9)
    page.wait_for_timeout(80)
    assert page.locator('#cabinet-scrollbar').get_attribute('aria-hidden')==('false' if count>9 else 'true')
    assert page.evaluate('''()=>{const board=document.querySelector('#orders-board').getBoundingClientRect(),reg=document.querySelector('.register-art').getBoundingClientRect(),list=document.querySelector('#order-scroller').getBoundingClientRect(),controls=document.querySelector('.board-utilities').getBoundingClientRect(),heading=document.querySelector('.board-title').getBoundingClientRect(),hud=document.querySelector('.top-hud').getBoundingClientRect(),stage=document.querySelector('#stage').getBoundingClientRect();return heading.bottom<=controls.top&&controls.bottom<list.top&&controls.bottom<reg.top&&reg.top<list.bottom&&reg.top<board.bottom&&reg.bottom<stage.top+stage.height*.825&&stage.right-hud.right>=15}''')
    screenshot(page,f'{engine}-{width}-foods-{count}')
   test_scroll(page,engine,'#cabinet-scroll','#cabinet-track','#cabinet-thumb','[data-hub-action="food-down"]')
   screenshot(page,f'{engine}-{width}-foods-last-row')
   test_scroll(page,engine,'#order-scroller','#board-scroll-track','#board-scroll-thumb','[data-hub-action="order-down"]')
   screenshot(page,f'{engine}-{width}-orders-last-row')
   page.locator('.nav-collection').tap();assert page.locator('.collection-card').count()==17
   page.wait_for_timeout(180)
   assert page.locator('.collection-card img').evaluate_all('els=>els.every(i=>i.complete&&i.naturalWidth)')
   screenshot(page,f'{engine}-{width}-collection')
   grid=page.locator('.hub-collection .menu-grid');r=grid.bounding_box();page.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);page.mouse.wheel(0,450);page.wait_for_timeout(200)
   assert grid.evaluate('e=>e.scrollTop')>0
   if engine=='edge':
    top(page,'.hub-collection .menu-grid');touch_drag(page,'.hub-collection .menu-grid')
    assert grid.evaluate('e=>e.scrollTop')>0 and page.evaluate('selectedFoods.size')==0
   page.locator('.hub-collection-back').tap();page.locator('.nav-collection').tap()
   assert page.locator('.hub-collection .menu-grid').evaluate('e=>e.scrollTop')==0
   page.locator('.hub-collection-back').tap()
   # The production game permits an empty menu; keep it playable without fake slots.
   page.evaluate('g.activeMenu=[];render()')
   assert page.locator('.hub-food').count()==0
   assert page.locator('#cabinet-scroll').evaluate('e=>e.scrollHeight<=e.clientHeight+2')
   page.locator('#chooseEquippedFood').tap();page.locator('.collection-equip').first.tap();page.locator('.hub-collection-back').tap()
   assert page.locator('.hub-food').count()==1
   for selector,title in [('#help-button','How to Play'),('#settings-button','Settings'),('#wallet-button','Coins'),('#boost-status',"Baker's Boost"),('[data-hub-action="odds"]','Coin')]:
    page.locator(selector).tap();assert page.locator('#modals .bakery-popup').is_visible()
    assert title.lower() in page.locator('#modalTitle').inner_text().lower()
    assert page.locator('#modals .modalbody').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    screenshot(page,f'{engine}-{width}-popup-{selector.replace("#","").replace("[","").replace("]","").replace("=","").replace(chr(34),"")}')
    page.locator('#modals .close').tap()
   # Every home Packages entry reaches the original shop, never the demo popup.
   for selector in ['#packages-plaque','.alcove-hit','.nav-packages']:
    before=page.locator('#package-station').bounding_box();page.locator(selector).tap();assert page.locator('.package-workspace').is_visible();page.locator('#modals .close').tap();assert page.locator('#package-station').bounding_box()==before
  page.set_viewport_size({'width':1440,'height':900});fixture(page,9);screenshot(page,f'{engine}-1440-home')
  page.set_viewport_size({'width':1280,'height':800});fixture(page,17)
  # Real package opening supplies a duplicate, unlocking paid Mastery through existing logic.
  page.evaluate("g.coins=1e9;g.completed=300;save();window.savedRandom=Math.random;Math.random=()=>0")
  page.locator('.nav-packages').tap();page.locator('[data-package-type="0"]').tap();page.locator('#packageBuy').tap()
  token=page.locator('.package-open-slot:not(.opened-package)').first.get_attribute('data-package-token')
  page.locator('.package-open-slot:not(.opened-package)').first.tap();assert page.locator('.opened-package').count()==1
  assert not page.evaluate('token=>openPackageSlot(0,token)',token)
  assert page.locator('.package-shop-modal .illustrated-food').count()==0
  page.evaluate('Math.random=savedRandom');page.locator('#modals .close').tap()
  page.locator('.hub-food[data-food="pandesal"]').tap();before=page.evaluate('bakeryValue()');wallet=page.evaluate('g.coins');price=page.evaluate('foodLevelPrice(g.owned.find(o=>o.id==="pandesal"))')
  assert page.locator('.action-mastery').is_enabled();page.locator('.action-mastery').tap()
  assert page.evaluate('bakeryValue()')>before and page.evaluate('g.coins')==wallet-price
  assert page.evaluate("JSON.parse(localStorage.getItem('panaderyaQuestV2')).owned.find(o=>o.id==='pandesal').mastery")>0
  screenshot(page,f'{engine}-mastery-upgraded')
  page.locator('.action-unequip').tap();assert page.evaluate('bakeryValue()')<before
  page.locator('.action-equip').tap();assert page.evaluate('bakeryValue()')>before
  page.locator('.food-panel-close').tap();page.locator('[aria-label="Auto Equip"]').select_option('final');assert page.evaluate("g.autoEquip==='final'")
  page.locator('[aria-label="Auto Equip"]').select_option('off');page.locator('.hub-collection-back').tap()
  saved=page.evaluate('JSON.stringify({coins:g.coins,menu:g.activeMenu,owned:g.owned})');page.reload();page.wait_for_selector('.hub-food')
  assert page.evaluate('JSON.stringify({coins:g.coins,menu:g.activeMenu,owned:g.owned})')==saved
  assert not errors,errors
  (OUT/f'{engine}-integration-results.json').write_text(json.dumps({'passed':True,'actual_project':str(ROOT),'viewports':[[2000,1200],[1280,800],[1440,900]],'counts':[1,3,5,9,10,16,17],'native_touch_gestures':engine=='edge','exceptions_preserved':True,'errors':errors},indent=2),encoding='utf-8')
  print(f'PASS {engine}: actual-project art/data, seven food counts, both scrollbars, touch, navigation, real Packages/duplicates/Mastery/equipment, save/reload and original worksheet',flush=True)
 except Exception:
  screenshot(page,f'{engine}-integration-FAILURE');print('ERRORS',errors,flush=True);raise
 finally:browser.close()
if __name__=='__main__':
 try:
  with sync_playwright() as pw:
   for engine in sys.argv[1:] or ['edge','webkit']:run(pw,engine)
 finally:server.shutdown()
