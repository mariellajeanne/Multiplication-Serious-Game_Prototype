'use strict';
function sum(c){if(s.phase!=='sum'||busy)return;return playCascadeAddition()}
function updateAdditionHelp(){
 const text=s?.phase==='sum'?'Swipe downward anywhere. The columns fall together in a right-to-left cascade, then the sum rises.':'Finish a two-row problem or jump directly to the addition test.';
 const el=$('additionHelp');if(el)el.textContent=text;
 document.body.classList.toggle('addition-active',Boolean(s&&s.phase==='sum'));
}
function startAdditionLab(){
 let [a,b]=$('problem').value.split(',').map(Number);
 if(b<10){a=248;b=26;$('problem').value='248,26';}
 reset();s.phase='sum';s.row=s.B.length-1;s.k=s.A.length;s.done=s.A.length*s.B.length;s.boxes=s.done;
 s.rows=s.B.map((digit,r)=>{const v=s.a*digit*10**r, digits=rev(v);return Object.fromEntries(digits.map((d,c)=>[c,d]))});
 s.sum={};s.sumCol=0;s.sumCarry=0;s.carrySlots={};additionCollapsed=false;history=[];render();status('Addition ready.');
}
function calculateSum(){let carry=0,vals=[];for(let c=0;c<s.cols;c++){const amount=s.rows.reduce((t,r)=>t+(r[c]||0),carry);vals.push(amount%10);carry=Math.floor(amount/10)}return vals;}
function cellCenter(el){if(!el)return null;let rr=el.getBoundingClientRect(),root=$('sheet').getBoundingClientRect();return{x:rr.left-root.left+rr.width/2,y:rr.top-root.top+rr.height/2,w:rr.width,h:rr.height};}
function sparkleAt(x,y){if(window.__BATCH_TEST_FAST)return;const el=document.createElement('div');el.className='addition-spark';el.textContent='✦';el.style.left=x+'px';el.style.top=y+'px';$('sheet').append(el);setTimeout(()=>el.remove(),520)}
function sleep(ms){return window.__BATCH_TEST_FAST?Promise.resolve():new Promise(r=>setTimeout(r,ms))}
function launchDigit(from,to,digit,duration=185,delay=0){
 if(!from||!to||window.__BATCH_TEST_FAST||matchMedia('(prefers-reduced-motion:reduce)').matches)return Promise.resolve();
 const a=cellCenter(from),b=cellCenter(to);if(!a||!b)return Promise.resolve();
 const el=document.createElement('div');el.className='addition-ghost';el.textContent=digit;el.style.left=(a.x-a.w/2)+'px';el.style.top=(a.y-a.h/2)+'px';el.style.width=a.w+'px';el.style.height=a.h+'px';$('sheet').append(el);
 const dx=b.x-a.x,dy=b.y-a.y;
 return new Promise(resolve=>{setTimeout(()=>{
  const anim=el.animate([{transform:'translate(0,0) scale(1)',opacity:1},{offset:.78,transform:`translate(${dx*.76}px,${dy*.76}px) scale(.95)`,opacity:1},{transform:`translate(${dx}px,${dy}px) scale(.88)`,opacity:.08}],{duration,easing:'cubic-bezier(.18,.85,.25,1)',fill:'forwards'});
  anim.finished.catch(()=>{}).then(()=>{el.remove();resolve()})
 },delay)})
}
function showFinalDigits(vals){for(let c=0;c<s.cols;c++){s.sum[c]=vals[c]}s.sumCol=s.cols;s.sumCarry=0;}
// Only one gesture hint is shown. It stays outside the mathematics cells' hit areas.
function updateAdditionSwipeGuide(){
 const guide=$('additionSwipeGuide');if(!guide)return;guide.innerHTML='';
 if(!s||s.phase!=='sum'||busy)return;
 // Grid displays columns in descending order: the largest column is physically LEFT.
 const leftEl=Q(`[data-slot="0:${s.cols-1}"]`), rightEl=Q('[data-slot="0:0"]');
 const rowTop=leftEl?.closest('.productline'),rowBottom=Q('[data-slot="1:0"]')?.closest('.productline');
 if(!leftEl||!rightEl||!rowTop||!rowBottom)return;
 const base=$('sheet').getBoundingClientRect(), leftRect=leftEl.getBoundingClientRect(),rightRect=rightEl.getBoundingClientRect();
 const topRect=rowTop.getBoundingClientRect(), bottomRect=rowBottom.getBoundingClientRect();
 // Anchor at the separator just ABOVE the first addition row.
 const left=Math.max(8,leftRect.left-base.left+3), right=Math.min(base.width-8,rightRect.right-base.left-3);
 const width=Math.max(100,right-left), startY=Math.max(15,topRect.top-base.top-28);
 const rowSpan=bottomRect.bottom-topRect.top;
 const height=Math.min(164,Math.max(112,rowSpan+22));
 const drop=document.createElement('div');drop.className='drop-guide';
 drop.style.setProperty('--guide-left',left+'px');drop.style.setProperty('--guide-top',startY+'px');
 drop.style.setProperty('--guide-width',width+'px');drop.style.setProperty('--guide-height',height+'px');
 drop.style.setProperty('--drop-distance',Math.max(32,Math.min(76,rowSpan*.42))+'px');
 // Four separated V chevrons, wide-to-narrow, creating a downward hourglass funnel.
 drop.innerHTML='<svg viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true">'
 +'<polyline class="chev chev1" points="4,7 50,33 96,7"/>'
 +'<polyline class="chev chev2" points="16,63 50,85 84,63"/>'
 +'<polyline class="chev chev3" points="28,116 50,134 72,116"/>'
 +'</svg>';
 guide.append(drop);
}
function rowDigitCells(r){return Array.from({length:s.cols},(_,c)=>Q(`[data-slot="${r}:${c}"]`));}
function mergeIntoLowerColumn(c,vals){
 const upper=Q(`[data-slot="0:${c}"]`),lower=Q(`[data-slot="1:${c}"]`);
 if(upper)upper.classList.add('addition-consumed');
 if(lower){
  // This is the actual per-column sum, including the carry from the right.
  const last=vals.findLastIndex(v=>v!==0);
  lower.textContent=c>last&&last!==-1?'':vals[c];
  lower.classList.add('filled','addition-merged','merge-landing');
  const q=cellCenter(lower);if(q)sparkleAt(q.x,q.y);
  if(!window.__BATCH_TEST_FAST)setTimeout(()=>lower.classList.remove('merge-landing'),150);
 }
}
async function riseMergedRow(token){
 // The lower row is the final sum. Raise its digits one by one into the original first row,
 // beginning at the right, so the movement feels like a gentle domino wave.
 const first=Q('[data-slot="0:0"]')?.closest('.productline');
 const last=Q('[data-slot="1:0"]')?.closest('.productline');
 if(!first||!last)return;
 first.classList.add('addition-empty');
 const travel=first.getBoundingClientRect().top-last.getBoundingClientRect().top;
 const reduced=window.__BATCH_TEST_FAST||matchMedia('(prefers-reduced-motion:reduce)').matches;
 if(reduced)return;
 const animations=[];
 for(let c=0;c<s.cols;c++){
  const el=Q(`[data-slot="1:${c}"]`);if(!el||!el.textContent.trim())continue;
  animations.push(new Promise(resolve=>{
    const anim=el.animate([
      {transform:'translateY(0px) scale(1)',opacity:1},
      {offset:.65,transform:`translateY(${travel*.65}px) scale(1.015)`,opacity:1},
      {transform:`translateY(${travel}px) scale(1)`,opacity:1}
    ],{duration:295,delay:c*47,easing:'cubic-bezier(.36,0,.23,1)',fill:'forwards'});
    anim.finished.catch(()=>{}).then(resolve);
  }));
 }
 play('done');await Promise.all(animations);
 if(token!==run)return;
}
async function commitAdditionResult(token,vals){
 if(token!==run)return;
 showFinalDigits(vals);
 additionCollapsed=true;busy=false;finish();
}
async function playCascadeAddition(){
 if(s.phase!=='sum'||busy)return;
 snapshot();busy=true;additionStart=null;updateAdditionSwipeGuide();
 const token=run,vals=calculateSum(),reduced=window.__BATCH_TEST_FAST||matchMedia('(prefers-reduced-motion:reduce)').matches;
 play('mix');
 // Begin with the ONES column (at the right) and start the next drop before the previous finishes.
 const perColumn=[];
 for(let c=0;c<s.cols;c++){
  perColumn.push((async()=>{
   if(!reduced)await sleep(c*58);
   if(token!==run)return;
   const from=Q(`[data-slot="0:${c}"]`),to=Q(`[data-slot="1:${c}"]`),topValue=s.rows[0][c];
   if(topValue!==undefined&&from&&to){
     const movement=launchDigit(from,to,topValue,226);
     from.classList.add('addition-consumed');
     await movement;
   }else if(!reduced)await sleep(90);
   if(token!==run)return;
   const above=s.rows[0][c]||0,below=s.rows[1][c]||0;
   let carryIn=0;for(let n=0;n<c;n++)carryIn=Math.floor(((s.rows[0][n]||0)+(s.rows[1][n]||0)+carryIn)/10);
   $('operationCue').textContent=`＋ ${above} + ${below}${carryIn?' + '+carryIn:''} = ${above+below+carryIn}`;
   mergeIntoLowerColumn(c,vals);
   // A little impact makes each column feel like a separate, completed addition.
   if(!reduced&&to)to.animate([
     {transform:'scale(.96)'},{transform:'scale(1.075)',offset:.48},{transform:'scale(1)'}
   ],{duration:148,easing:'ease-out'});
  })());
 }
 await Promise.all(perColumn);
 if(token!==run)return;
 if(!reduced)await sleep(90);
 if(token!==run)return;
 await riseMergedRow(token);
 await commitAdditionResult(token,vals);
}
// Compatibility aliases for older test runners. There is now only one addition animation.
function playVerticalAddition(){return playCascadeAddition()}
function playHorizontalAddition(){return playCascadeAddition()}
function setAdditionMode(mode){return 'cascade'}

