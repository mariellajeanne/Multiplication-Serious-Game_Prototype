(function(){
 'use strict';
 const core=CoBakerCore,debug=new URLSearchParams(location.search).get('cobaker')==='debug';
 let profile,service;
 try{profile=core.identity(localStorage)}catch(_){/* Solo play never depends on profile storage. */}
 const native=window.PanaderyaLan,params=new URLSearchParams(location.search);
 const remoteTest=!native&&debug&&params.get('remoteRelay')==='1';
 const webTest=!native&&!remoteTest&&debug&&params.get('webrelay')==='1';
 const transport=native?{label:'Android Native',start:m=>native.start(JSON.stringify(m)),stop:()=>native.stop(),send:(id,m)=>native.send(id,JSON.stringify(m))}:remoteTest?new RemoteTestTransport(event=>service?.receive(event)):webTest?new BrowserTestTransport(event=>service?.receive(event)):null;
 if(profile){service=new core.Discovery(profile,transport);window.panaderyaCoBaker=service;if(!remoteTest||transport.restore(profile.id))service.start()}
 window.addEventListener('co-baker-native',e=>{
  if(e.detail?.kind==='copy-details'){const status=document.getElementById('coBakerCopyStatus');if(status){status.textContent=e.detail.status==='copied'?'Copied!':'Could not copy. Try again.';setTimeout(()=>{if(status.isConnected)status.textContent=''},2500)}return;}
  try{service?.receive(e.detail)}catch(_){}
 });
 window.addEventListener('co-baker-resume',()=>service?.start());
 document.addEventListener('visibilitychange',()=>{if(webTest||remoteTest){if(!document.hidden)service?.coordinator?.resume();return;}if(document.hidden)service?.stop();else service?.start()});
 window.addEventListener('pagehide',()=>{if(webTest||remoteTest)service?.stop()});
 setInterval(()=>service?.expire(),1000);
 window.addEventListener('storage',e=>{if(e.key===core.KEY)try{profile=core.identity(localStorage);if(service){service.stop();service.profile=profile;service.start()}}catch(_){}});
 const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const oldSettings=openSettings;
 openSettings=function(){
  oldSettings();const body=document.querySelector('#modals .modalbody,#modals .popup-body');if(!body)return;
  const section=document.createElement('section');section.className='baker-profile';
  section.innerHTML=profile?`<form id="bakerProfileForm"><label for="bakerName">Baker Name <small>Baker Number: #${profile.number}</small></label><div><input id="bakerName" name="bakerName" maxlength="24" value="${escape(profile.name)}" autocomplete="off" required><button type="submit" class="secondary">Save name</button></div><p id="bakerProfileStatus" role="status"></p></form>`:'<p role="status">Player profile could not be saved. Solo play is available.</p>';
  body.prepend(section);
  if(service?.help){const option=document.createElement('div');option.className='cobaker-availability-setting';
   option.innerHTML=`<label for="coBakerAvailable"><input type="checkbox" id="coBakerAvailable" ${service.help.available?'checked':''}> Available to Help</label><small>Turn off to stop incoming help invitations.</small>`;
   section.append(option);option.querySelector('input').addEventListener('change',e=>service.help.setAvailable(e.target.checked));}

  section.querySelector('form')?.addEventListener('submit',e=>{e.preventDefault();const next={...profile,name:core.cleanName(section.querySelector('input').value)};try{localStorage.setItem(core.KEY,JSON.stringify(next));profile=Object.freeze(next);if(service){service.stop();service.profile=profile;service.start()}section.querySelector('input').value=profile.name;section.querySelector('[role=status]').textContent='Baker Name saved.'}catch(_){section.querySelector('[role=status]').textContent='Could not save. Please try again.'}});
  if(debug){const button=document.createElement('button');button.className='secondary';button.textContent='Co-Baker network test';button.onclick=openTest;body.querySelector('details')?.append(button)}
 };
 function paint(){const panel=document.getElementById('coBakerTest');if(!panel)return;const expanded=[...panel.querySelectorAll('details')].map(d=>d.open),focused=document.activeElement?.dataset?.peer;const peers=service?[...service.peers.values()].sort((a,b)=>a.id.localeCompare(b.id)):[];
  const remoteStatus=document.getElementById('coBakerRemoteStatus');
  if(remoteStatus&&!remoteStatus.dataset.validationError)remoteStatus.textContent=service?.error||(transport?.phase==='ready'?'Registered with remote relay'+(peers.length?` · ${peers.length} nearby Bakers.`:'. Waiting for other Bakers in this test group.'):transport?.active?'Connecting to remote test Bakers…':'');
  panel.innerHTML=`<h3>This Player</h3><p>${escape(profile?.name||'Unavailable')} #${profile?.number||'----'}</p><p role="status">${escape(service?.status||'unavailable')}${service?.status==='searching'&&!peers.length?' · No players found':''}</p><p>${escape(service?.error||'')}</p><h3>Nearby Bakers · ${peers.length}</h3><div class="co-baker-peers">${peers.map((p,i)=>`<div><span>${escape(p.name)} #${p.number}${peers.some(q=>q.id!==p.id&&q.name===p.name&&q.number===p.number)?` · nearby ${i+1}`:''}<small>${service?.help?.state(p.id).status||p.status}</small></span><button class="secondary" data-peer="${p.id}">Send test</button></div>`).join('')}</div><h3>Test messages</h3><ul>${(service?.messages||[]).map(m=>`<li>${escape(m.label)}: ${m.text}</li>`).join('')}</ul><details><summary>Debug identity</summary><code>${profile?.id||'Unavailable'}</code><p>Display identities are unverified. No game data is shared.</p></details>`;
  const c=service?.coordinator?.snapshot();
  if(c){const section=document.createElement('section');section.id='coBakerCoordinator';section.dataset.leader=c.leader?.id||'';section.dataset.role=c.role;section.dataset.status=c.status;section.dataset.term=String(c.term);
   section.innerHTML=`<h3>Coordinator Status</h3><p>Coordinator: ${c.profile?escape(c.profile.name)+' #'+c.profile.number:'None'}</p><p>My Role: ${c.role} &middot; Connected participants: ${c.participants}</p><p>Local coordinator status: ${c.status}${!peers.length?" (no remote peers discovered)":""}</p><details><summary>Coordinator debug details</summary><p>Term: ${c.term} &middot; Heartbeat age: ${Math.floor(c.heartbeatAge/1000)}s</p><code>${c.leader?escape(c.leader.id+' / '+c.leader.session):'No current coordinator'}</code><p>Advisory presence only; no game actions are authorized.</p></details>`;
   panel.querySelectorAll('h3')[1].before(section);
  }
  if(!peers.length){const note=document.createElement('p');note.textContent='No peers found: check router WLAN Partition / AP or client isolation and multicast filtering. Local coordinator health does not confirm discovery.';panel.appendChild(note)}
  const label=document.createElement('p');label.textContent='Transport: '+(transport?.label||'Unavailable');panel.prepend(label);
  if(native){const diagnostics=document.createElement('section');diagnostics.innerHTML='<h3>Native LAN diagnostics</h3>';const helpStatus=document.createElement('p');helpStatus.textContent='Call for Help: '+(window.panaderyaCoBakerHelpDiagnostic||'UI not initialized');diagnostics.appendChild(helpStatus);try{const values=JSON.parse(native.diagnostics());for(const [key,value]of Object.entries(values)){const row=document.createElement('p');row.textContent=key+': '+value;diagnostics.appendChild(row)}}catch(_){diagnostics.append('Native diagnostics unavailable: bridge call failed')}panel.appendChild(diagnostics)}
  panel.querySelectorAll('details').forEach((d,i)=>d.open=!!expanded[i]);if(focused)panel.querySelector(`[data-peer="${focused}"]`)?.focus({preventScroll:true});
  panel.querySelectorAll('[data-peer]').forEach(button=>button.onclick=()=>service.sendTest(button.dataset.peer));
 }
 function openTest(){
  const remoteSetup=remoteTest?`<form id="coBakerRemoteSetup" class="co-baker-remote-setup">
   <h3>Remote browser testing</h3>
   <p>Development only. Use the temporary tunnel address from your test organizer, not your GitHub Pages URL.</p>
   <label for="coBakerRelayUrl">Relay HTTPS/WSS address</label>
   <input id="coBakerRelayUrl" type="url" placeholder="https://example.trycloudflare.com" required autocomplete="off">
   <label for="coBakerTestGroup">Test group</label>
   <input id="coBakerTestGroup" maxlength="32" placeholder="our-class" required autocomplete="off">
   <label for="coBakerTestPassword">Shared testing password (12+ characters)</label>
   <input id="coBakerTestPassword" type="password" minlength="12" maxlength="128" required autocomplete="off">
   <button type="submit" class="secondary">Connect to test Bakers</button>
   <p id="coBakerRemoteStatus" role="status" aria-live="polite"></p>
  </form>`:'';
  showModal('Co-Baker · Network test',remoteSetup+'<div id="coBakerTest"></div>','co-baker-test');
  const form=document.getElementById('coBakerRemoteSetup');
  if(form){
   try{const saved=JSON.parse(sessionStorage.getItem('coBakerRemoteTestSettings')||'{}');form.querySelector('#coBakerRelayUrl').value=saved.url||'';form.querySelector('#coBakerTestGroup').value=saved.group||''}catch(_){}
   form.addEventListener('submit',e=>{e.preventDefault();
    const status=form.querySelector('#coBakerRemoteStatus');
    try{
     const config=transport.configure({url:form.querySelector('#coBakerRelayUrl').value,group:form.querySelector('#coBakerTestGroup').value,passphrase:form.querySelector('#coBakerTestPassword').value});
     try{sessionStorage.setItem('coBakerRemoteTestSettings',JSON.stringify(config))}catch(_){}
     delete status.dataset.validationError;
     if(service?.running&&transport.active&&!transport.configChanged){paint();return}
     service?.stop();service?.start();paint();
    }catch(error){status.dataset.validationError='true';status.textContent=String(error.message||error)}
   });
  }
  if(native&&debug){
   const tools=document.createElement('div'),copy=document.createElement('button'),status=document.createElement('span');
   copy.type='button';copy.className='secondary';copy.textContent='Copy Details';copy.id='coBakerCopyDetails';status.id='coBakerCopyStatus';status.setAttribute('role','status');
   tools.append(copy,status);document.getElementById('coBakerTest').before(tools);
   copy.onclick=()=>{const c=service?.coordinator?.snapshot();try{native.copyDetails(JSON.stringify({Transport:transport.label,Status:service?.status||'unavailable','Nearby Bakers':service?.peers.size||0,'Connected participants':c?.participants||0,'Coordinator role':c?.role||'Unavailable','Coordinator status':c?.status||'Unavailable','Call for Help':window.panaderyaCoBakerHelpDiagnostic||'Not initialized','Transport error':native?service?.error||'':''}));}catch(_){status.textContent='Could not copy. Try again.'}};
   const panel=document.getElementById('coBakerTest'),form=document.createElement('form');
   form.id='coBakerDirectProbe';
   form.innerHTML='<details><summary>Debug direct TCP probe (optional)</summary><p>Reachability check only. Use the other device�s displayed IPv4 and listener port. Students do not need this.</p><label for="coBakerProbeIp">Peer IPv4</label><input id="coBakerProbeIp" inputmode="decimal" required placeholder="192.168.88.2"><label for="coBakerProbePort">Peer listening port</label><input id="coBakerProbePort" type="number" min="1" max="65535" required><button type="submit" class="secondary">Probe TCP</button></details>';
   panel.after(form);
   form.addEventListener('submit',e=>{e.preventDefault();native.probe(form.querySelector('#coBakerProbeIp').value.trim(),Number(form.querySelector('#coBakerProbePort').value));});
  }
  paint();
 }
 function reconnectControl(){
  const header=document.querySelector('.worksheet-modern .worksheet-header-actions');if(!header||!remoteTest)return;
  let button=document.getElementById('coBakerReconnect');
  if(!button){button=document.createElement('button');button.id='coBakerReconnect';button.className='secondary';button.textContent='Reconnect';button.onclick=openTest;header.appendChild(button)}
  button.hidden=!!transport.active&&transport.phase==='ready';
 }
 service?.observe(()=>{paint();reconnectControl()});
})();

