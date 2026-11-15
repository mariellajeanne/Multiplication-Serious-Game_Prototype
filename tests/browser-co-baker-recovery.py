"""Phase 3C: independent clients, bounded session recovery and transport outages."""
import sys, os, subprocess, socket, time, urllib.request, json, tempfile
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', str(root / '.test-tools/browsers'))
from playwright.sync_api import sync_playwright
remote='--remote' in sys.argv
out = root / ('output/playwright/co-baker-recovery-remote' if remote else 'output/playwright/co-baker-recovery')
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
    helper.screenshot(path=str(out/'failure.png'));print('ERRORS',errors,flush=True)
    print('FRAME',helper.evaluate('''()=>{const outer=document.querySelector('#coBakerObservation iframe')?.contentWindow,inner=outer?.document.querySelector('#worksheetFrame')?.contentWindow;return {status:panaderyaCoBaker.status,active:panaderyaCoBaker.help.active,frame:inner?.location.href,mode:inner?.eval('typeof worksheetReadOnly'),bridge:inner?.eval('typeof observerMounted'),mounted:inner?.eval('typeof observerMounted!=="undefined"&&observerMounted'),valid:inner?.CoBakerWorksheet?.validSnapshot(panaderyaCoBaker.observation.latest),scripts:[...inner.document.scripts].map(s=>s.src)}}'''),flush=True)
    raise AssertionError((expected,latest,rendered))

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

def interrupt(p):
    p.context.set_offline(True)
    p.evaluate('panaderyaCoBaker.transport.socket.close()')
    wait(p,'["disconnected","unavailable"].includes(panaderyaCoBaker.status)')

def restore(p):
    p.context.set_offline(False)
    wait(p,'panaderyaCoBaker.status==="connected"')

def live(a,b,session):
    for p in (a,b):wait(p,'panaderyaCoBaker.help.active?.sessionId==='+json.dumps(session)+' && !panaderyaCoBaker.help.active.lostAt')
    synced(a,b)

def reserve(a,b):
    target=b.evaluate('panaderyaCoBaker.profile.id')
    wait(a,'panaderyaCoBaker.help.eligible('+json.dumps(target)+')')
    a.get_by_role('button',name='Call for Help',exact=True).click();call(a,target)
    b.locator('[data-help-accept]').click();synced(a,b);a.locator('#modals .close').click()
    return a.evaluate('panaderyaCoBaker.help.active.sessionId')

def stop_relay():
    if remote:
        relay.stdin.write('stop\n');relay.stdin.flush();assert relay.stdout.readline().strip()=='stopped'
    else:
        relay.terminate();relay.wait(timeout=10)

def start_relay():
    global relay
    if remote:
        relay.stdin.write('start\n');relay.stdin.flush();assert relay.stdout.readline().strip()=='started'
    else:
        relay=subprocess.Popen(['node','tools/co-baker-dev.mjs'],cwd=root,env={**os.environ,'PORT':str(port)},stdout=subprocess.DEVNULL,creationflags=flags)
        for _ in range(60):
            try:urllib.request.urlopen(base+'/__co-baker/config');break
            except OSError:time.sleep(.1)

def finish_order(p):
    fr=p.locator('#worksheetFrame').element_handle().content_frame()
    for _ in range(100):
        fr.wait_for_function('!busy && !multiplyRunning');st=fr.evaluate('s')
        if st['complete']:break
        if st['phase']=='select':
            fr.locator(f'[data-top="{st["k"]}"]').click();fr.locator(f'[data-bottom="{st["row"]}"]').click()
        elif st['phase']=='product':
            if not st['revealed']:
                p.locator('#generateAnswer:enabled').click();fr.wait_for_function('s.revealed',polling=100)
            elif st['incoming'] and not st['mixed']:
                if not st['onesPlaced']:fr.evaluate('worksheetDropDigit("ones",{kind:"slot",r:s.row,c:currentCol()},ones())')
                else:fr.evaluate('addCarry("placed")')
            elif not st['onesPlaced']:fr.evaluate('worksheetDropDigit("ones",{kind:"slot",r:s.row,c:currentCol()},ones())')
            elif st['tensLocation']=='row' and st['k']!=len(st['A'])-1:fr.evaluate('worksheetDropDigit("tens",{kind:"carry",c:s.k+1},tens())')
            else:fr.evaluate('worksheetDropDigit("tens",lastDigit()?{kind:"slot",r:s.row,c:currentCol()+1}:{kind:"carry",c:s.k+1},tens())')
        elif st['phase']=='sum':fr.locator('#addRows').click()
    assert fr.evaluate('s.complete && s.a===79 && s.b===18')
    wait(p,'g.run.procedureComplete')

