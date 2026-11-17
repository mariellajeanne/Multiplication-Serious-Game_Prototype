/* A separate viewer leaves the helper's personal worksheet mounted and saved. */
(function(){
 'use strict';
 const d=window.panaderyaCoBaker;if(!d?.help)return;
 const observation=new CoBakerWorksheet.Observation(d,{recoveryKey:()=>g.run?.phase==='engine'&&!g.run.paused&&!g.run.procedureComplete?g.run.worksheetRewards?.attemptId:null});
 const guidance=new CoBakerWorksheet.Guidance(d);
 let host=null,frame=null,ready=false,lastVersion=0,lastSession=null,lastSnapshot='';
 let hint=null,hintTimer=null,hintFrame=null,feedbackTimer=null;
 guidance.targetVisible=target=>!!WorksheetCues.resolve(target);
 function clearHint(){clearTimeout(hintTimer);cancelAnimationFrame(hintFrame);hint?.remove();hint=null;}
 function showHint(cue){
  clearHint();const progress=document.getElementById('worksheetStepProgress');if(!progress)return;
  hint=document.createElement('div');hint.className='cobaker-hint';hint.id='coBakerProceduralHint';hint.setAttribute('role','status');hint.setAttribute('aria-live','polite');
  const name=document.createElement('strong');name.textContent=cue.name;const message=document.createElement('span');message.textContent=CoBakerWorksheet.hints[cue.hint];hint.append(name,message);document.body.appendChild(hint);
  // Use the footer's progress space, between Undo and Complete Order. No
  // digits or controls are covered, and the learner can drag straight through.
  const position=()=>{const bar=document.querySelector('.worksheet-modern .worksheet-complete-bar'),left=bar?.querySelector('[data-worksheet-control="undo"]')?.getBoundingClientRect(),right=bar?.querySelector('#collectRewards')?.getBoundingClientRect();if(!left||!right){clearHint();return}hint.style.left=(left.right+8)+'px';hint.style.width=Math.max(0,right.left-left.right-16)+'px';hint.style.top=(left.top+(Math.max(left.height,right.height)-hint.offsetHeight)/2)+'px';hintFrame=requestAnimationFrame(position)};
  position();hintTimer=setTimeout(clearHint,4200);
 }
 function feedback(text){const el=host?.querySelector('#coBakerCueStatus');if(!el)return;clearTimeout(feedbackTimer);el.textContent=text;feedbackTimer=setTimeout(()=>{if(el.isConnected)el.textContent=''},2000)}
 guidance.observe(cue=>{
  if(!cue){WorksheetCues.clear();clearHint();clearTimeout(feedbackTimer);if(ready)frame?.contentWindow.postMessage({source:'bc-shell',type:'cue-clear'},location.origin);return}
  if(cue.own){
   if(cue.kind==='point'){frame?.contentWindow.postMessage({source:'bc-shell',type:'cue-point',target:cue.target},location.origin);feedback('Point sent');}
   else feedback('Hint sent');
  }else if(cue.kind==='point')WorksheetCues.show(cue.target);else showHint(cue);
 });
 const steps=s=>s.complete?'Order complete':s.phase==='sum'?'Add the partial products':s.phase==='select'?'Connect the operand digits':!s.revealed?'Generate the product':s.incoming&&!s.mixed?'Apply the waiting carry':!s.onesPlaced?'Place the ones digit':s.tensLocation==='row'?'Lift the tens to the carry shelf':'Place the remaining digit';
 function send(){if(ready&&frame&&observation.latest&&observation.received!==lastVersion){lastVersion=observation.received;const signature=JSON.stringify(observation.latest);if(signature===lastSnapshot)return;lastSnapshot=signature;frame.contentWindow.postMessage({source:'bc-shell',type:'observe',snapshot:observation.latest},location.origin)}}
 function close(){clearTimeout(feedbackTimer);host?.remove();host=null;frame=null;ready=false;lastVersion=0;lastSnapshot='';}
 function open(){
  if(d.help.active?.role!=='Helper')return;
  if(host){host.focus();return}
  host=document.createElement('section');host.id='coBakerObservation';host.className='cobaker-observation';host.tabIndex=-1;host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','Read-only Co-Baker worksheet');
  host.innerHTML='<header><div><strong id="coBakerObserverName"></strong><small>Read-only · The learner controls every step</small></div><button class="secondary" data-observer-close>Back to bakery</button><button class="secondary" data-observer-end>End Helping</button></header><p id="coBakerObserverStatus" role="status"></p><div class="cobaker-guidance-controls"><span>Tap any digit or tile to point</span><label for="coBakerHintSelect">Hint</label><select id="coBakerHintSelect"></select><button class="secondary" data-observer-hint>Send hint</button><span id="coBakerCueStatus" role="status" aria-live="polite"></span></div><h2 id="coBakerObserverProblem"></h2><p id="coBakerObserverStep"></p><iframe title="Read-only learner worksheet" sandbox="allow-scripts allow-same-origin"></iframe>';
  const settings=document.createElement('button');settings.className='secondary';settings.textContent='Settings';settings.setAttribute('aria-label','Co-Baker worksheet settings');settings.onclick=()=>openSettings();host.querySelector('header').appendChild(settings);
  const select=host.querySelector('#coBakerHintSelect');for(const [id,text]of Object.entries(CoBakerWorksheet.hints)){const option=document.createElement('option');option.value=id;option.textContent=text;select.appendChild(option)}
  host.querySelector('[data-observer-hint]').onclick=()=>{if(!guidance.send('hint',select.value))feedback('Wait a moment…')};
  host.addEventListener('keydown',event=>{if(event.target.tagName==='SELECT'){event.stopPropagation();return}if(/^\d$|^Enter$|^Backspace$/.test(event.key)&&!(event.key==='Enter'&&event.target.tagName==='BUTTON')){event.preventDefault();event.stopImmediatePropagation()}},true);
  frame=host.querySelector('iframe');frame.onload=()=>frame?.contentWindow.postMessage({source:'bc-shell',type:'hello'},location.origin);frame.src='worksheet/worksheet-observer.html';
  host.querySelector('[data-observer-close]').onclick=close;host.querySelector('[data-observer-end]').onclick=()=>d.help.end();document.body.appendChild(host);host.focus();paint();
 }
 function paint(){
  const a=d.help.active;
  if(a?.role!=='Helper'){close();lastSession=null;return}
  if(lastSession!==a.sessionId){lastSession=a.sessionId;open()}
  if(!host)return;
  host.querySelector('[data-observer-hint]').disabled=!!a.lostAt||!observation.cueToken;
  const p=d.peers.get(a.otherId);
  host.querySelector('#coBakerObserverName').textContent=p?`${p.name} #${p.number}`:'Your Co-Baker';
  host.querySelector('#coBakerObserverStatus').textContent=a.lostAt?'Your Co-Baker is reconnecting... You can keep practicing!':observation.latest?(d.help.log[0]?.message==='Connected again!'&&d.help.clock()-d.help.log[0].at<4000?'Connected again!':'Live worksheet'):'Waiting for the learner’s worksheet…';
  frame.style.visibility=observation.latest?'visible':'hidden';
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
  if(!frame||e.source!==frame.contentWindow||e.origin!==location.origin||e.data?.source!=='pq-worksheet')return;
  if(e.data.type==='observer-ready'){ready=true;lastVersion=0;lastSnapshot='';send()}
  if(e.data.type==='observer-point'&&ready&&CoBakerWorksheet.targetExists(e.data.target,observation.latest)&&frame.contentWindow.WorksheetCues.resolve(e.data.target)){
   if(!guidance.send('point',e.data.target))feedback('Wait a moment…');
  }
 });
 observation.observe(paint);d.observe(()=>observation.refresh());
 window.openCoBakerObservation=open;
 const priorText=window.render_game_to_text;
 if(typeof priorText==='function')window.render_game_to_text=()=>{
  const text=JSON.parse(priorText()),s=observation.latest?.state;
  text.coBakerObservation={visible:!!host,role:d.help.active?.role||null,connected:!!d.help.active&&!d.help.active.lostAt,version:observation.received,problem:s?[s.a,s.b]:null,step:s?steps(s):null,hint:hint?.textContent||null};
  return JSON.stringify(text);
 };
})();
