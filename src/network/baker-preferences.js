/* Owner-only preferences. Only the calculated availability crosses the wire. */
(function(root){
 'use strict';
 const KEY='panaderyaCoBakerPreferencesV1',fields=['dnd','bakery','worksheet','solo','assisted','helping'];
 class Preferences{
  constructor(storage=root.localStorage){this.storage=storage;this.mutes=Object.fromEntries(fields.map(k=>[k,false]));this.crew=new Map();try{const saved=JSON.parse(storage?.getItem(KEY)||'{}');for(const k of fields)this.mutes[k]=saved.mutes?.[k]===true;for(const p of (saved.crew||[]).slice(0,128))if(root.CoBakerCore.validProfile(p))this.crew.set(p.id,{id:p.id,name:p.name,number:p.number})}catch(_){}
  }
  save(){try{this.storage?.setItem(KEY,JSON.stringify({mutes:this.mutes,crew:[...this.crew.values()]}));return true}catch(_){return false}}
  set(key,value){if(!fields.includes(key))return false;const old=this.mutes[key];this.mutes[key]=!!value;if(!this.save()){this.mutes[key]=old;return false}return true}
  available(context){const m=this.mutes;return !(m.dnd||(context==='bakery'?m.bakery:m.worksheet||m[context]))}
  toggle(p){if(!root.CoBakerCore.validProfile(p))return false;const old=new Map(this.crew);if(this.crew.has(p.id))this.crew.delete(p.id);else if(this.crew.size<128)this.crew.set(p.id,{id:p.id,name:p.name,number:p.number});if(!this.save()){this.crew=old;return false}return true}
  list(peers,crewOnly=false){const nearby=new Map(peers.map(p=>[p.id,p]));return [...(crewOnly?this.crew:nearby).values()].map(p=>({...p,...nearby.get(p.id),reachable:nearby.has(p.id)})).sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'})||a.number.localeCompare(b.number)||a.id.localeCompare(b.id))}
 }
 root.CoBakerPreferences=Preferences;root.CoBakerPreferenceKey=KEY;
})(globalThis);
