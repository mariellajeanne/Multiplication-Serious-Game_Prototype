(function(){
 'use strict';
 const core=CoBakerCore,debug=new URLSearchParams(location.search).get('cobaker')==='debug';
 let profile,service;
 try{profile=core.identity(localStorage)}catch(_){/* Solo play never depends on profile storage. */}
 let native=window.PanaderyaLan;
 const lan=window.PanaderyaLan,nearby=window.PanaderyaNearby,params=new URLSearchParams(location.search);
 const remoteTest=!native&&debug&&params.get('remoteRelay')==='1';
 const webTest=!native&&!remoteTest&&debug&&params.get('webrelay')==='1';
 let transport=native?{label:'Android Native LAN',start:m=>lan.start(JSON.stringify(m)),stop:()=>lan.stop(),send:(id,m)=>lan.send(id,JSON.stringify(m))}:remoteTest?new RemoteTestTransport(event=>service?.receive(event)):webTest?new BrowserTestTransport(event=>service?.receive(event)):null;
 function selectTransport(value){
  if(!debug||!lan||!nearby||service?.help?.isBusy())return false;
  service?.stop();service?.candidates.clear();
  native=value==='nearby'?nearby:lan;
  transport=value==='nearby'?new NearbyTransport(nearby,event=>service?.receive(event)):{label:'Android Native LAN',start:m=>lan.start(JSON.stringify(m)),stop:()=>lan.stop(),send:(id,m)=>lan.send(id,JSON.stringify(m))};
  if(service){service.transport=transport;service.start()}
  try{localStorage.setItem('panaderyaDebugTransport',value)}catch(_){}return true;
 }
 if(profile){service=new core.Discovery(profile,transport);window.panaderyaCoBaker=service;if(!remoteTest||transport.restore(profile.id))service.start()}
 window.addEventListener('co-baker-native',e=>{
  if(e.detail?.kind==='copy-details'){const status=document.getElementById('coBakerCopyStatus');if(status){status.textContent=e.detail.status==='copied'?'Copied!':'Could not copy. Try again.';setTimeout(()=>{if(status.isConnected)status.textContent=''},2500)}return;}
  if(native===lan)try{service?.receive(e.detail)}catch(_){}
 });
 window.addEventListener('co-baker-nearby',e=>{if(native!==nearby)return;if(e.detail?.kind==='copy-details'){const status=document.getElementById('coBakerCopyStatus');if(status){status.textContent=e.detail.status==='copied'?'Copied!':'Could not copy. Try again.';setTimeout(()=>{if(status.isConnected)status.textContent=''},2500)}return}transport?.event?.(e.detail)});
 if(debug&&nearby)try{if(localStorage.getItem('panaderyaDebugTransport')==='nearby')selectTransport('nearby')}catch(_){}
 window.addEventListener('co-baker-resume',()=>service?.start());
 document.addEventListener('visibilitychange',()=>{if(webTest||remoteTest){if(!document.hidden)service?.coordinator?.resume();return;}if(document.hidden)service?.stop();else service?.start()});
 window.addEventListener('pagehide',()=>{if(webTest||remoteTest)service?.stop()});
 setInterval(()=>{service?.expire();transport?.maintain?.(service)},1000);
 window.addEventListener('storage',e=>{if(e.key===core.KEY)try{profile=core.identity(localStorage);if(service){service.stop();service.profile=profile;service.start()}}catch(_){}});
 const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const oldSettings=openSettings;
 openSettings=function(){
  oldSettings();const body=document.querySelector('#modals .modalbody,#modals .popup-body');if(!body)return;
  const section=document.createElement('section');section.className='baker-profile';
  section.innerHTML=profile?`<form id="bakerProfileForm"><label for="bakerName">Baker Name</label><div class="baker-profile-edit"><input id="bakerName" name="bakerName" aria-label="Baker Name" maxlength="24" value="${escape(profile.name)}" autocomplete="off" required><span class="baker-number-prefix" aria-label="Baker Number ${escape(profile.number)}" title="Baker Number (read only)">#${escape(profile.number)}</span></div><button type="submit" class="secondary baker-save-name">Save Name</button><p id="bakerProfileStatus" role="status"></p></form>`:'<p role="status">Player profile could not be saved. Solo play is available.</p>';
  body.prepend(section);
  if(service?.help){const help=service.help,prefs=help.preferences,option=document.createElement('section');option.className='cobaker-availability-setting';
   const row=(key,label,nested=false)=>`<label class="${nested?'cobaker-mute-nested':''}"><input type="checkbox" data-help-mute="${key}" ${prefs?.mutes[key]?'checked':''}>${label}</label>`;
   option.innerHTML=`<h3>Help Notifications</h3><div class="cobaker-mute-parent">${row('dnd','Do Not Disturb')}</div><p class="cobaker-mute-explanation">Mute helper requests while…</p><div class="cobaker-mute-section">${row('bakery','In My Bakery')}</div><div class="cobaker-mute-section">${row('worksheet','In Any Worksheet')}<div class="cobaker-mute-children">${row('solo','Solving On My Own',true)}${row('assisted','Being Helped',true)}${row('helping','Helping Another Baker',true)}</div></div>`;
   const advanced=document.createElement('section');advanced.className='cobaker-settings-connection';advanced.innerHTML=`<h3>Co-Baker / Network</h3><b>Co-Baker · ${help.status()}</b><small>${escape(transport?.label||'Android app needed for nearby play')} · ${escape(service.status)}</small><button type="button" class="secondary" onclick="openCoBakerHelp(true)">Find Bakers</button>`;
   const update=()=>{for(const input of option.querySelectorAll('[data-help-mute]')){const key=input.dataset.helpMute;input.disabled=key!=='dnd'&&!!prefs?.mutes.dnd||['solo','assisted','helping'].includes(key)&&!!prefs?.mutes.worksheet;input.checked=!!prefs?.mutes[key]}};
   (body.querySelector('#hubHelpSettings')||section).append(option);(body.querySelector('#coBakerAdvanced')||body.querySelector('details.adult-tools')||section).append(advanced);
   update();option.addEventListener('change',e=>{const key=e.target.dataset.helpMute;if(!key)return;if(!prefs?.set(key,e.target.checked)){toast('Could not save. Please try again.');update();return}help.refreshAvailability();help.changed();update();advanced.querySelector('b').textContent='Co-Baker · '+help.status()});}

  section.querySelector('form')?.addEventListener('submit',e=>{e.preventDefault();const next={...profile,name:core.cleanName(section.querySelector('input').value)};try{localStorage.setItem(core.KEY,JSON.stringify(next));profile=Object.freeze(next);if(service){service.stop();service.profile=profile;service.start()}section.querySelector('input').value=profile.name;section.querySelector('[role=status]').textContent='Baker Name saved.'}catch(_){section.querySelector('[role=status]').textContent='Could not save. Please try again.'}});
  if(debug){const button=document.createElement('button');button.className='secondary';button.textContent='Co-Baker network test';button.onclick=openTest;(body.querySelector('#coBakerAdvanced')||body.querySelector('details'))?.append(button)}
 };
 function paint(){const panel=document.getElementById('coBakerTest');if(!panel)return;const expanded=[...panel.querySelectorAll('details')].map(d=>d.open),focused=document.activeElement?.dataset?.peer;const peers=service?[...new Map([...service.candidates,...service.peers]).values()].sort((a,b)=>a.id.localeCompare(b.id)):[];
  const remoteStatus=document.getElementById('coBakerRemoteStatus');
  if(remoteStatus&&!remoteStatus.dataset.validationError)remoteStatus.textContent=service?.error||(transport?.phase==='ready'?'Registered with remote relay'+(peers.length?` · ${peers.length} nearby Bakers.`:'. Waiting for other Bakers in this test group.'):transport?.active?'Connecting to remote test Bakers…':'');
  panel.innerHTML=`<h3>This Player</h3><p>${escape(profile?.name||'Unavailable')} #${profile?.number||'----'}</p><p role="status">${escape(service?.status||'unavailable')}${service?.status==='searching'&&!peers.length?' · No players found':''}</p><p>${escape(service?.error||'')}</p><h3>Nearby Bakers · ${peers.length}</h3><div class="co-baker-peers">${peers.map((p,i)=>`<div><span>${escape(p.name)} #${p.number}${peers.some(q=>q.id!==p.id&&q.name===p.name&&q.number===p.number)?` · nearby ${i+1}`:''}<small>${service?.help?.state(p.id).status||p.status}</small></span><button class="secondary" data-peer="${p.id}">Send test</button></div>`).join('')}</div><h3>Test messages</h3><ul>${(service?.messages||[]).map(m=>`<li>${escape(m.label)}: ${m.text}</li>`).join('')}</ul><details><summary>Debug identity</summary><code>${profile?.id||'Unavailable'}</code><p>Display identities are unverified. No game data is shared.</p></details>`;
  const c=service?.coordinator?.snapshot();
  if(c){const section=document.createElement('section');section.id='coBakerCoordinator';section.dataset.leader=c.leader?.id||'';section.dataset.role=c.role;section.dataset.status=c.status;section.dataset.term=String(c.term);
   section.innerHTML=`<h3>Coordinator Status</h3><p>Coordinator: ${c.profile?escape(c.profile.name)+' #'+c.profile.number:'None'}</p><p>My Role: ${c.role} &middot; Connected participants: ${c.participants}</p><p>Local coordinator status: ${c.status}${!peers.length?" (no remote peers discovered)":""}</p><details><summary>Coordinator debug details</summary><p>Term: ${c.term} &middot; Heartbeat age: ${Math.floor(c.heartbeatAge/1000)}s</p><code>${c.leader?escape(c.leader.id+' / '+c.leader.session):'No current coordinator'}</code><p>Advisory presence only; no game actions are authorized.</p></details>`;
   panel.querySelectorAll('h3')[1].before(section);
  }
  if(!peers.length){const note=document.createElement('p');note.textContent=transport?.sparse?'Tap Find Bakers on this tablet. Check Bluetooth, Wi-Fi, permissions and Google Play services. Compare connection codes on both tablets.':'No peers found: check router WLAN Partition / AP or client isolation and multicast filtering. Local coordinator health does not confirm discovery.';panel.appendChild(note)}
  const label=document.createElement('p');label.textContent='Transport: '+(transport?.label||'Unavailable');panel.prepend(label);
  if(native){const diagnostics=document.createElement('section');diagnostics.innerHTML='<h3>'+ (transport?.sparse?'Nearby diagnostics':'Native LAN diagnostics')+'</h3>';const helpStatus=document.createElement('p');helpStatus.textContent='Call for Help: '+(window.panaderyaCoBakerHelpDiagnostic||'UI not initialized');diagnostics.appendChild(helpStatus);try{const values=JSON.parse(native.diagnostics());for(const [key,value]of Object.entries(values)){const row=document.createElement('p');row.textContent=key+': '+(typeof value==='object'?JSON.stringify(value):value);diagnostics.appendChild(row)}}catch(_){diagnostics.append('Native diagnostics unavailable: bridge call failed')}panel.appendChild(diagnostics)}
  panel.querySelectorAll('details').forEach((d,i)=>d.open=!!expanded[i]);if(focused)panel.querySelector(`[data-peer="${focused}"]`)?.focus({preventScroll:true});
  panel.querySelectorAll('[data-peer]').forEach(button=>button.onclick=async()=>{if(transport?.sparse&&!service.peers.has(button.dataset.peer)){button.disabled=true;button.textContent='Confirm codes…';if(!await transport.connect(button.dataset.peer)){button.textContent='Try again';button.disabled=false;return}}service.sendTest(button.dataset.peer)});
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
  if(debug&&nearby){const choice=document.createElement('label');choice.textContent='Debug transport ';const select=document.createElement('select');select.id='coBakerTransport';select.innerHTML='<option value="lan">Android Native LAN</option><option value="nearby">Nearby Connections (Experimental)</option>';select.value=transport.sparse?'nearby':'lan';select.disabled=!!service?.help?.isBusy();select.onchange=()=>{selectTransport(select.value);openTest()};choice.appendChild(select);document.getElementById('coBakerTest').before(choice);
   const scan=document.createElement('button');scan.textContent='Find Bakers';scan.onclick=()=>transport.scan?.();choice.appendChild(scan);const retry=document.createElement('button');retry.textContent='Retry connection';retry.disabled=!!service?.help?.isBusy();retry.onclick=()=>{service.stop();service.start()};choice.appendChild(retry);}
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
   copy.onclick=()=>{const c=service?.coordinator?.snapshot();try{native.copyDetails(JSON.stringify({Transport:transport.label,Status:service?.status||'unavailable',Availability:service?.help?.status()||'Unavailable','Nearby Bakers':service?.candidates.size||service?.peers.size||0,'Connected participants':c?.participants||0,'Coordinator role':c?.role||'Unavailable','Coordinator status':c?.status||'Unavailable','Help session':service?.help?.active?(service.help.active.lostAt?'Reconnecting':service.help.active.role):'None','Protocol/build':'Co-Baker 8 / find-helpers-2','Call for Help':window.panaderyaCoBakerHelpDiagnostic||'Not initialized','Incoming help requests':service?.help?.incoming.size||0,'Outgoing invitation states':[...service?.help?.calls.values()||[]].map(call=>({state:call.state,source:call.source,waiting:call.waiting})), 'Recent help feedback':service?.help?.log[0]?.message||'None','Help mute switches':service?.help?.preferences?.mutes||{},'Invitation tray visible':!!document.getElementById('coBakerInvitations')&&!document.getElementById('coBakerInvitations').hidden,'Transport error':native?service?.error||'':''}));}catch(_){status.textContent='Could not copy. Try again.'}};
   if(native===lan){
   const panel=document.getElementById('coBakerTest'),form=document.createElement('form');
   form.id='coBakerDirectProbe';
   form.innerHTML='<details><summary>Debug direct TCP probe (optional)</summary><p>Reachability check only. Use the other device’s displayed IPv4 and listener port. Students do not need this.</p><label for="coBakerProbeIp">Peer IPv4</label><input id="coBakerProbeIp" inputmode="decimal" required placeholder="192.168.88.2"><label for="coBakerProbePort">Peer listening port</label><input id="coBakerProbePort" type="number" min="1" max="65535" required><button type="submit" class="secondary">Probe TCP</button></details>';
   panel.after(form);
   form.addEventListener('submit',e=>{e.preventDefault();native.probe(form.querySelector('#coBakerProbeIp').value.trim(),Number(form.querySelector('#coBakerProbePort').value));});
   }
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
