import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {progressionHarness} from './progression-harness.mjs';

function detailHarness(){
 const h=progressionHarness();
 for(const file of ['illustrated-art','bakery-hub'])
  vm.runInContext(readFileSync(new URL(`../src/ui/${file}.js`,import.meta.url),'utf8'),h.c);
 h.run(`document.body={dataset:{view:'hub'}};g.coins=1e6;g.recipeCeilings.pandesal=11;g.owned[0].mastery=8;selectedFoods=new Set([1]);`);
 return h;
}

test('food popup follows approved three-part upgrade row without nested frames',()=>{
 const h=detailHarness(),html=h.run('renderFoodPanel()');
 assert.match(html,/food-detail-showcase/);
 assert.match(html,/food-detail-upgrade/);
 assert.match(html,/class="upgrade-current"[^>]*><strong>Lv\. 8/);
 assert.match(html,/class="upgrade-next"/);
 assert.match(html,/↑3 Available/);
 assert.match(html,/↑1 &nbsp; \+/);
 assert.match(html,/class="primary action-mastery upgrade-purchase"/);
 assert.match(html,/UPGRADE/);
 assert.match(html,/class="food-detail-actions"/);
 assert.doesNotMatch(html,/selection-hint|selection-mastery|mastery-availability/);
 const styles=readFileSync(new URL('../styles/bakery-interface.css',import.meta.url),'utf8');
 assert.match(styles,/\.food-detail-upgrade\{[^}]*grid-template-columns:28% 36%/);
 assert.match(styles,/invisible column partitions/);
});

test('tapping an equipped food opens direct detail rather than the inventory',()=>{
 const h=detailHarness();
 h.run('openHubFood(1); html=renderHubCollection()');
 assert.equal(h.run('hubFoodDirect'),true);
 assert.match(h.run('html'),/food-direct-backdrop/);
 assert.match(h.run('html'),/food-detail-redesign/);
 assert.doesNotMatch(h.run('html'),/Menu Collection|collection-toolbar|collection-grid/);
 h.run('closeFoodPanel()');
 assert.equal(h.run('hubCollection'),false);
 assert.equal(h.run('hubFoodDirect'),false);
});


test('next mastery gain stays visible when there are no unlocked upgrades',()=>{
 const h=detailHarness();
 h.run('g.recipeCeilings.pandesal=8;');
 const html=h.run('renderFoodPanel()');
 assert.match(html,/↑0 Available/);
 assert.match(html,/class="upgrade-gain">↑1 &nbsp; \+/);
 assert.doesNotMatch(html,/No upgrades ready/);
 assert.match(html,/action-mastery upgrade-purchase" disabled/);
});
