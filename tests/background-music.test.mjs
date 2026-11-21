import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';

const source=readFileSync(new URL('../src/ui/dialogs.js',import.meta.url),'utf8');
const audioCode=source.slice(source.indexOf('// One native streaming player'),source.indexOf('/* One package workspace.'));
function harness(on=false){
 const players=[],events=new Map(),lifecycle=new Map(),saved=[];
 class Audio{
  constructor(src){this.src=src;this.currentTime=0;this.paused=true;this.plays=0;this.pauses=0;this.listeners={};players.push(this)}
  addEventListener(name,fn){this.listeners[name]=fn}
  play(){this.plays++;if(this.fail)return Promise.reject(this.fail);this.paused=false;return this.pending||Promise.resolve()}
  pause(){this.paused=true;this.pauses++}
 }
 const context=vm.createContext({Audio,Promise,g:{musicOn:on,sound:true},music:null,
  save(){saved.push(context.g.musicOn)},openSettings(){},
  document:{addEventListener:(type,fn)=>events.set(type,fn)},window:{addEventListener:(type,fn)=>lifecycle.set(type,fn)}});
 vm.runInContext(audioCode,context);
 const interact=(data={})=>events.get(data.type||'click')({type:'click',isTrusted:true,button:0,...data});
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 return {context,players,saved,interact,flush,lifecycle};
}

test('saved ON waits for a trusted interaction and reuses one looping native MP3',async()=>{
 const h=harness(true);assert.equal(h.players.length,0);
 h.interact({isTrusted:false});h.interact({type:'keydown',key:'Shift'});assert.equal(h.players.length,0);
 h.interact();await h.flush();const audio=h.players[0];
 assert.equal(audio.src,'assets/music/My Panaderya - Background Music.mp3');
 assert.ok(existsSync(new URL('../'+audio.src,import.meta.url)));
 assert.equal(audio.loop,true);assert.equal(audio.preload,'none');assert.equal(audio.paused,false);
 for(let i=0;i<10;i++)h.interact();assert.equal(audio.plays,1);assert.equal(h.players.length,1);
});

test('Music OFF pauses immediately; ON resumes the same time and preserves SFX preference',async()=>{
 const h=harness();h.context.toggleMusic();await h.flush();const audio=h.players[0];audio.currentTime=137;
 h.context.toggleMusic();assert.equal(audio.paused,true);assert.equal(audio.currentTime,137);
 h.context.toggleMusic();await h.flush();assert.equal(audio.paused,false);assert.equal(audio.currentTime,137);
 assert.deepEqual(h.saved,[true,false,true]);assert.equal(h.players.length,1);assert.equal(h.context.g.sound,true);
 const reloaded=harness(h.saved.at(-1));assert.equal(reloaded.players.length,0);reloaded.interact();await reloaded.flush();assert.equal(reloaded.players[0].paused,false);
});

test('autoplay rejection waits for another trusted gesture; media errors do not retry or mute SFX',async()=>{
 const h=harness(true);h.interact();await h.flush();const audio=h.players[0];audio.pause();
 audio.fail={name:'NotAllowedError'};h.context.startMusic();await h.flush();assert.equal(audio.plays,2);
 for(let i=0;i<5;i++)h.context.startMusic();assert.equal(audio.plays,2);
 h.interact({isTrusted:false});assert.equal(audio.plays,2);
 audio.fail=null;h.interact();await h.flush();assert.equal(audio.plays,3);assert.equal(audio.paused,false);
 audio.pause();audio.fail={name:'NotSupportedError'};h.context.startMusic();await h.flush();
 for(let i=0;i<5;i++)h.interact();assert.equal(audio.plays,4);assert.equal(h.context.g.sound,true);
});

test('OFF/ON while play is pending resumes once without creating another player',async()=>{
 const h=harness();h.context.toggleMusic();await h.flush();const audio=h.players[0];audio.pause();
 let reject;audio.pending=new Promise((_,no)=>{reject=no});h.context.startMusic();
 h.context.toggleMusic();assert.equal(audio.paused,true);h.context.toggleMusic();
 audio.pending=null;reject({name:'AbortError'});await h.flush();
 assert.equal(audio.paused,false);assert.equal(h.players.length,1);assert.equal(audio.plays,3);
});

test('Android pause/resume and browser page lifecycle keep position and obey Music OFF',async()=>{
 const h=harness(true);h.interact();await h.flush();const audio=h.players[0];audio.currentTime=900;
 h.lifecycle.get('pagehide')();assert.equal(audio.paused,true);
 h.lifecycle.get('co-baker-resume')();await h.flush();assert.equal(audio.paused,false);assert.equal(audio.currentTime,900);
 h.context.toggleMusic();h.lifecycle.get('pageshow')();await h.flush();assert.equal(audio.paused,true);
});
