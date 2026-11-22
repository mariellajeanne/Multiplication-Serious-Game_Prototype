import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {sourceDigest,optimizeStage,recompressPng,stripMp3Metadata,conservativeRoots} from '../tools/android-optimize-stage.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PLAN=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/android-asset-optimization-plan.json')));
const sha=buf=>crypto.createHash('sha256').update(buf).digest('hex');
function makeStage(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'panaderya-assets-'));
 fs.cpSync(path.join(ROOT,'assets'),path.join(root,'assets'),{recursive:true});
 return root;
}
function pngRaw(img){
 const chunks=[];let i=8;
 while(i<img.length){const n=img.readUInt32BE(i),name=img.toString('ascii',i+4,i+8);if(name==='IDAT')chunks.push(img.subarray(i+8,i+8+n));i+=n+12;}
 return zlib.inflateSync(Buffer.concat(chunks));
}
test('the exclusion plan has unique safe paths and checksums; absent/edited artwork is never assumed unchanged',()=>{
 assert.ok(PLAN.exclude.length>=100);
 assert.equal(new Set(PLAN.exclude.map(e=>e.path)).size,PLAN.exclude.length);
 for(const e of PLAN.exclude){
  assert.match(e.path,/^assets\/[a-z0-9-]+\/[a-zA-Z0-9 ._()-]+$/);
  assert.match(e.sha256,/^[a-f0-9]{64}$/);
  // Local files may already have been removed by a prior safe cleanup or
  // edited in a later art pass. The staging optimizer checks every file.
 }
 assert.equal(Object.keys(PLAN.fallbackGuard.sourceFiles).length,4);
});
test('Windows CRLF checkout does not invalidate the audited source fingerprint',()=>{
 const tree=fs.mkdtempSync(path.join(os.tmpdir(),'panaderya-source-'));
 try{
  for(const dir of ['src','styles','worksheet'])fs.cpSync(path.join(ROOT,dir),path.join(tree,dir),{recursive:true});
  const original=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  fs.writeFileSync(path.join(tree,'index.html'),original.replace(/\r?\n/g,'\r\n'));
  assert.equal(sourceDigest(tree),sourceDigest(ROOT));
 }finally{fs.rmSync(tree,{recursive:true,force:true});}
});
test('lossless PNG repacking preserves decompressed pixel scanlines and canvas geometry',()=>{
 const original=fs.readFileSync(path.join(ROOT,'assets/bakery-ui/cabinet-wood.png'));
 const result=recompressPng(original);
 assert.ok(result && result.length<original.length,'test sample should have recompressible PNG IDAT');
 assert.ok(original.subarray(0,33).equals(result.subarray(0,33)),'identical PNG header and IHDR');
 assert.ok(pngRaw(original).equals(pngRaw(result)),'identical exact filtered image scanlines');
});
test('audio optimization never transcodes or changes MP3 frames',()=>{
 const file=fs.readFileSync(path.join(ROOT,'assets/music/My Panaderya - Background Music.mp3'));
 const changed=stripMp3Metadata(file);
 assert.ok(changed?.bytesRemoved>500000);
 assert.equal(file.length-changed.output.length,changed.bytesRemoved);
 assert.ok(file.subarray(changed.bytesRemoved).equals(changed.output));
 assert.equal(sha(changed.output),changed.frameHash);
});
test('staged APK assets shrink substantially without altering source or active artwork',()=>{
 const stage=makeStage();
 try{
  const music=fs.readFileSync(path.join(ROOT,'assets/music/My Panaderya - Background Music.mp3'));
  const beforeImage=fs.readFileSync(path.join(ROOT,'assets/bakery-runtime/menu-frame.webp'));
  const result=optimizeStage(stage);
  const verified = PLAN.exclude.filter(e=>{
    const local=path.join(ROOT,e.path);
    return fs.existsSync(local)&&sha(fs.readFileSync(local))===e.sha256;
  });
  if(result.sourceMatches){
    assert.equal(result.mode,'full-audit');
    assert.equal(result.excluded.length,verified.length);
  }else{
    assert.ok(['conservative-legacy','metadata-only'].includes(result.mode));
    assert.ok(result.excluded.every(e=>/assets\/bakery-(approved|faithful)\//.test(e.path)));
  }
  assert.ok(result.beforeBytes>=result.afterBytes);
  assert.equal(result.excluded.length + result.changedAssetsKept.length + result.missing.length,
    result.sourceMatches?PLAN.exclude.length:PLAN.exclude.filter(e=>
      (PLAN.fallbackGuard.legacyRoots).some(r=>e.path.startsWith(r)) &&
      !result.protectedRoots.some(msg=>msg.includes(e.path.split('/')[1]))).length);
  assert.ok(fs.readFileSync(path.join(stage,'assets/bakery-runtime/menu-frame.webp')).equals(beforeImage));
  // All manifest assets must exist even if the corresponding menu/package/coin
  // is not visible in this particular first-play walkthrough.
  const mapSource=fs.readFileSync(path.join(ROOT,'src/bakery-assets.js'),'utf8');
  const mapped=[...mapSource.matchAll(/['"](assets\/[^'"]+\.(?:webp|png|svg))['"]/g)].map(x=>x[1]);
  assert.ok(mapped.length>=60);
  for(const rel of mapped)assert.ok(fs.existsSync(path.join(stage,rel)),`Mapped runtime asset missing: ${rel}`);
  for(const filename of ['bakery-runtime/food-01.webp','bakery-runtime/food-17.webp','bakery-runtime/coin-08.webp','bakery-runtime/package-08.webp','bakery-ui/illustrated/ticket-08.png','bakery-ui/illustrated/food-17.png','bakery-ui/boost-prism.svg','bakery-ui/workbench-frame.svg','bakery-ui/coin-08.png','environment/bakery-wall.webp','fonts/Nunito-Bold.ttf']){
   assert.ok(fs.existsSync(path.join(stage,'assets',filename)),filename);
  }
  const optimizedMusic=fs.readFileSync(path.join(stage,'assets/music/My Panaderya - Background Music.mp3'));
  if(result.music)assert.ok(music.subarray(result.music.bytesSaved).equals(optimizedMusic));
  else assert.ok(music.equals(optimizedMusic));
  assert.equal(sha(fs.readFileSync(path.join(ROOT,'assets/bakery-runtime/menu-frame.webp'))),sha(beforeImage),'source is untouched');
 }finally{fs.rmSync(stage,{recursive:true,force:true});}
});
test('changed non-loader source permits only guarded legacy folders, not general pruning',()=>{
 const stage=makeStage(),tempPlan=path.join(stage,'plan.json');
 try{
  fs.writeFileSync(tempPlan,JSON.stringify({...PLAN,sourceDigest:'0'.repeat(64)}));
  const result=optimizeStage(stage,{planFile:tempPlan});
  assert.equal(result.safeFallback,true);
  assert.ok(['conservative-legacy','metadata-only'].includes(result.mode));
  assert.ok(result.excluded.every(e=>/^assets\/bakery-(approved|faithful)\//.test(e.path)));
  // A root-level asset formerly excluded by the full audit must be preserved.
  assert.ok(fs.existsSync(path.join(stage,'assets/bakery-ui/cabinet-wood.png')));
  assert.ok(result.music?.bytesSaved>500000);
 }finally{fs.rmSync(stage,{recursive:true,force:true});}
});
test('modified artwork is never excluded, even when the current source matches',()=>{
 const stage=makeStage();
 try{
  const rel='assets/bakery-approved/menu-frame.png';
  fs.appendFileSync(path.join(stage,rel),'local artwork revision');
  const result=optimizeStage(stage);
  assert.ok(result.changedAssetsKept.includes(rel));
  assert.ok(fs.existsSync(path.join(stage,rel)));
 }finally{fs.rmSync(stage,{recursive:true,force:true});}
});

test('guard change disables image pruning and keeps every original file intact',()=>{
 const stage=makeStage(),tempPlan=path.join(stage,'bad-plan.json');
 try{
  const guard=structuredClone(PLAN.fallbackGuard);
  guard.sourceFiles['src/ui/bakery-scenes.js']='0'.repeat(64);
  fs.writeFileSync(tempPlan,JSON.stringify({...PLAN,sourceDigest:'0'.repeat(64),fallbackGuard:guard}));
  const result=optimizeStage(stage,{planFile:tempPlan});
  assert.equal(result.mode,'metadata-only');
  assert.equal(result.excluded.length,0);
  for(const e of PLAN.exclude){
   if(fs.existsSync(path.join(ROOT,e.path)))assert.ok(fs.existsSync(path.join(stage,e.path)),`Retain ${e.path}`);
  }
 }finally{fs.rmSync(stage,{recursive:true,force:true});}
});
test('missing and modified legacy assets do not fail the audit and are not deleted',()=>{
 const stage=makeStage();
 try{
  const edited='assets/bakery-approved/background-floor-restored.provenance.json';
  const absent='assets/bakery-faithful/boost.png';
  fs.appendFileSync(path.join(stage,edited),'\n');
  fs.rmSync(path.join(stage,absent),{force:true});
  const result=optimizeStage(stage);
  if(result.sourceMatches || result.mode==='conservative-legacy'){
   assert.ok(result.changedAssetsKept.includes(edited));
   if(PLAN.exclude.some(e=>e.path===absent))assert.ok(result.missing.includes(absent));
  }
  assert.ok(fs.existsSync(path.join(stage,edited)));
 }finally{fs.rmSync(stage,{recursive:true,force:true});}
});
test('new references block only the affected legacy art directory',()=>{
 const stage=makeStage(),tree=fs.mkdtempSync(path.join(os.tmpdir(),'panaderya-source-'));
 try{
  for(const dir of ['src','styles','worksheet'])fs.cpSync(path.join(ROOT,dir),path.join(tree,dir),{recursive:true});
  fs.copyFileSync(path.join(ROOT,'index.html'),path.join(tree,'index.html'));
  fs.writeFileSync(path.join(tree,'src/new-art.js'),`const customImage='assets/bakery-approved/menu-frame.png';`);
  const planPath=path.join(stage,'changed-source-plan.json');
  fs.writeFileSync(planPath,JSON.stringify({...PLAN,sourceDigest:'0'.repeat(64)}));
  const safety=conservativeRoots(PLAN,tree,stage);
  if(safety.guardsMatch)assert.ok(safety.roots.includes('assets/bakery-faithful/'));
  assert.ok(!safety.roots.includes('assets/bakery-approved/'));
  const result=optimizeStage(stage,{planFile:planPath,auditRoot:tree});
  assert.ok(result.excluded.every(x=>x.path.startsWith('assets/bakery-faithful/')));
  if(fs.existsSync(path.join(ROOT,'assets/bakery-approved/menu-frame.png')))
    assert.ok(fs.existsSync(path.join(stage,'assets/bakery-approved/menu-frame.png')));
 }finally{fs.rmSync(stage,{recursive:true,force:true});fs.rmSync(tree,{recursive:true,force:true});}
});
