"""Production six-task tutorial: real HTTP assets, real worksheet, measured timing.

Run: python tests/browser-six-task-tutorial.py [edge] [webkit]
Optional: TOUR_SIZES=2000x1200,1280x800,960x540 (default: all three).

Verifies, from the rendered page rather than CSS alone:
- intro reading interval (~1.5 s), strips that do not jump, "Let's Go!";
- each checkmark is visibly held (0.8-1.4 s) before focus moves on;
- every guided target is uncovered, hit-testable and the only enabled control;
- the Complete Order popup has its own dimmed backdrop and is never dimmed by
  the guide; Back to Bakery is guided >= 0.5 s after the reward settles;
- the unboxed food and the Boost popup stay bright and uncovered;
- reload/skip recovery without duplicate rewards; no console errors;
- no request for an asset that the Android APK staging excludes.
Screenshots: output/playwright/six-task-tutorial/<engine>-<size>/.
"""
import functools, http.server, json, os, sys, threading, time
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.test-tools'))
from playwright.sync_api import sync_playwright

OUT = ROOT / 'output/playwright/six-task-tutorial'
EXCLUDED = {e['path'] for e in json.loads((ROOT / 'tools/android-asset-optimization-plan.json').read_text())['exclude']}

class Quiet(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.svg': 'image/svg+xml', '.webp': 'image/webp', '.js': 'text/javascript', '.mjs': 'text/javascript'}
    def log_message(self, *a): pass

TRACE_JS = '''()=>{
 if(window.__tourTrace)return;window.__tourTrace=[];window.__nextLog=[];
 // Exact reading-interval timing: accepted Next clicks vs. the button re-enabling.
 addEventListener('click',e=>{const b=e.target.closest?.('[data-tour=next]');if(b&&!b.disabled)__nextLog.push(['click',performance.now()])},true);
 new MutationObserver(m=>{for(const r of m)if(r.target.matches?.('[data-tour=next]')&&!r.target.disabled)__nextLog.push(['enabled',performance.now()])}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['disabled']});
 const shadeDim=()=>{const t=document.getElementById('bakeryGameTour');if(!t)return false;
  return [...t.querySelectorAll('.tour-shade')].some(s=>{const cs=getComputedStyle(s),r=s.getBoundingClientRect();
   const a=cs.backgroundColor.match(/rgba?\\(([^)]+)\\)/);const alpha=a?Number((a[1].split(',')[3]??'1').trim()):0;
   return Number(cs.opacity)>.05&&alpha>.05&&r.width>4&&r.height>4})};
 const popupDimmedByGuide=()=>{const pop=document.querySelector('.worksheet-summary-modal');if(!pop)return false;
  const r=pop.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height*.35;
  const t=document.getElementById('bakeryGameTour');if(!t)return false;
  return [...t.querySelectorAll('.tour-shade')].some(s=>{const q=s.getBoundingClientRect(),cs=getComputedStyle(s);
   const a=cs.backgroundColor.match(/rgba?\\(([^)]+)\\)/);const alpha=a?Number((a[1].split(',')[3]??'1').trim()):0;
   return x>=q.left&&x<=q.right&&y>=q.top&&y<=q.bottom&&Number(cs.opacity)>.05&&alpha>.05})};
 const tick=()=>{const s=window.panaderyaTutorialStatus?.();const t=document.getElementById('bakeryGameTour');
  const next=document.querySelector('[data-tour=next]');
  window.__tourTrace.push({t:performance.now(),phase:s?.phase||null,celebrating:!!s?.celebrating,shown:s?.shownChecked??null,
   checked:s?.checked??null,revealed:s?.revealed??null,next:next?(next.disabled?0:1):null,
   spotlit:!!t?.classList.contains('is-spotlit'),dim:shadeDim(),popupDim:popupDimmedByGuide(),
   summary:document.querySelector('.worksheet-summary')?.dataset.summaryPhase||null,
   proc:!!(typeof g!=='undefined'&&g.run?.procedureComplete),flights:typeof rewardFlightsPending==='function'&&!!rewardFlightsPending(),
   ticks:t?t.querySelectorAll('.tour-paper.is-done').length:0});
  requestAnimationFrame(tick)};
 requestAnimationFrame(tick);
}'''

def frame(p): return p.locator('#worksheetFrame').element_handle().content_frame()
def child(p, code): return frame(p).evaluate(code)
def status(p): return p.evaluate('window.panaderyaTutorialStatus?.()')
def wait_phase(p, phase, timeout=30000): p.wait_for_function('ph=>window.panaderyaTutorialStatus?.()?.phase===ph', arg=phase, timeout=timeout)
def settled(p): p.wait_for_function('!window.panaderyaTutorialStatus?.()?.celebrating')

def card_still(p, ms=240, timeout=4000):
    # Wait for the checklist glide to finish: same rect for `ms` (a real milestone, not a fixed sleep).
    p.wait_for_function('''ms=>{const c=document.querySelector('.tour-checklist');if(!c)return false;const r=c.getBoundingClientRect(),k=[r.left,r.top,r.width,r.height].map(Math.round).join();
     const s=window.__still||(window.__still={k:'',t:0,n:0});if(s.k!==k){s.k=k;s.t=performance.now();s.n=0;return false}
     // The glide is finished only when the rendered rect has reached its destination.
     const atDestination=Math.abs(r.left-parseFloat(c.style.left))<1.5&&Math.abs(r.top-parseFloat(c.style.top))<1.5;
     if(!atDestination){s.n=0;s.t=performance.now();return false}
     s.n++;return s.n>=6&&performance.now()-s.t>=ms}''', arg=ms, timeout=timeout, polling=40)

def rect_overlap(a, b, tol=.5):
    # Area of intersection, ignoring sub-pixel contact from fractional layout.
    w = min(a['right'], b['right']) - max(a['left'], b['left']) - tol
    h = min(a['bottom'], b['bottom']) - max(a['top'], b['top']) - tol
    return max(0, w) * max(0, h)

GUIDE_CHECK = '''sel=>{
 const t=[...document.querySelectorAll(sel)].find(e=>{const r=e.getBoundingClientRect();return r.width>2&&r.height>2});
 if(!t)return {missing:true};
 const r=t.getBoundingClientRect(),card=document.querySelector('.tour-checklist').getBoundingClientRect();
 const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
 const visiblePapers=[...document.querySelectorAll('.tour-paper')].filter(e=>e.getClientRects().length&&getComputedStyle(e).display!=='none');
 const box=x=>({left:x.left,top:x.top,right:x.right,bottom:x.bottom});
 return {target:box(r),card:box(card),hitOk:!!hit&&(hit===t||t.contains(hit)),inView:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,
  current:document.querySelectorAll('.tour-paper.is-current').length,visible:visiblePapers.length,
  done:document.querySelectorAll('.tour-paper.is-done').length,ring:getComputedStyle(document.querySelector('.tour-focus-ring')).display!=='none',
  cardInView:card.left>=-1&&card.top>=-1&&card.right<=innerWidth+1&&card.bottom<=innerHeight+1}
}'''

class Run:
    def __init__(self, p, out, size):
        self.p, self.out, self.size, self.notes = p, out, size, []
    def shot(self, name): self.p.screenshot(path=str(self.out / f'{name}.png'))
    def guided(self, phase, selector, checked):
        p = self.p
        wait_phase(p, phase); settled(p); card_still(p)
        g = p.evaluate(GUIDE_CHECK, selector)
        assert not g.get('missing'), (phase, 'target missing')
        assert g['hitOk'], (phase, 'target not hit-testable', g)
        assert g['inView'] and g['cardInView'], (phase, g)
        assert rect_overlap(g['target'], g['card']) == 0, (phase, 'checklist covers target', g)
        assert g['ring'], (phase, 'no spotlight ring')
        assert g['current'] == 1, (phase, 'exactly one emphasized strip', g)
        assert g['done'] == checked == status(p)['checked'], (phase, g, status(p))
        self.shot(f'{phase}-guided')
        return g
    def tap(self, selector):
        loc = self.p.locator(selector).first
        loc.wait_for(state='visible'); loc.tap()

def solve(run):
    p = run.p
    p.wait_for_function("$('worksheetFrame')?.contentWindow?.__ACTIVE_WORKSHEET_TICKET")
    p.wait_for_timeout(500)
    n = 0
    while child(p, 's.phase') == 'select' and n < 16:
        n += 1
        s = child(p, '({k:s.k,row:s.row})'); f = frame(p)
        f.locator(f'[data-top="{s["k"]}"]').click(); f.locator(f'[data-bottom="{s["row"]}"]').click()
        f.locator('#equationReveal').wait_for(state='visible'); f.locator('#equationReveal').click()
        p.wait_for_timeout(250)
        for root in (p, f):
            if root.locator('[data-golden-option="auto"]').count():
                root.locator('[data-golden-option="auto"]').first.click(); break
        p.wait_for_function("$('worksheetFrame').contentWindow.eval('s.revealed')")
        s = child(p, '({row:s.row,k:s.k,incoming:s.incoming,mixed:s.mixed,last:lastDigit(),tens:tens()})')
        row, k = s['row'], s['k']
        if n == 1: run.shot('worksheet-revealed')
        arrows(p)
        if s['incoming'] and not s['mixed']:
            f.locator(f'[data-carry="{k}"]').click(); f.locator('[data-part="ones"]').click()
            p.wait_for_function("$('worksheetFrame').contentWindow.eval('s.mixed')")
            s['tens'] = child(p, 'tens()')
            run.shot(f'worksheet-carry-{n}')
        for part in ['ones'] + (['tens'] if s['tens'] else []):
            f.locator(f'[data-part="{part}"]').click()
            f.locator(f'[data-slot="{row}:{row+k+(part=="tens")}"]' if part == 'ones' or s['last'] else f'[data-carry="{k+1}"]').click()
            p.wait_for_timeout(380)
            arrows(p)
    if child(p, 's.phase') == 'sum':
        run.shot('worksheet-sum'); frame(p).locator('#addRows').click()
    p.wait_for_function('g.run.procedureComplete===true', timeout=20000)

def arrows(p):
    # One authoritative guide trail inside the sheet; the old shell overlay never returns.
    assert p.locator('#worksheetFullGuide').count() == 0, 'duplicate shell guide layer'
    n = frame(p).locator('.tutorial-stream').count()
    assert n <= 1, ('conflicting guide arrows', n)

def celebrations(trace):
    spans, start = [], None
    for e in trace:
        if e['celebrating'] and start is None: start = e
        elif not e['celebrating'] and start is not None:
            spans.append((start['phase'], e['t'] - start['t'], start['shown'])); start = None
    return spans

def journey(pw, engine, w, h):
    browser = pw.webkit.launch() if engine == 'webkit' else pw.chromium.launch(channel='msedge')
    ctx = browser.new_context(viewport={'width': w, 'height': h}, has_touch=True)
    p = ctx.new_page(); errors, requested = [], set()
    p.on('pageerror', lambda e: errors.append(str(e)))
    p.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    p.on('request', lambda r: requested.add(r.url.split('?')[0]))
    out = OUT / f'{engine}-{w}x{h}'; out.mkdir(parents=True, exist_ok=True)
    run = Run(p, out, (w, h))
    try:
        p.goto(URL); wait_phase(p, 'intro'); p.evaluate(TRACE_JS)
        assert p.evaluate('({s:g.menuSlots,o:g.owned.length})') == {'s': 0, 'o': 0}
        # Rapid taps during the reading interval must not skip ahead.
        for _ in range(5): p.locator('[data-tour=next]').dispatch_event('click')
        assert status(p)['revealed'] == 1
        style = p.evaluate('''()=>{const e=document.querySelector('.tour-paper'),cs=getComputedStyle(e),b=getComputedStyle(document.querySelector('.tour-next'));
         return {bg:cs.backgroundColor,border:cs.borderTopColor,bw:parseFloat(cs.borderTopWidth),color:cs.color,next:b.backgroundColor}}''')
        assert style['bg'] == 'rgb(255, 250, 240)' and 1 <= style['bw'] <= 2, style
        run.shot('intro-1')
        for i in range(6):
            p.wait_for_function('!document.querySelector("[data-tour=next]").disabled')
            before = p.evaluate('[...document.querySelectorAll(".tour-paper")].map(e=>e.getBoundingClientRect().top)')
            label = p.locator('[data-tour=next] b').inner_text()
            assert label == ("Let's Go!" if i == 5 else 'Next'), (i, label)
            if i == 2: run.shot('intro-3-ready')
            p.locator('[data-tour=next]').tap()
            if i < 5:
                p.wait_for_timeout(600)
                after = p.evaluate('[...document.querySelectorAll(".tour-paper")].map(e=>e.getBoundingClientRect().top)')
                assert len(after) == len(before) + 1 and all(abs(a - b) < 1.5 for a, b in zip(before, after)), ('intro strips moved', before, after)
                boxes = p.evaluate('[...document.querySelectorAll(".tour-task-checkbox")].map(e=>Math.round(e.getBoundingClientRect().right))')
                assert len(set(boxes)) == 1, ('checkboxes misaligned', boxes)
                if i == 1: run.shot('intro-3-strips')
        # Reading interval: from each accepted Next tap until Next is enabled again.
        log, waits, clicked = p.evaluate('window.__nextLog'), [], None
        for kind, t in log:
            if kind == 'click': clicked = t
            elif clicked is not None: waits.append(t - clicked); clicked = None
        assert len(waits) >= 5 and all(1480 <= x <= 1700 for x in waits), ('reading interval', waits)
        run.notes.append(f'reading interval ms {[round(x) for x in waits]}')

        run.guided('nav-orders', '[data-world-nav="orders"]', 0)
        # An unrelated control is inert while a different target is guided.
        p.locator('#settings-button').first.dispatch_event('click') if p.locator('#settings-button').count() else None
        p.mouse.click(w * 0.5, h * 0.35)
        assert p.evaluate('!modal') and status(p)['phase'] == 'nav-orders'
        run.tap('[data-world-nav="orders"]')
        run.guided('ticket', '.scene-ticket:not(:disabled),.hub-ticket:not(:disabled)', 0)
        run.tap('.scene-ticket:not(:disabled),.hub-ticket:not(:disabled)')
        wait_phase(p, 'worksheet')
        assert not p.evaluate('window.__tourTrace.at(-1).dim'), 'worksheet must be undimmed'
        solve(run)
        g = run.guided('complete', '#collectRewards', 0)
        trace = p.evaluate('window.__tourTrace')
        done_at = next(e['t'] for e in trace if e['proc'])
        dim_at = next(e['t'] for e in trace if e['proc'] and e['dim'])
        assert not any(e['dim'] and e['flights'] for e in trace if e['proc']), 'guide dimmed a reward coin in flight'
        assert dim_at - done_at >= 450, ('worksheet dimmed too soon after completion', dim_at - done_at)
        run.notes.append(f'Complete Order guided {round(dim_at - done_at)} ms after the worksheet completed')
        run.tap('#collectRewards')
        wait_phase(p, 'summary')
        # The backdrop fades in over 0.24 s; it must reach a real dim promptly.
        p.wait_for_function('''()=>{const b=document.querySelector('.bakery-popup-backdrop:has(.worksheet-summary-modal)');if(!b)return false;
         const m=getComputedStyle(b).backgroundColor.match(/rgba?\(([^)]+)\)/);return m&&Number((m[1].split(',')[3]??'1').trim())>=.45}''', timeout=1500)
        bg = p.evaluate("getComputedStyle(document.querySelector('.bakery-popup-backdrop:has(.worksheet-summary-modal)')).backgroundColor")
        alpha = float(bg.split(',')[3].strip(' )')) if bg.count(',') == 3 else 1.0
        assert alpha >= .45, ('Complete Order popup backdrop is not dimmed', bg)
        run.shot('summary-animating')
        wait_phase(p, 'back'); run.shot('back-check-held')
        settled(p); card_still(p)
        g = p.evaluate(GUIDE_CHECK, '#acknowledgeWorksheetSummary')
        assert g['hitOk'] and g['ring'] and rect_overlap(g['target'], g['card']) == 0, g
        popup = p.evaluate("(()=>{const r=document.querySelector('.worksheet-summary-modal').getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}})()")
        run.shot('back-guided')
        trace = p.evaluate('window.__tourTrace')
        assert not any(e['popupDim'] for e in trace if e['phase'] in ('summary', 'back')), 'guide dimmed the Complete Order popup'
        finished = next(e['t'] for e in trace if e['summary'] == 'finished')
        guided_at = next(e['t'] for e in trace if e['phase'] == 'back' and e['spotlit'])
        assert guided_at - finished >= 500, ('Back guided too soon', guided_at - finished)
        run.notes.append(f'Back guided {round(guided_at - finished)} ms after reward settled')
        if w >= 1900: assert rect_overlap(popup, g['card']) == 0, ('checklist covers popup', popup, g['card'])
        coins = p.evaluate('g.coins')
        run.tap('#acknowledgeWorksheetSummary')
        wait_phase(p, 'nav-packages'); p.wait_for_timeout(150); run.shot('earn-coins-check-held')
        earned = p.evaluate('g.coins') - coins
        assert earned > 0
        run.guided('nav-packages', '[data-world-nav="packages"]', 2)
        early = celebrations(p.evaluate('window.__tourTrace'))
        assert len(early) >= 2 and all(780 <= d <= 1450 for _, d, _ in early), early
        run.notes.append('early check holds ms ' + ', '.join(f'{ph}:{round(d)}' for ph, d, _ in early))
        # Reload mid-tutorial: durable phase resumes, coins unchanged, no re-celebration.
        before = p.evaluate('g.coins'); p.reload(); wait_phase(p, 'nav-packages'); p.evaluate(TRACE_JS)
        assert p.evaluate('g.coins') == before and not status(p)['celebrating']
        run.guided('nav-packages', '[data-world-nav="packages"]', 2)
        run.tap('[data-world-nav="packages"]')
        run.guided('buy-package', '[data-world-buy="1"]:not(:disabled)', 2)
        run.tap('[data-world-buy="1"]:not(:disabled)')
        wait_phase(p, 'package-reveal'); p.wait_for_timeout(700); run.shot('package-reveal')
        wait_phase(p, 'package-collect'); run.shot('buy-check-held')
        g = run.guided('package-collect', '#packageBatchCollect', 3)
        food = p.evaluate("(()=>{const r=document.querySelector('.batch-grid .batch-reward').getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}})()")
        assert rect_overlap(food, g['card']) == 0, ('checklist covers the unboxed food', food, g['card'])
        run.tap('#packageBatchCollect')
        wait_phase(p, 'nav-menu'); p.wait_for_timeout(150); run.shot('unbox-check-held')
        run.guided('nav-menu', '[data-world-nav="menu"]', 4)
        run.tap('[data-world-nav="menu"]')
        run.guided('buy-slot', '[data-tour-target="buy-slot"]:not(:disabled)', 4)
        run.tap('[data-tour-target="buy-slot"]:not(:disabled)')
        run.guided('empty-slot', '[data-tour-target="empty-slot"]', 4)
        run.tap('[data-tour-target="empty-slot"]')
        run.guided('choose-food', '.collection-card .food-card-target', 4)
        run.tap('.collection-card .food-card-target')
        run.guided('equip', '.food-collection-detail-backdrop .action-equip:not(:disabled),.food-detail-redesign .action-equip:not(:disabled)', 4)
        run.tap('.food-collection-detail-backdrop .action-equip:not(:disabled),.food-detail-redesign .action-equip:not(:disabled)')
        wait_phase(p, 'close-food'); p.wait_for_timeout(450)
        held = p.evaluate('''()=>{const t=document.querySelector('.tour-paper.is-just-done .tour-tick');return {celebrating:window.panaderyaTutorialStatus().celebrating,
         offset:t&&parseFloat(getComputedStyle(t).strokeDashoffset),opacity:t&&getComputedStyle(t).opacity}}''')
        assert held['celebrating'] and held['offset'] is not None and held['offset'] < .5 and float(held['opacity']) > .9, ('tick not fully visible during hold', held)
        run.shot('menu-check-held')
        run.guided('close-food', '.food-collection-detail-backdrop .food-panel-close', 5)
        run.tap('.food-collection-detail-backdrop .food-panel-close')
        run.guided('close-inventory', '.hub-collection-back', 5)
        run.tap('.hub-collection-back')
        run.guided('boost', '#boost-status', 5)
        run.tap('#boost-status')
        wait_phase(p, 'ready'); p.wait_for_timeout(150); run.shot('boost-check-held')
        settled(p); card_still(p)
        assert p.locator('[data-tour="finish"]').is_visible()
        boost = p.evaluate("(()=>{const r=document.querySelector('#modals .modal').getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}})()")
        card = p.evaluate("(()=>{const r=document.querySelector('.tour-checklist').getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}})()")
        assert not p.evaluate('window.__tourTrace.at(-1).dim'), 'Boost popup dimmed by the guide'
        if w >= 1200: assert rect_overlap(boost, card) == 0, ('finale covers Boost popup', boost, card)
        run.shot('ready-finale')
        trace = p.evaluate('window.__tourTrace')
        spans = celebrations(trace)
        run.notes.append('check holds ms ' + ', '.join(f'{ph}:{round(d)}' for ph, d, _ in spans))
        assert len(spans) >= 4 and all(780 <= d <= 1450 for _, d, _ in spans), spans
        p.locator('[data-tour="finish"]').tap()
        assert status(p) is None and p.evaluate("localStorage.getItem('panaderyaWholeGameTourV2')") == 'done'
        final = p.evaluate('({owned:g.owned.length,slots:g.menuSlots,menu:g.activeMenu.length,claimed:Object.keys(g.claimedOrders).length})')
        assert final == {'owned': 1, 'slots': 1, 'menu': 1, 'claimed': 1}, final
        p.reload(); p.wait_for_function("document.getElementById('bakeryLoading')?.hidden"); p.wait_for_timeout(800)
        assert status(p) is None, 'completed tutorial restarted'
        bad = sorted(u for u in requested if any(u.endswith('/' + x.replace(' ', '%20')) or u.endswith('/' + x) for x in EXCLUDED))
        assert not bad, ('APK-excluded assets requested', bad)
        assert not errors, errors
    finally:
        (out / 'notes.txt').write_text('\n'.join(run.notes), encoding='utf-8'); ctx.close(); browser.close()
    return run.notes

def skip_and_guard(pw, engine):
    browser = pw.webkit.launch() if engine == 'webkit' else pw.chromium.launch(channel='msedge')
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800}, has_touch=True); p = ctx.new_page()
    try:
        p.goto(URL); wait_phase(p, 'intro')
        coins = p.evaluate('g.coins')
        p.locator('[data-tour="skip"]').tap()
        assert status(p) is None and p.evaluate("localStorage.getItem('panaderyaWholeGameTourV2')") == 'skipped'
        assert p.evaluate('g.coins') == coins
        # Even if helpSeen were lost, an explicit skip is honoured on restart.
        p.evaluate('g.helpSeen=false;save()')
        p.reload(); p.wait_for_function("document.getElementById('bakeryLoading')?.hidden"); p.wait_for_timeout(900)
        assert status(p) is None, 'skipped tutorial restarted'
    finally: ctx.close(); browser.close()

if __name__ == '__main__':
    engines = [a for a in sys.argv[1:] if a in ('edge', 'webkit')] or ['edge']
    sizes = [tuple(map(int, s.split('x'))) for s in os.environ.get('TOUR_SIZES', '2000x1200,1280x800,960x540').split(',')]
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    URL = f'http://127.0.0.1:{server.server_port}/index.html'
    try:
        with sync_playwright() as pw:
            for engine in engines:
                skip_and_guard(pw, engine); print(f'PASS {engine}: skip persists; explicit skip honoured after restart', flush=True)
                for w, h in sizes:
                    notes = journey(pw, engine, w, h)
                    print(f'PASS {engine} {w}x{h}: six tasks, measured timing/spotlights/backdrops, reload, no excluded assets | ' + ' | '.join(notes), flush=True)
    finally: server.shutdown()
