/* Panaderya Quest — src/game/rewards.js
 * Modularized from the original playable prototype.
 * Loaded as classic scripts in index.html, in dependency order.
 */
function earnCoin(weight=1,extraLuck=1,feedback=null){
 const r=g.run;if(!r||r.phase==='claim')return;
 const maxActive=Math.floor(r.budget*.76),unit=Math.max(1,Math.floor(maxActive/(r.steps.length*4.4)));
 const bonus=1+r.steps[r.index]?.row*.25;
 const amt=Math.min(maxActive-r.pool,Math.max(1,Math.round(unit*weight*bonus)));
 if(amt>0){r.pool+=amt;r.earnedActive+=amt}
 r.luck+=extraLuck;save();
 coinFly(Math.min(5,1+Math.floor(r.steps[r.index]?.row||0)+Math.round(weight/2)),{
  coins:Math.max(0,amt),luck:extraLuck,point:feedback?.point,attemptId:r.worksheetRewards?.attemptId,
  pool:r.pool,totalLuck:r.luck,chests:r.chests.map(c=>({...c})),index:r.index
 });
}
function coinFly(count=2,feedback=null){if(typeof animateReward==='function')animateReward(feedback)}
function modeMultiple(){if(g.mode==='survival')return {'1':4,'3':2.6,'5':1.8}[String(g.lives)]||2.6;return infoMode().base}
function retryLimit(){return {'normal':Infinity,'lookup':5,'blindfold':3,'streak':2,'bullseye':2,'survival':g.lives===1?1:g.lives===3?2:3}[g.mode]}
function generateSteps(a,b){const A=String(a).split('').reverse().map(Number),B=String(b).split('').reverse().map(Number);const steps=[];for(let row=0;row<B.length;row++){let carry=0;for(let col=0;col<A.length;col++){const p=A[col]*B[row],sum=p+carry;steps.push({row,col,a:A[col],b:B[row],p,carryIn:carry,ones:sum%10,tens:Math.floor(sum/10),last:col===A.length-1});carry=Math.floor(sum/10)}}return steps}
// One durable reward ledger per ticket attempt; undo and iframe reload retain it.
let worksheetAttemptSequence=0;
function worksheetActionKinds(step){
 return ['connect','reveal','place-ones',...(step.carryIn?['carry-down']:[]),
  ...(step.tens?[step.last?'place-tens':'carry-up']:[]),'combo'];
}
function worksheetActionId(attemptId,row,col,kind){return `${attemptId}/${row}/${col}/${kind}`}
function ensureWorksheetRewards(r,reset=false){
 if(r.worksheetRewards&&!reset)return r.worksheetRewards;
 const attemptId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${++worksheetAttemptSequence}-${Math.random().toString(36).slice(2)}`;
 const ledger={version:1,attemptId,actions:{}};
 // Old saves have aggregates but no action identities. Keep those rewards and
 // conservatively baseline completed pairs and the already-started partial pair.
 if(!reset){
  const done=Math.max(0,r.bridgeDone||0);
  for(let i=0;i<Math.min(done,r.steps.length);i++){
   const step=r.steps[i];for(const kind of worksheetActionKinds(step))
    ledger.actions[worksheetActionId(attemptId,step.row,step.col,kind)]=true;
  }
  const step=r.steps[done];
  if(step&&r.bridgePrev?.phase==='product')for(const kind of worksheetActionKinds(step)){
   if(kind!=='combo')ledger.actions[worksheetActionId(attemptId,step.row,step.col,kind)]=true;
  }
 }
 r.worksheetRewards=ledger;return ledger;
}
function startTicket(id){
 if(g.claimedOrders[id])return false;
 if(g.run?.ticket.id===id){commitPurchaseUndo('An order is being resumed');g.run.paused=false;save();render();return true}
 captureActiveWorksheet();commitPurchaseUndo('An order uses your current boosts');
 if(g.run)g.orderRuns[g.run.ticket.id]=g.run;
 if(g.orderRuns[id]){g.run=g.orderRuns[id];g.run.paused=false;save();render();return true}
 const t=g.board.find(x=>x.id===id);if(!t)return;
 const steps=generateSteps(t.a,t.b);
 g.run={ticket:t,steps,index:0,phase:'engine',paused:false,partial:{},pool:0,earnedActive:0,luck:0,chests:[],mistakes:0,correct:0,streak:0,bestStreak:0,livesLeft:g.lives,retriesLeft:retryLimit(),budget:Math.round(t.base*bakeryValue()*modeMultiple()),mode:g.mode,bridgeDone:0,bridgeSig:'',bridgeErrors:0};
 ensureWorksheetRewards(g.run,true);
 g.run.guaranteedPackages=t.packages||1;
 g.orderRuns[t.id]=g.run;
 refillBoard();save();render();toast('New order, baker!');
}
function runCurrent(){return g.run?.steps[g.run.index]}
function pickMultiplier(i){const r=g.run,s=runCurrent();if(!r||r.phase!=='chooseB')return;const correct=String(r.ticket.b).length-1-s.row;if(i!==correct){toast('Start with the glowing BOTTOM digit 👇');return}r.phase='chooseA';r.correct++;earnCoin(.5,1);render()}
function pickMultiplicand(i){const r=g.run,s=runCurrent();if(!r||r.phase!=='chooseA')return;const correct=String(r.ticket.a).length-1-s.col;if(i!==correct){toast('Now tap the glowing TOP digit 👆');return}r.phase='reveal';r.correct++;earnCoin(.5,1);render()}
function revealProduct(){const r=g.run,s=runCurrent();if(!r||r.phase!=='reveal')return;if(['blindfold','streak','bullseye','survival'].includes(r.mode)){showModal((MODE.find(m=>m.id===r.mode)?.icon||'🔢')+' '+(MODE.find(m=>m.id===r.mode)?.name||'Challenge')+' Check',`<p class="explainline" style="margin-bottom:13px">Without seeing a product tile, enter the product of <b>${s.a} × ${s.b}</b>.</p><div class="btnrow"><input style="border:2px solid #d6b88e;border-radius:12px;padding:12px;max-width:160px;font-size:1.2rem" id="answerInput" type="number" min="0" placeholder="Answer" onkeydown="if(event.key==='Enter')submitBlindfold()"/><button class="primary" onclick="submitBlindfold()">Check</button></div>`);setTimeout(()=>$('answerInput')?.focus(),0);return}r.phase='place';r.addedCarry=s.carryIn===0;r.placedOnes=false;r.placedTens=false;r.selectedTile=null;r.correct++;earnCoin(.55,1);render()}
function submitBlindfold(){const n=Number($('answerInput')?.value),s=runCurrent(),r=g.run;if(!r||!s)return;if(n!==s.p){mistake('Try the multiplication again.');if(g.run?.phase==='failed')closeModal();return}closeModal();r.phase='place';r.addedCarry=s.carryIn===0;r.placedOnes=false;r.placedTens=false;r.selectedTile=null;r.correct++;earnCoin(.55,1);render()}
function tileSelect(which){const r=g.run,s=runCurrent();if(!r||r.phase!=='place')return;const total=r.addedCarry?s.p+s.carryIn:s.p;if(which==='tens'&&Math.floor(total/10)===0)return;r.selectedTile=which;render()}
function placeTile(slot){const r=g.run,s=runCurrent();if(!r||r.phase!=='place')return;if(!r.selectedTile){toast('Choose one of the number tiles first!');return}if(r.selectedTile!==slot){mistake('That digit belongs in the other spot.');return}if(slot==='ones'){if(r.placedOnes)return;r.placedOnes=true;}else{if(r.placedTens)return;r.placedTens=true;}r.selectedTile=null;r.correct++;earnCoin(1,slot==='tens'?2:1);maybeFinishCombo();render()}
function addCarry(){const r=g.run,s=runCurrent();if(!r||r.phase!=='place'||r.addedCarry||!s.carryIn)return;r.addedCarry=true;r.correct++;earnCoin(.85,2);maybeFinishCombo();render();toast(`+${s.carryIn} merged into the partial product!`)}
function maybeFinishCombo(){const r=g.run,s=runCurrent();if(!r||r.phase!=='place')return;if(r.addedCarry&&r.placedOnes&&(s.tens===0||r.placedTens)){if(!r.partial[s.row])r.partial[s.row]={};r.partial[s.row][s.col+s.row]=s.ones;if(s.last&&s.tens)r.partial[s.row][s.col+s.row+1]=s.tens;finishCombo()}}
function mistake(msg){const r=g.run;if(!r)return;r.mistakes++;g.learning.mistakes++;r.streak=0;if(r.mode==='survival'){r.livesLeft--;if(r.livesLeft<=0){r.phase='failed';save();render();toast('Out of lives — the challenge ended.');return}}save();render();toast(msg+' You can try again.')}
function finishCombo(){const r=g.run,s=runCurrent();r.streak++;r.bestStreak=Math.max(r.bestStreak,r.streak);const last=r.index===r.steps.length-1;const chance=clamp(.12+r.luck*.013+s.row*.03,.06,.83);if(Math.random()<chance||(last&&r.chests.length===0)){const grade=rollChestRarity(r.ticket.rarity);r.chests.push({rarity:grade});r.luck=Math.round(r.luck*.3);toast(`${PACKAGE_TYPES[grade]} package found! 📦`)}r.index++;r.selectedTile=null;r.placedOnes=false;r.placedTens=false;r.addedCarry=false;r.phase=last?'sum':'chooseB';save()}
function rollChestRarity(ticketR){return ticketR}
function finishSum(){const r=g.run;if(!r||r.phase==='claim')return;r.phase='claim';r.pool=r.budget;const acc=r.correct/(r.correct+r.mistakes||1);if(r.mode==='bullseye')r.pool=Math.floor(r.pool*clamp(acc,.25,1));if(r.mode==='streak')r.pool=Math.floor(r.pool*(1+Math.min(1.4,r.bestStreak*.12)));while(r.chests.length<(r.guaranteedPackages||1))r.chests.push({rarity:r.ticket.rarity});save();render();coinFly(7);toast('Order complete! Your rewards are ready to collect. 🎉')}
function prizeItems(openNow=true){
 const r=g.run;if(!r||r.phase!=='claim'||g.claimedOrders[r.ticket.id])return false;
 if(!openNow&&r.chests.some(c=>Number.isInteger(c.legacyFoodRarity))){toast('Open these saved rewards to keep their original guaranteed food rarity.');return false}
 commitPurchaseUndo('Rewards collected');
 // One persisted mutation owns coins, claim status and randomized food results.
 const backup=JSON.stringify(g),coins=r.pool,old=g.permanentLuck;
 const presentation=openNow?r.chests.map(c=>discoverFood(Number.isInteger(c.legacyFoodRarity)?pick(FOOD.filter(f=>f.rarity===c.legacyFoodRarity)):drawFood(c.rarity))):[];
 if(!openNow)for(const c of r.chests)g.packages[c.rarity]++;
 g.claimedOrders[r.ticket.id]=r.worksheetRewards?.attemptId||true;g.coins+=coins;g.completed++;
 graduateGuideAfterOrder();g.learning.correct+=r.correct;
 g.mastery+=r.mode==='normal'||r.mode==='lookup'?1:2;g.permanentLuck=Math.max(old,Math.floor(g.mastery/4));
 g.board=g.board.filter(t=>t.id!==r.ticket.id);delete g.orderRuns[r.ticket.id];g.run=null;
 if(!save()){g=JSON.parse(backup);migrateFrame11(g);render();return false}
 render();showModal('Order Ticket Resolved!',`${!openNow?`<p>${r.chests.length} free packages saved for later.</p><button class="secondary" onclick="openPackages('unbox',${r.chests[0]?.rarity||0})">Unbox Packages</button>`:''}${renderOrderRewards(presentation,coins,g.permanentLuck-old)}`,'order-reward-modal');checkUnlocks();return true;
}
function drawFood(packageType){const rarity=drawRank(packageProbabilities(packageType));return pick(FOOD.filter(f=>f.rarity===rarity))}
function discoverFood(food){
 const existing=g.owned.find(o=>o.id===food.id),isNew=!g.discovered.includes(food.id);
 // A duplicate unlocks capacity on the recipe; it never purchases mastery or creates an instance.
 if(!isNew)g.recipeCeilings[food.id]=Math.max(0,g.recipeCeilings[food.id]||0)+1;
 if(existing)return {food,uid:existing.uid,copyNumber:2,isNew:false,masteryUnlocked:1};
 const uid=g.uidNext++;g.owned.push({uid,id:food.id,level:1,mastery:0,fusion:1,spent:0});
 if(isNew)g.discovered.push(food.id);
 if(g.activeMenu.length<g.menuSlots)g.activeMenu.push(uid);
 return {food,uid,copyNumber:isNew?1:2,isNew,masteryUnlocked:isNew?0:1};
}
function captureActiveWorksheet(){
 const frame=$('worksheetFrame'),r=g.run;if(!r||r.phase!=='engine')return;
 try{const session=frame?.contentWindow?.getWorksheetSession?.();if(session&&session.attemptId===r.worksheetRewards?.attemptId){
  // Flush accepted actions AND errors synchronously before unmounting the child.
  const state=session.state,metrics=session.metrics;
  handleWorksheetMessage({source:frame.contentWindow,data:{source:'pq-worksheet',type:'state',attemptId:session.attemptId,
   session,actions:session.actions,errors:metrics.errors,bestCombo:metrics.bestCombo,phase:state.phase,
   ticket:r.ticket,top:state.a,bottom:state.b,complete:state.complete}});
 }}catch(_){}
}
function checkUnlocks(){const unlocks=[['kitchen',2,'🔥 Kitchen upgrades are now open!'],['decor',4,'🌷 Decorations unlocked — your worksheet can evolve!'],['fusion',5,'✨ Food fusion and ingredients unlocked!'],['staff',6,'🧑‍🍳 Temporary staff can now help your bakery!'],['challenges',3,'🎮 New challenge modes are appearing!']];for(const [key,at,msg] of unlocks){if(g.completed>=at&&!g.seenUnlocks.includes(key)){g.seenUnlocks.push(key);toast(msg)}}save()}
