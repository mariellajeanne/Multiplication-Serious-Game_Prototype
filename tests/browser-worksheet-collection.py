"""Current worksheet geometry/state and collection interactions, focused landscape QA.
Run: python tests/browser-worksheet-collection.py edge webkit
"""
import importlib.util,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('tablet',Path(__file__).with_name('browser-tablet-repairs.py'))
t=importlib.util.module_from_spec(spec);spec.loader.exec_module(t)
OUT=t.s.ROOT/'output/playwright/worksheet-collection';OUT.mkdir(parents=True,exist_ok=True)

def shot(p,name):
 p.wait_for_function('Array.from(document.images).filter(e=>e.getClientRects().length).every(e=>e.complete&&e.naturalWidth>0)')
 p.wait_for_timeout(180);p.screenshot(path=str(OUT/(name+'.png')))
def aligned(p):
 result=t.frame(p).evaluate('''()=>{
  const r=e=>e.getBoundingClientRect(),top=r(document.querySelector(`[data-top="${s.k}"]`)),bottom=r(document.querySelector(`[data-bottom="${s.row}"]`)),tile=r(document.querySelector('[data-part="ones"]')),float=r(document.getElementById('floating'));
  return {edge:tile.right-top.right,vertical:(float.top+float.bottom-top.top-top.height/2-bottom.top-bottom.height/2)/2,k:s.k,raw:s.raw};
 }''')
 assert abs(result['edge'])<1 and abs(result['vertical'])<1,result
def no_remnant(p):
 assert t.frame(p).locator('#floating').evaluate('e=>e.hidden&&e.children.length===0&&e.getBoundingClientRect().width===0')

def worksheet(p,engine,width):
 touch=engine=='edge'
 for a,b in [(76,2),(23,2),(9,0)]:
  t.fixture(p,a,b);no_remnant(p)
  for index in range(2):
   reverse=index==1;t.connect(p,reverse,True,touch)
   st=t.child(p,'({a:s.A[s.k],b:s.B[s.row]})')
   assert t.frame(p).locator('#equationReveal').inner_text()==f'{st["b"] if reverse else st["a"]} × {st["a"] if reverse else st["b"]}'
   t.generate(p);aligned(p);assert p.locator('#generateAnswer').count()==0
   if a==76:shot(p,f'{engine}-{width}-column-{index}')
   if t.child(p,'s.incoming&&!s.mixed'):
    k=t.child(p,'s.k');t.frame(p).locator(f'[data-carry="{k}"]').tap();t.frame(p).locator('[data-part="ones"]').tap()
    p.wait_for_function("$('worksheetFrame').contentWindow.eval('s.mixed')");aligned(p)
   t.place(p,True,touch)
   if a==76 and index==0 and width==2000:
    p.locator('[data-worksheet-control="undo"]').tap();p.wait_for_timeout(150);aligned(p)
    t.frame(p).locator('[data-part="tens"]').tap();t.frame(p).locator('[data-carry="1"]').tap();p.wait_for_timeout(250)
    before=t.child(p,'JSON.stringify(s)');p.locator('.worksheet-exit').tap();p.evaluate('navigateBakery("orders")')
    p.locator('[data-ticket-id]').first.tap();p.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===g.run.ticket.id")
    assert t.child(p,'JSON.stringify(s)')==before
    p.reload();t.ready(p);p.wait_for_selector('#worksheetFrame');p.wait_for_timeout(200)
    assert t.child(p,'JSON.stringify(s)')==before
  no_remnant(p)
 for option in ['auto','manual']:
  t.fixture(p,6,7,True);t.connect(p);t.frame(p).locator('#equationReveal').tap()
  choices=t.frame(p).locator('.floating-golden-choice');choices.wait_for()
  assert choices.evaluate('''e=>{const [a,b]=[...e.children].map(n=>n.getBoundingClientRect());return a.bottom<=b.top+1&&Math.abs(a.left-b.left)<1&&a.height>=44&&b.height>=44&&parseFloat(getComputedStyle(e.firstElementChild).fontSize)>=19}''')
  if option=='manual':shot(p,f'{engine}-{width}-golden')
  t.frame(p).locator(f'[data-golden-option="{option}"]').tap()
  if option=='manual':
   p.wait_for_selector('.calculation-keypad');no_remnant(p);shot(p,f'{engine}-{width}-manual')
   for answer in ['11','42']:
    for digit in answer:p.locator(f'[data-calc-key="{digit}"]').tap()
    p.locator('[data-calc-key="Enter"]').tap();p.wait_for_timeout(80)
   p.wait_for_function('g.run.factAnswers["0:0"].status==="success"')
   assert p.evaluate('g.run.factAnswers["0:0"].attempts.length')==2
  p.wait_for_function("$('worksheetFrame').contentWindow.eval('s.revealed')")
  assert t.frame(p).locator('[data-part]').all_text_contents()==['4','2'];aligned(p);t.place(p,True,touch);no_remnant(p)
 if width==2000:
  t.fixture(p,79,18)
  while t.child(p,'s.phase')!='sum':t.connect(p);t.generate(p);aligned(p);t.place(p,True,touch)
  no_remnant(p);t.completion.g.complete_addition(p,engine)
  assert p.evaluate('g.run.procedureComplete')
 print(f'PASS {engine} {width}: exact right-edge/vertical alignment, single/two-digit/zero products, columns, touch/mouse drags, Golden auto/manual, no stale frame',flush=True)

