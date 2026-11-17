"""Android JS bridge contract with simulated native events; no radio claim."""
import functools,http.server,json,os,sys,threading
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.test-tools'));os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(ROOT/'.test-tools/browsers'))
from playwright.sync_api import sync_playwright
OUT=ROOT/'output/playwright/nearby-bridge';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
stub=r"""
localStorage.panaderyaPlayerV1=JSON.stringify({id:'a'.repeat(32),name:'Ada',number:'3720'});
window.nativeCalls=[];
const emit=(kind,detail)=>window.dispatchEvent(new CustomEvent('co-baker-'+kind,{detail}));
const other={id:'b'.repeat(32),name:'Bea',number:'3720'};
window.PanaderyaLan={start(){nativeCalls.push('lan-start')},stop(){nativeCalls.push('lan-stop')},send(){},diagnostics(){return '{}'},copyDetails(){},probe(){}};
window.PanaderyaNearby={
 start(m){nativeCalls.push('nearby-start');window.nativeHello=JSON.parse(m);emit('nearby',{kind:'status',status:'searching'})},
 stop(){nativeCalls.push('nearby-stop')},
 scan(){nativeCalls.push('scan');emit('nearby',{kind:'candidate',player:{...other,available:true}})},
 connect(id){nativeCalls.push('connect:'+id);emit('nearby',{kind:'message',message:CoBakerCore.packet(other,'c'.repeat(32),'hello')})},
 send(id,text){const m=JSON.parse(text);nativeCalls.push(m);if(m.type==='test')emit('nearby',{kind:'message',message:CoBakerCore.packet(other,'c'.repeat(32),'reply',m.id)})},
 availability(v){nativeCalls.push('available:'+v)},retain(ids){window.nativeRetain=JSON.parse(ids)},
 diagnostics(){return JSON.stringify({'Device':'SM-T505 (simulated)','Nearby advertising':true,'Nearby discovering':false,'Last error':'OFFSCREEN_NEARBY_FIELD'})},
 copyDetails(summary){window.copiedNearby=JSON.parse(summary);emit('nearby',{kind:'copy-details',status:'copied'})}
};
window.sendOldNearby=()=>emit('nearby',{kind:'message',message:CoBakerCore.packet(other,'c'.repeat(32),'hello')});
"""
try:
    with sync_playwright() as pw:
        for engine in ['edge','webkit']:
            browser=pw.chromium.launch(channel='msedge') if engine=='edge' else pw.webkit.launch()
            ctx=browser.new_context(viewport={'width':1280,'height':800},has_touch=True);ctx.add_init_script(stub)
            p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
            p.goto(f'http://127.0.0.1:{server.server_port}/index.html?cobaker=debug');p.wait_for_selector('.hub-food')
            p.evaluate('openSettings()');p.locator('#modals details').first.evaluate('(el)=>el.open=true');p.get_by_role('button',name='Co-Baker network test',exact=True).click()
            p.locator('#coBakerTransport').select_option('nearby')
            assert p.evaluate('nativeCalls.indexOf("lan-stop")<nativeCalls.indexOf("nearby-start")')
            p.get_by_role('button',name='Find Bakers',exact=True).click();p.wait_for_function('panaderyaCoBaker.candidates.size===1')
            assert p.evaluate('panaderyaCoBaker.peers.size')==0;assert not p.evaluate('nativeCalls.some(v=>typeof v==="string"&&v.startsWith("connect:"))')
            p.locator('[data-peer]').click();p.wait_for_function('panaderyaCoBaker.messages.some(m=>m.text==="Response received")')
            assert p.evaluate('panaderyaCoBaker.peers.size')==1;assert p.evaluate('panaderyaCoBaker.profile.id')=='a'*32
            p.get_by_role('button',name='Copy Details',exact=True).click();assert p.locator('#coBakerCopyStatus').inner_text()=='Copied!'
            copied=p.evaluate('copiedNearby');assert copied['Transport']=='Nearby Connections (Experimental)';assert 'a'*32 not in json.dumps(copied)
            p.screenshot(path=str(OUT/f'{engine}-network.png'))
            # A runtime failure remains on the selected mode, without silent LAN fallback.
            p.evaluate('window.dispatchEvent(new CustomEvent("co-baker-nearby",{detail:{kind:"status",status:"unavailable",error:"Permission denied (simulated)"}}))')
            assert p.locator('#coBakerTransport').input_value()=='nearby';assert p.evaluate('panaderyaCoBaker.peers.size')==0
            p.locator('#coBakerTransport').select_option('lan');p.evaluate('sendOldNearby()');assert p.evaluate('panaderyaCoBaker.peers.size')==0
            assert not errors,errors;ctx.close();browser.close()
            print('PASS '+engine+': exclusive debug selector, unconnected candidates, identity consistency, existing message/reply protocol, full Copy Details and unavailable-service handling (simulated native bridge)',flush=True)
finally:server.shutdown()
