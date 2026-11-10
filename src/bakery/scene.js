import * as T from '../../assets/vendor/three.module.min.js';
import {createModelKit} from './models.js';
import './layout.js';
const C=globalThis.BakeryLayout.palette;

// One renderer, scissored model views, shared geometry/materials; render only on changes.
export function createBakeryScene(host) {
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.info.autoReset=false;
  renderer.setClearColor(C.wall,1);renderer.autoClear=false;host.prepend(renderer.domElement);
  const kit=createModelKit(),room=new T.Scene(),architecture=new T.Group();room.add(architecture);
  const camera=new T.OrthographicCamera(-10,10,6,-6,.1,150);camera.position.set(0,14,40);camera.lookAt(0,0,0);
  function light(scene){scene.add(new T.HemisphereLight(0xfff3db,0x936248,.95));const sun=new T.DirectionalLight(0xffecd2,1.8);sun.position.set(-5,12,14);scene.add(sun)}
  light(room);
  const objects=new Map();let pending=false,lastKey='',disposed=false;
  const plane=new T.Plane(new T.Vector3(0,0,1),0),ray=new T.Raycaster();
  function point(x,y,z=0){ray.setFromCamera(new T.Vector2(x/1000-1,1-y/600),camera);const v=new T.Vector3();ray.ray.intersectPlane(plane,v);v.z=z;return v}
  function slab(parent,x,y,w,h,d,color,z=0){const p=point(x,y,z);return kit.box(parent,p.x,p.y,p.z,w/100,h/100,d,color)}
  function roundSlab(parent,x,y,w,h,d,color,z=0,r=.18){
    const shape=new T.Shape(),a=w/200,b=h/200;shape.moveTo(-a+r,-b);shape.lineTo(a-r,-b);shape.quadraticCurveTo(a,-b,a,-b+r);shape.lineTo(a,b-r);shape.quadraticCurveTo(a,b,a-r,b);shape.lineTo(-a+r,b);shape.quadraticCurveTo(-a,b,-a,b-r);shape.lineTo(-a,-b+r);shape.quadraticCurveTo(-a,-b,-a+r,-b);
    const geo=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1,curveSegments:6});
    const m=new T.Mesh(geo,kit.material(color));m.position.copy(point(x,y,z));parent.add(m);return m;
  }
  function plant(x,y,scale=1){const p=new T.Group();p.position.copy(point(x,y,1.25));p.scale.setScalar(scale);architecture.add(p);
    kit.cylinder(p,0,0,0,.32,.55,0xd69466,.4);kit.cylinder(p,0,.28,0,.42,.07,0xffd2a1);
    for(let i=0;i<9;i++){const a=i*2.4,leaf=kit.ball(p,Math.sin(a)*.3,.6+(i%3)*.16,Math.cos(a)*.24,.13,.48,.07,i%2?0x7b9651:0xaab65c);leaf.rotation.z=-Math.sin(a)*.75;leaf.rotation.x=Math.cos(a)*.5}
  }
  function frame(x,y,w,h,color=C.wood){slab(architecture,x,y,w,h,.2,C.edge,-.4);slab(architecture,x,y,w-22,h-24,.12,color,-.23);
    for(const s of [-1,1])slab(architecture,x+s*(w/2-8),y,16,h,.65,C.lightWood,.02);
    for(const s of [-1,1])slab(architecture,x,y+s*(h/2-8),w,16,.65,C.lightWood,.02)}
  function buildRoom(count=1){
    // Custom cabinet extrusions are released when its equipped count changes.
    architecture.traverse(o=>{if(o.isMesh&&o.geometry.type==='ExtrudeGeometry')o.geometry.dispose()});architecture.clear();
    slab(architecture,1000,600,2200,1500,.3,C.wall,-.8);
    slab(architecture,1000,740,2200,210,.2,0xe8b58d,-.58);
    for(let x=10;x<2100;x+=170)slab(architecture,x,400,3,950,.03,0xd7a087,-.6);
    slab(architecture,1000,31,2100,55,.55,C.lightWood,0);
    // Daylight and its deep wooden reveal sit behind the board/register.
    roundSlab(architecture,1930,434,350,650,.18,C.edge,-.48,.9);
    roundSlab(architecture,1930,428,310,608,.12,0xa9d8dd,-.25,.85);
    roundSlab(architecture,1930,452,278,546,.05,0xf7e4a9,-.08,.8);
    for(const yy of [377,540])slab(architecture,1930,yy,315,14,.23,C.lightWood,.05);
    slab(architecture,1925,430,14,600,.25,C.lightWood,.05);slab(architecture,1915,754,390,32,.65,C.wood,.05);
    // Shelf back, substantial sides, and three continuous shelf boards.
    frame(270,569,440,663,0x9f6039);
    slab(architecture,57,565,31,690,1.1,C.wood,.16);slab(architecture,485,565,27,690,1.1,C.edge,.16);
    for(const yy of [470,677,885]){slab(architecture,271,yy,448,21,1.25,C.wood,.1);slab(architecture,271,yy-9,448,6,1.28,0xe9ae6d,.12)}
    // Stationary cabinet shell follows the exact HTML compartment viewport.
    const bounds=host.getBoundingClientRect(),cabinet=document.querySelector('.showcase-cabinet')?.getBoundingClientRect();
    const w=cabinet?cabinet.width/bounds.width*2000:750,h=cabinet?cabinet.height/bounds.height*1200:530;
    const cy=cabinet?(cabinet.top-bounds.top+cabinet.height/2)/bounds.height*1200:646;
    roundSlab(architecture,1000,cy,w+32,h+38,.25,C.edge,-.28,.3);
    roundSlab(architecture,1000,cy,w,h,.1,0x986740,-.02,.25);
    roundSlab(architecture,1000,cy,w-22,h-24,.06,0xe4ba87,.12,.2);
    for(const s of [-1,1])slab(architecture,1000+s*(w/2-9),cy,17,h-14,.6,C.lightWood,.3);
    // Physical order board; HTML tickets sit in the inset.
    frame(1595,496,398,540,0x995b37);
    roundSlab(architecture,1595,221,105,37,.2,C.gold,.2,.08);
    // Counter has one continuous top; register feet touch its surface.
    slab(architecture,1000,1070,2200,300,1.6,0xa8663d,1.25);
    for(let x=20;x<2100;x+=68)slab(architecture,x,1080,3,270,.01,0x8c502e,2.06);
    slab(architecture,1000,949,2200,36,2.8,C.edge,1.15);slab(architecture,1000,930,2200,32,2.9,0xe5a267,1.15);
    slab(architecture,1000,916,2200,7,2.93,0xf6c488,1.15);
    const register=kit.register();register.position.copy(point(1640,915,1.18));register.scale.setScalar(1.32);architecture.add(register);
    // A small service bell on the same continuous tabletop.
    const bell=new T.Group();bell.position.copy(point(1855,918,1.5));architecture.add(bell);kit.cylinder(bell,0,.04,0,.42,.08,C.cocoa);kit.ball(bell,0,.2,0,.31,.22,.31,C.gold);kit.ball(bell,0,.44,0,.065,.07,.065,0xffe69a);
    for(const x of [395,1470]){const p=new T.Group();p.position.copy(point(x,83,.3));architecture.add(p);kit.cylinder(p,0,1,0,.035,1.8,C.edge);kit.cylinder(p,0,.02,0,.65,.65,0xb97744,.18);kit.cylinder(p,0,-.32,0,.62,.035,0xffe2a1)}
    slab(architecture,75,248,210,18,1.55,C.wood,.7);
    plant(75,207,1.7);plant(1950,747,.95);plant(1920,1135,1.7);
    // Left foreground tray of freshly baked rolls, resting on the counter.
    const basket=new T.Group();basket.position.copy(point(100,962,2.2));architecture.add(basket);kit.cylinder(basket,0,-.1,0,1,.4,0xc38a48,1.12);
    for(let i=0;i<7;i++)kit.ball(basket,Math.sin(i*2.4)*.68,.22,Math.cos(i*2.4)*.55,.37,.29,.37,i%2?0xe9ad52:0xffce78);
  }
  function sync(){if(disposed||document.body.classList.contains('hub-working'))return;const count=document.querySelectorAll('.hub-food').length;const key=count+'|'+host.clientWidth;if(key!==lastKey){lastKey=key;buildRoom(count)}schedule()}
  function schedule(){if(!pending&&!disposed){pending=true;requestAnimationFrame(draw)}}
  function draw(){
    pending=false;if(disposed||host.hidden||document.body.dataset.view!=='hub')return;
    const bounds=host.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
    if(renderer.domElement.width!==Math.round(bounds.width*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(bounds.height*renderer.getPixelRatio()))renderer.setSize(bounds.width,bounds.height,false);
    renderer.info.reset();renderer.setScissorTest(false);renderer.setViewport(0,0,bounds.width,bounds.height);renderer.clear();renderer.render(room,camera);
    const active=new Set();const nodes=[...document.querySelectorAll('.hub-food,.hub-package')];
    for(const node of nodes){
      const food=node.classList.contains('hub-food'),id=food?node.dataset.food:node.dataset.rank,key=(food?'food-':'package-')+id;active.add(key);
      const r=node.getBoundingClientRect(),clip=(food?node.closest('.showcase-scroll'):node.closest('.hub-package-grid')).getBoundingClientRect();
      // Model viewport occupies the physical cell above its multiplier/number tag.
      const top=r.top+4,bottom=r.bottom-r.height*(food?.18:.22),left=r.left+4,right=r.right-4;
      const cl=Math.max(left,clip.left),cr=Math.min(right,clip.right),ct=Math.max(top,clip.top),cb=Math.min(bottom,clip.bottom);
      if(cr<=cl||cb<=ct)continue;
      let view=objects.get(key);
      if(!view){const scene=new T.Scene();light(scene);const model=food?kit.food(id,Number(node.dataset.rarity)):kit.packageModel(Number(id));model.position.y=food?-.04:-.23;scene.add(model);
        const cam=new T.OrthographicCamera(-1.2,1.2,1.15,-1.15,.1,30);cam.position.set(2,2.3,8);cam.lookAt(0,0,0);cam.zoom=food?1.35:1.05;view={scene,cam};objects.set(key,view)}
      const aspect=(right-left)/(bottom-top);view.cam.left=-1.13*aspect;view.cam.right=1.13*aspect;view.cam.updateProjectionMatrix();
      renderer.setViewport(left-bounds.left,bounds.bottom-bottom,right-left,bottom-top);renderer.setScissor(cl-bounds.left,bounds.bottom-cb,cr-cl,cb-ct);renderer.setScissorTest(true);renderer.clearDepth();renderer.render(view.scene,view.cam);
    }
    for(const key of objects.keys())if(!active.has(key))objects.delete(key);
    renderer.setScissorTest(false);host.dataset.rendered='true';host.dataset.drawCalls=renderer.info.render.calls;
  }
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();host.dataset.rendered='false';document.body.classList.add('hub-fallback')});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{document.body.classList.remove('hub-fallback');schedule()});
  const resize=new ResizeObserver(sync);resize.observe(host);document.addEventListener('scroll',schedule,true);window.addEventListener('bakery:sync',sync);window.addEventListener('resize',sync);
  sync();return {sync,dispose(){disposed=true;resize.disconnect();document.removeEventListener('scroll',schedule,true);window.removeEventListener('bakery:sync',sync);window.removeEventListener('resize',sync);kit.dispose();renderer.dispose()}};
}
