import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=rel=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');
function setup(lang){
 const document={documentElement:{lang:'en'},addEventListener(){}};
 const localStorage={getItem:key=>key==='panaderyaQuestLanguage'?lang:null,setItem(){}};
 const context=vm.createContext({document,localStorage,console,window:{addEventListener(){}}});
 vm.runInContext(read('src/ui/language.js'),context);
 vm.runInContext(read('src/ui/worksheet-components.js'),context);
 return {translate:en=>vm.runInContext(`uiText(${JSON.stringify(en)})`,context),calc:view=>vm.runInContext(`WorksheetComponents.calculator(${JSON.stringify(view)})`,context),tray:view=>vm.runInContext(`WorksheetComponents.tray(${JSON.stringify(view)})`,context)};
}
const screenshots={
 'A new surprise awaits!':'May bagong sorpresa!',
 'Earn coins from playing to discover your next package.':'Maglaro at kumita ng coins para ma-unlock ang susunod na package.',
 'Next Discovery':'Susunod na Package',
 'Ready for a recipe':'Handa na para sa recipe!',
 'More recipes to discover':'May iba pang recipe na puwedeng ma-unlock!',
 'Golden Challenge!':'Gintong Hamon!',
 'Solve it yourself for bonus coins!':'Sagutan mo nang mag-isa para sa dagdag na coins!',
 '← Drag to the worksheet':'← I-drag papunta sa worksheet',
 'Your order is ready to complete.':'Handa nang tapusin ang order mo!',
 'This digit is waiting for the carry. Add it here on the sheet.':'Kailangan pa ng carry ang digit na ito. Ilagay ang carry dito sa worksheet.',
 'Add the waiting carry':'Idagdag ang carry',
 'Place the digits':'Ilagay ang mga digit',
 'Add the rows':'I-add ang mga hanay',
 'Swipe down on the worksheet to finish your order.':'Mag-swipe pababa sa worksheet para matapos ang order mo.',
 'All placed!':'Nailagay na lahat!',
 'Digit placed!':'Nailagay na ang digit!',
 'Connect these two digits.':'Pagdugtungin ang dalawang digit na ito.'
};
test('every screenshot phrase has a child-friendly Tagalog rendering',()=>{
 const t=setup('tl');for(const [en,tl] of Object.entries(screenshots))assert.equal(t.translate(en),tl,en);
 const en=setup('en');for(const key of Object.keys(screenshots))assert.equal(en.translate(key),key);
});
test('worksheet title, guidance, carry, challenge, sum and complete appear in Tagalog',()=>{
 const t=setup('tl');
 assert.match(t.calc({mode:'complete'}),/Nailagay na lahat!/);
 assert.match(t.calc({mode:'complete'}),/Handa nang tapusin ang order mo!/);
 assert.match(t.calc({mode:'sum'}),/I-add ang mga hanay/);
 assert.match(t.calc({mode:'sum'}),/Mag-swipe pababa sa worksheet/);
 const offered=t.calc({mode:'fact',expression:'6 × 6',display:'?',offered:true,multiplier:2,status:'Connect these two digits.'});
 assert.match(offered,/Gintong Hamon!/);
 assert.match(offered,/Sagutan mo nang mag-isa/);
 assert.match(offered,/Pagdugtungin ang dalawang digit na ito/);
 const carried=t.tray({waiting:1,armed:false,label:'Add the waiting carry',digits:[{part:'ones',value:3}],demo:true,demoDigit:'3'});
 assert.match(carried,/Idagdag ang carry/);
 assert.match(carried,/I-drag papunta sa worksheet/);
 assert.match(t.tray({waiting:0,armed:false,label:'Place the digits',digits:[]}),/Ilagay ang mga digit/);
 assert.match(t.calc({mode:'fact',expression:'3 × 6',display:'18',status:'Digit placed!'}),/Nailagay na ang digit/);
});
test('package and home use dynamic translations, while bridge protocol remains unchanged',()=>{
 const scenes=read('src/ui/bakery-scenes.js');
 assert.match(scenes,/uiText\(i<g\.menuSlots\?/);
 assert.match(scenes,/uiText\('A new surprise awaits!'\)/);
 assert.match(scenes,/uiText\('Earn coins from playing to discover your next package\.'\)/);
 assert.match(scenes,/uiText\('Next Discovery'\)/);
 const engine=read('worksheet/src/worksheet-render-and-tutorial.js');
 assert.match(engine,/prompt\.textContent=typeof uiText/);
 const main=read('worksheet/src/state.js');
 assert.match(main,/\$\('status'\)\.textContent=typeof uiText/);
 const observer=read('src/network/worksheet-observation.js');
 assert.match(observer,/\['Add the waiting carry','Place the digits'\]/);
 const drag=read('src/ui/worksheet-drag.js');
 assert.match(drag,/label:state\.onesPlaced/);
 const iframe=read('worksheet/worksheet-engine.html');
 const helper=read('worksheet/worksheet-observer.html');
 for(const html of [iframe,helper])assert.match(html,/src="\.\.\/src\/ui\/language\.js"/);
});
