import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
export function progressionHarness(saved=null){
 const store=new Map(saved?[['panaderyaQuestV2',JSON.stringify(saved)]]:[]);
 const c=vm.createContext({Math:Object.create(Math),Date:class extends Date {},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
 document:{getElementById:()=>null,querySelector:()=>null},setTimeout:()=>{}});
 for(const f of ['src/data/catalog.js','src/game/progression.js','src/game/state.js','src/game/rewards.js','src/game/progression-economy.js','src/game/economy.js','src/ui/bakery-art.js','src/ui/dialogs.js','src/ui/scene.js','src/ui/menu.js'])vm.runInContext(readFileSync(resolve(import.meta.dirname,'..',f),'utf8'),c);
 vm.runInContext(`toast=()=>{};render=()=>{};showModal=(title,html)=>{popup={title,html}};closeModal=()=>{};checkUnlocks=()=>{}`,c);
 return {c,store,run:code=>vm.runInContext(code,c),json:code=>JSON.parse(JSON.stringify(vm.runInContext(code,c)))};
}
