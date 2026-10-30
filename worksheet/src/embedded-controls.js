'use strict';

window.addEventListener('message',function(ev){
const m=ev.data;if(!m||m.source!=='bc-shell')return;
if(m.type==='tutorial'){
  const b=document.getElementById('tutorialToggle');
  if(b && (b.getAttribute('aria-pressed')==='true')!==!!m.enabled)b.click();
}
});
