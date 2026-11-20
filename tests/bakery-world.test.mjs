import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {progressionHarness} from './progression-harness.mjs';

function worldHarness(){
 const h=progressionHarness();
 for(const file of ['illustrated-art','bakery-hub'])vm.runInContext(readFileSync(new URL(`../src/ui/${file}.js`,import.meta.url),'utf8'),h.c);
 h.run(`window={render_game_to_text:()=>JSON.stringify({packages:{}})};
  document.querySelectorAll=()=>[];document.body={dataset:{view:'hub'},style:{setProperty(){}}};
  let now=0,reduced=false,packageFeaturedRank=0,packageBatchView=null;
  performance={now:()=>now};matchMedia=query=>({matches:query.includes('reduced-motion')&&reduced});
  requestAnimationFrame=()=>1;cancelAnimationFrame=()=>{};
  showPackageCollection=()=>{};showSelectedPackage=()=>{};
  purchasePackageBatch=id=>commitPackageBatch(id);`);
 vm.runInContext(readFileSync(new URL('../src/ui/bakery-scenes.js',import.meta.url),'utf8'),h.c);
 return h;
}

test('world preserves scene order and canonical state while rendering real raster shells and live values',()=>{
 const h=worldHarness();h.run(`before=JSON.stringify(g);Math.random=()=>{throw Error('Rendering must not roll rewards')};html=renderHubHome()`);
 const html=h.run('html');assert.equal(h.run('JSON.stringify(g)'),h.run('before'));
 assert.ok(html.indexOf('data-world-page="packages"')<html.indexOf('data-world-page="menu"'));
 assert.ok(html.indexOf('data-world-page="menu"')<html.indexOf('data-world-page="orders"'));
 assert.equal((html.match(/data-world-nav=/g)||[]).length,3);
 assert.equal((html.match(/data-world-tier=/g)||[]).length,2);
 assert.equal((html.match(/world-odds-row/g)||[]).length,3);
 assert.match(html,/assets\/bakery-approved\/menu-frame.png/);
 assert.match(html,/counter-register world-register/);assert.match(html,/world-counter-packages/);
 assert.equal((html.match(/View All Foods/g)||[]).length,1);
 assert.match(html,/data-hub-action="center"/);
 assert.doesNotMatch(html,/1113\.75|373\.3M|food_tile_|order_ticket_/);
});

test('bounded camera crosses Menu monotonically on a single end-to-end journey',()=>{
 const h=worldHarness();h.run(`navigateBakery('packages');bakeryCameraStep(480);now=480;navigateBakery('orders')`);
 const samples=[];
 for(let time=480;time<=1220;time+=37){h.run(`bakeryCameraStep(${time})`);samples.push(h.run('bakeryCamera'))}
 assert.equal(samples[0],0);assert.equal(samples.at(-1),2);
 assert.ok(samples.some(x=>Math.abs(x-1)<.01));assert.ok(samples.every((x,i)=>!i||x>=samples[i-1]));
 assert.equal(h.run('bakeryJourney'),null);
 assert.equal(h.run(`navigateBakery('invalid')`),false);
 assert.equal(h.run(`navigateBakery('orders');bakeryJourney`),null);
});

test('camera retargeting is continuous and reduced motion lands immediately',()=>{
 const h=worldHarness();h.run(`navigateBakery('packages');bakeryCameraStep(120);now=120;before=bakeryCamera;navigateBakery('orders')`);
 assert.equal(h.run('bakeryCamera'),h.run('before'));
 h.run('bakeryCameraStep(1000)');assert.equal(h.run('bakeryCamera'),2);
 h.run(`reduced=true;navigateBakery('menu')`);assert.equal(h.run('bakeryCamera'),1);assert.equal(h.run('bakeryJourney'),null);
});

test('scene purchases use canonical batch transactions and reject locked or replayed requests',()=>{
 const h=worldHarness();h.run('g.coins=1e12;g.completed=300;g.packageTierUnlocks=PACKAGE_SHOP.map(t=>t.rank);bakeryTier=7;before=g.coins;receipt=buyBakeryPackage(5)');
 assert.equal(h.run('receipt.count'),5);assert.equal(h.run('before-g.coins'),h.run('packagePrice(7)*5'));
 assert.equal(h.run('buyBakeryPackage(1)'),false);
 h.run('collectPackageBatch(receipt.id);g.completed=0;g.packageTierUnlocks=[0]');
 assert.equal(h.run('buyBakeryPackage(1)'),false);
});

test('first visit centers the highest discovered tier; later visits preserve an intentional selection',()=>{
 const h=worldHarness();h.run('renderWorldPackages();g.packageTierUnlocks=[0,1,2,3];navigateBakery("packages")');
 assert.equal(h.run('bakeryTier'),3);
 h.run('selectBakeryTier(1);navigateBakery("menu");g.packageTierUnlocks.push(4);navigateBakery("packages")');
 assert.equal(h.run('bakeryTier'),1);
 assert.equal(h.run('selectBakeryTier(6)'),false);assert.equal(h.run('selectBakeryTier(5)'),true);
});

test('phone fitting preserves uniform art scales and leaves primary content clear of HUD/navigation on every kiosk',()=>{
 const h=worldHarness();
 for(const [width,height] of [[740,360],[800,360],[844,390],[932,430],[1024,600]]){
  const available=height-142,worldScale=width/2000*1.1;
  for(const [kind,nativeWidth,end] of [['packages',1670,813],['menu',1650,787],['orders',1188,794]]){
   const scale=h.run(`phoneBakeryKioskScale('${kind}',${nativeWidth},${end},${width-32},${available},${worldScale})`);
   assert.ok(scale>0&&scale<=worldScale*.92);
   assert.ok(nativeWidth*scale<=width-32+.001);
   assert.ok(end*scale+(kind==='menu'?44:0)<=available+.001);
  }
 }
});
