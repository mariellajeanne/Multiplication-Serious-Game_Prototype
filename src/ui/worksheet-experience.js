/* Worksheet presentation and calculation controls. Procedural state stays in
 * the existing iframe; all fact evidence and coin receipts belong to the shell. */
const previousWorksheetRenderer=renderWorksheet,previousWorksheetFit=fitWorksheet,previousWorksheetClose=closeModal;
let calculationNotice='',calculationIdentity='',worksheetSummaryView=null,worksheetSummaryTimer=null;
function worksheetCoinArt(rank){return WorksheetComponents.coinArt(rank,typeof hubAsset==='function'?hubAsset(`coin-${String(rank+1).padStart(2,'0')}.png`):'assets/bakery-ui/')}
function worksheetFoodArt(id){return typeof hubFoodArt==='function'?hubFoodArt(id):foodArt(id)}
function worksheetCoinName(rank){return typeof hubCoinTierName==='function'?hubCoinTierName(rank):COIN_TIERS[rank]}
function worksheetRewardDisplays(r){
 if(!usesStepCoins(r))return `<div class="worksheet-saved-reward">${worksheetCoinArt(ticketCoinTier(r.ticket))}<span>Saved order reward <b>${fmt(r.budget)} coins</b></span></div>`;
 return WorksheetComponents.rewards(r.stepCoins.options.map(option=>({rank:option.rank,name:worksheetCoinName(option.rank),chance:option.chance,base:option.base,count:r.stepCoins.counts[option.rank],art:worksheetCoinArt(option.rank)})));
}
renderWorksheet=function(){
 const r=g.run;if(!r||r.phase==='failed'||!usesStepCoins(r)&&r.phase==='claim')return previousWorksheetRenderer();
 const food=orderFood(r.ticket);
 return `<main class="worksheet-stage worksheet-modern"><header class="worksheet-order-header"><div class="worksheet-order-expression" aria-label="${r.ticket.a} ${food.name} times ${r.ticket.b} trays">${worksheetFoodArt(food.id)}<b>${r.ticket.a}</b><span>×</span>${hubImage('tray-icon.png','worksheet-tray')}<b>${r.ticket.b}</b></div></header>${worksheetRewardDisplays(r)}${WorksheetComponents.workspace({done:r.bridgeDone||0,total:r.steps.length,complete:r.procedureComplete,pool:fmt(r.pool),actions:worksheetBottomActions(!!r.procedureComplete)})}</main>`;
};
function worksheetBottomActions(complete){
 // Keep the helper/settings controls in the middle. Save & Exit shares the
 // rightmost action slot with Complete Order, never displaying beside it.
 return `<div class="worksheet-header-actions"><button class="worksheet-settings illustrated-worksheet-button" title="Worksheet settings" aria-label="Worksheet settings" onclick="openWorksheetSettings()">&#9881;</button></div><button id="worksheetSaveExit" class="worksheet-exit illustrated-worksheet-button" aria-label="Save &amp; Exit" ${complete?'hidden':''} onclick="abandonTicket()">&#8677; Save &amp; Exit</button>`;
}
function currentWorksheetCalculation(){
 const r=g.run,state=r?.worksheetSession?.state;
 if(!r||r.phase!=='engine'||r.paused||!state)return null;
 const step=r.steps.find(item=>item.row===state.row&&item.col===state.k);
 return step?{r,state,step,key:worksheetStepKey(step)}:null;
}
function calculationKeypadMarkup(label){return WorksheetComponents.keypad(label)}
function worksheetSelectedTargetLabel(context){
 const target=context.r.worksheetSession?.entry?.selected;if(!target)return 'Select an empty worksheet tile';
 const columns=['ones','tens','hundreds','thousands','ten-thousands','hundred-thousands','millions'];
 return target.kind==='carry'?`Carry above ${context.state.A[target.c]}`:`Row ${target.r+1} · ${columns[target.c]||`column ${target.c+1}`} column`;
}
function calculationPanelView(context){
 const r=g.run;
 if(r?.procedureComplete)return {mode:'complete'};
 if(r?.worksheetSession?.state.phase==='sum')return {mode:'sum'};
 const step=context?.step||r?.steps[Math.min(r?.bridgeDone||0,(r?.steps.length||1)-1)],active=context?.state.phase==='product';
 const answer=active?ensureFactAnswer(r,step):null;
 const resolved=answer&&answer.status!=='waiting',manual=answer?.accepted&&!resolved,entry=r?.worksheetSession?.entry;
 const carryAdded=resolved&&context.state.mixed&&context.state.incoming>0;
 const display=resolved?String(step.p+(carryAdded?context.state.incoming:0)):manual?(answer.entry||'—'):'?';
 const status=resolved?(entry?.feedback||(context.state.carryArmed?'Carry selected. Tap the ones digit here or on the sheet.':!context.state.mixed&&context.state.incoming?'Add the carry now, or place the ones first.':answer.status==='success'?`×${answer.multiplier} bonus ready. Place each digit to earn it.`:'Drag a digit, or tap it and then its destination.')):
  calculationNotice||(manual?`${3-answer.attempts.length} ${3-answer.attempts.length===1?'try':'tries'} left`:active?'Get an answer, then write its digits.':'Connect the two digits first.');
 return {mode:'fact',expression:step?`${step.a} \u00d7 ${step.b}`:'Ready?',display,carryEquation:carryAdded?`${step.p} + ${context.state.incoming} carry =`:'',golden:answer?.status==='success',manual:!!manual,offered:!!(answer?.offered&&!answer.accepted&&!resolved),multiplier:answer?.multiplier||1,tray:resolved?worksheetDigitTrayView(context):null,status,placementError:!!entry?.level,generate:!resolved,active:!!active,guide:!!(active&&g.tutorialArrows&&!answer?.offered&&!manual)};
}
function calculationPanelMarkup(context){return WorksheetComponents.calculator(calculationPanelView(context))}

