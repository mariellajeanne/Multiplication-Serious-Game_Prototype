/* Set before any interaction listeners. This frame never starts a game attempt. */
const worksheetReadOnly=new URLSearchParams(location.search).get('observe')==='1';
if(worksheetReadOnly){
 document.body.classList.add('worksheet-observer');
 // Block real and synthetic input before the existing engine's handlers.
 for(const type of ['click','dblclick','pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','keydown','keyup','input','change','submit','dragstart','drop'])
  window.addEventListener(type,event=>{if(type==='keydown'&&event.key==='Tab')return;event.preventDefault();event.stopImmediatePropagation()},{capture:true,passive:false});
 const style=document.createElement('style');
 style.textContent='.worksheet-observer .top,.worksheet-observer .actions,.worksheet-observer .footnote,.worksheet-observer .side,.worksheet-observer .cash-terminal,.worksheet-observer #complete,.worksheet-observer #tutorial,.worksheet-observer #additionSwipeGuide,.worksheet-observer #guidePrompt{display:none!important}.worksheet-observer button{cursor:default!important}.worksheet-observer #app{pointer-events:none}';
 document.head.appendChild(style);
}
