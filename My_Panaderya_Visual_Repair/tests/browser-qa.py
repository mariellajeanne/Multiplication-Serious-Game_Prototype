"""Real-browser QA for the supplied standalone demo, independent of production saves.
Run from any directory: python tests/browser-qa.py edge webkit
Requires Playwright; reuses the parent repository's installation when available.
"""
import functools
import http.server
import json
import os
from pathlib import Path
import sys
import threading

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
if (REPO / '.test-tools').is_dir():
    sys.path.insert(0, str(REPO / '.test-tools'))
    os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', str(REPO / '.test-tools/browsers'))
from playwright.sync_api import sync_playwright

SHOTS = REPO / 'output/playwright/repaired'
SHOTS.mkdir(parents=True, exist_ok=True)
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}/index.html'

def state(page): return json.loads(page.evaluate('render_game_to_text()'))
def shot(page, name):
    page.wait_for_timeout(200)
    page.screenshot(path=str(SHOTS / f'{name}.png'), animations='disabled')
def close(page):
    if page.locator('#modal-overlay').is_visible(): page.locator('#modal-close').tap()
    assert not page.locator('#modal-overlay').is_visible()
def preview(page, count):
    close(page)
    page.locator('#settings-button').tap()
    page.locator(f'[data-preview="{count}"]').tap()
    close(page)
    page.wait_for_timeout(80)
    assert len(state(page)['equipped']) == count
def scroll_top(page, selector):
    page.locator(selector).evaluate('el=>el.scrollTop=0')
    page.wait_for_timeout(100)

def swipe(page, selector, thumb=False):
    """Native Chromium touchscreen gesture, not synthetic DOM touch events."""
    rect = page.locator(selector).bounding_box()
    x = rect['x'] + rect['width'] * .5
    y = rect['y'] + (rect['height'] * .5 if thumb else rect['height'] - 28)
    end = y + 105 if thumb else rect['y'] + 25
    cdp = page.context.new_cdp_session(page)
    cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
    for i in range(1, 15):
        cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':x,'y':y+(end-y)*i/14}]})
        page.wait_for_timeout(15)
    cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
    cdp.detach()
    page.wait_for_timeout(500)

def check_scrollbar(page, engine, container, track, thumb, down, up):
    scroll_top(page, container)
    box = page.locator(container).bounding_box()
    page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
    page.mouse.wheel(0, 380)
    page.wait_for_timeout(350)
    assert page.locator(container).evaluate('e=>e.scrollTop') > 0, ('wheel',container)
    assert int(page.locator(thumb).get_attribute('aria-valuenow')) > 0
    scroll_top(page,container)
    page.locator(down).tap();page.wait_for_timeout(450)
    assert page.locator(container).evaluate('e=>e.scrollTop') > 0, ('arrow',container)
    page.locator(up).tap();page.wait_for_timeout(450)
    assert page.locator(container).evaluate('e=>e.scrollTop') < 3
    r = page.locator(track).bounding_box()
    page.mouse.click(r['x']+r['width']/2,r['y']+r['height']-2)
    page.wait_for_timeout(120)
    assert page.locator(container).evaluate('e=>Math.abs(e.scrollTop-(e.scrollHeight-e.clientHeight))') < 3, ('track',container)
    scroll_top(page,container)
    r = page.locator(thumb).bounding_box()
    page.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2)
    page.mouse.down();page.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2+100,steps=12);page.mouse.up()
    assert page.locator(container).evaluate('e=>e.scrollTop') > 0, ('thumb',container)
    page.locator(thumb).focus();page.keyboard.press('End');page.wait_for_timeout(80)
    assert page.locator(container).evaluate('e=>Math.abs(e.scrollTop-(e.scrollHeight-e.clientHeight))') < 3
    page.keyboard.press('Home');page.wait_for_timeout(80)
    assert page.locator(container).evaluate('e=>e.scrollTop') < 3
    if engine == 'edge':
        swipe(page,container)
        assert page.locator(container).evaluate('e=>e.scrollTop') > 0, ('native swipe',container)
        assert not page.locator('#modal-overlay').is_visible(), 'Swipe must not activate a food or ticket'
        assert page.locator('.is-pressed').count() == 0, 'Native scrolling cancels pressed state'
        scroll_top(page,container)
        swipe(page,thumb,True)
        assert page.locator(container).evaluate('e=>e.scrollTop') > 0, ('touch thumb',container)
    # A cancelled gesture cannot leave a stuck thumb drag.
    page.locator(thumb).dispatch_event('pointercancel', {'pointerId':1})
    scroll_top(page,container)
    page.mouse.move(10,10)
    assert page.locator(container).evaluate('e=>e.scrollTop') == 0

