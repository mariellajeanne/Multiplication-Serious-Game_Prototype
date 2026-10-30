/* Presentation only. Accounting is committed by rewards.js before any flight. */
const rewardPresentation={epoch:0,pending:0,timers:new Set(),nodes:new Set()};
function rewardFlightsPending(){return rewardPresentation.pending>0}
function paintRewardDock(r){
 if(!r)return;
 const pc=$('pendingCoins'),pl=$('pendingLuck'),ph=$('pendingChests');
 if(pc)pc.textContent='🪙 '+fmt(r.pool);if(pl)pl.textContent='+'+r.luck;if(ph)ph.textContent=String(r.chests.length);
 const tokens=$('chestTokens');if(tokens)tokens.innerHTML=renderChestTokens(r.chests);
 const row=r.steps[Math.min(r.index,r.steps.length-1)]?.row||0;
 const chance=Math.round(clamp(.12+r.luck*.013+row*.03,.06,.83)*100);
 const bar=$('chestChanceBar'),label=$('chestChance');
 if(bar)bar.style.width=chance+'%';
 if(label)label.textContent=r.phase==='claim'?'Ready to collect!':`${chance}% next pair · at least 1 chest per order`;
}
function bumpPrizeDock(){const dock=$('prizejar');if(!dock)return;dock.classList.remove('dock-bump');void dock.offsetWidth;dock.classList.add('dock-bump')}
function syncRewardPresentation(){
 rewardPresentation.epoch++;rewardPresentation.pending=0;
 for(const timer of rewardPresentation.timers)clearTimeout(timer);rewardPresentation.timers.clear();
 for(const node of rewardPresentation.nodes){node.getAnimations?.().forEach(a=>a.cancel());node.remove()}rewardPresentation.nodes.clear();
 paintRewardDock(g.run);
}
function animateReward(data){
 const r=g.run,dock=$('prizejar');if(!r||!dock)return;
 if(!data){bumpPrizeDock();return;}
 if(data.attemptId!==r.worksheetRewards?.attemptId)return;
 if(!data.coins&&!data.luck&&!data.chest)return;
 const epoch=rewardPresentation.epoch,attempt=data.attemptId,frame=$('worksheetFrame');
 const target=dock.getBoundingClientRect(),fr=frame?.getBoundingClientRect();
 const validPoint=data.point&&Number.isFinite(data.point.x)&&Number.isFinite(data.point.y)&&
  data.point.x>=0&&data.point.x<=1&&data.point.y>=0&&data.point.y<=1;
 const x=validPoint&&fr?fr.left+fr.width*data.point.x:(fr?fr.left+fr.width*.55:innerWidth*.5);
 const y=validPoint&&fr?fr.top+fr.height*data.point.y:(fr?fr.top+fr.height*.5:innerHeight*.45);
 const node=document.createElement('div');node.className='reward-flight'+(data.chest?' reward-chest':'');
 if(data.chest){node.textContent=`🎁 ${RARITIES[data.rarity]}!`;}
 else{
  if(data.coins){const coin=document.createElement('span');coin.textContent=`🪙 +${data.coins}`;node.appendChild(coin)}
  if(data.luck){const luck=document.createElement('span');luck.className='luck-gain';luck.textContent=`✦ +${data.luck}`;node.appendChild(luck)}
 }
 const startX=Math.max(12,Math.min(innerWidth-180,x-45)),startY=Math.max(75,Math.min(target.top-65,y-36));
 node.style.left=startX+'px';node.style.top=startY+'px';document.body.appendChild(node);
 rewardPresentation.nodes.add(node);rewardPresentation.pending++;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduced)node.animate([{opacity:0,transform:'scale(.65) translateY(6px)'},{opacity:1,transform:'scale(1.08)'},{opacity:1,transform:'scale(1)'}],{duration:210,easing:'ease-out'});
 const timer=setTimeout(()=>{
  rewardPresentation.timers.delete(timer);
  const dx=target.left+target.width*.22-startX,dy=target.top+target.height*.5-startY;
  node.animate(reduced?[{opacity:1},{opacity:0}]:[
   {transform:'translate(0,0) scale(1)',opacity:1},
   {offset:.55,transform:`translate(${dx*.5}px,${dy*.3-24}px) scale(.9)`,opacity:1},
   {transform:`translate(${dx}px,${dy}px) scale(.4)`,opacity:0}
  ],{duration:reduced?140:620,easing:'cubic-bezier(.4,0,.3,1)',fill:'forwards'});
  // Arrival is bounded independently of the Web Animations finished promise;
  // paused rendering must never strand the displayed pool total.
  const arrival=setTimeout(()=>{
   rewardPresentation.timers.delete(arrival);node.remove();rewardPresentation.nodes.delete(node);
   if(epoch!==rewardPresentation.epoch)return;
   rewardPresentation.pending=Math.max(0,rewardPresentation.pending-1);
   if(g.run?.worksheetRewards?.attemptId!==attempt)return;
   paintRewardDock({...g.run,pool:data.pool,luck:data.totalLuck,chests:data.chests,index:data.index});bumpPrizeDock();
   if(!rewardPresentation.pending)paintRewardDock(g.run);
  },reduced?150:640);
  rewardPresentation.timers.add(arrival);
 },500);
 rewardPresentation.timers.add(timer);
}
function animateChestReward(rarity,point){
 const r=g.run;if(!r)return;
 sendEngine('feedback',{kind:'chest'});
 animateReward({chest:true,rarity,point,attemptId:r.worksheetRewards?.attemptId,
  pool:r.pool,totalLuck:r.luck,chests:r.chests.map(c=>({...c})),index:r.index});
}
