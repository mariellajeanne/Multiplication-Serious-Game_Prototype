/** Read-only Windows installer audit before calling Android Gradle. */
import {optimizeStage} from './android-optimize-stage.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const r=optimizeStage(root,{verifyOnly:true});
const size=n=>(n/1048576).toFixed(2);
console.log(`Android optimization mode: ${r.mode}`);
console.log(`Verified files eligible for exclusion: ${r.excluded.length}`);
console.log(`Estimated staged assets: ${size(r.beforeBytes)} MiB -> ${size(r.afterBytes)} MiB`);
if(r.missing.length)console.log(`Already absent legacy assets (safe to skip): ${r.missing.length}`);
if(r.changedAssetsKept.length)console.log(`Edited legacy assets retained: ${r.changedAssetsKept.length}`);
for(const reason of r.protectedRoots)console.log(`Protected: ${reason}`);
if(!r.excluded.length){
 console.error('No artwork can be safely excluded from this source. Keeping the existing APK; provide a fresh project ZIP for a new asset audit.');
 process.exitCode=2;
}
