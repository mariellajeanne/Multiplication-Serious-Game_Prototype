"""Phase 1 scene screenshots, viewport checks, and preserved-game isolation.

Run: python tests/browser-environment.py
Uses the same local Playwright installation as the existing browser runners.
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
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', str(ROOT / '.test-tools' / 'browsers'))
from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def check(pw, engine, port):
    browser = pw.webkit.launch() if engine == 'webkit' else pw.chromium.launch(channel='msedge')
    context = browser.new_context(has_touch=True)
    page = context.new_page()
    errors, gameplay_requests = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: gameplay_requests.append(request.url)
            if '/src/game/' in request.url or '/src/main.js' in request.url else None)
    shots = ROOT / 'output/playwright/environment'
    shots.mkdir(parents=True, exist_ok=True)
    base = f'http://127.0.0.1:{port}/index.html?view=environment'
    try:
        page.goto(base)
        # Deliberately opaque: the scene must not parse, migrate or overwrite it.
        page.evaluate("localStorage.setItem('panaderyaQuestV2', 'phase-one-save-sentinel')")
        page.reload()
        for width, height in [(2000, 1200), (1194, 834), (1024, 768)]:
            page.set_viewport_size({'width': width, 'height': height})
            page.wait_for_function("[...document.querySelectorAll('#bakeryEnvironment img')].every(i=>i.complete && i.naturalWidth>0)")
            bounds = page.evaluate("""()=>{
                const box=s=>{const r=document.querySelector(s).getBoundingClientRect();
                    return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
                return {scene:box('#bakeryEnvironment'),wall:box('.environment-architecture'),
                    counter:box('.environment-counter'),register:box('.environment-register'),
                    width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight};
            }""")
            assert bounds['width'] == width and bounds['height'] == height, bounds
            assert bounds['scene']['x'] == 0 and bounds['scene']['y'] == 0
            assert bounds['scene']['right'] == width and bounds['scene']['bottom'] == height
            assert abs(bounds['wall']['bottom'] - bounds['counter']['y']) < 1
            assert abs(bounds['counter']['height'] / height - .20) < .001
            assert bounds['register']['x'] > width * .76 and bounds['register']['right'] < width
            assert page.locator('#app').is_hidden() and page.locator('#modals').is_hidden()
            assert page.locator('#notificationDock').is_hidden()
            assert page.locator('button:visible, iframe:visible, input:visible').count() == 0
            assert page.evaluate("typeof g==='undefined' && typeof render==='undefined'")
            assert page.locator('.environment-architecture img').evaluate(
                "i=>i.currentSrc.includes('tablet')") == (width / height <= 1.5)
            assert page.evaluate("localStorage.getItem('panaderyaQuestV2')") == 'phase-one-save-sentinel'
            page.screenshot(path=str(shots / f'{engine}-{width}x{height}.png'))
            print(engine, width, height, json.dumps(bounds), flush=True)
        # Lifecycle events were previously hooked to save(). They must stay isolated.
        page.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide')); document.dispatchEvent(new Event('visibilitychange'))")
        page.goto('about:blank')
        page.goto(base)
        assert page.evaluate("localStorage.getItem('panaderyaQuestV2')") == 'phase-one-save-sentinel'
        assert gameplay_requests == [], gameplay_requests

        # Test the preserved game in a separate context with a real fresh save.
        legacy = context.new_page()
        legacy.on('pageerror', lambda error: errors.append(str(error)))
        legacy.goto(base)
        legacy.evaluate('localStorage.clear()')
        legacy.goto(base.replace('?view=environment','?view=legacy'))
        legacy.wait_for_selector('.menu-grid')
        assert legacy.locator('#bakeryEnvironment').is_hidden()
        assert legacy.locator('.ticket').count() > 0
        legacy.evaluate('g.coins=4321;save()')
        legacy.reload()
        legacy.wait_for_selector('.menu-grid')
        assert legacy.evaluate('g.coins') == 4321
        assert errors == [], errors
        print('PASS environment and preserved-game entry', engine, flush=True)
    finally:
        context.close()
        browser.close()


if __name__ == '__main__':
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0),
        functools.partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            for engine in ['webkit', 'edge']:
                check(pw, engine, server.server_port)
    finally:
        server.shutdown()
