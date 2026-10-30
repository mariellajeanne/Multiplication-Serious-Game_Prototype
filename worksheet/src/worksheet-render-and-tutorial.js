'use strict';
function finish(){const arr=s.B.length>1?s.sum:s.rows[0],total=Object.entries(arr).reduce((n,[c,v])=>n+Number(v)*10**Number(c),0);if(total!==s.a*s.b){console.error('Math result mismatch',s,total);status('Calculation check failed.',true);return}s.complete=true;s.phase='complete';money+=50;play('finish');render();$('receiptStamp').classList.add('stamped');$('machineLive').textContent='ORDER COMPLETE';$('cashDisplay').textContent='+₱50';$('cashTerminal').classList.remove('open');void $('cashTerminal').offsetWidth;$('cashTerminal').classList.add('open');$('complete').innerHTML=`<div class="complete"><h3>Order packed and verified!</h3><p>${fmt(s.a)} × ${fmt(s.b)} = <strong>${fmt(total)}</strong> pastries processed.</p><button class="tool" id="again">↻ New order</button></div>`;$('again').onclick=reset;status('Order complete!')}
function undo(){if(!history.length||busy)return;additionCollapsed=false;run++;multiplySerial++;multiplyRunning=false;clearMultiplyFx();clearTimeout(connectionTimer);$('pair').classList.remove('live');document.querySelectorAll('.fly,.addition-ghost,.addition-spark').forEach(x=>x.remove());const h=history.pop();s=h.s;money=h.money;selection=null;s.chosen=null;s.carryArmed=false;$('complete').innerHTML='';render();status('Undone.')}
function render(){const active=productActive(),last=lastDigit();$('replayMult').disabled=!active||busy||!s.revealed||s.onesPlaced||s.tensPlaced;$('app').className='shell '+visual+(active?' product-focus':'');$('operationCue').textContent=s.phase==='sum'?'＋ ADD PARTIAL PRODUCTS':s.phase==='complete'?'✓ FINISHED':s.phase==='product'?'× MULTIPLY':'× MULTIPLY';$('rowTag').textContent=s.phase==='sum'?'FINAL ADDITION':s.phase==='complete'?'✓ PACKED':`ROW ${s.row+1} / ${s.B.length}`;$('pairs').textContent=`${s.done} / ${s.A.length*s.B.length} PAIRS`;$('equation').textContent=fmt(s.a)+' × '+fmt(s.b);$('category').textContent=allCases.find(o=>o.a===s.a&&o.b===s.b)?.group||'';$('counter').textContent=s.done+' product cycles sealed';$('boxes').textContent=s.boxes;$('meterFill').style.width=100*s.done/(s.A.length*s.B.length)+'%';$('percent').textContent=Math.round(100*s.done/(s.A.length*s.B.length))+'%';$('balance').textContent='₱'+fmt(money);$('undo').disabled=!history.length||busy;$('selectedLabel').classList.toggle('hidden',!s.chosen&&!s.carryArmed);$('selectedLabel').textContent=s.carryArmed?'Carry selected':s.chosen==='tens'?'Tens tile selected':'Ones tile selected';
 let html='';const box=(klass,txt='',data='',aria='')=>`<button type="button" class="cell ${klass}" ${data} aria-label="${aria}">${txt}</button>`;function line(className,sign,fn){let out=`<div class="line ${className}" style="--cols:${s.cols}">`;if(sign)out+=`<span class="symbol">${sign}</span>`;for(let c=s.cols-1;c>=0;c--)out+=fn(c);return out+'</div>'};const empty=()=>'<span class="cell"></span>';
 html+=line('carryline','',c=>c<s.A.length?box('hold '+(s.carrySlots[c]?'waiting ':'')+(s.carryArmed&&c===s.k?'armed ':'')+(s.carrySlots[c]?.provisional?'provisional ':'')+(s.phase==='select'&&s.first?'':'') ,s.carrySlots[c]?.value??'',`data-carry="${c}"`,`Carry above digit ${s.A[c]}`):empty());
 html+=line('topline','',c=>c<s.A.length?box('number '+((s.first?.kind==='top'&&s.first.c===c)?'first ':'')+(active&&s.k===c?'connecting ':''),s.A[c],`data-top="${c}"`,`Multiplicand ${s.A[c]}`):empty());
 html+=line('bottomline','×',c=>c<s.B.length?box('number '+((s.first?.kind==='bottom'&&s.first.c===c)?'first ':'')+(active&&s.row===c?'connecting ':''),s.B[c],`data-bottom="${c}"`,`Multiplier ${s.B[c]}`):empty());
 if(s.phase==='complete'&&additionCollapsed){
  html+=line('productline final-merged','',c=>{const n=s.sum[c];return box('rowcell '+(n!==undefined?'filled final-merged-digit':'') , n??'',`data-slot="0:${c}"`,`Final product column ${c+1}`)});
 }else{
 for(let r=0;r<s.B.length;r++){if(r>s.row&&s.phase!=='complete'&&s.phase!=='sum')continue;html+=line('productline',r?'＋':'',c=>{let n=s.rows[r][c],filled=n!==undefined,provisional=active&&r===s.row&&!s.mixed&&((s.onesPlaced&&c===currentCol())||(s.tensPlaced&&s.tensLocation==='row'&&c===currentCol()+1));return box('rowcell '+(filled?'filled ':'')+(provisional?'provisional ':'')+(s.carryArmed&&r===s.row&&c===currentCol()&&s.onesPlaced?'targeted ':'')+(active&&r===s.row&&s.tensLocation==='row'&&c===currentCol()+1&&!last?'liftable ':'')+(c<r?'zero ':''),filled?n:'',`data-slot="${r}:${c}"`,`Product row ${r+1} column ${c+1}`)})}
 if(s.B.length>1&&s.phase==='complete')html+=line('finalline','=',c=>box('rowcell '+(s.sum[c]!==undefined?'filled':''),s.sum[c]??'',`data-sum="${c}"`,`Sum column ${c+1}`));
 }
 $('math').innerHTML=html;updateAdditionHelp();requestAnimationFrame(updateAdditionSwipeGuide);$('progressTag').textContent=s.phase==='complete'?'✓ CALIBRATED':`${s.done} PACKING CYCLES`;requestAnimationFrame(positionFloater);
}
function positionFloater(){
 const float=$('floating'),svg=$('pair');
 if(!productActive()){$('pair').classList.remove('live');float.classList.remove('show','multiply-running');float.innerHTML='';updateTutorial();return}
 const ta=Q(`[data-top="${s.k}"]`),bo=Q(`[data-bottom="${s.row}"]`);if(!ta||!bo)return;
 const rect=$('sheet').getBoundingClientRect(),a=ta.getBoundingClientRect(),b=bo.getBoundingClientRect();
 const ax=a.left+a.width/2-rect.left,ay=a.top+a.height/2-rect.top,bx=b.left+b.width/2-rect.left,by=b.top+b.height/2-rect.top;
 const len=Math.hypot(bx-ax,by-ay)||1,nx=-(by-ay)/len,ny=(bx-ax)/len;
 const capsule=convexConnector({x:ax,y:ay},{x:bx,y:by});
 $('pairHalo').setAttribute('d',capsule);$('pairGlow').setAttribute('d',capsule);
 $('pairTrace').setAttribute('d',`M ${ax} ${ay} L ${bx} ${by}`);
 const T=tens(),O=ones();
 float.dataset.equation=`${s.B[s.row]} × ${s.A[s.k]} =`;
 float.setAttribute('aria-label',`Product ${value()}; select either digit`);
 const leftVisible=T>0;
 float.innerHTML=`${leftVisible?`<button class="ftile ${s.tensPlaced?'done ':''}${s.chosen==='tens'?'selected ':''}${!s.mixed?'pretend ':''}" data-part="tens" aria-label="Tens digit ${T}">${T}</button>`:''}<button class="ftile ${s.onesPlaced?'done ':''}${s.chosen==='ones'?'selected ':''}${s.carryArmed?'targeted ':''}${!s.mixed?'pretend ':''}" data-part="ones" aria-label="Ones digit ${O}">${O}</button>`;
 if(!s.revealed){
   float.innerHTML=`<button type="button" id="equationReveal" class="equation-reveal" aria-label="Multiply ${s.B[s.row]} by ${s.A[s.k]} and show the product">${s.B[s.row]} × ${s.A[s.k]}</button>`;
 }
 float.classList.add('show');float.classList.remove('multiply-running');float.classList.toggle('equation-pending',!s.revealed);
 const typeOnActive=!s.revealed;
 float.classList.toggle('typeon-sized',typeOnActive);
 // Set dimensions BEFORE measuring and positioning: a 1-digit result must still fit '7 × 1'.
 float.style.minWidth=typeOnActive?'132px':'';
 const w=float.offsetWidth,h=float.offsetHeight;
 const onesBtn=float.querySelector('[data-part="ones"]');
 const onesCenter=onesBtn?onesBtn.offsetLeft+onesBtn.offsetWidth/2:w/2;
 // The product ones digit stays vertically under the current multiplicand digit.
 let x=(typeOnActive?ax-w/2:ax-onesCenter), y=(ay+by)/2-h/2-6;
 x=Math.max(4,Math.min(rect.width-w-4,x));y=Math.max(22,Math.min(rect.height-h-5,y));
 float.style.left=x+'px';float.style.top=y+'px';
 if(s.revealed)updateTutorial(ax,ay,bx,by);else $('tutorial').innerHTML='';
 fxPosition();
}

