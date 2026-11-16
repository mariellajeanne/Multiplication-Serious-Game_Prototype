/* Narrow adapter to the existing save/economy. Receiving a bonus never renders
 * or replaces the helper's personal worksheet. No reward input reaches it. */
(function(){
 'use strict';
 const d=window.panaderyaCoBaker;if(!d?.guidance)return;
 const rewards=new CoBakerRewards.Rewards(d,{
  state:()=>g,run:()=>g.run,save:()=>save(),
  session:()=>{try{return document.getElementById('worksheetFrame')?.contentWindow?.getWorksheetSession?.()}catch(_){return null}},
  context:(r,id,sessionId)=>({id,sessionId,orderId:r.ticket.id,a:r.ticket.a,b:r.ticket.b,tier:ticketCoinTier(r.ticket),
   bases:usesStepCoins(r)?r.stepCoins.options.map(o=>o.base):[r.baseCoins??r.ticket.base],legacy:!usesStepCoins(r)}),
  quote:c=>c.legacy?c.bases[0]:orderCoinQuote({a:c.a,b:c.b,coinTier:c.tier},1),
  validContext:c=>(c.legacy?c.bases.length===1&&c.bases[0]===ticketBase(c.tier):JSON.stringify(c.bases)===JSON.stringify(stepCoinOptions(c.tier).map(o=>o.base)))&&(!('quote'in c)||c.quote===(c.legacy?c.bases[0]:orderCoinQuote({a:c.a,b:c.b,coinTier:c.tier},1))),
  denominations:r=>usesStepCoins(r)?r.steps.map(step=>r.stepCoins.receipts[worksheetStepKey(step)]?.denomination):[r.baseCoins??r.ticket.base]
 });
 let noticeTimer;
 rewards.observe(event=>{
  let notice=document.getElementById('coBakerRewardNotice');
  if(!notice){notice=document.createElement('aside');notice.id='coBakerRewardNotice';notice.className='cobaker-reward-notice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');document.body.appendChild(notice)}
  notice.textContent=event.kind==='contribution'?'Helpful step recorded.':`Co-Baker bonus: +${fmt(event.coins)} coins for helping another Baker.`;
  notice.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{notice.hidden=true},4500);
  // Update the existing bakery balance only; preserve every live interaction.
  const balance=document.getElementById('walletCoins');if(balance)balance.textContent=amountLabel(g.coins);
  const wallet=document.getElementById('wallet-button');if(wallet)wallet.setAttribute('aria-label',`View ${amountLabel(g.coins)} coins`);
 });
 const prior=window.render_game_to_text;
 if(typeof prior==='function')window.render_game_to_text=()=>{const data=JSON.parse(prior());data.coBakerRewards={received:Object.values(g.coBakerRewards?.receivedRewards||{}).map(e=>e.coins),pending:Object.values(g.coBakerRewards?.outbox||{}).filter(e=>!e.acknowledged).length};return JSON.stringify(data)};
})();
