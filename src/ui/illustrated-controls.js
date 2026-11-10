/* Native scroll containers with illustrated, synchronized controls. No game state. */
function bindIllustratedScrollbars(root){
 const cleanups=[],updates=[];
 for(const [containerId,railId,trackId,thumbId] of [
  ['cabinet-scroll','cabinet-scrollbar','cabinet-track','cabinet-thumb'],
  ['order-scroller','board-scroll-rail','board-scroll-track','board-scroll-thumb']
 ]){
  const sc=root.querySelector('#'+containerId),rail=root.querySelector('#'+railId),track=root.querySelector('#'+trackId),thumb=root.querySelector('#'+thumbId);
  if(!sc||!rail||!track||!thumb)continue;
  const on=(el,type,fn,options)=>{el.addEventListener(type,fn,options);cleanups.push(()=>el.removeEventListener(type,fn,options))};
  const update=()=>{
   const max=Math.max(0,sc.scrollHeight-sc.clientHeight),idle=max<2;
   rail.classList.toggle('is-idle',idle);rail.setAttribute('aria-hidden',String(idle));
   rail.querySelectorAll('button,[role=scrollbar]').forEach(el=>el.tabIndex=idle?-1:0);
   // Keep fractional layout dimensions: clientHeight rounds the track and can
   // leave a visible end gap after the whole illustrated stage is scaled.
   const trackHeight=parseFloat(getComputedStyle(track).height)||track.clientHeight;
   const minimum=Math.min(trackHeight,parseFloat(getComputedStyle(thumb).minHeight)||44);
   const size=Math.max(minimum,Math.min(trackHeight,trackHeight*sc.clientHeight/Math.max(1,sc.scrollHeight)));
   thumb.style.height=size+'px';
   const thumbHeight=parseFloat(getComputedStyle(thumb).height)||size;
   const progress=max?Math.max(0,Math.min(1,sc.scrollTop/max)):0;
   // Anchor the bottom endpoint directly, eliminating subpixel rounding gaps.
   thumb.style.top=progress===1?'auto':(progress*(trackHeight-thumbHeight))+'px';
   thumb.style.bottom=progress===1?'0px':'auto';
   thumb.setAttribute('aria-valuenow',String(max?Math.round(sc.scrollTop/max*100):0));
  };
  let drag=null;
  on(track,'pointerdown',e=>{
   if(e.target===thumb||e.button!==0)return;e.preventDefault();
   const r=track.getBoundingClientRect(),h=thumb.getBoundingClientRect().height;
   sc.scrollTop=Math.max(0,Math.min(1,(e.clientY-r.top-h/2)/Math.max(1,r.height-h)))*(sc.scrollHeight-sc.clientHeight);
  });
  on(thumb,'pointerdown',e=>{
   if(e.button!==0)return;
   drag={id:e.pointerId,y:e.clientY,top:sc.scrollTop,travel:track.getBoundingClientRect().height-thumb.getBoundingClientRect().height};
   thumb.setPointerCapture(e.pointerId);e.preventDefault();
  });
  on(thumb,'pointermove',e=>{if(drag&&e.pointerId===drag.id&&drag.travel>0)sc.scrollTop=drag.top+(e.clientY-drag.y)*(sc.scrollHeight-sc.clientHeight)/drag.travel});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])on(thumb,type,()=>drag=null);
  on(thumb,'keydown',e=>{
   const steps={ArrowDown:60,ArrowUp:-60,PageDown:sc.clientHeight*.9,PageUp:-sc.clientHeight*.9};
   if(e.key==='Home'){e.preventDefault();sc.scrollTop=0}
   else if(e.key==='End'){e.preventDefault();sc.scrollTop=sc.scrollHeight}
   else if(e.key in steps){e.preventDefault();sc.scrollTop+=steps[e.key]}
  });
  on(sc,'scroll',update,{passive:true});updates.push(update);
  if(typeof ResizeObserver!=='undefined'){
   const observer=new ResizeObserver(update);observer.observe(sc);observer.observe(track);if(sc.firstElementChild)observer.observe(sc.firstElementChild);
   cleanups.push(()=>observer.disconnect());
  }
 }
 const update=()=>updates.forEach(fn=>fn());requestAnimationFrame(update);
 return {update,destroy:()=>cleanups.forEach(fn=>fn())};
}
