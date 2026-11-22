"""Offline Chromium integration fixture for the full six-task onboarding journey.

Runs actual game controllers, HTML event handlers, DOM, and styles with scripts
inlined because the sandbox browser cannot navigate to local HTTP/file URLs.
This does NOT verify APK input or artwork downloading; those require a real app.
"""
from pathlib import Path
import re
import os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
INDEX=(ROOT/'index.html').read_text()
SCRIPTS=re.findall(r'<script src="([^"]+)" type="application/x-panaderya-game"',INDEX)
STYLES=re.findall(r'<link rel="stylesheet" href="([^"]+)"',INDEX)

def setup(page,starter=True):
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('<html><head></head><body data-view="hub"><div id="bakeryLoading" hidden></div><div id="app"></div><div id="modals"></div><div id="notificationDock"><div id="purchaseUndo" hidden></div><div id="toasts"></div></div></body></html>')
    page.evaluate('''() => {
      const store=new Map;
      if(!window.__tourStore)window.__tourStore=store;
      Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__tourStore.get(k)||null,setItem:(k,v)=>window.__tourStore.set(k,String(v)),removeItem:k=>window.__tourStore.delete(k)}});
      Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>null,setItem:()=>{},removeItem:()=>{}}});
    }''')
    for path in STYLES:page.add_style_tag(content=(ROOT/path).read_text(encoding='utf-8',errors='replace'))
    for path in SCRIPTS:page.add_script_tag(content=(ROOT/path).read_text(encoding='utf-8-sig'))
    page.wait_for_function('window.panaderyaTutorialStatus?.()?.phase === "intro"')
    return errors

def wait_phase(page,phase):
    page.wait_for_function('(phase)=>window.panaderyaTutorialStatus?.()?.phase===phase',arg=phase)

def status(page):return page.evaluate('window.panaderyaTutorialStatus?.()')

def check_spotlight(page,phase,selector):
    wait_phase(page,phase)
    # A newly earned checkmark is held visibly before focus moves to the target.
    page.wait_for_function('!window.panaderyaTutorialStatus?.()?.celebrating')
    target=page.locator(selector).first
    target.wait_for(state='visible')
    result=page.evaluate('''s=>{
      const t=document.querySelector(s),r=t.getBoundingClientRect(),c=document.querySelector('.tour-checklist').getBoundingClientRect();
      const intersects=r.left<c.right&&r.right>c.left&&r.top<c.bottom&&r.bottom>c.top;
      return {targetVisible:r.width>2&&r.height>2,inBounds:c.left>=-2&&c.top>=-2&&c.right<=innerWidth+2&&c.bottom<=innerHeight+2,intersects,rect:{x:r.left,y:r.top,w:r.width,h:r.height},card:{x:c.left,y:c.top,w:c.width,h:c.height}};
    }''',selector)
    assert result['targetVisible'] and result['inBounds'] and not result['intersects'],(phase,result)
    assert page.locator('#bakeryGameTour.is-spotlit').count(), (phase,status(page))

