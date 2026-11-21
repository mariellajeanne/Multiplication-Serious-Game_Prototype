"""Native MP3 + real Settings/navigation/SFX/loop checks; no game progression suite.
Run: python tests/browser-background-music.py edge webkit
"""
import functools,http.server,os,re,sys,threading
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.test-tools'))
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH',str(ROOT/'.test-tools/browsers'))
from playwright.sync_api import sync_playwright

class QuietRangeServer(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def send_head(self):
  path=Path(self.translate_path(self.path))
  if path.suffix.lower()!='.mp3':return super().send_head()
  size=path.stat().st_size;match=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers.get('Range',''))
  start=int(match[1]) if match else 0;end=min(size-1,int(match[2])) if match and match[2] else size-1
  if start>=size or start>end:self.send_error(416);return None
  self.send_response(206 if match else 200);self.send_header('Content-Type','audio/mpeg')
  self.send_header('Accept-Ranges','bytes');self.send_header('Content-Length',str(end-start+1))
  if match:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
  self.end_headers();stream=path.open('rb');stream.seek(start);self.remaining=end-start+1;return stream
 def copyfile(self,source,output):
  if not hasattr(self,'remaining'):return super().copyfile(source,output)
  try:
   while self.remaining:
    chunk=source.read(min(self.remaining,65536))
    if not chunk:break
    output.write(chunk);self.remaining-=len(chunk)
  except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):pass

server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietRangeServer,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}/index.html'
PROBE='''(()=>{
 window.audioProbe={players:[],contexts:0,oscillators:0,playCalls:0,pauses:0,loops:0};
 const Original=window.Audio;
 window.Audio=new Proxy(Original,{construct(target,args){
  const audio=new target(...args);audioProbe.players.push(audio);
  const play=audio.play.bind(audio);audio.play=()=>{audioProbe.playCalls++;return play()};
  audio.addEventListener('pause',()=>audioProbe.pauses++);
  audio.addEventListener('timeupdate',()=>{if(audio.currentTime<2&&audioProbe.atEnd)audioProbe.loops++});
  return audio;
 }});
 const Context=window.AudioContext||window.webkitAudioContext;
 if(Context){const Wrapped=new Proxy(Context,{construct(target,args){
  audioProbe.contexts++;const context=new target(...args),oscillator=context.createOscillator.bind(context);
  context.createOscillator=()=>{audioProbe.oscillators++;return oscillator()};return context;
 }});if(window.AudioContext)window.AudioContext=Wrapped;else window.webkitAudioContext=Wrapped}
})();'''

def ready(p):
 p.wait_for_function("typeof toggleMusic==='function'&&document.getElementById('bakeryLoading')?.hidden")
 p.evaluate('skipWholeBakeryGuide(true)')
def playing(p):p.wait_for_function('music instanceof HTMLAudioElement&&!music.paused&&music.currentTime>0',timeout=20000)
def music_setting(p):return p.get_by_role('button',name='Music',exact=True)

