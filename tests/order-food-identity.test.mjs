import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {progressionHarness} from './progression-harness.mjs';

test('new order food identities come from the equipped menu, independently of coin tier',()=>{
 const h=progressionHarness();h.run(`g.menuSlots=2;discoverFood(F('monay'));g.activeMenu=[1,2];
  tickets=Array.from({length:100},makeTicket);before=JSON.stringify(tickets);
  Math.random=()=>{throw Error('Food reconciliation must not consume reward RNG')};
  g.board=tickets.slice(0,5);reconcileOrderFoods();html=renderTickets()`);
 assert.ok(h.json('tickets').every(t=>['pandesal','monay'].includes(t.foodId)));
 assert.equal(h.run('JSON.stringify(tickets)'),h.run('before'));
 assert.ok(h.json('tickets').some(t=>t.foodId==='monay'));
});

test('untouched tickets follow equipment changes while started orders keep their recipe and payout',()=>{
 const h=progressionHarness();h.run(`g.menuSlots=2;discoverFood(F('monay'));g.activeMenu=[1,2];
  g.board=[{id:101,a:79,b:18,rarity:1,coinTier:1,base:176,foodId:'monay'},
    {id:102,a:36,b:27,rarity:3,coinTier:3,base:320,foodId:'monay'}];
  startTicket(101);abandonTicket();budget=g.run.budget;g.activeMenu=[1];save()`);
 assert.equal(h.run('g.orderRuns[101].ticket.foodId'),'monay');
 assert.equal(h.run('g.board.find(t=>t.id===102).foodId'),'pandesal');
 assert.equal(h.run('g.run.budget'),h.run('budget'));
 const reload=progressionHarness(h.json('g'));
 assert.equal(reload.run('g.orderRuns[101].ticket.foodId'),'monay');
 assert.equal(reload.run('g.run.budget'),h.run('budget'));
});

test('migration repairs missing or invalid recipes without rerolling rewards; empty menus stay playable',()=>{
 const h=progressionHarness();h.run(`g.board=[{id:5,a:79,b:18,rarity:7,base:1062,foodId:'missing-recipe'}];
  before=JSON.stringify(g.board.map(t=>[t.id,t.a,t.b,t.rarity,t.base]));g.activeMenu=[];
  Math.random=()=>{throw Error('No migration RNG')};migrateFrame11(g)`);
 assert.equal(h.run('g.board[0].foodId'),'pandesal');
 assert.equal(h.run('JSON.stringify(g.board.map(t=>[t.id,t.a,t.b,t.rarity,t.base]))'),h.run('before'));
 assert.equal(h.run('orderFood(g.board[0]).id'),'pandesal');
});

test('order claims and the grown-up demo shortcut cannot grant foods or packages',()=>{
 const h=progressionHarness();h.c.confirm=()=>true;
 h.run(`refillBoard();startTicket(g.board[0].id);g.run.phase='claim';g.run.pool=g.run.budget;
  g.run.chests=[{rarity:7}];g.run.rewards=[{food:F('ube-ensaymada')}];
  before=JSON.stringify([g.owned,g.packages,g.discovered,g.recipeCeilings]);
  prizeItems();afterClaim=JSON.stringify([g.owned,g.packages,g.discovered,g.recipeCeilings]);
  unlockDemo();afterDemo=JSON.stringify([g.owned,g.packages,g.discovered,g.recipeCeilings])`);
 assert.equal(h.run('afterClaim'),h.run('before'));
 assert.equal(h.run('afterDemo'),h.run('before'));
});

test('all catalog foods have clipped atlas cells; package popup keeps the original vector art',()=>{
 const h=progressionHarness();vm.runInContext(readFileSync(new URL('../src/ui/illustrated-art.js',import.meta.url),'utf8'),h.c);
 h.run(`isIllustratedBakery=()=>true;art=FOOD.map(f=>bakeryFoodArt(f.id));original=foodArt('pandesal')`);
 assert.equal(h.run('ILLUSTRATED_FOODS.length'),h.run('FOOD.length'));
 assert.equal(h.run('ILLUSTRATED_FOOD_CROPS.length'),h.run('FOOD.length'));
 for(const markup of h.json('art')){assert.match(markup,/overflow="hidden"/);assert.match(markup,/assets\/illustrated\/foods.webp/)}
 assert.doesNotMatch(h.run('original'),/illustrated|<image/);
});
