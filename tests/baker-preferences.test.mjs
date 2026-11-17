import test from 'node:test';
import assert from 'node:assert/strict';
await import('../src/network/co-baker.js');
await import('../src/network/baker-preferences.js');
const p=(n,name,number)=>({id:String(n).padStart(32,'0'),name,number});
test('Crew persists UUID identities, sorts by name then number, and never connects peers',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},a=new CoBakerPreferences(storage);
 for(const peer of [p(1,'Zoe','1000'),p(2,'Ada','3000'),p(3,'Ada','1000')])assert.equal(a.toggle(peer),true);
 const b=new CoBakerPreferences(storage),list=b.list([p(2,'Ada','3000')],true);
 assert.deepEqual(list.map(x=>x.id),[p(3).id,p(2).id,p(1).id]);assert.deepEqual(list.map(x=>x.reachable),[false,true,false]);
 assert.equal(b.toggle(p(2,'Ada','3000')),true);assert.equal(new CoBakerPreferences(storage).crew.size,2);
});
test('DND and worksheet parent mute override without deleting child preferences',()=>{
 const a=new CoBakerPreferences({getItem:()=>null,setItem(){}});
 for(const c of ['bakery','solo','assisted','helping'])assert.equal(a.available(c),true);
 a.set('solo',true);a.set('worksheet',true);assert.equal(a.available('helping'),false);assert.equal(a.available('bakery'),true);
 a.set('dnd',true);assert.equal(a.available('bakery'),false);a.set('dnd',false);a.set('worksheet',false);
 assert.equal(a.available('solo'),false);assert.equal(a.available('helping'),true);assert.equal(a.mutes.solo,true);
});
test('failed preference saves preserve the previous local controls and Crew',()=>{
 const a=new CoBakerPreferences({getItem:()=>null,setItem(){throw new Error('full')}});assert.equal(a.set('dnd',true),false);assert.equal(a.available('bakery'),true);assert.equal(a.toggle(p(1,'Ada','3000')),false);assert.equal(a.crew.size,0);
});
