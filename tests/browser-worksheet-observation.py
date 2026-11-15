"""Phase 3A: isolated profiles, actual relay, production procedure and viewer."""
import sys, os, subprocess, socket, time, urllib.request, json, tempfile
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', str(root / '.test-tools/browsers'))
from playwright.sync_api import sync_playwright
remote='--remote' in sys.argv
out = root / ('output/playwright/co-baker-observation-remote' if remote else 'output/playwright/co-baker-observation')
out.mkdir(parents=True, exist_ok=True)
with socket.socket() as free:
    free.bind(('127.0.0.1', 0)); port = free.getsockname()[1]
flags=getattr(subprocess,'CREATE_NO_WINDOW',0)
temporary=None
if remote:
    temporary=tempfile.TemporaryDirectory(dir=out)
    cert,key,config=[Path(temporary.name)/name for name in ('cert.pem','key.pem','openssl.cnf')]
    config.write_text('[req]\n')
    subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(key),'-out',str(cert),'-days','2','-subj','/CN=localhost','-config',str(config)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=flags)
    password='worksheet-test-'+os.urandom(16).hex()
    relay=subprocess.Popen(['node','tests/fixtures/co-baker-remote-browser-server.mjs',str(key),str(cert)],cwd=root,env={**os.environ,'COBAKER_REMOTE_PASSPHRASE':password},stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,creationflags=flags)
    server_config=json.loads(relay.stdout.readline());base=server_config['origin'];query='remoteRelay=1'
else:
    relay = subprocess.Popen(['node', 'tools/co-baker-dev.mjs'], cwd=root,
        env={**os.environ, 'PORT':str(port)}, stdout=subprocess.DEVNULL,creationflags=flags)
    base=f'http://127.0.0.1:{port}';query='webrelay=1'

def connect(p):
    if remote:
        wait(p,'!!window.panaderyaCoBaker')
        p.evaluate('config=>{panaderyaCoBaker.transport.configure(config);panaderyaCoBaker.start()}',{'url':server_config['endpoint'],'group':'worksheet-test','passphrase':password})

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

def ring(p, target):
    wait(p, '''()=>{const el=WorksheetCues.resolve(TARGET);return !!el?.ownerDocument.querySelector('.cobaker-point-ring[data-cobaker-target="'+TARGET+'"]')}'''.replace('TARGET',json.dumps(target)))

def point(learner, helper, target, touch=False):
    helper.wait_for_timeout(650)
    observer=helper.locator('#coBakerObservation iframe').element_handle().content_frame()
    # Bounding boxes are local automation input only; network messages carry
    # semantic identifiers, with different learner/helper viewport sizes.
    where=observer.evaluate('target=>{const el=WorksheetCues.resolve(target);if(!el)return null;return {nested:el.ownerDocument!==document}}',target)
    assert where is not None,target
    doc=observer.locator('#worksheetFrame').element_handle().content_frame() if where['nested'] else observer
    selectors={'calculator:product':'#calculationAnswer','calculator:tray':'.worksheet-digit-tray','calculator:ones':'[data-answer-digit="ones"]','calculator:tens':'[data-answer-digit="tens"]','calculator:carry':'.carry-source','control:generate':'#generateAnswer','control:undo':'[data-worksheet-control="undo"]','control:add':'#addRows'}
    parts=target.split(':');selector=selectors.get(target) or f'[data-{parts[0]}="{":".join(parts[1:])}"]'
    doc.locator(selector).wait_for(state='visible')
    box=doc.locator(selector).bounding_box()
    for _ in range(20):
        if box:break
        helper.wait_for_timeout(50);box=doc.locator(selector).bounding_box()
    assert box,target
    before=learner.evaluate('({save:localStorage.panaderyaQuestV2,state:JSON.stringify(g.run.worksheetSession.state),rewards:JSON.stringify(g.run.worksheetRewards)})')
    own=helper.evaluate('localStorage.panaderyaQuestV2')
    x,y=box['x']+box['width']/2,box['y']+box['height']/2
    if touch:helper.touchscreen.tap(x,y)
    else:helper.mouse.click(x,y)
    ring(learner,target)
    wait(helper,'''target=>{const d=document.querySelector('#coBakerObservation iframe').contentWindow.WorksheetCues.resolve(target)?.ownerDocument;return !!d?.querySelector('.cobaker-point-ring')}'''.replace('target=>','()=>').replace('resolve(target)',f'resolve({json.dumps(target)})'))
    assert learner.evaluate('({save:localStorage.panaderyaQuestV2,state:JSON.stringify(g.run.worksheetSession.state),rewards:JSON.stringify(g.run.worksheetRewards)})')==before
    assert helper.evaluate('localStorage.panaderyaQuestV2')==own

