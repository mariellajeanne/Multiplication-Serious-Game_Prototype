import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const scripts=[
 'src/data/catalog.js','src/game/state.js','src/game/rewards.js',
 'src/game/economy.js','src/ui/dialogs.js','src/ui/scene.js',
 'src/ui/menu.js','src/game/v33-bridge.js','src/main.js'
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
test('worksheet uses external v33 engine, bridge and tutorial/sound controls',()=>{
  assert.ok(existsSync(resolve(root,'worksheet/v33-engine.html')));
  const eng=readFileSync(resolve(root,'worksheet/v33-engine.html'),'utf8');
  const main=readFileSync(resolve(root,'src/main.js'),'utf8');
  const bridge=readFileSync(resolve(root,'src/game/v33-bridge.js'),'utf8');
  assert.match(main,/fr\.src='worksheet\/v33-engine\.html'/);
  assert.match(eng,/source:'bc-v33'/);
  assert.match(eng,/source!=='bc-shell'/);
  assert.match(bridge,/function toggleArrows/);
  assert.match(bridge,/function toggleSfx/);
  assert.match(bridge,/function handleV33Message/);
});
test('CSS and menu/ticket renderer are present',()=>{
  for(const s of ['styles/base.css','styles/menu.css','styles/tickets.css','styles/worksheet.css']) {
    assert.ok(existsSync(resolve(root,s)));
    assert.ok(html.includes(`href="${s}"`));
  }
  const menu=readFileSync(resolve(root,'src/ui/menu.js'),'utf8');
  assert.match(menu,/function renderMenu/);
  assert.match(menu,/buyMenuSlot/);
  const tickets=readFileSync(resolve(root,'styles/tickets.css'),'utf8');
  assert.match(tickets,/\.ticket\.r[0-5]/);
});
