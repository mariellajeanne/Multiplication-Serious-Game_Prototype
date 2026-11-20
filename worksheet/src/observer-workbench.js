/* Presentation-only document: no bakery state, reward code or input API loaded. */
(function(){
 'use strict';
 const stage=document.getElementById('observedWorkbench');
 let snapshot=null,ready=false,signature='',rewardSignature='',renderVersion=0,appliedVersion=-1,retryAt=performance.now()+6000;
 stage.innerHTML='<header class="worksheet-order-header"><div class="worksheet-order-expression" id="observedProblem"></div></header>'+WorksheetComponents.readOnly(WorksheetComponents.workspace({done:0,total:0,complete:false}));
 const frame=document.getElementById('worksheetFrame');frame.style.visibility='hidden';frame.src='worksheet-engine.html?observe=1';frame.title='Read-only multiplication worksheet';
 frame.onload=()=>frame.contentWindow.postMessage({source:'bc-shell',type:'hello'},location.origin);
 const report=()=>parent.postMessage({source:'pq-worksheet',type:'observer-ready'},location.origin);
 // No handler names used by production markup exist here. Block real/synthetic
 // inputs before insertion/listeners; disabled controls remain visually legible.
 for(const type of ['click','dblclick','pointerdown','pointerup','pointercancel','pointermove','touchstart','touchend','touchmove','keydown','keyup','input','change','submit','dragstart','drop'])window.addEventListener(type,event=>{WorksheetCues.capture(event,target=>parent.postMessage({source:'pq-worksheet',type:'observer-point',target},location.origin));if(event.target.closest?.('.reward-info,.reward-popover')||type==='keydown'&&event.key==='Tab')return;event.preventDefault();event.stopImmediatePropagation()},{capture:true,passive:false});
 function layout(){
  if(!snapshot)return;
  const s=snapshot.state,gap=6,rect=stage.querySelector('.worksheet-left').getBoundingClientRect();
  const byWidth=Math.floor((rect.width-100-gap*(s.cols-1))/s.cols);
  const {cell,height}=WorksheetComponents.layout({rows:s.B.length,cols:s.cols,available:rect.height,byWidth,minArea:0,gap});
  frame.style.height=height+'px';
  if(ready)frame.contentWindow.postMessage({source:'bc-shell',type:'observe',snapshot,renderVersion,layout:{cell,gap}},location.origin);
 }
 function paint(){
  const s=snapshot.state,v=snapshot.presentation;
  document.getElementById('observedProblem').textContent=`${s.a} × ${s.b}`;
  if(v?.order){const expr=document.getElementById('observedProblem');expr.innerHTML=`<img class="food-art" src="../assets/bakery-ui/illustrated/food-${String(v.order.sprite).padStart(2,'0')}.png" alt=""><b>${s.a}</b><span>&times;</span><img class="worksheet-tray" src="../assets/bakery-ui/illustrated/cloche.png" alt="trays"><b>${s.b}</b>`}
  const rewardOptions=v?.rewards||[],rewardKey=JSON.stringify(rewardOptions.map(({count,...o})=>o));
  if(rewardKey!==rewardSignature){stage.querySelector('.worksheet-reward-row')?.remove();stage.insertAdjacentHTML('beforeend',WorksheetComponents.rewards(rewardOptions.map(o=>({...o,art:WorksheetComponents.coinArt(o.rank,'../assets/bakery-ui/illustrated/')}))));rewardSignature=rewardKey}
  for(const o of rewardOptions){const badge=stage.querySelector(`[data-ticket-count="${o.rank}"]`);if(badge)badge.textContent=o.count}
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
 setInterval(()=>{
  if(!snapshot)report();
  else if(ready&&appliedVersion!==renderVersion)layout();
  else if(!ready)frame.contentWindow.postMessage({source:'bc-shell',type:'hello'},location.origin);
  // An interrupted document load may miss the bridge script entirely. Retrying
  // messages cannot repair that document. Reload only this read-only child;
  // the learner and the helper's personal worksheet are never restarted.
  if(snapshot&&appliedVersion<0&&navigator.onLine&&performance.now()>=retryAt){ready=false;retryAt=performance.now()+6000;frame.src='worksheet-engine.html?observe=1';}
 },400);report();
 // Read-only test/inspection surface, never a command bridge.
 window.getObservedWorksheetState=()=>{try{return frame.contentWindow.eval('cloneWorksheetState(s)')}catch(_){return null}};
})();
