import test from 'node:test';
import assert from 'node:assert/strict';
import {progressionHarness} from './progression-harness.mjs';

test('bakery list uses actual neighboring progression states and additive gains at every stage',()=>{
 const h=progressionHarness();
 for(let level=1;level<=101;level++){
  h.run(`g.bakeryLevel=${level}`);
  const rows=h.json('bakeryProgressRows()');
  assert.deepEqual(rows.map(r=>r.index),[level-1,level,level+1,level+2].filter(n=>n>=1&&n<=101));
  assert.equal(rows.filter(r=>r.status==='current').length,1);
  for(const row of rows){
   if(row.status==='locked'){assert.equal(row.name,'???');assert.equal(row.gain,null);continue}
   assert.equal(row.name,h.run(`bakeryUpgradeName(${row.index})`));
   const expected=row.index===1?1:1.085**(row.index-1)-1.085**(row.index-2);
   assert.ok(Math.abs(row.gain-expected)<1e-10);
  }
  const html=h.run('renderBakery()');
  if(level===1)assert.match(html,/UPGRADE \+0\.09/);
  assert.doesNotMatch(html,/carousel|browseBakery|Our bakery journey|Multiplies your|power-change|flourishing/);
  assert.equal((html.match(/onclick="showBakeryPowerInfo\(\)"/g)||[]).length,2);
  assert.equal((html.match(/onclick="upgradeDecor\(\)"/g)||[]).length,1);
  if(level===101)assert.doesNotMatch(html,/NEXT|UNLOCK PREVIOUS/);
 }
});

test('panel quotes the unchanged upgrade fee and additive bonus; buy, Undo and reload preserve progression',()=>{
 const h=progressionHarness();
 h.run('g.bakeryLevel=21;g.coins=1e9;price=bakeryUpgradeCost();gain=bakeryFactor(22)-decorBonus();html=renderBakery();before=bakeryValue();coins=g.coins;ok=upgradeDecor()');
 assert.match(h.run('html'),new RegExp(`UPGRADE \\+${h.run('powerLabel(gain)').replace('.','\\.')}`));
 assert.equal(h.run('ok'),true);assert.equal(h.run('g.coins'),h.run('coins-price'));
 assert.ok(Math.abs(h.run('bakeryValue()/before')-1.085)<1e-12);
 const reloaded=progressionHarness(h.json('g'));
 assert.equal(reloaded.run('g.bakeryLevel'),22);
 assert.equal(reloaded.run('undoPurchase(g.purchaseUndo.id)'),true);
 assert.equal(reloaded.run('g.bakeryLevel'),21);
 h.run('g.coins=0;html=renderBakery()');
 assert.match(h.run('html'),/bakery-power-buy" disabled/);
 h.run('showBakeryPowerInfo()');
 assert.equal(h.run('popup.title'),'Bakery Power 👑');
 assert.equal(h.run('popup.html'),'<p class="bakery-power-help">Boosts the coins you earn from every order!</p>');
});

test('sidebar shows the current bakery illustration and exact saved unopened stock without promotional extras',()=>{
 const h=progressionHarness();h.run(`g.bakeryLevel=21;g.packages=[1,2,3,4,5,6,7,8];
  g.run={chests:[{rarity:7}]};before=JSON.stringify(g);html=renderLeft();after=JSON.stringify(g)`);
 assert.equal(h.run('before'),h.run('after'));
 assert.match(h.run('html'),/current-bakery-preview.*<svg.*<figcaption>Cozy counter<\/figcaption>/);
 assert.match(h.run('html'),/id="unopenedPackages"[^>]*>36<\/strong>/);
 assert.match(h.run('html'),/POSSIBLE REWARD/);assert.match(h.run('html'),/8★ FATE/);
 assert.match(h.run('html'),/onclick="openPackages\('buy'\)"/);
 assert.doesNotMatch(h.run('html'),/bakery-row-art|How to play|surprise|favorite|Mastery\.|GET MORE/);
});

test('possible package reward follows actual obtainable package ranks rather than fixed example text',()=>{
 const h=progressionHarness();h.run('ticketProbabilities=()=>[.5,.5,0,0,0,0,0,0];html=renderPackagePanel()');
 assert.match(h.run('html'),/2★ LUCKY/);assert.doesNotMatch(h.run('html'),/8★|FATE/);
});
