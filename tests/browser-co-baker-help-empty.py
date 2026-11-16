"""Touch/empty-state regression; desktop engines, not physical Android validation."""
import os, sys, subprocess, socket, time, urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(root/'.test-tools/browsers'))
from playwright.sync_api import sync_playwright
out=root/'output/playwright/co-baker-help-empty';out.mkdir(parents=True,exist_ok=True)
with socket.socket() as free:
    free.bind(('127.0.0.1',0));port=free.getsockname()[1]
server=subprocess.Popen([sys.executable,'-m','http.server',str(port),'--bind','127.0.0.1'],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
url=f'http://127.0.0.1:{port}/index.html?cobaker=debug'
try:
    for _ in range(60):
        try: urllib.request.urlopen(url);break
        except OSError: time.sleep(.1)
    with sync_playwright() as pw:
        for engine in ('edge','webkit'):
            browser=pw.chromium.launch(channel='msedge') if engine=='edge' else pw.webkit.launch()
            for width,height in ((800,360),(1280,800),(2000,1200)):
                ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=True)
                # Same JS transport selection as APK; this stub does not test LAN.
                ctx.add_init_script("window.PanaderyaLan={start(){},stop(){},send(){},diagnostics(){return JSON.stringify({'Last error':'OFFSCREEN_DIAGNOSTIC','Device':'SM-T505'})},copyDetails(summary){window.copiedSummary=JSON.parse(summary);window.copiedNative=JSON.parse(this.diagnostics());window.dispatchEvent(new CustomEvent('co-baker-native',{detail:{kind:'copy-details',status:'copied'}}))}}")
                page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(url);page.locator('.hub-ticket').first.tap()
                page.wait_for_function('document.querySelector("#worksheetFrame")?.worksheetStarted===true')
                button=page.get_by_role('button',name='Call for Help',exact=True)
                button.tap()
                dialog=page.get_by_role('dialog');dialog.wait_for(state='visible')
                assert 'No Bakers nearby yet!' in dialog.inner_text()
                assert page.locator('[data-help-action="all"]').is_disabled()
                assert page.evaluate('panaderyaCoBakerHelpDiagnostic')=='Help popup rendered'
                assert page.locator('#worksheetFrame').count()==1
                page.screenshot(path=str(out/f'{engine}-{width}.png'))
                dialog.get_by_role('button',name='Close',exact=True).tap()
                # A completed/paused worksheet can retain its header: feedback must open.
                page.evaluate('g.run.paused=true');button.tap()
                assert 'Open or resume an unfinished order' in page.get_by_role('dialog').inner_text()
                page.evaluate('g.run.paused=false;openWorksheetSettings();openCoBakerHelp()')
                assert 'No Bakers nearby yet!' in page.get_by_role('dialog').inner_text()
                page.evaluate('closeModal();openSettings();sessionStorage.setItem("coBakerRemoteTestSettings",JSON.stringify({passphrase:"DO_NOT_COPY"}))')
                page.locator('#modals details').first.evaluate('(el)=>el.open=true')
                page.get_by_role('button',name='Co-Baker network test',exact=True).tap()
                assert page.get_by_role('button',name='Copy Details',exact=True).count()==1
                page.get_by_role('button',name='Copy Details',exact=True).tap()
                assert page.locator('#coBakerCopyStatus').inner_text()=='Copied!'
                copied=page.evaluate('({summary:copiedSummary,native:copiedNative})')
                assert copied['native']['Last error']=='OFFSCREEN_DIAGNOSTIC'
                assert copied['summary']['Transport']=='Android Native'
                assert 'DO_NOT_COPY' not in str(copied)
                assert page.evaluate('panaderyaCoBaker.profile.id') not in str(copied)
                page.screenshot(path=str(out/f'{engine}-{width}-copy.png'))
                assert not errors,errors
                ctx.close()
            browser.close()
    # Required skill client, reusing the repository's installed Edge adapter.
    if '--skill-client' in sys.argv: subprocess.run(['node','--experimental-loader',(root/'.test-tools/panaderya-playwright-loader.mjs').as_uri(),str(Path(os.environ['USERPROFILE'])/'.codex/skills/develop-web-game/scripts/web_game_playwright_client.js'),'--url',url,'--click-selector','.hub-ticket','--actions-json','{"steps":[{"buttons":[],"frames":2}]}','--iterations','1','--screenshot-dir',str(out/'skill-client')],cwd=root,check=True,timeout=60)
    print('PASS: touch help empty-state/feedback, modal replacement, no page errors: Edge/WebKit at 800x360, 1280x800, 2000x1200.')
finally:
    server.terminate();server.wait(timeout=10)
