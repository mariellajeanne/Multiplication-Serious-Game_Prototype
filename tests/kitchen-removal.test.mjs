import test from 'node:test';
import assert from 'node:assert/strict';
import {progressionHarness} from './progression-harness.mjs';

test('retired Kitchen data is discarded without resetting progress or saved orders',()=>{
 const source=progressionHarness();
 source.run(`g.coins=123456;g.completed=40;g.mastery=40;g.bakeryLevel=21;
  g.recipeCeilings.pandesal=12;g.packages[3]=4;g.ingredients.Flour=9;
  refillBoard();startTicket(g.board[0].id);g.run.pool=137;g.run.worksheetSnapshot={step:'carry',digits:[1,4]};
  abandonTicket();save();`);
 const original=source.json('g');
 for(const equipment of [{oven:20,mixer:20,fridge:20,display:20},{oven:5},null]){
  const old=structuredClone(original);
  old.equipment=equipment;old.kitchenSpent=87654;old.seenUnlocks=['kitchen','fusion'];
  old.purchaseUndo={id:'old',label:'Recipe Mastery',before:{equipment:{oven:0}},signature:'old-signature'};
  const migrated=progressionHarness(old);
  for(const key of ['coins','completed','mastery','bakeryLevel','bakerySpent','owned','discovered','activeMenu','menuSlots','recipeCeilings','packages','ingredients','board','orderRuns','run','claimedOrders'])
   assert.deepEqual(migrated.json(`g.${key}`),original[key],key);
  assert.equal(migrated.run("'equipment' in g||'kitchenSpent' in g"),false);
  assert.deepEqual(migrated.json('g.seenUnlocks'),['fusion']);
  assert.equal(migrated.run('g.purchaseUndo'),null);
  migrated.run('save()');
  const reloaded=progressionHarness(JSON.parse(migrated.store.get('panaderyaQuestV2')));
  assert.deepEqual(reloaded.json('g'),migrated.json('g'));
 }
});

test('saves without obsolete equipment load and new purchase Undo still survives reload',()=>{
 const h=progressionHarness();h.run('g.coins=1e9;buyMenuSlot();save()');
 const saved=h.json('g'),reloaded=progressionHarness(saved);
 assert.equal(reloaded.run("'equipment' in g"),false);
 assert.equal(reloaded.run('g.menuSlots'),2);
 assert.equal(reloaded.run('undoPurchase(g.purchaseUndo.id)'),true);
 assert.equal(reloaded.run('g.menuSlots'),1);
});

test('Boost and proportional prices have no Kitchen dependency across early, late and capped progression',()=>{
 const h=progressionHarness();
 for(const [mastery,bakery,toolLevel] of [[0,1,0],[40,21,3],[160,71,12],[1000,101,20]]){
  h.run(`g.mastery=${mastery};g.bakeryLevel=${bakery};g.equipment={oven:${toolLevel}}`);
  const food=h.run('foodSum()'),power=1.085**(bakery-1),expected=h.run('expectedTicketBase(g.mastery)');
  assert.ok(Math.abs(h.run('bakeryValue()')/(Math.max(1,food)*power)-1)<1e-12);
  const income=expected*Math.max(1,food)*power;
  assert.ok(Math.abs(h.run('earningUnit()')/income-1)<1e-12);
  const quotes=h.json('[slotCost(),packagePrice(0),bakeryUpgradeCost(),foodLevelPrice(g.owned[0])]');
  h.run('g.equipment={oven:99999,mixer:99999}');
  assert.deepEqual(h.json('[slotCost(),packagePrice(0),bakeryUpgradeCost(),foodLevelPrice(g.owned[0])]'),quotes);
  for(const seconds of [60,90,120])assert.ok(Math.abs(h.run('ticketBase(0)*bakeryValue()')/seconds/h.run('staffRate()')-360/seconds)<1e-10);
  h.run('showBoostInfo()');assert.doesNotMatch(h.run('popup.html'),/Kitchen|kitchen/);
 }
});
