"""Three-column Packages wireframe and immediate collection in WebKit/Edge."""
import functools
import http.server
import os
from pathlib import Path
import sys
import threading

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', str(ROOT / '.test-tools' / 'browsers'))
from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
shots = ROOT / '.test-tools' / 'packages-shots'
shots.mkdir(parents=True, exist_ok=True)


def check(pw, engine):
    browser = pw.webkit.launch() if engine == 'webkit' else pw.chromium.launch(channel='msedge')
    page = browser.new_page(has_touch=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
        page.wait_for_selector('.package-panel')
        page.evaluate("g.coins=1e9;g.bakeryLevel=21;g.packages=[15,4,0,0,0,0,0,2];save();openPackages('buy',0);setPackageQuantity(10)")
        page.evaluate('document.fonts.ready')
        page.locator('.modal').evaluate('e=>Promise.all(e.getAnimations().map(a=>a.finished))')
        for width,height in [(2000,1200),(1194,834),(1024,768)]:
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_timeout(120)
            assert page.locator('.package-type-card').count()==8
            metrics=page.locator('.package-workspace').evaluate('''e=>{
                const r=e.getBoundingClientRect(),cols=[...e.children].map(c=>c.getBoundingClientRect());
                const buttons=[...e.querySelectorAll('button')].filter(b=>b.getClientRects().length);
                return {fractions:cols.map(c=>c.width/r.width),sameTop:cols.every(c=>Math.abs(c.top-r.top)<1),
                    fits:e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1,
                    badButtons:buttons.filter(b=>{const q=b.getBoundingClientRect();return q.width<43.9||q.height<43.9||b.scrollWidth>b.clientWidth+1||b.scrollHeight>b.clientHeight+1}).map(b=>[b.id,b.className,b.clientWidth,b.scrollWidth,b.clientHeight,b.scrollHeight,b.getBoundingClientRect().width,b.getBoundingClientRect().height,getComputedStyle(b).transform])};
            }''')
            assert metrics['sameTop'] and metrics['fits'],(engine,width,metrics)
            assert metrics['badButtons']==[],(engine,width,metrics)
            assert all(abs(actual-target)<.025 for actual,target in zip(metrics['fractions'],[.16,.42,.42])),metrics
            assert page.locator('.package-odds-row').count()==8
            assert page.locator('.package-opening-grid button').count()==15
            page.screenshot(path=str(shots/f'{engine}-{width}.png'))
        # Select the locked highest type, including old stock; opening is independent of purchasing gates.
        page.locator('[data-package-type="7"]').click()
        assert page.locator('#packageSelectedHeading').inner_text()=='8★ FATE PACKAGE'
        assert page.locator('#packageOpeningHeading').inner_text()=='OPEN 8★ PACKAGES'
        assert page.locator('#packageBuy').is_disabled()
        assert page.locator('.package-opening-grid button').count()==2
        page.evaluate('Math.random=()=>.999999')
        page.locator('.package-opening-grid button').first.tap()
        assert page.evaluate("g.owned.some(o=>o.id==='ube-ensaymada')")
        assert page.locator('.opened-package').evaluate('''e=>[...e.children].every(c=>c.scrollWidth<=c.clientWidth+1&&c.scrollHeight<=c.clientHeight+1)''')
        page.screenshot(path=str(shots/f'{engine}-fate.png'))
        page.locator('[data-package-type="0"]').click()
        page.locator('#packagePlusFive').tap()
        assert page.evaluate('packageQuantity')==6
        page.locator('#packageMinus').tap()
        assert page.evaluate('packageQuantity')==5
        page.locator('#packageMax').tap()
        assert page.evaluate('packageQuantity')==35
        page.evaluate('setPackageQuantity(2)')
        coins,cost=page.evaluate('[g.coins,packagePrice(0)*2]')
        old_buy=page.locator('#packageBuy').get_attribute('onclick')
        page.locator('#packageBuy').tap()
        assert page.evaluate('g.coins')==coins-cost
        assert page.evaluate('g.packages[0]')==17
        page.evaluate(old_buy)
        assert page.evaluate('g.packages[0]')==17,'stale button quote cannot buy twice'
        assert page.locator('.modal').count()==1
        page.evaluate('Math.random=()=>0')
        token=page.locator('.package-opening-grid button').first.get_attribute('data-package-token')
        before=page.evaluate('g.recipeCeilings.pandesal')
        page.locator(f'[data-package-token="{token}"]').tap()
        assert page.evaluate('g.packages[0]')==16
        assert page.evaluate('g.recipeCeilings.pandesal')==before+1
        assert page.locator('.opened-package').count()==1
        page.evaluate('(id)=>openPackageSlot(0,id)',token)
        assert page.evaluate('g.packages[0]')==16
        # No timer/animation needs to settle between consecutive openings.
        page.locator('.package-opening-grid button').first.tap()
        assert page.evaluate('g.packages[0]')==15
        page.locator('#packageOpenAll').tap()
        assert page.evaluate('g.packages[0]')==0
        assert page.evaluate('g.packages[1]')==4
        assert page.locator('.opened-package').count()==17
        assert page.locator('#packageOpenAll').is_disabled()
        assert page.evaluate('g.recipeCeilings.pandesal')==before+17
        page.screenshot(path=str(shots/f'{engine}-opened.png'))
        page.locator('[data-package-type="1"]').click()
        assert page.locator('.opened-package').count()==0
        assert page.locator('.package-opening-grid button').count()==4
        page.locator('[data-package-type="0"]').click()
        assert page.locator('.opened-package').count()==17
        page.locator('.modal .close').click()
        assert page.evaluate('packageSession===null')
        page.locator('.package-panel .primary').click()
        assert page.locator('.opened-package').count()==0
        assert page.evaluate('g.recipeCeilings.pandesal')==before+17
        page.reload();page.wait_for_selector('.package-panel')
        page.locator('.package-panel .primary').click()
        assert page.evaluate('g.packages[0]')==0
        assert page.evaluate('g.recipeCeilings.pandesal')==before+17
        assert page.locator('.opened-package').count()==0
        # Capacity and scrolling at the inventory limit.
        page.evaluate("g.packages[0]=50;save();openPackages('buy',0)")
        assert page.locator('.package-opening-grid button').count()==50
        assert page.locator('#packageBuy').is_disabled()
        assert page.locator('#packageQuantity').is_disabled()
        page.locator('.package-opening-grid button').last.scroll_into_view_if_needed()
        assert page.locator('.package-opening-grid').evaluate('e=>e.scrollTop>0')
        for width,height in [(834,1194),(597,417),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_timeout(100)
            assert page.locator('.modal').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        assert errors==[],errors
        print(f'PASS {engine}: wireframe proportions at all tablet sizes; eight types; gates; quantities/capacity; buy once; single and selected-type Open All; immediate Mastery; session/reload integrity',flush=True)
    except Exception:
        page.screenshot(path=str(shots/f'{engine}-failure.png'))
        print('ERRORS',errors,flush=True)
        raise
    finally:
        browser.close()


try:
    with sync_playwright() as pw:
        for engine in sys.argv[1:] or ['webkit','edge']:
            check(pw,engine)
finally:
    server.shutdown()