/* Phase 2 invitation UI: injected into the existing worksheet header only.
 * The worksheet iframe and bakery save are deliberately untouched. */
(function(){
 'use strict';
 const get=()=>window.panaderyaCoBaker?.help;
 const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let search='',lastList='';
 function name(id){const peer=window.panaderyaCoBaker?.peers.get(id);return peer?`${peer.name} #${peer.number}`:'Baker'}
 function sheetActive(){return !!(typeof g!=='undefined'&&g?.run&&g.run.phase==='engine'&&!g.run.paused&&!g.run.procedureComplete)}
 function renderHelp(){const help=get(),container=document.getElementById('coBakerHelpBody');if(!container||!help)return;
  const peers=[...window.panaderyaCoBaker.peers.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.number.localeCompare(b.number));
  const filtered=peers.filter(p=>(p.name+' '+p.number).toLowerCase().includes(search.toLowerCase()));
  const active=help.active,request=help.outgoing;
  const markup=active?`<div class="cobaker-help-connection"><strong>${active.lostAt?'Your Co-Baker is reconnecting...':'Connected with '+escape(name(active.otherId))}</strong><p>Your helper can watch this worksheet read-only. Keep solving your order.</p><button class="secondary" data-help-action="end">End help</button></div>`:
   request?`<div class="cobaker-help-connection"><strong>Calling nearby Bakers…</strong><p>${request.declined.size} declined · ${Math.max(0,request.recipients.size-request.declined.size)} awaiting responses</p><button class="secondary" data-help-action="cancel">Cancel request</button></div>`:
   `<button class="primary cobaker-call-all" data-help-action="all" ${!peers.some(p=>help.eligible(p.id))?'disabled':''}>📣 Call All</button>
   <p class="cobaker-help-subtitle">Ask an available Baker for help with this order!</p>
   <label class="cobaker-search-label" for="coBakerHelpSearch">Find a Baker</label>
   <input id="coBakerHelpSearch" type="search" placeholder="Search name or number" value="${escape(search)}" maxlength="28" autocomplete="off">
   <div class="cobaker-help-list">${filtered.length?filtered.map(p=>{const st=help.state(p.id).status;return `<div class="cobaker-help-peer"><span><strong>${escape(p.name)} #${p.number}</strong><small>${escape(st)}</small></span><button class="secondary" data-help-to="${p.id}" ${help.eligible(p.id)?'':'disabled'}>Call</button></div>`}).join(''):(peers.length?'No Bakers match your search.':'No Bakers nearby yet!')}</div>`;
  const status=window.panaderyaCoBaker?.status;
  const result=`<p class="cobaker-connection-count">${peers.length} Baker${peers.length===1?'':'s'} nearby${status==='unavailable'||status==='disconnected'?' · Co-Baker unavailable':''}</p>${markup}<p class="cobaker-help-message" role="status">${escape(help.log[0]?.message||'')}</p>`;
  if(result===lastList&&container.dataset.rendered==='true')return;
  const focused=document.activeElement?.id==='coBakerHelpSearch',selection=document.activeElement?.selectionStart||0;
  lastList=result;container.innerHTML=result;container.dataset.rendered='true';
  if(focused){const field=container.querySelector('#coBakerHelpSearch');field?.focus({preventScroll:true});try{field?.setSelectionRange(selection,selection)}catch(_){}}
 }
 function notices(){const help=get();if(!help)return;let holder=document.getElementById('coBakerInvitations');
  if(!holder){holder=document.createElement('aside');holder.id='coBakerInvitations';holder.setAttribute('aria-label','Co-Baker invitations');document.body.appendChild(holder)}
  const invitations=[...help.incoming.values()].filter(invite=>invite.expiresAt>Date.now()&&!help.active);
  const currently=help.accepting;
  const active=help.active;
  const header=document.querySelector('.worksheet-modern .worksheet-header-actions');
  if(header){let status=document.getElementById('coBakerConnectionStatus');if(!status){status=document.createElement('small');status.id='coBakerConnectionStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');header.appendChild(status)}
   const note=help.log[0],recent=note&&help.clock()-note.at<4000?note.message:'';
   status.textContent=active?.role==='Learner'?(active.lostAt?'Your Co-Baker is reconnecting...':recent==='Connected again!'?recent:'Co-Baker connected'):/Your Co-Baker left/.test(recent)?recent:window.panaderyaCoBaker.transport&&['unavailable','disconnected'].includes(window.panaderyaCoBaker.status)?'Co-Baker offline. You can keep practicing!':'';
  }
  const markup=(currently?`<div class="cobaker-invite"><strong>Waiting for ${escape(name(currently.ownerId))}…</strong><small>You can continue playing.</small></div>`:'')+
   (active&&!(active.role==='Learner'&&header)&&!document.getElementById('coBakerObservation')?`<div class="cobaker-invite"><strong>Co-Baker: ${escape(name(active.otherId))}</strong><small>${active.lostAt?'Your Co-Baker is reconnecting...':active.role==='Helper'?'Connected as helper · Read-only worksheet':'Connected · Keep practicing!'}</small>${active.role==='Helper'?'<button data-help-watch="1">Watch worksheet</button>':''}<button data-help-end="1">End help</button></div>`:'')+
   invitations.slice(0,3).map(i=>`<div class="cobaker-invite"><strong>${escape(name(i.ownerId))} needs help!</strong><div class="cobaker-invite-actions"><button data-help-accept="${i.requestId}" ${currently||help.isBusy()?'disabled':''}>Help</button><button data-help-decline="${i.requestId}" class="secondary">Not Now</button></div></div>`).join('');
  if(holder.coBakerMarkup!==markup){holder.coBakerMarkup=markup;holder.innerHTML=markup}
  holder.hidden=!holder.childElementCount;
 }
 window.panaderyaCoBakerHelpDiagnostic='Handler ready; no tap yet';
 document.addEventListener('pointerdown',e=>{if(e.target.closest?.('.cobaker-help-button'))window.panaderyaCoBakerHelpDiagnostic='Pointer reached button; awaiting click'},true);
 function open(){
  window.panaderyaCoBakerHelpDiagnostic='Click handler entered';
  try{
   const unavailable=!get()?'Co-Baker is unavailable. You can keep practicing. Try reopening the app.':!sheetActive()?'Open or resume an unfinished order to call a Co-Baker.':'';
   search='';lastList='';
   showModal('Call for Help',unavailable?`<p role="status">${unavailable}</p>`:'<div id="coBakerHelpBody" class="cobaker-help-body"></div>','cobaker-help-modal');
   if(!unavailable)renderHelp();
   window.panaderyaCoBakerHelpDiagnostic=unavailable?'Feedback opened: '+unavailable:'Help popup rendered';
  }catch(error){
   window.panaderyaCoBakerHelpDiagnostic='Handler error: '+String(error?.message||error).slice(0,200);
   if(typeof toast==='function')toast('Could not open Co-Baker help. Please try again.');
  }
 }
 function action(e){const target=e.target.closest?.('button,input');if(!target)return;
  const help=get();if(!help)return;
  if(target.id==='coBakerHelpSearch')return;
  if(target.dataset.helpTo){const outcome=help.request([target.dataset.helpTo]);if(!outcome.ok)help.note(outcome.error);}
  if(target.dataset.helpAction==='all'){const outcome=help.request([...window.panaderyaCoBaker.peers.keys()]);if(!outcome.ok)help.note(outcome.error)}
  if(target.dataset.helpAction==='cancel')help.cancel();
  if(target.dataset.helpAction==='end'||target.dataset.helpEnd)help.end();
  if(target.dataset.helpWatch)window.openCoBakerObservation?.();
  if(target.dataset.helpAccept)help.accept(target.dataset.helpAccept);
  if(target.dataset.helpDecline)help.decline(target.dataset.helpDecline);
  renderHelp();notices();
 }
 document.addEventListener('click',e=>{if(e.target.closest?.('#coBakerHelpBody,#coBakerInvitations'))action(e)});
 document.addEventListener('input',e=>{if(e.target.id==='coBakerHelpSearch'){search=e.target.value;lastList='';renderHelp()}});
 window.openCoBakerHelp=open;
 const prior=renderWorksheet;
 renderWorksheet=function(...args){let html=prior.apply(this,args);
  if(html.includes('worksheet-modern')&&html.includes('<div class="worksheet-header-actions">'))html=html.replace('<div class="worksheet-header-actions">','<div class="worksheet-header-actions"><button type="button" class="illustrated-worksheet-button cobaker-help-button" onclick="openCoBakerHelp()">Call for Help</button>');
  return html;
 };
 // Existing UI service is module-local, so expose only the narrow read-only
 // discovery reference needed by these new UI controls.
 const existingHeader=document.querySelector('.worksheet-modern .worksheet-header-actions');
 if(existingHeader&&!existingHeader.querySelector('.cobaker-help-button'))existingHeader.insertAdjacentHTML('afterbegin','<button type="button" class="illustrated-worksheet-button cobaker-help-button" onclick="openCoBakerHelp()">Call for Help</button>');
 const current=window.panaderyaCoBaker;
 if(current?.help){current.help.worksheet=()=>sheetActive()||!!(current.help.active?.role==='Learner'&&!current.help.active.lostAt&&typeof g!=='undefined'&&g.run?.phase==='engine'&&!g.run.paused&&g.run.procedureComplete);current.help.observe(()=>{renderHelp();notices()});current.observe(()=>{renderHelp();notices()})}
})();
