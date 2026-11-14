/* Worksheet presentation and calculation controls. Procedural state stays in
 * the existing iframe; all fact evidence and coin receipts belong to the shell. */
const previousWorksheetRenderer=renderWorksheet,previousWorksheetFit=fitWorksheet,previousWorksheetClose=closeModal;
let calculationNotice='',calculationIdentity='',worksheetSummaryView=null,worksheetSummaryTimer=null;
function worksheetCoinArt(rank){return typeof hubCoinArt==='function'?hubCoinArt(rank):coinTierArt(rank)}
function worksheetFoodArt(id){return typeof hubFoodArt==='function'?hubFoodArt(id):foodArt(id)}
function worksheetCoinName(rank){return typeof hubCoinTierName==='function'?hubCoinTierName(rank):COIN_TIERS[rank]}
function worksheetRewardDisplays(r){
 if(!usesStepCoins(r))return `<div class="worksheet-saved-reward">${worksheetCoinArt(ticketCoinTier(r.ticket))}<span>Saved order reward <b>${fmt(r.budget)} coins</b></span></div>`;
 return `<div class="worksheet-reward-row" aria-label="Possible step rewards">${r.stepCoins.options.map(option=>`<section class="worksheet-coin-display coin-tier-${option.rank}" data-coin-rank="${option.rank}" aria-label="${worksheetCoinName(option.rank)}, ${Math.round(option.chance*100)} percent chance"><div class="worksheet-coin-art">${worksheetCoinArt(option.rank)}</div><div class="worksheet-coin-copy"><strong>${worksheetCoinName(option.rank)}</strong><span>${Math.round(option.chance*100)}% · ${fmt(option.base)} base coins</span><b><span data-lifetime-count="${option.rank}">${fmt(g.mathPractice.lifetimeCoins[option.rank])}</span> <small>all time</small></b><span><b data-ticket-count="${option.rank}">${fmt(r.stepCoins.counts[option.rank])}</b> this order</span></div></section>`).join('')}</div>`;
}
renderWorksheet=function(){
 const r=g.run;if(!r||r.phase==='failed'||!usesStepCoins(r)&&r.phase==='claim')return previousWorksheetRenderer();
 const food=orderFood(r.ticket);
 return `<main class="worksheet-stage worksheet-modern"><section class="worksheet-left"><header class="worksheet-order-header"><div class="worksheet-order-expression" aria-label="${r.ticket.a} ${food.name} times ${r.ticket.b} trays">${worksheetFoodArt(food.id)}<b>${r.ticket.a}</b><span>×</span>${hubImage('tray-icon.png','worksheet-tray')}<b>${r.ticket.b}</b></div><div class="worksheet-header-actions"><button class="worksheet-settings" aria-label="Worksheet settings" onclick="openWorksheetSettings()">${hubImage('control-settings.svg')}</button><button class="worksheet-exit illustrated-worksheet-button" onclick="abandonTicket()">Save &amp; Exit</button></div></header>${worksheetRewardDisplays(r)}<div class="worksheet-engine-wrap"><iframe id="worksheetFrame" class="worksheet-frame" title="Work out your customer's order" sandbox="allow-scripts allow-same-origin"></iframe></div><footer class="worksheet-complete-bar"><span id="worksheetStepProgress">${r.bridgeDone||0} / ${r.steps.length} pairs placed</span><button id="collectRewards" class="illustrated-worksheet-button worksheet-primary" ${r.procedureComplete?'':'disabled'} onclick="beginWorksheetSettlement()">Complete Order</button><span id="pendingCoins" hidden>${fmt(r.pool)}</span></footer><span id="bridgeStatus" hidden></span></section><aside class="worksheet-calculator" aria-label="Bakery calculation panel"><div id="calculationPanel"></div></aside></main>`;
};
function currentWorksheetCalculation(){
 const r=g.run,state=r?.worksheetSession?.state;
 if(!r||r.phase!=='engine'||r.paused||!state)return null;
 const step=r.steps.find(item=>item.row===state.row&&item.col===state.k);
 return step?{r,state,step,key:worksheetStepKey(step)}:null;
}
function calculationKeypadMarkup(label){
 return `<div class="calculation-keypad" role="group" aria-label="${label}">${[1,2,3,4,5,6,7,8,9,'Backspace',0,'Enter'].map(key=>`<button class="illustrated-worksheet-button" data-calc-key="${key}" onclick="worksheetCalcKey('${key}')" aria-label="${key==='Backspace'?'Backspace':key==='Enter'?'Submit answer':key}">${key==='Backspace'?'⌫':key==='Enter'?'Enter':key}</button>`).join('')}</div>`;
}
function worksheetSelectedTargetLabel(context){
 const target=context.r.worksheetSession?.entry?.selected;if(!target)return 'Select an empty worksheet tile';
 const columns=['ones','tens','hundreds','thousands','ten-thousands','hundred-thousands','millions'];
 return target.kind==='carry'?`Carry above ${context.state.A[target.c]}`:`Row ${target.r+1} · ${columns[target.c]||`column ${target.c+1}`} column`;
}
function calculationPanelMarkup(context){
 const r=g.run;
 if(r?.procedureComplete)return `<header class="calculator-heading"><span>BAKER’S CALCULATOR</span><h2>All placed!</h2></header><div class="calculator-answer">✓</div><p class="calculator-note">Your order is ready to complete.</p>`;
 if(r?.worksheetSession?.state.phase==='sum')return `<header class="calculator-heading"><span>BAKER’S CALCULATOR</span><h2>Add the rows</h2></header><div class="calculator-answer" aria-hidden="true">+</div><p class="calculator-note">Swipe down on the worksheet to finish your order.</p>`;
 const step=context?.step||r?.steps[Math.min(r?.bridgeDone||0,(r?.steps.length||1)-1)],active=context?.state.phase==='product';
 const answer=active?ensureFactAnswer(r,step):null;
 const resolved=answer&&answer.status!=='waiting',manual=answer?.accepted&&!resolved,entry=r?.worksheetSession?.entry;
 const carryAdded=resolved&&context.state.mixed&&context.state.incoming>0;
 const display=resolved?String(step.p+(carryAdded?context.state.incoming:0)):manual?(answer.entry||'—'):'?';
 const status=resolved?(entry?.feedback||(context.state.carryArmed?'Carry selected. Tap its product ones tile.':!context.state.mixed&&context.state.incoming?'Tap the waiting carry, then its product ones tile.':answer.status==='success'?`×${answer.multiplier} bonus ready. Write each digit to earn it.`:'Select a tile. Write one digit, then press Enter.')):
  calculationNotice||(manual?`${3-answer.attempts.length} ${3-answer.attempts.length===1?'try':'tries'} left`:active?'Get an answer, then write its digits.':'Connect the two digits first.');
 return `<header class="calculator-heading"><span>BAKER’S CALCULATOR</span><h2 id="calculationExpression">${step?`${step.a} × ${step.b}`:'Ready?'}</h2></header>${carryAdded?`<div class="calculator-carry-equation">${step.p} + ${context.state.incoming} carry =</div>`:''}<output class="calculator-answer ${answer?.status==='success'?'is-golden':''}" id="calculationAnswer" ${manual?'tabindex="0" aria-label="Golden Challenge answer"':''}>${display}</output>${answer?.offered&&!answer.accepted&&!resolved?`<button class="golden-challenge-button illustrated-worksheet-button" id="goldenChallenge" onclick="chooseWorksheetChallenge()"><span aria-hidden="true">✦</span><span>Golden Challenge!<small>Solve it yourself for bonus coins!</small></span><b>×${answer.multiplier}</b></button>`:''}${manual?`<div class="golden-active-label">Golden Challenge <b>×${answer.multiplier}</b></div>`:''}${resolved?`<div class="worksheet-digit-input ${entry?.selected?'has-target':''}"><span>WRITE ON THE WORKSHEET</span><strong id="worksheetEntryTarget">${worksheetSelectedTargetLabel(context)}</strong><output id="worksheetDigitInput" aria-label="Digit to write">${entry?.value||'—'}</output></div>`:''}${manual||resolved?calculationKeypadMarkup(manual?'Golden Challenge keypad':'Worksheet digit keypad'):''}<p class="calculator-note ${entry?.level?'is-placement-error':answer?.status==='success'?'is-success':''}" role="status">${status}</p>${!resolved?`<button class="illustrated-worksheet-button ${!answer?.offered&&!manual?'worksheet-primary':''} ${active&&g.tutorialArrows&&!answer?.offered&&!manual?'calculator-guide':''}" id="generateAnswer" ${active?'':'disabled'} onclick="generateWorksheetAnswer()">Generate Answer</button>`:''}`;
}
function paintWorksheetExperience(){
 const r=g.run,panel=$('calculationPanel');if(!r||!panel)return;
 const context=currentWorksheetCalculation(),identity=`${r.ticket.id}/${context?.key||'none'}`;
 if(identity!==calculationIdentity){calculationIdentity=identity;calculationNotice=''}
 if(context?.state.phase==='product'){
  const answer=ensureFactAnswer(r,context.step);
  if(context.state.revealed&&answer.status==='waiting'){answer.status='generated';answer.entry=String(context.step.p)}
  sendEngine('challenge-input',{attemptId:r.worksheetRewards.attemptId,enabled:answer.accepted&&answer.status==='waiting',progressive:['generated','forfeited'].includes(answer.status)});
  if(!context.state.revealed&&answer.status!=='waiting')sendEngine('fact-answer',{attemptId:r.worksheetRewards.attemptId,row:context.step.row,col:context.step.col,restore:true,progressive:['generated','forfeited'].includes(answer.status)});
 }
 const html=calculationPanelMarkup(context);
 if(panel.dataset.markup!==html){
  const active=document.activeElement,focus=panel.contains(active)?active?.dataset.calcKey||active?.id:null;
  panel.innerHTML=html;panel.dataset.markup=html;
  if(focus){const target=panel.querySelector(`[data-calc-key="${focus}"]`)||$(focus);target?.focus?.({preventScroll:true})}
 }
 const complete=$('collectRewards');if(complete)complete.disabled=!r.procedureComplete;
 const progress=$('worksheetStepProgress');if(progress)progress.textContent=`${r.bridgeDone||0} / ${r.steps.length} pairs placed`;
 if(typeof paintRewardDock==='function')paintRewardDock(r);
 if(r.settlement&&!worksheetSummaryView)scheduleWorksheetSummaryRecovery();
}
function changeWorksheetCalculation(change){
 const context=currentWorksheetCalculation();if(!context||context.state.phase!=='product'||g.run.procedureComplete||!worksheetPracticeIsCurrent())return false;
 const {r,step}=context,answer=ensureFactAnswer(r,step);
 if(answer.status!=='waiting')return false;
 const before={answers:JSON.stringify(r.factAnswers),practice:JSON.stringify(g.mathPractice)};
 const result=change(r,step,answer);
 if(result===false){paintWorksheetExperience();return false}
 g.mathPractice.revision++;
 if(!save()){r.factAnswers=JSON.parse(before.answers);g.mathPractice=JSON.parse(before.practice);calculationNotice='Could not save. Please try again.';paintWorksheetExperience();return false}
 if(answer.status!=='waiting')sendEngine('fact-answer',{attemptId:r.worksheetRewards.attemptId,row:step.row,col:step.col,restore:false,progressive:['generated','forfeited'].includes(answer.status)});
 paintWorksheetExperience();return true;
}
function chooseWorksheetChallenge(){return changeWorksheetCalculation((r,step)=>{calculationNotice='';return acceptGoldenChallenge(r,step)})}
function generateWorksheetAnswer(){return changeWorksheetCalculation((r,step)=>{calculationNotice='';return generateFactAnswer(r,step)})}
function worksheetCalcKey(key){
 const context=currentWorksheetCalculation(),answer=context&&g.run.factAnswers?.[context.key];
 if(context&&answer&&answer.status!=='waiting'&&!modal&&!g.run.paused){sendEngine('digit-key',{attemptId:g.run.worksheetRewards.attemptId,row:context.step.row,col:context.step.col,key});return true}
 return changeWorksheetCalculation((r,step,answer)=>{
  if(!answer.accepted)return false;calculationNotice='';
  if(key==='Backspace'){answer.entry=answer.entry.slice(0,-1);return true}
  if(/^\d$/.test(key)){if(answer.entry.length>=2)return false;answer.entry+=key;return true}
  if(key!=='Enter')return false;
  const result=submitGoldenAnswer(r,step,answer.entry);
  if(result.incomplete){calculationNotice='Enter the full answer, then press Enter.';return false}
  return result.accepted;
 });
}
function handleWorksheetCalcMessage(message){const context=currentWorksheetCalculation();if(context&&message.row===context.step.row&&message.col===context.step.col)worksheetCalcKey(message.key)}
document.addEventListener('keydown',event=>{
 if(event.ctrlKey||event.metaKey||event.altKey||modal||!g.run||g.run.paused||!['Enter','Backspace','0','1','2','3','4','5','6','7','8','9'].includes(event.key))return;
 const context=currentWorksheetCalculation(),answer=context&&g.run.factAnswers?.[context.key];
 if(!answer||(answer.status==='waiting'&&!answer.accepted))return;
 if(event.key==='Enter'&&event.target.closest?.('button:not([data-calc-key])'))return;
 event.preventDefault();worksheetCalcKey(event.key);
});
function openWorksheetSettings(){
 showModal('Worksheet settings',`<div class="worksheet-settings-options"><button id="arrowToggle" class="secondary" aria-pressed="${g.tutorialArrows}" onclick="toggleArrows()">${worksheetGuideLabel()}</button><button id="sfxToggle" class="secondary" aria-pressed="${g.sound}" onclick="toggleSfx()">${worksheetSoundLabel()}</button></div>`,'worksheet-settings-modal');
}
fitWorksheet=function(){
 const frame=$('worksheetFrame'),stage=document.querySelector('.worksheet-modern');
 if(!stage||!frame)return previousWorksheetFit();
 if(!g.run||g.run.paused)return;
 syncRewardPresentation();
 const left=stage.querySelector('.worksheet-left'),width=left.getBoundingClientRect().width-48,rows=String(g.run.ticket.b).length,cols=String(g.run.ticket.a*g.run.ticket.b).length;
 const chrome=left.getBoundingClientRect().height-frame.getBoundingClientRect().height;
 const available=Math.max(320,innerHeight-stage.getBoundingClientRect().top-chrome-12),gap=innerWidth<1000?5:8;
 let cell=Math.max(44,Math.min(120,Math.floor((width-66-gap*(cols-1))/cols)));
 const estimatedHeight=size=>Math.max(44,Math.round(size*.65))+(2+rows)*size+Math.max(56,Math.round(size*.95))+146;
 while(cell>44&&estimatedHeight(cell)>available)cell--;
 sendEngine('layout',{cell,gap,rows});paintWorksheetExperience();
};
function worksheetSummaryMarkup(r){
 const totals=stepCoinTotals(r);
 return `<div class="worksheet-summary" data-summary-stage="0"><div class="summary-coin-types">${r.stepCoins.options.map((option,index)=>`<section class="summary-type summary-reveal" data-reveal-stage="${index+1}">${worksheetCoinArt(option.rank)}<strong>${worksheetCoinName(option.rank)}</strong><span>${fmt(totals.counts[option.rank])} ${totals.counts[option.rank]===1?'container':'containers'}</span><b>${fmt(totals.subtotals[option.rank])} base coins</b></section>`).join('')}</div><div class="summary-base summary-reveal" data-reveal-stage="4"><span>BASE COINS</span><strong>${fmt(totals.base)}</strong><small>${r.stepCoins.options.map(option=>fmt(totals.subtotals[option.rank])).join(' + ')}</small></div><div class="summary-boost summary-reveal" data-reveal-stage="5">${hubBoostDiamond()}<span>Baker’s Boost <b>×${multiplierLabel(totals.boost)}</b></span></div><div class="summary-equation summary-reveal" data-reveal-stage="5">${fmt(totals.base)} × ${new Intl.NumberFormat('en-US',{maximumSignificantDigits:12}).format(totals.boost)} = ${fmt(totals.total)}</div><div class="summary-total summary-reveal" data-reveal-stage="6"><span>TOTAL COINS EARNED</span><strong id="worksheetFinalCoins">${fmt(totals.total)}</strong></div><div class="btnrow"><button id="acknowledgeWorksheetSummary" class="primary" disabled onclick="acknowledgeWorksheetSummary()">Back to bakery</button></div><p id="worksheetSettlementError" role="alert" hidden></p></div>`;
}
function paintSummaryStage(stage){
 const node=document.querySelector('.worksheet-summary');if(!node)return;
 node.dataset.summaryStage=stage;node.querySelectorAll('[data-reveal-stage]').forEach(el=>el.classList.toggle('is-visible',Number(el.dataset.revealStage)<=stage));
 if(stage===6){$('acknowledgeWorksheetSummary').disabled=false;const total=$('worksheetFinalCoins');total.classList.add('summary-final-pop');if(worksheetSummaryView&&!worksheetSummaryView.celebrated){worksheetSummaryView.celebrated=true;if(g.sound)sendEngine('summary-celebrate',{attemptId:worksheetSummaryView.attempt})}}
}
function finishWorksheetSummaryAnimation(){const view=worksheetSummaryView;if(!view)return;view.timers.forEach(clearTimeout);view.timers.clear();paintSummaryStage(6)}
function beginWorksheetSettlement(){
 const r=g.run;if(!usesStepCoins(r)||!r.procedureComplete||!allWorksheetStepsSealed(r)||Object.keys(r.stepCoins.receipts).length!==r.steps.length||worksheetSummaryView)return false;
 const previous=r.settlement;r.settlement={version:1,status:'pending',...stepCoinTotals(r)};
 if(!save()){r.settlement=previous;return false}
 syncRewardPresentation();
 const app=$('app');worksheetSummaryView={attempt:r.worksheetRewards.attemptId,timers:new Set(),inert:app.inert};app.inert=true;
 showModal('Order complete!',worksheetSummaryMarkup(r),'worksheet-summary-modal');
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){finishWorksheetSummaryAnimation();return true}
 const view=worksheetSummaryView;
 [80,240,400,640,880,1200].forEach((delay,index)=>{const timer=setTimeout(()=>{view.timers.delete(timer);if(worksheetSummaryView===view)paintSummaryStage(index+1)},delay);view.timers.add(timer)});
 return true;
}
function acknowledgeWorksheetSummary(){
 const view=worksheetSummaryView;if(!view||$('acknowledgeWorksheetSummary')?.disabled||g.run?.worksheetRewards?.attemptId!==view.attempt)return false;
 if(!creditCompletedOrder()){$('worksheetSettlementError').hidden=false;$('worksheetSettlementError').textContent='Could not save your coins. Keep this page open and try again.';return false}
 view.timers.forEach(clearTimeout);$('app').inert=view.inert;worksheetSummaryView=null;closeModal();checkUnlocks();return true;
}
closeModal=function(){if(worksheetSummaryView)return;const result=previousWorksheetClose();paintWorksheetExperience();return result};
document.addEventListener('keydown',event=>{if(worksheetSummaryView&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finishWorksheetSummaryAnimation()}},true);
function scheduleWorksheetSummaryRecovery(){
 if(!g.run?.settlement||g.run.paused||modal||worksheetSummaryView||worksheetSummaryTimer!==null)return;
 worksheetSummaryTimer=setTimeout(()=>{worksheetSummaryTimer=null;if(g.run?.settlement&&!modal&&!g.run.paused)beginWorksheetSettlement()},0);
}
if(new URLSearchParams(location.search).get('debug')==='golden')window.panaderyaGoldenDebug=()=>({config:GOLDEN_CHALLENGE_CONFIG,practice:g.mathPractice,current:currentWorksheetCalculation(),answers:g.run?.factAnswers});
const worksheetExperienceText=window.render_game_to_text;
if(typeof worksheetExperienceText==='function')window.render_game_to_text=()=>{
 const state=JSON.parse(worksheetExperienceText()),context=currentWorksheetCalculation();
 if(g.run&&!g.run.paused){
  const answer=context&&g.run.factAnswers?.[context.key];
  state.worksheet={expression:$('calculationExpression')?.textContent||null,answer:$('calculationAnswer')?.textContent||null,keypad:!!document.querySelector('.calculation-keypad'),challenge:answer?.offered?{multiplier:answer.multiplier,accepted:answer.accepted,attempts:answer.attempts.length,status:answer.status}:null,entry:g.run.worksheetSession?.entry?{selected:g.run.worksheetSession.entry.selected,value:g.run.worksheetSession.entry.value,feedback:g.run.worksheetSession.entry.feedback}:null,placed:g.run.bridgeDone||0,pairs:g.run.steps.length,complete:!!g.run.procedureComplete,summary:document.querySelector('.worksheet-summary')?.dataset.summaryStage||null};
  if(usesStepCoins(g.run))state.worksheet.rewards=g.run.stepCoins.options.map(option=>({name:worksheetCoinName(option.rank),chance:option.chance,base:option.base,lifetime:g.mathPractice.lifetimeCoins[option.rank],thisOrder:g.run.stepCoins.counts[option.rank]}));
 }
 return JSON.stringify(state);
};
