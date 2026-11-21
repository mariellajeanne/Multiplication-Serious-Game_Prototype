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
function worksheetFullGuidePlan(context){
 const s=context?.state,step=context?.step;
 if(!s||!step||s.phase!=='product'||!s.revealed)return null;
 const col=s.row+s.k,at=(area,selector)=>({area,selector});
 const ones=at('shell','[data-answer-digit="ones"]');
 const tens=at('shell','[data-answer-digit="tens"]');
 const slot=c=>at('frame',`[data-slot="${s.row}:${c}"]`);
 const carry=c=>at('frame',`[data-carry="${c}"]`);
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
let worksheetGuideFrame=0;
function scheduleWorksheetFullGuide(){
 if(worksheetGuideFrame)return;
 worksheetGuideFrame=requestAnimationFrame(()=>{worksheetGuideFrame=0;drawWorksheetFullGuide()});
}
function drawWorksheetFullGuide(){
 let overlay=document.getElementById('worksheetFullGuide');
 const remove=()=>{overlay?.remove()};
 const frame=$('worksheetFrame'),stage=document.querySelector('.worksheet-modern');
 if(!g.tutorialArrows||Number(g.completed||0)>=3||!g.run||g.run.paused||modal||!stage||!frame){remove();return}
 const plan=worksheetFullGuidePlan(currentWorksheetCalculation());if(!plan){remove();return}
 let doc,windowWidth,windowHeight;
 try{doc=frame.contentDocument;windowWidth=frame.contentWindow.innerWidth;windowHeight=frame.contentWindow.innerHeight}catch(_){remove();return}
 if(!doc||!windowWidth||!windowHeight){remove();return}
 const frameRect=frame.getBoundingClientRect(),scaleX=frameRect.width/windowWidth,scaleY=frameRect.height/windowHeight;
 const center=ref=>{
  const el=(ref.area==='frame'?doc:document).querySelector(ref.selector);
  if(!el||!el.getClientRects().length)return null;
  const r=el.getBoundingClientRect();
  if(ref.area==='frame'){
   const x=frameRect.left+(r.left+r.width/2)*scaleX,y=frameRect.top+(r.top+r.height/2)*scaleY;
   if(x<frameRect.left||x>frameRect.right||y<frameRect.top||y>frameRect.bottom)return null;
   return {x,y};
  }
  return {x:r.left+r.width/2,y:r.top+r.height/2};
 };
 const from=center(plan.from),to=center(plan.to);if(!from||!to){remove();return}
 const distance=Math.hypot(to.x-from.x,to.y-from.y);if(distance<20){remove();return}
 const dx=(to.x-from.x)/distance,dy=(to.y-from.y)/distance;
 const start={x:from.x+dx*16,y:from.y+dy*16},end={x:to.x-dx*19,y:to.y-dy*19};
 const curve=Math.min(70,distance*.14),cx=(start.x+end.x)/2-dy*curve,cy=(start.y+end.y)/2+dx*curve;
 const path=`M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
 const heading=Math.atan2(end.y-cy,end.x-cx)*180/Math.PI;
 const labelX=Math.max(125,Math.min(innerWidth-125,(from.x+to.x)/2));
 const labelY=Math.max(25,Math.min(innerHeight-12,Math.min(from.y,to.y)-26));
 if(!overlay){overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');overlay.id='worksheetFullGuide';overlay.classList.add('worksheet-full-guide');overlay.setAttribute('aria-hidden','true');document.body.append(overlay)}
 overlay.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
 overlay.innerHTML=`<path class="guide-track" d="${path}"/><path class="guide-dash" d="${path}"/><circle class="guide-origin" cx="${from.x}" cy="${from.y}" r="9"/><circle class="guide-goal" cx="${to.x}" cy="${to.y}" r="17"/><path class="guide-tip" d="M -15 -8 L 0 0 L -15 8 Z" transform="translate(${end.x} ${end.y}) rotate(${heading})"/><text class="guide-caption" text-anchor="middle" x="${labelX}" y="${labelY}"></text>`;
 overlay.querySelector('text').textContent=typeof uiText==='function'?uiText(plan.label):plan.label;
}
window.addEventListener('resize',scheduleWorksheetFullGuide);
document.addEventListener('scroll',scheduleWorksheetFullGuide,true);
