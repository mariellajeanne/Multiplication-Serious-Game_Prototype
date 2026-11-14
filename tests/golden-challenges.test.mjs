import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {progressionHarness} from './progression-harness.mjs';
function modern(){const h=progressionHarness();vm.runInContext(readFileSync(new URL('../src/game/golden-challenges.js',import.meta.url),'utf8'),h.c);h.run('migrateWorksheetPractice(g);g.board=[{id:901,a:79,b:18,rarity:1,coinTier:1,base:176}];startTicket(901)');return h}
test('three nearby actual denominations, with advertised tier most likely at every boundary',()=>{
 const h=modern();for(let rank=0;rank<8;rank++){
  const options=h.json(`stepCoinOptions(${rank})`);assert.equal(options.length,3);assert.equal(new Set(options.map(o=>o.rank)).size,3);
  assert.ok(Math.abs(options.reduce((sum,o)=>sum+o.chance,0)-1)<1e-12);assert.equal(options.find(o=>o.rank===rank).chance,.7);
  options.forEach(o=>assert.equal(o.base,h.run(`ticketBase(${o.rank})`)));
 }
});
test('generated answers do not demonstrate fact mastery or pay a container',()=>{
 const h=modern();h.run('step=g.run.steps[0];answer=ensureFactAnswer(g.run,step);before=JSON.stringify(g.mathPractice.facts[answer.fact]);generateFactAnswer(g.run,step)');
 assert.equal(h.run('g.run.pool'),0);assert.equal(h.run('g.mathPractice.steps'),0);assert.equal(h.run('JSON.stringify(g.mathPractice.facts[answer.fact])'),h.run('before'));
 assert.equal(h.run('factKey(7,8)===factKey(8,7)'),true);
});
test('correct answers on any of three attempts retain the full advertised multiplier',()=>{
 for(const attempt of [1,2,3]){
  const h=modern();h.run('step=g.run.steps[0];answer=ensureFactAnswer(g.run,step);answer.offered=true;answer.multiplier=12;acceptGoldenChallenge(g.run,step)');
  for(let i=1;i<attempt;i++)h.run('submitGoldenAnswer(g.run,step,"11")');
  assert.equal(h.run('submitGoldenAnswer(g.run,step,String(step.p)).correct'),true);
  assert.equal(h.run('g.run.pool'),0);h.run('Math.random=()=>.5;receipt=grantWorksheetStepCoin(g.run,step)');
  assert.equal(h.run('receipt.multiplier'),12);assert.equal(h.run('receipt.baseAmount'),h.run('receipt.denomination*12'));
  assert.equal(h.run('g.mathPractice.lifetimeCoins[receipt.rank]'),1);
  assert.equal(h.run('g.mathPractice.facts[answer.fact].successByTry[answer.attempts.length-1]'),1);
 }
});
test('empty/incomplete entries do not spend attempts; failure and abandonment retain normal coins',()=>{
 for(const path of ['failed','forfeited']){
  const h=modern();h.run('step=g.run.steps[0];answer=ensureFactAnswer(g.run,step);answer.offered=true;acceptGoldenChallenge(g.run,step)');
  h.run('submitGoldenAnswer(g.run,step,"");submitGoldenAnswer(g.run,step,"7")');assert.equal(h.run('answer.attempts.length'),0);
  if(path==='failed')h.run('for(let i=0;i<3;i++)submitGoldenAnswer(g.run,step,"11")');else h.run('submitGoldenAnswer(g.run,step,"11");generateFactAnswer(g.run,step)');
  assert.equal(h.run('answer.status'),path);h.run('receipt=grantWorksheetStepCoin(g.run,step)');assert.equal(h.run('receipt.multiplier'),1);
  assert.equal(h.run('submitGoldenAnswer(g.run,step,String(step.p)).accepted'),false);
 }
});
test('sealed step receipts do not repeat through undo, reload or a new attempt id',()=>{
 const h=modern();h.run('step=g.run.steps[0];receipt=grantWorksheetStepCoin(g.run,step);before=JSON.stringify([g.run.stepCoins,g.mathPractice]);ensureWorksheetRewards(g.run,true);again=grantWorksheetStepCoin(g.run,step);save()');
 assert.equal(h.run('again'),null);assert.equal(h.run('JSON.stringify([g.run.stepCoins,g.mathPractice])'),h.run('before'));
 const loaded=progressionHarness(h.json('g'));vm.runInContext(readFileSync(new URL('../src/game/golden-challenges.js',import.meta.url),'utf8'),loaded.c);
 assert.equal(loaded.run('grantWorksheetStepCoin(g.run,g.run.steps[0])'),null);
});
test('Boost is applied once to the combined base with one final rounding operation',()=>{
 const h=modern();h.run('g.run.bakersBoost=1.2345;g.run.steps.forEach(step=>grantWorksheetStepCoin(g.run,step));totals=stepCoinTotals(g.run)');
 assert.equal(h.run('totals.total'),h.run('Math.round(totals.base*1.2345)'));
 assert.equal(h.run('totals.counts.reduce((a,b)=>a+b,0)'),4);assert.equal(h.run('totals.subtotals.reduce((a,b)=>a+b,0)'),h.run('totals.base'));
 assert.equal(h.run('completeWorksheetProcedure(g.run)'),false,'Payment still requires authenticated procedural completion');
});
