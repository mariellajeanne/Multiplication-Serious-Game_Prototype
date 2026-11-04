import test from 'node:test';
import assert from 'node:assert/strict';
import {progressionHarness} from './progression-harness.mjs';

test('single-food Mastery taps buy immediately, recalculate the next price, and preserve latest-purchase Undo',()=>{
 const h=progressionHarness();h.run(`g.coins=10000;g.recipeCeilings.pandesal=3;selectedFoods=new Set([1]);
  firstPrice=foodLevelPrice(g.owned[0]);first=requestSelectedMastery();afterFirst=g.coins;
  secondPrice=foodLevelPrice(g.owned[0]);second=requestSelectedMastery();afterSecond=g.coins;level=recipeMastery(g.owned[0]);
  undone=undoPurchase(g.purchaseUndo.id)`);
 assert.equal(h.run('typeof popup'),'undefined');assert.equal(h.run('first&&second&&undone'),true);
 assert.equal(h.run('10000-afterFirst'),h.run('firstPrice'));
 assert.equal(h.run('afterFirst-afterSecond'),h.run('secondPrice'));
 assert.equal(h.run('level'),2);assert.equal(h.run('recipeMastery(g.owned[0])'),1);
 assert.equal(h.run('g.coins'),h.run('afterFirst'));assert.deepEqual(h.json('[...selectedFoods]'),[1]);
});

test('one selected food uses the detailed popup even in multi-select mode; multiple foods use only compact actions',()=>{
 const h=progressionHarness();h.run(`discoverFood(F('monay'));g.recipeCeilings.pandesal=4;
  multiSelect=true;selectedFoods=new Set([1]);single=renderFoodPanel();
  selectedFoods.add(2);multiple=renderFoodPanel();before=JSON.stringify(g);deselectAllFoods();empty=renderFoodPanel();after=JSON.stringify(g)`);
 assert.match(h.run('single'),/food-selection-single/);assert.doesNotMatch(h.run('single'),/selection-tools|recipe-more/);
 assert.match(h.run('single'),/selection-rarity-stars/);assert.match(h.run('single'),/Available \+4/);
 assert.match(h.run('multiple'),/food-selection-multi/);assert.match(h.run('multiple'),/Deselect All/);
 assert.match(h.run('multiple'),/Mastery for Selected/);assert.match(h.run('multiple'),/Equip \(1\)/);assert.match(h.run('multiple'),/Unequip \(1\)/);
 assert.doesNotMatch(h.run('multiple'),/<svg|recipe-detail|selection-hint|food-action-status|selected-food-list/);
 assert.match(h.run('empty'),/Select All/);assert.equal(h.run('multiSelect'),true);
 assert.equal(h.run('before'),h.run('after'));
});

test('single-food stats derive from actual tier, retained base and unbounded mastery; actions retain separate meanings',()=>{
 const h=progressionHarness();h.run(`g.owned[0]={...g.owned[0],fusion:3,mastery:8,baseCarry:7};g.recipeCeilings.pandesal=10;
  selectedFoods=new Set([1]);html=renderFoodPanel();base=tierBase(g.owned[0]);value=foodValue(g.owned[0]);next=foodValue({...g.owned[0],mastery:9})-value`);
 assert.match(h.run('html'),/Mastery: 8/);assert.match(h.run('html'),/Available \+2/);
 assert.ok(h.run('html').includes(`Base: ×${h.run('multiplierLabel(base)')}`));
 assert.ok(h.run('html').includes(`Boost: ×${h.run('multiplierLabel(value)')}`));
 assert.ok(h.run('html').includes(`Next: +${h.run('multiplierLabel(next)')}`));
 assert.match(h.run('html'),/action-sell/);assert.match(h.run('html'),/action-mastery/);assert.match(h.run('html'),/action-unequip/);
 h.run('g.activeMenu=[];html=renderFoodPanel()');assert.match(h.run('html'),/action-equip/);
});