def check_layout(page, count, stationary):
    assert page.locator('.food-cell').count() == count
    frame=page.locator('#menu-cabinet').bounding_box()
    assert all(abs(frame[k]-stationary[k])<1 for k in frame)
    assert page.evaluate('''()=>{
      const sc=document.querySelector('#cabinet-scroll').getBoundingClientRect();
      const cells=[...document.querySelectorAll('.food-cell')];
      return cells.every(el=>{
        const c=el.getBoundingClientRect(), b=el.querySelector('.food-multiplier').getBoundingClientRect(),i=el.querySelector('.food-image').getBoundingClientRect();
        return c.left>=sc.left-1&&c.right<=sc.right+1&&b.left>=c.left&&b.right<=c.right&&b.top>=c.top&&b.bottom<=c.bottom&&i.left>=c.left&&i.right<=c.right&&i.bottom<=c.bottom;
      });
    }'''), ('Food/badge boundary',count)
    assert page.evaluate('''()=>{
      const all=[...document.querySelectorAll('.food-cell')].map(e=>e.getBoundingClientRect()),lastY=Math.max(...all.map(r=>r.top)),last=all.filter(r=>Math.abs(r.top-lastY)<1),grid=document.querySelector('#cabinet-grid').getBoundingClientRect();
      return Math.abs((last[0].left+last.at(-1).right-grid.left-grid.right)/2)<2;
    }'''), ('Centered last row',count)
    overflow=page.locator('#cabinet-scroll').evaluate('e=>e.scrollHeight>e.clientHeight+2')
    assert overflow == (count>9), ('Food overflow',count,overflow)
    assert page.locator('#cabinet-scrollbar').evaluate('e=>e.classList.contains("is-idle")') == (count<=9)
    assert page.evaluate('''()=>{
      const board=document.querySelector('#orders-board').getBoundingClientRect(),reg=document.querySelector('.register-art').getBoundingClientRect(),hud=document.querySelector('.top-hud').getBoundingClientRect(),stage=document.querySelector('#stage').getBoundingClientRect();
      return board.bottom<=reg.top&&hud.right<stage.right-15*(stage.width/2000);
    }'''), 'Register/board separation and HUD margin'
    assert page.locator('.order-ticket').evaluate_all('''els=>els.every(e=>{
      const r=e.getBoundingClientRect(),main=e.querySelector('.order-main').getBoundingClientRect(),math=e.querySelector('.order-math').getBoundingClientRect(),play=e.querySelector('.ticket-play').getBoundingClientRect(),reward=e.querySelector('.coin-hero').getBoundingClientRect();
      const m=e.querySelector('.order-math');
      return reward.right<=main.left&&main.right<=play.left&&math.bottom<=r.bottom&&m.scrollWidth<=m.clientWidth+1;
    })'''), 'Ticket parts may not overlap'
    assert not page.locator('img').evaluate_all('els=>els.some(e=>!e.complete||!e.naturalWidth)'), 'All images loaded'

def popup_check(page, name):
    assert page.locator('#modal-overlay').is_visible()
    assert page.locator('#modal-content').evaluate('e=>e.scrollWidth<=e.clientWidth+1'), ('Popup horizontal overflow',name)
    shot(page,name)
    assert not page.locator('img').evaluate_all('els=>els.some(e=>!e.complete||!e.naturalWidth)'), ('Popup images',name)

