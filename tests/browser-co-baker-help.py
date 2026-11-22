"""Phase 2 only: real Edge/WebKit sockets, UI and isolated worksheet/save state."""
import sys, os, subprocess, socket, time, urllib.request, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', str(root / '.test-tools/browsers'))
from playwright.sync_api import sync_playwright
out = root / 'output/playwright/co-baker-help'
out.mkdir(parents=True, exist_ok=True)
with socket.socket() as free:
    free.bind(('127.0.0.1', 0)); port = free.getsockname()[1]
relay = subprocess.Popen(['node', 'tools/co-baker-dev.mjs'], cwd=root,
    env={**os.environ, 'PORT':str(port)}, stdout=subprocess.DEVNULL,
    creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))

def wait(p, expression):
    p.wait_for_function(expression, timeout=30000)

def agree(pages, excluded=None):
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        states = [p.evaluate('panaderyaCoBaker.coordinator.snapshot()') for p in pages]
        if (states[0]['leader'] and states[0]['leader']['id'] != excluded
            and sum(s['role'] == 'Coordinator' for s in states) == 1
            and all(s['leader'] and s['leader']['id'] == states[0]['leader']['id'] and s['leader']['term'] == states[0]['leader']['term'] and s['status'] == 'Healthy' for s in states)):
            return states[0]['leader']['id']
        pages[0].wait_for_timeout(150)
    raise AssertionError(states)

def idle(pages):
    for p in pages:
        wait(p, '!panaderyaCoBaker.help.active && !panaderyaCoBaker.help.outgoing && !panaderyaCoBaker.help.accepting && !panaderyaCoBaker.help.incoming.size')

def accept(p):
    # A helper who is mid-worksheet confirms "Save & Exit Worksheet" (or leaving a
    # current session) before switching; the confirm stage enables after confirmDelayMs.
    p.locator('[data-help-accept]').first.click()
    p.wait_for_timeout(750)
    if p.locator('[data-help-accept].confirm-save,[data-help-accept].confirm-leave').count():
        p.locator('[data-help-accept].confirm-save,[data-help-accept].confirm-leave').first.click()

def call(p, target=None):
    # Repeat direct calls respect the 30 s per-baker cooldown (help-requests RULES);
    # advance every peer's injected help clock instead of sleeping.
    for q in pages:
        q.evaluate('window.__skew=(window.__skew||0)+31000;panaderyaCoBaker.help.clock=()=>Date.now()+window.__skew')
    if not p.locator('#coBakerHelpBody').count():
        p.get_by_role('button', name='Find a Helper', exact=True).click()
        p.locator('#coBakerHelpBody').wait_for(state='visible')
    if target:
        wait(p, f'panaderyaCoBaker.help.eligible("{target}")')
        p.locator(f'[data-help-to="{target}"]').click()
    else:
        p.locator('[data-help-action="find"]').click()  # 'Find Helpers' (formerly Call All)

def end(p, pages):
    if p.locator('#coBakerObservation').count(): p.locator('[data-observer-end]').click()
    elif p.locator('#coBakerInvitations [data-help-end]').count(): p.locator('#coBakerInvitations [data-help-end]').click()
    else:
        # Learner: End Help is in the worksheet footer (it replaces Find a Helper while
        # connected) or the open popup; ending needs a deliberate second tap (>=650 ms).
        target = p.locator('#coBakerRemoveHelper:visible, [data-help-action="end"]:visible').first
        target.click()
        p.wait_for_timeout(750)
        if p.evaluate('!!panaderyaCoBaker.help.active'):
            p.locator('#coBakerRemoveHelper:visible, [data-help-action="end"]:visible').first.click()
    idle(pages)

