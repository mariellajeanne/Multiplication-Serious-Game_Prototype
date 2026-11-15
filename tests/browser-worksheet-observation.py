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
    expected=learner.evaluate('CoBakerWorksheet.snapshot(document.querySelector("#worksheetFrame").contentWindow.getWorksheetSession())')
    assert expected, 'Invalid local snapshot'
    deadline=time.monotonic()+15
    while time.monotonic()<deadline:
        latest=helper.evaluate('panaderyaCoBaker.observation.latest')
        rendered=helper.evaluate('()=>{try{return CoBakerWorksheet.snapshot({state:document.querySelector("#coBakerObservation iframe")?.contentWindow?.eval("s")})}catch(_){return null}}')
        if latest==expected and rendered==expected:return expected
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
        learner.locator('#generateAnswer:enabled').click();wait(learner,'document.querySelector("#worksheetFrame").contentWindow.eval("s.revealed")');synced(learner,helper)
        # Probe synthetic input and parent input commands against the observer.
        before=helper.evaluate('JSON.stringify(panaderyaCoBaker.observation.latest)')
        helper.evaluate('''()=>{const f=document.querySelector('#coBakerObservation iframe');f.contentWindow.document.querySelector('[data-top]').click();f.contentWindow.postMessage({source:'bc-shell',type:'undo'},location.origin);f.contentWindow.postMessage({source:'bc-shell',type:'start',ticket:{a:1,b:1},attemptId:'intruder'},location.origin)}''')
        helper.wait_for_timeout(250);assert helper.evaluate('JSON.stringify(panaderyaCoBaker.observation.latest)')==before;synced(learner,helper)
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
        print('PASS isolated Edge/WebKit relay: snapshot, live 79x18/provisional/carries/Undo/completion, read-only, reconnect/refresh, privacy, helper/other saves and end')
        for ctx in contexts:ctx.close()
        edge.close();webkit.close()
finally:
    relay.terminate();relay.wait(timeout=10)
