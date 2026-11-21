/* Shared semantic DOM adapter. Presentation only: never invokes gameplay. */
(function(root){
 'use strict';
 const selectors={
  'calculator:product':'#calculationAnswer','calculator:tray':'.worksheet-digit-tray',
  'calculator:ones':'[data-answer-digit="ones"],[data-part="ones"]','calculator:tens':'[data-answer-digit="tens"],[data-part="tens"]',
  'calculator:carry':'.carry-source','control:generate':'#generateAnswer,#equationReveal,[data-golden-option="auto"]',
  'control:undo':'[data-worksheet-control="undo"]','control:add':'#addRows','control:challenge':'#goldenChallenge,[data-golden-option="manual"]'
 };
 function selector(t){
  if(!root.CoBakerWorksheet.validTarget(t))return null;
  if(selectors[t])return selectors[t];
  const [kind,a,b]=t.split(':');return kind==='slot'?`[data-slot="${a}:${b}"]`:`[data-${kind}="${a}"]`;
 }
 const visible=el=>{if(!el?.isConnected)return false;const r=el.getBoundingClientRect(),css=el.ownerDocument.defaultView.getComputedStyle(el);return r.width>0&&r.height>0&&css.visibility!=='hidden'&&css.display!=='none'&&r.bottom>0&&r.right>0&&r.top<el.ownerDocument.defaultView.innerHeight&&r.left<el.ownerDocument.defaultView.innerWidth};
 function resolve(t){
  const q=selector(t);if(!q)return null;
  const el=document.querySelector(q);if(visible(el))return el;
  try{return document.getElementById('worksheetFrame')?.contentWindow?.WorksheetCues?.resolve(t)||null}catch(_){return null}
 }
 function identify(el){
  for(let node=el;node&&node!==document;node=node.parentElement){
   for(const [t,q]of Object.entries(selectors))if(node.matches?.(q))return t;
   for(const kind of ['top','bottom','carry','slot','sum'])if(node.hasAttribute?.('data-'+kind)){const t=kind+':'+node.getAttribute('data-'+kind);if(root.CoBakerWorksheet.validTarget(t))return t}
  }
  return null;
 }
 let active=null,timer=null,raf=null,down=null;
 function clearLocal(){clearTimeout(timer);cancelAnimationFrame(raf);active?.remove();active=null;down=null}
 function clear(){clearLocal();try{document.getElementById('worksheetFrame')?.contentWindow?.WorksheetCues?.clear()}catch(_){}}
 function show(t){
  clear();const el=resolve(t);if(!el)return false;
  if(el.ownerDocument!==document)return el.ownerDocument.defaultView.WorksheetCues.show(t);
  active=document.createElement('div');active.className='cobaker-point-ring';active.dataset.cobakerTarget=t;active.setAttribute('aria-hidden','true');document.body.appendChild(active);
  const position=()=>{const current=document.querySelector(selector(t));if(!visible(current)){clearLocal();return}const r=current.getBoundingClientRect();Object.assign(active.style,{left:r.left-4+'px',top:r.top-4+'px',width:r.width+8+'px',height:r.height+8+'px'});raf=requestAnimationFrame(position)};
  position();timer=setTimeout(clearLocal,2400);return true;
 }
 // Called inside the observer's existing capture-phase input gate. Pointer
 // movement is never transmitted; a scroll/drag does not become a tap.
 function capture(event,send){
  if(event.type==='pointerdown')down={id:event.pointerId,x:event.clientX,y:event.clientY,target:identify(event.target)};
  if(event.type==='pointercancel')down=null;
  if(event.type==='pointerup'){
   const start=down;down=null;
   if(start&&start.id===event.pointerId&&start.target&&Math.hypot(start.x-event.clientX,start.y-event.clientY)<12&&start.target===identify(event.target))send(start.target);
  }
 }
 root.WorksheetCues={resolve,identify,show,clear,capture};
})(globalThis);
