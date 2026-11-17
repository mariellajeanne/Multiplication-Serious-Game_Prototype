/* Compact Co-Baker controls; existing worksheet, reservation and reward owners
 * remain authoritative. Notification animation is entirely local. */
(function(){
 'use strict';
 const get=()=>window.panaderyaCoBaker?.help,d=()=>window.panaderyaCoBaker;
 const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const heartIcon='<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" stroke="currentColor" stroke-width="1.8"><path d="M12 21 3.5 12.5C-2 7 6 0 12 6c6-6 14 1 8.5 6.5Z"/></svg>';
 const callIcon=random=>`<svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">${random?'<path d="m3 5 4 0 10 14h4m-4-4 4 4-4 4M3 19h4l4-6m3-5 3-3h4m-4-4 4 4-4 4"/>':'<path d="M5 3h4l2 5-3 2a16 16 0 0 0 6 6l2-3 5 2v4c-1 6-20-7-16-16Z"/>'}</svg>`;
 let search='',lastList='',browse=false,expanded=false,gesture=null,endConfirm=null;
 const confirms=new Map();
 function profile(id){return d()?.peers.get(id)||d()?.candidates.get(id)||get()?.preferences?.crew.get(id)}
 function name(id){const p=profile(id);return p?`${p.name} #${p.number}`:'Baker'}
 function sheetActive(){return !!(typeof g!=='undefined'&&g?.run&&g.run.phase==='engine'&&!g.run.paused&&!g.run.procedureComplete)}
 function nearby(){return [...new Map([...d().candidates,...d().peers].map(([id,p])=>[id,p])).values()]}
 function heart(p,help){const saved=!!help.preferences?.crew.has(p.id);return `<button type="button" class="cobaker-heart" data-crew="${p.id}" aria-pressed="${saved}" aria-label="${saved?'Remove':'Add'} ${esc(p.name)} ${saved?'from':'to'} Favorite Bakers">${heartIcon}</button>`}
 function endButton(help,attribute='data-help-action="end"'){const confirming=endConfirm?.sessionId===help.active?.sessionId&&help.clock()<endConfirm.until;return `<button type="button" class="secondary cobaker-end ${confirming?'confirm-leave':''}" ${attribute}>${confirming?'Remove helper?':'End Help'}</button>`}
 function timers(){const help=get();if(!help)return;for(const node of document.querySelectorAll?.('[data-call-seconds]')||[])node.textContent=Math.max(0,Math.ceil((Number(node.dataset.callSeconds)-help.clock())/1000))+'s';}
 function renderHelp(){const help=get(),container=document.getElementById('coBakerHelpBody');if(!container||!help)return;
  const peers=nearby(),all=new Map(peers.map(p=>[p.id,p]));for(const p of help.preferences?.crew.values()||[])if(!all.has(p.id))all.set(p.id,{...p,reachable:false});
  const sorted=[...all.values()].sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'})||a.number.localeCompare(b.number)||a.id.localeCompare(b.id));
  const filtered=sorted.filter(p=>!help.calls.has(p.id)&&(p.name+' '+p.number).toLowerCase().includes(search.toLowerCase()));
  const row=p=>`<div class="cobaker-help-peer" data-baker="${p.id}">${heart(p,help)}<span><strong>${esc(p.name)} <span class="cobaker-baker-id">#${p.number}</span></strong><small>${p.reachable===false?'Not nearby':help.state(p.id).status}</small></span><button type="button" class="secondary" data-help-to="${p.id}" ${!browse&&sheetActive()&&help.canCall(p.id)?'':'disabled'}>Call</button></div>`;
  const calls=[...help.calls.values()].map(c=>{const p=profile(c.id)||{id:c.id,name:'Baker',number:'----'};return `<div class="cobaker-help-peer cobaker-active-call" data-baker="${c.id}"><span class="cobaker-call-icon">${callIcon(c.source==='random')}</span><span class="cobaker-call-person"><span class="cobaker-call-name"><strong>${esc(p.name)} <span class="cobaker-baker-id">#${p.number}</span></strong>${heart(p,help)}</span><small>${c.source==='random'?'Random call':'Manual call'}</small></span><span class="cobaker-call-time" ${c.expiresAt?`data-call-seconds="${c.expiresAt}"`:''}>${c.state==='connecting'?'Connecting...':c.waiting?'Sending...':''}</span><button type="button" class="cobaker-call-cancel" data-help-cancel="${c.id}" aria-label="Cancel call to ${esc(p.name)}">&times;</button>${c.expiresAt?`<i class="cobaker-invite-time" data-expires="${c.expiresAt}" aria-hidden="true"></i>`:''}</div>`}).join('');
  const favorites=filtered.filter(p=>help.preferences?.crew.has(p.id)),others=filtered.filter(p=>!help.preferences?.crew.has(p.id));
  const connection=help.active?`<div class="cobaker-help-connection"><strong>${help.active.lostAt?'Your Co-Baker is reconnecting...':'Connected with '+esc(name(help.active.otherId))}</strong>${endButton(help)}</div>`:'';
  const count=help.calls.size,finding=!!help.search?.active;
  const result=`${connection}<div class="cobaker-find-row"><div class="cobaker-call-count" role="meter" aria-label="Bakers Calling Now" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${count}" style="--call-fill:${count/3*100}%"><span>${count}/3 Bakers Calling Now</span></div><button type="button" class="primary cobaker-find-button" data-help-action="${finding?'stop':'find'}" ${finding||!browse&&sheetActive()&&!help.active&&!help.accepting&&count<3&&peers.some(p=>help.eligible(p.id))?'':'disabled'}>${finding?'Stop Finding':'Find Helpers'}</button></div><label class="cobaker-search-label" for="coBakerHelpSearch">Find a Baker</label><input id="coBakerHelpSearch" type="search" placeholder="Search name or number" value="${esc(search)}" maxlength="28" autocomplete="off"><div class="cobaker-help-list" aria-label="Bakers">${calls}${favorites.length?'<h3>Favorite Bakers</h3>'+favorites.map(row).join(''):''}${others.length?'<h3>Other Bakers</h3>'+others.map(row).join(''):''}${!calls&&!filtered.length?(peers.length?'No Bakers match your search.':'No Bakers nearby yet!'):''}</div><p class="cobaker-help-message" role="status">${esc(help.log[0]?.message||(!sheetActive()?'Open an order to ask for help.':''))}</p>`;
  if(result===lastList&&container.dataset.rendered==='true'){timers();return}
  const focused=document.activeElement?.id==='coBakerHelpSearch',selection=document.activeElement?.selectionStart||0,scroll=container.querySelector?.('.cobaker-help-list')?.scrollTop||0;
  lastList=result;container.innerHTML=result;container.dataset.rendered='true';const listNode=container.querySelector?.('.cobaker-help-list');if(listNode)listNode.scrollTop=scroll;
  for(const bar of container.querySelectorAll?.('[data-expires]')||[]){const remaining=Math.max(0,Number(bar.dataset.expires)-help.clock());bar.style.setProperty('--remaining',remaining+'ms');bar.style.setProperty('--fraction',Math.min(1,remaining/CoBakerHelpRules.inviteMs))}timers();
  if(focused){const field=container.querySelector('#coBakerHelpSearch');field?.focus({preventScroll:true});try{field?.setSelectionRange(selection,selection)}catch(_){}}
 }
 function notices(){const help=get();if(!help)return;let holder=document.getElementById('coBakerInvitations');
  if(!holder){holder=document.createElement('aside');holder.id='coBakerInvitations';holder.setAttribute('aria-label','Help Requests');document.body.appendChild(holder)}
  const observer=document.getElementById('coBakerObservation');
  const calculator=document.querySelector('.worksheet-modern .worksheet-calculator');
  const dock=observer||(calculator?.getClientRects().length?calculator:null);
  if(dock&&holder.parentElement!==dock){if(observer)observer.querySelector('header').after(holder);else dock.prepend(holder);holder.classList.add('is-docked')}
  if(!dock&&holder.parentElement!==document.body){document.body.appendChild(holder);holder.classList.remove('is-docked')}
  const invitations=[...help.incoming.values()].filter(i=>i.expiresAt>help.clock());
  for(const id of confirms.keys())if(!invitations.some(i=>i.requestId===id))confirms.delete(id);
  const active=help.active,currently=help.accepting,header=document.querySelector('.worksheet-modern .worksheet-header-actions');
  if(header){let status=document.getElementById('coBakerConnectionStatus');if(!status){status=document.createElement('small');status.id='coBakerConnectionStatus';status.setAttribute('role','status');header.appendChild(status)}
   const note=help.log[0],recent=note&&help.clock()-note.at<4000?note.message:'';
   status.textContent=active?.role==='Learner'?(active.lostAt?'Your Co-Baker is reconnecting...':'Co-Baker connected'):/Your Co-Baker left/.test(recent)?recent:'';
   const call=header.querySelector('.cobaker-help-button');if(call){call.textContent='Call for Help';call.dataset.pending=String(!!help.outgoing)}
  }
  if(header){let remove=document.getElementById('coBakerRemoveHelper');if(active?.role==='Learner'){
   if(!remove){header.insertAdjacentHTML('beforeend',endButton(help,'id="coBakerRemoveHelper" data-learner-end="true"'));remove=document.getElementById('coBakerRemoveHelper')}
   if(remove){const confirming=endConfirm?.sessionId===active.sessionId&&help.clock()<endConfirm.until;remove.textContent=confirming?'Remove helper?':'End Help';remove.classList.toggle('confirm-leave',!!confirming)}
  }else{remove?.remove();endConfirm=null}}
  const collapsed=!expanded&&(innerWidth<1100||innerHeight<850)&&invitations.length>1;
  const markup=`<button type="button" class="cobaker-tray-toggle" data-tray-toggle aria-expanded="${!collapsed}">Help Requests${invitations.length?' · '+invitations.length:''}</button><div class="cobaker-request-scroll" ${collapsed?'hidden':''}>${invitations.map(i=>{
   const confirmation=confirms.get(i.requestId),leaving=confirmation?.role==='Helper',label=confirmation?(leaving?'Leave '+name(confirmation.otherId)+'?':'Save your worksheet?'):name(i.ownerId)+' needs help!';
   const action=confirmation?(leaving?'Leave '+name(confirmation.otherId).split(' #')[0]+' & Help '+name(i.ownerId).split(' #')[0]:'Save & Exit Worksheet'):'Help';
   const p=profile(i.ownerId),text=confirmation?esc(label):`<span class="cobaker-request-baker">${esc(p?.name||'Baker')}</span><span class="cobaker-request-number">#${p?.number||'----'}</span><span class="cobaker-request-verb"> needs help!</span>`;
   return `<div class="cobaker-invite ${confirmation?'is-confirming':''}" data-invitation="${i.requestId}"><span class="cobaker-request-label" title="${esc(label)}">${text}</span><button type="button" data-help-accept="${i.requestId}" class="${confirmation?leaving?'confirm-leave':'confirm-save':''}" ${currently||help.switching?'disabled':''}>${confirmation?'<span aria-hidden="true">↪ </span>':''}${esc(action)}</button><button type="button" class="cobaker-dismiss" ${confirmation?`data-help-back="${i.requestId}" aria-label="Cancel switch"`:`data-help-decline="${i.requestId}" aria-label="Dismiss help request from ${esc(name(i.ownerId))}"`}>${confirmation?'Back':'×'}</button><i class="cobaker-invite-time" data-expires="${i.expiresAt}" aria-hidden="true"></i></div>`;
  }).join('')}${[...help.terminals.values()].map(t=>`<div class="cobaker-invite is-terminal"><span>${esc(name(t.ownerId)+' '+t.text)}</span></div>`).join('')}</div>${currently?`<small>Waiting for ${esc(name(currently.ownerId))}…</small>`:''}${active&&active.role==='Helper'&&!observer?'<button type="button" data-help-watch="1">Watch worksheet</button>':''}`;
  if(holder.coBakerMarkup!==markup){const scroll=holder.querySelector?.('.cobaker-request-scroll')?.scrollTop||0;holder.coBakerMarkup=markup;holder.innerHTML=markup;const node=holder.querySelector?.('.cobaker-request-scroll');if(node)node.scrollTop=scroll;
   for(const bar of holder.querySelectorAll?.('[data-expires]')||[]){const remaining=Math.max(0,Number(bar.dataset.expires)-help.clock());bar.style.setProperty('--remaining',remaining+'ms');bar.style.setProperty('--fraction',Math.min(1,remaining/CoBakerHelpRules.inviteMs))}}
  holder.hidden=!(invitations.length||help.terminals.size||currently||active?.role==='Helper'&&!observer);
 }
 window.panaderyaCoBakerHelpDiagnostic='Handler ready; no tap yet';
 function open(onlyBrowse=false){window.panaderyaCoBakerHelpDiagnostic='Click handler entered';
  try{const help=get();
   const unavailable=!help?'Co-Baker is unavailable. You can keep practicing. Try reopening the app.':!onlyBrowse&&!sheetActive()?'Open or resume an unfinished order to call a Co-Baker.':'';
   search='';lastList='';browse=onlyBrowse;
   showModal(onlyBrowse?'Find Bakers':'Call for Help',unavailable?`<p role="status">${unavailable}</p>`:'<div id="coBakerHelpBody" class="cobaker-help-body"></div>','cobaker-help-modal');
   if(!unavailable){help.setPicker(true);renderHelp()}window.panaderyaCoBakerHelpDiagnostic=unavailable?'Feedback opened: '+unavailable:'Help popup rendered';
  }catch(error){window.panaderyaCoBakerHelpDiagnostic='Handler error: '+String(error?.message||error).slice(0,200);if(typeof toast==='function')toast('Could not open Co-Baker help. Please try again.')}
 }
 async function accept(requestId){const help=get(),invite=help?.incoming.get(requestId);if(!invite||invite.expiresAt<=help.clock())return;
  const active=help.active,own=sheetActive(),confirmation=confirms.get(requestId);
  if(active||own){
   if(!confirmation){confirms.set(requestId,{at:help.clock(),sessionId:active?.sessionId||null,role:active?.role||'Own',otherId:active?.otherId,orderId:typeof g!=='undefined'?g.run?.ticket?.id:null});notices();return}
   if(help.clock()-confirmation.at<CoBakerHelpRules.confirmDelayMs)return;
   if(confirmation.sessionId!==(active?.sessionId||null)||confirmation.orderId!==(typeof g!=='undefined'?g.run?.ticket?.id:null)){confirms.delete(requestId);notices();return}
   await help.switchTo(requestId,confirmation.sessionId,()=>{
    if(!own)return true;
    // Existing exit synchronously captures engine actions and refuses a failed save.
    return abandonTicket()===true;
   });
  }else help.accept(requestId);
  confirms.delete(requestId);notices();
 }
 function action(e){const target=e.target.closest?.('button,input');if(!target)return;const help=get();if(!help)return;
  if(target.dataset.crew){const p=profile(target.dataset.crew);if(p&&!help.preferences?.toggle(p))toast('Could not save Favorite Bakers. Please try again.');lastList=''}
  if(target.dataset.helpTo){const outcome=help.request([target.dataset.helpTo]);if(!outcome.ok)help.note(outcome.error)}
  if(target.dataset.helpAction==='find'){const outcome=help.startSearch();if(!outcome.ok)help.note(outcome.error)}
  if(target.dataset.helpAction==='stop')help.stopSearch();
  if(target.dataset.helpCancel)help.finishCall(target.dataset.helpCancel,'cancel',true);
  if(target.dataset.helpAction==='cancel')help.cancel();
  if(target.dataset.helpAction==='end'||target.dataset.helpEnd||target.dataset.learnerEnd){
   if(help.active?.role==='Learner'){const at=help.clock(),sessionId=help.active.sessionId;
    if(endConfirm?.sessionId===sessionId&&at<endConfirm.until){if(at-endConfirm.at>=CoBakerHelpRules.confirmDelayMs){help.end();endConfirm=null}}
    else endConfirm={sessionId,at,until:at+CoBakerHelpRules.confirmWindowMs};
   }else help.end();
  }
  if(target.dataset.helpWatch)window.openCoBakerObservation?.();
  if(target.hasAttribute?.('data-tray-toggle'))expanded=!expanded;
  if(target.dataset.helpBack)confirms.delete(target.dataset.helpBack);
  if(target.dataset.helpAccept){accept(target.dataset.helpAccept);return}
  if(target.dataset.helpDecline)help.decline(target.dataset.helpDecline);
  renderHelp();notices();
 }
 document.addEventListener('click',e=>{if(e.target.closest?.('#coBakerHelpBody,#coBakerInvitations,[data-learner-end]'))action(e)});
 document.addEventListener('input',e=>{if(e.target.id==='coBakerHelpSearch'){search=e.target.value;lastList='';renderHelp()}});
 document.addEventListener('pointerdown',e=>{if(e.target.closest?.('.cobaker-help-button'))window.panaderyaCoBakerHelpDiagnostic='Pointer reached button; awaiting click';const row=e.target.closest?.('[data-invitation]');if(row&&!e.target.closest('button'))gesture={id:row.dataset.invitation,x:e.clientX,y:e.clientY,pointer:e.pointerId};});
 document.addEventListener('pointerup',e=>{if(!gesture||e.pointerId!==gesture.pointer)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(dx<-65&&Math.abs(dx)>Math.abs(dy)*2){get()?.decline(gesture.id);confirms.delete(gesture.id)}gesture=null;});
 document.addEventListener('pointercancel',()=>gesture=null);
 window.addEventListener('resize',notices);
 window.openCoBakerHelp=open;
 const prior=renderWorksheet;renderWorksheet=function(...args){let html=prior.apply(this,args);if(html.includes('worksheet-modern'))html=html.replace('<div class="worksheet-header-actions">','<div class="worksheet-header-actions"><button type="button" class="illustrated-worksheet-button cobaker-help-button" onclick="openCoBakerHelp()">Call for Help</button>');return html;};
 const initialHeader=document.querySelector('.worksheet-modern .worksheet-header-actions');
 if(initialHeader&&!initialHeader.querySelector('.cobaker-help-button'))initialHeader.insertAdjacentHTML('afterbegin','<button type="button" class="illustrated-worksheet-button cobaker-help-button" onclick="openCoBakerHelp()">Call for Help</button>');
 const current=d();if(current?.help){current.help.worksheet=()=>sheetActive()||!!(current.help.active?.role==='Learner'&&!current.help.active.lostAt&&typeof g!=='undefined'&&g.run?.phase==='engine'&&!g.run.paused&&g.run.procedureComplete);current.help.observe(()=>{renderHelp();notices()});current.observe(()=>{renderHelp();notices()})}
 // Modal closure only stops scanning/refilling. Delivered calls and the live
 // worksheet reservation remain owned by Help until their own terminal state.
 if(typeof MutationObserver==='function')new MutationObserver(()=>{const help=get();if(help?.pickerOpen&&!document.getElementById('coBakerHelpBody'))help.setPicker(false)}).observe(document.getElementById('modals')||document.body,{childList:true,subtree:true});
 setInterval(()=>{timers();if(endConfirm&&get()?.clock()>=endConfirm.until){endConfirm=null;lastList='';renderHelp();notices()}},250);
 const priorText=window.render_game_to_text;
 if(typeof priorText==='function')window.render_game_to_text=()=>{const text=JSON.parse(priorText()),help=get();text.coBaker={transport:d()?.transport?.label||'Unavailable',availability:help?.status()||'Unavailable',nearby:d()?nearby().length:0,favorites:help?.preferences?.crew.size||0,calling:help?.calls.size||0,finding:!!help?.search?.active,calls:[...help?.calls.values()||[]].map(c=>({baker:name(c.id),source:c.source,state:c.state,remainingMs:Math.max(0,c.expiresAt-help.clock())})),requests:[...help?.incoming.values()||[]].map(i=>({baker:name(i.ownerId),remainingMs:Math.max(0,i.expiresAt-help.clock()),confirming:confirms.has(i.requestId)}))};return JSON.stringify(text)};
})();
