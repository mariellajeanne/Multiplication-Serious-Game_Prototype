"""Phase 3A: isolated profiles, actual relay, production procedure and viewer."""
import sys, os, subprocess, socket, time, urllib.request, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', str(root / '.test-tools/browsers'))
from playwright.sync_api import sync_playwright
out = root / 'output/playwright/co-baker-observation'
out.mkdir(parents=True, exist_ok=True)
with socket.socket() as free:
    free.bind(('127.0.0.1', 0)); port = free.getsockname()[1]
relay = subprocess.Popen(['node', 'tools/co-baker-dev.mjs'], cwd=root,
    env={**os.environ, 'PORT':str(port)}, stdout=subprocess.DEVNULL,
    creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))

def wait(p, expression):
    p.wait_for_function(expression, timeout=30000,polling=100)

def call(p, target=None):
    if target:
        wait(p, f'panaderyaCoBaker.help.eligible("{target}")')
        p.locator(f'[data-help-to="{target}"]').click()
    else:
        p.locator('[data-help-action="all"]').click()

def synced(learner, helper):
    expected=None
    deadline=time.monotonic()+15
    while time.monotonic()<deadline:
        expected=learner.evaluate('CoBakerWorksheet.snapshot(g.run.worksheetSession,panaderyaCoBaker.observation.presentation(g.run.worksheetSession))')
        latest=helper.evaluate('panaderyaCoBaker.observation.latest')
        rendered=helper.evaluate('()=>{try{return CoBakerWorksheet.snapshot({state:document.querySelector("#coBakerObservation iframe")?.contentWindow?.getObservedWorksheetState()},panaderyaCoBaker.observation.latest?.presentation)}catch(_){return null}}')
        panel_script="""()=>{const p=PANEL;if(!p)return null;const clone=p.cloneNode(true);for(const el of clone.querySelectorAll('*'))for(const a of ['onclick','disabled','aria-disabled','tabindex','data-inactive'])el.removeAttribute(a);return clone.innerHTML}"""
        local_panel=learner.evaluate(panel_script.replace('PANEL','document.querySelector("#calculationPanel")'))
        mirror_panel=helper.evaluate(panel_script.replace('PANEL','document.querySelector("#coBakerObservation iframe")?.contentDocument?.querySelector("#calculationPanel")'))
        prompts=learner.evaluate('document.querySelector("#worksheetFrame").contentDocument.querySelector("#guidePrompt").textContent')
        mirrored_prompt=helper.evaluate('()=>{try{return document.querySelector("#coBakerObservation iframe").contentDocument.querySelector("#worksheetFrame").contentDocument.querySelector("#guidePrompt").textContent}catch(_){return null}}')
        if expected and latest==expected and rendered==expected and local_panel==mirror_panel and prompts==mirrored_prompt:return expected
        helper.wait_for_timeout(100)
    helper.screenshot(path=str(out/'failure.png'));print('ERRORS',errors,flush=True);raise AssertionError((expected,latest,rendered))

