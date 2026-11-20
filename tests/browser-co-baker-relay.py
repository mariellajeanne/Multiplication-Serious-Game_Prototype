"""Real Edge + WebKit clients with independent storage against the local relay."""
import sys,os,json,subprocess,socket,time,urllib.request,atexit
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'.test-tools'));os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(root/'.test-tools/browsers'))
from playwright.sync_api import sync_playwright
with socket.socket() as free:free.bind(('127.0.0.1',0));port=free.getsockname()[1]
def launch():
 proc=subprocess.Popen(['node','tools/co-baker-dev.mjs'],cwd=root,env={**os.environ,'PORT':str(port)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 for _ in range(60):
  try:urllib.request.urlopen(f'http://127.0.0.1:{port}/__co-baker/config');return proc
  except Exception:time.sleep(.1)
 raise RuntimeError('Relay did not start')
relay=launch()
def cleanup():
 if relay.poll() is None:relay.terminate();relay.wait()
atexit.register(cleanup)
url=f'http://{sys.argv[1] if len(sys.argv)>1 else "127.0.0.1"}:{port}/index.html?cobaker=debug&webrelay=1'
out=root/'output/playwright/co-baker-relay';out.mkdir(parents=True,exist_ok=True)
def panel(p):
 p.locator('#settings-button').click();p.locator('.adult-tools summary').click();p.get_by_role('button',name='Co-Baker network test',exact=True).click()
with sync_playwright() as pw:
 a=pw.chromium.launch(channel='msedge');b=pw.webkit.launch();ca=a.new_context(viewport={'width':1280,'height':800});cb=b.new_context(viewport={'width':1280,'height':800});p=ca.new_page();q=cb.new_page();errors=[]
 for page in [p,q]:page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url);page.wait_for_selector('.hub-food');page.wait_for_load_state('networkidle')
 panel(p);panel(q);p.wait_for_selector('[data-peer]');q.wait_for_selector('[data-peer]')
 ida=p.evaluate('JSON.parse(localStorage.panaderyaPlayerV1)');idb=q.evaluate('JSON.parse(localStorage.panaderyaPlayerV1)');assert ida['id']!=idb['id']
 for x,y in [(p,q),(q,p)]:
  x.locator('[data-peer]').click();x.wait_for_function('document.querySelector("#coBakerTest").textContent.includes("Response received")');y.wait_for_function('document.querySelector("#coBakerTest").textContent.includes("Test received")')
 p.screenshot(path=str(out/'edge-messages.png'));q.screenshot(path=str(out/'webkit-messages.png'))
 # Same-profile tab does not create a second player, and does not mutate UUID.
 tab=ca.new_page();tab.goto(url);tab.wait_for_load_state('networkidle');q.wait_for_timeout(300);assert q.locator('[data-peer]').count()==1;assert tab.evaluate('JSON.parse(localStorage.panaderyaPlayerV1).id')==ida['id'];tab.close()
 q.locator('#modals .close').click();q.locator('#settings-button').click();q.locator('#bakerName').fill('Maria');q.get_by_role('button',name='Save name',exact=True).click();p.wait_for_function('document.querySelector(".co-baker-peers").textContent.includes("Maria")');panel_after=False
 # Browser-level offline/reconnect uses real WebSocket reconnect, without reloading game.
 relay.terminate();relay.wait();p.wait_for_function('!document.querySelector("[data-peer]")&&document.querySelector("#coBakerTest").textContent.includes("disconnected")',timeout=20000)
 p.locator('#modals .close').click();p.locator('[data-world-nav="orders"]').click();p.wait_for_function('!bakeryJourney');p.locator('.hub-ticket').first.click();p.wait_for_selector('#worksheetFrame');assert p.locator('.worksheet-modern').is_visible();p.locator('.worksheet-exit').click();panel(p)
 relay=launch();p.wait_for_selector('[data-peer]',timeout=20000)
 assert q.evaluate('JSON.parse(localStorage.panaderyaPlayerV1).id')==idb['id'];assert q.evaluate('g.coins')==250
 q.close();p.wait_for_selector('[data-peer]',state='detached');q=cb.new_page();q.goto(url);q.wait_for_load_state('networkidle');p.wait_for_selector('[data-peer]');assert q.evaluate('JSON.parse(localStorage.panaderyaPlayerV1).id')==idb['id']
 assert not errors,errors
 print('PASS real Edge/WebKit relay: discovery, messages both ways, same-profile dedupe, name update, disconnect/reconnect, restart identity and independent solo saves')
 ca.close();cb.close();a.close();b.close()
relay.terminate();relay.wait()
