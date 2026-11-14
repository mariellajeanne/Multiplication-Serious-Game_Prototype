/* Calculation practice and step coins are separate from procedural worksheet
 * state. Tune these values without changing food prices, ticket odds or Boost. */
const GOLDEN_CHALLENGE_CONFIG=Object.freeze({
 version:1,offerRate:.16,needWeight:.14,minStepGap:2,factCooldown:8,
 maxTicketFraction:.3,highMultiplierChance:.12,minMultiplier:2,maxMultiplier:15,
 recentWindow:12,firstTryScore:1,secondTryScore:.65,thirdTryScore:.4,
 repeatFailureCap:6,advertisedCoinChance:.7
});
function factKey(a,b){return [Number(a),Number(b)].sort((x,y)=>x-y).join('x')}
function practiceHash(text){let n=2166136261;for(const c of String(text)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}n^=n>>>16;return (n>>>0)/4294967296}
function emptyFactProfile(){return {accepted:0,attempts:0,correct:0,incorrect:0,successByTry:[0,0,0],failedChallenges:0,consecutiveFailures:0,recent:[],lastPractice:-100,lastOffer:-100}}
function migrateWorksheetPractice(state){
 if(state.mathPractice?.version!==1)state.mathPractice={version:1,seed:`${Date.now()}-${Math.random()}`,facts:{},steps:0,lastOffer:-100,lifetimeCoins:Array(8).fill(0)};
 const p=state.mathPractice;p.facts=p.facts||{};p.steps=Math.max(0,Number(p.steps)||0);
 p.revision=Math.max(0,Number(p.revision)||0);
 p.lifetimeCoins=Array.from({length:8},(_,i)=>Math.max(0,Number(p.lifetimeCoins?.[i])||0));
 return state;
}
function factDifficulty(a,b){
 const x=Math.min(a,b),y=Math.max(a,b);
 if(x<=1)return .02;if(x===2)return .2;if(x===5||y===5)return .3;
 return Math.min(1,.2+(x-2)*.095+(y-3)*.045-(x===y?.16:0));
}
function factMastery(profile,cfg=GOLDEN_CHALLENGE_CONFIG){
 const p=profile||emptyFactProfile(),trials=p.successByTry.reduce((a,b)=>a+b,0)+p.failedChallenges;
 const weighted=p.successByTry[0]*cfg.firstTryScore+p.successByTry[1]*cfg.secondTryScore+p.successByTry[2]*cfg.thirdTryScore;
 return {score:(weighted+1)/(trials+2),readiness:p.recent.length?p.recent.slice(-3).reduce((a,b)=>a+b,0)/Math.min(3,p.recent.length):.55,trials};
}
function goldenChallengeOffer(a,b,profile,context={},cfg=GOLDEN_CHALLENGE_CONFIG){
 const p=profile||emptyFactProfile(),m=factMastery(p,cfg),difficulty=factDifficulty(a,b),need=1-m.score;
 const age=Math.max(0,(context.step||0)-p.lastPractice),due=Math.min(1,age/12);
 const practiceValue=need*(.5+.5*due)*Math.max(.15,m.readiness);
 const chance=Math.min(.34,(cfg.offerRate+cfg.needWeight*need)*(.35+.65*difficulty)*(p.consecutiveFailures>=2?.55:1));
 const seed=context.seed||'',roll=practiceHash(seed+'/offer');
 const eligible=context.spaced!==false&&context.withinCap!==false&&(context.step||0)-p.lastOffer>=cfg.factCooldown;
 let multiplier=2+Math.round(10*difficulty*need+4*practiceValue+(practiceHash(seed+'/bonus')-.5)*2);
 if(multiplier>=10&&practiceHash(seed+'/rare')>=cfg.highMultiplierChance)multiplier=9;
 if(p.consecutiveFailures>=2)multiplier=Math.min(multiplier,cfg.repeatFailureCap);
 multiplier=Math.max(cfg.minMultiplier,Math.min(cfg.maxMultiplier,multiplier));
 return {offered:eligible&&roll<chance,multiplier,chance,difficulty,mastery:m.score,practiceValue};
}
function stepCoinOptions(rank,cfg=GOLDEN_CHALLENGE_CONFIG){
 const start=Math.max(0,Math.min(5,rank-1));
 return Array.from({length:3},(_,i)=>({rank:start+i,chance:start+i===rank?cfg.advertisedCoinChance:(1-cfg.advertisedCoinChance)/2,base:ticketBase(start+i)}));
}
function rollStepCoin(options,random=Math.random){let roll=random();for(const option of options){roll-=option.chance;if(roll<0)return option}return options.at(-1)}
function usesStepCoins(run){return run?.stepCoins?.version===1}
function initializeStepCoins(run){
 if(!g.mathPractice)migrateWorksheetPractice(g);
 run.stepCoins={version:1,options:stepCoinOptions(ticketCoinTier(run.ticket)),receipts:{},counts:Array(8).fill(0),subtotals:Array(8).fill(0),baseTotal:0};
 run.factAnswers={};run.procedureComplete=false;run.pool=0;run.baseCoins=0;
 return run;
}
function worksheetStepKey(step){return `${step.row}:${step.col}`}
function ensureFactAnswer(run,step){
 if(!g.mathPractice)migrateWorksheetPractice(g);
 run.factAnswers=run.factAnswers||{};const key=worksheetStepKey(step);
 if(run.factAnswers[key])return run.factAnswers[key];
 const practice=g.mathPractice,canonical=factKey(step.a,step.b),profile=practice.facts[canonical]||(practice.facts[canonical]=emptyFactProfile());
 const offers=Object.values(run.factAnswers).filter(answer=>answer.offered).length;
 const decision=goldenChallengeOffer(step.a,step.b,profile,{
  seed:`${practice.seed}/${run.ticket.id}/${key}`,step:practice.steps,
  spaced:practice.steps-practice.lastOffer>=GOLDEN_CHALLENGE_CONFIG.minStepGap,
  withinCap:offers<Math.max(1,Math.floor(run.steps.length*GOLDEN_CHALLENGE_CONFIG.maxTicketFraction))
 });
 const answer=run.factAnswers[key]={key,fact:canonical,offered:usesStepCoins(run)&&decision.offered,multiplier:decision.multiplier,accepted:false,attempts:[],entry:'',status:'waiting'};
 practice.revision++;
 if(answer.offered){profile.lastOffer=practice.steps;practice.lastOffer=practice.steps}
 return answer;
}
function acceptGoldenChallenge(run,step){const answer=ensureFactAnswer(run,step);if(!answer.offered||answer.status!=='waiting'||answer.accepted)return false;answer.accepted=true;g.mathPractice.facts[answer.fact].accepted++;return true}
function generateFactAnswer(run,step){
 const answer=ensureFactAnswer(run,step);if(answer.status!=='waiting')return false;
 answer.status=answer.accepted?'forfeited':'generated';answer.entry=String(step.p);return true;
}
function submitGoldenAnswer(run,step,input){
 const answer=ensureFactAnswer(run,step);
 if(!answer.accepted||answer.status!=='waiting'||answer.attempts.length>=3)return {accepted:false};
 const text=String(input).trim();
 if(!/^\d{1,2}$/.test(text)||text.length<String(step.p).length)return {accepted:false,incomplete:true};
 const correct=Number(text)===step.p,profile=g.mathPractice.facts[answer.fact];
 answer.attempts.push({value:Number(text),correct});profile.attempts++;profile[correct?'correct':'incorrect']++;
 profile.recent.push(correct?1:0);profile.recent=profile.recent.slice(-GOLDEN_CHALLENGE_CONFIG.recentWindow);profile.lastPractice=g.mathPractice.steps;
 if(correct){profile.successByTry[answer.attempts.length-1]++;profile.consecutiveFailures=0;answer.status='success';answer.entry=String(step.p)}
 else if(answer.attempts.length===3){profile.failedChallenges++;profile.consecutiveFailures++;answer.status='failed';answer.entry=String(step.p)}
 else answer.entry='';
 return {accepted:true,correct,remaining:3-answer.attempts.length,revealed:answer.status!=='waiting'};
}
function stepCoinTotals(run){
 const ledger=run.stepCoins,base=ledger.baseTotal,boost=run.bakersBoost??1;
 return {base,boost,total:Math.round(base*boost),counts:[...ledger.counts],subtotals:[...ledger.subtotals]};
}
function grantWorksheetStepCoin(run,step){
 const ledger=run.stepCoins,key=worksheetStepKey(step);if(!usesStepCoins(run)||ledger.receipts[key])return null;
 if(!worksheetPracticeIsCurrent())return false;
 const option=rollStepCoin(ledger.options),answer=run.factAnswers?.[key],multiplier=answer?.status==='success'?answer.multiplier:1;
 const receipt={id:`${run.ticket.id}/${key}`,rank:option.rank,denomination:option.base,multiplier,baseAmount:option.base*multiplier};
 ledger.receipts[key]=receipt;ledger.counts[receipt.rank]++;ledger.subtotals[receipt.rank]+=receipt.baseAmount;ledger.baseTotal+=receipt.baseAmount;
 g.mathPractice.lifetimeCoins[receipt.rank]++;g.mathPractice.steps++;g.mathPractice.revision++;
 run.baseCoins=ledger.baseTotal;run.pool=stepCoinTotals(run).total;
 return receipt;
}
function worksheetPracticeIsCurrent(){
 try{const stored=JSON.parse(localStorage.getItem('panaderyaQuestV2'));if((stored?.mathPractice?.revision||0)>(g.mathPractice?.revision||0)){toast('Worksheet progress changed in another tab. Reload to continue.');return false}}catch(_){}
 return true;
}
function allWorksheetStepsSealed(run){
 const ledger=run?.worksheetRewards;return !!ledger&&run.steps.every(step=>ledger.actions[worksheetActionId(ledger.attemptId,step.row,step.col,'combo')]);
}
function completeWorksheetProcedure(run){
 if(!usesStepCoins(run)||!allWorksheetStepsSealed(run)||Object.keys(run.stepCoins.receipts).length!==run.steps.length)return false;
 run.procedureComplete=true;run.pool=stepCoinTotals(run).total;return true;
}
