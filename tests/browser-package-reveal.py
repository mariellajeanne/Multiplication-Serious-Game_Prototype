"""Real receipt/reveal integration, independent domino timelines and visual phases.
Run: python tests/browser-package-reveal.py edge webkit
Artifacts: output/playwright/package-reveal/ (including paused CSS phase captures).
"""
import functools
import http.server
import json
import os
from pathlib import Path
import sys
import threading

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', str(ROOT / '.test-tools/browsers'))
from playwright.sync_api import sync_playwright

OUT = ROOT / 'output/playwright/package-reveal'
OUT.mkdir(parents=True, exist_ok=True)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}/index.html'


def ready(page):
    page.wait_for_function('document.body.dataset.view==="hub"&&!document.getElementById("app").inert')


def snapshot(page):
    return page.evaluate('JSON.stringify([g.coins,g.owned,g.recipeCeilings,g.discovered,g.activeMenu,g.packageBatchReceipt])')


def buy(page, count, rank=0):
    page.evaluate('rank=>selectBakeryTier(rank)', rank)
    page.wait_for_timeout(250)
    page.locator(f'[data-world-buy="{count}"]').click()
    page.wait_for_selector('#packageBatch')


def collect(page):
    assert page.evaluate('finishPackageBatch()') is True
    assert page.evaluate('finishPackageBatch()') is False
    page.wait_for_function('!packageBatchView')
    assert page.evaluate('!document.getElementById("app").inert')
    page.wait_for_timeout(200)


def check_layout(page, count):
    metrics = page.evaluate('''()=>{
      const cards=[...document.querySelectorAll('.batch-reward')], r=e=>e.getBoundingClientRect();
      const footer=r(document.querySelector('.batch-footer')), grid=r(document.querySelector('.batch-grid'));
      return {
        rows:new Set(cards.map(e=>Math.round(r(e).top))).size,
        columns:getComputedStyle(document.querySelector('.batch-grid')).gridTemplateColumns.split(' ').length,
        visible:cards.every(e=>r(e).top>=0&&r(e).bottom<=footer.top-4),
        bounded:grid.left>=0&&grid.right<=innerWidth&&footer.bottom<=innerHeight,
        noCard:cards.every(e=>{const s=getComputedStyle(e);return s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.boxShadow==='none'&&parseFloat(s.borderTopWidth)===0}),
        noFoodMotion:cards.every(e=>[e,e.querySelector('.batch-reward-visual'),e.querySelector('.batch-food'),e.querySelector('.food-art')].every(n=>{const s=getComputedStyle(n);return s.transform==='none'&&s.animationName==='none'&&s.transitionDuration==='0s'&&s.opacity==='1'})),
        textFits:cards.every(e=>[...e.querySelectorAll('.batch-reward-copy>*:not([hidden])')].every(n=>n.scrollWidth<=n.clientWidth+1&&n.scrollHeight<=n.clientHeight+1)),
        panelBelowFood:cards.every(e=>r(e.querySelector('.batch-reward-copy')).top>=r(e.querySelector('.batch-food')).bottom+4),
        panelsSeparate:cards.every((e,i)=>!i||r(e).top>r(cards[i-1]).top+1||r(e).left>=r(cards[i-1]).right+8),
        noHeadings:!document.querySelector('.batch-heading,#packageBatchTitle,#packageBatchProgress,.batch-swipe-hint'),
        footerOnlyAction:document.querySelector('.batch-footer').innerText.trim()===(cards.length===1?'Collect':'Collect All'),
        buttonHeight:r(document.querySelector('#packageBatchCollect')).height>=44,
        primary:getComputedStyle(document.querySelector('#packageBatchCollect')).backgroundColor==='rgb(245, 200, 94)'
      };
    }''')
    assert metrics.pop('rows') == (2 if count == 10 else 1), metrics
    assert metrics.pop('columns') == (1 if count == 1 else 5), metrics
    if not all(metrics.values()):
        page.screenshot(path=str(OUT / f'failure-{count}.png'))
        print(page.evaluate('''()=>[...document.querySelectorAll('.batch-reward-copy>*:not([hidden])')].filter(n=>n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1).map(n=>({text:n.textContent,scroll:[n.scrollWidth,n.scrollHeight],client:[n.clientWidth,n.clientHeight],css:getComputedStyle(n).cssText,rect:n.getBoundingClientRect().toJSON()}))'''), flush=True)
    assert all(metrics.values()), (page.viewport_size, count, metrics)


