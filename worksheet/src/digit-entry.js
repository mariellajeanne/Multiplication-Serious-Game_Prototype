'use strict';
// Input and unresolved guidance live outside mathematical Undo snapshots.
let worksheetDigitEntry;
let worksheetDigitAuthorized=false;
function resetWorksheetDigitEntry(){worksheetDigitEntry={version:1,step:null,selected:null,value:'',feedback:'',level:0,guidance:{},paths:{}}}
resetWorksheetDigitEntry();
function worksheetDropDigit(part,target,digit){
 if(!worksheetExternalCalculator||!productActive()||!s.revealed||busy||!s.mixed)return false;
 if(!['ones','tens'].includes(part)||part==='tens'&&!tens())return false;
 if(Number(digit)!==(part==='ones'?ones():tens()))return false;
 // Reuse the persisted action guidance and the original placement validators.
 const key=digitStepKey(),relocating=part==='tens'&&s.tensPlaced&&s.tensLocation==='row'&&!lastDigit();
 const sourcePart=relocating?s.digitSources?.[key]?.tens||part:part;
 const used=Object.values(s.digitSources?.[key]||{});if(!relocating&&used.includes(sourcePart))return false;
 if(!relocating&&ones()===tens()&&target.kind==='slot'&&target.r===s.row&&target.c===currentCol())part='ones';
 else if(!relocating&&ones()===tens()&&(target.kind==='carry'||target.kind==='slot'&&target.c===currentCol()+1))part='tens';
 if(part==='ones'&&s.onesPlaced||part==='tens'&&s.tensPlaced&&s.tensLocation!=='row')return false;
 const matches=part==='ones'?target.kind==='slot'&&target.r===s.row&&target.c===currentCol():
  target.kind==='carry'&&!lastDigit()&&target.c===s.k+1||!relocating&&target.kind==='slot'&&target.r===s.row&&target.c===currentCol()+1;
 worksheetDigitEntry.selected=target;worksheetDigitEntry.value=String(digit);
 if(!matches){
  worksheetDigitEntry.hintPart=part;
  const expected=worksheetPlacementExpected(part),record=worksheetDigitEntry.guidance[expected.key]||(worksheetDigitEntry.guidance[expected.key]={mistakes:0});
  record.mistakes++;const level=worksheetDigitEntry.paths[digitStepKey()]===false?2:Math.min(3,record.mistakes);
  worksheetDigitEntry.level=level;worksheetDigitEntry.feedback=level===1?'Try again!':level>=3?expected.exact:expected.hint;
  worksheetDigitEntry.selected=null;worksheetDigitEntry.value='';invalid();render();bridgePoll();return false;
 }
 const accepted=worksheetDigitKey('Enter');
 if(accepted){s.digitSources=s.digitSources||{};s.digitSources[key]={...(s.digitSources[key]||{}),[part]:sourcePart};worksheetDigitEntry.liftArmed=false;if(s.phase==='product'&&s.tensLocation==='row'&&!lastDigit()){worksheetDigitEntry.feedback='Move the written tens digit up to the carry row.';render()}bridgePoll()}
 return accepted;
}
function digitStepKey(){return `${s.row}:${s.k}`}
function digitColumnName(c){return ['ones','tens','hundreds','thousands','ten-thousands','hundred-thousands','millions'][c]||`column ${c+1}`}
function digitTargetSelector(target){return !target?null:target.kind==='carry'?`[data-carry="${target.c}"]`:`[data-slot="${target.r}:${target.c}"]`}
function worksheetPlacementExpected(part=null){
 if(!productActive()||!s.revealed)return null;
 const key=digitStepKey(),c=currentCol(),slot={kind:'slot',r:s.row,c};
 if(s.incoming&&!s.mixed)return {key:key+'/carry-down',target:slot,source:{kind:'carry',c:s.k},hint:'Bring the waiting carry into the product first.',exact:`Add the carry ${s.incoming}, then put ${(s.raw+s.incoming)%10} in the ${digitColumnName(c)} column.`};
 if(part==='ones'||!s.onesPlaced&&part!=='tens')return {key:key+'/ones',target:slot,digit:ones(),hint:`Check the ${digitColumnName(c)} column!`,exact:`Put ${ones()} in the ${digitColumnName(c)} column.`};
 if(tens()>0){
  const target=lastDigit()?{kind:'slot',r:s.row,c:c+1}:{kind:'carry',c:s.k+1};
  return {key:key+'/tens',target,digit:tens(),hint:lastDigit()?'Place the tens digit one column to the left.':'That digit belongs in the carry row!',exact:lastDigit()?`Put ${tens()} in the ${digitColumnName(c+1)} column.`:`Put ${tens()} in the carry tile above ${s.A[s.k+1]}.`};
 }
 return null;
}
function syncWorksheetDigitEntry(){
 const key=productActive()?digitStepKey():null;
 if(worksheetDigitEntry.step!==key){
  Object.assign(worksheetDigitEntry,{step:key,selected:null,value:'',feedback:'',level:0});
  const expected=worksheetPlacementExpected(),mistakes=expected&&worksheetDigitEntry.guidance[expected.key]?.mistakes;
  if(mistakes){const level=worksheetDigitEntry.paths[key]===false?2:Math.min(3,mistakes);worksheetDigitEntry.level=level;worksheetDigitEntry.feedback=level===1?'Try again!':level>=3?expected.exact:expected.hint}
 }
 const target=worksheetDigitEntry.selected;
 if(target){const filled=target.kind==='carry'?s.carrySlots[target.c]!==undefined:s.rows[target.r]?.[target.c]!==undefined;
  if(!productActive()||!s.revealed||filled){worksheetDigitEntry.selected=null;worksheetDigitEntry.value=''}
 }
}
function paintWorksheetDigitEntry(){
 if(!worksheetExternalCalculator)return;
 syncWorksheetDigitEntry();
 document.querySelectorAll('.entry-selected,.entry-hint').forEach(el=>{el.classList.remove('entry-selected','entry-hint');el.removeAttribute('aria-pressed')});
 const selected=Q(digitTargetSelector(worksheetDigitEntry.selected)||'.no-entry-target');
 if(selected){selected.classList.add('entry-selected');selected.setAttribute('aria-pressed','true');selected.classList.toggle('entry-draft',!!worksheetDigitEntry.value);selected.textContent=worksheetDigitEntry.value}
 if(worksheetDigitEntry.level>=3){const expected=worksheetPlacementExpected(worksheetDigitEntry.hintPart);for(const target of [expected?.target,expected?.source])Q(digitTargetSelector(target)||'.no-entry-target')?.classList.add('entry-hint')}
}
function selectWorksheetDigit(target){
 if(!worksheetExternalCalculator||!productActive()||!s.revealed||busy)return;
 // Selecting a filled digit cannot overwrite it or register a mistake.
 const filled=target.kind==='carry'?s.carrySlots[target.c]!==undefined:s.rows[target.r]?.[target.c]!==undefined;
 if(filled)return;
 const same=JSON.stringify(target)===JSON.stringify(worksheetDigitEntry.selected);
 worksheetDigitEntry.selected=target;if(!same)worksheetDigitEntry.value='';
 render();bridgePoll();
}
function setWorksheetPlacementPath(progressive){worksheetDigitEntry.paths[digitStepKey()]=!!progressive}
function worksheetDigitKey(key){
 if(!worksheetExternalCalculator||!productActive()||!s.revealed||busy||!/^\d$|^Enter$|^Backspace$/.test(key))return false;
 syncWorksheetDigitEntry();const entry=worksheetDigitEntry,target=entry.selected;
 if(!target){entry.feedback='Select an empty worksheet tile first.';render();bridgePoll();return false}
 if(key==='Backspace'){entry.value='';render();bridgePoll();return true}
 if(/^\d$/.test(key)){entry.value=key;render();bridgePoll();return true}
 if(entry.value===''){entry.feedback='Enter a digit, then press Enter.';render();bridgePoll();return false}
 const expected=worksheetPlacementExpected(),cc=currentCol(),digit=Number(entry.value);
 let part=null,lift=false;
 if(target.kind==='slot'&&target.r===s.row){
  if(target.c===cc&&!s.onesPlaced)part='ones';
  else if(target.c===cc+1&&!s.tensPlaced&&tens()>0)part='tens';
 }else if(target.kind==='carry'&&target.c===s.k+1&&!lastDigit()&&tens()>0){
  if(!s.tensPlaced)part='tens';else if(s.tensLocation==='row'){part='tens';lift=true}
 }
 const valid=part&&digit===(part==='ones'?ones():tens())&&!s.carryArmed;
 if(!valid){
  const guidance=entry.guidance[expected.key]||(entry.guidance[expected.key]={mistakes:0});guidance.mistakes++;
  const progressive=entry.paths[digitStepKey()]!==false,level=progressive?Math.min(3,guidance.mistakes):2;
  let hint=expected.hint;
  if(part&&!s.carryArmed)hint=`Check the ${part==='ones'?'ones':'tens'} digit in ${value()}.`;
  if(expected.key.endsWith('/ones')&&tens()>0&&digit===tens()&&target.kind==='slot'&&target.c===cc)hint=lastDigit()?'The tens digit belongs one column to the left.':'That digit belongs in the carry row!';
  entry.feedback=level===1?'Try again!':level>=3?expected.exact:hint;entry.level=level;
  invalid();status(entry.feedback,true);render();bridgePoll();return false;
 }
 // The existing engine remains responsible for placement, carry and advancement.
 const actionKey=digitStepKey()+'/'+part;
 entry.guidance[actionKey]={mistakes:0};entry.selected=null;entry.value='';entry.feedback='Digit placed!';entry.level=0;entry.hintPart=null;
 worksheetDigitAuthorized=true;
 try{if(lift)liftTens();else place(part,target.kind,target.c)}finally{worksheetDigitAuthorized=false}
 bridgePoll();return true;
}
