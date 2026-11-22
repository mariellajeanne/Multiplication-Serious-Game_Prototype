/* Cross-frame placement measures the live worksheet, never guessed coordinates. */
let worksheetTraySelection=null,worksheetPointer=null,worksheetDropFlight=null;
let worksheetDropSequence=0;
function worksheetAvailableDigits(context){
 if(!context?.state.revealed)return [];
 const state=context.state,value=context.step.p+(state.mixed?state.incoming:0),key=context.key;
 const used=Object.values(state.digitSources?.[key]||{});
 return [{part:'tens',value:Math.floor(value/10),placed:state.tensPlaced&&state.tensLocation!=='row'},{part:'ones',value:value%10,placed:state.onesPlaced}]
  .filter(item=>!(item.part==='tens'&&!item.value)&&!(used.length?used.includes(item.part):item.placed));
}
function worksheetDigitTrayView(context){
 const state=context.state;
 const digits=worksheetAvailableDigits(context);
 if(state.carryArmed||worksheetTraySelection&&!digits.some(d=>d.part===worksheetTraySelection.part&&d.value===worksheetTraySelection.value&&worksheetTraySelection.key===context.key))worksheetTraySelection=null;
 return {waiting:!state.mixed?state.incoming:0,armed:!!state.carryArmed,label:state.onesPlaced&&!state.mixed?'Add the waiting carry':'Place the digits',digits:digits.map(({part,value})=>({part,value})),selected:worksheetTraySelection?.part||null,demo:!!(g.tutorialArrows&&g.completed<3),demoDigit:String(digits.at(-1)?.value??'')};
}
function worksheetDigitTrayMarkup(context){return WorksheetComponents.tray(worksheetDigitTrayView(context))}

function armCalculatorCarry(){const c=currentWorksheetCalculation();if(c&&!c.state.mixed)sendEngine('arm-carry',{attemptId:g.run.worksheetRewards.attemptId})}
function resolveCalculatorCarry(){const c=currentWorksheetCalculation();if(c?.state.carryArmed)sendEngine('resolve-carry',{attemptId:g.run.worksheetRewards.attemptId,row:c.step.row,col:c.step.col})}
function handleWorksheetPlacementTarget(message){
 const c=currentWorksheetCalculation(),selected=worksheetTraySelection;
 if(!c||message.row!==c.step.row||message.col!==c.step.col||!selected||selected.key!==c.key)return;
 submitWorksheetDrop(selected,message.target);
}
function submitWorksheetDrop(selected,target){
 const c=currentWorksheetCalculation();if(!c||selected.key!==c.key||!worksheetAvailableDigits(c).some(d=>d.part===selected.part))return;
 const dropId=++worksheetDropSequence;if(worksheetDropFlight&&worksheetDropFlight.ghost===selected.ghost)worksheetDropFlight.dropId=dropId;
 sendEngine('digit-drop',{dropId,attemptId:g.run.worksheetRewards.attemptId,row:c.step.row,col:c.step.col,part:selected.part,value:selected.value,target});
 worksheetTraySelection=null;
}
function worksheetDropTarget(x,y){
 const frame=$('worksheetFrame'),rect=frame?.getBoundingClientRect();if(!rect||x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return null;
 const element=frame.contentDocument?.elementFromPoint(x-rect.left,y-rect.top)?.closest('[data-slot],[data-carry]');if(!element)return null;
 const target=element.hasAttribute('data-carry')?{kind:'carry',c:Number(element.dataset.carry)}:(()=>{const [r,c]=element.dataset.slot.split(':').map(Number);return {kind:'slot',r,c}})();
 return {element,target,rect:element.getBoundingClientRect(),frame:rect};
}
function cancelWorksheetDrag(){
 worksheetPointer?.ghost?.remove();worksheetPointer=null;worksheetDropFlight?.ghost?.remove();worksheetDropFlight=null;
 document.querySelectorAll('.calculator-combination').forEach(note=>note.remove());
 $('worksheetFrame')?.contentDocument?.querySelectorAll('.drop-hover').forEach(e=>e.classList.remove('drop-hover'));
}
document.addEventListener('pointerdown',event=>{
 const tile=event.target.closest('[data-answer-digit]'),c=currentWorksheetCalculation();if(!tile||!c||modal)return;
 cancelWorksheetDrag();const rect=tile.getBoundingClientRect();
 worksheetPointer={id:event.pointerId,x:event.clientX,y:event.clientY,rect,tile,key:c.key,part:tile.dataset.answerDigit,value:Number(tile.dataset.digitValue),ghost:null};
 tile.setPointerCapture?.(event.pointerId);
});
document.addEventListener('pointermove',event=>{
 const drag=worksheetPointer;if(!drag||drag.id!==event.pointerId)return;
 if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8&&!drag.ghost)return;
 event.preventDefault();
 if(!drag.ghost){drag.ghost=document.createElement('div');drag.ghost.className='worksheet-digit-ghost illustrated-worksheet-button';drag.ghost.textContent=drag.value;document.body.append(drag.ghost)}
 drag.ghost.style.left=event.clientX+'px';drag.ghost.style.top=event.clientY+'px';
 const target=worksheetDropTarget(event.clientX,event.clientY);
 $('worksheetFrame')?.contentDocument?.querySelectorAll('.drop-hover').forEach(e=>e.classList.remove('drop-hover'));target?.element.classList.add('drop-hover');
},{passive:false});
document.addEventListener('pointerup',event=>{
 const drag=worksheetPointer;if(!drag||drag.id!==event.pointerId)return;worksheetPointer=null;
 if(!drag.ghost){const c=currentWorksheetCalculation();if(c?.state.carryArmed&&drag.part==='ones'){resolveCalculatorCarry();return}worksheetTraySelection={key:drag.key,part:drag.part,value:drag.value};paintWorksheetExperience();return}
 const target=worksheetDropTarget(event.clientX,event.clientY);target?.element.classList.remove('drop-hover');
 if(!target){drag.ghost.remove();return}
 worksheetDropFlight={...drag,target};submitWorksheetDrop(drag,target.target);
 setTimeout(()=>{if(worksheetDropFlight?.ghost===drag.ghost){drag.ghost.remove();worksheetDropFlight=null}},650);
});
document.addEventListener('pointercancel',cancelWorksheetDrag);
window.addEventListener('blur',cancelWorksheetDrag);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelWorksheetDrag()});
document.addEventListener('click',event=>{const tile=event.target.closest('[data-answer-digit]');if(tile&&event.detail===0){const c=currentWorksheetCalculation();if(c?.state.carryArmed&&tile.dataset.answerDigit==='ones'){resolveCalculatorCarry();return}worksheetTraySelection={key:c.key,part:tile.dataset.answerDigit,value:Number(tile.dataset.digitValue)};paintWorksheetExperience()}});
function handleWorksheetDropResult(message){
 const flight=worksheetDropFlight;if(!flight||flight.dropId!==message.dropId)return;worksheetDropFlight=null;
 const target=flight.target,rect=target.rect,frame=$('worksheetFrame').getBoundingClientRect();
 const end=message.accepted?{x:frame.left+rect.left+rect.width/2,y:frame.top+rect.top+rect.height/2}:{x:flight.rect.left+flight.rect.width/2,y:flight.rect.top+flight.rect.height/2};
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){flight.ghost.remove();return}
 const start=flight.ghost.getBoundingClientRect();
 try{flight.ghost.animate([{translate:'-50% -50%',opacity:1},{translate:`calc(-50% + ${end.x-start.left-start.width/2}px) calc(-50% + ${end.y-start.top-start.height/2}px)`,scale:.85,opacity:0}],{duration:180,easing:'ease-out',fill:'forwards'})}catch(_){}
 setTimeout(()=>flight.ghost.remove(),190);
}
function handleWorksheetCarryResultDrop(message){
 const target=$('carryResultTarget')?.getBoundingClientRect(),c=currentWorksheetCalculation();
 if(target&&c&&message.row===c.step.row&&message.col===c.step.col&&message.point?.x>=target.left&&message.point.x<=target.right&&message.point.y>=target.top&&message.point.y<=target.bottom)sendEngine('resolve-carry',{attemptId:g.run.worksheetRewards.attemptId,row:c.step.row,col:c.step.col});
 else if(c){const hit=document.elementFromPoint(message.point?.x??-1,message.point?.y??-1);if(hit?.closest('[data-answer-digit]'))sendEngine('invalid-carry-target',{attemptId:g.run.worksheetRewards.attemptId,row:c.step.row,col:c.step.col})}
}
function showCalculatorCarryCombination(message){
 const target=document.querySelector('[data-answer-digit="ones"]')||$('calculationAnswer');if(!target)return;
 const rect=target.getBoundingClientRect(),note=document.createElement('div');note.className='calculator-combination';note.textContent=`${message.before} + ${message.carry} → ${message.before+message.carry}`;note.style.left=rect.left+rect.width/2+'px';note.style.top=Math.max(8,rect.top-46)+'px';document.body.append(note);setTimeout(()=>note.remove(),1100);
}

