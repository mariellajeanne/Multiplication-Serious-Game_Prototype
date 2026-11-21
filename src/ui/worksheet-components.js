/* Shared, side-effect-free worksheet presentation. All numbers/text are supplied
 * by the learner; rendering never generates facts, offers, rewards or inputs. */
(function(root){
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const translate=value=>typeof root.uiText==='function'?root.uiText(String(value??'')):String(value??'');
 function keypad(label){return `<div class="calculation-keypad" role="group" aria-label="${esc(label)}">${[1,2,3,4,5,6,7,8,9,'Backspace',0,'Enter'].map(key=>`<button class="illustrated-worksheet-button" data-calc-key="${key}" onclick="worksheetCalcKey('${key}')" aria-label="${key==='Backspace'?'Backspace':key==='Enter'?'Submit answer':key}">${key==='Backspace'?'⌫':key==='Enter'?'Enter':key}</button>`).join('')}</div>`}
 function tray(v){return `<div class="worksheet-digit-tray" role="group" aria-label="Answer digits">${v.waiting?`<button class="carry-source illustrated-worksheet-button ${v.armed?'is-selected':''}" onclick="armCalculatorCarry()">+${v.waiting} waiting carry</button>`:''}<span>${esc(translate(v.label))}</span><div>${v.digits.map(d=>`<button class="illustrated-worksheet-button answer-digit ${v.selected===d.part?'is-selected':''} ${d.part==='ones'&&v.waiting?'carry-target':''}" ${d.part==='ones'&&v.waiting?'id="carryResultTarget"':''} data-answer-digit="${d.part}" data-digit-value="${d.value}" aria-label="Place digit ${d.value}" aria-pressed="${v.selected===d.part}">${d.value}</button>`).join('')}</div>${v.demo?`<small class="digit-drag-demo" data-demo-digit="${esc(v.demoDigit)}" aria-hidden="true">${esc(translate('← Drag to the worksheet'))}</small>`:''}</div>`}
 function calculator(v){
  if(v.mode==='complete')return `<header class="calculator-heading"><span>BAKER’S CALCULATOR</span><h2>${esc(translate('All placed!'))}</h2></header><div class="calculator-answer">✓</div><p class="calculator-note">${esc(translate('Your order is ready to complete.'))}</p>`;
  if(v.mode==='sum')return `<header class="calculator-heading"><span>BAKER’S CALCULATOR</span><h2>${esc(translate('Add the rows'))}</h2></header><div class="calculator-answer" aria-hidden="true">+</div><p class="calculator-note">${esc(translate('Swipe down on the worksheet to finish your order.'))}</p>`;
  return `<header class="calculator-heading"><span>BAKER’S CALCULATOR</span><h2 id="calculationExpression">${esc(v.expression)}</h2></header>${v.carryEquation?`<div class="calculator-carry-equation">${esc(v.carryEquation)}</div>`:''}<output class="calculator-answer ${v.golden?'is-golden':''}" id="calculationAnswer" ${v.manual?'tabindex="0" aria-label="Golden Challenge answer"':''}>${esc(v.display)}</output>${v.offered?`<button class="golden-challenge-button illustrated-worksheet-button" id="goldenChallenge" onclick="chooseWorksheetChallenge()"><span aria-hidden="true">✦</span><span>${esc(translate('Golden Challenge!'))}<small>${esc(translate('Solve it yourself for bonus coins!'))}</small></span><b>×${v.multiplier}</b></button>`:''}${v.manual?`<div class="golden-active-label">${esc(translate('Golden Challenge'))} <b>×${v.multiplier}</b></div>`:''}${v.tray?tray(v.tray):''}${v.manual?keypad('Golden Challenge keypad'):''}<p class="calculator-note ${v.placementError?'is-placement-error':v.golden?'is-success':''}" role="status">${esc(translate(v.status))}</p>${v.generate?`<button class="illustrated-worksheet-button ${!v.offered&&!v.manual?'worksheet-primary':''} ${v.guide?'calculator-guide':''}" id="generateAnswer" ${v.active?'':'disabled'} onclick="generateWorksheetAnswer()">Generate Answer</button>`:''}`;
 }
 function coinArt(rank,prefix='assets/bakery-ui/'){const crops=[[82,175,292,237,444,444],[90,53,258,359,443,444],[39,44,333,368,443,444],[37,13,359,399,444,444],[23,63,400,357,444,443],[19,44,367,375,443,443],[0,38,405,377,443,443],[0,0,444,418,444,443]], [x,y,w,h,iw,ih]=crops[rank];return `<svg class="coin-tier-art illustrated-coin" viewBox="${x} ${y} ${w} ${h}" aria-hidden="true"><image href="${/\.(png|webp)$/.test(prefix)?prefix:prefix+'coin-'+String(rank+1).padStart(2,'0')+'.png'}" width="${iw}" height="${ih}"/></svg>`}
 function rewards(options){return `<aside class="worksheet-reward-row" aria-label="Possible step rewards"><div class="worksheet-panel-title">Rewards</div>${options.map(o=>`<section class="worksheet-coin-display" data-coin-rank="${o.rank}"><button type="button" class="reward-info" aria-label="${esc(o.name)}, base ${o.base} coins" data-reward-name="${esc(o.name)}" data-reward-base="${o.base}"><span class="worksheet-coin-art">${o.art||coinArt(o.rank,'../assets/bakery-ui/')}</span><b class="reward-count" data-ticket-count="${o.rank}" aria-label="Containers earned this order">${o.count}</b></button><span class="reward-probability">${Math.round(o.chance*100)}%</span></section>`).join('')}</aside>`}
 function workspace({done,total,complete,pool=0,actions=''}){return `<section class="worksheet-left"><div class="worksheet-engine-wrap"><iframe id="worksheetFrame" class="worksheet-frame" title="Work out your customer's order" sandbox="allow-scripts allow-same-origin"></iframe></div></section><aside class="worksheet-calculator" aria-label="Bakery calculation panel"><div class="worksheet-panel-title">Calculator</div><div id="calculationPanel"></div></aside><footer class="worksheet-complete-bar"><button data-worksheet-control="undo" aria-label="Undo" class="illustrated-worksheet-button" onclick="sendEngine('undo',{attemptId:g.run.worksheetRewards.attemptId})">&#8630; Undo</button>${actions}<span id="worksheetStepProgress">${done} / ${total} pairs placed</span><button id="collectRewards" aria-label="Complete Order" class="illustrated-worksheet-button worksheet-primary" ${complete?'':'disabled hidden'} onclick="beginWorksheetSettlement()">&#10003; Complete Order</button><span id="pendingCoins" hidden>${pool}</span></footer><span id="bridgeStatus" hidden></span>`}
 // Remove handlers before insertion into an observer document, in addition to
 // its capture-phase input gate and absence of any gameplay command functions.
 function readOnly(html){
  // The helper may inspect reward information; only action controls are inert.
  // This is presentation HTML only: no game-command handlers survive.
  return html.replace(/ onclick="[^"]*"/g,'')
   .replace(/<button\b([^>]*)>/g,(tag,attrs)=>/class="[^"]*\breward-info\b/.test(attrs)?tag:`<button disabled aria-disabled="true"${attrs}>`)
   .replace(/tabindex="0"/g,'tabindex="-1"');
 }
 function layout({rows,cols,available,byWidth,minArea=474,gap=6}){
  let cell=Math.max(44,Math.min(148,byWidth));
  const height=n=>Math.max(44,Math.round(n*.65))+(2+rows)*n+Math.max(16,Math.round(n*(n<=52?.3:.55)))+140;
  while(cell>44&&height(cell)>available)cell--;
  return {cell,height:height(cell),area:Math.max(minArea,cols*cell+(cols-1)*gap+90)};
 }
 root.WorksheetComponents={calculator,tray,keypad,workspace,readOnly,layout,rewards,coinArt};
 if(typeof document!=='undefined'){
  let popup=null,anchor=null,hoverTimer=null,lastPointerKind='keyboard';
  const cancelClose=()=>{clearTimeout(hoverTimer);hoverTimer=null};
  const close=()=>{
   cancelClose();popup?.remove();popup=null;
   anchor?.setAttribute('aria-expanded','false');anchor?.removeAttribute('aria-describedby');anchor=null;
  };
  const scheduleClose=()=>{cancelClose();hoverTimer=setTimeout(()=>{
   if(anchor&&document.activeElement===anchor||popup?.contains(document.activeElement))return;
   close();
  },180)};
  const show=(button,toggle=false)=>{
   cancelClose();
   if(anchor===button){if(toggle)close();return}
   close();anchor=button;button.setAttribute('aria-expanded','true');
   popup=document.createElement('div');popup.className='reward-popover';popup.id='worksheetRewardInfo';popup.setAttribute('role','dialog');
   popup.setAttribute('aria-label',button.dataset.rewardName+' reward details');button.setAttribute('aria-describedby',popup.id);
   const title=document.createElement('strong');title.textContent=button.dataset.rewardName;
   const line=document.createElement('span');line.className='reward-base-line';
   line.textContent='Base: '+Number(button.dataset.rewardBase).toLocaleString()+' ';
   const coin=document.createElement('span');coin.className='reward-base-coin';coin.setAttribute('aria-hidden','true');
   line.append(coin);
   const dismiss=document.createElement('button');dismiss.type='button';dismiss.setAttribute('aria-label','Close reward details');dismiss.textContent='\u00d7';dismiss.onclick=close;
   popup.append(title,line,dismiss);document.body.append(popup);
   const r=button.getBoundingClientRect(),box=popup.getBoundingClientRect();
   const right=r.right+8,left=r.left-box.width-8;
   popup.style.left=(right+box.width<=innerWidth-8?right:left>=8?left:Math.max(8,Math.min(innerWidth-box.width-8,right)))+'px';
   popup.style.top=Math.max(8,Math.min(innerHeight-box.height-8,r.top))+'px';
  };
  document.addEventListener('pointerdown',e=>{lastPointerKind=e.pointerType||'mouse';if(popup&&!e.target.closest('.reward-info,.reward-popover'))close()},true);
  document.addEventListener('keydown',e=>{lastPointerKind='keyboard';if(e.key==='Escape')close()},true);
  document.addEventListener('click',e=>{
   const button=e.target.closest('.reward-info');
   if(button)show(button,lastPointerKind!=='mouse');
   else if(!e.target.closest('.reward-popover'))close();
  });
  document.addEventListener('pointerover',e=>{
   if(e.pointerType!=='mouse')return;
   if(popup?.contains(e.target)){cancelClose();return}
   const button=e.target.closest('.reward-info');if(button)show(button);
  });
  document.addEventListener('pointerout',e=>{
   if(e.pointerType!=='mouse'||!anchor)return;
   if((anchor.contains(e.target)||popup?.contains(e.target))&&
    !anchor.contains(e.relatedTarget)&&!popup?.contains(e.relatedTarget))scheduleClose();
  });
  document.addEventListener('focusin',e=>{
   const button=e.target.closest('.reward-info');
   if(button&&lastPointerKind==='keyboard')show(button);
   else if(!button&&!e.target.closest('.reward-popover')&&popup)close();
  });
  window.addEventListener('resize',close);window.addEventListener('scroll',close,true);
 }
})(globalThis);
