/* Presentation-only document: no bakery state, reward code or input API loaded. */
(function(){
 'use strict';
 const stage=document.getElementById('observedWorkbench');
 let snapshot=null,ready=false,signature='',renderVersion=0,appliedVersion=-1;
 stage.innerHTML='<header class="worksheet-order-header"><div class="worksheet-order-expression" id="observedProblem"></div><div class="worksheet-header-actions">Read-only</div></header>'+WorksheetComponents.readOnly(WorksheetComponents.workspace({done:0,total:0,complete:false}));
 const frame=document.getElementById('worksheetFrame');frame.style.visibility='hidden';frame.src='worksheet-engine.html?observe=1';frame.title='Read-only multiplication worksheet';
 const report=()=>parent.postMessage({source:'pq-worksheet',type:'observer-ready'},location.origin);
 // No handler names used by production markup exist here. Block real/synthetic
 // inputs before insertion/listeners; disabled controls remain visually legible.
 for(const type of ['click','dblclick','pointerdown','pointerup','pointercancel','pointermove','touchstart','touchend','touchmove','keydown','keyup','input','change','submit','dragstart','drop'])window.addEventListener(type,event=>{WorksheetCues.capture(event,target=>parent.postMessage({source:'pq-worksheet',type:'observer-point',target},location.origin));if(type==='keydown'&&event.key==='Tab')return;event.preventDefault();event.stopImmediatePropagation()},{capture:true,passive:false});
 function layout(){
  if(!snapshot)return;
  stage.style.transform='translateX(-50%)';
  const s=snapshot.state,calc=innerWidth<=800?240:innerWidth<=1100?260:280,gap=6;
  const css=getComputedStyle(stage),chrome=2*(parseFloat(css.paddingTop)+parseFloat(css.borderTopWidth))+stage.querySelector('.worksheet-order-header').getBoundingClientRect().height+stage.querySelector('.worksheet-complete-bar').getBoundingClientRect().height+2*(parseFloat(css.rowGap)||12)+12;
  const byWidth=Math.floor((innerWidth-calc-114-gap*(s.cols-1))/s.cols),available=Math.max(300,innerHeight-chrome);
  const {cell,height,area}=WorksheetComponents.layout({rows:s.B.length,cols:s.cols,available,byWidth,minArea:innerWidth<=800?300:474,gap});
  stage.style.setProperty('--worksheet-area',area+'px');
  frame.style.height=height+'px';
  // Scale only this observer container for a tall challenge keypad, retaining
  // the production workbench's geometry and aspect ratio.
  const rect=stage.getBoundingClientRect(),scale=Math.min(1,(innerHeight-12)/rect.height,(innerWidth-12)/rect.width);stage.style.transform=`translateX(-50%) scale(${scale})`;
  if(ready)frame.contentWindow.postMessage({source:'bc-shell',type:'observe',snapshot,renderVersion,layout:{cell,gap}},location.origin);
 }
 function paint(){
  const s=snapshot.state,v=snapshot.presentation;
  document.getElementById('observedProblem').textContent=`${s.a} × ${s.b}`;
  stage.dataset.worksheetPhase=v?.phase||'connect';
  const panel=document.getElementById('calculationPanel');
  if(v){const html=WorksheetComponents.readOnly(WorksheetComponents.calculator(v.calculator));if(html!==signature){panel.innerHTML=html;signature=html;}}
  document.getElementById('worksheetStepProgress').textContent=`${s.done} / ${s.A.length*s.B.length} pairs placed`;
  const complete=document.getElementById('collectRewards');complete.toggleAttribute('data-inactive',!s.complete);
  document.getElementById('generateAnswer')?.toggleAttribute('data-inactive',!v?.calculator.active);
  layout();
 }
 window.addEventListener('message',event=>{
  const m=event.data;if(event.origin!==location.origin||!m)return;
  if(event.source===frame.contentWindow&&m.source==='pq-worksheet'&&m.type==='observer-point'&&CoBakerWorksheet.targetExists(m.target,snapshot)){parent.postMessage({source:'pq-worksheet',type:'observer-point',target:m.target},location.origin);return}
  if(event.source===frame.contentWindow&&m.source==='pq-worksheet'&&m.type==='observer-ready'){ready=true;layout();return}
  if(event.source===frame.contentWindow&&m.source==='pq-worksheet'&&m.type==='observer-applied'&&m.renderVersion===renderVersion){appliedVersion=m.renderVersion;frame.style.visibility='visible';return}
  if(event.source!==parent||m.source!=='bc-shell')return;
  if(m.type==='cue-clear')WorksheetCues.clear();
  if(m.type==='cue-point'&&CoBakerWorksheet.targetExists(m.target,snapshot))WorksheetCues.show(m.target);
  if(m.type==='hello')report();
  if(m.type==='observe'&&CoBakerWorksheet.validSnapshot(m.snapshot)){snapshot=m.snapshot;renderVersion++;paint()}
 });
 window.addEventListener('resize',layout);
 setInterval(()=>{if(!snapshot)report();else if(ready&&appliedVersion!==renderVersion)layout()},400);report();
 // Read-only test/inspection surface, never a command bridge.
 window.getObservedWorksheetState=()=>{try{return frame.contentWindow.eval('cloneWorksheetState(s)')}catch(_){return null}};
})();
