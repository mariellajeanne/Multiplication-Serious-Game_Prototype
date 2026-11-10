/* Preserved worksheet/package runtime assets; current home art is in bakery-hub.js. */
const ILLUSTRATED_FOODS=['pandesal','monay','kababayan','pan-de-coco','spanish-bread','cheese-bread','kalihim','ensaymada','hopia','mamon','pianono','ube-pandesal','buko-pie','brazo','butter-mamon','celebration-ensaymada','ube-ensaymada'];
// Source-cell crop bounds remove neighboring plate edges without changing sprite scale.
const ILLUSTRATED_FOOD_CROPS=[[2,20,98,100],[1,18,98,100],[0,18,94,100],[0,18,98,100],[2,10,99,100],[1,10,98,100],[0,10,97,100],[0,10,98,100],[2,10,100,100],[1,8,98,100],[0,8,98,100],[0,9,98,100],[2,7,98,98],[0,6,98,98],[0,8,95,98],[0,7,98,98],[2,5,100,98]];
function bakeryFoodArt(id,extraClass=''){
 const food=FOOD.find(f=>f.id===id)||FOOD[0],index=ILLUSTRATED_FOODS.indexOf(food.id);
 if(!isIllustratedBakery()||index<0)return foodArt(id,extraClass);
 const [left,top,right,bottom]=ILLUSTRATED_FOOD_CROPS[index],width=right-left,height=bottom-top;
 return `<svg class="food-art illustrated-food ${extraClass}" viewBox="0 0 100 100" role="img" aria-label="${food.name}"><svg x="${left}" y="${top}" width="${width}" height="${height}" viewBox="${index%4*100+left} ${Math.floor(index/4)*100+top} ${width} ${height}" overflow="hidden"><image href="assets/illustrated/foods.webp" width="400" height="500" preserveAspectRatio="none"/></svg></svg>`;
}
function isIllustratedBakery(){return typeof document!=='undefined'&&document.body?.dataset.view==='hub'}
function bakeryPackageArt(rank){return `<svg class="illustrated-package" viewBox="0 0 100 100" aria-hidden="true"><svg width="100" height="100" viewBox="${rank%3*100} ${Math.floor(rank/3)*100} 100 100" overflow="hidden"><image href="assets/illustrated/packages.webp" width="300" height="300" preserveAspectRatio="none"/></svg></svg>`}
function illustratedCoinArt(rank){return `<svg class="coin-tier-art illustrated-coin" viewBox="0 0 100 100" role="img" aria-label="${COIN_TIERS[rank]} illustration"><svg width="100" height="100" viewBox="${rank%4*100} ${Math.floor(rank/4)*100} 100 100" overflow="hidden"><image href="assets/illustrated/coins.webp" width="400" height="200" preserveAspectRatio="none"/></svg></svg>`}
