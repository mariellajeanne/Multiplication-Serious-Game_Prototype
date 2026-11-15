"""Real isolated browsers through a LOCAL TLS proxy, not Cloudflare/GitHub Pages.

Requires openssl and the repo's existing Python Playwright installation.
Optional --legacy PATH runs a historical relay to reproduce version mismatch.
"""
import sys, os, json, subprocess, tempfile, time
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', str(root / '.test-tools/browsers'))
from playwright.sync_api import sync_playwright
out = root / 'output/playwright/co-baker-remote'
out.mkdir(parents=True, exist_ok=True)
legacy = sys.argv[sys.argv.index('--legacy') + 1] if '--legacy' in sys.argv else None
password = 'browser-test-' + os.urandom(16).hex()
flags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)

def panel(p):
    p.locator('#settings-button').click()
    p.locator('.adult-tools summary').click()
    p.get_by_role('button', name='Co-Baker network test', exact=True).click()

def connect(p, endpoint, secret=password, group='browser-test'):
    p.locator('#coBakerRelayUrl').fill(endpoint)
    p.locator('#coBakerTestGroup').fill(group)
    p.locator('#coBakerTestPassword').fill(secret)
    p.get_by_role('button', name='Connect to test Bakers', exact=True).click()

def state(p):
    return p.evaluate('''() => {const d=panaderyaCoBaker; return {
      id:d.profile.id, session:d.session, status:d.status, error:d.error,
      peers:[...d.peers.keys()], coordinator:d.coordinator.snapshot(),
      phase:d.transport.phase, help:[...d.help.presence.values()]}}''')

def agree(pages, timeout=30):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        states = [state(p) for p in pages]
        cs = [s['coordinator'] for s in states]
        if (cs[0]['leader'] and all(c['leader'] and c['leader']['id'] == cs[0]['leader']['id'] and
            c['leader']['term'] == cs[0]['leader']['term'] and c['status'] == 'Healthy' for c in cs)
            and sum(c['role'] == 'Coordinator' for c in cs) == 1
            and all(len(s['peers']) == len(pages)-1 and not s['error'] for s in states)):
            return cs[0]['leader']['id']
        pages[0].wait_for_timeout(150)
    raise AssertionError(states)