function paintWorksheetExperience(){
 const r=g.run,panel=$('calculationPanel');if(!r||!panel)return;
 const context=currentWorksheetCalculation(),identity=`${r.ticket.id}/${context?.key||'none'}`;
 if(context?.state.incoming&&!context.state.mixed)document.querySelectorAll('.calculator-combination').forEach(note=>note.remove());
 if(identity!==calculationIdentity){calculationIdentity=identity;calculationNotice=''}
 if(context?.state.phase==='product'){
  const answer=ensureFactAnswer(r,context.step);
  if(context.state.revealed&&answer.status==='waiting'){answer.status='generated';answer.entry=String(context.step.p)}
  sendEngine('challenge-input',{attemptId:r.worksheetRewards.attemptId,enabled:answer.accepted&&answer.status==='waiting',progressive:['generated','forfeited'].includes(answer.status)});
  if(!context.state.revealed&&answer.status!=='waiting')sendEngine('fact-answer',{attemptId:r.worksheetRewards.attemptId,row:context.step.row,col:context.step.col,restore:true,progressive:['generated','forfeited'].includes(answer.status)});
 }
 const phase=r.procedureComplete?'complete':r.worksheetSession?.state.phase==='sum'?'add':context?.state.phase==='select'?'connect':context?.state.phase==='product'?(context.state.revealed?context.state.mixed?'place':'carry':'calculate'):'connect';
 const stage=document.querySelector('.worksheet-modern');if(stage)stage.dataset.worksheetPhase=phase;
 sendEngine('focus-phase',{attemptId:r.worksheetRewards.attemptId,phase,guideLevel:g.tutorialArrows?(g.completed===0?2:g.completed<3?1:0):0});
 const html=calculationPanelMarkup(context);
 if(panel.dataset.markup!==html){
  const active=document.activeElement,focus=panel.contains(active)?active?.dataset.calcKey||active?.id:null;
  panel.innerHTML=html;panel.dataset.markup=html;
  if(focus){const target=panel.querySelector(`[data-calc-key="${focus}"]`)||$(focus);target?.focus?.({preventScroll:true})}
 }
 const complete=$('collectRewards'),exit=$('worksheetSaveExit');
 if(complete){complete.disabled=!r.procedureComplete;complete.hidden=!r.procedureComplete;}
 if(exit)exit.hidden=!!r.procedureComplete;
 const progress=$('worksheetStepProgress');if(progress)progress.textContent=`${r.bridgeDone||0} / ${r.steps.length} pairs placed`;
 if(typeof paintRewardDock==='function')paintRewardDock(r);
 if(r.settlement&&!worksheetSummaryView)scheduleWorksheetSummaryRecovery();
 window.panaderyaCoBaker?.observation?.publish(r.worksheetSession);
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
 if(answer&&answer.status!=='waiting')return false;
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
 if(typeof cancelWorksheetDrag==='function')cancelWorksheetDrag();
 captureActiveWorksheet();save();openSettings();
}
fitWorksheet=function(){
 const frame=$('worksheetFrame'),stage=document.querySelector('.worksheet-modern');
 if(!stage||!frame)return previousWorksheetFit();
 if(!g.run||g.run.paused)return;
 syncRewardPresentation();if(typeof cancelWorksheetDrag==='function')cancelWorksheetDrag();
 const rows=String(g.run.ticket.b).length,cols=String(g.run.ticket.a*g.run.ticket.b).length,gap=6;
 const surface=stage.querySelector('.worksheet-left'),rect=surface.getBoundingClientRect();
 // Match the iframe's height to the calculated math grid. The old fixed
 // 400px iframe truncated large tablet cells and wasted the writing surface.
 // On short landscape phones, the containing wrap scrolls the full-height
 // iframe instead of shrinking the tappable digits below 44px.
 const available=Math.max(200,rect.height-12),byWidth=Math.floor((rect.width-100-gap*(cols-1))/cols);
 const {cell,height}=WorksheetComponents.layout({rows,cols,available,byWidth,gap,minArea:0});
 frame.style.height=height+'px';
 sendEngine('layout',{cell,gap,rows});paintWorksheetExperience();
};
function worksheetSummaryMarkup(r){return orderCompletionMarkup(r)}
function finishWorksheetSummaryAnimation(){worksheetSummaryView?.sequence?.finish()}
function disposeWorksheetSummary(view){
 if(!view)return;view.sequence?.dispose();
 if(worksheetSummaryView===view){$('app').inert=view.inert;worksheetSummaryView=null}
}
function beginWorksheetSettlement(){
 const r=g.run;if(!usesStepCoins(r)||!r.procedureComplete||!allWorksheetStepsSealed(r)||Object.keys(r.stepCoins.receipts).length!==r.steps.length||worksheetSummaryView)return false;
 const previous=r.settlement;r.settlement={version:1,status:'pending',...stepCoinTotals(r)};
 if(!save()){r.settlement=previous;return false}
 syncRewardPresentation();
 const app=$('app');worksheetSummaryView={attempt:r.worksheetRewards.attemptId,inert:app.inert};app.inert=true;
 showModal('Order complete!',worksheetSummaryMarkup(r),'worksheet-summary-modal');
 const view=worksheetSummaryView;
 view.sequence=createOrderCompletionSequence(document.querySelector('.worksheet-summary'),r.settlement,()=>{
  if(worksheetSummaryView===view&&!view.celebrated){view.celebrated=true;if(g.sound)sendEngine('summary-celebrate',{attemptId:view.attempt})}
 },()=>disposeWorksheetSummary(view));
 return true;
}
function acknowledgeWorksheetSummary(){
 const view=worksheetSummaryView;if(!view||$('acknowledgeWorksheetSummary')?.disabled||g.run?.worksheetRewards?.attemptId!==view.attempt)return false;
 if(!creditCompletedOrder()){$('worksheetSettlementError').hidden=false;$('worksheetSettlementError').textContent='Could not save your coins. Keep this page open and try again.';return false}
 disposeWorksheetSummary(view);closeModal();checkUnlocks();return true;
}
closeModal=function(){
 if(worksheetSummaryView){finishWorksheetSummaryAnimation();return acknowledgeWorksheetSummary()}
 const result=previousWorksheetClose();paintWorksheetExperience();return result;
};
document.addEventListener('keydown',event=>{if(worksheetSummaryView&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeModal()}},true);
function scheduleWorksheetSummaryRecovery(){
 if(!g.run?.settlement||g.run.paused||modal||worksheetSummaryView||worksheetSummaryTimer!==null)return;
 worksheetSummaryTimer=setTimeout(()=>{
  worksheetSummaryTimer=null;
  // Loading owns app.inert until it dismisses. Restore that ownership before
  // capturing the popup's prior inert state, including on a saved settlement.
  if($('bakeryLoading')&&!$('bakeryLoading').hidden){scheduleWorksheetSummaryRecovery();return}
  if(g.run?.settlement&&!modal&&!g.run.paused)beginWorksheetSettlement();
 },100);
}
if(new URLSearchParams(location.search).get('debug')==='golden')window.panaderyaGoldenDebug=()=>({config:GOLDEN_CHALLENGE_CONFIG,practice:g.mathPractice,current:currentWorksheetCalculation(),answers:g.run?.factAnswers});
const worksheetExperienceText=window.render_game_to_text;
if(typeof worksheetExperienceText==='function')window.render_game_to_text=()=>{
 const state=JSON.parse(worksheetExperienceText()),context=currentWorksheetCalculation();
 if(g.run&&!g.run.paused){
  const answer=context&&g.run.factAnswers?.[context.key];
  state.worksheet={expression:$('calculationExpression')?.textContent||null,answer:$('calculationAnswer')?.textContent||null,keypad:!!document.querySelector('.calculation-keypad'),challenge:answer?.offered?{multiplier:answer.multiplier,accepted:answer.accepted,attempts:answer.attempts.length,status:answer.status}:null,entry:g.run.worksheetSession?.entry?{selected:g.run.worksheetSession.entry.selected,value:g.run.worksheetSession.entry.value,feedback:g.run.worksheetSession.entry.feedback}:null,placed:g.run.bridgeDone||0,pairs:g.run.steps.length,complete:!!g.run.procedureComplete,summary:document.querySelector('.worksheet-summary')?.dataset.summaryStage||null};
  if(usesStepCoins(g.run))state.worksheet.rewards=g.run.stepCoins.options.map(option=>({name:worksheetCoinName(option.rank),chance:option.chance,base:option.base,lifetime:g.mathPractice.lifetimeCoins[option.rank],thisOrder:g.run.stepCoins.counts[option.rank]}));
  state.worksheet.phase=document.querySelector('.worksheet-modern')?.dataset.worksheetPhase;
  state.worksheet.digits=context&&typeof worksheetAvailableDigits==='function'?worksheetAvailableDigits(context).map(d=>({part:d.part,digit:d.value})):[];
  state.worksheet.carryToAdd=context?.state.revealed&&!context.state.mixed?context.state.incoming:0;
 }
 return JSON.stringify(state);
};
