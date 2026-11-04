"""Frame 12 popup proportions, invariant grid geometry and real selection/actions."""
import functools
import http.server
import json
import os
from pathlib import Path
import sys
import threading

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(ROOT/'.test-tools/browsers'))
from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass


server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
shots=ROOT/'.test-tools/food-selection-shots'
shots.mkdir(parents=True,exist_ok=True)


def geometry(page):
    return page.locator('.menu-grid').evaluate('e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height,e.scrollTop]}')


def check_popup(page,kind):
    return page.locator('.food-selection-popup').evaluate('''(e,kind)=>{
        const r=e.getBoundingClientRect(),m=e.closest('.collection-stage').getBoundingClientRect();
        const close=e.querySelector('.food-panel-close').getBoundingClientRect();
        const buttons=[...e.querySelectorAll('button')];
        return {width:r.width/m.width,height:r.height/m.height,center:Math.abs((r.left+r.right)/2-(m.left+m.right)/2),
            inside:r.left>=m.left&&r.right<=m.right&&r.top>=m.top&&r.bottom<=m.bottom&&close.right<=m.right&&close.top>=m.top,
            controls:buttons.every(b=>{const q=b.getBoundingClientRect();return q.width>=44&&q.height>=44&&b.scrollWidth<=b.clientWidth+1&&b.scrollHeight<=b.clientHeight+1&&b.contains(document.elementFromPoint(q.x+q.width/2,q.y+q.height/2))}),
            bodyScroll:e.querySelector('.food-panel-scroll')?.scrollHeight>e.querySelector('.food-panel-scroll')?.clientHeight+1};
    }''',kind)


def check(pw,engine):
    browser=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
    page=browser.new_page(has_touch=True)
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    try:
        page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
        page.wait_for_function("typeof renderFoodPanel==='function'")
        page.evaluate('document.fonts.ready')
        page.evaluate('''g.completed=40;g.coins=1e9;g.menuSlots=6;
            for(const f of FOOD)if(!g.owned.some(o=>o.id===f.id))discoverFood(f);
            for(const o of g.owned){o.mastery=3;g.recipeCeilings[o.id]=5}
            g.activeMenu=[1];render();window.firstFood=sortedMenuFoods(g.owned)[0].uid;
            window.secondFood=sortedMenuFoods(g.owned)[1].uid;''')
        for width,height in [(2000,1200),(1194,834),(1024,768)]:
            page.set_viewport_size({'width':width,'height':height})
            page.evaluate('closeFoodPanel();render();document.querySelector(".menu-grid").scrollTop=0')
            page.wait_for_timeout(100)
            page.locator('[data-uid]').first.locator('.food-card-target').focus()
            before=geometry(page)
            page.locator('[data-uid]').first.locator('.food-card-target').tap()
            assert page.locator('.food-selection-popup').count()==1
            assert page.locator('.food-selection-single').count()==1
            assert geometry(page)==before,('opening the popup moved or resized the grid',before,geometry(page))
            result=check_popup(page,'single')
            print(engine,width,'single',result,flush=True)
            assert .73<=result['width']<=.77 and .35<=result['height']<=.40
            assert result['inside'] and result['controls'] and result['center']<=1
            assert not result['bodyScroll'],'normal tablet popup content should fit without scrolling'
            assert page.locator('.selection-rarity-stars').inner_text()==page.evaluate("'★'.repeat(F(g.owned.find(o=>o.uid===firstFood).id).rarity+1)")
            page.screenshot(path=str(shots/f'{engine}-single-{width}.png'))
            page.locator('.action-sell').tap()
            page.get_by_role('button',name='Keep foods',exact=True).tap()
            assert page.locator('.food-selection-single').count()==1
            page.locator('.action-mastery').tap()
            page.keyboard.press('Escape')
            assert page.locator('.food-selection-single').count()==1
            page.locator('.action-equip').tap()
            assert page.evaluate('g.activeMenu.includes(firstFood)')
            page.locator('.action-unequip').tap()
            assert page.evaluate('!g.activeMenu.includes(firstFood)')
            page.locator('.food-panel-close').tap()
            assert geometry(page)==before
            # Actual long-press enables adding to the selection; a single
            # selected food still uses the larger state until the second tap.
            card=page.locator('[data-uid]').first.locator('.food-card-target')
            box=card.bounding_box()
            page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
            page.mouse.down();page.wait_for_timeout(560);page.mouse.up()
            assert page.evaluate('multiSelect&&selectedFoods.size===1')
            assert page.locator('.food-selection-single').count()==1
            page.locator('[data-uid]').nth(1).locator('.food-card-target').tap()
            assert page.locator('.food-selection-multi').count()==1
            assert page.locator('.food-selection-single').count()==0
            assert geometry(page)==before
            result=check_popup(page,'multi')
            print(engine,width,'multi',result,flush=True)
            assert .73<=result['width']<=.77 and .15<=result['height']<=.18
            assert result['inside'] and result['controls'] and result['center']<=1
            assert page.locator('.food-selection-multi svg,.food-selection-multi .recipe-detail,.food-selection-multi .selection-hint').count()==0
            page.screenshot(path=str(shots/f'{engine}-multi-{width}.png'))
            page.locator('.selection-tools button').nth(1).tap()
            assert page.evaluate('selectedFoods.size===g.owned.length')
            assert page.locator('.action-equip,.action-unequip').count()==2
            assert check_popup(page,'mixed')['controls'], json.dumps(page.locator('.food-selection-popup button').evaluate_all('buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,w:r.width,h:r.height,cw:b.clientWidth,ch:b.clientHeight,sw:b.scrollWidth,sh:b.scrollHeight,hit:b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})'))
            page.locator('.selection-tools button').first.tap()
            assert page.evaluate('selectedFoods.size===0&&multiSelect')
            assert page.locator('.food-selection-multi').count()==1
            page.locator('.selection-tools button').nth(1).tap()
            page.evaluate('selectedFoods=new Set([firstFood,secondFood]);paintFoodPanel()')
            page.locator('[data-uid]').nth(1).locator('.food-card-target').tap()
            assert page.locator('.food-selection-single').count()==1
            page.keyboard.press('Escape')
            assert page.locator('.food-selection-popup').count()==0
        assert errors==[],errors
        print('PASS floating food selection',engine,flush=True)
    finally:
        browser.close()


try:
    with sync_playwright() as pw:
        for engine in (sys.argv[1:] or ['webkit','edge']):check(pw,engine)
finally:
    server.shutdown()
