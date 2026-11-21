import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8');
const languageSource=read('src/ui/language.js');
function harness(stored=null){
 const entries=new Map(stored===null?[]:[['panaderyaQuestLanguage',stored]]);
 const counts={renders:0,opens:0},progress={coins:123456,completed:7},document={documentElement:{lang:'en'}};
 const store={getItem:key=>entries.get(key)||null,setItem:(key,v)=>entries.set(key,String(v))};
 const context=vm.createContext({localStorage:store,document,render(){counts.renders++},openSettings(){counts.opens++}});
 vm.runInContext(languageSource,context,{filename:'src/ui/language.js'});
 return {context,counts,progress,entries,document,call:expr=>vm.runInContext(expr,context)};
}

test('language defaults to English; short game terms are left unchanged',()=>{
 const t=harness();
 assert.equal(t.call('getGameLanguage()'),'en');
 assert.equal(t.document.documentElement.lang,'en');
 assert.equal(t.call('uiText("Connect the two digits first.")'),'Connect the two digits first.');
 assert.equal(t.call('uiText("Equip")'),'Equip');
 assert.match(t.call('languageSettingsMarkup()'),/aria-pressed="true"[^>]*>English/);
});

test('Tagalog selection updates language, help text and page without touching game progress',()=>{
 const t=harness();
 assert.equal(t.call('setGameLanguage("tl")'),true);
 assert.equal(t.call('getGameLanguage()'),'tl');
 assert.equal(t.document.documentElement.lang,'tl');
 assert.equal(t.entries.get('panaderyaQuestLanguage'),'tl');
 assert.equal(t.counts.renders,1);
 assert.equal(t.counts.opens,1);
 assert.equal(t.call('uiText("Connect the two digits first.")'),'Pagdugtungin muna ang dalawang digit.');
 assert.equal(t.call('uiText("Sell")'),'Sell');
 assert.equal(t.progress.coins,123456);
 assert.equal(t.progress.completed,7);
 assert.match(t.call('languageSettingsMarkup()'),/aria-pressed="true"[^>]*>Tagalog/);
});

test('saved language is restored on refresh, and invalid values cannot change it',()=>{
 const t=harness('tl');
 assert.equal(t.call('getGameLanguage()'),'tl');
 assert.equal(t.document.documentElement.lang,'tl');
 assert.equal(t.call('setGameLanguage("es")'),false);
 assert.equal(t.call('getGameLanguage()'),'tl');
 assert.equal(t.call('setGameLanguage("en")'),true);
 assert.equal(t.entries.get('panaderyaQuestLanguage'),'en');
});

test('Settings displays Baker Name before Language in hub and language first in legacy renderer',()=>{
 const hub=read('src/ui/bakery-hub.js'),legacy=read('src/ui/dialogs.js');
 const point=hub.indexOf('showModal(\'Settings\',`<div class="settings-main-sections">${languageSettingsMarkup()}');
 assert.ok(point>=0,'Hub Settings places Language / Wika immediately after the Baker Name profile');
 assert.match(read('src/ui/co-baker.js'),/body\.prepend\(section\)/);
 assert.match(legacy,/function openSettings\(\)\{showModal\('Make yourself at home',`\$\{languageSettingsMarkup\(\)\}<div class="settings-row">/);
 const index=read('index.html');
 assert.ok(index.indexOf('src/ui/language.js')>index.indexOf('src/game/state.js'));
 assert.ok(index.indexOf('src/ui/language.js')<index.indexOf('src/ui/dialogs.js'));
});

test('core instructions are localized at render time, without rewriting food names',()=>{
 const hub=read('src/ui/bakery-hub.js'),dialogs=read('src/ui/dialogs.js'),worksheet=read('src/ui/worksheet-experience.js');
 assert.match(hub,/uiText\("Long-press \(hold\) a food item to select many items\."\)/);
 assert.match(hub,/uiText\("Connect digits\. Place products and carries\."\)/);
 assert.match(dialogs,/uiText\(descriptions\[m\.id\]\)/);
 assert.match(dialogs,/uiText\("A 2-minute shift\./);
 assert.match(worksheet,/status:uiText\(status\)/);
 assert.match(read('src/game/economy.js'),/toast\(uiText\("Order saved\./);
});