function pointOf(el){if(!el)return null;const base=$('sheet').getBoundingClientRect(),r=el.getBoundingClientRect();return {x:r.left+r.width/2-base.left,y:r.top+r.height/2-base.top};}
function makeStream(a,b,cls){
 if(!a||!b)return null;
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
 if(len<24)return null;
 const stream=document.createElement('div');stream.className=`tutorial-stream ${cls}`;
 stream.style.left=a.x+'px';stream.style.top=(a.y-21)+'px';stream.style.width=len+'px';
 stream.style.setProperty('--travel',Math.max(2,len-14)+'px');
 stream.style.transform=`rotate(${Math.atan2(dy,dx)*180/Math.PI}deg)`;
 const count=len<95?2:len<185?3:4;
 stream.innerHTML='<div class="shaft"></div>'+Array.from({length:count},(_,i)=>
 `<span class="stream-chevron" style="animation-delay:${(-i*1.6/count).toFixed(3)}s"></span>`).join('')+'<span class="stream-tip"></span>';
 return stream;
}
function updateTutorial(ax=null,ay=null,bx=null,by=null){const layer=$('tutorial');if(!layer)return;layer.innerHTML='';layer.hidden=!tutorial;if(!tutorial)return;if(s.phase==='complete'||s.phase==='sum')return;const topEl=Q(`[data-top="${s.k}"]`),bottomEl=Q(`[data-bottom="${s.row}"]`);const top=topEl?pointOf(topEl):null,bottom=bottomEl?pointOf(bottomEl):null;if(!productActive()){if(top&&bottom){const stream=makeStream(bottom,top,'connect');if(stream)layer.append(stream);}return;}const onesFloating=Q('#floating [data-part="ones"]'),tensFloating=Q('#floating [data-part="tens"]');const onesPlaced=Q(`[data-slot="${s.row}:${currentCol()}"]`),tensRow=Q(`[data-slot="${s.row}:${currentCol()+1}"]`),carryNow=Q(`[data-carry="${s.k}"]`),carryNext=Q(`[data-carry="${s.k+1}"]`);const onesSource=s.onesPlaced?onesPlaced:onesFloating;if(s.incoming&&!s.mixed&&carryNow&&onesSource){const stream=makeStream(pointOf(carryNow),pointOf(onesSource),'carry');if(stream)layer.append(stream);return;}if(!s.onesPlaced&&onesFloating&&onesPlaced){const stream=makeStream(pointOf(onesFloating),pointOf(onesPlaced),'place');if(stream)layer.append(stream);return;}if(tens()>0){let from=null,to=null;if(s.tensLocation==='row'&&tensRow){from=pointOf(tensRow);to=lastDigit()?pointOf(tensRow):(carryNext?pointOf(carryNext):null);}else if(!s.tensPlaced&&tensFloating){from=pointOf(tensFloating);to=lastDigit()?pointOf(tensRow):(carryNext?pointOf(carryNext):null);}if(from&&to){const stream=makeStream(from,to,'lift');if(stream)layer.append(stream);return;}}}

