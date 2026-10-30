import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const scripts=[
 'src/data/catalog.js','src/game/progression.js','src/game/state.js','src/game/rewards.js',
 'src/game/progression-economy.js','src/game/economy.js','src/ui/bakery-art.js','src/ui/dialogs.js','src/ui/scene.js',
 'src/ui/menu.js','src/ui/reward-feedback.js','src/game/worksheet-bridge.js','src/main.js'
];
test('all classic scripts are included in dependency order',()=>{
  let prev=-1;
  for(const s of scripts){
    assert.ok(existsSync(resolve(root,s)),`missing ${s}`);
    const here=html.indexOf(`src="${s}"`);
    assert.ok(here>prev,`wrong order: ${s}`);
    prev=here;
  }
});
test('all scripts parse as JavaScript',()=>{
  for(const s of scripts){
    const r=spawnSync(process.execPath,['--check',resolve(root,s)],{encoding:'utf8'});
    assert.equal(r.status,0,`${s}: ${r.stderr}`);
  }
});
test('worksheet uses modular worksheet engine, bridge and tutorial/sound controls',()=>{
  assert.ok(existsSync(resolve(root,'worksheet/worksheet-engine.html')));
  const eng=readFileSync(resolve(root,'worksheet/worksheet-engine.html'),'utf8');
  const main=readFileSync(resolve(root,'src/main.js'),'utf8');
  const bridge=readFileSync(resolve(root,'src/game/worksheet-bridge.js'),'utf8');
  assert.match(main,/fr\.src='worksheet\/worksheet-engine\.html'/);
  const wb=readFileSync(resolve(root,'worksheet/src/parent-bridge.js'),'utf8');
  assert.match(wb,/source:'pq-worksheet'/);
  assert.match(wb,/source!=='bc-shell'/);
  assert.match(bridge,/function toggleArrows/);
  assert.match(bridge,/function toggleSfx/);
  assert.match(bridge,/function handleWorksheetMessage/);
});
test('CSS and menu/ticket renderer are present',()=>{
  for(const s of ['styles/base.css','styles/menu.css','styles/tickets.css','styles/worksheet.css','styles/bakery-theme.css','styles/feedback-layout.css','styles/progression.css']) {
    assert.ok(existsSync(resolve(root,s)));
    assert.ok(html.includes(`href="${s}"`));
  }
  const menu=readFileSync(resolve(root,'src/ui/menu.js'),'utf8');
  assert.match(menu,/function renderMenu/);
  assert.match(menu,/buyMenuSlot/);
  const tickets=readFileSync(resolve(root,'styles/tickets.css'),'utf8');
  assert.match(tickets,/\.ticket\.r[0-5]/);
});

test('worksheet engine scripts load in order and parse',()=>{
  const document=readFileSync(resolve(root,'worksheet/worksheet-engine.html'),'utf8');
  const files=['src/state.js','src/sound-and-multiplication-fx.js','src/product-placement.js',
    'src/partial-product-addition.js','src/worksheet-render-and-tutorial.js','src/tap-and-drag.js',
    'src/worksheet-controls.js','src/parent-bridge.js','src/embedded-controls.js'];
  let last=-1;
  for(const f of files){
    const relative='worksheet/'+f;
    assert.ok(existsSync(resolve(root,relative)));
    const idx=document.indexOf(`src="${f}"`);
    assert.ok(idx>last,`wrong worksheet script order: ${f}`);last=idx;
    const checked=spawnSync(process.execPath,['--check',resolve(root,relative)],{encoding:'utf8'});
    assert.equal(checked.status,0,checked.stderr);
  }
  for(const f of ['foundation.css','effects-and-guides.css','receipt-theme.css','embedded-layout.css','custom-theme.css','responsive-workspace.css']) {
    assert.ok(document.includes(`href="styles/${f}"`));
  }
});
