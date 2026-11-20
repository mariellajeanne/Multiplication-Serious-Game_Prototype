"""Safe startup, real progress, retry and cache checks in actual browsers.

Run: python tests/browser-scene-loading.py edge webkit
Artifacts: ignored output/playwright/refinement/loading.
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
# WebKit's fonts.ready also waits for layout behind intentionally held images.
# Loading-screen captures must be possible before those resources are released.
os.environ['PW_TEST_SCREENSHOT_NO_FONTS_READY'] = '1'
from playwright.sync_api import sync_playwright
OUT = ROOT / 'output/playwright/refinement/loading'
OUT.mkdir(parents=True, exist_ok=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}/index.html'

def ready(page):
    page.wait_for_function('window.bakeryLoading?.requiredReady && document.getElementById("bakeryLoading")?.hidden && !document.getElementById("app")?.inert')

def measure(page):
    return page.evaluate('''()=>({loading:bakeryLoading,
      resources:performance.getEntriesByType('resource').length,
      transferred:performance.getEntriesByType('resource').reduce((n,r)=>n+r.transferSize,0),
      layoutShift:window.loadingCLS||0})''')

def check(pw, engine):
    browser = pw.webkit.launch() if engine == 'webkit' else pw.chromium.launch(channel='msedge')
    context = browser.new_context(viewport={'width':2000, 'height':1200}, has_touch=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_init_script('''window.loadingCLS=0;try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)loadingCLS+=e.value}).observe({type:'layout-shift',buffered:true})}catch{}''')
    try:
        # A real required resource is held; progress may advance but cannot finish.
        held_required, held_script, held_optional = [], [], []
        page.route('**/bakery-runtime/menu-frame.webp', lambda route: held_required.append(route))
        page.route('**/src/ui/helper-rewards.js', lambda route: held_script.append(route))
        page.route('**/illustrated/foods.webp', lambda route: held_optional.append(route))
        page.goto(URL, wait_until='domcontentloaded')
        page.wait_for_function('window.bakeryLoading && bakeryLoading.completed>10')
        assert held_required
        assert page.locator('#loadingSkip').is_disabled()
        assert page.evaluate('document.getElementById("app").inert && !bakeryLoading.requiredReady')
        assert page.evaluate('loadingProgress.value===bakeryLoading.completed && loadingProgress.max===bakeryLoading.total')
        page.evaluate('document.getElementById("loadingSkip").click()')
        assert page.locator('#bakeryLoading').is_visible()
        page.screenshot(path=str(OUT / f'{engine}-required.png'))
        for route in held_required: route.continue_()
        page.wait_for_function('typeof render_game_to_text==="function"')
        assert held_script and page.locator('#loadingSkip').is_disabled()
        for route in held_script: route.continue_()
        page.wait_for_function('bakeryLoading.phase==="optional" && bakeryLoading.optionalRemaining===1')
        assert held_optional and page.locator('#loadingSkip').is_enabled()
        assert page.evaluate('bakeryLoading.requiredReady && document.getElementById("app").inert')
        page.screenshot(path=str(OUT / f'{engine}-optional.png'))
        page.locator('#loadingSkip').click()
        ready(page)
        assert page.evaluate('bakeryLoading.optionalRemaining===1')
        # All world resources are already decoded; fast retargeting exposes none missing.
        page.evaluate("navigateBakery('packages');navigateBakery('orders');navigateBakery('menu')")
        page.wait_for_function('!bakeryJourney')
        assert page.evaluate('[...document.querySelectorAll("#app img")].every(i=>i.complete&&i.naturalWidth)')
        assert page.locator('[data-world-nav="menu"]').inner_text() == 'Menu'
        page.locator('[data-world-nav="menu"]').click()
        assert not page.locator('#hubCollection').is_visible()
        page.locator('.view-all-foods').click()
        assert page.locator('#hubCollection').is_visible()
        page.locator('.hub-collection-back').click()
        assert page.locator('.view-all-foods').evaluate('e=>document.activeElement===e')
        for route in held_optional: route.continue_()
        page.wait_for_function('bakeryLoading.phase==="complete"')
        assert page.evaluate('bakeryLoading.completed===bakeryLoading.total')
        assert errors == [], errors
        page.unroute_all()

        # A genuinely uncached context then same-context cached reload.
        clean = browser.new_context(viewport={'width':2000, 'height':1200})
        fresh = clean.new_page()
        fresh.goto(URL); ready(fresh)
        cold = measure(fresh)
        fresh.reload(); ready(fresh)
        cached = measure(fresh)
        assert cold['loading']['errors'] == cached['loading']['errors'] == []
        assert cached['transferred'] < cold['transferred'], (cold, cached)
        clean.close()

        # Failed frame is blocking; Retry reloads safely and preserves saved progress.
        page.route('**/bakery-runtime/menu-frame.webp', lambda route: route.fulfill(status=404, body='missing'))
        page.reload(wait_until='domcontentloaded')
        page.wait_for_function('bakeryLoading.phase==="error"')
        assert page.locator('#loadingSkip').inner_text() == 'Retry'
        assert page.evaluate('!bakeryLoading.requiredReady && document.getElementById("app").inert')
        page.screenshot(path=str(OUT / f'{engine}-retry.png'))
        page.wait_for_function('typeof g!=="undefined"')
        page.evaluate('g.coins=777;save()')
        page.unroute_all()
        page.locator('#loadingSkip').click(); ready(page)
        assert page.evaluate('g.coins===777')
        for bootstrap in ['src/ui/helper-rewards.js', 'src/environment-entry.js']:
            page.route('**/' + bootstrap, lambda route: route.fulfill(status=404, body='missing'))
            page.reload(wait_until='domcontentloaded')
            page.wait_for_function('document.getElementById("loadingSkip").textContent==="Retry"')
            assert page.locator('#bakeryLoading').is_visible()
            page.unroute_all()
            page.locator('#loadingSkip').click(); ready(page)
            assert page.evaluate('g.coins===777')

        # A missing bootstrap manifest has its own working recovery state.
        page.route('**/src/bakery-assets.js', lambda route: route.fulfill(status=404, body='missing'))
        page.reload(wait_until='domcontentloaded')
        page.wait_for_function('document.getElementById("loadingSkip").textContent==="Retry"')
        assert page.locator('#bakeryLoading').is_visible()
        page.unroute_all()
        page.locator('#loadingSkip').click(); ready(page)
        assert page.evaluate('g.coins===777')
        result = {'passed':True, 'cold':cold, 'cached':cached, 'safeSkip':True, 'retry':True, 'bootstrapFailure':True, 'rapidNavigation':True, 'normalRuntimeErrors':errors}
        (OUT / f'{engine}-results.json').write_text(json.dumps(result, indent=2))
        print(f'PASS {engine}: required gating, actual progress, optional Skip, frame/manifest retry, preserved save, cold/cached startup, collection and rapid navigation', flush=True)
    finally:
        browser.close()

try:
    with sync_playwright() as pw:
        for engine in sys.argv[1:] or ['edge', 'webkit']: check(pw, engine)
finally:
    server.shutdown()
