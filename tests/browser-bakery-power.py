"""Wireframe structure, sidebar 60/40 split, progression and button interactions."""
import functools
import http.server
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
shots=ROOT/'.test-tools/bakery-power-shots'
shots.mkdir(parents=True,exist_ok=True)


def check(pw,engine):
    browser=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge')
    page=browser.new_page(has_touch=True)
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    try:
        page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
        page.wait_for_function("typeof renderBakery==='function'")
        page.evaluate('document.fonts.ready')
        page.evaluate('g.packages=[1,2,3,4,5,6,7,8]')
        for width,height in [(2000,1200),(1194,834),(1024,768)]:
            page.set_viewport_size({'width':width,'height':height})
            for level in [1,21,page.evaluate('BAKERY_POWER_CONFIG.purchases'),page.evaluate('BAKERY_POWER_CONFIG.purchases+1')]:
                page.evaluate(f'g.bakeryLevel={level};g.coins=1e250;render()')
                panel=page.locator('.bakery-power')
                assert page.locator('.leftcol').evaluate('''e=>{const r=e.getBoundingClientRect(),a=e.children[0].getBoundingClientRect(),b=e.children[1].getBoundingClientRect(),gap=parseFloat(getComputedStyle(e).rowGap),usable=r.height-gap;return Math.abs(a.height/usable-.6)<.002&&Math.abs(b.height/usable-.4)<.002&&Math.abs(b.bottom-r.bottom)<1&&Math.abs(r.bottom-(innerHeight-10))<1}'''), (engine,width,level)
                assert page.locator('.bakery-carousel,.carousel-controls,.bakery-upgrade-card,.power-change').count()==0
                assert page.locator('.bakery-row.current').count()==1
                assert page.locator('.bakery-row.current').get_attribute('data-upgrade')==str(level)
                assert page.locator('.current-bakery-preview figcaption').inner_text()==page.evaluate('bakeryUpgradeName(g.bakeryLevel)')
                assert page.locator('.current-bakery-preview>.bakery-icon').evaluate('e=>e.getBoundingClientRect().height>40')
                assert page.locator('.bakery-power-heading').evaluate('e=>e.getBoundingClientRect().height<=34')
                assert page.locator('#unopenedPackages').inner_text()=='36'
                assert page.locator('.package-possible-copy strong').inner_text()==page.evaluate("(()=>{const reward=possiblePackageReward();return `${reward.rank+1}★ ${reward.name.toUpperCase()}`})()")
                assert page.locator('.package-panel button').count()==1
                assert page.locator('.package-panel').evaluate('''e=>{
                    const panel=e.getBoundingClientRect();return e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1
                    &&[...e.querySelectorAll('button,svg')].every(n=>{const r=n.getBoundingClientRect();return r.top>=panel.top&&r.bottom<=panel.bottom&&r.left>=panel.left&&r.right<=panel.right});
                }''')
                assert page.locator('.bakery-row.current').evaluate('''e=>{
                    const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();
                    return r.top>=p.top&&r.bottom<=p.bottom+1&&parseFloat(getComputedStyle(e).borderTopWidth)>=4;
                }''')
                assert panel.locator('.bakery-row').evaluate_all('(rows)=>rows.every(row=>row.children.length===2&&row.scrollWidth<=row.clientWidth+1)')
                button=page.locator('.bakery-power-buy')
                assert button.evaluate('''e=>{
                    const r=e.getBoundingClientRect(),p=e.closest('.bakery-power').getBoundingClientRect();
                    return r.top>=p.top&&r.bottom<=p.bottom&&r.height>=44&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
                }''')
                assert button.is_disabled()==(level==page.evaluate('BAKERY_POWER_CONFIG.purchases+1'))
                assert page.locator('.bakery-row.next').count()==(0 if level==page.evaluate('BAKERY_POWER_CONFIG.purchases+1') else 1)
                assert page.locator('.bakery-row.locked').count()==(1 if level<100 else 0)
                if level<100:
                    assert page.locator('.bakery-row.locked .bakery-row-copy>strong').inner_text()=='???'
                    assert page.locator('.bakery-row.locked .bakery-row-gain').inner_text()=='+???'
                # Every state can be reached inside the list; scrolling it
                # must leave the bottom action in the same accessible place.
                action_top=button.bounding_box()['y']
                for row in page.locator('.bakery-row').all():
                    row.scroll_into_view_if_needed()
                    assert row.evaluate('e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return r.top>=p.top-1&&r.bottom<=p.bottom+1}')
                assert abs(button.bounding_box()['y']-action_top)<=1
                page.evaluate('revealCurrentBakery()')
                if level==21:
                    page.screenshot(path=str(shots/f'{engine}-{width}.png'))
                page.locator('.bakery-power-value').tap()
                assert page.locator('#modalTitle').inner_text()=='Bakery Power 👑'
                assert page.locator('.modalbody').inner_text()=='Boosts the coins you earn from every order!'
                assert page.locator('.modal button').count()==1
                page.locator('.modal .close').tap()
                page.locator('.bakery-power-heading button').tap()
                assert page.locator('.modalbody').inner_text()=='Boosts the coins you earn from every order!'
                page.locator('.modal .close').tap()
            print('PASS structure and 60/40 split',engine,width,height,flush=True)
        page.evaluate('g.bakeryLevel=21;g.coins=0;render()')
        assert page.locator('.bakery-power-buy').is_disabled()
        page.evaluate('g.coins=1e12;before=g.coins;fee=bakeryUpgradeCost();oldPower=decorBonus();render()')
        page.locator('.bakery-power-buy').tap()
        assert page.evaluate('g.bakeryLevel===22&&g.coins===before-fee&&Math.abs(decorBonus()/oldPower-1.085)<1e-12')
        page.locator('#purchaseUndo button').tap()
        assert page.evaluate('g.bakeryLevel===21&&g.coins===before')
        page.reload()
        page.wait_for_selector('.bakery-row.current')
        assert page.locator('.bakery-row.current').get_attribute('data-upgrade')=='21'
        page.locator('.coins-counter').tap()
        assert page.locator('.coins-help p').all_text_contents()==['Complete orders to earn coins!',"Your Baker's Boost multiplies the coins you earn."]
        page.locator('.modal .close').tap()
        page.locator('.package-panel .primary').tap()
        assert page.locator('.package-type-card[aria-pressed="true"]').count()==1
        assert page.locator('#packageBuy').is_visible()
        page.locator('.modal .close').tap()
        assert page.locator('.coins-counter').evaluate('e=>parseFloat(getComputedStyle(e).borderTopWidth)>=2&&getComputedStyle(e).boxShadow!=="none"')
        assert errors==[],errors
        print('PASS purchase, Undo, reload and Coins popup',engine,flush=True)
    finally:
        browser.close()


try:
    with sync_playwright() as pw:
        for engine in (sys.argv[1:] or ['webkit','edge']): check(pw,engine)
finally:
    server.shutdown()