try:
    for _ in range(60):
        try:
            urllib.request.urlopen(f'http://127.0.0.1:{port}/__co-baker/config'); break
        except OSError: time.sleep(.1)
    with sync_playwright() as pw:
        edge = pw.chromium.launch(channel='msedge'); webkit = pw.webkit.launch()
        contexts, pages, errors = [], [], []
        for i, browser in enumerate((edge, webkit, edge, webkit)):
            ctx = browser.new_context(viewport={'width':2000 if i == 1 else 1280, 'height':1200 if i == 1 else 800})
            # Fixed independent identities make the third-party coordinator deterministic.
            ctx.add_init_script(f'if(!localStorage.panaderyaPlayerV1)localStorage.panaderyaPlayerV1=JSON.stringify({{id:"{i+1:032x}",name:"Baker {i+1}",number:"000{i+1}"}})')
            contexts.append(ctx); p = ctx.new_page(); pages.append(p)
            p.on('pageerror', lambda e: errors.append(str(e)))
            p.goto(f'http://127.0.0.1:{port}/index.html?cobaker=debug&webrelay=1')
            # Current three-page scene: wait for loading, then dismiss the first-run tutorial.
            p.wait_for_function("document.getElementById('bakeryLoading')?.hidden&&typeof navigateBakery==='function'")
            p.wait_for_timeout(300); p.evaluate('window.skipWholeBakeryGuide?.()')
        leader = agree(pages); assert leader == f'{1:032x}'
        coordinator, learner, helper, other = pages
        helper_id = helper.evaluate('panaderyaCoBaker.profile.id')
        for p in (learner, helper):
            p.evaluate("navigateBakery('orders')"); p.wait_for_function('!bakeryJourney&&bakeryPage==="orders"')
            p.locator('.scene-ticket:not(:disabled)').first.click()
            wait(p, 'document.querySelector("#worksheetFrame")?.worksheetStarted===true')
        # Create real individual worksheet work before invitations.
        fr = learner.locator('#worksheetFrame').element_handle().content_frame()
        fr.locator('[data-top="0"]').click(); fr.locator('[data-bottom="0"]').click()
        fr.locator('#equationReveal').click(); learner.wait_for_timeout(200)
        for root in (learner, fr):
            if root.locator('[data-golden-option="auto"]').count(): root.locator('[data-golden-option="auto"]').first.click(); break
        wait(learner, 'document.querySelector("#worksheetFrame").contentWindow.eval("s.revealed")')
        worksheets = [p.evaluate('JSON.stringify(document.querySelector("#worksheetFrame").contentWindow.getWorksheetSession())') for p in (learner, helper)]
        saves = [p.evaluate('localStorage.panaderyaQuestV2') for p in pages]
        learner.get_by_role('button', name='Find a Helper', exact=True).click()
        # Availability through the actual settings checkbox.
        other.locator('#settings-button').click(); other.locator('[data-help-mute="dnd"]').check()  # current DND control (checked = unavailable)
        wait(learner, 'panaderyaCoBaker.help.state("00000000000000000000000000000004").status==="Unavailable"')
        assert learner.locator('[data-help-to="00000000000000000000000000000004"]').is_disabled()
        call(learner, helper_id); helper.locator('[data-help-decline]').click(); idle(pages)
        call(learner, helper_id); helper.wait_for_selector('[data-help-accept]')
        learner.locator(f'[data-help-cancel="{helper_id}"]').click(); idle(pages)  # per-call cancel (×)
        call(learner, helper_id); accept(helper)
        wait(learner, 'panaderyaCoBaker.help.active?.role==="Learner"')
        wait(helper, 'panaderyaCoBaker.help.active?.role==="Helper"')
        # The helper's own work was saved; they now watch the learner's live worksheet.
        equation = learner.evaluate('`${g.run.ticket.a} × ${g.run.ticket.b}`')
        viewer = helper.locator('iframe[src*="worksheet-observer.html"]')
        viewer.wait_for(state='visible')
        assert helper.locator('#worksheetFrame').is_hidden()
        wait(helper, f'''(()=>{{const d=document.querySelector('iframe[src*="worksheet-observer.html"]')?.contentDocument;return !!d&&d.body.innerText.replace(/\s+/g,' ').includes({json.dumps(equation)})&&!!d.querySelector('iframe[src*="observe=1"]')}})()''')
        assert 'Read-only' in helper.locator('body').inner_text()
        # Learner footer: one child-sized End Help, no clipped/overlapping buttons.
        learner.locator('#modals .close').first.click()
        learner.locator('#coBakerRemoveHelper').wait_for(state='visible')
        footer = learner.evaluate('''(()=>{const bar=document.querySelector('.worksheet-complete-bar');
         const vis=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
         const items=[...bar.querySelectorAll('button')].filter(vis).map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.className,l:r.left,r:r.right,t:r.top,b:r.bottom,h:r.height,clip:e.scrollWidth>e.clientWidth+1}});
         let overlap=false;for(const a of items)for(const b of items)if(a!==b&&Math.min(a.r,b.r)-Math.max(a.l,b.l)>1&&Math.min(a.b,b.b)-Math.max(a.t,b.t)>1)overlap=true;
         const st=document.getElementById('coBakerConnectionStatus'),end=document.getElementById('coBakerRemoveHelper');
         return {overlap,clipped:items.filter(i=>i.clip).map(i=>i.id),endH:end.getBoundingClientRect().height,findVisible:[...bar.querySelectorAll('.cobaker-help-button')].some(vis),status:st&&vis(st)?st.textContent:''}})()''')
        assert not footer['overlap'] and not footer['clipped'] and footer['endH'] >= 44 and not footer['findVisible'], footer
        assert footer['status'] == 'Co-Baker connected', footer
        learner.screenshot(path=str(out / 'direct-connected-2000.png'))
        helper.screenshot(path=str(out / 'helper-own-worksheet-1280.png'))
        coordinator.evaluate('panaderyaCoBaker.stop()'); agree(pages[1:], excluded=leader)
        assert learner.evaluate('!!panaderyaCoBaker.help.active')
        assert helper.evaluate('!!panaderyaCoBaker.help.active')
        coordinator.evaluate('panaderyaCoBaker.start()'); agree(pages)
        end(learner, pages)
        learner.evaluate('panaderyaCoBaker.stop()'); agree([coordinator, helper, other], excluded=f'{2:032x}')
        learner.evaluate('panaderyaCoBaker.start()'); agree(pages)
        print('PASS Direct Call, DND, decline, cancel, two-step accept, helper live read-only worksheet, learner footer End Help and learner end', flush=True)
        # Expiry uses the existing clock injection; real sockets/UI still deliver cancellation.
        call(learner, helper_id); helper.wait_for_selector('[data-help-accept]')
        learner.evaluate('const k=window.__skew||0;panaderyaCoBaker.help.clock=()=>Date.now()+k+46000;panaderyaCoBaker.help.tick();panaderyaCoBaker.help.clock=()=>Date.now()+k')
        idle(pages)
        # Pending and active reservations survive departure of an unrelated coordinator.
        call(learner, helper_id); helper.wait_for_selector('[data-help-accept]')
        coordinator.evaluate('panaderyaCoBaker.stop()'); assert agree(pages[1:], excluded=leader) != leader
        assert learner.evaluate('!!panaderyaCoBaker.help.outgoing')
        accept(helper); wait(learner, '!!panaderyaCoBaker.help.active')
        coordinator.evaluate('panaderyaCoBaker.start()'); agree(pages)
        end(helper, pages)
        print('PASS expiration, pending/active reservations across coordinator failover and helper end', flush=True)
        other.locator('[data-help-mute="dnd"]').uncheck(); other.locator('#modals .close').first.click()
        wait(learner, 'panaderyaCoBaker.help.eligible("00000000000000000000000000000004")')
        call(learner)
        for p in (coordinator, helper, other): p.wait_for_selector('[data-help-accept]')
        for p in (helper, other): p.evaluate('setTimeout(()=>{document.querySelector("[data-help-accept]")?.click();setTimeout(()=>document.querySelector("[data-help-accept].confirm-save,[data-help-accept].confirm-leave")?.click(),750)},100)')
        wait(learner, '!!panaderyaCoBaker.help.active')
        for p in (coordinator, helper, other): wait(p, '!panaderyaCoBaker.help.accepting && !panaderyaCoBaker.help.incoming.size')
        winners = [p for p in (coordinator, helper, other) if p.evaluate('!!panaderyaCoBaker.help.active')]
        assert len(winners) == 1
        # Participant socket reconnect in grace preserves the matching reservation.
        winner = winners[0]; session = learner.evaluate('panaderyaCoBaker.help.active.sessionId')
        winner.evaluate('window.phase2OldSocket=panaderyaCoBaker.transport.socket;phase2OldSocket.close()')
        wait(winner, 'panaderyaCoBaker.transport.socket!==phase2OldSocket && panaderyaCoBaker.transport.socket.readyState===1')
        wait(winner, 'panaderyaCoBaker.status==="connected"')
        wait(learner, 'panaderyaCoBaker.help.active?.lostAt===0')
        assert learner.evaluate('panaderyaCoBaker.help.active.sessionId') == session
        end(winner, pages)
        for p, saved in zip(pages, saves):
            before=json.loads(saved);after=json.loads(p.evaluate('localStorage.panaderyaQuestV2'))
            for data in (before,after):
                data.pop('coBakerRewards',None);data.pop('orderClock',None)
                for run in [data.get('run'),*data.get('orderRuns',{}).values()]:
                    if run:run.pop('coBakerRewards',None)
            if p is helper:
                # Accepting while mid-worksheet is a deliberate "Save & Exit Worksheet":
                # the helper's own order is paused, never altered otherwise.
                for data in (before, after):
                    for run in [data.get('run'), *data.get('orderRuns', {}).values()]:
                        if run: assert run.get('paused') in (False, True); run.pop('paused', None)
                assert json.loads(p.evaluate('localStorage.panaderyaQuestV2'))['run']['paused'] is True
            assert after==before
        for p, saved in zip((learner, helper), worksheets):
            assert p.evaluate('JSON.stringify(document.querySelector("#worksheetFrame").contentWindow.getWorksheetSession())') == saved
        print('PASS Call All arbitration, same-session socket reconnect and unchanged independent saves/worksheet work', flush=True)
        assert not errors, errors
        for ctx in contexts: ctx.close()
        edge.close(); webkit.close()
finally:
    relay.terminate(); relay.wait(timeout=10)
