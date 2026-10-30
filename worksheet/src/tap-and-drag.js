'use strict';
function targetClicked(el){
 if(busy)return;
 if(el.hasAttribute('data-top')){operand('top',Number(el.dataset.top));return}
 if(el.hasAttribute('data-bottom')){operand('bottom',Number(el.dataset.bottom));return}
 if(el.hasAttribute('data-carry')){
  const c=Number(el.dataset.carry);
  if(productActive()&&!s.mixed&&c===s.k){armCarry();return}
  if(productActive()&&s.chosen==='tens')place('tens','carry',c);return;
 }
 if(el.hasAttribute('data-slot')){
  const [r,c]=el.dataset.slot.split(':').map(Number);
  if(productActive()&&r===s.row&&s.carryArmed){
   if(s.onesPlaced&&c===currentCol())addCarry('placed');
   else {invalid();status('That is not the digit holding the product ones.',true)}
   return;
  }
  if(productActive()&&r===s.row&&s.chosen){place(s.chosen,'slot',c);return}
  if(productActive()&&r===s.row&&s.tensLocation==='row'&&c===currentCol()+1){liftTens();return}
  return;
 }
 if(el.hasAttribute('data-sum'))sum(Number(el.dataset.sum));
}
$('math').addEventListener('click',e=>{if(ignoreClick||busy)return;let el=e.target.closest('button');if(el)targetClicked(el)});$('floating').addEventListener('click',e=>{if(ignoreClick||busy)return;if(e.target.closest('#equationReveal')){revealProduct();return}const el=e.target.closest('[data-part]');if(el){if(s.carryArmed){if(el.dataset.part==='ones')addCarry('floating');else{invalid();status('Carry must combine with the ones part of the product.',true)}}else chooseTile(el.dataset.part)}});
// Drags have the same effect as selecting a tile then tapping its destination.
function isPointerTarget(el){return el&&el.closest('[data-part],[data-top],[data-bottom],[data-carry],[data-slot]')}
function digitCenter(el){if(!el)return null;const base=$('sheet').getBoundingClientRect(),r=el.getBoundingClientRect();return {x:r.left+r.width/2-base.left,y:r.top+r.height/2-base.top};}
// A single geometry function for BOTH the held connector and final connection.
// Each cap is a convex outward cubic semicircle, never an inward SVG arc.
function convexConnector(start,end){
 const dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy);
 const ux=length>.01?dx/length:0,uy=length>.01?dy/length:1;
 const nx=-uy,ny=ux;
 const radius=connectorStyle==='ribbon'?32:connectorStyle==='slim'?18:26;
 const bow=connectorStyle==='ribbon'?7:0;
 const cap=radius*4/3;
 const coord=(center,side,forward)=>`${(center.x+nx*side+ux*forward).toFixed(2)} ${(center.y+ny*side+uy*forward).toFixed(2)}`;
 const a=coord(start,radius,0),b=coord(end,radius,0),c=coord(end,-radius,0),d=coord(start,-radius,0);
 // Each upper/lower edge is either straight or bows OUTWARD, not inward.
 const edge1=bow?`C ${coord(start,radius+bow,length*.33)} ${coord(end,radius+bow,-length*.33)} ${b}`:`L ${b}`;
 const edge2=bow?`C ${coord(end,-radius-bow,-length*.33)} ${coord(start,-radius-bow,length*.33)} ${d}`:`L ${d}`;
 return `M ${a} ${edge1} C ${coord(end,radius,cap)} ${coord(end,-radius,cap)} ${c} ${edge2} C ${coord(start,-radius,-cap)} ${coord(start,radius,-cap)} ${a} Z`;
}
function previewDrag(e){if(!pointer||pointer.pid!==e.pointerId||!['top','bottom'].includes(pointer.kind)||s.phase!=='select')return;
 let from=pointer.el;if(s.first){let old=Q(s.first.kind==='top'?`[data-top="${s.first.c}"]`:`[data-bottom="${s.first.c}"]`);if(old)from=old;}
 const start=digitCenter(from);if(!start)return;const r=$('sheet').getBoundingClientRect();const end={x:e.clientX-r.left,y:e.clientY-r.top};const shape=convexConnector(start,end);
 $('previewGlow').setAttribute('d',shape);$('previewHalo').setAttribute('d',shape);$('previewTrace').setAttribute('d',`M ${start.x} ${start.y} L ${end.x} ${end.y}`);$('connectorPreview').classList.add('active');
}
function hidePreview(){$('connectorPreview').classList.remove('active')}
function down(e){if(busy||!isPointerTarget(e.target))return;let el=isPointerTarget(e.target),kind=el.dataset.part?'tile':el.hasAttribute('data-carry')?'carry':el.hasAttribute('data-slot')?'rowtens':el.hasAttribute('data-top')?'top':'bottom';if(kind==='rowtens'&&(!productActive()||s.tensLocation!=='row'||el.dataset.slot!==`${s.row}:${currentCol()+1}`))return;pointer={pid:e.pointerId,kind,el,part:el.dataset.part,c:el.hasAttribute('data-top')?Number(el.dataset.top):el.hasAttribute('data-bottom')?Number(el.dataset.bottom):el.hasAttribute('data-carry')?Number(el.dataset.carry):null,x:e.clientX,y:e.clientY,drag:false,ghost:null};if(['top','bottom'].includes(kind))previewDrag(e);}
function move(e){if(!pointer||pointer.pid!==e.pointerId)return;previewDrag(e);let d=Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y);if(d>10){pointer.drag=true;if((pointer.kind==='tile'||pointer.kind==='carry'||pointer.kind==='rowtens')&&!pointer.ghost&&productActive()){let ghost=document.createElement('div');ghost.className='ghost';ghost.textContent=pointer.el.textContent;document.body.append(ghost);pointer.ghost=ghost}if(pointer.ghost){pointer.ghost.style.left=(e.clientX-21)+'px';pointer.ghost.style.top=(e.clientY-21)+'px'}}}
function up(e){if(!pointer||pointer.pid!==e.pointerId)return;const p=pointer;pointer=null;hidePreview();p.ghost?.remove();if(!p.drag)return;ignoreClick=true;setTimeout(()=>ignoreClick=false,0);let target=document.elementFromPoint(e.clientX,e.clientY)?.closest('button');if(p.kind==='carry'&&target&&productActive()&&!s.mixed&&p.c===s.k){if(target.dataset.part==='ones'&&!s.onesPlaced)addCarry('floating');else if(target.hasAttribute('data-slot')){const [r,c]=target.dataset.slot.split(':').map(Number);if(r===s.row&&c===currentCol()&&s.onesPlaced)addCarry('placed');else{invalid();status('Carry must join the ones digit.',true)}}return;}if(p.kind==='rowtens'&&target?.hasAttribute('data-carry')&&Number(target.dataset.carry)===s.k+1){liftTens();return}if(p.kind==='tile'&&target){if(target.hasAttribute('data-slot')){let [r,c]=target.dataset.slot.split(':').map(Number);if(r===s.row)place(p.part,'slot',c)}else if(target.hasAttribute('data-carry'))place(p.part,'carry',Number(target.dataset.carry));return}if((p.kind==='top'||p.kind==='bottom')&&target){if(target.hasAttribute('data-top')||target.hasAttribute('data-bottom')){let kind=target.hasAttribute('data-top')?'top':'bottom',c=Number(target.dataset[kind]);if(kind!==p.kind&&s.phase==='select'){operand(p.kind,p.c);operand(kind,c)}}}}
$('sheet').addEventListener('pointerdown',down);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',()=>{hidePreview();pointer?.ghost?.remove();pointer=null});
// Connector style is fixed to capsule for this lab.

