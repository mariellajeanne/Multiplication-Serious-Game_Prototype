"""Phase 4 real-browser receipts over the existing local/remote test relay.
Run: python tests/browser-helper-rewards.py [--remote]
"""
import json, os, socket, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(ROOT/'.test-tools/browsers'))
from playwright.sync_api import sync_playwright
sys.path.insert(0,str(Path(__file__).resolve().parent));import scene_test_support as scene
REMOTE='--remote' in sys.argv
OUT=ROOT/('output/playwright/helper-rewards-followup-remote' if REMOTE else 'output/playwright/helper-rewards-followup')
OUT.mkdir(parents=True,exist_ok=True)
# Windows WebKit's persistent-context helper may create relative cache folders.
# Keep those browser artifacts inside the ignored output tree as well.
os.chdir(OUT)
flags=getattr(subprocess,'CREATE_NO_WINDOW',0)
temporary=None
if REMOTE:
    temporary=tempfile.TemporaryDirectory(dir=OUT)
    cert,key,config=[Path(temporary.name)/n for n in ('cert.pem','key.pem','openssl.cnf')]
    config.write_text('[req]\n')
    subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(key),'-out',str(cert),'-days','2','-subj','/CN=localhost','-config',str(config)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=flags)
    password='rewards-'+os.urandom(16).hex()
    server=subprocess.Popen(['node','tests/fixtures/co-baker-remote-browser-server.mjs',str(key),str(cert)],cwd=ROOT,env={**os.environ,'COBAKER_REMOTE_PASSPHRASE':password},stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,creationflags=flags)
    relay=json.loads(server.stdout.readline());url=relay['origin']+'/index.html?cobaker=debug&remoteRelay=1'
else:
    with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
    server=subprocess.Popen(['node','tools/co-baker-dev.mjs'],cwd=ROOT,env={**os.environ,'PORT':str(port)},stdout=subprocess.DEVNULL,creationflags=flags)
    url=f'http://127.0.0.1:{port}/index.html?cobaker=debug&webrelay=1'
    for _ in range(60):
        try:urllib.request.urlopen(url);break
        except OSError:time.sleep(.1)

def wait(p,expression):p.wait_for_function(expression,timeout=30000,polling=100)
def connect(p):
    if REMOTE:
        wait(p,'!!window.panaderyaCoBaker')
        if not p.evaluate('panaderyaCoBaker.transport.active'):
            p.evaluate('c=>{panaderyaCoBaker.transport.configure(c);panaderyaCoBaker.start()}',{'url':relay['endpoint'],'group':'reward-test','passphrase':password})
    wait(p,'panaderyaCoBaker.status==="connected"')

def reserve(a,b):
    target=b.evaluate('panaderyaCoBaker.profile.id')
    # Independent reward scenarios; spam timing is exercised by the protocol/UX suite.
    a.evaluate('id=>panaderyaCoBaker.help.directTimes.delete(id)',target)
    b.evaluate('id=>panaderyaCoBaker.help.callerTimes.delete(id)',a.evaluate('panaderyaCoBaker.profile.id'))
    wait(a,f'panaderyaCoBaker.help.eligible("{target}")')
    a.get_by_role('button',name='Find a Helper',exact=True).click()
    a.locator(f'[data-help-to="{target}"]').click();b.locator('[data-help-accept]').click()
    if b.locator('[data-help-accept].confirm-save').count():
        b.wait_for_timeout(700);b.locator('[data-help-accept].confirm-save').click()
    wait(b,'panaderyaCoBaker.observation.latest?.state.a===79 && Object.values(g.coBakerRewards?.inbox||{}).some(e=>e.context.sessionId===panaderyaCoBaker.help.active?.sessionId)')
    a.locator('#modals .close').click()

def fresh(a,b):
    wait(b,'panaderyaCoBaker.observation.received>0 && !panaderyaCoBaker.help.active?.lostAt')
    deadline=time.monotonic()+10
    while time.monotonic()<deadline:
        left=a.evaluate('CoBakerWorksheet.snapshot(g.run.worksheetSession)?.state')
        right=b.evaluate('panaderyaCoBaker.observation.latest?.state')
        if left==right:return
        b.wait_for_timeout(100)
    raise AssertionError((left,right))