def freeze_packages(page, time):
    # Seek the actual production CSS animation, never mock its transforms.
    page.evaluate('''time=>{
      packageBatchView.timers.forEach(clearTimeout);packageBatchView.timers.clear();
      document.querySelectorAll('.batch-package-art').forEach(n=>{
        const a=n.getAnimations()[0];if(a){a.pause();a.currentTime=time;}
      });
    }''', time)
    page.wait_for_timeout(30)


def check_narrow(page, engine):
    # Narrow portrait/zoom keeps five columns in a reachable native scroll
    # area instead of crushing labels; its action stays within the viewport.
    page.set_viewport_size({'width': 1280, 'height': 800})
    buy(page, 10, 7)
    page.set_viewport_size({'width': 375, 'height': 812})
    page.evaluate('revealAllPackageRewards()')
    assert page.locator('.batch-stage').evaluate('n=>n.scrollWidth>n.clientWidth')
    assert page.locator('#packageBatchCollect').evaluate('n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}')
    assert page.locator('.batch-reward-copy>*:not([hidden])').evaluate_all('ns=>ns.every(n=>n.scrollHeight<=n.clientHeight+1&&n.scrollWidth<=n.clientWidth+1)')
    page.screenshot(path=str(OUT / f'{engine}-375-left.png'))
    page.locator('.batch-stage').evaluate('n=>n.scrollLeft=n.scrollWidth')
    assert page.locator('.batch-reward').last.evaluate('n=>{const r=n.getBoundingClientRect(),v=n.closest(".batch-stage").getBoundingClientRect();return r.left>=v.left&&r.right<=v.right+1}')
    page.screenshot(path=str(OUT / f'{engine}-375-right.png'))
    page.set_viewport_size({'width': 1280, 'height': 800})
    collect(page)


