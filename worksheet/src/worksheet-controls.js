'use strict';
$('tryCustom').onclick=()=>{const a=Number($('customA').value),b=Number($('customB').value);if(!Number.isInteger(a)||a<1||a>99999||!Number.isInteger(b)||b<1||b>99){status('Choose 1–99999 × 1–99.',true);return;}let v=`${a},${b}`;if(!Array.from($('problem').options).some(o=>o.value===v)){let o=new Option(`${a} × ${b}`,v);$('problem').add(o,0)}$('problem').value=v;reset()};
$('restart').onclick=reset;$('problem').onchange=reset;$('undo').onclick=undo;$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♫ Sound on':'♫ Sound off'};document.querySelectorAll('[data-mult-mode]').forEach(btn=>btn.addEventListener('click',()=>{
 multMode=btn.dataset.multMode;
 $('arraySpeedWrap').hidden=multMode!=='array';
 document.querySelectorAll('[data-mult-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
 if(s.phase==='product'&&!s.onesPlaced&&!s.tensPlaced){multiplySerial++;multiplyRunning=false;busy=false;clearMultiplyFx();startMultiplySequence()}
}));
function replayAnimation(){if(s.phase==='product'&&s.revealed&&!s.onesPlaced&&!s.tensPlaced){startMultiplySequence()}}
$('replayMult').onclick=replayAnimation;
$('arraySpeed').addEventListener('input',e=>{arraySpeed=Number(e.target.value);$('arraySpeedValue').textContent=arraySpeed.toFixed(2)+'×'});
$('arraySpeed').addEventListener('change',()=>{if(multMode==='array')replayAnimation()});$('tutorialToggle').onclick=()=>{tutorial=!tutorial;$('tutorialToggle').setAttribute('aria-pressed',String(tutorial));$('tutorialToggle').textContent=tutorial?'➜ Tutorial on':'➜ Tutorial off';requestAnimationFrame(positionFloater)};$('ruleToggle').onclick=()=>{$('rule').hidden=!$('rule').hidden;$('ruleToggle').textContent=$('rule').hidden?'◇ Show rule':'◇ Hide rule'};
document.querySelectorAll('[data-visual]').forEach(btn=>btn.onclick=()=>{visual=btn.dataset.visual;document.querySelectorAll('[data-visual]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));render()});window.addEventListener('resize',()=>requestAnimationFrame(positionFloater));$('scroller').addEventListener('scroll',()=>requestAnimationFrame(positionFloater));

// A downward gesture anywhere on the screen initiates the cascade immediately.
// Controls (select, input and buttons) are excluded so they stay usable.
window.addEventListener('pointerdown',e=>{
 if(s.phase!=='sum'||busy)return;
 if(e.target.closest('button,input,select,textarea,[role="button"]'))return;
 additionStart={id:e.pointerId,x:e.clientX,y:e.clientY};
},{passive:true});
window.addEventListener('pointermove',e=>{
 if(!additionStart||additionStart.id!==e.pointerId||s.phase!=='sum'||busy)return;
 const dx=e.clientX-additionStart.x,dy=e.clientY-additionStart.y;
 if(dy>32&&Math.abs(dy)>Math.abs(dx)*.67){additionStart=null;playCascadeAddition()}
},{passive:true});
window.addEventListener('pointerup',e=>{
 if(!additionStart||additionStart.id!==e.pointerId)return;
 const p=additionStart;additionStart=null;
 if(s.phase!=='sum'||busy)return;
 const dx=e.clientX-p.x,dy=e.clientY-p.y;
 if(dy>32&&Math.abs(dy)>Math.abs(dx)*.67)playCascadeAddition();
});
window.addEventListener('pointercancel',()=>{additionStart=null});
$('jumpAddition').addEventListener('click',startAdditionLab);
$('runMerge').addEventListener('click',()=>playCascadeAddition());

window.__BATCH_FREEFLOW__={liftTens,get:()=>structuredClone(s),reset:()=>reset(),jumpAddition:startAdditionLab,setAdditionMode,playVerticalAddition,playHorizontalAddition,playCascadeAddition,cases:allCases,setVisual:v=>{visual=v;render()},setProblem:(a,b)=>{$('problem').value=`${a},${b}`;reset()},toggleTutorial:()=>{$('tutorialToggle').click()},setMultMode:v=>{document.querySelector(`[data-mult-mode="${v}"]`)?.click()},replayMult:()=>{$('replayMult').click()},revealProduct,setArraySpeed:v=>{const slider=$('arraySpeed');slider.value=String(v);slider.dispatchEvent(new Event('input',{bubbles:true}));slider.dispatchEvent(new Event('change',{bubbles:true}))},select:(kind,c)=>operand(kind,c),choose:part=>chooseTile(part),place:(part,kind,c)=>place(part,kind,c),mix:addCarry,armCarry,sum};

