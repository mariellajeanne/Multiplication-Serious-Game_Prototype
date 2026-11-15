(function(){
 'use strict';
 const core=CoBakerCore,debug=new URLSearchParams(location.search).get('cobaker')==='debug';
 let profile,service;
 try{profile=core.identity(localStorage)}catch(_){/* Solo play never depends on profile storage. */}
 const native=window.PanaderyaLan;
 const webTest=!native&&debug&&new URLSearchParams(location.search).get('webrelay')==='1';
 const transport=native?{label:'Android Native',start:m=>native.start(JSON.stringify(m)),stop:()=>native.stop(),send:(id,m)=>native.send(id,JSON.stringify(m))}:webTest?new BrowserTestTransport(event=>service?.receive(event)):null;
 if(profile){service=new core.Discovery(profile,transport);service.start()}
 window.addEventListener('co-baker-native',e=>{try{service?.receive(e.detail)}catch(_){}});
 window.addEventListener('co-baker-resume',()=>service?.start());
 document.addEventListener('visibilitychange',()=>{if(webTest){if(!document.hidden)service?.coordinator?.resume();return;}if(document.hidden)service?.stop();else service?.start()});
 window.addEventListener('pagehide',()=>{if(webTest)service?.stop()});
 setInterval(()=>service?.expire(),1000);
 window.addEventListener('storage',e=>{if(e.key===core.KEY)try{profile=core.identity(localStorage);if(service){service.stop();service.profile=profile;service.start()}}catch(_){}});
 const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const oldSettings=openSettings;
 openSettings=function(){
  oldSettings();const body=document.querySelector('#modals .modalbody,#modals .popup-body');if(!body)return;
  const section=document.createElement('section');section.className='baker-profile';
  section.innerHTML=profile?`<form id="bakerProfileForm"><label for="bakerName">Baker Name <small>Baker Number: #${profile.number}</small></label><div><input id="bakerName" name="bakerName" maxlength="24" value="${escape(profile.name)}" autocomplete="off" required><button type="submit" class="secondary">Save name</button></div><p id="bakerProfileStatus" role="status"></p></form>`:'<p role="status">Player profile could not be saved. Solo play is available.</p>';
  body.prepend(section);
  section.querySelector('form')?.addEventListener('submit',e=>{e.preventDefault();const next={...profile,name:core.cleanName(section.querySelector('input').value)};try{localStorage.setItem(core.KEY,JSON.stringify(next));profile=Object.freeze(next);if(service){service.stop();service.profile=profile;service.start()}section.querySelector('input').value=profile.name;section.querySelector('[role=status]').textContent='Baker Name saved.'}catch(_){section.querySelector('[role=status]').textContent='Could not save. Please try again.'}});
  if(debug){const button=document.createElement('button');button.className='secondary';button.textContent='Co-Baker network test';button.onclick=openTest;body.querySelector('details')?.append(button)}
 };
 function paint(){const panel=document.getElementById('coBakerTest');if(!panel)return;const expanded=[...panel.querySelectorAll('details')].map(d=>d.open),focused=document.activeElement?.dataset?.peer;const peers=service?[...service.peers.values()].sort((a,b)=>a.id.localeCompare(b.id)):[];
  panel.innerHTML=`<h3>This Player</h3><p>${escape(profile?.name||'Unavailable')} #${profile?.number||'----'}</p><p role="status">${escape(service?.status||'unavailable')}${service?.status==='searching'&&!peers.length?' · No players found':''}</p><p>${escape(service?.error||'')}</p><h3>Nearby Bakers · ${peers.length}</h3><div class="co-baker-peers">${peers.map((p,i)=>`<div><span>${escape(p.name)} #${p.number}${peers.some(q=>q.id!==p.id&&q.name===p.name&&q.number===p.number)?` · nearby ${i+1}`:''}<small>${p.status}</small></span><button class="secondary" data-peer="${p.id}">Send test</button></div>`).join('')}</div><h3>Test messages</h3><ul>${(service?.messages||[]).map(m=>`<li>${escape(m.label)}: ${m.text}</li>`).join('')}</ul><details><summary>Debug identity</summary><code>${profile?.id||'Unavailable'}</code><p>Display identities are unverified. No game data is shared.</p></details>`;
  const c=service?.coordinator?.snapshot();
  if(c){const section=document.createElement('section');section.id='coBakerCoordinator';section.dataset.leader=c.leader?.id||'';section.dataset.role=c.role;section.dataset.status=c.status;section.dataset.term=String(c.term);
   section.innerHTML=`<h3>Coordinator Status</h3><p>Coordinator: ${c.profile?escape(c.profile.name)+' #'+c.profile.number:'None'}</p><p>My Role: ${c.role} &middot; Connected participants: ${c.participants}</p><p>Status: ${c.status}</p><details><summary>Coordinator debug details</summary><p>Term: ${c.term} &middot; Heartbeat age: ${Math.floor(c.heartbeatAge/1000)}s</p><code>${c.leader?escape(c.leader.id+' / '+c.leader.session):'No current coordinator'}</code><p>Advisory presence only; no game actions are authorized.</p></details>`;
   panel.querySelectorAll('h3')[1].before(section);
  }
  const label=document.createElement('p');label.textContent='Transport: '+(transport?.label||'Unavailable');panel.prepend(label);
  panel.querySelectorAll('details').forEach((d,i)=>d.open=!!expanded[i]);if(focused)panel.querySelector(`[data-peer="${focused}"]`)?.focus({preventScroll:true});
  panel.querySelectorAll('[data-peer]').forEach(button=>button.onclick=()=>service.sendTest(button.dataset.peer));
 }
 function openTest(){showModal('Co-Baker · Network test','<div id="coBakerTest"></div>','co-baker-test');paint()}
 service?.observe(paint);
})();