try:
    if not remote:
        for _ in range(60):
            try:urllib.request.urlopen(base+'/__co-baker/config');break
            except OSError:time.sleep(.1)
    with sync_playwright() as pw:
        edge=pw.chromium.launch(channel='msedge');webkit=pw.webkit.launch()
        pages=[None]*3;contexts=[];errors=[]
        for i,browser in ((2,edge),(0,edge),(1,webkit)):
            ctx=browser.new_context(viewport={'width':2000 if i==1 else 1280,'height':1200 if i==1 else 800},has_touch=True,ignore_https_errors=True);contexts.append(ctx)
            p=ctx.new_page();pages[i]=p;p.on('pageerror',lambda e:errors.append(str(e)))
            p.goto(base+'/index.html?cobaker=debug&'+query);p.wait_for_selector('.hub-food');connect(p)
            if i==2:wait(p,'panaderyaCoBaker.coordinator.leader?.id===panaderyaCoBaker.profile.id')
        learner,helper,other=pages
        for width,height in ((2000,1200),(1280,800)):
            other.set_viewport_size({'width':width,'height':height});other.screenshot(path=str(out/f'home-{width}.png'))
        helper.locator('.hub-ticket').first.click();wait(helper,'document.querySelector("#worksheetFrame")?.worksheetStarted')
        helper.evaluate('captureActiveWorksheet();save()')
        own=helper.evaluate('JSON.stringify(g.run.worksheetSession.state)');save_before=json.loads(helper.evaluate('localStorage.panaderyaQuestV2'));other_before=other.evaluate('localStorage.panaderyaQuestV2')
        learner.evaluate('g.board[0].a=79;g.board[0].b=18;startTicket(g.board[0].id)')
        wait(learner,'document.querySelector("#worksheetFrame")?.worksheetStarted')
        session=reserve(learner,helper)
        fr=learner.locator('#worksheetFrame').element_handle().content_frame()
        fr.locator('[data-top="0"]').click();fr.locator('[data-bottom="0"]').click();learner.locator('#generateAnswer:enabled').click();fr.wait_for_function('s.revealed && !busy')
        synced(learner,helper)
        stale=helper.evaluate('({kind:"hint",sessionId:panaderyaCoBaker.help.active.sessionId,streamId:panaderyaCoBaker.observation.streamId,recipientId:panaderyaCoBaker.help.active.otherId,cueToken:panaderyaCoBaker.observation.cueToken,stateVersion:panaderyaCoBaker.observation.received,sequence:999,hint:"retry"})')
        # Real learner drag continues through the helper's transport interruption.
        tile=learner.locator('[data-answer-digit="ones"]').bounding_box();dest=fr.locator('[data-slot="0:0"]').bounding_box()
        learner.mouse.move(tile['x']+tile['width']/2,tile['y']+tile['height']/2);learner.mouse.down();learner.mouse.move(tile['x']+tile['width']/2-20,tile['y']+tile['height']/2,steps=3)
        wait(learner,'!!worksheetPointer?.ghost');interrupt(helper)
        wait(learner,'!!panaderyaCoBaker.help.active?.lostAt');assert learner.evaluate('!!worksheetPointer?.ghost')
        learner.screenshot(path=str(out/'learner-reconnecting.png'));helper.screenshot(path=str(out/'helper-paused.png'))
        learner.mouse.move(dest['x']+dest['width']/2,dest['y']+dest['height']/2,steps=5);learner.mouse.up();fr.wait_for_function('s.onesPlaced && !busy')
        fr.evaluate('worksheetDropDigit("tens",{kind:"slot",r:0,c:1},7)');fr.wait_for_function('!busy')
        restore(helper);live(learner,helper,session)
        assert helper.evaluate('panaderyaCoBaker.observation.latest.state.tensLocation')=='row'
        helper.evaluate('h=>panaderyaCoBaker.help.send(h.recipientId,h)',stale);helper.wait_for_timeout(150);assert not learner.locator('#coBakerProceduralHint').count()
        point(learner,helper,'slot:0:1',touch=True);point(learner,helper,'carry:1');point(learner,helper,'calculator:product')
        # Learner interruption: accepted local carry correction and Undo survive.
        interrupt(learner);wait(helper,'!!panaderyaCoBaker.help.active?.lostAt')
        learner.get_by_role('button',name='Undo',exact=True).click();fr.wait_for_function('!busy')
        restore(learner);live(learner,helper,session)
        # Each role refreshes its own page. Only local persistence supplies math.
        for p in (helper,learner):
            before=learner.evaluate('JSON.stringify(g.run.worksheetSession.state)');version=helper.evaluate('panaderyaCoBaker.observation.received')
            p.reload();p.wait_for_selector('.hub-food, #worksheetFrame');connect(p)
            live(learner,helper,session);assert helper.evaluate('panaderyaCoBaker.observation.received')>version
            assert learner.evaluate('JSON.stringify(g.run.worksheetSession.state)')==before
        fr=learner.locator('#worksheetFrame').element_handle().content_frame()
        assert helper.evaluate('JSON.stringify(g.run.worksheetSession.state)')==own
        # Third-party coordinator can leave and return with a new connection.
        other_id=other.evaluate('panaderyaCoBaker.profile.id');other.evaluate('panaderyaCoBaker.stop()')
        wait(learner,'panaderyaCoBaker.coordinator.snapshot().status==="Healthy" && panaderyaCoBaker.coordinator.leader?.id!=='+json.dumps(other_id))
        live(learner,helper,session);hint(learner,helper,'next')
        other.evaluate('panaderyaCoBaker.start()');wait(other,'panaderyaCoBaker.status==="connected"');live(learner,helper,session)
        forged=helper.evaluate('({kind:"watch",sessionId:panaderyaCoBaker.help.active.sessionId,streamId:panaderyaCoBaker.observation.streamId,watchVersion:9000})')
        learner_id=learner.evaluate('panaderyaCoBaker.profile.id')
        other.evaluate('([id,h])=>panaderyaCoBaker.help.send(id,h)',[learner_id,forged]);other.wait_for_timeout(200)
        assert other.evaluate('panaderyaCoBaker.observation.latest') is None
        # Relay restart in grace: election is offline until communication returns.
        stop_relay()
        for p in (learner,helper):wait(p,'["disconnected","unavailable"].includes(panaderyaCoBaker.status)')
        for p in (learner,helper):assert p.evaluate('panaderyaCoBaker.coordinator.snapshot().role')=='Offline'
        learner.get_by_role('button',name='Undo',exact=True).click();fr.wait_for_function('!busy')
        start_relay();live(learner,helper,session)
        # Repeat short losses; disconnected sessions cannot accumulate streams.
        for p in (helper,learner,helper):
            interrupt(p);restore(p);live(learner,helper,session)
        # End Helping while disconnected cannot be undone by reconnect.
        interrupt(helper);helper.locator('[data-observer-end]').click();restore(helper)
        wait(learner,'!panaderyaCoBaker.help.active');assert not helper.locator('#coBakerObservation').count()
        # A document requested during an interruption may load without its bridge.
        # Repair only the observer child, preserving both personal worksheets.
        failed_bridge=[]
        def missing_observer_bridge(route):
            if not failed_bridge and 'observe=1' in route.request.frame.url:
                failed_bridge.append(True);route.abort()
            else:route.continue_()
        helper.route('**/worksheet/src/parent-bridge.js',missing_observer_bridge)
        session=reserve(learner,helper)
        assert failed_bridge
        helper.unroute('**/worksheet/src/parent-bridge.js',missing_observer_bridge)
        assert helper.evaluate('JSON.stringify(g.run.worksheetSession.state)')==own
        # Prolonged outage uses real elapsed grace, no clock injection.
        stop_relay();wait(learner,'!!panaderyaCoBaker.help.active?.lostAt')
        for p in (learner,helper):wait(p,'!panaderyaCoBaker.help.active && !panaderyaCoBaker.help.isBusy()')
        assert not helper.locator('#coBakerObservation').count()
        assert learner.evaluate('!!document.querySelector("#worksheetFrame")?.worksheetStarted')
        start_relay()
        for p in (learner,helper):wait(p,'panaderyaCoBaker.status==="connected"')
        assert learner.evaluate('panaderyaCoBaker.help.active') is None
        session=reserve(learner,helper)
        # Completing the learner's order while the relay is down releases help;
        # reconnection must not repeat actions, seals or change the pending payout.
        stop_relay();wait(learner,'!!panaderyaCoBaker.help.active?.lostAt');finish_order(learner)
        wait(learner,'!panaderyaCoBaker.help.active')
        rewards=learner.evaluate('JSON.stringify(g.run.worksheetRewards)');pool=learner.evaluate('g.run.pool')
        learner.screenshot(path=str(out/'completed-during-outage.png'))
        start_relay();wait(helper,'!panaderyaCoBaker.help.active')
        assert learner.evaluate('JSON.stringify(g.run.worksheetRewards)')==rewards;assert learner.evaluate('g.run.pool')==pool
        learner.get_by_role('button',name='Save & Exit',exact=True).click()
        # Equal digits are distinct semantic elements at different columns/rows.
        learner.evaluate('const t=g.board.find(t=>t.id!==g.run.ticket.id);t.a=77;t.b=11;startTicket(t.id)')
        wait(learner,'document.querySelector("#worksheetFrame")?.worksheetStarted');session=reserve(learner,helper)
        for target in ('top:0','top:1','bottom:0','bottom:1','carry:1'):point(learner,helper,target,touch=True)
        assert learner.evaluate('WorksheetCues.resolve("top:0")!==WorksheetCues.resolve("top:1") && WorksheetCues.resolve("top:0").textContent===WorksheetCues.resolve("top:1").textContent')
        # Save & Exit is final even if a late watch arrives.
        learner.get_by_role('button',name='Save & Exit',exact=True).click();wait(helper,'!panaderyaCoBaker.help.active')
        assert learner.evaluate('g.run.paused && !!g.run.worksheetSession')
        after=json.loads(helper.evaluate('localStorage.panaderyaQuestV2'));save_before.pop('orderClock',None);after.pop('orderClock',None);assert after==save_before
        assert helper.evaluate('JSON.stringify(g.run.worksheetSession.state)')==own
        assert other.evaluate('localStorage.panaderyaQuestV2')==other_before
        assert not errors,errors
        print('PASS Phase 3C '+('remote TLS' if remote else 'local relay')+': three independent Edge/WebKit clients, helper/learner interruption, active drag/provisional carry/Undo, both page refreshes, version floors, stale cue, coordinator loss/return, relay restart, repeated cycles, end during outage, real grace expiry, missing observer bridge recovery, offline 79x18 completion, duplicate-digit targets, worksheet exit and independent saves',flush=True)
        for ctx in contexts:ctx.close()
        edge.close();webkit.close()
finally:
    relay.terminate();relay.wait(timeout=10)
    if temporary:temporary.cleanup()
