'use strict';
function playMultiplyStamp(){if(!sound)return;try{
 context??=new(window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended')context.resume();
 const t=context.currentTime;for(const [hz,delay] of [[520,0],[775,.057]]){
 const o=context.createOscillator(),g=context.createGain();o.type='sine';o.frequency.value=hz;
 g.gain.setValueAtTime(.0001,t+delay);g.gain.exponentialRampToValueAtTime(.027,t+delay+.012);
 g.gain.exponentialRampToValueAtTime(.0001,t+delay+.15);o.connect(g);g.connect(context.destination);o.start(t+delay);o.stop(t+delay+.16);
 }}catch(e){}
}
function clearMultiplyFx(){const layer=$('multiplicationFx');if(layer){layer.innerHTML='';layer.classList.remove('active')}const f=$('floating');if(f){f.classList.remove('multiply-running');f.removeAttribute('data-fx-mode');f.querySelectorAll('.fx-typeon').forEach(e=>e.remove())}document.querySelectorAll('.fx-source').forEach(e=>e.remove())}
function fxPosition(){const layer=$('multiplicationFx'),float=$('floating'),sheet=$('sheet');if(!layer||!float||!sheet)return;
 const f=float.getBoundingClientRect(),r=sheet.getBoundingClientRect();
 if(layer.classList.contains('array')){
   // Put the demonstration beside the live floating product, so the counting stays
   // visible in the actual digit tiles rather than being obscured by the circle grid.
   const lw=layer.offsetWidth,lh=layer.offsetHeight;
   const toLeft=f.left-r.left-18-lw/2;
   const toRight=f.right-r.left+18+lw/2;
   const placeRight=toLeft<lw/2+8 && toRight+lw/2<r.width-8;
   const cx=placeRight?toRight:Math.max(lw/2+8,toLeft);
   layer.style.left=cx+'px';
   layer.style.top=Math.max(lh/2+8,Math.min(r.height-lh/2-8,f.top+f.height/2-r.top))+'px';
   return;
 }
 // All other effects share the same anchor as the floating product.
 const ones=float.querySelector('[data-part="ones"]');const anchor=ones?.getBoundingClientRect();
 layer.style.left=((anchor?anchor.left+anchor.width/2:f.left+f.width/2)-r.left)+'px';
 layer.style.top=(f.top+f.height/2-r.top)+'px';
}
function showMultiplyFx(html,kind=''){const layer=$('multiplicationFx');layer.className='multiplication-fx active '+kind;layer.innerHTML=html;fxPosition();}
function pauseMultiply(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function pauseArray(ms){return pauseMultiply(ms/arraySpeed)}
function flyOperand(el,end,duration=240,delay=0){if(!el)return Promise.resolve();const r=el.getBoundingClientRect(),sheet=$('sheet').getBoundingClientRect();
 const clone=document.createElement('span');clone.className='fx-source';clone.textContent=el.textContent;clone.style.left=(r.left-sheet.left)+'px';clone.style.top=(r.top-sheet.top)+'px';clone.style.width=r.width+'px';clone.style.height=r.height+'px';$('sheet').append(clone);
 const x=end.x-(r.left+r.width/2-sheet.left),y=end.y-(r.top+r.height/2-sheet.top);
 const motion=clone.animate([{transform:'translate(0,0) scale(1)',opacity:1},{offset:.7,transform:`translate(${x*.72}px,${y*.72}px) scale(.83)`,opacity:.96},{transform:`translate(${x}px,${y}px) scale(.55)`,opacity:0}],{duration,delay,fill:'forwards',easing:'cubic-bezier(.32,.05,.18,1)'});
 return motion.finished.catch(()=>{}).then(()=>clone.remove());}
function pulseFloatTiles(){const tiles=[...document.querySelectorAll('#floating .ftile')];tiles.forEach(t=>{t.classList.remove('count-reveal');void t.offsetWidth;t.classList.add('count-reveal')})}
function setArrayCount(n){
 const f=$('floating'),left=f.querySelector('[data-part="tens"]'),right=f.querySelector('[data-part="ones"]');
 if(!right)return;
 right.textContent=n?String(n%10):'';
 if(left){left.textContent=n>=10?String(Math.floor(n/10)):'';left.style.visibility=n>=10?'visible':'hidden'}
 const chip=Q('#multiplicationFx .fx-array-count');if(chip)chip.textContent=n?`Total: ${n}`:'Total: —';
 for(const tile of [left,right])if(tile){tile.classList.remove('fx-count-new');void tile.offsetWidth;tile.classList.add('fx-count-new')}
}
function buildArrayFx(cols,rows){
 const compact=Math.max(cols,rows)>6;
 let cells='<span class="blank"></span>';
 for(let c=1;c<=cols;c++)cells+=`<span class="fx-array-top" data-col="${c}">${c}</span>`;
 for(let r=1;r<=rows;r++){
   cells+=`<span class="fx-array-side" data-row-label="${r}">${r}</span>`;
   for(let c=1;c<=cols;c++)cells+=`<i class="fx-array-dot" data-r="${r}" data-c="${c}" aria-hidden="true"></i>`;
 }
 return `<div class="fx-array-wrap"><div class="fx-array-caption">${cols} × ${rows}</div><div class="fx-array-board" style="--dot-columns:${cols};--array-size:${compact?'14px':'19px'};--array-gap:${compact?'5px':'9px'}">${cells}</div><div class="fx-array-count">Total: —</div></div>`;
}
function playArrayTick(group=false){
 if(!sound)return;
 try{context??=new(window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended')context.resume();
 const t=context.currentTime,o=context.createOscillator(),g=context.createGain();o.type='sine';o.frequency.value=group?600:455;
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(group?.022:.012,t+.012);
 g.gain.exponentialRampToValueAtTime(.0001,t+.085);o.connect(g);g.connect(context.destination);o.start(t);o.stop(t+.095)}catch(e){}
}
async function animateArray(cols,rows,valid){
 showMultiplyFx(buildArrayFx(cols,rows),'array');
 $('multiplicationFx').style.setProperty('--array-reveal-ms',Math.max(42,130/arraySpeed)+'ms');
 setArrayCount(0);
 const get=(sel)=>Q('#multiplicationFx '+sel);
 get('[data-row-label="1"]')?.classList.add('revealed');
 // First group: reveal circles 1, 2, 3... one at a time, not just the header numbers.
 for(let c=1;c<=cols;c++){
   await pauseArray(c===1?95:120);if(!valid())return false;
   get(`[data-col="${c}"]`)?.classList.add('revealed');
   get(`[data-r="1"][data-c="${c}"]`)?.classList.add('revealed');
   setArrayCount(c);playArrayTick();
 }
 // Every following group of exactly 'cols' circles appears together; count by cols.
 for(let r=2;r<=rows;r++){
   await pauseArray(210);if(!valid())return false;
   get(`[data-row-label="${r}"]`)?.classList.add('revealed');
   for(let c=1;c<=cols;c++)get(`[data-r="${r}"][data-c="${c}"]`)?.classList.add('revealed');
   setArrayCount(r*cols);playArrayTick(true);
 }
 await pauseArray(250);return valid();
}
async function animateTypeOn(multiplier,multiplicand,valid){
 const f=$('floating');
 const overlay=document.createElement('div');overlay.className='fx-typeon';overlay.setAttribute('aria-hidden','true');
 const symbols=[String(multiplier),'×',String(multiplicand)];
 overlay.innerHTML=symbols.map(ch=>`<span class="char">${ch}</span>`).join('');
 f.append(overlay);
 for(const ch of overlay.children){
   await pauseMultiply(64);if(!valid())return false;
   ch.classList.add('revealed');
 }
 await pauseMultiply(145);return valid();
}
function startMultiplySequence(){
 if(!productActive())return;
 ++multiplySerial;
 multiplyRunning=false;busy=false;
 clearMultiplyFx();
 s.revealed=false;
 clearTimeout(connectionTimer);
 $('pair').classList.add('live');
 render();
 status('Tap the multiplication expression to reveal its product.');
}
function revealProduct(){
 if(!productActive()||busy||s.revealed)return;
 snapshot();
 s.revealed=true;
 clearTimeout(connectionTimer);
 $('pair').classList.remove('live');
 playMultiplyStamp();
 render();
 status('Place either product digit, or add a waiting carry.');
}