def hint(a,b,key):
    fresh(a,b)
    wait(b,'panaderyaCoBaker.help.clock()-(panaderyaCoBaker.guidance.sentAt.hint??0)>=2500')
    b.locator('#coBakerHintSelect').select_option(key);b.locator('[data-observer-hint]').click()
    sequence=b.evaluate('panaderyaCoBaker.guidance.sequence')
    wait(a,f'panaderyaCoBaker.guidance.received==={sequence} && document.querySelector("#coBakerProceduralHint")?.textContent.endsWith(CoBakerWorksheet.hints[{json.dumps(key)}])')

def frame(p):return p.locator('#worksheetFrame').element_handle().content_frame()
def finish(p):
    f=frame(p)
    for _ in range(100):
        f.wait_for_function('!busy&&!multiplyRunning');s=f.evaluate('s')
        if s['complete']:break
        if s['phase']=='select':f.locator(f'[data-top="{s["k"]}"]').click();f.locator(f'[data-bottom="{s["row"]}"]').click()
        elif s['phase']=='product':
            if not s['revealed']:scene.generate(p)
            elif s['incoming'] and not s['mixed']:f.evaluate('addCarry(s.onesPlaced?"placed":"floating")')
            elif not s['onesPlaced']:f.evaluate('worksheetDropDigit("ones",{kind:"slot",r:s.row,c:currentCol()},ones())')
            else:f.evaluate('worksheetDropDigit("tens",lastDigit()?{kind:"slot",r:s.row,c:currentCol()+1}:{kind:"carry",c:s.k+1},tens())')
        elif s['phase']=='sum':f.locator('#addRows').click()
    wait(p,'g.run.procedureComplete')

def independent(p):
    return p.evaluate('JSON.stringify({mastery:g.mastery,luck:g.permanentLuck,completed:g.completed,foods:g.owned,packages:g.packages,practice:g.mathPractice,run:g.run})')

def receipt_count(p):return p.evaluate('Object.keys(g.coBakerRewards?.receivedRewards||{}).length')
def suggestion(p,key):wait(p,'Object.values(g.coBakerRewards.orders).some(o=>!!o.suggestions['+json.dumps(key)+'])')
def earned_count(p,n):wait(p,'Object.values(g.coBakerRewards.outbox).filter(e=>e.earned).length==='+str(n))