def hint(learner,helper,key='ones'):
    wait(helper,'panaderyaCoBaker.help.clock()-(panaderyaCoBaker.guidance.sentAt.hint??0)>=2500')
    helper.locator('#coBakerHintSelect').select_option(key)
    helper.locator('[data-observer-hint]').click()
    learner.wait_for_selector('#coBakerProceduralHint')
    wait(learner,'document.querySelector("#coBakerProceduralHint")?.textContent.endsWith(CoBakerWorksheet.hints['+json.dumps(key)+'])')
    assert learner.locator('#coBakerProceduralHint').inner_text().endswith(learner.evaluate('key=>CoBakerWorksheet.hints[key]',key))
    assert helper.locator('#coBakerCueStatus').inner_text()=='Hint sent'
    assert learner.locator('#coBakerProceduralHint').count()==1
    assert learner.evaluate('''()=>{const h=document.querySelector('#coBakerProceduralHint'),r=h.getBoundingClientRect(),bar=document.querySelector('.worksheet-complete-bar'),left=bar.querySelector('[data-worksheet-control="undo"]').getBoundingClientRect(),right=bar.querySelector('#collectRewards').getBoundingClientRect();return getComputedStyle(h).pointerEvents==='none'&&r.left>=left.right&&r.right<=right.left&&r.top>=bar.getBoundingClientRect().top&&r.bottom<=innerHeight}''')

