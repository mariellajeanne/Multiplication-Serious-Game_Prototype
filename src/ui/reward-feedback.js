/* Presentation only. Accounting is committed by rewards.js before any flight. */
const rewardPresentation={epoch:0,pending:0,timers:new Set(),nodes:new Set()};
function animateRewardElement(node,frames,options){try{return node.animate?.(frames,options)}catch(error){return null}}
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
 if(label)label.textContent=r.phase==='claim'?'Ready to collect!':`This order · ${chance}% next pair · 1+ package guaranteed`;
}
function bumpPrizeDock(){const dock=$('prizejar');if(!dock)return;dock.classList.remove('dock-bump');void dock.offsetWidth;dock.classList.add('dock-bump')}
function syncRewardPresentation(){
 rewardPresentation.epoch++;rewardPresentation.pending=0;
 for(const timer of rewardPresentation.timers)clearTimeout(timer);rewardPresentation.timers.clear();
 for(const node of rewardPresentation.nodes){node.getAnimations?.().forEach(a=>a.cancel());node.remove()}rewardPresentation.nodes.clear();
 paintRewardDock(g.run);
}
function rewardProtectedArea(frame){
 if(!frame)return null;const fr=frame.getBoundingClientRect(),surface=frame.worksheetSurface;
 const boxes=[surface?.math,surface?.floating].filter(b=>b&&[b.x,b.y,b.w,b.h].every(Number.isFinite)&&b.w>=0&&b.h>=0);
 if(!boxes.length)return {left:fr.left+fr.width*.2,right:fr.right-fr.width*.2,top:fr.top,bottom:fr.bottom-50};
 return {left:Math.min(...boxes.map(b=>fr.left+b.x*fr.width)),right:Math.max(...boxes.map(b=>fr.left+(b.x+b.w)*fr.width)),top:Math.min(...boxes.map(b=>fr.top+b.y*fr.height)),bottom:Math.max(...boxes.map(b=>fr.top+(b.y+b.h)*fr.height))};
}
function animateReward(data){
 const r=g.run,dock=$('prizejar');if(!r||!dock)return;
 if(!data){bumpPrizeDock();return}
 if(data.attemptId!==r.worksheetRewards?.attemptId)return;
 const gains=data.chest?[{kind:'chest',text:`🎁 ${RARITIES[data.rarity]}!`}]:[
  ...(data.coins?[{kind:'coin',text:`+${fmt(data.coins)} 🪙`}]:[]),
  ...(data.luck?[{kind:'luck',text:`+${data.luck} ✨`}]:[])
 ];
 for(const gain of gains)animateRewardGain(data,gain);
}
function animateRewardGain(data,gain){
 const frame=$('worksheetFrame'),fr=frame?.getBoundingClientRect(),area=rewardProtectedArea(frame);
 const epoch=rewardPresentation.epoch,attempt=data.attemptId;
 const destination=gain.kind==='luck'?document.querySelector?.('.chest-luck-top')||$('prizejar'):$('prizejar');
 const target=destination.getBoundingClientRect(),point=data.point;
 const valid=point&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>=0&&point.x<=1&&point.y>=0&&point.y<=1;
 const sourceY=valid&&fr?fr.top+fr.height*point.y:fr?fr.top+fr.height*.5:innerHeight*.4;
 const node=document.createElement('div');node.className='reward-flight reward-'+gain.kind;node.textContent=gain.text;
 node.style.transformOrigin='0 0';document.body.appendChild(node);
 const size=node.getBoundingClientRect(),w=size.width||80,h=size.height||28;
 const left=area?area.left-w-10:12,right=area?area.right+10:innerWidth-w-12;
 let x=gain.kind==='luck'?right:left,y=sourceY-h-8,side=gain.kind==='luck'?'right':'left';
 if(x<8||x+w>innerWidth-8){
  x=gain.kind==='luck'?left:right;side=side==='left'?'right':'left';
 }
 if(x<8||x+w>innerWidth-8){
  const shelf=document.querySelector?.('.reward-shelf')?.getBoundingClientRect();
  y=Math.min(shelf?.top??Infinity,Math.max(70,(area?.top||140)-h-10));
  x=Math.max(8,Math.min(innerWidth-w-8,innerWidth*.5+(gain.kind==='luck'?12:-w-12)));side='left';
 }
 y=Math.max(65,Math.min(innerHeight-h-8,y));
 node.style.left=x+'px';node.style.top=y+'px';
 rewardPresentation.nodes.add(node);rewardPresentation.pending++;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduced)animateRewardElement(node,[{opacity:0,transform:'scale(.7)'},{opacity:1,transform:'scale(1.06)'},{opacity:1,transform:'scale(1)'}],{duration:190,easing:'ease-out'});
 const timer=setTimeout(()=>{
  rewardPresentation.timers.delete(timer);
  const scale=.32,smallWidth=w*scale;
  let edge=area?(side==='left'?area.left-smallWidth-10:area.right+10):x;
  const safeEdge=edge>=8&&edge+smallWidth<=innerWidth-8;
  edge=Math.max(8,Math.min(innerWidth-smallWidth-8,edge));
  const endX=target.left+target.width*.5-smallWidth*.5,endY=target.top+target.height*.5-h*scale*.5;
  animateRewardElement(node,reduced||!safeEdge?[{opacity:1},{opacity:0}]:[
   {transform:'translate(0,0) scale(1)',opacity:1},
   {offset:.12,transform:'translate(0,0) scale(.32)',opacity:1},
   {offset:.28,transform:`translate(${edge-x}px,0px) scale(.32)`,opacity:1},
   {offset:.82,transform:`translate(${edge-x}px,${endY-y}px) scale(.32)`,opacity:1},
   {transform:`translate(${endX-x}px,${endY-y}px) scale(.32)`,opacity:0}
  ],{duration:reduced?140:620,easing:'linear',fill:'forwards'});
  const arrival=setTimeout(()=>{
   rewardPresentation.timers.delete(arrival);node.remove();rewardPresentation.nodes.delete(node);
   if(epoch!==rewardPresentation.epoch)return;
   rewardPresentation.pending=Math.max(0,rewardPresentation.pending-1);
   if(g.run?.worksheetRewards?.attemptId!==attempt)return;
   paintRewardDock({...g.run,pool:data.pool,luck:data.totalLuck,chests:data.chests,index:data.index});
   if(gain.kind==='luck'){destination.classList.remove('dock-bump');void destination.offsetWidth;destination.classList.add('dock-bump')}else bumpPrizeDock();
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