def run(pw, engine):
    browser=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
    context=browser.new_context(viewport={'width':2000,'height':1200},has_touch=True)
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    try:
        page.goto(URL);page.wait_for_load_state('networkidle')
        assert state(page)['coins']==12750 and state(page)['boost']==57
        shot(page,f'{engine}-home-2000')
        for width,height in [(2000,1200),(1280,800)]:
            page.set_viewport_size({'width':width,'height':height})
            stationary=page.locator('#menu-cabinet').bounding_box()
            for count in [1,3,5,9,10,16]:
                preview(page,count);check_layout(page,count,stationary)
                shot(page,f'{engine}-{width}-foods-{count}')
            check_scrollbar(page,engine,'#cabinet-scroll','#cabinet-track','#cabinet-thumb','[data-action="food-down"]','[data-action="food-up"]')
            page.locator('#cabinet-thumb').focus();page.keyboard.press('End')
            shot(page,f'{engine}-{width}-foods-last-row')
            check_scrollbar(page,engine,'#order-scroller','#board-scroll-track','#board-scroll-thumb','[data-action="order-down"]','[data-action="order-up"]')
            page.locator('#board-scroll-thumb').focus();page.keyboard.press('End')
            shot(page,f'{engine}-{width}-orders-last-row')
            scroll_top(page,'#order-scroller')
            # Main entry points and each popup actually present in the supplied ZIP.
            for selector,key in [('.nav-packages','packages'),('.nav-collection','collection'),('#boost-status','collection'),('#wallet-button','wallet'),('#help-button','help'),('#settings-button','settings'),('[data-action="odds"]','odds')]:
                page.locator(selector).first.tap();assert state(page)['mode']==key
                assert page.locator('#modal-content').evaluate('e=>e.scrollTop')<1, ('Popup must open at its top',key)
                popup_check(page,f'{engine}-{width}-{key}')
                if key=='collection':
                    r=page.locator('#modal-content').bounding_box()
                    page.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);page.mouse.wheel(0,550)
                    page.wait_for_timeout(150)
                    assert page.locator('#modal-content').evaluate('e=>e.scrollTop')>0
                    if engine=='edge':
                        scroll_top(page,'#modal-content');swipe(page,'#modal-content')
                        assert page.locator('#modal-content').evaluate('e=>e.scrollTop')>0
                    page.locator('#modal-content').evaluate('e=>e.scrollTop=e.scrollHeight')
                    shot(page,f'{engine}-{width}-collection-bottom')
                close(page)
            for selector in ['#packages-plaque','.alcove-hit']:
                before=page.locator('#package-station').bounding_box()
                page.locator(selector).tap();assert page.locator('.package-card').count()==9
                close(page);assert page.locator('#package-station').bounding_box()==before
            page.locator('.food-cell').first.tap();popup_check(page,f'{engine}-{width}-food');close(page)
            page.locator('.nav-play').tap();popup_check(page,f'{engine}-{width}-order')
            page.locator('[data-action="orders"]').tap();popup_check(page,f'{engine}-{width}-orders');close(page)
            # Cancelled button press cannot remain stuck or shift the scene.
            before=page.locator('.nav-packages').bounding_box()
            page.locator('.nav-packages').dispatch_event('pointerdown',{'pointerId':44,'button':0})
            assert page.locator('.nav-packages').get_attribute('class').endswith('is-pressed')
            page.locator('.nav-packages').dispatch_event('pointercancel',{'pointerId':44})
            assert page.locator('.is-pressed').count()==0
            assert page.locator('.nav-packages').bounding_box()==before
        # Additional landscape composition; no viewport-specific positioning overrides.
        page.set_viewport_size({'width':1440,'height':900});preview(page,9)
        shot(page,f'{engine}-home-1440')
        page.set_viewport_size({'width':1280,'height':800})
        # Start fresh for transactions to avoid preview ownership fixtures.
        page.reload();page.wait_for_load_state('networkidle')
        before=state(page);ticket=before['tickets'][0]
        page.locator('.order-ticket').first.tap();page.locator('#answer').fill('1')
        page.locator('[data-solve]').tap()
        assert state(page)['coins']==before['coins']
        assert page.locator('#answer-error').inner_text()
        page.locator('#answer').fill(str(ticket['n']*ticket['m']))
        page.locator('[data-solve]').evaluate('(button)=>{button.click();button.click();}')
        after=state(page)
        assert after['coins']==before['coins']+ticket['reward'] and after['completed']==1
        assert after['owned']==before['owned'], 'Orders award coins only'
        popup_check(page,f'{engine}-1280-complete')
        # Replay a stale completion control through the actual event dispatcher.
        page.locator('#modal-content').evaluate('''(el,id)=>{const b=document.createElement('button');b.dataset.solve=id;el.append(b);b.click();b.remove();}''',ticket['id'])
        assert state(page)['coins']==after['coins'] and state(page)['completed']==1
        close(page)
        # A valuable coin ticket funds one purchase from each of the existing nine tiers.
        richest=max(state(page)['tickets'],key=lambda t:t['reward'])
        page.locator(f'[data-order-id="{richest["id"]}"]').scroll_into_view_if_needed()
        page.locator(f'[data-order-id="{richest["id"]}"]').tap()
        page.locator('#answer').fill(str(richest['n']*richest['m']));page.locator('[data-solve]').tap();close(page)
        prices=[300,750,1200,1800,2650,3800,5200,7800,12000]
        for tier,cost in enumerate(prices,1):
            page.locator('.nav-packages').tap();assert page.locator('.package-card').count()==9
            balance=state(page)['coins']
            page.locator(f'[data-buy="{tier}"]').scroll_into_view_if_needed()
            page.locator(f'[data-buy="{tier}"]').tap()
            assert state(page)['mode']=='opened' and state(page)['coins']==balance-cost
            assert len(state(page)['owned'])>=len(before['owned'])
            if tier==9: popup_check(page,f'{engine}-1280-opened')
            close(page)
        # Equipment recalculates Boost and newly generated tickets use equipped foods.
        page.locator('.nav-collection').tap()
        owned_equipped=state(page)['equipped'][0]
        page.locator(f'[data-equip="{owned_equipped["id"]}"]').tap()
        equipment=state(page)
        assert abs(equipment['boost']-(before['boost']-owned_equipped['multiplier']))<.001
        assert all(t['food'] in [f['id'] for f in equipment['equipped']] for t in equipment['tickets'])
        page.locator(f'[data-equip="{owned_equipped["id"]}"]').tap();close(page)
        # Keyboard containment and focus restoration, backdrop dismissal.
        page.locator('#help-button').focus();page.keyboard.press('Enter')
        page.locator('#modal-close').focus();page.keyboard.press('Shift+Tab')
        assert page.evaluate('document.querySelector("#modal").contains(document.activeElement)')
        page.keyboard.press('Escape');assert not page.locator('#modal-overlay').is_visible()
        assert page.locator('#help-button').evaluate('e=>document.activeElement===e')
        page.locator('#help-button').tap();page.mouse.click(12,28)
        assert not page.locator('#modal-overlay').is_visible()
        page.locator('[data-action="refresh"]').tap();assert len(state(page)['tickets'])==7
        # Exhausted tickets expose a real disabled Play state; refresh restores it.
        owned_before=state(page)['owned']
        for ticket in list(state(page)['tickets']):
            balance=state(page)['coins']
            page.locator('.nav-play').tap()
            page.locator('#answer').fill(str(ticket['n']*ticket['m']))
            page.locator('[data-solve]').tap()
            assert state(page)['coins']==balance+ticket['reward']
            close(page)
        assert page.locator('.nav-play').is_disabled()
        assert state(page)['owned']==owned_before
        shot(page,f'{engine}-1280-no-tickets')
        page.locator('[data-action="refresh"]').tap()
        assert not page.locator('.nav-play').is_disabled()
        # Disabled purchase controls use the real balance, with no negative coins.
        page.reload();page.wait_for_load_state('networkidle')
        page.locator('.nav-packages').tap()
        page.locator('[data-buy="9"]').scroll_into_view_if_needed();page.locator('[data-buy="9"]').tap();close(page)
        assert state(page)['coins']==750
        page.locator('.nav-packages').tap()
        assert page.locator('.buy-art:disabled').count()==7
        page.locator('[data-buy="9"]').evaluate('e=>e.click()')
        assert state(page)['coins']==750
        popup_check(page,f'{engine}-1280-packages-disabled');close(page)
        assert not errors,errors
        result={'engine':engine,'passed':True,'viewports':[[2000,1200],[1280,800],[1440,900]],'counts':[1,3,5,9,10,16],
                'native_touch_swipe':engine=='edge','console_errors':errors,'final_state':state(page)}
        (SHOTS/f'{engine}-results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
        print(f'PASS {engine}: layouts, badge/ticket boundaries, both scrollbars, popups, touch, nine purchases, equipment, math and one-time coin rewards',flush=True)
    except Exception:
        shot(page,f'{engine}-FAILURE')
        raise
    finally: browser.close()

try:
    with sync_playwright() as pw:
        for engine in sys.argv[1:] or ['edge']: run(pw,engine)
finally: server.shutdown()
