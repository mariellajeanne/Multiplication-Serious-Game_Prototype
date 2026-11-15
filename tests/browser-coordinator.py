"""Actual Chrome/Edge isolated profiles; local relay only, no Android LAN claim."""
import sys, os, subprocess, socket, time, urllib.request, atexit
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(root/'.test-tools/browsers'))
from playwright.sync_api import sync_playwright
with socket.socket() as s:
 s.bind(('127.0.0.1',0));port=s.getsockname()[1]
relay=None
def launch():
 proc=subprocess.Popen(['node','tools/co-baker-dev.mjs'],cwd=root,env={**os.environ,'PORT':str(port)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 for _ in range(60):
  try:
   urllib.request.urlopen(f'http://127.0.0.1:{port}/__co-baker/config');return proc
  except Exception:time.sleep(.1)
 proc.terminate();proc.wait();raise RuntimeError('Relay failed to start')
def cleanup():
 if relay and relay.poll() is None:relay.terminate();relay.wait()
atexit.register(cleanup)
relay=launch();url=f'http://127.0.0.1:{port}/index.html?cobaker=debug&webrelay=1'
out=root/'output/playwright/coordinator';out.mkdir(parents=True,exist_ok=True)
def panel(p):
 p.wait_for_selector('.hub-food');p.locator('#settings-button').click();p.locator('.adult-tools summary').click();p.get_by_role('button',name='Co-Baker network test',exact=True).click()
def state(p):return p.locator('#coBakerCoordinator').evaluate('(e)=>({...e.dataset})')
def agree(pages,expected=None,timeout=22):
 deadline=time.monotonic()+timeout
 while time.monotonic()<deadline:
  values=[state(p) for p in pages]
  if values[0]['leader'] and all(x['leader']==values[0]['leader'] and x['term']==values[0]['term'] and x['status']=='Healthy' for x in values) and sum(x['role']=='Coordinator' for x in values)==1 and (expected is None or values[0]['leader']==expected):return values[0]['leader']
  pages[0].wait_for_timeout(200)
 raise AssertionError(values)
with sync_playwright() as pw:
 chrome=pw.chromium.launch(channel='chrome');edge=pw.chromium.launch(channel='msedge');errors=[]
 contexts=[chrome.new_context(viewport={'width':1280,'height':800}),edge.new_context(viewport={'width':1280,'height':800})]
 pages=[]
 for ctx in contexts:
  p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.goto(url,wait_until='domcontentloaded');pages.append(p)
 for p in pages:panel(p)
 identities=[p.evaluate('JSON.parse(localStorage.panaderyaPlayerV1)') for p in pages]
 leader=agree(pages);print('PASS Chrome/Edge startup: one agreed coordinator',flush=True)
 for p in pages:
  p.locator('[data-peer]').click();p.wait_for_function('document.querySelector("#coBakerTest").textContent.includes("Response received")')
 pages[0].screenshot(path=str(out/'chrome-two-bakers.png'));pages[1].screenshot(path=str(out/'edge-two-bakers.png'))
 # Relay stays alive. Close just the elected Baker, then reopen same profile.
 index=next(i for i,p in enumerate(pages) if state(p)['role']=='Coordinator');old=pages[index];remaining=pages[1-index];old.close()
 replacement=agree([remaining]);assert replacement!=leader
 returned=contexts[index].new_page();returned.on('pageerror',lambda e:errors.append(str(e)));returned.goto(url);panel(returned);pages[index]=returned
 assert returned.evaluate('JSON.parse(localStorage.panaderyaPlayerV1)')==identities[index]
 agree(pages,replacement);print('PASS Baker disconnect / failover / returning identity adopts replacement',flush=True)
 # Third isolated browser context; ordinary join does not preempt the incumbent.
 contexts.append(chrome.new_context(viewport={'width':2000,'height':1200}));third=contexts[2].new_page();third.on('pageerror',lambda e:errors.append(str(e)));third.goto(url);panel(third);pages.append(third);agree(pages,replacement)
 index=next(i for i,p in enumerate(pages) if state(p)['role']=='Coordinator');pages[index].close();survivors=[p for i,p in enumerate(pages) if i!=index]
 replacement=agree(survivors);returned=contexts[index].new_page();returned.goto(url);panel(returned);pages[index]=returned;agree(pages,replacement)
 third.screenshot(path=str(out/'three-bakers.png'));print('PASS three Bakers: departure, replacement, sticky return',flush=True)
 # Same-profile tabs stay passive, then take over the connection on active tab close.
 index=next(i for i,p in enumerate(pages) if state(p)['role']!='Coordinator');duplicate=contexts[index].new_page();duplicate.goto(url);panel(duplicate)
 duplicate.wait_for_function('document.querySelector("#coBakerCoordinator").dataset.role==="Offline"');assert duplicate.locator('[data-peer]').count()==0
 pages[index].close();pages[index]=duplicate;agree(pages,replacement);print('PASS same-profile tab deduplication and automatic connection takeover',flush=True)
 # Refresh and temporary transport drop use the real adapter, not simulated peers.
 pages[index].reload();panel(pages[index]);agree(pages,replacement)
 pages[index].goto('about:blank');pages[(index+1)%3].wait_for_timeout(3000);pages[index].goto(url);panel(pages[index]);agree(pages,replacement)
 # Pause the real leader renderer via CDP to simulate suspended JavaScript, then resume.
 index=next(i for i,p in enumerate(pages) if state(p)['role']=='Coordinator');frozen=pages[index];cdp=contexts[index].new_cdp_session(frozen)
 cdp.send('Debugger.enable');cdp.send('Debugger.pause');survivors=[p for p in pages if p!=frozen];next_leader=agree(survivors,timeout=26)
 assert next_leader!=replacement;cdp.send('Debugger.resume');cdp.send('Debugger.disable');cdp.detach();agree(pages,next_leader)
 print('PASS refresh, temporary disconnect, paused-renderer coordinator timeout and resume',flush=True)
 # Keep a real loaded worksheet active when the shared HTTP/relay process stops.
 p=pages[0];p.locator('#modals .close').click();p.locator('.hub-ticket').first.click();p.wait_for_function('document.querySelector("#worksheetFrame")?.worksheetStarted===true')
 fr=p.locator('#worksheetFrame').element_handle().content_frame()
 relay.terminate();relay.wait()
 for q in pages[1:]:q.wait_for_function('document.querySelector("#coBakerCoordinator").dataset.role==="Offline"',timeout=20000)
 pages[1].screenshot(path=str(out/'relay-unavailable.png'))
 fr.locator('[data-top="0"]').click();fr.locator('[data-bottom="0"]').click();p.wait_for_selector('#generateAnswer:enabled');p.locator('#generateAnswer').click();p.wait_for_function('document.querySelector("#worksheetFrame").contentWindow.eval("s.revealed")')
 p.screenshot(path=str(out/'solo-worksheet-during-outage.png'));p.locator('.worksheet-exit').click();panel(p)
 p.wait_for_function('document.querySelector("#coBakerCoordinator").dataset.role==="Offline"')
 relay=launch();agree(pages,timeout=25);p.locator('#modals .close').click();panel(p);print('PASS relay outage / solo worksheet / automatic reconnect and agreement',flush=True)
 for p in pages:
  assert p.evaluate('g.coins')==250
  p.locator('#coBakerCoordinator summary').click();p.wait_for_timeout(1600);assert p.locator('#coBakerCoordinator details').get_attribute('open') is not None
 assert not errors,errors
 pages[0].screenshot(path=str(out/'final-coordinator-details.png'))
 for ctx in contexts:ctx.close()
 chrome.close();edge.close()
cleanup()
print('PASS all Phase 1B real-browser scenarios; no game rewards/save transfers or page errors')
