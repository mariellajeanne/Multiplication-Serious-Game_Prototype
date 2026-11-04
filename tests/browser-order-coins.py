"""Coin ticket wireframe, tier persistence and claiming in real WebKit and Edge."""
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
shots = ROOT / '.test-tools' / 'order-coins-shots'
shots.mkdir(parents=True, exist_ok=True)


def check(pw, engine):
    browser = pw.webkit.launch() if engine == 'webkit' else pw.chromium.launch(channel='msedge')
    page = browser.new_page(has_touch=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
        page.wait_for_selector('.ticket')
        page.emulate_media(reduced_motion='reduce')
        # All tiers, including the longest labels, in the actual scrolling rail.
        page.evaluate('''g.completed=40;g.mastery=40;g.permanentLuck=10;
            g.board=COIN_TIERS.map((_,rank)=>({id:500+rank,rarity:rank,coinTier:rank,
              orderLabel:COIN_ORDER_LABELS[rank][0],orderIcon:COIN_ORDER_ICONS[rank],
              a:rank>4?9876:543,b:rank?98:9,base:ticketBase(rank)}));
            g.ticketSeq=507;render();save()''')
        for width,height in [(2000,1200),(1194,834),(1024,768),(834,1194),(390,844),(597,417)]:
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_timeout(120)
            styles = []
            for rank in range(8):
                card=page.locator(f'.ticket[data-ticket-id="{500+rank}"]')
                card.scroll_into_view_if_needed()
                metrics=card.evaluate('''e=>{
                    const parts=['.ticket-reward-panel','.ticket-order-label','.ticket-equation','.ticket-progress'];
                    const r=e.getBoundingClientRect(),s=getComputedStyle(e);
                    return {parts:parts.map(sel=>{const p=e.querySelector(sel),q=p.getBoundingClientRect();return [sel,p.clientWidth,p.scrollWidth,p.clientHeight,p.scrollHeight,q.left-r.left,q.right-r.right,q.top-r.top,q.bottom-r.bottom]}),fits:e.scrollWidth<=e.clientWidth+1&&parts.every(sel=>{
                        const p=e.querySelector(sel),q=p.getBoundingClientRect();
                        return p.scrollWidth<=p.clientWidth+1&&p.scrollHeight<=p.clientHeight+1
                          &&q.left>=r.left&&q.right<=r.right&&q.top>=r.top&&q.bottom<=r.bottom;
                    }),style:[s.backgroundImage,s.backgroundColor,s.borderColor,s.borderStyle].join('|')};
                }''')
                assert metrics['fits'],(engine,width,rank,metrics)
                assert card.locator('.ticket-stars').inner_text()=='★'*(rank+1)
                assert card.locator('.ticket-tier-label').inner_text().startswith(f'{rank+1}★ ')
                styles.append(metrics['style'])
                if width in [2000,1024]:
                    card.screenshot(path=str(shots/f'{engine}-{width}-tier-{rank+1}.png'))
            assert len(set(styles))==8,'Whole ticket treatments must differ statically'
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            page.locator('.tickets').evaluate('e=>e.scrollTop=0')
            page.screenshot(path=str(shots/f'{engine}-{width}.png'))
        page.set_viewport_size({'width':1194,'height':834})
        page.evaluate('g.board=g.board.slice(0,5);save()')
        snapshot=page.evaluate('JSON.stringify(g.board)')
        page.reload();page.wait_for_selector('.ticket')
        assert page.evaluate('JSON.stringify(g.board)')==snapshot
        page.locator('.ticket[data-ticket-id="502"]').tap()
        page.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===502")
        assert page.locator('.chest-luck-top').count()==0
        assert page.locator('.pool-chests').count()==0
        first=page.evaluate('JSON.stringify([g.run.ticket,g.run.budget,g.run.bakersBoost])')
        page.locator('.worksheet-exit').click()
        page.locator('.ticket[data-ticket-id="503"]').tap()
        page.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===503")
        page.locator('.worksheet-exit').click()
        page.locator('.ticket[data-ticket-id="502"]').tap()
        assert page.evaluate('JSON.stringify([g.run.ticket,g.run.budget,g.run.bakersBoost])')==first
        # Full real action/swipe case lives in browser-frame11.py. Deliver every
        # verified domain action here to check all eight-tier accounting paths.
        stock=page.evaluate('JSON.stringify(g.packages)')
        page.evaluate('''const r=g.run,ledger=ensureWorksheetRewards(r);
            const actions=r.steps.flatMap(step=>worksheetActionKinds(step).map(kind=>({
              id:worksheetActionId(ledger.attemptId,step.row,step.col,kind),row:step.row,col:step.col,kind})));
            handleWorksheetMessage({source:$('worksheetFrame').contentWindow,data:{source:'pq-worksheet',
              type:'complete',attemptId:ledger.attemptId,ticket:r.ticket,top:r.ticket.a,bottom:r.ticket.b,actions}})''')
        page.wait_for_selector('#collectRewards')
        assert page.locator('.coin-order-reward').inner_text().find('Coin Bag')>=0
        assert page.evaluate('g.run.pool===Math.round(g.run.baseCoins*g.run.bakersBoost)')
        page.reload();page.wait_for_selector('#collectRewards')
        before,budget=page.evaluate('[g.coins,g.run.budget]')
        page.locator('#collectRewards').tap()
        assert page.evaluate('g.coins')==before+budget
        assert page.locator('.modal .coin-order-reward').is_visible()
        page.screenshot(path=str(shots/f'{engine}-completed.png'))
        page.evaluate('prizeItems();closeModal();startTicket(502)')
        assert page.evaluate('g.run===null')
        assert page.evaluate('g.coins')==before+budget
        assert page.evaluate('JSON.stringify(g.packages)')==stock
        assert page.evaluate('!!g.orderRuns[503]')
        assert errors==[],errors
        print(f'PASS {engine}: eight static tier treatments; tablet, portrait and zoom-equivalent widths; saved tiers; switching; coin-only completion; claim once',flush=True)
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
