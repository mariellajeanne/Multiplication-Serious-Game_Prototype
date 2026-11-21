import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {progressionHarness} from './progression-harness.mjs';

const source=rel=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');
function harness(){
 const h=progressionHarness();
 for(const file of ['illustrated-art','bakery-hub'])vm.runInContext(source('src/ui/'+file+'.js'),h.c);
 h.run(`window={render_game_to_text:()=>''};document.querySelectorAll=()=>[];document.body={dataset:{view:'hub'},style:{setProperty(){}}};let now=0,reduced=false,packageFeaturedRank=0,packageBatchView=null;performance={now:()=>now};matchMedia=query=>({matches:query.includes('reduced-motion')&&reduced});requestAnimationFrame=()=>1;cancelAnimationFrame=()=>{};showPackageCollection=()=>{};showSelectedPackage=()=>{};uiText=s=>s;`);
 vm.runInContext(source('src/ui/bakery-scenes.js'),h.c);
 return h;
}

test('the menu contains exactly the purchased number of slots, never eight fake placeholders',()=>{
 const h=harness();
 h.run('g.menuSlots=4;g.activeMenu=[1]');
 let html=h.run('renderSceneFoods()');
 assert.equal((html.match(/class="scene-food-card hub-food/g)||[]).length,1);
 assert.equal((html.match(/class="scene-button scene-food-card empty-menu-slot/g)||[]).length,3);
 assert.equal((html.match(/scene-food-card/g)||[]).length,4);
 assert.match(html,/>Empty Slot<\/strong>/);
 assert.doesNotMatch(html,/More recipes to discover|More menu slots to unlock|Ready for a recipe/);
 h.run('g.menuSlots=1');
 html=h.run('renderSceneFoods()');
 assert.equal((html.match(/scene-food-card/g)||[]).length,1);
 h.run('g.menuSlots=4;g.activeMenu=[]');
 html=h.run('renderSceneFoods()');
 assert.equal((html.match(/class="scene-button scene-food-card empty-menu-slot/g)||[]).length,4);
});

test('a collection full of owned but unequipped recipes does not overflow the purchased slot count',()=>{
 const h=harness();
 h.run(`g.owned=FOOD.slice(0,12).map((f,i)=>({id:f.id,uid:i+1,level:1,mastery:0}));g.menuSlots=4;g.activeMenu=[1,2]`);
 const html=h.run('renderSceneFoods()');
 assert.equal((html.match(/class="scene-food-card hub-food/g)||[]).length,2);
 assert.equal((html.match(/class="scene-button scene-food-card empty-menu-slot/g)||[]).length,2);
 assert.equal((html.match(/scene-food-card/g)||[]).length,4);
});

test('counter has two separate accessible actions with a plain bag icon, not an SVG holder',()=>{
 const h=harness();
 const html=h.run('renderWorldMenu()');
 assert.match(html,/class="collection-sign" role="group"/);
 assert.match(html,/class="inventory-bag-icon"/);
 assert.match(html,/Food Inventory/);
 assert.match(html,/data-hub-action="equip-best"/);
 assert.match(source('src/ui/bakery-hub.js'),/'equip-best':\(\)=>equipBest\('final'\)/);
 assert.doesNotMatch(html,/collection-holder|View All Foods|book-icon/);
 h.run(`equipBest=mode=>{chosenMode=mode;return true;};dispatchHubAction('equip-best');`);
 assert.equal(h.run('chosenMode'),'final');
});

test('Index View food leads straight to a standalone food panel in the bakery',()=>{
 const h=harness();
 h.run(`g.discovered=['pandesal'];modal={title:'Food Index'};closeModal=()=>{modal=null};render=()=>{};openIndexFood(1)`);
 assert.equal(h.run('hubFoodDirect'),true);
 assert.equal(h.run('hubCollection'),true);
 assert.equal(h.run('modal'),null);
 const html=h.run('renderHubCollection()');
 assert.match(html,/food-direct-backdrop/);
 assert.match(html,/food-detail-redesign/);
 assert.doesNotMatch(html,/Menu Collection|collection-grid/);
});

test('zero-based Mastery displays Lv. 1 consistently without changing values or costs',()=>{
 const h=harness();h.run('g.owned[0].mastery=0;selectedFoods=new Set([1])');
 const before=h.json('[g.owned,foodValue(g.owned[0]),foodLevelPrice(g.owned[0]),availableMastery(g.owned[0])]');
 for(const renderer of ['renderHubFoodCard(g.owned[0])','renderFoodPanel()','renderSceneFoods()','renderFoodCard(g.owned[0])']){
  assert.match(h.run(renderer),/Lv\. 1/);assert.doesNotMatch(h.run(renderer),/Lv\.? 0/);
 }
 assert.deepEqual(h.json('[g.owned,foodValue(g.owned[0]),foodLevelPrice(g.owned[0]),availableMastery(g.owned[0])]'),before);
 h.run('g.owned[0].mastery=4');assert.equal(h.run('displayedFoodLevel(g.owned[0])'),5);
 assert.match(h.run('renderHubFoodCard(g.owned[0])'),/Lv\. 5/);
});

test('all eight tiers share their unchanged layouts with unique styling and the index uses themed classes',()=>{
 const h=harness(),css=source('styles/bakery-rarity-v16.css');
 const index=h.run(`openIndex();popup.html`);
 for(let i=0;i<8;i++){
  assert.match(css,new RegExp('\\.r'+i+'\\{'));
  assert.match(index,new RegExp('class="itemcard index-food-card r'+i+'"'));
 }
 assert.match(index,/onclick="openIndexFood\(1\)"/);
 const details=h.run(`selectedFoods=new Set([1]);renderFoodPanel()`);
 assert.match(details,/food-detail-showcase r0/);
 const menu=h.run(`g.menuSlots=4;g.activeMenu=[1];renderSceneFoods()`);
 assert.match(menu,/scene-food-card hub-food r0/);
 assert.match(source('index.html'),/styles\/bakery-rarity-v16\.css/);
});