def walk(page):
    errors=setup(page)
    assert page.evaluate('({slots:g.menuSlots,owned:g.owned.length,coins:g.coins})')=={'slots':0,'owned':0,'coins':250}
    for i in range(6):
        page.wait_for_function('!document.querySelector("[data-tour=next]").disabled')
        page.locator('[data-tour=next]').click()
        assert status(page)['revealed']==min(i+2,6)
        if i<5:assert page.locator('.tour-paper').count()==i+2
    check_spotlight(page,'nav-orders','[data-world-nav="orders"]')
    assert page.evaluate('''()=>{let fired=0;const bad=document.querySelector('[data-world-nav="packages"]');bad.addEventListener('click',()=>fired++);bad.click();return !fired&&bakeryPage==='menu'}''')
    page.locator('[data-world-nav="orders"]').click()
    check_spotlight(page,'ticket','.scene-ticket')
    page.locator('.scene-ticket').first.click(force=True)
    wait_phase(page,'worksheet')
    page.wait_for_function('!document.querySelector("#bakeryGameTour").classList.contains("is-spotlit")')
    # Real production ledger, sealing validator, and summary entry; the inlined
    # test cannot load the actual nested worksheet iframe from about:blank.
    page.evaluate('''()=>{
      const r=g.run;
      for(const step of r.steps){
        grantWorksheetStepCoin(r,step);
        for(const kind of worksheetActionKinds(step)){
          const id=worksheetActionId(r.worksheetRewards.attemptId,step.row,step.col,kind);
          r.worksheetRewards.actions[id]={id,row:step.row,col:step.col,kind};
        }
      }
      if(!completeWorksheetProcedure(r))throw Error('Order sealing validator rejected tutorial fixture');
      if(!save())throw Error('Order fixture did not save');
      paintWorksheetExperience();
    }''')
    check_spotlight(page,'complete','#collectRewards')
    page.locator('#collectRewards').click()
    wait_phase(page,'back')
    assert status(page)['checked']==1
    money=page.evaluate('g.coins')
    page.locator('#acknowledgeWorksheetSummary').click()
    check_spotlight(page,'nav-packages','[data-world-nav="packages"]')
    assert status(page)['checked']==2 and page.evaluate('g.coins')>money
    page.locator('[data-world-nav="packages"]').click()
    check_spotlight(page,'buy-package','[data-world-buy="1"]')
    assert page.locator('[data-world-buy="1"]').is_enabled()
    page.locator('[data-world-buy="1"]').click(force=True)
    wait_phase(page,'package-collect')
    assert status(page)['checked']==3
    page.locator('#packageBatchCollect').click(force=True)
    check_spotlight(page,'nav-menu','[data-world-nav="menu"]')
    assert status(page)['checked']==4
    page.locator('[data-world-nav="menu"]').click()
    check_spotlight(page,'buy-slot','[data-tour-target="buy-slot"]')
    page.locator('[data-tour-target="buy-slot"]').click()
    check_spotlight(page,'empty-slot','[data-tour-target="empty-slot"]')
    assert page.evaluate('g.menuSlots')==1
    page.locator('[data-tour-target="empty-slot"]').click()
    check_spotlight(page,'choose-food','.collection-card .food-card-target')
    assert page.locator('.collection-card').count()>=1
    page.locator('.collection-card .food-card-target').first.click()
    check_spotlight(page,'equip','.food-collection-detail-backdrop .action-equip')
    page.locator('.food-collection-detail-backdrop .action-equip').click()
    check_spotlight(page,'close-food','.food-collection-detail-backdrop .food-panel-close')
    assert status(page)['checked']==5
    page.locator('.food-collection-detail-backdrop .food-panel-close').click()
    check_spotlight(page,'close-inventory','.hub-collection-back')
    page.locator('.hub-collection-back').click()
    check_spotlight(page,'boost','#boost-status')
    page.locator('#boost-status').click()
    wait_phase(page,'ready')
    assert status(page)['checked']==6
    assert page.locator('.hub-boost-detail').count()==1
    page.locator('[data-tour="finish"]').click()
    assert status(page)is None
    assert page.locator('.hub-boost-detail').count()==1,'Baker must close the Boost explanation voluntarily'
    assert page.evaluate('g.activeMenu.length')==1
    assert not errors,errors

if __name__=='__main__':
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--no-sandbox'],**({'executable_path':'/usr/bin/chromium'} if Path('/usr/bin/chromium').exists() else {}))
        try:
            for w,h in [tuple(map(int,os.environ.get('TOUR_SIZE','2000x1200').split('x')))]:
                context=browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce')
                page=context.new_page()
                page.set_default_timeout(8500)
                try:
                    walk(page)
                    print(f'PASS: Six-task tutorial, real controllers, focus gating, rewards, package, equip and free Boost close — {w}×{h}',flush=True)
                finally: context.close()
        finally: browser.close()
