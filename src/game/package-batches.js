/* The production purchase view buys and opens as one durable transaction.
 * Prices, capacity, RNG, discovery and duplicate Mastery use the existing rules. */
const packageBatchOffers=new Map();
let packageBatchSequence=0;
function packageBatchId(){return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${++packageBatchSequence}-${Math.random().toString(36).slice(2)}`}
function packageBatchUnavailable(rank,count,source='buy'){
 if(!Number.isInteger(rank)||!PACKAGE_SHOP[rank]||![1,5,10].includes(count)||!['buy','stock'].includes(source))return 'Choose a package and quantity.';
 if(g.packageBatchReceipt)return 'Collect your rewards first.';
 if(g.run&&!g.run.paused)return 'Finish or save your order first.';
 if(source==='stock')return g.packages[rank]>=count?'':'Not enough saved packages.';
 if(!packageUnlocked(rank))return 'Keep practicing to unlock this package.';
 if(count>packageRoom(rank))return 'Open your saved packages to make room.';
 return g.coins>=packagePrice(rank)*count?'':'Not enough coins.';
}
function quotePackageBatch(rank,count,source='buy'){
 const quote={id:packageBatchId(),rank,count,source,price:source==='buy'?packagePrice(rank):0,revision:g.packageRevision,stock:g.packages[rank]};
 quote.total=quote.price*count;packageBatchOffers.set(quote.id,quote);return quote;
}
function commitPackageBatch(id){
 const quote=packageBatchOffers.get(id);packageBatchOffers.clear();
 if(!quote)return false;
 const {rank,count,source}=quote,reason=packageBatchUnavailable(rank,count,source);
 if(reason){toast(reason);return false}
 if(quote.revision!==g.packageRevision||quote.stock!==g.packages[rank]||quote.price!==(source==='buy'?packagePrice(rank):0)||quote.total!==quote.price*count||!packageStockIsCurrent()){
  toast('Your packages or prices changed. Please choose again.');return false;
 }
 const backup=JSON.stringify(g);
 try{
  commitPurchaseUndo('Packages opened');
  if(source==='buy')g.coins-=quote.total;else g.packages[rank]-=count;
  const rewards=Array.from({length:count},()=>{
   const reward=discoverPackageFood(rank,source==='stock');
   return {foodId:reward.food.id,uid:reward.uid,isNew:reward.isNew,masteryUnlocked:reward.masteryUnlocked};
  });
  g.packageRevision++;
  g.packageBatchReceipt={id:quote.id,rank,count,source,total:quote.total,rewards};
  if(save())return g.packageBatchReceipt;
 }catch(error){g=JSON.parse(backup);throw error}
 g=JSON.parse(backup);return false;
}
function collectPackageBatch(id){
 if(!g.packageBatchReceipt||g.packageBatchReceipt.id!==id||!packageStockIsCurrent())return false;
 const receipt=g.packageBatchReceipt,revision=g.packageRevision;
 g.packageBatchReceipt=null;g.packageRevision++;
 if(save())return true;
 g.packageBatchReceipt=receipt;g.packageRevision=revision;return false;
}
function nextPackageToUnlock(){return PACKAGE_SHOP.find(type=>!packageUnlocked(type.rank))||null}
function availablePackageTiers(){return PACKAGE_SHOP.filter(type=>packageUnlocked(type.rank)).slice().reverse()}
function savedPackageBatch(rank){const stock=g.packages[rank]||0;return stock>=10?10:stock>=5?5:stock?1:0}