with tempfile.TemporaryDirectory(dir=out) as tmp:
    cert, key, config = [Path(tmp) / name for name in ('cert.pem', 'key.pem', 'openssl.cnf')]
    config.write_text('[req]\n')
    subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', str(key),
                    '-out', str(cert), '-days', '2', '-subj', '/CN=localhost', '-config', str(config)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=flags)
    command = ['node', 'tests/fixtures/co-baker-remote-browser-server.mjs', str(key), str(cert)]
    if legacy: command.append(str(Path(legacy).resolve()))
    server = subprocess.Popen(command, cwd=root, env={**os.environ, 'COBAKER_REMOTE_PASSPHRASE': password},
                              stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, creationflags=flags)
    try:
        config = json.loads(server.stdout.readline())
        url = config['origin'] + '/index.html?cobaker=debug&remoteRelay=1'
        endpoint = config['endpoint']
        with sync_playwright() as pw:
            chrome = pw.chromium.launch(channel='chrome')
            edge = pw.chromium.launch(channel='msedge')
            webkit = pw.webkit.launch()
            errors, contexts, pages = [], [], []
            def new(browser, size=(1280,800), context=None):
                if context is None:
                    context = browser.new_context(ignore_https_errors=True, viewport={'width':size[0],'height':size[1]})
                    contexts.append(context)
                p = context.new_page()
                p.on('pageerror', lambda e: errors.append(str(e)))
                p.goto(url); p.wait_for_selector('.hub-food')
                p.screenshot(path=str(out / f'home-{size[0]}x{size[1]}.png'))
                panel(p)
                return p
            for browser in (chrome, edge):
                p = new(browser); pages.append(p); connect(p, endpoint)
            if legacy:
                pages[0].wait_for_timeout(6500)
                states = [state(p) for p in pages]
                print(json.dumps(states, indent=2), flush=True)
                assert any(s['status'] == 'unavailable' for s in states)
                assert all(not s['peers'] for s in states)
                pages[1].screenshot(path=str(out/'legacy-relay-rejection.png'))
                print('PASS reproduced historical relay incompatibility after WebSocket upgrade', flush=True)
            else:
                agree(pages)
                assert state(pages[0])['id'] != state(pages[1])['id']
                for p in pages:
                    p.locator('[data-peer]').click()
                    p.wait_for_function('panaderyaCoBaker.messages.some(m=>m.text==="Response received")')
                print('PASS Chrome/Edge isolated profiles: secure remote registration, discovery, bidirectional messages, agreement', flush=True)
                for browser, size in ((webkit,(1280,800)),(chrome,(2000,1200))):
                    p = new(browser, size); pages.append(p); connect(p, endpoint)
                agree(pages)
                assert len({state(p)['id'] for p in pages}) == 4
                pages[3].screenshot(path=str(out/'four-bakers-2000.png'))
                pages[0].screenshot(path=str(out/'four-bakers-1280.png'))
                print('PASS four Bakers across Chrome/Edge/WebKit', flush=True)
                # No connection churn from repeated submits; closing the popup keeps the socket alive.
                p = pages[0]; before = state(p)['session']
                for _ in range(4):
                    p.get_by_role('button', name='Connect to test Bakers', exact=True).click()
                assert state(p)['session'] == before
                p.locator('#modals .close').click(); panel(p)
                assert p.locator('#coBakerTestPassword').input_value() == ''
                assert 'Registered with remote relay' in p.locator('#coBakerRemoteStatus').inner_text()
                agree(pages)
                # Refresh requires password again but keeps the persistent identity.
                p = pages[1]; before = state(p)
                p.reload(); p.wait_for_selector('.hub-food'); panel(p)
                assert state(p)['id'] == before['id']
                assert state(p)['coordinator']['role'] == 'Offline'
                assert p.locator('#coBakerTestPassword').input_value() == ''
                connect(p, endpoint); agree(pages)
                assert state(p)['session'] != before['session']
                print('PASS repeat Connect, popup reopen, refresh and persistent identity', flush=True)
                # Authentication is still enforced; correction clears every stale error.
                connect(p, endpoint, secret='deliberately-wrong-password')
                p.wait_for_function('panaderyaCoBaker.status==="unavailable"')
                assert 'authentication failed' in state(p)['error']
                assert state(p)['coordinator']['role'] == 'Offline'
                connect(p, endpoint); agree(pages)
                assert 'authentication failed' not in p.locator('#coBakerTest').inner_text()
                # Valid different groups are isolated, not authentication failures.
                connect(p, endpoint, group='different-group')
                p.wait_for_function('panaderyaCoBaker.transport.phase==="ready"')
                p.wait_for_timeout(5500)
                assert state(p)['peers'] == [] and not state(p)['error']
                connect(p, endpoint); agree(pages)
                print('PASS wrong password recovery and group isolation', flush=True)
                # Duplicate tab remains passive, then takes over with its own session.
                old = pages[0]; before = state(old)
                duplicate = new(chrome, context=old.context); connect(duplicate, endpoint)
                duplicate.wait_for_function('panaderyaCoBaker.transport.phase==="waiting"')
                assert state(duplicate)['id'] == before['id']
                assert state(duplicate)['coordinator']['role'] == 'Offline'
                assert state(duplicate)['peers'] == []
                assert all(len(state(q)['peers']) == 3 for q in pages)
                old.close(); pages[0] = duplicate; agree(pages)
                assert state(duplicate)['session'] != before['session']
                print('PASS duplicate identity stays passive and takes over without stale errors', flush=True)
                # Real relay interruption, followed by automatic registration and election.
                server.stdin.write('stop\n'); server.stdin.flush()
                assert server.stdout.readline().strip() == 'stopped'
                for p in pages:
                    p.wait_for_function('panaderyaCoBaker.status==="disconnected"', timeout=20000)
                    assert state(p)['coordinator']['role'] == 'Offline'
                    assert state(p)['peers'] == []
                server.stdin.write('start\n'); server.stdin.flush()
                assert server.stdout.readline().strip() == 'started'
                agree(pages)
                print('PASS relay outage/restart: automatic reconnect, clean errors and coordinator agreement', flush=True)
                # Leave the relay alive; replace the elected coordinator and return its profile.
                leader = agree(pages)
                idx = next(i for i,p in enumerate(pages) if state(p)['id'] == leader)
                ctx = pages[idx].context; pages[idx].close()
                survivors = [p for i,p in enumerate(pages) if i != idx]
                replacement = agree(survivors)
                assert replacement != leader
                returned = new(chrome, context=ctx); connect(returned, endpoint); pages[idx] = returned
                assert agree(pages) == replacement
                print('PASS coordinator disconnect, replacement and returning profile', flush=True)
                # Actual worksheet Call All and invitation buttons; simultaneous accepts use
                # microtask scheduling so both can race before either assignment arrives.
                learner = pages[0]; learner.locator('#modals .close').click()
                learner.locator('.hub-ticket').first.click()
                learner.wait_for_function('document.querySelector("#worksheetFrame")?.worksheetStarted===true')
                learner.get_by_role('button', name='Call for Help', exact=True).click()
                learner.locator('[data-help-action="all"]').click()
                for p in pages[1:]: p.wait_for_selector('[data-help-accept]')
                # Both send accepts through their real remote sockets.
                for p in pages[1:3]:
                    p.evaluate('setTimeout(()=>document.querySelector("[data-help-accept]")?.click(), 100)')
                learner.wait_for_function('panaderyaCoBaker.help.active?.role==="Learner"')
                for p in pages[1:]:
                    p.wait_for_function('!panaderyaCoBaker.help.accepting && !panaderyaCoBaker.help.incoming.size')
                helpers = [p for p in pages[1:] if p.evaluate('panaderyaCoBaker.help.active?.role==="Helper"')]
                assert len(helpers) == 1
                assert learner.evaluate('panaderyaCoBaker.help.active.sessionId') == helpers[0].evaluate('panaderyaCoBaker.help.active.sessionId')
                learner.screenshot(path=str(out/'call-for-help-connected.png'))
                helpers[0].locator('[data-observer-end]').click()
                learner.wait_for_function('!panaderyaCoBaker.help.active')
                learner.locator('#modals .close').click(); learner.locator('.worksheet-exit').click(); panel(learner)
                agree(pages)
                assert all(p.evaluate('g.coins') == 250 for p in pages)
                assert all(password not in p.evaluate('JSON.stringify(localStorage)+JSON.stringify(sessionStorage)') for p in pages)
                print('PASS Phase 2 Call All, first-helper-wins, session ending, unchanged coins, no stored password', flush=True)
            for ctx in contexts: ctx.close()
            chrome.close(); edge.close(); webkit.close()
            assert not errors, errors
    finally:
        server.terminate(); server.wait(timeout=10)
