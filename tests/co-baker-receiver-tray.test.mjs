import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function mock(){
 let modalOpen=true,observerCallback,holder;
 const classes=new Set();
 const classList={add:c=>classes.add(c),remove:c=>classes.delete(c),toggle(c,state){if(state)classes.add(c);else classes.delete(c)},contains:c=>classes.has(c)};
 const body={appendChild(node){node.parentElement=body}};
 const modal={};
 const calculator={getClientRects:()=>[1],prepend(node){node.parentElement=calculator}};
 const peer={id:'a'.repeat(32),name:'Ada',number:'1234'};
 const help={incoming:new Map([['b'.repeat(32),{requestId:'b'.repeat(32),ownerId:peer.id,expiresAt:Date.now()+15000}]]),terminals:new Map(),calls:new Map(),log:[],preferences:{crew:new Map()},active:null,accepting:null,
  clock:()=>Date.now(),observe(fn){this.notify=fn;fn(this)},outgoing:null};
 const service={peers:new Map([[peer.id,peer]]),candidates:new Map(),help,observe(fn){fn(this)}};
 const document={body,getElementById(id){return id==='coBakerInvitations'?holder:id==='modals'?{}:null},querySelector(selector){return selector==='#modals .modal'&&modalOpen?modal:selector==='.worksheet-modern .worksheet-calculator'?calculator:null},createElement(){holder={parentElement:null,classList,setAttribute(){},querySelectorAll:()=>[],querySelector:()=>null,set innerHTML(html){this.content=html},get innerHTML(){return this.content}};return holder},addEventListener(){}};
 const context={document,innerWidth:1280,innerHeight:800,window:null,renderWorksheet:()=>'',setInterval(){},addEventListener(){},CoBakerHelpRules:{inviteMs:15000},MutationObserver:class {constructor(callback){observerCallback=callback}observe(){}},
  get panaderyaCoBaker(){return service}};
 context.window=context;
 vm.runInNewContext(readFileSync(new URL('../src/ui/co-baker-help.js',import.meta.url),'utf8'),context);
 return {holder:()=>holder,help,classes,body,calculator,modal(open){modalOpen=open;observerCallback?.()}};
}

test('incoming invitations remain above an open Settings modal, then return to the worksheet dock',()=>{
 const dom=mock(),tray=dom.holder();
 assert.equal(tray.parentElement,dom.body);
 assert.equal(dom.classes.has('is-modal-tray'),true);
 assert.equal(dom.classes.has('is-docked'),false);
 assert.match(tray.innerHTML,/data-help-accept/);
 assert.equal(tray.hidden,false);
 dom.modal(false);
 assert.equal(tray.parentElement,dom.calculator);
 assert.equal(dom.classes.has('is-modal-tray'),false);
 assert.equal(dom.classes.has('is-docked'),true);
 dom.modal(true);
 assert.equal(tray.parentElement,dom.body);
 assert.equal(dom.classes.has('is-modal-tray'),true);
});
