"""Real WebKit/Edge checks. Uses a temporary profile and a loopback static server.
Install Python Playwright (or use the project's ignored .test-tools), then run this file.
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


server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
SHOTS = ROOT / 'docs' / 'previews' / 'tablet-ux' / 'after'
SHOTS.mkdir(parents=True, exist_ok=True)


def check_browser(pw, engine):
    browser = pw.webkit.launch() if engine == 'webkit' else pw.chromium.launch(channel='msedge')
    context = browser.new_context(viewport={'width': 2000, 'height': 1200}, has_touch=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
        page.wait_for_function("typeof startTicket==='function'")
        page.evaluate('document.fonts.ready')
        assert page.evaluate('g.menuSlots') == 1
        assert page.locator('.leftcol').is_visible()
        assert page.locator('.rightcol').is_visible()
        assert page.locator('.food-card-target').count() == 1
        assert page.locator('.topbar,.menu-heading,.boost-hero,.coin-balance').count() == 0
        assert page.locator('.collection-stage>.menu-header').count() == 1
        assert page.locator('.menu-tabs,.kitchen-tab,[onclick*="Kitchen"],[onclick*="Equipment"]').count() == 0
        assert page.evaluate("typeof KITCHEN==='undefined' && typeof kitchenBonus==='undefined' && typeof upgradeEquipment==='undefined'")
        # Exercise an old save with purchased tools and an unfinished order.
        page.evaluate("""g.coins=123456;g.completed=6;refillBoard();startTicket(g.board[0].id);
            g.run.pool=123;abandonTicket();g.equipment={oven:20,mixer:20,fridge:20,display:20};
            g.kitchenSpent=98765;g.seenUnlocks=['kitchen','fusion'];
            window.legacyOrder=JSON.stringify(g.run);save();""")
        order_progress = 'JSON.stringify([g.run.ticket,g.run.budget,g.run.pool,g.run.worksheetRewards])'
        legacy_order = page.evaluate(order_progress)
        page.reload();page.wait_for_function("typeof startTicket==='function'")
        assert page.evaluate('g.coins') == 123456
        assert page.evaluate(order_progress) == legacy_order
        assert page.evaluate("!('equipment' in g)&&!('kitchenSpent' in g)&&!g.seenUnlocks.includes('kitchen')")
        assert page.evaluate('Math.abs(bakeryValue()-Math.max(1,foodSum())*decorBonus())<1e-10')
        page.evaluate('g=fresh();save();render()')
        page.screenshot(path=str(SHOTS / f'{engine}-fresh-2000.png'), full_page=True)
        page.evaluate("""g.coins=1e7;g.completed=16;
            for(const f of FOOD)if(f.id!=='pandesal')discoverFood(f);
            g.recipeCeilings.pandesal=10;g.menuSlots=6;g.bakeryLevel=21;
            g.board=[{id:9001,a:79,b:18,rarity:1,base:304},{id:9002,a:19,b:9,rarity:0,base:130}];
            g.ticketSeq=9002;save();render()""")
        page.locator('[data-uid="1"] .food-card-target').tap()
        assert page.locator('.food-selection-single').is_visible()
        page.wait_for_timeout(500)
        page.screenshot(path=str(SHOTS / f'{engine}-collection-2000.png'), full_page=True)
        page.evaluate('closeFoodPanel()')
        card = page.locator('[data-uid="1"] .food-card-target')
        card.scroll_into_view_if_needed()
        box = card.bounding_box()
        page.mouse.move(box['x']+box['width']/2, box['y']+box['height']/2)
        page.mouse.down()
        page.wait_for_timeout(560)
        page.mouse.up()
        assert page.evaluate('multiSelect && selectedFoods.has(1)')
        page.locator('[data-uid="2"] .food-card-target').tap()
        assert page.evaluate('selectedFoods.size') == 2
        assert page.get_by_role('button', name='Equip (1)', exact=True).is_visible()
        assert page.get_by_role('button', name='Unequip (1)', exact=True).is_visible()
        page.evaluate('closeFoodPanel()')
        # Exercise the real purchase/Undo and mastery confirmation controls.
        old_coins,old_power = page.evaluate('[g.coins,g.bakeryLevel]')
        page.locator('.bakery-power-buy').tap()
        assert page.evaluate('g.bakeryLevel') == old_power+1
        assert page.locator('.bakery-row.current').get_attribute('data-upgrade') == str(old_power+1)
        page.locator('#purchaseUndo button').tap()
        assert page.evaluate('[g.coins,g.bakeryLevel]') == [old_coins,old_power]
        page.locator('.collection-toolbar>button').first.tap()
        assert page.locator('#purchaseUndo').is_visible()
        page.reload()
        page.wait_for_function("typeof undoPurchase==='function'")
        page.locator('#purchaseUndo button').tap()
        assert page.evaluate('g.menuSlots') == 6
        page.evaluate('openFoodItem(1)')
        quoted = page.evaluate('foodLevelPrice(g.owned[0])')
        coins = page.evaluate('g.coins')
        page.locator('.food-panel-actions .primary').tap()
        page.locator('.modal .primary').tap()
        assert page.evaluate('recipeMastery(g.owned[0])') == 1
        assert page.evaluate('g.coins') == coins-quoted
        page.locator('#purchaseUndo button').tap()
        assert page.evaluate('recipeMastery(g.owned[0])') == 0
        page.evaluate('closeFoodPanel()')
        page.evaluate('openPackages("buy",0)')
        assert page.locator('.package-type-list>button').count() == 8
        page.screenshot(path=str(SHOTS / f'{engine}-packages.png'), full_page=True)
        coins,stock = page.evaluate('[g.coins,g.packages[0]]')
        price = page.evaluate('packagePrice(0)*3')
        page.evaluate('setPackageQuantity(3)')
        page.locator('#packageBuy').tap()
        assert page.evaluate('g.coins') == coins-price
        assert page.evaluate('g.packages[0]') == stock+3
        assert page.locator('#unopenedPackages').inner_text() == page.evaluate('amountLabel(g.packages.reduce((a,b)=>a+b,0))')
        page.evaluate('setPackageQuantity(3)')
        count = page.evaluate('g.owned.length')
        for _ in range(3):
            page.locator('.package-opening-grid button').first.tap()
        assert page.evaluate('g.owned.length') == count
        assert page.evaluate('new Set(g.owned.map(o=>o.id)).size===g.owned.length')
        assert page.evaluate('g.packages[0]') == stock
        assert page.locator('#unopenedPackages').inner_text() == page.evaluate('amountLabel(g.packages.reduce((a,b)=>a+b,0))')
        page.evaluate('closeModal()')
        for width,height in [(2000,1200),(1194,834),(1024,768),(834,1194),(768,1024)]:
            page.set_viewport_size({'width':width,'height':height})
            page.evaluate('scrollTo(0,0);render()')
            page.wait_for_timeout(180)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
            assert page.locator('.menu-tabs,.kitchen-tab').count() == 0
            assert page.evaluate('''()=>{
                const heading=document.querySelector('.menu-header').getBoundingClientRect();
                const toolbar=document.querySelector('.collection-toolbar').getBoundingClientRect();
                const grid=document.querySelector('.menu-grid').getBoundingClientRect();
                return Math.abs(toolbar.top-heading.bottom)<=1 && Math.abs(grid.top-toolbar.bottom)<=1;
            }''')
            assert page.locator('.menu-header').evaluate('''e=>{
                const controls=[...e.querySelectorAll('button')];
                const brand=e.querySelector('.menu-brand').getBoundingClientRect();
                const name=e.querySelector('h1').getBoundingClientRect();
                const icon=e.querySelector('.menu-bakery-icon').getBoundingClientRect();
                const settings=e.querySelector('.menu-settings').getBoundingClientRect();
                const boost=e.querySelector('.boost-counter').getBoundingClientRect();
                const coins=e.querySelector('.coins-counter').getBoundingClientRect();
                return controls.every(b=>{const r=b.getBoundingClientRect(),p=e.getBoundingClientRect();
                    return r.width>=44&&r.height>=44&&r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom;
                }) && e.scrollWidth<=e.clientWidth && icon.right<=name.left && name.right<settings.left
                && settings.left-name.right>name.left-icon.right && boost.right<coins.left
                && Math.abs(coins.right-(e.getBoundingClientRect().right-parseFloat(getComputedStyle(e).paddingRight)))<=1
                && Math.abs(brand.left-(e.getBoundingClientRect().left+parseFloat(getComputedStyle(e).paddingLeft)))<=1;
            }''')
            page.locator('.boost-counter').tap()
            assert page.locator('#modalTitle').inner_text() == "Baker's Boost 💎"
            assert page.locator('#menuBoostComponent').inner_text() == page.evaluate("boostComponentLabel(Math.max(1,foodSum()))")
            assert page.locator('#bakeryPowerComponent').inner_text() == page.evaluate("boostComponentLabel(decorBonus())")
            assert page.locator('.hud-info-modal button').count() == 1
            assert not page.locator('.hud-info-modal .dialog-wallet').is_visible()
            page.locator('.modal .close').tap()
            page.locator('.coins-counter').tap()
            assert page.locator('#modalTitle').inner_text() == 'Coins 🪙'
            assert page.locator('.coins-help p').all_text_contents() == ['Complete orders to earn coins!',"Your Baker's Boost multiplies the coins you earn."]
            assert page.locator('.hud-info-modal button').count() == 1
            page.locator('.modal .close').tap()
            if width<1500:
                assert page.locator('.odds-heading [aria-expanded=false]').count()==1
            page.screenshot(path=str(SHOTS / f'{engine}-collection-{width}.png'), full_page=True)
            page.locator('[data-uid="1"] .food-card-target').tap()
            page.evaluate("scrollTo(0,Math.max(0,document.querySelector('.collection-stage').getBoundingClientRect().bottom+scrollY-innerHeight+12))")
            assert page.locator('.food-panel-actions').evaluate('''e=>[...e.querySelectorAll('button')].every(b=>{const r=b.getBoundingClientRect(),p=e.closest('.collection-stage').getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom+1&&r.top>=0&&r.bottom<=innerHeight&&b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})''')
            page.screenshot(path=str(SHOTS / f'{engine}-details-{width}.png'),full_page=True)
            page.locator('.food-panel-close').tap()
            assert page.evaluate('document.activeElement.closest("[data-uid]")?.dataset.uid')=='1'
            page.evaluate('scrollTo(0,0)')
        page.locator('[aria-label="Settings"]').click();page.keyboard.press('Escape')
        assert page.evaluate('document.activeElement.getAttribute("aria-label")')=='Settings'
        page.locator('.package-panel .primary').click();page.keyboard.press('Escape')
        assert page.evaluate('document.activeElement.matches(".package-panel .primary")')
        page.evaluate("g.packages[0]=0;g.packages[1]=3;openPackages('unbox',0)")
        assert page.evaluate('packageType')==0
        assert page.locator('#packageOpenAll').is_disabled()
        page.locator('[data-package-type="1"]').tap()
        assert page.locator('#packageOpenAll').is_enabled()
        page.wait_for_timeout(250)
        page.screenshot(path=str(SHOTS / f'{engine}-available-unbox.png'),full_page=True)
        page.evaluate("openPackages('buy',0)")
        page.locator('.package-type-list .locked').first.tap()
        assert page.locator('#packageBuy').is_disabled()
        assert 'NEEDS HIGHER' in page.locator('.package-type-list .locked').first.inner_text()
        page.evaluate('closeModal()')
        page.set_viewport_size({'width':1194,'height':834})
        page.evaluate("window.bridgeDebug=[];window.addEventListener('message',e=>bridgeDebug.push({type:e.data?.type,source:e.data?.source,same:e.source===$('worksheetFrame')?.contentWindow}))")
        page.evaluate('g.sound=true;g.tutorialArrows=true;Math.random=()=>.999;startTicket(9001)')
        page.wait_for_function("document.getElementById('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===9001")
        frame = page.frame_locator('#worksheetFrame')
        cdp = context.new_cdp_session(page) if engine=='edge' else None
        page.evaluate("$('worksheetFrame').contentWindow.eval(\"document.addEventListener('click',e=>{if(e.pointerType==='touch')e.stopImmediatePropagation()},true)\")")

        def state(expression):
            return page.evaluate("$('worksheetFrame').contentWindow.eval(" + json.dumps(expression) + ')')

        def wait(expression):
            page.wait_for_function("()=>{try{return $('worksheetFrame')?.contentWindow?.__ACTIVE_WORKSHEET_TICKET && $('worksheetFrame').contentWindow.eval(" + json.dumps(expression) + ')}catch(_){return false}}')

        def tap(selector):
            frame.locator(selector).tap()
            page.wait_for_timeout(70)

        def drag(source, target, touch=False):
            # Native mouse drags exercise real hit testing and pointer capture.
            # WebKit's touchscreen API provides native taps, not touch move; the
            # touch path below separately tests pointerType=touch dispatch.
            frame.locator(source).evaluate("el=>el.scrollIntoView({block:'nearest'})")
            page.wait_for_timeout(80)
            a, b = frame.locator(source).bounding_box(), frame.locator(target).bounding_box()
            ax, ay = a['x']+a['width']/2, a['y']+a['height']/2
            bx, by = b['x']+b['width']/2, b['y']+b['height']/2
            if touch and cdp:
                cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':ax,'y':ay,'id':1}]})
                for n in range(1,8):
                    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':ax+(bx-ax)*n/7,'y':ay+(by-ay)*n/7,'id':1}]})
                cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            elif touch:
                page.evaluate("""([source,target])=>{
                  const w=$('worksheetFrame').contentWindow,d=w.document,a=d.querySelector(source),b=d.querySelector(target);
                  const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
                  const x=ar.left+ar.width/2,y=ar.top+ar.height/2,tx=br.left+br.width/2,ty=br.top+br.height/2;
                  a.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:77,pointerType:'touch',clientX:x,clientY:y}));
                  w.dispatchEvent(new w.PointerEvent('pointermove',{bubbles:true,cancelable:true,pointerId:77,pointerType:'touch',clientX:tx,clientY:ty}));
                  w.dispatchEvent(new w.PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerId:77,pointerType:'touch',clientX:tx,clientY:ty}));
                }""", [source,target])
            else:
                page.mouse.move(ax,ay)
                page.mouse.down()
                page.mouse.move(bx,by,steps=7)
                page.mouse.up()
            page.wait_for_timeout(80)

        tap('[data-bottom="0"]')
        tap('[data-top="0"]')
        tap('#equationReveal')
        assert frame.locator('#guidePrompt').evaluate("e=>getComputedStyle(e).clipPath==='none'&&e.textContent.length>0")
        before_error=frame.locator('#math').bounding_box()
        prize_before=page.locator('#prizejar').bounding_box()
        tap('[data-part="ones"]');tap('[data-slot="0:1"]')
        page.wait_for_timeout(160)
        assert frame.locator('#status').evaluate("e=>e.classList.contains('error')")
        after_error=frame.locator('#math').bounding_box()
        assert abs(before_error['y']-after_error['y'])<1
        assert abs(page.locator('#prizejar').bounding_box()['y']-prize_before['y'])<1
        page.screenshot(path=str(SHOTS / f'{engine}-worksheet-error.png'),full_page=True)
        drag('[data-part="ones"]','[data-slot="0:0"]')
        wait('!busy && s.onesPlaced')
        state('bridgePoll()')
        page.wait_for_function('Object.keys(g.run.worksheetRewards.actions).length>=3')
        # Switching to another order then reloading must restore the exact state.
        snapshot = state('JSON.stringify(s)')
        attempt = page.evaluate('g.run.worksheetRewards.attemptId')
        pool = page.evaluate('g.run.pool')
        page.evaluate('abandonTicket();startTicket(9002)')
        page.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===9002")
        tap('[data-bottom="0"]')
        page.evaluate('abandonTicket();startTicket(9001)')
        wait('s.onesPlaced')
        assert state('JSON.stringify(s)') == snapshot
        assert page.evaluate('g.run.worksheetRewards.attemptId') == attempt
        assert page.evaluate('g.run.pool') == pool
        state("window.inputLog=[];for(const type of ['pointerdown','pointerup','pointercancel','click'])document.addEventListener(type,e=>{inputLog.push({type,target:e.target.id||e.target.dataset.part||e.target.dataset.top||e.target.dataset.bottom||e.target.className,ignoreClick,busy});if(inputLog.length>32)inputLog.shift()},true)")
        page.reload()
        page.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===9001")
        wait('s.onesPlaced')
        assert state('JSON.stringify(s)') == snapshot
        assert page.evaluate('g.run.pool') == pool
        # Sound/tutorial ON, carry lift after temporary placement.
        state("window.inputLog=[];for(const type of ['pointerdown','pointerup','pointercancel','click'])document.addEventListener(type,e=>{inputLog.push({type,target:e.target.id||e.target.dataset.part||e.target.dataset.top||e.target.dataset.bottom||e.target.className,ignoreClick,busy});if(inputLog.length>32)inputLog.shift()},true)")
        drag('[data-part="tens"]','[data-slot="0:1"]',touch=True)
        wait('!busy && s.tensPlaced')
        tap('[data-slot="0:1"]')
        wait('!busy && s.k===1')
        page.evaluate('toggleArrows();toggleSfx()')
        wait('!tutorial && !sound')
        drag('[data-bottom="0"]','[data-top="1"]')
        tap('#equationReveal')
        drag('[data-carry="1"]','[data-part="ones"]',touch=True)
        wait('!busy && s.mixed')
        tap('[data-part="tens"]')
        tap('[data-slot="0:2"]')
        wait('!busy && s.tensPlaced')
        drag('[data-part="ones"]','[data-slot="0:1"]')
        wait("!busy && s.row===1 && s.phase==='select'")
        for col in [0,1]:
            drag('[data-bottom="1"]',f'[data-top="{col}"]',touch=col==1)
            tap('#equationReveal')
            drag('[data-part="ones"]',f'[data-slot="1:{col+1}"]')
            wait('!busy && s.k===1' if col==0 else "!busy && s.phase==='sum'")
        assert state('s.rows') == [{'0':2,'1':3,'2':6},{'0':0,'1':9,'2':7}]
        assert frame.locator('#additionSwipeGuide .drop-guide').count() == 0
        # Real pointer swipe over the math surface, with a broken animation API.
        page.evaluate("$('worksheetFrame').contentWindow.eval('Element.prototype.animate=function(){throw Error(\"no animation\")};Array.prototype.findLastIndex=undefined')")
        page.evaluate("window.droppedCompletion=0;window.removeEventListener('message',handleWorksheetMessage);window.addEventListener('message',e=>{if((e.data?.type==='complete'||e.data?.complete===true)&&droppedCompletion<2){droppedCompletion++;return}handleWorksheetMessage(e)})")
        a = frame.locator('[data-slot="0:0"]').bounding_box()
        x,y = a['x']+a['width']/2,a['y']+a['height']/2
        page.mouse.move(x,y);page.mouse.down();page.mouse.move(x,y+75,steps=7);page.mouse.up()
        page.wait_for_function("g.run?.phase==='claim'")
        budget = page.evaluate('g.run.budget')
        assert page.evaluate('g.run.pool') == budget
        assert page.evaluate('droppedCompletion') == 2
        page.locator('#collectRewards').scroll_into_view_if_needed()
        assert page.locator('#collectRewards').is_visible()
        page.screenshot(path=str(SHOTS / f'{engine}-claim.png'), full_page=True)
        page.reload()
        page.wait_for_function("g.run?.phase==='claim'")
        before = page.evaluate('g.coins')
        page.locator('#collectRewards').tap()
        assert page.evaluate('g.coins') == before+budget
        page.evaluate('prizeItems();closeModal();startTicket(9001)')
        assert page.evaluate('g.run===null')
        assert page.evaluate('g.coins') == before+budget
        assert page.evaluate('!!g.orderRuns[9002]')
        # Add Rows shares the verified addition path, with no forced resume of the other order.
        page.evaluate("g.board.unshift({id:9003,a:12,b:12,rarity:0,base:190});g.ticketSeq=9003;g.tutorialArrows=true;startTicket(9003)")
        page.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===9003")
        for width,height in [(2000,1200),(1194,834),(1024,768),(834,1194),(768,1024)]:
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(180)
            assert page.locator('#prizejar').evaluate('e=>e.getBoundingClientRect().bottom<=innerHeight+2')
            page.screenshot(path=str(SHOTS / f'{engine}-worksheet-{width}.png'),full_page=True)
        page.set_viewport_size({'width':1024,'height':768});page.emulate_media(reduced_motion='reduce')
        for row in [0,1]:
            for col in [0,1]:
                tap(f'[data-bottom="{row}"]');tap(f'[data-top="{col}"]');tap('#equationReveal')
                tap('[data-part="ones"]');tap(f'[data-slot="{row}:{row+col}"]')
        wait("s.phase==='sum'")
        assert frame.locator('#addRows').is_visible()
        page.screenshot(path=str(SHOTS / f'{engine}-add-rows.png'),full_page=True)
        tap('#addRows');page.wait_for_function("g.run?.phase==='claim'")
        assert page.evaluate('g.run.ticket.a*g.run.ticket.b')==144
        page.locator('#collectRewards').tap()
        assert page.evaluate('g.claimedOrders[9003]!==undefined')
        assert page.evaluate('!!g.orderRuns[9002]')
        assert errors == [], errors
        print(f'PASS {engine}: layout, long-press/mixed selection, purchase/Undo/reload, mastery, package buy/unbox, responsive widths, native touch taps, pointer drags, touch drags ({"native CDP" if cdp else "synthetic pointer"}), carrying 79x18, swipe, order switching/reload, reward claim exactly once',flush=True)
    except Exception:
        page.screenshot(path=str(SHOTS / f'{engine}-failure.png'),full_page=True)
        print('ERRORS', errors,flush=True)
        print('INPUT',page.evaluate("$('worksheetFrame')?.contentWindow?.inputLog"),flush=True)
        print('BRIDGE',page.evaluate("({debug:window.bridgeDebug,url:$('worksheetFrame')?.src,attempt:$('worksheetFrame')?.worksheetAttemptId,childType:typeof $('worksheetFrame')?.contentWindow?.getWorksheetSession})"),flush=True)
        print('STATE',page.evaluate("({phase:g.run?.phase,child:$('worksheetFrame')?.contentWindow?.__ACTIVE_WORKSHEET_TICKET,pool:g.run?.pool})"),flush=True)
        raise
    finally:
        context.close();browser.close()


try:
    with sync_playwright() as pw:
        for engine in (sys.argv[1:] or ['webkit','edge']):
            check_browser(pw,engine)
finally:
    server.shutdown();server.server_close()
