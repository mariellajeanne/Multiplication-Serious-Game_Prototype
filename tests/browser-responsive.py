"""Viewport, browser-zoom and independent scrolling checks in WebKit and Edge."""
import functools
import base64
import http.server
import json
import os
from pathlib import Path
import sys
import tempfile
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
shots = ROOT / '.test-tools' / 'responsive-shots'
shots.mkdir(parents=True, exist_ok=True)


def check(pw, engine):
    browser = pw.webkit.launch() if engine == 'webkit' else pw.chromium.launch(channel='msedge')
    page = browser.new_page(has_touch=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
        page.wait_for_function("typeof render==='function'")
        page.evaluate("""g.coins=999999;g.completed=40;g.bakeryLevel=14;g.menuSlots=6;
            for(const food of FOOD)if(!g.owned.some(o=>o.id===food.id))discoverFood(food);render()""")
        # Zoom changes the CSS viewport. These extra sizes correspond to a
        # 1194x834 window at 80%, 125%, 150% and 200% browser zoom.
        sizes = [(2000,1200),(1194,834),(1024,768),(960,768),(834,1194),(768,1024),(390,844),
                 (1493,1043),(955,667),(796,556),(597,417),(2560,1440)]
        for width,height in sizes:
            page.set_viewport_size({'width':width,'height':height})
            page.evaluate('render()')
            page.wait_for_timeout(100)
            measurements = page.evaluate("""()=>{
                const rect=s=>document.querySelector(s).getBoundingClientRect();
                const layout=rect('.layout'),menu=rect('.collection-stage'),right=rect('.rightcol');
                const controls=[...document.querySelectorAll('.collection-toolbar>*')].map(e=>({r:e.getBoundingClientRect(),overflow:e.scrollWidth>e.clientWidth+1}));
                const header=document.querySelector('.menu-header');
                const name=header.querySelector('h1'),boost=header.querySelector('.boost-counter');
                return {bodyWidth:document.documentElement.scrollWidth,bodyHeight:document.documentElement.scrollHeight,
                    layout:{x:layout.x,y:layout.y,right:layout.right,bottom:layout.bottom},
                    menu:{bottom:menu.bottom,height:menu.height},right:{bottom:right.bottom},
                    headerOverflow:header.scrollWidth>header.clientWidth+1,
                    headerRows:Math.abs(name.getBoundingClientRect().y+name.getBoundingClientRect().height/2-boost.getBoundingClientRect().y-boost.getBoundingClientRect().height/2)>2,
                    nameOverflow:name.scrollWidth>name.clientWidth+1,
                    toolbarRows:new Set(controls.map(x=>Math.round(x.r.y))).size,
                    badControl:controls.some(x=>x.r.height<44||x.overflow),
                    cardWidth:rect('.food-tile').width};
            }""")
            print(engine,width,height,measurements,flush=True)
            assert measurements['bodyWidth'] <= width+1
            assert measurements['bodyHeight'] <= height+1
            assert measurements['layout']['x'] == 0
            assert abs(measurements['layout']['right']-width) <= 1
            assert abs(measurements['layout']['bottom']-height) <= 1
            assert not measurements['headerOverflow'] and not measurements['nameOverflow']
            assert page.evaluate('''()=>{
                const boost=document.querySelector('#bakerBoost'),coins=document.querySelector('#walletCoins');
                const texts=[boost.textContent,coins.textContent];boost.textContent='×9999.99';coins.textContent='999,999';
                const name=document.querySelector('.menu-brand h1'),header=document.querySelector('.menu-header');
                const result=name.scrollWidth<=name.clientWidth+1&&header.scrollWidth<=header.clientWidth+1;
                boost.textContent=texts[0];coins.textContent=texts[1];return result;
            }'''), 'long counters displace the bakery name'
            assert not measurements['badControl']
            assert 140 <= measurements['cardWidth'] <= 260
            if width >= 960:
                assert not measurements['headerRows'], 'landscape header wraps'
                assert measurements['toolbarRows'] == 1, 'landscape toolbar wraps'
                assert abs(measurements['menu']['bottom']-(height-10)) <= 1
                assert abs(measurements['right']['bottom']-(height-10)) <= 1
            # Force enough content to prove that each scroll region moves
            # independently, without scrolling the document or another panel.
            assert page.evaluate('''()=>{
                const grid=document.querySelector('.menu-grid'),tickets=document.querySelector('.tickets');
                const copies=[];for(let i=0;i<24;i++){const card=grid.firstElementChild.cloneNode(true);grid.append(card);copies.push(card)}
                grid.scrollTop=200;const scrolled=grid.scrollTop>0;
                grid.scrollTop=0;copies.forEach(card=>card.remove());
                const extra=[];for(let i=0;i<10;i++){const ticket=tickets.firstElementChild.cloneNode(true);tickets.append(ticket);extra.push(ticket)}
                tickets.scrollTop=40;const independent=tickets.scrollTop>0&&grid.scrollTop===0&&scrollY===0;
                tickets.scrollTop=0;extra.forEach(ticket=>ticket.remove());return scrolled&&independent;
            }''')
            page.screenshot(path=str(shots / f'{engine}-{width}.png'))
            page.locator('.boost-counter').click()
            box=page.locator('.modal').bounding_box()
            assert box['y']>=0 and box['y']+box['height']<=height+1
            page.locator('.modal .close').click()
            page.locator('[data-uid="1"] .food-card-target').click()
            assert page.locator('.food-panel-close').is_visible()
            assert page.locator('.food-panel-actions').evaluate('e=>e.getBoundingClientRect().bottom<=innerHeight+1')
            page.locator('.food-panel-close').click()
            assert page.evaluate('scrollY===0')
        assert errors == [], errors
        print('PASS responsive',engine,flush=True)
    finally:
        browser.close()


def check_browser_zoom(pw):
    # A temporary extension calls the browser's actual per-tab zoom API in an
    # isolated profile. Pinch/page-scale emulation does not exercise CSS reflow.
    with tempfile.TemporaryDirectory(prefix='panaderya-viewport-') as folder:
        base=Path(folder).resolve()
        extension=base/'extension'
        extension.mkdir()
        (extension/'manifest.json').write_text(json.dumps({
            'manifest_version':3,'name':'Viewport zoom check','version':'1.0',
            'permissions':['tabs'],'background':{'service_worker':'background.js'}}))
        (extension/'background.js').write_text('chrome.runtime.onInstalled.addListener(()=>{});')
        context=pw.chromium.launch_persistent_context(str(base/'profile'),channel='msedge',
            headless=True,no_viewport=True,args=[f'--disable-extensions-except={extension}',
                f'--load-extension={extension}','--window-size=1194,834'])
        try:
            worker=context.service_workers[0] if context.service_workers else context.wait_for_event('serviceworker')
            page=context.new_page()
            cdp=context.new_cdp_session(page)
            page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
            page.wait_for_selector('.menu-header')
            for factor in [1,.8,1.25,1.5,2]:
                actual=worker.evaluate('''async factor=>{
                    const tabs=await chrome.tabs.query({});const tab=tabs.find(t=>t.url.includes('/index.html'));
                    await chrome.tabs.setZoomSettings(tab.id,{mode:'automatic',scope:'per-tab'});
                    await chrome.tabs.setZoom(tab.id,factor);return await chrome.tabs.getZoom(tab.id);
                }''',factor)
                assert abs(actual-factor)<.001
                page.wait_for_timeout(150)
                assert page.evaluate('''()=>{
                    const layout=document.querySelector('.layout').getBoundingClientRect();
                    return Math.abs(layout.width-innerWidth)<=1&&Math.abs(layout.height-innerHeight)<=1
                        &&document.documentElement.scrollWidth<=innerWidth+1
                        &&document.documentElement.scrollHeight<=innerHeight+1;
                }''')
                page.locator('.boost-counter').click()
                box=page.locator('.modal').bounding_box()
                assert box['y']>=0 and box['y']+box['height']<=page.evaluate('innerHeight')+1
                page.locator('.modal .close').click()
                page.evaluate("""if(!g.board.some(t=>t.id===9901))g.board.unshift({id:9901,a:79,b:18,rarity:1,base:304});
                    startTicket(9901)""")
                page.wait_for_function("$('worksheetFrame')?.contentWindow?.__ACTIVE_WORKSHEET_TICKET?.id===9901")
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1')
                page.locator('.worksheet-exit').click()
                assert page.evaluate('g.run.paused')
                assert page.locator('.menu-grid').evaluate('e=>e.clientHeight>0')
                page.evaluate('''window.zoomGridBounds=(()=>{const r=document.querySelector('.menu-grid').getBoundingClientRect();return [r.x,r.y,r.width,r.height]})();
                    openFoodItem(g.owned[0].uid)''')
                for state in ['single','multi']:
                    if state=='multi':
                        page.evaluate('''if(g.owned.length<2)discoverFood(F('monay'));
                            multiSelect=true;selectedFoods=new Set(g.owned.slice(0,2).map(o=>o.uid));paintFoodPanel()''')
                    assert page.locator('.food-selection-popup').evaluate('''e=>{
                        const r=e.getBoundingClientRect(),p=e.closest('.collection-stage').getBoundingClientRect();
                        const grid=document.querySelector('.menu-grid').getBoundingClientRect();
                        window.zoomPopupMetrics={popup:[r.x,r.y,r.width,r.height],menu:[p.x,p.y,p.width,p.height],before:zoomGridBounds,after:[grid.x,grid.y,grid.width,grid.height],buttons:[...e.querySelectorAll('button')].map(b=>{const q=b.getBoundingClientRect();return {w:q.width,h:q.height,cw:b.clientWidth,sw:b.scrollWidth,ch:b.clientHeight,sh:b.scrollHeight}})};
                        return r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom
                            &&JSON.stringify([grid.x,grid.y,grid.width,grid.height])===JSON.stringify(zoomGridBounds)
                            &&[...e.querySelectorAll('button')].every(b=>{const q=b.getBoundingClientRect();return q.width>=43.9&&q.height>=43.9&&parseFloat(getComputedStyle(b).minHeight)>=44&&b.scrollWidth<=b.clientWidth+1&&b.scrollHeight<=b.clientHeight+1});
                    }'''),(state,json.dumps(page.evaluate('zoomPopupMetrics')))
                    capture=cdp.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})
                    (shots/f'edge-zoom-food-{factor}-{state}.png').write_bytes(base64.b64decode(capture['data']))
                page.locator('.food-panel-close').click()
                print('PASS actual Edge browser zoom',factor,page.evaluate('[innerWidth,innerHeight,devicePixelRatio]'),flush=True)
        finally:
            context.close()


try:
    with sync_playwright() as pw:
        for engine in (e for e in (sys.argv[1:] or ['webkit','edge']) if e!='--zoom-only'):
            check(pw,engine)
        if any(e in ['edge','--zoom-only'] for e in (sys.argv[1:] or ['webkit','edge'])):
            check_browser_zoom(pw)
finally:
    server.shutdown()
