import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const drag=source('src/ui/worksheet-drag.js');
const fn=drag.slice(drag.indexOf('function worksheetFullGuidePlan('),drag.indexOf('let worksheetGuideFrame='));
const context=vm.createContext({});vm.runInContext(fn,context);
const plan=(changes={},step={p:72})=>context.worksheetFullGuidePlan({state:{phase:'product',revealed:true,row:0,k:0,A:[9,7],incoming:0,mixed:false,onesPlaced:false,tensPlaced:false,tensLocation:null,...changes},step});
const trip=p=>JSON.parse(JSON.stringify(p));
test('full guide covers the correct live source and destination for every carrying/placing action',()=>{
 assert.deepEqual(trip(plan({incoming:3})),{from:{area:'frame',selector:'[data-carry="0"]'},to:{area:'shell',selector:'[data-answer-digit="ones"]'},label:'Bring the carry to the ones digit.'});
 assert.deepEqual(trip(plan({incoming:3,onesPlaced:true})),{from:{area:'frame',selector:'[data-carry="0"]'},to:{area:'frame',selector:'[data-slot="0:0"]'},label:'Drag the carry onto the placed ones.'});
 assert.deepEqual(trip(plan({mixed:true,onesPlaced:false})),{from:{area:'shell',selector:'[data-answer-digit="ones"]'},to:{area:'frame',selector:'[data-slot="0:0"]'},label:'Drag the ones digit to its column.'});
 assert.deepEqual(trip(plan({mixed:true,onesPlaced:true})),{from:{area:'shell',selector:'[data-answer-digit="tens"]'},to:{area:'frame',selector:'[data-carry="1"]'},label:'Drag the tens digit into the carry shelf.'});
 assert.deepEqual(trip(plan({mixed:true,onesPlaced:true,tensPlaced:true,tensLocation:'row'})),{from:{area:'frame',selector:'[data-slot="0:1"]'},to:{area:'frame',selector:'[data-carry="1"]'},label:'Lift the tens digit into the carry shelf.'});
 assert.deepEqual(trip(plan({mixed:true,onesPlaced:true,k:1})),{from:{area:'shell',selector:'[data-answer-digit="tens"]'},to:{area:'frame',selector:'[data-slot="0:2"]'},label:'Drag the tens digit one column left.'});
 assert.equal(plan({mixed:true,onesPlaced:true,tensPlaced:true,tensLocation:'carry'}),null);
 assert.equal(plan({phase:'sum'}),null);
 assert.equal(plan({revealed:false}),null);
});
test('79 × 18 guides the real first-row carry and shifted second row',()=>{
 const first=plan({row:0,k:0,A:[9,7],mixed:true,onesPlaced:true},{p:72});
 assert.equal(first.to.selector,'[data-carry="1"]');
 const carried=plan({row:0,k:1,A:[9,7],incoming:7,mixed:false,onesPlaced:false},{p:56});
 assert.equal(carried.to.selector,'[data-answer-digit="ones"]');
 const finalTens=plan({row:0,k:1,A:[9,7],incoming:7,mixed:true,onesPlaced:true},{p:56});
 assert.equal(finalTens.to.selector,'[data-slot="0:2"]');
 const secondRow=plan({row:1,k:0,A:[9,7],mixed:true,onesPlaced:false},{p:9});
 assert.equal(secondRow.to.selector,'[data-slot="1:1"]');
});
test('guide is full for the first three completed orders, then remains optional/simpler',()=>{
 for(const path of ['src/ui/worksheet-experience.js','src/ui/worksheet-observation.js'])assert.match(source(path),/g\.tutorialArrows\?\(g\.completed<3\?2:1\):0/);
 assert.match(drag,/Number\(g\.completed\|\|0\)>=3/);
 assert.match(drag,/frame\.contentDocument/);assert.match(source('styles/worksheet-experience.css'),/worksheet-full-guide\{[^}]*pointer-events:none/);
});
test('touch drag handles do not hand input to Android panning, but background remains scrollable',()=>{
 assert.match(source('styles/worksheet-experience.css'),/\[data-answer-digit\]\{touch-action:none/);
 assert.match(source('worksheet/styles/effects-and-guides.css'),/button\[data-carry\]/);
 assert.match(source('src/ui/bakery-scenes.js'),/swipe\.startCamera=bakeryCamera/);
 assert.doesNotMatch(source('src/ui/bakery-scenes.js'),/unavailable\(\)\|\|bakeryJourney\|\|/);
});