/* Early-round guide across the two real touch surfaces: calculator (shell)
 * and multiplication grid (same-origin iframe). Never guess tile positions or
 * change the engine; follow its saved state and actual rendered bounding boxes. */
// Semantic plan for early-round guidance. The existing worksheet iframe draws
// the actual arrows using its original tutorial-stream style. A second fixed
// SVG layer used to duplicate them and misdirect a carry toward the column.
function worksheetFullGuidePlan(context){
 const s=context?.state,step=context?.step;
 if(!s||!step||s.phase!=='product'||!s.revealed)return null;
 const col=s.row+s.k,at=selector=>({area:'frame',selector});
 const ones=at('[data-part="ones"]'),tens=at('[data-part="tens"]');
 const slot=c=>at(`[data-slot="${s.row}:${c}"]`);
 const carry=c=>at(`[data-carry="${c}"]`);
 if(s.incoming&&!s.mixed)return {
  from:carry(s.k),to:s.onesPlaced?slot(col):ones,
  label:s.onesPlaced?'Drag the carry onto the placed ones.':'Bring the carry to the ones digit.'
 };
 if(!s.onesPlaced)return {from:ones,to:slot(col),label:'Drag the ones digit to its column.'};
 const value=Number(step.p)+(s.mixed?Number(s.incoming||0):0);
 if(Math.floor(value/10)>0&&(!s.tensPlaced||s.tensLocation==='row')){
  const last=s.k===s.A.length-1;
  return {from:s.tensLocation==='row'?slot(col+1):tens,to:last?slot(col+1):carry(s.k+1),
   label:last?'Drag the tens digit one column left.':s.tensLocation==='row'?'Lift the tens digit into the carry shelf.':'Drag the tens digit into the carry shelf.'};
 }
 return null;
}
function scheduleWorksheetFullGuide(){
 // Never display the obsolete, differently styled full-screen arrow layer.
 // updateTutorial() in the worksheet renders the one authoritative trail.
 document.getElementById('worksheetFullGuide')?.remove();
}
