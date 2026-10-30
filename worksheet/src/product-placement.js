'use strict';
// Some browsers pause compositor completion when a frame is occluded. Keep
// the existing animation duration, but never leave a placement locked forever.
function settleWorksheetAnimation(animation,maxMs){
 return new Promise(resolve=>{
  const timer=setTimeout(resolve,maxMs);
  Promise.resolve(animation?.finished).catch(()=>{}).then(()=>{clearTimeout(timer);resolve()});
 });
}
// Motion is feedback, never a prerequisite for committing a valid math action.
function worksheetAnimate(element,frames,options){
 try{return element?.animate?.(frames,options)||null}catch(error){return null}
}
function originFor(part){return Q(`[data-part="${part}"]`)||$('floating')}
function destinationFor(part,kind){const c=currentCol();return part==='ones'?Q(`[data-slot="${s.row}:${c}"]`):(kind==='slot'||lastDigit())?Q(`[data-slot="${s.row}:${c+1}"]`):Q(`[data-carry="${s.k+1}"]`)}
function animateMove(from,to,text,kind){if(!from||!to||window.__BATCH_TEST_FAST||matchMedia('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();let base=$('sheet'),root=base.getBoundingClientRect(),a=from.getBoundingClientRect(),b=to.getBoundingClientRect();let el=document.createElement('div');el.className='fly';el.textContent=text;el.style.left=(a.left-root.left)+'px';el.style.top=(a.top-root.top)+'px';el.style.width=a.width+'px';el.style.height=a.height+'px';base.append(el);let dx=b.left+b.width/2-(a.left+a.width/2),dy=b.top+b.height/2-(a.top+a.height/2),scale=Math.min(1,b.height/Math.max(a.height,1));let anim=worksheetAnimate(el,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(${scale})`,opacity:.9}],{duration:kind==='up'?330:270,easing:'cubic-bezier(.15,.85,.27,1)',fill:'forwards'});return settleWorksheetAnimation(anim,kind==='up'?410:350).then(()=>el.remove());}
function spark(el,txt='✦'){if(!el||window.__BATCH_TEST_FAST||matchMedia('(prefers-reduced-motion:reduce)').matches)return;let base=$('sheet').getBoundingClientRect(),p=el.getBoundingClientRect(),node=document.createElement('span');node.className='spark';node.textContent=txt;node.style.left=p.left+p.width/2-base.left+'px';node.style.top=p.top-base.top+'px';$('sheet').append(node);setTimeout(()=>node.remove(),690)}
// The tens tile has TWO destinations during a normal column: the carry shelf OR
// a temporary place in the partial-product row. The latter is not finalized.
function place(part,kind,c){
 if(!productActive()||busy||!s.revealed)return;
 const cc=currentCol(),isLast=lastDigit();
 let valid=part==='ones'?(kind==='slot'&&c===cc):((kind==='slot'&&c===cc+1)||(kind==='carry'&&!isLast&&c===s.k+1));
 if(!valid){invalid();status('That digit belongs in a different place-value position.',true);return}
 if(part==='ones'&&s.onesPlaced||part==='tens'&&s.tensPlaced)return;
 if(part==='tens'&&!tens())return;
 snapshot();const source=originFor(part),dest=destinationFor(part,kind),n=part==='ones'?ones():tens();
 busy=true;const token=run;
 animateMove(source,dest,n,part==='tens'&&kind==='carry'?'up':'down').then(()=>{
  if(token!==run)return;busy=false;
  if(part==='ones'){s.onesPlaced=true;s.rows[s.row][cc]=ones()}
  else {s.tensPlaced=true;s.tensLocation=kind==='slot'?'row':'carry';
   if(kind==='slot')s.rows[s.row][cc+1]=tens();
   else s.carrySlots[s.k+1]={value:tens(),provisional:!s.mixed};}
  s.chosen=null;selection=null;play(part==='tens'&&kind==='carry'?'carry':'drop');render();spark(destinationFor(part,kind));maybeAdvance();
 });
}
// Lift a provisional tens tile OUT of the partial-product row into its carry
// shelf, without insisting that the previous incoming carry has already landed.
function liftTens(){
 if(!productActive()||busy||!s.revealed||!s.tensPlaced||s.tensLocation!=='row'||lastDigit())return;
 snapshot();const cc=currentCol();const source=Q(`[data-slot="${s.row}:${cc+1}"]`),dest=Q(`[data-carry="${s.k+1}"]`);
 busy=true;const token=run;
 animateMove(source,dest,tens(),'up').then(()=>{
  if(token!==run)return;busy=false;delete s.rows[s.row][cc+1];s.tensLocation='carry';
  s.carrySlots[s.k+1]={value:tens(),provisional:!s.mixed};s.chosen=null;selection=null;
  play('carry');render();spark(Q(`[data-carry="${s.k+1}"]`));maybeAdvance();
 });
}
function chooseTile(part){if(!productActive()||busy||!s.revealed)return;if(part==='ones'&&s.onesPlaced||part==='tens'&&(s.tensPlaced||!tens()))return;s.chosen=s.chosen===part?null:part;selection=s.chosen;render();}
function armCarry(){
 if(!productActive()||busy||!s.revealed||s.mixed||!s.incoming)return;
 s.carryArmed=!s.carryArmed;
 s.chosen=null;selection=null;render();status(s.carryArmed?'Carry selected.':'');
}
// The incoming carry is never added merely by clicking the register or a product slot.
// The learner must explicitly pick the source AND choose its target (floating ones or placed ones).
function addCarry(target){
 if(!productActive()||busy||!s.revealed||s.mixed||!s.incoming)return;
 if(!['floating','placed'].includes(target)){invalid();return;}
 if(target==='placed'&&!s.onesPlaced || target==='floating'&&s.onesPlaced){invalid();status('Select a current product digit.',true);return;}
 const current=s.carrySlots[s.k];if(!current)return;
 snapshot();const from=Q(`[data-carry="${s.k}"]`);
 const to=target==='placed'?Q(`[data-slot="${s.row}:${currentCol()}"]`):Q('[data-part="ones"]');
 busy=true;let token=run;animateMove(from,to,s.incoming,'down').then(()=>{
 if(token!==run)return;busy=false;s.mixed=true;s.carryArmed=false;delete s.carrySlots[s.k];
 if(s.onesPlaced)s.rows[s.row][currentCol()]=ones();
 if(s.tensPlaced){
  if(tens()===0){s.tensPlaced=false;if(s.tensLocation==='row')delete s.rows[s.row][currentCol()+1];else delete s.carrySlots[s.k+1];s.tensLocation=null}
  else if(s.tensLocation==='row')s.rows[s.row][currentCol()+1]=tens();
  else s.carrySlots[s.k+1]={value:tens(),provisional:false};
 }
 s.chosen=null;selection=null;play('mix');render();spark(to,'✦');status('Combined.');maybeAdvance();
 });
}
function maybeAdvance(){if(busy||!productActive()||!s.revealed||!s.mixed||!s.onesPlaced||(tens()>0&&(!s.tensPlaced||(!lastDigit()&&s.tensLocation!=='carry'))))return;s.done++;s.boxes++;money+=5;play('done');s.k++;s.raw=0;s.mixed=false;s.incoming=0;s.onesPlaced=false;s.tensPlaced=false;s.tensLocation=null;s.chosen=null;s.carryArmed=false;s.first=null;selection=null;if(s.k<s.A.length){s.phase='select';render();status('');return}if(s.row<s.B.length-1){s.row++;s.k=0;s.phase='select';s.carrySlots={};render();status('New row.');return}if(s.B.length>1){s.phase='sum';s.sumCol=0;s.sumCarry=0;render();status('Partial products ready.');return}finish();}
