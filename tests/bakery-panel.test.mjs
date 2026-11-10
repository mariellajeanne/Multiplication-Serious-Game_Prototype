import test from 'node:test';
import assert from 'node:assert/strict';
import {progressionHarness} from './progression-harness.mjs';

test('Power migration archives investments, preserves unlocked packages and frozen payouts, and is idempotent',()=>{
 const old=progressionHarness().json('g');delete old.bakeryHubVersion;
 old.bakeryLevel=450;old.bakerySpent=123456;old.coins=700;old.packages[7]=73;
 old.run={ticket:{id:42,a:79,b:18,base:176,rarity:1},phase:'claim',coinRewardsVersion:1,budget:9999,pool:9999,bakersBoost:9999/176};
 old.orderRuns={42:old.run};old.board=[old.run.ticket];
 const h=progressionHarness(old);
 assert.deepEqual(h.json('g.retiredBakeryPower'),{level:450,spent:123456});
 assert.equal(h.run('g.coins'),700);assert.equal(h.run('g.packages[7]'),73);
 assert.equal(h.run('g.run.pool'),9999);assert.equal(h.run('g.run.budget'),9999);
 assert.equal(h.run('g.bakeryLevel'),1);assert.equal(h.run('decorBonus()'),1);
 assert.equal(h.run('bakeryValue()'),1.2);assert.equal(h.run('packageUnlocked(7)'),true);
 assert.equal(h.run('packageUnlocked(8)'),false);
 assert.equal(h.run('typeof upgradeDecor'), 'undefined');
 h.run('before=JSON.stringify(g);migrateBakeryHub(g)');assert.equal(h.run('JSON.stringify(g)'),h.run('before'));
});

test('legacy sidebar has only packages; Boost explains equipped foods with no Power purchase path',()=>{
 const h=progressionHarness();h.run('g.packages=[1,2,3,4,5,6,7,8,9];before=JSON.stringify(g);html=renderLeft();showBoostInfo()');
 assert.equal(h.run('JSON.stringify(g)'),h.run('before'));
 assert.match(h.run('html'),/id="unopenedPackages"[^>]*>45<\/strong>/);
 assert.match(h.run('html'),/9? SOVEREIGN/);
 assert.doesNotMatch(h.run('html'),/bakery-power|upgradeDecor/);
 assert.match(h.run('popup.html'),/Equipped-food Menu Boost/);
 assert.doesNotMatch(h.run('popup.html'),/Bakery Power/);
});

test('future helper ticks lose retired Power while coins already earned remain untouched',()=>{
 const old=progressionHarness().json('g');delete old.bakeryHubVersion;
 old.bakeryLevel=21;old.coins=123;old.staff={until:Date.now()+120000,rate:100*1.085**20,fraction:.5};
 const h=progressionHarness(old);assert.equal(h.run('g.coins'),123);
 assert.ok(Math.abs(h.run('g.staff.rate')-100)<1e-9);assert.equal(h.run('g.staff.fraction'),.5);
});
