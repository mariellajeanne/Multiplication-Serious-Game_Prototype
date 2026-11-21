"""Actual isolated Edge learner / WebKit helper through local relay, current floating UI."""
import importlib.util,os,socket,subprocess,time,urllib.request
from pathlib import Path
spec=importlib.util.spec_from_file_location('tablet',Path(__file__).with_name('browser-tablet-repairs.py'))
t=importlib.util.module_from_spec(spec);spec.loader.exec_module(t)
with socket.socket() as free:free.bind(('127.0.0.1',0));port=free.getsockname()[1]
relay=subprocess.Popen(['node','tools/co-baker-dev.mjs'],cwd=t.s.ROOT,env={**os.environ,'PORT':str(port)},stdout=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))

def synced(p,q):
 q.wait_for_function('panaderyaCoBaker.observation.latest!==null')
 for _ in range(100):
  expected=p.evaluate('CoBakerWorksheet.snapshot(g.run.worksheetSession,panaderyaCoBaker.observation.presentation(g.run.worksheetSession))')
  actual=q.evaluate('panaderyaCoBaker.observation.latest')
  observed=q.locator('#coBakerObservation iframe').element_handle().content_frame()
  rendered=observed.evaluate('CoBakerWorksheet.snapshot({state:getObservedWorksheetState()},null)')
  if expected and actual==expected and rendered and rendered['state']==expected['state']:return observed
  q.wait_for_timeout(100)
 raise AssertionError((expected,actual,rendered))

try:
 for _ in range(60):
  try:urllib.request.urlopen(f'http://127.0.0.1:{port}/__co-baker/config');break
  except OSError:time.sleep(.1)
 with t.s.sync_playwright() as pw:
  edge=pw.chromium.launch(channel='msedge',headless=True);webkit=pw.webkit.launch();errors=[]
  contexts=[edge.new_context(viewport={'width':2000,'height':1200},has_touch=True),webkit.new_context(viewport={'width':1280,'height':800},has_touch=True)]
  pages=[c.new_page() for c in contexts];p,q=pages
  for page in pages:
   page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{port}/index.html?cobaker=debug&webrelay=1');t.ready(page);page.evaluate('skipWholeBakeryGuide(true)')
  t.fixture(p,79,18,True)
  helper=q.evaluate('panaderyaCoBaker.profile.id')
  p.wait_for_function('id=>panaderyaCoBaker.help.eligible(id)',arg=helper)
  p.get_by_role('button',name='Find a Helper',exact=True).click();p.locator(f'[data-help-to="{helper}"]').click()
  q.locator('[data-help-accept]').click();q.wait_for_selector('#coBakerObservation iframe');synced(p,q)
  p.locator('#modals .close').click()
  t.connect(p,True,True,True);view=synced(p,q)
  inner=view.locator('#worksheetFrame').element_handle().content_frame()
  assert inner.locator('#equationReveal').inner_text()=='8 × 9'
  t.frame(p).locator('#equationReveal').click();view=synced(p,q)
  inner=view.locator('#worksheetFrame').element_handle().content_frame()
  assert inner.locator('[data-golden-option]').count()==2
  protected="JSON.stringify([g.run.worksheetSession.state,g.run.factAnswers,g.run.worksheetRewards,g.coins])"
  before=p.evaluate(protected)
  inner.locator('[data-golden-option="auto"]').click();q.wait_for_timeout(150)
  assert p.evaluate(protected)==before
  t.frame(p).locator('[data-golden-option="manual"]').click();view=synced(p,q)
  assert view.locator('[data-calc-key]:enabled').count()==0
  for key in ['7','2','Enter']:p.locator(f'[data-calc-key="{key}"]').click();synced(p,q)
  p.wait_for_function("$('worksheetFrame').contentWindow.eval('s.revealed')")
  view=synced(p,q);inner=view.locator('#worksheetFrame').element_handle().content_frame()
  assert inner.locator('[data-part]').all_text_contents()==['7','2']
  t.drag(p,t.frame(p).locator('[data-part="ones"]'),t.frame(p).locator('[data-slot="0:0"]'),True);synced(p,q)
  t.drag(p,t.frame(p).locator('[data-part="tens"]'),t.frame(p).locator('[data-carry="1"]'),True);synced(p,q)
  p.locator('[data-worksheet-control="undo"]').click();p.wait_for_timeout(200);synced(p,q)
  t.frame(p).locator('[data-part="tens"]').click();t.frame(p).locator('[data-carry="1"]').click()
  p.wait_for_function("$('worksheetFrame').contentWindow.eval('s.phase')==='select'")
  t.connect(p);t.generate(p);view=synced(p,q)
  inner=view.locator('#worksheetFrame').element_handle().content_frame()
  assert inner.locator('[data-part]').all_text_contents()==['5','6']
  t.shot(p,'sync-learner');t.shot(q,'sync-helper')
  p.get_by_role('button',name='Find a Helper',exact=True).click()
  p.locator('[data-help-action="end"]').click();p.wait_for_timeout(800);p.locator('[data-help-action="end"]').click()
  p.wait_for_function('!panaderyaCoBaker.help.active');q.wait_for_selector('#coBakerObservation',state='detached')
  q.wait_for_function('document.getElementById("toasts").textContent.includes("The other Baker ended this help session.")')
  assert q.evaluate('panaderyaCoBaker.observation.latest') is None
  assert not errors,errors
  print('PASS actual Edge/WebKit relay: reverse connection, floating Golden choices, read-only helper, manual keypad/answer, normal generation, touch drags, Undo, session-end feedback and cleanup',flush=True)
  for c in contexts:c.close()
  edge.close();webkit.close()
finally:relay.terminate();relay.wait(timeout=10);t.s.server.shutdown()
