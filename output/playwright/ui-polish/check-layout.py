import os,sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'.test-tools'))
os.environ['PLAYWRIGHT_BROWSERS_PATH']=str(ROOT/'.test-tools/browsers')
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=pw.chromium.launch(channel='msedge')
 p=b.new_page(viewport={'width':2000,'height':1200})
 p.goto('http://127.0.0.1:8770');p.wait_for_selector('.hub-ticket')
 p.evaluate('''g.board=Array.from({length:8},(_,rank)=>({id:9100+rank,rarity:rank,coinTier:rank,orderLabel:COIN_ORDER_LABELS[rank][1],orderIcon:COIN_ORDER_ICONS[rank],foodId:'pandesal',a:rank<3?79:rank<5?799:9876,b:rank?98:9,base:ticketBase(rank)}));render()''')
 print(p.locator('.order-math,.order-name,.hub-ticket-progress').evaluate_all('es=>es.filter(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1).map(e=>[e.className,e.textContent,e.clientWidth,e.scrollWidth,e.clientHeight,e.scrollHeight])'))
 b.close()
