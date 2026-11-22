"""Exercise the optimized Android staged game with its *actual production asset map*.

Chromium is sandboxed from local URL navigation here; this suite uses the same
real-game inline-HTML browser harness as the six-task tutorial and independently
checks every live DOM image URL against the staged Android asset tree.

Usage: PANADERYA_ANDROID_STAGE=/path/to/android/app/build/game-assets/game \
       python tests/browser-android-assets-inline.py
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import importlib.util
import os
import re

SOURCE=Path(__file__).resolve().parents[1]
STAGE=Path(os.environ.get('PANADERYA_ANDROID_STAGE',SOURCE/'android/app/build/game-assets/game')).resolve()
assert (STAGE/'index.html').is_file(),f'Missing staged Android game root: {STAGE}'
spec=importlib.util.spec_from_file_location('panaderya_tutorial_fixture',SOURCE/'tests/browser-six-task-tutorial-inline.py')
tour=importlib.util.module_from_spec(spec)
spec.loader.exec_module(tour)
tour.ROOT=STAGE
tour.INDEX=(STAGE/'index.html').read_text()
tour.SCRIPTS=re.findall(r'<script src="([^"]+)" type="application/x-panaderya-game"',tour.INDEX)
tour.STYLES=re.findall(r'<link rel="stylesheet" href="([^"]+)"',tour.INDEX)

# The real production bootstrap loads bakery-assets.js before injecting gameplay
# scripts. Older inline tests omitted it; don't accidentally test dead fallback art.
def setup(page,starter=True):
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<html><head></head><body data-view="hub"><div id="bakeryLoading" hidden></div><div id="app"></div><div id="modals"></div><div id="notificationDock"><div id="purchaseUndo" hidden></div><div id="toasts"></div></div></body></html>')
 page.evaluate('''() => {
   const store=new Map;
   Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}});
   Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>null,setItem:()=>{},removeItem:()=>{}}});
 }''')
 page.add_script_tag(content=(STAGE/'src/bakery-assets.js').read_text(encoding='utf-8'))
 for css in tour.STYLES:page.add_style_tag(content=(STAGE/css).read_text(encoding='utf-8',errors='replace'))
 for js in tour.SCRIPTS:page.add_script_tag(content=(STAGE/js).read_text(encoding='utf-8-sig'))
 page.wait_for_function('window.panaderyaTutorialStatus?.()?.phase==="intro"')
 return errors

def check_assets(page,stage):
 refs=page.evaluate('''()=>{
   const arr=[];
   for(const e of document.querySelectorAll('img[src],source[srcset],image[href],video[poster]')){
     const x=e.getAttribute('src')||e.getAttribute('href')||e.getAttribute('srcset')||e.getAttribute('poster');
     if(x)arr.push(x);
   }
   for(const e of document.querySelectorAll('[style]')){
     const t=e.getAttribute('style')||'';
     for(const m of t.matchAll(/url\\(['\"]?([^)'\"]+)/g))arr.push(m[1]);
   }
   return arr;
 }''')
 missing=[]
 for raw in refs:
  if 'assets/' not in raw:continue
  rel=raw[raw.index('assets/'):].split('?')[0]
  if not (stage/rel).is_file(): missing.append(rel)
 assert not missing,sorted(set(missing))
 return len(refs)

tour.setup=setup
original=tour.check_spotlight
captures=[]
def checkpoint(page,phase,selector):
 original(page,phase,selector)
 captures.append((phase,check_assets(page,STAGE)))
tour.check_spotlight=checkpoint

# Verify direct URL literals and CSS dependencies as well. The one direct
# bakery-faithful fallback in the source is unreachable when BAKERY_ASSETS loads.
code='\n'.join(f.read_text(errors='replace') for area in ('src','styles','worksheet') for f in (STAGE/area).rglob('*') if f.suffix in ('.js','.css','.html'))+(STAGE/'index.html').read_text()
refs=set(re.findall(r'(?:\.\./)*assets/[A-Za-z0-9_ ./()\-]+?\.(?:png|svg|webp|mp3|ttf)',code))
for ref in sorted(refs):
 rel=ref[ref.index('assets/'):]
 if rel=='assets/bakery-faithful/package-01.png': continue # dead fallback, tested via production asset map
 assert (STAGE/rel).is_file(),f'Broken static asset reference: {rel}'

with sync_playwright() as pw:
 opts={'executable_path':'/usr/bin/chromium'} if Path('/usr/bin/chromium').exists() else {}
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox'],**opts)
 try:
  dims=[tuple(map(int,os.environ['ANDROID_ASSET_SIZE'].split('x')))] if os.environ.get('ANDROID_ASSET_SIZE') else [(2000,1200),(1280,800),(960,540)]
  for width,height in dims:
   context=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce')
   page=context.new_page()
   page.set_default_timeout(12000)
   try:
    captures.clear()
    tour.walk(page)
    check_assets(page,STAGE)
    assert len(captures)>=11,len(captures)
    print(f'PASS: optimized Android art URLs / six-task full journey / {len(captures)} verified checkpoints at {width}x{height}')
   finally:context.close()
 finally:browser.close()