def collection(p,engine,width):
 # Leave the active touch worksheet through its real controller before replacing
 # the test inventory, rather than removing an iframe under queued touch input.
 if p.evaluate('!!g.run&&!g.run.paused'):
  if p.evaluate('!!g.run.procedureComplete'):
   p.locator('#collectRewards').tap();p.locator('#skipWorksheetSummary').tap()
   p.locator('#acknowledgeWorksheetSummary').tap();p.wait_for_function('!g.run')
  else:
   p.locator('.worksheet-exit').tap();p.wait_for_function('g.run.paused')
 p.evaluate('''()=>{
  g.run=null;g.orderRuns={};g.autoEquip='off';g.coins=1e6;
  g.owned=FOOD.slice(0,8).map((f,i)=>({uid:i+1,id:f.id,level:1,mastery:0,fusion:1,spent:0}));
  g.owned[1].mastery=2;g.recipeCeilings=Object.fromEntries(g.owned.map(o=>[o.id,4]));
  g.activeMenu=[1,2];g.menuSlots=3;g.discovered=g.owned.map(o=>o.id);g.uidNext=9;
  selectedFoods.clear();multiSelect=false;hubCollection=false;hubFoodDirect=false;save();render();navigateBakery('menu');
 }''')
 p.wait_for_function('!bakeryJourney');p.locator('.view-all-foods').tap()
 head=p.locator('.collection-popup-head');head.wait_for();shot(p,f'{engine}-{width}-collection')
 if width>=1600:
  assert head.evaluate('''e=>{const r=n=>n.getBoundingClientRect(),els=[e.querySelector('h2'),e.querySelector('.collection-status-pill'),e.querySelector('.collection-index'),e.querySelector('.hub-collection-back')],rs=els.map(r);return rs.every(n=>Math.abs(n.top+n.height/2-rs[0].top-rs[0].height/2)<1)&&rs.every((n,i)=>!i||n.left>=rs[i-1].right)}''')
  assert p.locator('.collection-toolbar-actions').evaluate('''e=>{const els=[e.querySelector('[data-focus="select-foods"]'),...e.querySelectorAll('.collection-browse-controls .hub-select-field'),e.querySelector('.collection-equip-pill')],rs=els.map(n=>n.getBoundingClientRect());return rs.every(n=>n.height===56&&Math.abs(n.top-rs[0].top)<1)&&rs.every((n,i)=>!i||n.left>=rs[i-1].right)}''')
 assert p.locator('.hub-collection-back').evaluate('e=>getComputedStyle(e).outlineStyle==="none"')
 assert p.locator('[data-uid="1"] .collection-card-levels>span').first.inner_text()=='Lv. 1'
 assert p.locator('[data-uid="2"] .collection-card-levels>span').first.inner_text()=='Lv. 3'
 before=p.evaluate('JSON.stringify(g.owned.map(o=>[o.mastery,foodValue(o),availableMastery(o)]))')
 p.get_by_label('Sort foods',exact=True).select_option('name')
 assert p.locator('.collection-card-name').all_text_contents()==p.evaluate('getHubCollectionFoods().map(o=>F(o.id).name)')
 p.get_by_label('Filter foods',exact=True).select_option('unequipped');assert p.locator('.collection-card').count()==6
 p.get_by_label('Filter foods',exact=True).select_option('all')
 p.locator('[data-uid="1"] .collection-equip').tap();assert p.evaluate('!g.activeMenu.includes(1)')
 assert p.locator('.food-collection-detail-backdrop').count()==0 and p.locator('.hub-collection-overlay').count()==1
 p.locator('[data-uid="1"] .collection-equip').tap();assert p.evaluate('g.activeMenu.includes(1)')
 assert p.locator('.food-collection-detail-backdrop').count()==0
 p.locator('[data-focus="select-foods"]').tap()
 for uid in [1,2]:p.locator(f'[data-uid="{uid}"] .food-card-target').tap()
 p.locator('.collection-selection-row').get_by_role('button',name='Unequip',exact=True).tap()
 assert p.evaluate('g.activeMenu.length')==0
 p.locator('.collection-selection-row').get_by_role('button',name='Equip',exact=True).tap()
 assert p.evaluate('g.activeMenu.length')==2
 p.locator('[data-focus="select-foods"]').tap()
 p.locator('.collection-inline-action').tap();assert p.evaluate('g.activeMenu.length')==3
 p.get_by_label('Auto Equip',exact=True).select_option('final');assert p.evaluate('g.autoEquip')=='final'
 p.get_by_label('Auto Equip',exact=True).select_option('off');assert p.evaluate('g.autoEquip')=='off'
 assert p.evaluate('JSON.stringify(g.owned.map(o=>[o.mastery,foodValue(o),availableMastery(o)]))')==before
 p.locator('[data-uid="1"] .food-card-target').tap();p.locator('.food-collection-detail-backdrop').wait_for()
 assert p.locator('.upgrade-current strong').inner_text()=='Lv. 1'
 assert p.locator('.upgrade-available').inner_text()=='↑4 Available'
 p.locator('.food-panel-close').tap();assert p.locator('.food-collection-detail-backdrop').count()==0
 p.locator('.hub-collection-back').focus();p.keyboard.press('Tab')
 assert p.evaluate('document.documentElement.dataset.focusInput')=='keyboard'
 assert p.evaluate('getComputedStyle(document.activeElement).outlineStyle')=='solid'
 p.locator('.hub-collection-back').tap()
 print(f'PASS {engine} {width}: collection rows, level formatting, quick/bulk equipment and modal cleanup, Sort/Show/Equip Best/Auto, pointer and keyboard focus',flush=True)

def run(pw,engine):
 b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge',headless=True)
 c=b.new_context(viewport={'width':2000,'height':1200},has_touch=True);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 try:
  p.goto(t.s.URL);t.ready(p);p.evaluate('skipWholeBakeryGuide(true)')
  sizes=[(844,390)] if '--phone-only' in sys.argv else [(1920,1080)] if '--desktop-only' in sys.argv else [(2000,1200),(844,390),(1920,1080)]
  for width,height in sizes:
   p.set_viewport_size({'width':width,'height':height});p.reload();t.ready(p);p.evaluate('skipWholeBakeryGuide(true)')
   if '--collection-only' not in sys.argv:worksheet(p,engine,width)
   collection(p,engine,width)
  assert not errors,errors
 except Exception:
  shot(p,engine+'-failure');print('ERRORS',errors,p.evaluate('({hubCollection,hubFoodDirect,page:bakeryPage,run:!!g.run,modal:modal?.title})'),flush=True);raise
 finally:c.close();b.close()

if __name__=='__main__':
 try:
  with t.s.sync_playwright() as pw:
   for engine in [x for x in sys.argv[1:] if not x.startswith('--')] or ['edge','webkit']:run(pw,engine)
 finally:t.s.server.shutdown()
