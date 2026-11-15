/* A separate viewer leaves the helper's personal worksheet mounted and saved. */
(function(){
 'use strict';
 const d=window.panaderyaCoBaker;if(!d?.help)return;
 const observation=new CoBakerWorksheet.Observation(d);
 let host=null,frame=null,ready=false,lastVersion=0,lastSession=null;
 const steps=s=>s.complete?'Order complete':s.phase==='sum'?'Add the partial products':s.phase==='select'?'Connect the operand digits':!s.revealed?'Generate the product':s.incoming&&!s.mixed?'Apply the waiting carry':!s.onesPlaced?'Place the ones digit':s.tensLocation==='row'?'Lift the tens to the carry shelf':'Place the remaining digit';
 function send(){if(ready&&frame&&observation.latest&&observation.received!==lastVersion){lastVersion=observation.received;frame.contentWindow.postMessage({source:'bc-shell',type:'observe',snapshot:observation.latest},location.origin)}}
 function close(){host?.remove();host=null;frame=null;ready=false;lastVersion=0;}
 function open(){
  if(d.help.active?.role!=='Helper')return;
  if(host){host.focus();return}
  host=document.createElement('section');host.id='coBakerObservation';host.className='cobaker-observation';host.tabIndex=-1;host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','Read-only Co-Baker worksheet');
  host.innerHTML='<header><div><strong id="coBakerObserverName"></strong><small>Read-only · The learner controls every step</small></div><button class="secondary" data-observer-close>Back to bakery</button><button class="secondary" data-observer-end>End Helping</button></header><p id="coBakerObserverStatus" role="status"></p><h2 id="coBakerObserverProblem"></h2><p id="coBakerObserverStep"></p><iframe title="Read-only learner worksheet" sandbox="allow-scripts allow-same-origin"></iframe>';
  host.addEventListener('keydown',event=>{if(/^\d$|^Enter$|^Backspace$/.test(event.key)&&!(event.key==='Enter'&&event.target.tagName==='BUTTON')){event.preventDefault();event.stopImmediatePropagation()}},true);
  frame=host.querySelector('iframe');frame.onload=()=>frame?.contentWindow.postMessage({source:'bc-shell',type:'hello'},location.origin);frame.src='worksheet/worksheet-observer.html';
  host.querySelector('[data-observer-close]').onclick=close;host.querySelector('[data-observer-end]').onclick=()=>d.help.end();document.body.appendChild(host);host.focus();paint();
 }
 function paint(){
  const a=d.help.active;
  if(a?.role!=='Helper'){close();lastSession=null;return}
  if(lastSession!==a.sessionId){lastSession=a.sessionId;open()}
  if(!host)return;
  const p=d.peers.get(a.otherId);
  host.querySelector('#coBakerObserverName').textContent=p?`${p.name} #${p.number}`:'Your Co-Baker';
  host.querySelector('#coBakerObserverStatus').textContent=a.lostAt?'Reconnecting… Your bakery is safe.':observation.latest?'Live worksheet':'Waiting for the learner’s worksheet…';
  const s=observation.latest?.state;
  host.querySelector('#coBakerObserverProblem').textContent=s?`${s.a} × ${s.b}`:'';
  host.querySelector('#coBakerObserverStep').textContent=s?`${steps(s)} · ${s.done} / ${s.A.length*s.B.length} digit pairs`:'';
  send();
 }
 observation.presentation=session=>{
  const r=g.run,s=session?.state;if(!r||r.worksheetSession!==session)return undefined;
  const step=r.steps.find(item=>item.row===s.row&&item.col===s.k),context=step?{r,state:s,step,key:worksheetStepKey(step)}:null;
  const phase=r.procedureComplete?'complete':s.phase==='sum'?'add':s.phase==='select'?'connect':s.phase==='product'?(s.revealed?s.mixed?'place':'carry':'calculate'):'connect';
  const e=session.entry||{},visual=document.getElementById('worksheetFrame')?.worksheetVisual;
  return {calculator:calculationPanelView(context),phase,tutorial:!!g.tutorialArrows,guideLevel:g.tutorialArrows?(g.completed===0?2:g.completed<3?1:0):0,entry:{selected:e.selected||null,value:e.value||'',feedback:e.feedback||'',level:e.level||0,hintTargets:visual?.hintTargets||[]}};
 };
 observation.onSnapshot=()=>observation.publish(g.run?.worksheetSession);
 window.addEventListener('message',e=>{
  if(e.source!==frame?.contentWindow||e.origin!==location.origin||e.data?.source!=='pq-worksheet'||e.data.type!=='observer-ready')return;
  ready=true;lastVersion=0;send();
 });
 observation.observe(paint);d.observe(()=>observation.refresh());
 window.openCoBakerObservation=open;
 const priorText=window.render_game_to_text;
 if(typeof priorText==='function')window.render_game_to_text=()=>{
  const text=JSON.parse(priorText()),s=observation.latest?.state;
  text.coBakerObservation={visible:!!host,role:d.help.active?.role||null,connected:!!d.help.active&&!d.help.active.lostAt,version:observation.received,problem:s?[s.a,s.b]:null,step:s?steps(s):null};
  return JSON.stringify(text);
 };
})();
