/* Presentation only: consumes the saved settlement, never grants rewards.
 * One frame clock owns the causal sequence; every visual effect is cancellable. */
function orderCompletionCoin(){return '<img class="summary-coin-icon" src="assets/bakery-runtime/price-coin.webp" alt="" aria-hidden="true" draggable="false">'}
function orderCompletionMarkup(r){
 const totals=r.settlement||stepCoinTotals(r),boost=new Intl.NumberFormat('en-US',{maximumSignificantDigits:12}).format(totals.boost);
 const earned=r.stepCoins.options.filter(o=>totals.counts[o.rank]>0&&totals.subtotals[o.rank]>0);
 return `<section class="worksheet-summary" data-summary-stage="0" aria-label="Order rewards"><div class="summary-coin-types">${earned.map(o=>`<div class="summary-type" role="group" data-coin-rank="${o.rank}" data-contribution="${totals.subtotals[o.rank]}" aria-label="${fmt(totals.counts[o.rank])} ${worksheetCoinName(o.rank)}, ${fmt(totals.subtotals[o.rank])} coins"><div class="summary-art">${worksheetCoinArt(o.rank)}<b class="summary-quantity">×${fmt(totals.counts[o.rank])}</b></div><div class="summary-contribution"><b>${fmt(totals.subtotals[o.rank])}</b>${orderCompletionCoin()}</div></div>`).join('')}</div><div class="summary-total" aria-label="Coins earned"><div class="summary-total-value"><strong id="worksheetFinalCoins">0</strong>${orderCompletionCoin()}</div><span class="summary-sparkles" aria-hidden="true">✦<i>✧</i>✦</span></div><div class="summary-details"><div class="summary-boost" aria-label="Baker's Boost times ${boost}"><b>×${boost}</b>${hubBoostDiamond()}</div><div class="summary-equation"><span>Base: <b>${fmt(totals.base)}</b>${orderCompletionCoin()}</span><span>× Boost: <b>${boost}</b>${hubBoostDiamond().replace("boost-prism.svg","boost-prism.svg#still")}</span></div></div><div class="summary-actions"><button id="acknowledgeWorksheetSummary" class="primary" disabled onclick="acknowledgeWorksheetSummary()">Back to Bakery</button></div><button id="skipWorksheetSummary" class="secondary summary-skip" onclick="finishWorksheetSummaryAnimation()">Skip</button><p id="worksheetSettlementError" role="alert" hidden></p><span class="summary-status" role="status" aria-live="polite" aria-atomic="true"></span></section>`;
}
function createOrderCompletionSequence(root,totals,onFinish,onDispose){
 const groups=[...root.querySelectorAll('.summary-type')],total=root.querySelector('.summary-total'),number=root.querySelector('#worksheetFinalCoins'),boost=root.querySelector('.summary-boost'),formula=root.querySelector('.summary-equation'),back=root.querySelector('#acknowledgeWorksheetSummary'),skip=root.querySelector('#skipWorksheetSummary');
 const effects=new Set(),ghosts=new Set(),segments=[];
 let frame=null,origin=null,current=-1,ended=false,disposed=false,cursor=0,accumulated=0;
 const ease=t=>1-Math.pow(1-t,3);
 const visible=el=>el.classList.add('is-visible');
 function animate(el,frames,duration){
  if(!el.animate)return;
  const effect=el.animate(frames,{duration,easing:'cubic-bezier(.22,.7,.25,1)'});effects.add(effect);
  effect.finished.then(()=>effects.delete(effect),()=>effects.delete(effect));
 }
 function fitNumber(){
  number.style.fontSize='';
  const row=number.parentElement,icon=row.querySelector('img'),room=row.clientWidth-icon.getBoundingClientRect().width-16;
  const style=getComputedStyle(number),measure=document.createElement('canvas').getContext('2d');
  measure.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const spacing=parseFloat(style.letterSpacing)||0;
  const width=Math.max(...[totals.base,totals.total].map(value=>{const label=fmt(value);return measure.measureText(label).width+spacing*Math.max(0,label.length-1)}));
  if(width>room&&room>0)number.style.fontSize=(parseFloat(style.fontSize)*room/width)+'px';
 }
 function setNumber(value){number.textContent=fmt(value)}
 function pop(strong=false){animate(total,[{transform:'scale(1)'},{transform:`scale(${strong?1.055:1.025},${strong?1.09:1.04})`,offset:.42},{transform:'scale(1)'}],strong?480:240)}
 function add(duration,start=()=>{},update=()=>{}){segments.push({at:cursor,duration,start,update});cursor+=duration}
 function clear(){
  if(frame!==null)cancelAnimationFrame(frame);frame=null;
  for(const effect of effects)effect.cancel();effects.clear();
  for(const ghost of ghosts)ghost.remove();ghosts.clear();
 }
 function finish(){
  if(disposed||ended)return;ended=true;clear();
  groups.forEach(visible);boost.classList.remove('is-visible');visible(formula);visible(back);
  setNumber(totals.total);root.dataset.summaryStage='6';root.dataset.summaryPhase='finished';
  back.disabled=false;const hadFocus=document.activeElement===skip;skip.hidden=true;
  root.querySelector('.summary-status').textContent=`${fmt(totals.total)} coins earned.`;
  if(hadFocus)back.focus({preventScroll:true});onFinish?.();
 }
 function dispose(){if(disposed)return;disposed=true;clear();observer.disconnect();resize.disconnect();motion.removeEventListener?.('change',motionChanged);onDispose?.()}
 function motionChanged(event){if(event.matches)finish()}
 const observer=new MutationObserver(()=>{if(!root.isConnected)dispose()});observer.observe(root.parentNode,{childList:true});
 // Modal replacement removes the parent too; observe its stable host as well.
 observer.observe(document.getElementById('modals'),{childList:true,subtree:true});
 const resize=new ResizeObserver(fitNumber);resize.observe(total);
 const motion=matchMedia('(prefers-reduced-motion: reduce)');motion.addEventListener?.('change',motionChanged);
 fitNumber();
 add(80);
 add(Math.max(0,groups.length-1)*170+300,()=>{root.dataset.summaryPhase='containers';root.dataset.summaryStage='1'},(t,elapsed)=>{
  groups.forEach((group,i)=>{if(elapsed>=i*170&&!group.classList.contains('is-visible')){visible(group);animate(group,[{opacity:0,transform:'scale(.4)'},{opacity:1,transform:'scale(1.15,.94)',offset:.65},{opacity:1,transform:'scale(1)'}],300)}});
 });
 groups.forEach(group=>{
  let ghost;
  add(270,()=>{
   root.dataset.summaryPhase='contribution';root.dataset.summaryStage='2';
   const value=group.querySelector('.summary-art'),from=value.getBoundingClientRect(),to=total.getBoundingClientRect(),bounds=root.getBoundingClientRect();
   ghost=value.cloneNode(true);ghost.classList.add('summary-flight');ghost.setAttribute('aria-hidden','true');
   Object.assign(ghost.style,{left:(from.left-bounds.left)+'px',top:(from.top-bounds.top)+'px',width:from.width+'px',height:from.height+'px'});
   root.append(ghost);ghosts.add(ghost);
   animate(ghost,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${to.left+to.width/2-from.left-from.width/2}px,${to.top+to.height/2-from.top-from.height/2}px) scale(.65)`,opacity:0}],270);
  });
  const from=accumulated,to=accumulated+Number(group.dataset.contribution);accumulated=to;
  add(210,()=>{ghost?.remove();ghosts.delete(ghost);pop()},t=>setNumber(t===1?to:Math.round(from+(to-from)*ease(t))));
 });
 add(320,()=>{root.dataset.summaryPhase='boost';root.dataset.summaryStage='3';visible(boost);animate(boost,[{opacity:0,transform:'translateY(24px) scale(.9)'},{opacity:1,transform:'translateY(-3px) scale(1.03)',offset:.8},{opacity:1,transform:'none'}],320)});
 add(518); // Hold the enlarged multiplier before it feeds into the total.
 add(390,()=>{
  const from=boost.getBoundingClientRect(),to=total.getBoundingClientRect();
  animate(boost,[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:`translateY(${to.top+to.height/2-from.top-from.height/2}px) scale(.6)`}],390);
 });
 add(600,()=>{
  boost.classList.remove('is-visible');root.dataset.summaryPhase='final-total';root.dataset.summaryStage='5';pop(true);
  animate(root.querySelector('.summary-sparkles'),[{opacity:0,transform:'scale(.6)'},{opacity:1,transform:'scale(1)',offset:.35},{opacity:0,transform:'scale(1.15)'}],600);
 },t=>setNumber(t===1?totals.total:Math.round(totals.base+(totals.total-totals.base)*ease(t))));
 add(300,()=>{
  root.dataset.summaryPhase='reveal';visible(formula);visible(back);
  // The amount is complete. Hand the action area from Skip to Back as it
  // appears, so the controls never overlap on a short landscape screen.
  const hadFocus=document.activeElement===skip;skip.hidden=true;back.disabled=false;
  if(hadFocus)back.focus({preventScroll:true});
  animate(formula,[{opacity:0,transform:'translateY(-18px)'},{opacity:1,transform:'translateY(3px)',offset:.8},{opacity:1,transform:'none'}],300);
  animate(back,[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],300);
 });
 function tick(now){
  frame=null;if(disposed||ended)return;if(!root.isConnected){dispose();return}
  if(origin===null)origin=now;const elapsed=now-origin;
  // Complete every crossed segment, including exact numeric endpoints after
  // background-tab throttling. No independent timers can outlive the view.
  while(current+1<segments.length&&elapsed>=segments[current+1].at){
   if(current>=0)segments[current].update(1,segments[current].duration);
   current++;segments[current].start();
  }
  if(current>=0){const part=segments[current],local=Math.min(part.duration,elapsed-part.at);part.update(Math.min(1,local/part.duration),local)}
  if(elapsed>=cursor){finish();return}frame=requestAnimationFrame(tick);
 }
 if(motion.matches)finish();else frame=requestAnimationFrame(tick);
 return {finish,dispose,get active(){return !ended&&!disposed},duration:cursor};
}
