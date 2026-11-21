import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Settings has Baker Name first, Language next, then sound, help, Guide and Advanced',()=>{
 const hub=source('src/ui/bakery-hub.js');
 const co=source('src/ui/co-baker.js');
 assert.match(hub,/settings-main-sections/);
 assert.match(hub,/languageSettingsMarkup\(\).*?settings-preferences[\s\S]*?hubHelpSettings[\s\S]*?settings-guide[\s\S]*?adult-tools/);
 assert.doesNotMatch(hub.slice(hub.indexOf("showModal('Settings'"),hub.indexOf('const preservedRequestSelectedSale')), /openModes\(|openIngredients\(/);
 assert.match(co,/body\.prepend\(section\)/);
 assert.match(co,/baker-number-prefix/);
 assert.match(co,/body\.querySelector\('#hubHelpSettings'\)/);
 assert.match(co,/body\.querySelector\('#coBakerAdvanced'\)/);
 assert.ok(co.indexOf('cobaker-mute-parent')<co.indexOf('cobaker-mute-explanation'));
 const css=source('styles/settings-v17.css');
 assert.match(css,/\.settings-actions>button\{min-height:52px/);
});
test('Orders have only dynamic tier badge without redundant coin title',()=>{
 for(const path of ['src/ui/bakery-scenes.js','src/ui/bakery-hub.js']){
  const s=source(path); assert.match(s,/scene-coin-star-badge/);assert.match(s,/\$\{rank\+1\} ★/);
 }
 const scene=source('src/ui/bakery-scenes.js');
 const tickets=scene.slice(scene.indexOf('function renderSceneTickets'),scene.indexOf('function renderWorldOrders'));
 assert.doesNotMatch(tickets,/scene-ticket-plaque/);
});
test('Worksheet connection button preserves direction before revealing product',()=>{
 const code=source('worksheet/src/state.js'),start=code.indexOf('function operand('),end=code.indexOf('\nfunction ',start+1);
 const operandCode=code.slice(start,end);
 const invoke=(k1,k2)=>{
  const ctx={s:{phase:'select',k:0,row:0,A:[2],B:[4],first:null},invalid(){},status(){},play(){},render(){},snapshot(){},startMultiplySequence(){},currentIncoming(){return 0},selection:null};
  runInNewContext(operandCode+';globalThis.run=operand;',ctx);
  ctx.run(k1,0);ctx.run(k2,0);return ctx.s;
 };
 assert.deepEqual(Array.from(invoke('top','bottom').expressionOrder),[2,4]);
 assert.deepEqual(Array.from(invoke('bottom','top').expressionOrder),[4,2]);
 assert.equal(invoke('top','bottom').expressionActivated,false);
 const render=source('worksheet/src/worksheet-render-and-tutorial.js');
 assert.match(render,/id="equationReveal"/);assert.match(render,/s\.expressionOrder/);
 assert.match(source('worksheet/src/tap-and-drag.js'),/s\.expressionActivated=true;render\(\);bridgePoll\(\)/);
});
test('Floating worksheet owns Generate and Golden choices, calculator retains answer input only',()=>{
 const s=source('src/ui/worksheet-components.js'),ctx={globalThis:{}};
 runInNewContext(s,ctx);
 const obj={mode:'fact',expression:'2 × 4',display:'?',offered:true,manual:false,multiplier:3,active:true,generate:true,status:'Choose an answer'};
 const markup=ctx.globalThis.WorksheetComponents.calculator(obj);
 assert.doesNotMatch(markup,/worksheet-golden-choice|id="generateAnswer"/);
 const manual=ctx.globalThis.WorksheetComponents.calculator({...obj,manual:true,offered:false});
 assert.match(manual,/calculation-keypad/);
 const render=source('worksheet/src/worksheet-render-and-tutorial.js');
 assert.match(render,/id="equationReveal"/);
 assert.match(render,/data-golden-option="manual"/);
 assert.match(render,/data-golden-option="auto"/);
 assert.match(source('src/game/worksheet-bridge.js'),/m\.type==='fact-activate'/);
});
test('Package reward receipt remains data driven; food gets an independent card frame',()=>{
 const s=source('src/ui/package-experience.js');assert.match(s,/batch-reward-frame/);
 assert.match(s,/g\.owned\.find\(o=>o\.uid===reward\.uid\)/);
 assert.match(s,/batch-card-indicators/);
 const css=source('styles/package-reveal-v17.css');assert.match(css,/stationary food first/);assert.match(css,/batch-panel-emerge/);
 assert.match(s,/collectPackageBatch\(view\.receipt\.id\)/);
});
test('Food index routes to latest art and no longer uses noisy Ube Ensaymada legacy webp',()=>{
 const scene=source('src/ui/bakery-scenes.js');
 const segment=scene.slice(scene.indexOf('const SCENE_ORIGINAL_FOODS'),scene.indexOf('function sceneScrollRail'));
 assert.doesNotMatch(segment,/Set\(\['ube-ensaymada'/);
 assert.match(scene,/const SCENE_APPROVED_SQUARE_FOODS=new Set\([^;]*'ube-ensaymada'/);
 const index=source('src/ui/dialogs.js');assert.match(index,/presentedFoodArt\(f\.id\)/);
});
