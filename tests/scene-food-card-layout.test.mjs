import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {progressionHarness} from './progression-harness.mjs';

function sceneHarness(){
 const h=progressionHarness();
 for(const file of ['illustrated-art','bakery-hub'])vm.runInContext(readFileSync(new URL(`../src/ui/${file}.js`,import.meta.url),'utf8'),h.c);
 h.run(`window={render_game_to_text:()=>''};document.querySelectorAll=()=>[];document.body={dataset:{view:'hub'},style:{setProperty(){}}};let now=0,reduced=false,packageFeaturedRank=0,packageBatchView=null;performance={now:()=>now};matchMedia=query=>({matches:query.includes('reduced-motion')&&reduced});requestAnimationFrame=()=>1;cancelAnimationFrame=()=>{};showPackageCollection=()=>{};showSelectedPackage=()=>{};purchasePackageBatch=id=>commitPackageBatch(id);`);
 vm.runInContext(readFileSync(new URL('../src/ui/bakery-scenes.js',import.meta.url),'utf8'),h.c);
 return h;
}

test('scene food shows one centered illustration and a shared level/boost footer, not a star label',()=>{
 const h=sceneHarness();
 const html=h.run('renderSceneFoods()');
 assert.match(html,/class="scene-food-card hub-food r\d"/);
 assert.match(html,/class="food-art illustrated-food scene-food-image"/);
 assert.match(html,/class="food-stats" aria-hidden="true"><span class="food-level">Lv\. 1<\/span><span class="food-multiplier"/);
 assert.match(html,/class="boost-gem boost-star"/);
 assert.doesNotMatch(html, /class="food-meta"/);
 assert.match(html,/onclick="openHubFood\(1\)"/);
});

test('upgrade-ready badge is populated from available mastery and is hidden at zero',()=>{
 const h=sceneHarness();
 assert.doesNotMatch(h.run('renderSceneFoods()'),/class="food-upgrade-ready"/);
 h.run(`g.recipeCeilings.pandesal=3`);
 const available=h.run('renderSceneFoods()');
 assert.match(available,/class="food-upgrade-ready" aria-hidden="true"/);
 assert.match(available,/<b>3<\/b><\/span><span class="food-stats"/);
 assert.match(available,/3 level-ups available/);
 h.run('g.owned[0].mastery=2');
 assert.match(h.run('renderSceneFoods()'),/class="food-level">Lv\. 3<\/span>/);
 assert.match(h.run('renderSceneFoods()'),/<b>1<\/b><\/span><span class="food-stats"/);
});

test('scene food frame and phone adaptation use centered art with a same-height split strip',()=>{
 const css=readFileSync(new URL('../styles/bakery-scenes.css',import.meta.url),'utf8');
 assert.match(css,/\.scene-food-card\.hub-food \.scene-food-image\{[^}]*object-position:center center/);
 assert.match(css,/\.scene-food-card\.hub-food \.food-stats\{[^}]*grid-template-columns/);
 assert.match(css,/\.scene-food-card\.hub-food \.food-level\{[^}]*background:#ffe1a3/);
 assert.match(css,/\.scene-food-card\.hub-food \.food-multiplier\{[^}]*background:#fffdf5/);
 assert.match(css,/\.scene-food-card\.hub-food \.food-upgrade-ready\{[^}]*background:#c9e4b7/);
 assert.match(css,/\.scene-food-card\.hub-food \.food-upgrade-ready\{[^}]*top:calc\(3px \/ var\(--phone-kiosk-unit\)\)/);
});
