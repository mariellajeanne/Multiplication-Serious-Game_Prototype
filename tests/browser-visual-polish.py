"""Actual-world visual checks: equation semantics/fit, HUD geometry and fixed nav.
Run: python tests/browser-visual-polish.py edge webkit
Screenshots and measurements: ignored output/playwright/polish.
"""
import functools, http.server, json, os, sys, threading
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(ROOT/'.test-tools/browsers'))
from playwright.sync_api import sync_playwright
OUT=ROOT/'output/playwright/polish';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()

def navigate(p,name):
 p.evaluate('navigateBakery',name);p.wait_for_function('!bakeryJourney')

def capture(p,name):
 p.wait_for_function('[...document.querySelectorAll("#app img")].every(i=>i.complete&&i.naturalWidth)')
 p.screenshot(path=str(OUT/(name+'.png')))

def run(pw,engine):
 b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
 p=b.new_page(viewport={'width':2000,'height':1200},has_touch=True);errors=[];measurements=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 try:
  p.goto(f'http://127.0.0.1:{server.server_port}/index.html')
  p.wait_for_function('window.bakeryLoading?.requiredReady && document.getElementById("bakeryLoading").hidden')
  # Deterministic presentation fixtures use production food/order identities.
  p.evaluate("""discoverFood(F('monay'));g.coins=71;
   g.board=[{id:9101,coinTier:1,rarity:1,a:35,b:85,foodId:'pandesal',base:ticketBase(1)},
    {id:9102,coinTier:0,rarity:0,a:58,b:3,foodId:'pandesal',base:ticketBase(0)},
    {id:9103,coinTier:0,rarity:0,a:25,b:6,foodId:'pandesal',base:ticketBase(0)},
    {id:9104,coinTier:2,rarity:2,a:79,b:18,foodId:'pandesal',base:ticketBase(2)}];
   window.polishOrders=g.board;render()""")
  for width,height in [(2000,1200),(1920,1080),(1280,800),(854,480),(800,360)]:
   p.set_viewport_size({'width':width,'height':height})
   for name in ['packages','menu','orders']:
    navigate(p,name)
    assert p.evaluate("JSON.parse(render_game_to_text()).scene.zoom===1.1")
    assert p.locator('[data-world-tier]').evaluate_all('es=>es.map(e=>+e.dataset.worldTier)')==list(range(7,-1,-1))
    result=p.evaluate('''()=>{
     const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
     const nav=[...document.querySelectorAll('.scene-nav button')].map(rect);
     const hud=[...document.querySelectorAll('.scene-hud button')].map(rect);
     const gem=rect(document.querySelector('#boost-status img'));
     return {nav,hud,gem,zoom:JSON.parse(render_game_to_text()).scene.zoom};
    }''')
    assert all(r['w']>=44 and r['h']>=44 and r['x']>=0 and r['right']<=width+.1 for r in result['nav']+result['hud'])
    assert all(result['nav'][i+1]['x']-result['nav'][i]['right']>=8 for i in range(2))
    assert abs(result['nav'][1]['x']+result['nav'][1]['w']/2-width/2)<.1
    assert result['gem']['w']>=result['hud'][1]['h']*.85,'gem overridden by shared stylesheet'
    assert result['gem']['x']>=result['hud'][1]['x'] and result['gem']['right']<result['hud'][1]['right']
    if width==2000:assert abs(result['nav'][0]['h']-117)<.1
    measurements.append({'viewport':[width,height],'station':name,**result})
    capture(p,f'{engine}-{width}-{name}')
    if height<600:
     p.locator('.scene-window').evaluate('e=>e.scrollTop=e.scrollHeight')
     capture(p,f'{engine}-{width}-{name}-scrolled')
  p.set_viewport_size({'width':2000,'height':1200});navigate(p,'menu')
  # Plaque stays attached and does not intrude into food slots/props.
  assert p.locator('.view-all-foods').evaluate('''e=>{
   const r=e.getBoundingClientRect(),slot=document.querySelector('.scene-menu-opening').getBoundingClientRect();
   return r.top>slot.bottom && ['.counter-register','.counter-packages'].every(s=>{const a=document.querySelector(s).getBoundingClientRect();return r.right<a.left||r.left>a.right});
  }''')
  before=p.locator('.view-all-foods').bounding_box()
  p.locator('.view-all-foods').tap();assert p.locator('#hubCollection').is_visible()
  p.locator('.hub-collection-back').tap()
  assert p.locator('.view-all-foods').bounding_box()==before
  navigate(p,'orders')
  # Every catalog cutout, widest supported operands, and every reward paper.
  p.evaluate("window.polishInventory={owned:g.owned,menu:g.activeMenu,slots:g.menuSlots};g.owned=FOOD.map((f,i)=>({uid:i+1,id:f.id,level:1,fusion:1,spent:0}));g.activeMenu=g.owned.map(o=>o.uid);g.menuSlots=17;g.board=FOOD.map((f,i)=>({id:9200+i,foodId:f.id,a:7999,b:99,coinTier:i%8,rarity:i%8,base:ticketBase(i%8)}));render()")
  assert p.locator('.scene-ticket').evaluate_all('es=>new Set(es.map(e=>e.dataset.orderFood)).size')==17
  p.wait_for_function('[...document.querySelectorAll(".scene-ticket img")].every(i=>i.complete&&i.naturalWidth)')
  issues=p.locator('.scene-ticket').evaluate_all('''es=>es.flatMap(e=>{
   const eq=e.querySelector('.scene-ticket-equation'),groups=eq.querySelectorAll('.equation-group'),r=eq.getBoundingClientRect();
   const children=[...eq.children].map(c=>c.getBoundingClientRect()),bar=e.querySelector('.scene-ticket-progress'),br=bar.getBoundingClientRect();
   const bad=groups.length!==2||groups[0].firstElementChild.tagName!=='STRONG'||groups[1].firstElementChild.tagName!=='STRONG'||eq.querySelector('.equation-times').textContent!=='×'||children.some(c=>c.left<r.left-1||c.right>r.right+1)||[...bar.querySelectorAll('span,b')].some(c=>{const a=c.getBoundingClientRect();return a.left<br.left||a.right>br.right||a.top<br.top||a.bottom>br.bottom});
   return bad?[e.dataset.orderFood]:[];
  })''')
  assert not issues,('equation/progress clipping or incorrect sequence',issues)
  capture(p,f'{engine}-2000-wide-equation')
  p.evaluate('g.board=polishOrders;g.owned=polishInventory.owned;g.activeMenu=polishInventory.menu;g.menuSlots=polishInventory.slots;render()')
  navigate(p,'packages')
  p.evaluate("navigateBakery('orders');cancelAnimationFrame(bakeryFrame);bakeryCameraStep(bakeryJourney.started+bakeryJourney.duration*.42);cancelAnimationFrame(bakeryFrame)")
  capture(p,f'{engine}-2000-transition')
  p.evaluate('bakeryCameraStep(bakeryJourney.started+bakeryJourney.duration)')
  p.emulate_media(reduced_motion='reduce');navigate(p,'menu')
  assert p.evaluate('!bakeryJourney&&bakeryCamera===1')
  assert not errors,errors
  (OUT/f'{engine}-measurements.json').write_text(json.dumps(measurements,indent=2))
  print(f'PASS {engine}: 5 landscapes, 1.10 camera, 117px nav, prominent gem, mounted plaque, all 17 food crops and widest equations, 8 descending tiers, reduced motion, no browser errors',flush=True)
 finally:b.close()
try:
 with sync_playwright() as pw:
  for engine in sys.argv[1:] or ['edge','webkit']:run(pw,engine)
finally:server.shutdown()
