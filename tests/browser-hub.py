"""Integrated hub: rendered geometry, live transactions, persistence and reward replay.
Run python tests/browser-hub.py [edge|webkit]. Screenshots go to .test-tools/illustrated-shots.
"""
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
    def log_message(self, *args): pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
shots = ROOT / '.test-tools/illustrated-shots'
shots.mkdir(parents=True, exist_ok=True)

def check(pw, engine):
    browser = pw.webkit.launch() if engine == 'webkit' else pw.chromium.launch(channel='msedge')
    page = browser.new_page(has_touch=True, viewport={'width':2000,'height':1200})
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    try:
        base=f'http://127.0.0.1:{server.server_port}/index.html'
        page.goto(base)
        page.wait_for_selector('.hub-food')
        page.wait_for_load_state('networkidle')
        page.wait_for_function("document.querySelector('#stage')?.dataset.rendered==='true'")
        if engine=='edge':
            assert page.evaluate("document.querySelector('#stage').dataset.rendered==='true'")
        page.screenshot(path=str(shots/f'{engine}-starter.png'))
        assert page.locator('.hub-package').count()==1
        assert page.evaluate('bakeryValue()')==1.2
        assert page.locator('canvas').count()==0
        assert page.locator('.hub-brand-caption').count()==0
        if '--food-study' in sys.argv:
            page.evaluate("""(()=>{const original=bakeryFoodArt,ids=['pandesal','ensaymada','ube-pandesal'];
                bakeryFoodArt=(id,extra='')=>{const n=ids.indexOf(id);return n<0?original(id,extra):
                `<svg class="food-art illustrated-food ${extra}" viewBox="0 0 100 100" role="img" aria-label="${F(id).name}"><svg width="100" height="100" viewBox="${n*100} 0 100 100" overflow="hidden"><image href="assets/illustrated/food-style-study.webp" width="300" height="100" preserveAspectRatio="none"/></svg></svg>`};
                g.owned=ids.map((id,i)=>({id,uid:i+1,level:1,fusion:1,spent:0}));g.activeMenu=[1,2,3];g.menuSlots=3;render()})()""")
            page.wait_for_load_state('networkidle')
            for width,height in [(2000,1200),(1024,768)]:
                page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100)
                page.screenshot(path=str(shots/f'{engine}-food-study-{width}.png'))
            print(f'PASS {engine}: three reference foods in live showcase at target and tablet sizes',flush=True)
            return
        for n in [1,3,5,9,10,16,17]:
            page.evaluate('''n=>{g.owned=FOOD.slice(0,n).map((f,i)=>({uid:i+1,id:f.id,level:1,fusion:1,spent:0}));
                g.activeMenu=g.owned.map(o=>o.uid);g.menuSlots=n;g.uidNext=n+1;render()}''',n)
            page.wait_for_timeout(150)
            assert page.locator('.hub-food').count()==n
            assert page.locator('.hub-food:not([data-food])').count()==0
            assert page.evaluate('''()=>{const c=document.querySelector('.showcase-scroll').getBoundingClientRect();
                return [...document.querySelectorAll('.hub-food')].every(e=>{const r=e.getBoundingClientRect();return r.left>=c.left-1&&r.right<=c.right+1})}''')
            if n==10:
                assert page.evaluate('''()=>{const foods=[...document.querySelectorAll('.hub-food')],
                    rects=foods.map(e=>e.getBoundingClientRect()),y=Math.max(...rects.map(r=>r.top)),last=rects.filter(r=>Math.abs(r.top-y)<1),grid=document.querySelector('.showcase-grid').getBoundingClientRect();
                    return Math.abs((last[0].left+last.at(-1).right)/2-(grid.left+grid.right)/2)<2}''')
            page.screenshot(path=str(shots/f'{engine}-foods-{n}.png'))
        if '--visual-only' in sys.argv:
            page.evaluate('openHubCollection()')
            page.wait_for_timeout(150)
            page.screenshot(path=str(shots/f'{engine}-collection-all-foods.png'))
            print(f'PASS {engine}: seven illustrated equipment layouts, centered final rows and complete collection',flush=True)
            return
        assert page.evaluate("document.querySelector('.showcase-scroll').scrollHeight>document.querySelector('.showcase-scroll').clientHeight")
        page.locator('.showcase-scroll').evaluate('e=>e.scrollTop=e.scrollHeight')
        page.wait_for_timeout(100)
        page.screenshot(path=str(shots/f'{engine}-foods-scrolled.png'))
        assert page.evaluate("document.querySelector('.hub-order-scroll').scrollHeight>document.querySelector('.hub-order-scroll').clientHeight")
        page.locator('.hub-order-scroll').evaluate('e=>e.scrollTop=e.scrollHeight')
        page.locator('.hub-order-scroll').evaluate('e=>e.scrollTop=0')
        # Every package invokes the real workspace and a durable transaction.
        page.evaluate('g.coins=1e9;g.completed=300;save()')
        for rank in [0,4,7,8]:
            page.locator('.hub-package').tap()
            page.locator(f'[data-package-type="{rank}"]').tap()
            assert page.locator('#packageSelectedHeading').inner_text().startswith(str(rank+1)+'★')
            before=page.evaluate('g.coins')
            page.locator('#packageBuy').tap()
            assert page.evaluate('g.coins')<before
            token=page.locator('.package-open-slot:not(.opened-package)').first.get_attribute('data-package-token')
            page.locator('.package-open-slot:not(.opened-package)').first.tap()
            assert page.locator('.opened-package').count()==1
            assert page.locator('.package-shop-modal .illustrated-food').count()==0
            if rank==0:
                # The new non-package overlay skin must have no effect here.
                style_check=page.evaluate('''()=>{const snapshot=()=>['.package-shop-modal','.package-workspace','#packageBuy'].map(s=>{
                    const c=getComputedStyle(document.querySelector(s));return [c.background,c.border,c.borderRadius,c.boxShadow,c.fontFamily]});
                    const before=snapshot(),sheet=document.querySelector('link[href="styles/bakery-interface.css"]');sheet.disabled=true;
                    const after=snapshot();sheet.disabled=false;return JSON.stringify(before)===JSON.stringify(after)}''')
                assert style_check
            assert not page.evaluate('''args=>openPackageSlot(args[0],args[1])''',[rank,token])
            page.locator('.modalhead .close').tap()
        # Food management uses real equipment and derived Boost.
        page.locator('.hub-food').first.tap()
        assert page.locator('.food-selection-single').is_visible()
        for width,height in [(2000,1200),(1194,834),(1024,768)]:
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_timeout(120)
            metrics=page.locator('.food-selection-popup').evaluate('''e=>{const r=e.getBoundingClientRect();return {
                inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,
                controls:[...e.querySelectorAll('button')].every(b=>{const q=b.getBoundingClientRect();return q.width>=43.9&&q.height>=43.9&&b.scrollWidth<=b.clientWidth+1&&b.scrollHeight<=b.clientHeight+1}),
                stats:[...e.querySelector('.selection-food-stats').children].every((b,i,blocks)=>!i||blocks[i-1].getBoundingClientRect().bottom<=b.getBoundingClientRect().top+1)}}''')
            assert metrics['inside'] and metrics['controls'] and metrics['stats'],(engine,width,metrics)
            page.screenshot(path=str(shots/f'{engine}-collection-detail-{width}.png'))
            if width==1024:
                page.locator('.food-panel-scroll').evaluate('e=>e.scrollTop=e.scrollHeight')
                assert page.locator('.mastery-availability').evaluate('e=>e.getBoundingClientRect().bottom<=e.closest(".food-panel-scroll").getBoundingClientRect().bottom+1')
                page.screenshot(path=str(shots/f'{engine}-collection-detail-scrolled.png'))
                page.locator('.food-panel-scroll').evaluate('e=>e.scrollTop=0')
        page.set_viewport_size({'width':2000,'height':1200})
        before=page.evaluate('bakeryValue()')
        page.locator('.action-unequip').tap()
        assert page.evaluate('bakeryValue()')<before
        page.locator('.action-equip').tap()
        assert page.evaluate('bakeryValue()')==before
        page.locator('.food-panel-close').tap()
        page.locator('[aria-label="Auto Equip"]').select_option('final')
        assert page.evaluate("g.autoEquip==='final'&&new Set(g.activeMenu).size===g.activeMenu.length")
        page.locator('[aria-label="Auto Equip"]').select_option('off')
        assert page.evaluate("g.autoEquip==='off'")
        page.locator('.hub-collection-back').tap()
        page.locator('.hub-wallet [aria-label="Settings"]').tap()
        page.wait_for_timeout(250)
        page.screenshot(path=str(shots/f'{engine}-settings.png'))
        page.locator('.modalhead .close').tap()
        # Seed a deterministic carrying ticket; engine input regression runs separately.
        page.evaluate('''g.board=[{id:9001,rarity:1,coinTier:1,a:79,b:18,base:ticketBase(1)}];
            g.ticketSeq=9001;refillBoard();save();render()''')
        page.locator('.hub-ticket[data-ticket-id="9001"]').tap()
        page.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===9001")
        page.screenshot(path=str(shots/f'{engine}-worksheet.png'))
        page.evaluate("window.hubFrame=$('worksheetFrame')")
        budget=page.evaluate('g.run.budget')
        page.locator('.worksheet-exit').tap()
        page.locator('.hub-ticket[data-ticket-id="9001"]').tap()
        assert page.evaluate("hubFrame===$('worksheetFrame')")
        page.reload()
        page.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===9001")
        assert page.evaluate('g.run.budget')==budget
        page.evaluate('''const r=g.run,ledger=ensureWorksheetRewards(r);
            const actions=r.steps.flatMap(s=>worksheetActionKinds(s).map(kind=>({
              id:worksheetActionId(ledger.attemptId,s.row,s.col,kind),row:s.row,col:s.col,kind})));
            handleWorksheetMessage({source:$('worksheetFrame').contentWindow,data:{source:'pq-worksheet',
              type:'complete',attemptId:ledger.attemptId,ticket:r.ticket,top:79,bottom:18,actions}})''')
        page.wait_for_selector('#collectRewards')
        page.screenshot(path=str(shots/f'{engine}-claim.png'))
        before=page.evaluate('g.coins')
        page.locator('#collectRewards').tap()
        assert page.evaluate('g.coins')==before+budget
        assert not page.evaluate('prizeItems()')
        page.wait_for_timeout(250)
        page.screenshot(path=str(shots/f'{engine}-completed.png'))
        page.locator('.modalhead .close').tap()
        page.reload();page.wait_for_selector('.hub-food')
        assert page.evaluate('g.coins')==before+budget
        for width,height in [(2000,1200),(1194,834),(1024,768),(960,600),(375,812)]:
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_timeout(100)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            if width>=960:
                assert page.evaluate('''()=>{const heading=document.querySelector('#hubOrdersHeading').getBoundingClientRect(),
                    ticket=document.querySelector('.hub-ticket').getBoundingClientRect();return ticket.top>=heading.bottom-1}''')
            page.screenshot(path=str(shots/f'{engine}-{width}.png'))
        page.set_viewport_size({'width':2000,'height':1200})
        page.evaluate('''g.board=COIN_TIERS.map((_,rank)=>({id:9500+rank,a:rank>4?9876:36,b:27,rarity:rank,coinTier:rank,base:ticketBase(rank)}));
            reconcileOrderFoods();render()''')
        for rank in range(8):
            ticket=page.locator(f'.hub-ticket[data-ticket-id="{9500+rank}"]')
            ticket.scroll_into_view_if_needed()
            assert ticket.get_attribute('data-order-food') in page.evaluate('menuRecipes()')
            ticket.screenshot(path=str(shots/f'{engine}-coin-tier-{rank+1}.png'))
        page.locator('.hub-order-scroll').evaluate('e=>e.scrollTop=0')
        page.screenshot(path=str(shots/f'{engine}-tiers-low.png'))
        page.locator('.hub-order-scroll').evaluate('e=>e.scrollTop=e.scrollHeight')
        page.screenshot(path=str(shots/f'{engine}-tiers-high.png'))
        page.set_viewport_size({'width':1194,'height':834})
        page.emulate_media(reduced_motion='reduce')
        page.goto(base+'?view=fallback');page.wait_for_selector('.hub-food')
        assert page.locator('canvas').count()==0
        assert page.locator('.bakery-room-art').is_visible()
        page.locator('.hub-package').first.tap()
        assert page.locator('.package-workspace').is_visible()
        assert not errors,errors
        print(f'PASS {engine}: counts, clipping, both scroll areas, 4 package tiers, equipment/Boost, iframe retention, reload, claim once, 5 viewports and fallback',flush=True)
    except Exception:
        page.screenshot(path=str(shots/f'{engine}-failure.png'))
        print('ERRORS',errors,flush=True)
        raise
    finally:
        browser.close()

try:
    with sync_playwright() as pw:
        for engine in [arg for arg in sys.argv[1:] if not arg.startswith('--')] or ['edge','webkit']:check(pw,engine)
finally:
    server.shutdown()