def run(pw, engine):
    browser = pw.webkit.launch() if engine == 'webkit' else pw.chromium.launch(channel='msedge')
    context = browser.new_context(viewport={'width': 2000, 'height': 1200}, has_touch=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    try:
        page.goto(URL)
        ready(page)
        for width, height in [(2000, 1200), (1280, 800)]:
            page.set_viewport_size({'width': width, 'height': height})
            page.screenshot(path=str(OUT / f'{engine}-home-{width}.png'))
        page.set_viewport_size({'width': 2000, 'height': 1200})
        page.evaluate('''()=>{
          g.coins=1e12;g.packageTierUnlocks=PACKAGE_SHOP.map(t=>t.rank);
          g.packageCelebrations.acknowledged=[...g.packageTierUnlocks];save();render();
          window.revealEvents=[];
          for(const type of ['animationstart','animationend'])document.addEventListener(type,e=>{
            if(e.animationName==='batch-package-open'||e.animationName==='batch-panel-emerge')
              revealEvents.push({type,name:e.animationName,index:Number(e.target.closest('.batch-reward').dataset.rewardIndex),time:performance.now()});
          });
        }''')
        page.locator('[data-world-nav="packages"]').click()
        page.wait_for_function('!bakeryJourney')

        # Uninterrupted, real-time timelines: each complete package animation
        # starts before the preceding one ends, across the row boundary as well.
        for count in [1, 5, 10]:
            page.evaluate('revealEvents=[]')
            before = page.evaluate('g.coins')
            price = page.evaluate('packagePrice(0)')
            buy(page, count)
            frozen = snapshot(page)
            assert page.evaluate('g.coins') == before - price * count
            assert page.evaluate('buyBakeryPackage(1)') is False
            assert page.evaluate('finishPackageBatch()') is False
            assert page.locator('#packageRevealAll').evaluate('n=>getComputedStyle(n).backgroundColor') == 'rgb(255, 245, 220)'
            page.wait_for_function('packageBatchView.complete', timeout=7000)
            if page.locator('.reveal-instant').count():
                print('WATCHDOG', engine, count, page.evaluate('revealEvents'), flush=True)
            assert page.locator('.reveal-instant').count() == 0, 'Natural completion used the recovery watchdog'
            assert snapshot(page) == frozen
            events = page.evaluate('revealEvents')
            starts = [e for e in events if e['type'] == 'animationstart' and e['name'] == 'batch-package-open']
            ends = [e for e in events if e['type'] == 'animationend' and e['name'] == 'batch-package-open']
            assert [e['index'] for e in starts] == list(range(count)), starts
            assert len(ends) == count
            for i in range(1, count):
                gap = starts[i]['time'] - starts[i - 1]['time']
                # Software WebKit can deliver several events in one frame.
                assert (0 <= gap < 350 if engine == 'webkit' else 65 < gap < 240), (engine, count, 'start gap', gap)
                assert starts[i]['time'] < ends[i - 1]['time']
            assert abs(starts[-1]['time'] - starts[0]['time'] - (count - 1) * 150) < 350
            assert page.evaluate('''()=>packageBatchView.receipt.rewards.every((reward,i)=>{
              const food=F(reward.foodId),panel=document.querySelector(`[data-reward-index="${i}"] .batch-reward-copy`);
              return panel.querySelector('strong').textContent===food.name&&panel.querySelector('span').textContent.includes(RARITIES[food.rarity])&&panel.querySelector('small').textContent===(reward.masteryUnlocked?`+${reward.masteryUnlocked} Mastery available`:'');
            })''')
            check_layout(page, count)
            page.screenshot(path=str(OUT / f'{engine}-natural-{count}.png'))
            (OUT / f'{engine}-timeline-{count}.json').write_text(json.dumps(events, indent=2))
            collect(page)

        # Two sampled moments of the full domino, including mixed package/food
        # phases, complement the real-time event-order assertions above.
        buy(page, 10, 5)
        for name, time in [('domino-shaking', 600), ('domino-popping', 1200)]:
            freeze_packages(page, time)
            page.screenshot(path=str(OUT / f'{engine}-{name}.png'))
        page.locator('#packageRevealAll').click()
        collect(page)

        # Every real tier asset, including Divine's wide ornaments, not the SVG box.
        for rank in range(8):
            buy(page, 1, rank)
            freeze_packages(page, 0)
            assert page.locator('.batch-package-art').evaluate('''(img,rank)=>img.complete&&img.naturalWidth>0&&img.getAttribute('src')===BAKERY_ASSETS[`package-${String(rank+1).padStart(2,'0')}`]&&getComputedStyle(img).objectFit==='contain' ''', rank)
            page.screenshot(path=str(OUT / f'{engine}-tier-{rank + 1}.png'))
            page.locator('#packageRevealAll').click()
            collect(page)

        # Visually inspect real transforms at hold, increasing swings, compression
        # and burst. Keep one receipt throughout; panel alone moves after the pop.
        buy(page, 1, 5)
        frozen = snapshot(page)
        for name, time in [('hold', 0), ('early-rock', 165), ('middle-rock', 475), ('peak-rock', 635), ('compression', 760), ('pop', 850), ('pop-end', 970)]:
            freeze_packages(page, time)
            page.screenshot(path=str(OUT / f'{engine}-single-{name}.png'))
            transform = page.locator('.batch-package-art').evaluate('n=>getComputedStyle(n).transform')
            if name == 'compression':
                scale = float(transform.removeprefix('matrix(').split(',')[0])
                assert .68 < scale < .73, transform
            if name == 'pop':
                assert float(page.locator('.batch-package-art').evaluate('n=>getComputedStyle(n).opacity')) < .5
        page.evaluate('''()=>{
          document.querySelector('.batch-package-art').getAnimations()[0].finish();
        }''')
        page.wait_for_selector('.is-revealed')
        food_rect = page.locator('.batch-food').bounding_box()
        page.evaluate('''()=>{
          const a=document.querySelector('.batch-reward-copy').getAnimations()[0];a.pause();a.currentTime=0;
        }''')
        page.screenshot(path=str(OUT / f'{engine}-panel-behind.png'))
        page.evaluate('''()=>document.querySelector('.batch-reward-copy').getAnimations()[0].currentTime=160''')
        page.screenshot(path=str(OUT / f'{engine}-panel-emerging.png'))
        assert page.locator('.batch-food').bounding_box() == food_rect
        page.evaluate('''()=>document.querySelector('.batch-reward-copy').getAnimations()[0].finish()''')
        page.wait_for_function('packageBatchView.complete')
        assert page.locator('.batch-food').bounding_box() == food_rect
        assert snapshot(page) == frozen
        collect(page)

        # Reveal All during different outstanding phases cancels animation events
        # and callbacks; nothing changes after their original completion deadline.
        for count, delay in [(1, 40), (5, 650), (10, 1100)]:
            buy(page, count)
            frozen = snapshot(page)
            page.wait_for_timeout(delay)
            page.locator('#packageRevealAll').click()
            assert page.evaluate('packageBatchView.complete')
            assert page.locator('.is-revealed').count() == count
            assert page.evaluate('document.querySelector("#packageBatch").getAnimations({subtree:true}).length') == 0
            page.wait_for_timeout(2800)
            assert snapshot(page) == frozen
            assert page.evaluate('packageBatchView.timers.size') == 0
            collect(page)

        # Stable 1 / 5 / 5x2 geometry, readable final labels and stationary food.
        for width, height in [(1280, 800), (1024, 768), (844, 390), (800, 360), (932, 430), (640, 360)]:
            page.set_viewport_size({'width': width, 'height': height})
            for count in [1, 5, 10]:
                buy(page, count, 7)
                page.evaluate('revealAllPackageRewards()')
                check_layout(page, count)
                page.screenshot(path=str(OUT / f'{engine}-{width}-{count}.png'))
                collect(page)

        check_narrow(page, engine)

        # A pending paid receipt survives reload with the same rewards and funds.
        page.set_viewport_size({'width': 1280, 'height': 800})
        buy(page, 10)
        frozen = snapshot(page)
        page.reload()
        page.wait_for_function('typeof packageBatchView!=="undefined"&&packageBatchView?.complete')
        assert snapshot(page) == frozen
        # Failed acknowledgement remains retryable, with no lost receipt.
        assert page.evaluate('''()=>{const original=save;save=()=>false;try{return finishPackageBatch()}finally{save=original}}''') is False
        assert page.locator('#packageBatchError').is_visible()
        assert snapshot(page) == frozen
        collect(page)

        # Cancellation also works when the player changes their motion preference
        # in the middle of a wave, and missing animation events have a safe exit.
        no_animation = page.add_style_tag(content='.batch-package-art{animation:none!important}')
        buy(page, 1)
        frozen = snapshot(page)
        page.wait_for_function('packageBatchView.complete', timeout=6000)
        assert snapshot(page) == frozen
        collect(page)
        no_animation.evaluate('n=>n.remove()')
        buy(page, 5)
        frozen = snapshot(page)
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function('packageBatchView.complete')
        assert snapshot(page) == frozen
        collect(page)
        for count in [1, 5, 10]:
            buy(page, count)
            assert page.evaluate('packageBatchView.complete')
            assert page.evaluate('document.querySelector("#packageBatch").getAnimations({subtree:true}).length') == 0
            check_layout(page, count)
            collect(page)
        assert not errors, errors
        (OUT / f'{engine}-state.json').write_text(page.evaluate('render_game_to_text()'), encoding='utf-8')
        print(f'PASS {engine}: x1/x5/x10 natural domino, tier art, stationary food/panel, skip, collect, persistence, reduced motion and landscape bounds', flush=True)
    finally:
        context.close()
        browser.close()


if __name__ == "__main__":
    try:
        with sync_playwright() as pw:
            for engine in sys.argv[1:] or ['edge', 'webkit']:
                run(pw, engine)
    finally:
        server.shutdown()
