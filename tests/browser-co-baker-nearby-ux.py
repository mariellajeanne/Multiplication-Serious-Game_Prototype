"""Real relay/UI integration. Nearby radio behavior requires physical Android tests."""
import json, os, socket, subprocess, sys, time, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(ROOT/'.test-tools/browsers'))
from playwright.sync_api import sync_playwright
sys.path.insert(0,str(Path(__file__).resolve().parent));import scene_test_support as scene
OUT=ROOT/'output/playwright/nearby-ux';OUT.mkdir(parents=True,exist_ok=True)
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
server=subprocess.Popen(['node','tools/co-baker-dev.mjs'],cwd=ROOT,env={**os.environ,'PORT':str(port)},stdout=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
url=f'http://127.0.0.1:{port}/index.html?cobaker=debug&webrelay=1'
def wait(p,s):p.wait_for_function(s,timeout=30000)
def reset_limits(pages):
    # Isolate UI scenarios; expiry/cooldown enforcement has separate clocked protocol tests.
    for p in pages:p.evaluate('()=>{const h=panaderyaCoBaker.help;h.directTimes.clear();h.callerTimes.clear();h.callTimes=[];h.interrupted.clear()}')
def call(a,b):
    a.evaluate('openCoBakerHelp()');target=b.evaluate('panaderyaCoBaker.profile.id');a.locator(f'[data-help-to="{target}"]').click();a.locator('#modals .close').click()
    try:b.locator('[data-help-accept]').first.wait_for(timeout=5000)
    except Exception:
        b.screenshot(path=str(OUT/'failure.png'))
        state=b.evaluate('({html:document.querySelector("#coBakerInvitations")?.outerHTML,parent:document.querySelector("#coBakerInvitations")?.parentElement?.id,active:panaderyaCoBaker.help.active,incoming:[...panaderyaCoBaker.help.incoming.values()],observing:!!document.querySelector("#coBakerObservation"),width:innerWidth,height:innerHeight})')
        (OUT/'failure.json').write_text(json.dumps(state,indent=2));raise
def open_order(p):
    p.evaluate('g.board[0].a=79;g.board[0].b=18;startTicket(g.board[0].id)');wait(p,'document.querySelector("#worksheetFrame")?.worksheetStarted')
def frame(p):return p.locator('#worksheetFrame').element_handle().content_frame()
try:
    for _ in range(60):
        try:urllib.request.urlopen(url);break
        except OSError:time.sleep(.1)
    with sync_playwright() as pw:
        edge=pw.chromium.launch(channel='msedge');webkit=pw.webkit.launch()
        for engine in sys.argv[1:] or ['edge','webkit']:
            browser=edge if engine=='edge' else webkit
            contexts=[];pages=[];errors=[]
            for i,name in enumerate(['Alex','Bea','Cora','Dani']):
                ctx=browser.new_context(viewport={'width':2000 if i==2 else 1280,'height':1200 if i==2 else 800},has_touch=True)
                ctx.add_init_script(f'if(!localStorage.panaderyaPlayerV1)localStorage.panaderyaPlayerV1=JSON.stringify({{id:"{i+1:032x}",name:"{name}",number:"{1000+i}"}})')
                p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.goto(url);scene.ready(p);contexts.append(ctx);pages.append(p)
            a,b,c,d=pages
            for p in pages:wait(p,'panaderyaCoBaker.peers.size===3')
            open_order(a);open_order(b);open_order(c)
            f=frame(c);f.locator('[data-top="0"]').click();f.locator('[data-bottom="0"]').click();scene.generate(c);wait(c,'g.run.worksheetSession?.state.revealed||$("worksheetFrame").contentWindow.eval("s.revealed")')
            c.evaluate('captureActiveWorksheet();save()');own=c.evaluate('JSON.stringify(g.run.worksheetSession)')
            c.locator('.worksheet-settings').click()
            assert c.locator('.baker-profile').is_visible();assert c.locator('[data-help-mute]').count()==6
            c.locator('[data-help-mute="solo"]').check();c.locator('[data-help-mute="worksheet"]').check()
            assert c.locator('[data-help-mute="helping"]').is_disabled()
            c.locator('[data-help-mute="dnd"]').check();assert c.locator('[data-help-mute="bakery"]').is_disabled()
            c.locator('[data-help-mute="dnd"]').uncheck();c.locator('[data-help-mute="worksheet"]').uncheck();assert c.locator('[data-help-mute="solo"]').is_checked()
            c.screenshot(path=str(OUT/f'{engine}-shared-settings.png'))
            c.locator('[data-help-mute="solo"]').uncheck()
            # Favorites now live in the Call for Help list (settings' Find Bakers entry was removed in 0c10810).
            c.locator('#modals .close').first.click();c.get_by_role('button',name='Find a Helper',exact=True).click();c.locator('[data-crew="00000000000000000000000000000002"]').click()
            assert c.locator('.cobaker-heart[aria-pressed=true]').count()==1;c.reload();wait(c,'document.querySelector("#worksheetFrame")?.worksheetStarted');wait(c,'panaderyaCoBaker.peers.size===3')
            c.evaluate('openCoBakerHelp(true)');assert c.locator('.cobaker-heart[aria-pressed=true]').count()==1;c.locator('#modals .close').click()
            assert c.evaluate('JSON.stringify(g.run.worksheetSession)')==own
            # Caller cancel is one tap from the existing worksheet control.
            call(a,c);assert a.get_by_role('button',name='Find a Helper',exact=True).count()==1
            for width,height in [(1280,800),(2000,1200)]:
                c.set_viewport_size({'width':width,'height':height})
                box=c.locator('[data-invitation]').bounding_box();grid=c.locator('#worksheetFrame').bounding_box();assert box['x']>=grid['x']+grid['width']
                c.screenshot(path=str(OUT/f'{engine}-worksheet-request-{width}.png'))
            a.evaluate('openCoBakerHelp()');a.locator('[data-help-cancel]').click();a.locator('#modals .close').click();c.get_by_text('Alex #1000 cancelled the call',exact=True).wait_for();wait(c,'!panaderyaCoBaker.help.terminals.size')
            # Own worksheet: distinct confirmation, rapid double tap blocked, safely saved.
            reset_limits(pages);call(a,c);button=c.locator('[data-help-accept]');button.click();assert 'Save & Exit Worksheet' in button.inner_text();button.click();assert c.evaluate('panaderyaCoBaker.help.active') is None
            c.wait_for_timeout(700);button.click();wait(c,'panaderyaCoBaker.help.active?.role==="Helper"');wait(a,'panaderyaCoBaker.help.active?.role==="Learner"');assert c.evaluate('g.run.paused')
            assert c.evaluate('JSON.stringify(g.run.worksheetSession)')==own
            # Helper Settings overlay keeps reservation/snapshot and current worksheet intact.
            c.get_by_role('button',name='Co-Baker worksheet settings').click();session=c.evaluate('panaderyaCoBaker.help.active.sessionId');c.locator('[data-help-mute="helping"]').check();wait(b,'panaderyaCoBaker.help.state("00000000000000000000000000000003").status==="Unavailable"')
            assert c.evaluate('panaderyaCoBaker.help.active.sessionId')==session
            c.locator('[data-help-mute="helping"]').uncheck();c.locator('#modals .close').click();wait(c,'panaderyaCoBaker.observation.latest!==null')
            # Available helpers receive new invitations; changing partners needs two taps.
            reset_limits(pages);call(b,c);button=c.locator('[data-help-accept]');c.evaluate('()=>{document.querySelector("[data-help-accept]").click();document.querySelector("[data-help-accept]").click()}');assert 'Leave Alex & Help Bea' in button.inner_text();assert 'confirm-leave' in button.get_attribute('class')
            assert c.evaluate('panaderyaCoBaker.help.active.otherId')=='00000000000000000000000000000001'
            c.wait_for_timeout(700);button.click();wait(c,'panaderyaCoBaker.help.active?.otherId==="00000000000000000000000000000002"');wait(a,'!panaderyaCoBaker.help.active')
            observer=c.locator('#coBakerObservation iframe').element_handle().content_frame();observer.wait_for_selector('#worksheetFrame')
            observer.locator('#worksheetFrame').element_handle().content_frame().locator('[data-top]').first.wait_for(state='visible')
            c.screenshot(path=str(OUT/f'{engine}-helper-switched-2000.png'))
            c.evaluate('panaderyaCoBaker.help.end()');wait(b,'!panaderyaCoBaker.help.active')
            # Left swipe only, duplicate invite cannot resurrect a dismissed row.
            reset_limits(pages);call(a,c);request=a.evaluate('panaderyaCoBaker.help.outgoing.requestId');expires=a.evaluate('panaderyaCoBaker.help.outgoing.expiresAt')
            row=c.locator('[data-invitation]');box=row.bounding_box();x=box['x']+box['width']*.5;y=box['y']+20
            c.mouse.move(x,y);c.mouse.down();c.mouse.move(x-90,y+3,steps=5);c.mouse.up();wait(c,'!panaderyaCoBaker.help.incoming.size')
            a.evaluate('([id,requestId,expiresAt])=>panaderyaCoBaker.help.send(id,{kind:"invite",requestId,expiresAt})',['00000000000000000000000000000003',request,expires]);c.wait_for_timeout(200);assert c.locator('[data-invitation]').count()==0
            # Multiple incoming rows scroll in reserved space, without touching worksheet targets.
            reset_limits(pages);open_order(d);call(a,c);call(b,c);call(d,c)
            assert c.locator('[data-invitation]').count()==3
            metrics=c.locator('.cobaker-request-scroll').evaluate('(el)=>({scroll:el.scrollHeight>el.clientHeight,overflow:getComputedStyle(el).overflowY})');assert metrics['scroll'] and metrics['overflow']=='scroll'
            c.screenshot(path=str(OUT/f'{engine}-requests-2000.png'))
            c.set_viewport_size({'width':1280,'height':800});c.locator('[data-tray-toggle]').click();c.screenshot(path=str(OUT/f'{engine}-requests-1280.png'))
            for p in (a,b,d):p.evaluate('panaderyaCoBaker.help.cancel()')
            wait(c,'!panaderyaCoBaker.help.incoming.size')
            # One picker: manual/random slots, hearts, individual cancel, Stop and progress.
            reset_limits(pages);a.evaluate('openCoBakerHelp()')
            def meter(n):
                wait(a,f'panaderyaCoBaker.help.calls.size==={n}')
                assert a.locator('.cobaker-call-count').get_attribute('aria-valuenow')==str(n)
                assert f'{n}/3 Bakers Calling Now' in a.locator('.cobaker-call-count').inner_text()
                assert float(a.locator('.cobaker-call-count').evaluate('(el)=>parseFloat(el.style.getPropertyValue("--call-fill"))'))==n/3*100
            meter(0)
            bid=b.evaluate('panaderyaCoBaker.profile.id');cid=c.evaluate('panaderyaCoBaker.profile.id');did=d.evaluate('panaderyaCoBaker.profile.id')
            a.locator(f'[data-help-to="{bid}"]').click();meter(1)
            a.locator(f'[data-help-to="{cid}"]').click();meter(2)
            a.locator(f'[data-help-to="{did}"]').click();meter(3)
            assert a.locator('[data-help-action="find"]').is_disabled()
            assert a.locator('.cobaker-active-call').count()==3
            a.locator(f'[data-crew="{bid}"]').click();assert a.locator(f'[data-crew="{bid}"]').get_attribute('aria-pressed')=='true'
            assert a.evaluate('panaderyaCoBaker.help.calls.size')==3
            rows=a.locator('[data-baker]').evaluate_all('(rows)=>rows.map(r=>r.dataset.baker)');assert len(rows)==len(set(rows))
            # Add an extra discovered candidate to verify unused Call buttons retain their label.
            a.evaluate('()=>panaderyaCoBaker.receive({kind:"candidate",player:{id:"e".repeat(32),name:"Zara",number:"9999",available:true}})')
            assert a.locator('[data-help-to="'+('e'*32)+'"]').is_disabled()
            assert a.locator('[data-help-to="'+('e'*32)+'"]').inner_text()=='Call'
            a.locator(f'[data-help-cancel="{cid}"]').click();meter(2)
            a.evaluate('panaderyaCoBaker.candidates.delete("e".repeat(32));panaderyaCoBaker.changed()');reset_limits(pages)
            a.locator('[data-help-action="find"]').click();meter(3)
            assert a.locator('.cobaker-active-call').filter(has_text='Random call').count()==1
            a.screenshot(path=str(OUT/f'{engine}-unified-three-calls.png'))
            a.locator('.cobaker-active-call').filter(has_text='Random call').locator('[data-help-cancel]').click();meter(2)
            assert a.locator('[data-help-action="find"]').count()==1
            a.wait_for_timeout(1100);meter(2)
            a.locator('[data-help-action="find"]').click();a.locator('[data-help-action="stop"]').click();meter(2)
            assert a.locator('.cobaker-active-call').filter(has_text='Manual call').count()==2
            a.locator('#modals .close').click();wait(a,'!panaderyaCoBaker.help.pickerOpen');assert a.evaluate('panaderyaCoBaker.help.calls.size')==2
            a.evaluate('openCoBakerHelp()');meter(2)
            a.evaluate('panaderyaCoBaker.help.cancel()');meter(0)
            assert a.locator('.cobaker-help-list h3').first.inner_text()=='Favorite Bakers'
            a.locator('#modals .close').click()
            # Learner removes helper in place; rapid second tap blocked, live frame retained.
            reset_limits(pages);call(a,d);d.locator('[data-help-accept]').click();d.wait_for_timeout(700)
            if not d.evaluate('panaderyaCoBaker.help.active'):d.locator('[data-help-accept]').click()
            wait(a,'panaderyaCoBaker.help.active?.role==="Learner"');wait(d,'panaderyaCoBaker.observation.latest!==null')
            before_remove=a.evaluate('captureActiveWorksheet();JSON.stringify(g.run.worksheetSession)')
            a.evaluate('window.frameBeforeRemoval=document.querySelector("#worksheetFrame")')
            a.evaluate('()=>{document.querySelector("[data-learner-end]").click();document.querySelector("[data-learner-end]").click()}')
            assert a.evaluate('!!panaderyaCoBaker.help.active');assert a.locator('[data-learner-end]').inner_text()=='Remove helper?'
            assert 'confirm-leave' in a.locator('[data-learner-end]').get_attribute('class')
            a.screenshot(path=str(OUT/f'{engine}-remove-helper-confirm.png'))
            a.wait_for_timeout(700);a.locator('[data-learner-end]').click();wait(d,'!panaderyaCoBaker.help.active');wait(d,'panaderyaCoBaker.observation.latest===null')
            assert a.evaluate('document.querySelector("#worksheetFrame")===frameBeforeRemoval');assert not a.evaluate('g.run.paused')
            assert a.evaluate('JSON.stringify(g.run.worksheetSession)')==before_remove
            assert not d.evaluate('panaderyaCoBaker.guidance.send("hint","next")')
            # Home art remains intact at both required dimensions.
            for width,height in [(2000,1200),(1280,800)]:a.set_viewport_size({'width':width,'height':height});a.evaluate('abandonTicket()');a.screenshot(path=str(OUT/f'{engine}-home-{width}.png'))
            assert not errors,errors
            print('PASS '+engine+': Favorite persistence, mute hierarchy/privacy, caller cancel, own worksheet save, guarded switch, helper Settings, swipe/replay dismissal, scrollable tray, unified three-slot picker and guarded learner removal',flush=True)
            for ctx in contexts:ctx.close()
        edge.close();webkit.close()
finally:server.terminate();server.wait(timeout=10)