profiles=tempfile.TemporaryDirectory(dir=OUT,ignore_cleanup_errors=True)
contexts=[]
try:
    with sync_playwright() as pw:
        errors=[]
        def launch(role):
            options={'viewport':{'width':1280 if role=='learner' else 2000,'height':800 if role=='learner' else 1200},'has_touch':True,'ignore_https_errors':True}
            if role=='learner' and '--webkit' in sys.argv:
                ctx=pw.webkit.launch_persistent_context(str(Path(profiles.name)/role),**options)
            else:
                ctx=pw.chromium.launch_persistent_context(str(Path(profiles.name)/role),channel='chrome' if role=='learner' else 'msedge',**options)
            contexts.append(ctx);p=ctx.pages[0];p.on('pageerror',lambda e:errors.append(str(e)));p.goto(url);scene.ready(p);return ctx,p
        def join(p):connect(p)
        def paid(p,n):wait(p,'Object.keys(g.coBakerRewards?.receivedRewards||{}).length==='+str(n))
        third_browser=pw.chromium.launch(channel='msedge');third=third_browser.new_page(viewport={'width':1280,'height':800},ignore_https_errors=True)
        third.on('pageerror',lambda e:errors.append(str(e)));third.goto(url);scene.ready(third)
        if REMOTE:third.evaluate('c=>{panaderyaCoBaker.transport.configure(c);panaderyaCoBaker.start()}',{'url':relay['endpoint'],'group':'reward-test','passphrase':password})
        ac,a=launch('learner');bc,b=launch('helper')
        for p in (a,b,third):join(p)
        for width,height in ((2000,1200),(1280,800)):
            third.set_viewport_size({'width':width,'height':height});third.screenshot(path=str(OUT/f'home-{width}.png'))
        scene.open_ticket(b);b.evaluate('captureActiveWorksheet();save()')
        coins=b.evaluate('g.coins')
        a.evaluate('g.board[0].a=79;g.board[0].b=18;startTicket(g.board[0].id)');wait(a,'document.querySelector("#worksheetFrame")?.worksheetStarted')
        reserve(a,b);before=independent(b);quote=a.evaluate('g.run.coBakerRewards.base')
        hint(a,b,'carry');assert receipt_count(b)==0
        fresh(a,b);b.evaluate('panaderyaCoBaker.guidance.send("point","top:0")');suggestion(a,'0:0:connect')
        # Reported regression: actual Edge helper refresh BEFORE Chrome follows.
        b.reload();scene.ready(b);join(b)
        f=frame(a);f.locator('[data-top="0"]').click();f.locator('[data-bottom="0"]').click()
        earned_count(a,1);paid(b,1);assert b.evaluate('g.coins')==coins+a.evaluate('CoBakerRewards.reward('+str(quote)+',1)')
        assert not a.evaluate('g.run.procedureComplete');b.screenshot(path=str(OUT/'immediate-after-helper-refresh.png'))
        wait(b,'!!panaderyaCoBaker.help.active&&!panaderyaCoBaker.help.active.lostAt');fresh(a,b)
        a.get_by_role('button',name='Undo',exact=True).click();f.wait_for_function('s.phase==="select"&&!busy')
        hint(a,b,'next');f.locator('[data-top="0"]').click();f.locator('[data-bottom="0"]').click();a.wait_for_timeout(250);assert receipt_count(b)==1
        hint(a,b,'retry');suggestion(a,'0:0:reveal');bc.close();wait(a,'!panaderyaCoBaker.peers.size || !!panaderyaCoBaker.help.active?.lostAt')
        scene.generate(a);f.wait_for_function('s.revealed&&!busy');earned_count(a,2)
        # Earned coins survive actual browser process closure on both sides.
        a.get_by_role('button',name='Save & Exit',exact=True).click();a.reload();scene.ready(a);ac.close()
        third.wait_for_timeout(16000)
        ac,a=launch('learner');bc,b=launch('helper')
        for p in (a,b):join(p)
        paid(b,2);assert b.evaluate('g.coins')==coins+a.evaluate('CoBakerRewards.reward('+str(quote)+',2)')
        assert b.evaluate('panaderyaCoBaker.help.active') is None;assert a.evaluate('g.run.paused');assert independent(b)==before
        print('PASS refresh-before-action, immediate coins, helper browser close, Save & Exit, both process restarts, ordinary-peer delivery and independent worksheet',flush=True)
        a.evaluate('startTicket(g.run.ticket.id)');wait(a,'document.querySelector("#worksheetFrame")?.worksheetStarted');reserve(a,b)
        hint(a,b,'ones');suggestion(a,'0:0:place-ones')
        saved=a.evaluate('captureActiveWorksheet();JSON.stringify(g.run.worksheetSession)')
        a.evaluate('window.retainedFrame=document.querySelector("#worksheetFrame");document.querySelector("[data-learner-end]").click();document.querySelector("[data-learner-end]").click()')
        assert a.evaluate('!!panaderyaCoBaker.help.active');assert a.locator('[data-learner-end]').inner_text()=='Remove helper?'
        a.wait_for_timeout(700);a.locator('[data-learner-end]').click()
        if a.evaluate('!!panaderyaCoBaker.help.active'):
            print('REMOVAL',a.evaluate('({active:panaderyaCoBaker.help.active,label:document.querySelector("[data-learner-end]")?.textContent,log:panaderyaCoBaker.help.log,now:panaderyaCoBaker.help.clock()})'),flush=True)
        wait(a,'!panaderyaCoBaker.help.active');wait(b,'!panaderyaCoBaker.help.active');wait(b,'panaderyaCoBaker.observation.latest===null')
        assert a.evaluate('document.querySelector("#worksheetFrame")===retainedFrame');assert a.evaluate('JSON.stringify(g.run.worksheetSession)')==saved
        bc.close();wait(a,'!panaderyaCoBaker.help.active')
        f=frame(a);f.locator('[data-part="ones"]').click();f.locator('[data-slot="0:0"]').click();f.wait_for_function('s.onesPlaced&&!busy');earned_count(a,3)
        # A new helper owns observation; old helper returns ONLY to collect.
        reserve(a,third);new_session=a.evaluate('panaderyaCoBaker.help.active.sessionId')
        bc,b=launch('helper');join(b);paid(b,3)
        assert b.evaluate('panaderyaCoBaker.help.active') is None;assert b.evaluate('panaderyaCoBaker.observation.latest') is None
        assert not b.evaluate('panaderyaCoBaker.guidance.send("hint","next")');assert a.evaluate('panaderyaCoBaker.help.active.sessionId')==new_session
        third.evaluate('panaderyaCoBaker.help.end()');wait(a,'!panaderyaCoBaker.help.active');reserve(a,b)
        # Drop only reward delivery, leaving real guidance and worksheet input live.
        a.evaluate('()=>{window.rewardOriginalSend=panaderyaCoBaker.transport.send.bind(panaderyaCoBaker.transport);panaderyaCoBaker.transport.send=(id,m)=>{if(m.help?.kind!=="reward-earned")rewardOriginalSend(id,m)}}')
        hint(a,b,'carry');f.locator('[data-part="tens"]').click();f.locator('[data-carry="1"]').click();f.wait_for_function('s.k===1&&!busy');earned_count(a,4)
        hint(a,b,'next');f.locator('[data-top="1"]').click();f.locator('[data-bottom="0"]').click();earned_count(a,5)
        assert receipt_count(b)==3;bc.close();third.evaluate('panaderyaCoBaker.stop()')
        a.evaluate('()=>{panaderyaCoBaker.transport.send=rewardOriginalSend}');a.get_by_role('button',name='Save & Exit',exact=True).click();a.reload();scene.ready(a)
        bc,b=launch('helper');join(b);join(a);paid(b,5)
        expected=a.evaluate('CoBakerRewards.reward('+str(quote)+',5)');assert b.evaluate('g.coins')==coins+expected
        assert independent(b)==before;assert b.evaluate('panaderyaCoBaker.help.active') is None
        wait(a,'Object.values(g.coBakerRewards.outbox).every(e=>e.acknowledged)')
        b.screenshot(path=str(OUT/'ordinary-peer-pending-rewards.png'))
        payloads=a.evaluate('Object.values(g.coBakerRewards.outbox).map(e=>e.message)');target=b.evaluate('panaderyaCoBaker.profile.id')
        for payload in reversed(payloads):
            for _ in range(3):a.evaluate('([id,h])=>panaderyaCoBaker.help.send(id,h)',[target,payload])
        b.wait_for_timeout(300);assert b.evaluate('g.coins')==coins+expected
        # Ordinary completion still pays the learner once and never reissues help coins.
        a.evaluate('startTicket(g.run.ticket.id)');wait(a,'document.querySelector("#worksheetFrame")?.worksheetStarted');finish(a)
        learner_before=a.evaluate('g.coins');pool=a.evaluate('g.run.pool');a.locator('#collectRewards:enabled').click();a.locator('#acknowledgeWorksheetSummary').click();wait(a,'g.run===null')
        assert a.evaluate('g.coins')==learner_before+pool;assert b.evaluate('g.coins')==coins+expected;assert not errors,errors
        print('PASS '+('remote TLS' if REMOTE else 'local relay')+' '+('WebKit' if '--webkit' in sys.argv else 'Chrome')+'/Edge: expired-session suggestion, replacement helper without old access, multiple pending receipts, coordinator loss, 5% cap, duplicate/out-of-order delivery, 79x18 carrying/completion, no repeat bonus',flush=True)
        for ctx in contexts:
            try:ctx.close()
            except Exception:pass
        third_browser.close()
finally:
    server.terminate();server.wait(timeout=10)
    profiles.cleanup()
    if temporary:temporary.cleanup()
