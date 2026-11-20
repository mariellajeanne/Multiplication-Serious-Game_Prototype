"""Bounded scene touch gestures; Edge uses real CDP touch input."""
import importlib.util
from pathlib import Path
import sys
spec=importlib.util.spec_from_file_location('support',Path(__file__).with_name('browser-package-reveal.py'))
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
OUT=s.ROOT/'output/playwright/page-swipe';OUT.mkdir(parents=True,exist_ok=True)

def run(pw,engine):
 b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
 p=b.new_page(viewport={'width':1280,'height':800},has_touch=True);errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 cdp=p.context.new_cdp_session(p) if engine=='edge' else None
 def touch(kind,x,y):
  if cdp:
   cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind in ['touchEnd','touchCancel'] else [{'x':x,'y':y,'id':1}]})
  else:
   p.evaluate('''([kind,x,y])=>{if(kind==='touchStart')window.swipeTarget=document.elementFromPoint(x,y);
    const type={touchStart:'touchstart',touchMove:'touchmove',touchEnd:'touchend',touchCancel:'touchcancel'}[kind];
    const touches=kind==='touchEnd'||kind==='touchCancel'?[]:[{identifier:1,target:swipeTarget,clientX:x,clientY:y}];
    const event=new Event(type,{bubbles:true,cancelable:true});Object.defineProperties(event,{touches:{value:touches},changedTouches:{value:touches}});swipeTarget.dispatchEvent(event);}''',[kind,x,y])
 def gesture(dx,dy=0,x=None,y=None,cancel=False):
  x=x or p.viewport_size['width']/2;y=y or p.viewport_size['height']*.2
  touch('touchStart',x,y)
  for i in range(1,7):
   touch('touchMove',x+dx*i/6,y+dy*i/6);p.wait_for_timeout(18)
  camera=p.evaluate('bakeryCamera')
  touch('touchCancel' if cancel else 'touchEnd',x+dx,y+dy)
  p.wait_for_timeout(600)
  p.wait_for_function('!bakeryJourney')
  return camera
 def page(name):
  p.evaluate('(name)=>navigateBakery(name)',name);p.wait_for_timeout(550);p.wait_for_function('!bakeryJourney')
 try:
  p.goto(s.URL);s.ready(p)
  before=s.snapshot(p)
  for width,height in [(2000,1200),(1280,800),(844,390),(640,360)]:
   p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(100);page('menu')
   assert gesture(-150)>1
   assert p.evaluate('bakeryPage')=='orders'
   # Outward drag is resisted to 30–40 physical pixels, and springs home.
   base=p.locator('.world-track').bounding_box()['x']
   x=width/2;y=height*.2;touch('touchStart',x,y);touch('touchMove',x-280,y);p.wait_for_timeout(70)
   delta=p.locator('.world-track').bounding_box()['x']-base
   assert -40<delta<-30,(engine,width,delta)
   p.screenshot(path=str(OUT/f'{engine}-{width}-elastic.png'))
   touch('touchEnd',x-280,y);p.wait_for_function('!bakeryJourney')
   assert p.evaluate('bakeryPage==="orders"&&bakeryCamera===2&&!bakeryJourney')
   gesture(150);assert p.evaluate('bakeryPage')=='menu'
   gesture(150);assert p.evaluate('bakeryPage')=='packages',(engine,width,p.evaluate('[bakeryPage,bakeryCamera]'))
   base=p.locator('.world-track').bounding_box()['x']
   touch('touchStart',x,y);touch('touchMove',x+280,y);p.wait_for_timeout(70)
   delta=p.locator('.world-track').bounding_box()['x']-base
   assert 30<delta<40,(engine,width,delta)
   p.screenshot(path=str(OUT/f'{engine}-{width}-packages-elastic.png'))
   touch('touchEnd',x+280,y);p.wait_for_function('!bakeryJourney')
   assert p.evaluate('bakeryPage==="packages"&&bakeryCamera===0')
   gesture(-150);assert p.evaluate('bakeryPage')=='menu'
   for dx,dy in [(7,0),(0,100),(70,0)]:
    gesture(dx,dy,cancel=dx==70);assert p.evaluate('bakeryPage==="menu"&&bakeryCamera===1')
   assert p.locator('[data-world-nav="menu"]').get_attribute('aria-current')=='page'
   # Scroll lists and carousel take priority even for horizontal movements.
   for name,selector in [('menu','#cabinet-scroll'),('orders','#order-scroller'),('packages','#package-carousel')]:
    page(name);r=p.locator(selector).bounding_box()
    gesture(-100,x=r['x']+r['width']/2,y=r['y']+r['height']/2)
    assert p.evaluate('bakeryPage')==name
   p.locator('[data-world-nav="menu"]').tap();p.wait_for_timeout(550)
   assert p.evaluate('bakeryPage')=='menu'
   p.screenshot(path=str(OUT/f'{engine}-{width}-menu.png'))
  p.emulate_media(reduced_motion='reduce');gesture(-150)
  assert p.evaluate('bakeryPage==="orders"&&bakeryCamera===2&&!bakeryJourney')
  assert s.snapshot(p)==before
  assert not errors,errors
  print('PASS',engine,'four layouts, navigation, 36px resistance, cancellation, nested gestures, buttons, reduced motion and state',flush=True)
 finally:b.close()
try:
 with s.sync_playwright() as pw:
  for engine in sys.argv[1:] or ['edge','webkit']:run(pw,engine)
finally:s.server.shutdown()