def run(pw,engine):
 browser=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='msedge',headless=True,args=['--autoplay-policy=user-gesture-required'])
 context=browser.new_context(viewport={'width':2000,'height':1200},has_touch=True)
 context.add_init_script(PROBE);p=context.new_page();errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 try:
  p.goto(URL);ready(p);assert p.evaluate('audioProbe.players.length')==0
  p.locator('#settings-button').tap();music_setting(p).tap();playing(p)
  assert p.evaluate('music.loop&&music.preload==="none"&&music.currentSrc.endsWith("My%20Panaderya%20-%20Background%20Music.mp3")')
  assert p.evaluate('audioProbe.contexts')==0
  p.wait_for_function('Number.isFinite(music.duration)&&music.duration>0')
  print(engine,'native MP3 duration',p.evaluate('music.duration'),flush=True)
  p.evaluate('music.currentTime=12');p.wait_for_function('music.currentTime>=12')
  music_setting(p).tap();assert p.evaluate('music.paused&&!g.musicOn')
  paused=p.evaluate('music.currentTime');p.wait_for_timeout(100);assert abs(p.evaluate('music.currentTime')-paused)<.05
  music_setting(p).tap();p.wait_for_function('music.currentTime>'+str(paused+.1));assert p.evaluate('audioProbe.players.length')==1
  p.locator('.settings-modal .close').tap();p.evaluate('window.originalMusic=music;window.originalPauses=audioProbe.pauses')
  for route in ['orders','packages','menu']:
   p.locator(f'[data-world-nav="{route}"]').tap();p.wait_for_function('!bakeryJourney')
   assert p.evaluate('music===originalMusic&&!music.paused&&audioProbe.players.length===1&&audioProbe.pauses===originalPauses')
  p.locator('.view-all-foods').tap();p.locator('.hub-collection-back').tap()
  p.evaluate('navigateBakery("orders")');p.wait_for_function('!bakeryJourney');p.locator('.scene-ticket').first.tap()
  p.wait_for_function("$('worksheetFrame')?.contentWindow.__ACTIVE_WORKSHEET_TICKET?.id===g.run.ticket.id")
  assert p.evaluate('music===originalMusic&&!music.paused&&audioProbe.players.length===1&&audioProbe.pauses===originalPauses')
  # SFX OFF must leave music playing; SFX ON must work with music paused.
  p.evaluate('toggleSfx()');assert p.evaluate('!g.sound&&!music.paused')
  p.evaluate('toggleSfx();stopMusic();g.musicOn=false;save()')
  frame=p.locator('#worksheetFrame').element_handle().content_frame()
  frame.locator('[data-top="0"]').tap();frame.wait_for_function('audioProbe.oscillators>0&&context.state==="running"')
  assert p.evaluate('music.paused&&g.sound')
  # Saved OFF causes no request or player on reload, even with worksheet input.
  p.reload();ready(p);p.wait_for_selector('#worksheetFrame');assert p.evaluate('audioProbe.players.length')==0
  frame=p.locator('#worksheetFrame').element_handle().content_frame();frame.locator('#sheet').tap(position={'x':8,'y':8})
  assert p.evaluate('!g.musicOn&&audioProbe.players.length===0')
  # Seed only the existing preference, then test the first real iframe gesture.
  p.evaluate('g.musicOn=true;save()');p.reload();ready(p);p.wait_for_selector('#worksheetFrame')
  assert p.evaluate('g.musicOn&&audioProbe.players.length===0')
  frame=p.locator('#worksheetFrame').element_handle().content_frame();frame.locator('#sheet').tap(position={'x':8,'y':8});playing(p)
  assert p.evaluate('audioProbe.players.length')==1
  # The real MP3 reaches its native loop boundary; no synthetic ended handler.
  p.wait_for_function('music.readyState>=2&&Number.isFinite(music.duration)')
  p.evaluate('music.currentTime=music.duration-.35')
  p.wait_for_function('music.currentTime>music.duration-1&&music.seeking===false')
  p.evaluate('audioProbe.atEnd=true')
  p.wait_for_function('music.currentTime<2&&!music.paused',timeout=10000)
  assert p.evaluate('music.loop&&audioProbe.players.length===1')
  assert not errors,errors
  print(f'PASS {engine}: real MP3 ON/OFF/resume, single player across Menu/Orders/Packages/worksheet/popups, saved ON/OFF, iframe unlock, independent real SFX, native end-to-start loop',flush=True)
 except Exception:
  print('AUDIO DIAGNOSTIC',engine,p.evaluate('({on:g.musicOn,players:audioProbe.players.length,plays:audioProbe.playCalls,state:music&&{paused:music.paused,time:music.currentTime,ready:music.readyState,network:music.networkState,error:music.error&&{code:music.error.code,message:music.error.message},codec:music.canPlayType("audio/mpeg")},pending:!!musicPlayPending,awaiting:musicAwaitingGesture,failed:musicPlaybackFailed})'),errors,flush=True)
  raise
 finally:context.close();browser.close()

if __name__=='__main__':
 try:
  with sync_playwright() as pw:
   for engine in sys.argv[1:] or ['edge','webkit']:run(pw,engine)
 finally:server.shutdown()
