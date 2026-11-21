import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/ui/bakery-hub.js',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('function preserveSettingsView(change){'),source.indexOf('const preservedOpenSettings=openSettings;'));

test('Settings preserves scroll and focus through repeated rerendering toggles',()=>{
 let oldPanel,newPanel;
 const focusable=label=>({name:'',label,focusCount:0,getAttribute(k){return k==='aria-label'?label:null},focus(opts){assert.equal(opts.preventScroll,true);this.focusCount++}});
 const makePanel=()=>({scrollTop:405,controls:[focusable('Guide arrows'),focusable('Sounds')],querySelectorAll(){return this.controls},querySelector(){return null}});
 oldPanel=makePanel();
 const doc={activeElement:oldPanel.controls[0],querySelector(){return oldPanel}};
 const context=vm.createContext({document:doc});vm.runInContext(fn,context);
 for(let i=0;i<3;i++){
  const previous=oldPanel;
  vm.runInContext('preserveSettingsView(()=>{replacePanel()})',Object.assign(context,{replacePanel(){newPanel=makePanel();newPanel.scrollTop=0;oldPanel=newPanel;doc.activeElement=previous.controls[0]}}));
  assert.equal(oldPanel.scrollTop,405);assert.equal(oldPanel.controls[0].focusCount,1);
 }
});
test('Baker Number is a readonly trailing visual prefix, not editable Baker Name text',()=>{
 const ui=readFileSync(new URL('../src/ui/co-baker.js',import.meta.url),'utf8');
 assert.match(ui,/<input id="bakerName"[^>]*>\s*<span class="baker-number-prefix"/);
 const css=readFileSync(new URL('../styles/settings-v17.css',import.meta.url),'utf8');
 assert.match(css,/\.baker-number-prefix\{[^}]*border-left/);
 assert.match(css,/\.cobaker-mute-section\{border-top:0;margin-top:0;padding-top:0\}/);
});
test('Orders artwork and badge have scalable layout without reinstating coin names',()=>{
 const css=readFileSync(new URL('../styles/ui-polish-v19.css',import.meta.url),'utf8');
 assert.match(css,/\.scene-ticket-coin-paper\{/);
 assert.match(css,/\.scene-coin-star-badge\{/);
 assert.match(css,/\.scene-reward-image\{[^}]*object-fit:contain/);
 const game=readFileSync(new URL('../src/ui/bakery-hub.js',import.meta.url),'utf8');
 assert.match(game,/scene-coin-star-badge/);
});
test('menu cards preserve eight rarity accents and independent equipment action',()=>{
 const css=readFileSync(new URL('../styles/ui-polish-v19.css',import.meta.url),'utf8');
 assert.match(css,/--food-rarity-soft/);
 assert.match(css,/\.collection-card-statline\{/);
 assert.match(css,/\.collection-card-image\{/);
 assert.match(css,/\.collection-equip/);
 assert.match(css,/\.collection-sign::before/);
 assert.match(css,/:focus-visible/);
});
