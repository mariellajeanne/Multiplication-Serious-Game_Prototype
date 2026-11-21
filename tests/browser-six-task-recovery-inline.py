"""Companion offline Chromium checks: save/reload, skip and older profiles."""
import json
from playwright.sync_api import sync_playwright
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('six_task_walk',Path(__file__).with_name('browser-six-task-tutorial-inline.py'))
walk=importlib.util.module_from_spec(spec)
spec.loader.exec_module(walk)
ROOT, STYLES, SCRIPTS, status=walk.ROOT, walk.STYLES, walk.SCRIPTS, walk.status


def load(page, initial=None, phase='intro'):
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.set_content('<html><head></head><body data-view="hub"><div id="bakeryLoading" hidden></div><div id="app"></div><div id="modals"></div><div id="notificationDock"><div id="purchaseUndo" hidden></div><div id="toasts"></div></div></body></html>')
    page.evaluate('''state=>{
      window.__tourStore=new Map(Object.entries(state||{}));
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem:k=>window.__tourStore.get(k)||null,
        setItem:(k,v)=>window.__tourStore.set(k,String(v)),
        removeItem:k=>window.__tourStore.delete(k)}});
      Object.defineProperty(window,'sessionStorage',{configurable:true,value:{
        getItem:k=>null,setItem:()=>{},removeItem:()=>{}}});
    }''', initial or {})
    for path in STYLES:page.add_style_tag(content=(ROOT/path).read_text(encoding='utf-8',errors='replace'))
    for path in SCRIPTS:page.add_script_tag(content=(ROOT/path).read_text(encoding='utf-8-sig'))
    if phase:page.wait_for_function('phase=>window.panaderyaTutorialStatus?.()?.phase===phase',arg=phase)
    else:page.wait_for_timeout(400)
    return errors


def newpage(ctx):
    page=ctx.new_page();page.set_default_timeout(10500)
    return page


def run(browser):
    ctx=browser.new_context(viewport={'width':1280,'height':800},reduced_motion='reduce')
    try:
        a=newpage(ctx);errors=load(a)
        for i in range(6):
            a.wait_for_function('!document.querySelector("[data-tour=next]").disabled')
            a.locator('[data-tour=next]').click()
        a.locator('[data-world-nav="orders"]').click()
        a.wait_for_function('window.panaderyaTutorialStatus?.()?.phase==="ticket"')
        a.locator('.scene-ticket').first.click(force=True)
        a.wait_for_function('window.panaderyaTutorialStatus?.()?.phase==="worksheet"')
        store=a.evaluate('Object.fromEntries(window.__tourStore)')
        b=newpage(ctx);errors+=load(b,store,'worksheet')
        assert b.evaluate('g.run?.ticket?.id')==a.evaluate('g.run?.ticket?.id')
        assert b.evaluate('g.tutorialArrows===true')
        assert not b.locator('#bakeryGameTour').evaluate('e=>e.classList.contains("is-spotlit")')
        assert not errors,errors
        print('PASS: restart during unfinished worksheet preserves order and unrestricted arrows',flush=True)
    finally:ctx.close()

    ctx=browser.new_context(viewport={'width':1280,'height':800},reduced_motion='reduce')
    try:
        a=newpage(ctx);load(a)
        a.evaluate('''()=>{
          g.owned=[{uid:1,id:'pandesal',level:1,fusion:1,spent:0}];g.discovered=['pandesal'];
          g.menuSlots=1;g.uidNext=2;save();
          const tour=JSON.parse(window.__tourStore.get('panaderyaWholeGameTourV2'));
          tour.phase='choose-food';tour.foodUid=1;
          window.__tourStore.set('panaderyaWholeGameTourV2',JSON.stringify(tour));
        }''')
        store=a.evaluate('Object.fromEntries(window.__tourStore)')
        b=newpage(ctx);load(b,store,'empty-slot')
        assert b.locator('[data-tour-target="empty-slot"]').is_visible()
        b.locator('[data-tour-target="empty-slot"]').click()
        b.wait_for_function('window.panaderyaTutorialStatus?.()?.phase==="choose-food"')
        assert b.locator('.collection-card .food-card-target').is_visible()
        print('PASS: restart during inventory selection recovers to real empty slot',flush=True)
    finally:ctx.close()

    ctx=browser.new_context(viewport={'width':1280,'height':800},reduced_motion='reduce')
    try:
        a=newpage(ctx);load(a)
        before=a.evaluate('({coins:g.coins,owned:g.owned.length,slots:g.menuSlots,completed:g.completed})')
        a.locator('[data-tour="skip"]').click()
        assert status(a)is None
        assert a.evaluate('({coins:g.coins,owned:g.owned.length,slots:g.menuSlots,completed:g.completed})')==before
        store=a.evaluate('Object.fromEntries(window.__tourStore)')
        b=newpage(ctx);load(b,store,None)
        assert status(b)is None
        print('PASS: skip leaves bakery economy unchanged and persists across restart',flush=True)
    finally:ctx.close()

    ctx=browser.new_context(viewport={'width':1280,'height':800},reduced_motion='reduce')
    try:
        a=newpage(ctx);load(a)
        old=a.evaluate('''()=>{
          const data={...g};delete data.tutorialStarterVersion;
          data.owned=[{uid:1,id:'pandesal',level:1,fusion:1,spent:0}];
          data.discovered=['pandesal'];data.menuSlots=1;data.activeMenu=[1];data.helpSeen=true;
          return {'panaderyaQuestV2':JSON.stringify(data)};
        }''')
        b=newpage(ctx);load(b,old,None)
        assert status(b)is None
        assert b.evaluate('({slots:g.menuSlots,owned:g.owned.length,active:g.activeMenu.length})')=={'slots':1,'owned':1,'active':1}
        print('PASS: existing profiles retain their food, slots and no forced tour',flush=True)
    finally:ctx.close()

if __name__=='__main__':
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--no-sandbox'],**({'executable_path':'/usr/bin/chromium'} if Path('/usr/bin/chromium').exists() else {}))
        try:run(browser)
        finally:browser.close()