try:
    for _ in range(60):
        try: urllib.request.urlopen(f'http://127.0.0.1:{port}/__co-baker/config'); break
        except OSError: time.sleep(.1)
    with sync_playwright() as pw:
        edge=pw.chromium.launch(channel='msedge'); webkit=pw.webkit.launch()
        pages=[]; contexts=[]; errors=[]
        for i,browser in enumerate((edge,webkit,edge)):
            ctx=browser.new_context(viewport={'width':1280,'height':800});contexts.append(ctx)
            p=ctx.new_page();pages.append(p);p.on('pageerror',lambda e:errors.append(str(e)))
            p.goto(f'http://127.0.0.1:{port}/index.html?cobaker=debug&webrelay=1');p.wait_for_selector('.hub-food')
        learner,helper,other=pages
        helper.locator('.hub-ticket').first.click();wait(helper,'document.querySelector("#worksheetFrame")?.worksheetStarted===true')
        learner.evaluate('g.board[0].a=79;g.board[0].b=18;startTicket(g.board[0].id)')
        wait(learner,'document.querySelector("#worksheetFrame")?.worksheetStarted===true')
        helper.evaluate('captureActiveWorksheet();save()');helper_save=helper.evaluate('localStorage.panaderyaQuestV2');other_save=other.evaluate('localStorage.panaderyaQuestV2')
        own=helper.evaluate('JSON.stringify(document.querySelector("#worksheetFrame").contentWindow.getWorksheetSession())')
        helper_id=helper.evaluate('panaderyaCoBaker.profile.id')
        learner.get_by_role('button',name='Call for Help',exact=True).click();call(learner,helper_id)
        helper.locator('[data-help-accept]').click();helper.wait_for_selector('#coBakerObservation iframe')
        synced(learner,helper)
        learner.locator('[data-help-action="end"]').click();wait(helper,'!panaderyaCoBaker.help.active')
        assert helper.evaluate('panaderyaCoBaker.observation.latest') is None
        assert helper.locator('#coBakerObservation').count()==0
        call(learner,helper_id);helper.locator('[data-help-accept]').click();helper.wait_for_selector('#coBakerObservation iframe')
        synced(learner,helper);learner.locator('#modals .close').click()
        fr=learner.locator('#worksheetFrame').element_handle().content_frame()
        fr.locator('[data-top="0"]').click();fr.locator('[data-bottom="0"]').click()
        wait(learner,'g.run.worksheetSession.state.phase==="product"')
        # Deterministic offer fixture; production challenge acceptance/answer rules run unchanged.
        learner.evaluate('const a=ensureFactAnswer(g.run,g.run.steps[0]);a.offered=true;a.multiplier=3;paintWorksheetExperience()')
        synced(learner,helper);helper.screenshot(path=str(out/'helper-golden-offer.png'))
        observer=helper.locator('#coBakerObservation iframe').element_handle().content_frame()
        assert observer.locator('#goldenChallenge').is_disabled()
        assert observer.locator('#generateAnswer').is_disabled()
        learner.locator('#goldenChallenge').click();synced(learner,helper)
        for key in ('7','0','Enter'):
            learner.locator(f'[data-calc-key="{key}"]').click();synced(learner,helper)
        helper.screenshot(path=str(out/'helper-golden-wrong.png'))
        for width,height in [(1024,768),(1280,800),(2000,1200)]:
            helper.set_viewport_size({'width':width,'height':height});helper.wait_for_timeout(180)
            bounds=observer.evaluate("""()=>{const r=document.querySelector('#observedWorkbench').getBoundingClientRect();return {right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollHeight}}""")
            assert bounds['right']<=bounds['width']+2 and bounds['bottom']<=bounds['height']+2,bounds
            assert bounds['scroll']<=bounds['height']+2,bounds
            assert observer.locator('[data-calc-key]:enabled').count()==0
            helper.screenshot(path=str(out/f'helper-golden-{width}.png'))
        helper.set_viewport_size({'width':1280,'height':800})
        for key in ('7','2','Enter'):
            learner.locator(f'[data-calc-key="{key}"]').click();synced(learner,helper)
        wait(learner,'document.querySelector("#worksheetFrame").contentWindow.eval("s.revealed")');synced(learner,helper)
        assert observer.locator('#calculationAnswer').inner_text()=='72'
        assert observer.locator('[data-answer-digit]').count()==2
        helper.screenshot(path=str(out/'helper-golden-success.png'))
        # Probe synthetic input and parent input commands against the observer.
        before=helper.evaluate('JSON.stringify(panaderyaCoBaker.observation.latest)')
        learner_before=learner.evaluate('JSON.stringify(g.run)');helper_before=helper.evaluate('localStorage.panaderyaQuestV2')
        helper.evaluate('''()=>{const f=document.querySelector('#coBakerObservation iframe');f.contentWindow.document.querySelector('#generateAnswer')?.click();f.contentWindow.document.querySelector('#worksheetFrame').contentWindow.document.querySelector('[data-top]').click();f.contentWindow.postMessage({source:'bc-shell',type:'undo'},location.origin);f.contentWindow.postMessage({source:'bc-shell',type:'start',ticket:{a:1,b:1},attemptId:'intruder'},location.origin)}''')
        helper.evaluate('document.querySelector("#coBakerObservation").focus()');helper.keyboard.type('12')
        assert observer.evaluate('typeof generateWorksheetAnswer')=='undefined'
        assert observer.evaluate('typeof sendEngine')=='undefined'
        helper.wait_for_timeout(250);assert helper.evaluate('JSON.stringify(panaderyaCoBaker.observation.latest)')==before;synced(learner,helper)
        assert learner.evaluate('JSON.stringify(g.run)')==learner_before
        assert helper.evaluate('localStorage.panaderyaQuestV2')==helper_before
        # Real provisional placement: write the ones and temporarily put tens in the row.
        fr.evaluate('worksheetDropDigit("ones",{kind:"slot",r:0,c:0},2)');fr.wait_for_function('!busy')
        fr.evaluate('worksheetDropDigit("tens",{kind:"slot",r:0,c:1},7)');fr.wait_for_function('!busy');synced(learner,helper)
        learner.screenshot(path=str(out/'learner-79x18.png'));helper.screenshot(path=str(out/'helper-provisional-1280.png'))
        learner.get_by_role('button',name='Undo',exact=True).click();fr.wait_for_function('!busy');synced(learner,helper)
        helper.evaluate('window.oldSocket=panaderyaCoBaker.transport.socket;oldSocket.close()')
        wait(helper,'panaderyaCoBaker.transport.socket!==oldSocket && panaderyaCoBaker.status==="connected"');synced(learner,helper)
        helper.reload();helper.wait_for_selector('#coBakerObservation iframe');synced(learner,helper)
        # Complete the production procedure using its accepted domain actions.
        for _ in range(100):
            fr.wait_for_function('!busy && !multiplyRunning')
            st=fr.evaluate('s')
            if st['complete']:break
            if st['phase']=='select':
                fr.locator(f'[data-top="{st["k"]}"]').click();fr.locator(f'[data-bottom="{st["row"]}"]').click()
            elif st['phase']=='product':
                if not st['revealed']:
                    learner.locator('#generateAnswer:enabled').click();fr.wait_for_function('s.revealed',polling=100)
                elif st['incoming'] and not st['mixed']:
                    if not st['onesPlaced']:fr.evaluate('worksheetDropDigit("ones",{kind:"slot",r:s.row,c:currentCol()},ones())')
                    else:fr.evaluate('addCarry("placed")')
                elif not st['onesPlaced']:fr.evaluate('worksheetDropDigit("ones",{kind:"slot",r:s.row,c:currentCol()},ones())')
                elif st['tensLocation']=='row' and st['k']!=len(st['A'])-1:fr.evaluate('worksheetDropDigit("tens",{kind:"carry",c:s.k+1},tens())')
                else:fr.evaluate('worksheetDropDigit("tens",lastDigit()?{kind:"slot",r:s.row,c:currentCol()+1}:{kind:"carry",c:s.k+1},tens())')
            elif st['phase']=='sum':fr.locator('#addRows').click()
            fr.wait_for_function('!busy');synced(learner,helper)
        assert fr.evaluate('s.complete && s.a===79 && s.b===18')
        synced(learner,helper);helper.screenshot(path=str(out/'helper-complete-1280.png'))
        helper.set_viewport_size({'width':2000,'height':1200});helper.screenshot(path=str(out/'helper-complete-2000.png'))
        assert other.evaluate('panaderyaCoBaker.observation.latest') is None
        # Normal page reload refreshes the order-generation clock only.
        before_save=json.loads(helper_save);after_save=json.loads(helper.evaluate('localStorage.panaderyaQuestV2'))
        before_save.pop('orderClock',None);after_save.pop('orderClock',None)
        assert after_save==before_save
        assert other.evaluate('localStorage.panaderyaQuestV2')==other_save
        # Refresh restores personal session via its ordinary save; observation never writes to it.
        assert helper.evaluate('JSON.stringify(document.querySelector("#worksheetFrame").contentWindow.getWorksheetSession().state)')==helper.evaluate('JSON.stringify(g.run.worksheetSession.state)')
        helper.locator('[data-observer-end]').click();wait(learner,'!panaderyaCoBaker.help.active');assert helper.locator('#coBakerObservation').count()==0
        assert helper.evaluate('panaderyaCoBaker.observation.latest') is None
        assert not errors,errors
        print('PASS isolated Edge/WebKit relay: shared calculator DOM, Golden Challenge attempts/success, live 79x18/digits/provisional/carry/Undo/completion, read-only, reconnect/refresh, privacy, own saves, endings and 1024/1280/2000 layouts')
        for ctx in contexts:ctx.close()
        edge.close();webkit.close()
finally:
    relay.terminate();relay.wait(timeout=10)