try:
    if not remote:
        for _ in range(60):
            try: urllib.request.urlopen(f'http://127.0.0.1:{port}/__co-baker/config'); break
            except OSError: time.sleep(.1)
    with sync_playwright() as pw:
        edge=pw.chromium.launch(channel='msedge'); webkit=pw.webkit.launch()
        pages=[None]*3; contexts=[]; errors=[]
        # Start the unrelated Baker first so it is the incumbent coordinator.
        for i,browser in ((2,edge),(0,edge),(1,webkit)):
            ctx=browser.new_context(viewport={'width':1280,'height':800},has_touch=True,ignore_https_errors=True);contexts.append(ctx)
            p=ctx.new_page();pages[i]=p;p.on('pageerror',lambda e:errors.append(str(e)))
            p.goto(base+'/index.html?cobaker=debug&'+query);p.wait_for_selector('.hub-food');connect(p)
            if i==2:wait(p,'panaderyaCoBaker.coordinator.leader?.id===panaderyaCoBaker.profile.id')
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
        helper.set_viewport_size({'width':1024,'height':768})
        for i,target in enumerate(('top:1','bottom:1','carry:1','slot:0:3','control:undo')):point(learner,helper,target,touch=i%2==0)
        # A periodic watch with unchanged worksheet content must not detach a
        # target while a helper is touching it.
        helper.wait_for_timeout(650)
        inner=helper.locator('#coBakerObservation iframe').element_handle().content_frame().locator('#worksheetFrame').element_handle().content_frame()
        box=inner.locator('[data-top="1"]').bounding_box()
        helper.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);helper.mouse.down()
        version=helper.evaluate('panaderyaCoBaker.observation.received')
        inner.evaluate('selector=>window.heldPointTarget=document.querySelector(selector)','[data-top="1"]')
        helper.evaluate('panaderyaCoBaker.observation.lastRequest=0;panaderyaCoBaker.observation.refresh()')
        wait(helper,'panaderyaCoBaker.observation.received>'+str(version));helper.wait_for_timeout(100)
        assert inner.evaluate('selector=>heldPointTarget===document.querySelector(selector)','[data-top="1"]')
        helper.mouse.up();ring(learner,'top:1')
        # The learner can still use the highlighted operand directly.
        before=learner.evaluate('localStorage.panaderyaQuestV2');hint(learner,helper,'carry')
        assert learner.evaluate('localStorage.panaderyaQuestV2')==before
        learner.screenshot(path=str(out/'learner-pointer-hint.png'));helper.screenshot(path=str(out/'helper-pointing-1024.png'))
        # Third Baker forges otherwise valid reservation data; it cannot guide.
        forged=helper.evaluate('({kind:"hint",sessionId:panaderyaCoBaker.help.active.sessionId,streamId:panaderyaCoBaker.observation.streamId,cueToken:panaderyaCoBaker.observation.cueToken,stateVersion:panaderyaCoBaker.observation.received,recipientId:panaderyaCoBaker.help.active.otherId,sequence:9000,hint:"retry"})')
        learner_id=learner.evaluate('panaderyaCoBaker.profile.id')
        text=learner.locator('#coBakerProceduralHint').inner_text()
        other.evaluate('([id,h])=>panaderyaCoBaker.help.send(id,h)',[learner_id,forged]);helper.wait_for_timeout(200)
        assert learner.locator('#coBakerProceduralHint').inner_text()==text
        other.evaluate('([id,h])=>panaderyaCoBaker.help.send(id,{...h,kind:"point",hint:undefined,target:"top:0"})',[learner_id,forged]);helper.wait_for_timeout(200)
        assert learner.evaluate('WorksheetCues.resolve("top:0").ownerDocument.querySelector(".cobaker-point-ring")?.dataset.cobakerTarget')!='top:0'
        # A rapid repeated send is limited locally; no notification stack.
        helper.locator('[data-observer-hint]').click();assert helper.locator('#coBakerCueStatus').inner_text()=='Wait a moment…'
        assert learner.locator('#coBakerProceduralHint').count()==1
        learner.wait_for_selector('#coBakerProceduralHint',state='detached',timeout=6000)
        wait(learner,'!WorksheetCues.resolve("top:0").ownerDocument.querySelector(".cobaker-point-ring")')
        helper.set_viewport_size({'width':1280,'height':800})
        fr=learner.locator('#worksheetFrame').element_handle().content_frame()
        fr.locator('[data-top="0"]').click();fr.locator('[data-bottom="0"]').click()
        wait(learner,'g.run.worksheetSession.state.phase==="product"')
        # Deterministic offer fixture; production challenge acceptance/answer rules run unchanged.
        learner.evaluate('const a=ensureFactAnswer(g.run,g.run.steps[0]);a.offered=true;a.multiplier=3;paintWorksheetExperience()')
        synced(learner,helper);helper.screenshot(path=str(out/'helper-golden-offer.png'))
        observer=helper.locator('#coBakerObservation iframe').element_handle().content_frame()
        assert observer.locator('#goldenChallenge').is_disabled()
        assert observer.locator('#generateAnswer').is_disabled()
        point(learner,helper,'control:generate',touch=True);point(learner,helper,'calculator:product')
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
        for target in ('calculator:tray','calculator:tens','calculator:ones','slot:0:0'):point(learner,helper,target,touch=True)
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
        tile=learner.locator('[data-answer-digit="ones"]').bounding_box();destination=fr.locator('[data-slot="0:0"]').bounding_box()
        learner.mouse.move(tile['x']+tile['width']/2,tile['y']+tile['height']/2);learner.mouse.down()
        learner.mouse.move(tile['x']+tile['width']/2-20,tile['y']+tile['height']/2,steps=3)
        wait(learner,'!!worksheetPointer?.ghost')
        point(learner,helper,'slot:0:0',touch=True);hint(learner,helper,'place')
        assert learner.evaluate('!!worksheetPointer?.ghost && worksheetPointer.tile.hasPointerCapture(worksheetPointer.id)')
        learner.mouse.move(destination['x']+destination['width']/2,destination['y']+destination['height']/2,steps=6);learner.mouse.up()
        fr.wait_for_function('s.onesPlaced && s.rows[0][0]===2 && !busy')
        fr.evaluate('worksheetDropDigit("tens",{kind:"slot",r:0,c:1},7)');fr.wait_for_function('!busy');synced(learner,helper)
        learner.screenshot(path=str(out/'learner-79x18.png'));helper.screenshot(path=str(out/'helper-provisional-1280.png'))
        point(learner,helper,'slot:0:1');point(learner,helper,'carry:1')
        learner.get_by_role('button',name='Undo',exact=True).click();fr.wait_for_function('!busy');synced(learner,helper)
        helper.evaluate('window.oldSocket=panaderyaCoBaker.transport.socket;oldSocket.close()')
        wait(helper,'panaderyaCoBaker.transport.socket!==oldSocket && panaderyaCoBaker.status==="connected"');synced(learner,helper)
        helper.reload();connect(helper);helper.wait_for_selector('#coBakerObservation iframe');synced(learner,helper)
        point(learner,helper,'top:1');hint(learner,helper,'next')
        # Departure of the unrelated coordinator leaves guidance and math intact.
        other_id=other.evaluate('panaderyaCoBaker.profile.id')
        assert other.evaluate('panaderyaCoBaker.coordinator.leader?.id===panaderyaCoBaker.profile.id')
        other.evaluate('panaderyaCoBaker.stop()');wait(learner,'!!panaderyaCoBaker.coordinator.leader && panaderyaCoBaker.coordinator.leader.id!=='+json.dumps(other_id))
        assert learner.evaluate('panaderyaCoBaker.help.active.sessionId')==helper.evaluate('panaderyaCoBaker.help.active.sessionId')
        point(learner,helper,'carry:1');hint(learner,helper,'retry')
        # End with live cues: clear immediately, then ignore delayed messages.
        learner.evaluate('panaderyaCoBaker.help.end()');wait(helper,'!panaderyaCoBaker.help.active')
        assert learner.locator('#coBakerProceduralHint').count()==0
        assert learner.evaluate('WorksheetCues.resolve("top:1").ownerDocument.querySelector(".cobaker-point-ring")') is None
        helper.evaluate('([id,h])=>panaderyaCoBaker.help.send(id,h)',[learner_id,forged]);helper.wait_for_timeout(100)
        assert learner.locator('#coBakerProceduralHint').count()==0
        learner.get_by_role('button',name='Call for Help',exact=True).click();call(learner,helper_id);helper.locator('[data-help-accept]').click();synced(learner,helper);learner.locator('#modals .close').click()
        # Complete the production procedure using its accepted domain actions.
        carry_pointed=False
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
                    if not carry_pointed:
                        synced(learner,helper);point(learner,helper,'calculator:carry',touch=True);carry_pointed=True
                    if not st['onesPlaced']:fr.evaluate('worksheetDropDigit("ones",{kind:"slot",r:s.row,c:currentCol()},ones())')
                    else:fr.evaluate('addCarry("placed")')
                elif not st['onesPlaced']:fr.evaluate('worksheetDropDigit("ones",{kind:"slot",r:s.row,c:currentCol()},ones())')
                elif st['tensLocation']=='row' and st['k']!=len(st['A'])-1:fr.evaluate('worksheetDropDigit("tens",{kind:"carry",c:s.k+1},tens())')
                else:fr.evaluate('worksheetDropDigit("tens",lastDigit()?{kind:"slot",r:s.row,c:currentCol()+1}:{kind:"carry",c:s.k+1},tens())')
            elif st['phase']=='sum':
                synced(learner,helper);point(learner,helper,'control:add');point(learner,helper,'slot:1:1',touch=True);fr.locator('#addRows').click()
            fr.wait_for_function('!busy');synced(learner,helper)
        assert fr.evaluate('s.complete && s.a===79 && s.b===18')
        assert carry_pointed
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
        print('PASS isolated Edge/WebKit relay: mouse/touch semantic pointing across resolutions, calculator/tray/carry/partial rows/controls, hints, unauthorized sender, cooldown, expiry/ending cleanup, coordinator failover, shared calculator DOM, Golden Challenge, 79x18/Undo/completion, reconnect/refresh, independent saves and 1024/1280/2000 layouts')
        for ctx in contexts:ctx.close()
        edge.close();webkit.close()
finally:
    relay.terminate();relay.wait(timeout=10)
    if temporary:temporary.cleanup()
