import test from 'node:test';
import assert from 'node:assert/strict';
import {progressionHarness} from './progression-harness.mjs';

test('duplicate drops only expand capacity and leave the invested recipe and assignment unchanged',()=>{
 const h=progressionHarness();h.run(`g.coins=1e8;discoverFood(F('pandesal'));buyMastery([1]);
 g.owned[0].fusion=3;g.owned[0].baseCarry=2;before=JSON.stringify([g.owned,g.activeMenu,g.coins]);ceiling=g.recipeCeilings.pandesal;
 for(let i=0;i<1000;i++)discoverFood(F('pandesal'));after=JSON.stringify([g.owned,g.activeMenu,g.coins]);save()`);
 assert.equal(h.run('before'),h.run('after'));
 assert.equal(h.run('g.recipeCeilings.pandesal'),h.run('ceiling+1000'));
 assert.equal(h.run('g.owned.length'),1);
 assert.equal(progressionHarness(h.json('g')).run('g.owned.length'),1);
});

test('legacy duplicate consolidation preserves equipped identity, strongest value, mastery, investment and resale',()=>{
 const h=progressionHarness();const old=h.json('g');
 old.owned.push({uid:2,id:'pandesal',mastery:9,level:5,fusion:3,spent:900,baseCarry:2});
 old.recipeCeilings.pandesal=12;old.uidNext=3;old.menuSlots=99;delete old.uniqueFoodsVersion;
 const originalValue=h.run(`individualValue(${JSON.stringify(old.owned[1])})`);
 const resale=h.run(`resalePrice(${JSON.stringify(old.owned[0])})+resalePrice(${JSON.stringify(old.owned[1])})`);
 const migrated=progressionHarness(old);
 assert.equal(migrated.store.get('panaderyaQuestV2BeforeUniqueFoods'),JSON.stringify(old));
 assert.equal(migrated.run('g.owned.length'),1);assert.equal(migrated.run('g.owned[0].uid'),1);
 assert.deepEqual(migrated.json('g.activeMenu'),[1]);assert.equal(migrated.run('recipeMastery(g.owned[0])'),9);
 assert.equal(migrated.run('g.owned[0].spent'),900);assert.equal(migrated.run('resalePrice(g.owned[0])'),resale);
 assert.ok(migrated.run('foodValue(g.owned[0])')>=originalValue-1e-10);
 assert.equal(migrated.run('g.menuSlots'),migrated.run('FOOD.length'));
 migrated.run('before=JSON.stringify(g);migrateFrame11(g)');assert.equal(migrated.run('JSON.stringify(g)'),migrated.run('before'));
});

test('slot purchases cap at the complete Food Index even with just one discovered recipe',()=>{
 const h=progressionHarness();h.run('g.coins=1e100;while(buyMenuSlot()){};before=g.coins;extra=buyMenuSlot()');
 assert.equal(h.run('g.menuSlots'),h.run('FOOD.length'));assert.equal(h.run('g.discovered.length'),1);
 assert.equal(h.run('extra'),false);assert.equal(h.run('g.coins'),h.run('before'));
});

test('an empty Unbox selection chooses available stock, and zero stock has no purchasable quantity',()=>{
 const h=progressionHarness();h.run(`g.packages[4]=7;openPackages('unbox',0);selection=packageType;html=popup.html;
 g.packages[4]=0;openPackages('unbox',4);setPackageQuantity(999)`);
 assert.equal(h.run('selection'),4);assert.match(h.run('html'),/MAX = all saved Blessed packages/);
 assert.equal(h.run('packageQuantity'),0);assert.match(h.run('popup.html'),/Your shelf is empty/);
});

test('rounded display never rounds a nonzero chance to zero or mutates model precision',()=>{
 const h=progressionHarness();assert.equal(h.run('probabilityLabel(1e-12)'),'<0.01%');
 assert.equal(h.run('probabilityLabel(0)'),'0.00%');assert.equal(h.run('powerLabel(5.112046)'), '5.11');
 assert.equal(h.run('BAKERY_POWER_CONFIG.factor'),1.085);
 h.run(`Math.random=()=>0;g.packages[0]=5;unboxPackages(0,5,true);html=popup.html`);
 assert.equal((h.run('html').match(/<article class="package-reward/g)||[]).length,1);
 assert.match(h.run('html'),/\+5 Recipe Mastery upgrades unlocked/);assert.doesNotMatch(h.run('html'),/resolved-coins|resolved-luck|resolved-practice/);
});

test('ingredient previews use actual unbounded Mastery rather than the legacy Level 5 mirror',()=>{
 const h=progressionHarness();h.run('g.owned[0].mastery=10;g.owned[0].level=5;html=outputPreview(g.owned[0])');
 assert.match(h.run('html'),/Mastery 10/);assert.match(h.run('html'),/370%/);
 assert.match(h.run('html'),/5\.64/);
});
