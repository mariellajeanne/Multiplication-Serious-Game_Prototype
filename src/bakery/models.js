import * as T from '../../assets/vendor/three.module.min.js';
import './layout.js';
const C=globalThis.BakeryLayout.palette;

export function createModelKit() {
  const gradient = new T.DataTexture(new Uint8Array([105,185,255]),3,1,T.RedFormat);
  gradient.minFilter=gradient.magFilter=T.NearestFilter;gradient.needsUpdate=true;
  const materials=new Map(),geometries=new Map();
  const glass=new T.MeshPhongMaterial({color:C.glass,transparent:true,opacity:.07,shininess:95,depthWrite:false,side:T.DoubleSide});
  const geometry=(key,make)=>{if(!geometries.has(key))geometries.set(key,make());return geometries.get(key)};
  function material(color){if(!materials.has(color))materials.set(color,new T.MeshToonMaterial({color,gradientMap:gradient}));return materials.get(color)}
  function mesh(parent,geo,color,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=new T.Mesh(geo,material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m}
  const box=(p,x,y,z,w,h,d,c)=>mesh(p,geometry('box',()=>new T.BoxGeometry(1,1,1)),c,x,y,z,w,h,d);
  const ball=(p,x,y,z,w,h,d,c)=>mesh(p,geometry('ball',()=>new T.SphereGeometry(1,20,12)),c,x,y,z,w,h,d);
  const cylinder=(p,x,y,z,r,h,c,rt=r)=>mesh(p,geometry(`cyl-${rt/r}`,()=>new T.CylinderGeometry(rt/r,1,1,24)),c,x,y,z,r,h,r);
  const torus=(p,x,y,z,r,t,c)=>{const m=mesh(p,geometry('torus',()=>new T.TorusGeometry(1,.18,8,28)),c,x,y,z,r,r,r);m.rotation.x=-Math.PI/2;return m};
  function plate(p){cylinder(p,0,-.59,0,.89,.06,0xe9b77d);cylinder(p,0,-.54,0,.82,.045,0xfff3d9);torus(p,0,-.51,0,.77,.03,0xffd696)}
  function food(id,rarity=0) {
    const p=new T.Group();
    // A recessed compartment with a real support shelf and thin glass panes.
    box(p,0,-.66,0,2.2,.08,1.55,C.lightWood);
    box(p,0,.15,-.73,2.2,1.7,.06,0xe8c18b);
    for(const x of [-1.08,1.08]){const side=new T.Mesh(geometry('glass-side',()=>new T.BoxGeometry(.018,1.7,1.48)),glass);side.position.set(x,.15,0);p.add(side)}
    const pane=new T.Mesh(geometry('glass-front',()=>new T.PlaneGeometry(2.16,1.7)),glass);pane.position.set(0,.15,.75);p.add(pane);
    plate(p);
    const purple=id.includes('ube'),dough=purple?0xb18bd0:0xe8a248,crumb=purple?0xddd0ec:0xffd896;
    if(id.includes('ensaymada')){
      ball(p,0,-.17,0,.68,.37,.61,dough);
      for(let i=0;i<3;i++)torus(p,0,.07+i*.075,0,.47-i*.12,.06,purple?0xd0a2df:0xffd978);
      for(let i=0;i<18;i++){const a=i*2.4,r=.44*Math.sqrt(i/18);const m=box(p,Math.cos(a)*r,.29+(.45-r)*.1,Math.sin(a)*r,.19,.035,.045,0xffedaa);m.rotation.y=a}
    }else if(id.includes('hopia')||id.includes('pie')){
      cylinder(p,0,-.24,0,.65,.43,crumb,.92*.65);cylinder(p,0,-.01,0,.59,.025,dough);
      for(let i=-1;i<=1;i++){const m=box(p,i*.24,.015,0,.045,.012,1.02,0xc37d3e);m.rotation.y=.5}
    }else if(id==='pianono'||id==='brazo'||id==='kalihim'){
      const roll=cylinder(p,0,-.14,0,.4,1.18,crumb);roll.rotation.z=Math.PI/2;
      for(let i=0;i<3;i++){const ring=torus(p,.6,-.14,0,.31-i*.09,.04,id==='kalihim'?0xdf7182:0xeeb559);ring.rotation.set(0,Math.PI/2,0)}
    }else if(id.includes('mamon')||id==='kababayan'){
      cylinder(p,0,-.29,0,.5,.43,0xd89650,.68);ball(p,0,-.01,0,.66,.24,.65,crumb);
      if(id==='butter-mamon')box(p,0,.22,0,.25,.06,.25,0xffdd73);
    }else if(id==='spanish-bread'){
      for(let i=-2;i<=2;i++){const m=ball(p,i*.23,-.16+(.12-Math.abs(i)*.055),0,.25,.28,.37,dough);m.rotation.z=-i*.18}
    }else if(id==='monay'){
      ball(p,-.27,-.15,0,.39,.38,.54,dough);ball(p,.27,-.15,0,.39,.38,.54,dough);
      box(p,0,.11,0,.025,.03,.65,crumb);
    }else{
      for(const [x,z] of [[-.32,.2],[.31,.23],[0,-.29]]){
        ball(p,x,-.21,z,.34,.3,.33,dough);
        if(id==='pan-de-coco')ball(p,x,.035,z,.09,.035,.08,0x9b6139);
        else for(let i=0;i<7;i++)ball(p,x+Math.sin(i*2.4)*.22,.045-Math.abs(Math.sin(i))*.05,z+Math.cos(i*2.4)*.2,.025,.012,.024,id==='cheese-bread'?0xffdc72:crumb);
      }
    }
    if(rarity>=4){const ring=torus(p,0,-.48,0,.86,.03,rarity>=6?0xd7a6e9:C.gold);ring.scale.y=.025}
    return p;
  }
  function packageModel(rank){
    const p=new T.Group(),colors=[0xd6a464,0xffdeb3,0xe7979a,0xc08750,0xd388a1,0xba6883,0xa997d6,0xc45d61,0xeebd47],color=colors[rank];
    if(rank===0){box(p,0,-.03,0,.9,1.12,.65,color);box(p,0,.53,0,.98,.12,.72,0xeac58b);for(let i=-2;i<=2;i++)box(p,i*.18,.6,.38,.12,.1,.04,0xffdba5)}
    else{box(p,0,-.11,0,1.06,.85,.83,color);box(p,0,.34,0,1.17,.17,.92,rank>=7?0xffd371:0xffdabb);
      if(rank===2)for(let i=-2;i<=2;i++)box(p,i*.2,.44,.02,.08,.07,.96,0xe38899);
      if(rank>=7)ball(p,0,.44,0,.55,.24,.43,color);
      if(rank<3){const handle=torus(p,0,.65,0,.26,.05,color);handle.rotation.x=0;handle.scale.y=.7;}
      else{box(p,0,0,.44,.16,.95,.035,0xffdda0);box(p,0,.44,0,.16,.035,.9,0xffdda0);
        if(rank<7)for(const s of [-1,1]){const bow=torus(p,s*.2,.55,0,.22,.05,rank>5?0xffce65:0xffdab0);bow.rotation.x=-1.15;bow.rotation.z=s*.25;bow.scale.y=.6}}
    }
    ball(p,0,-.02,.45,.18,.14,.025,rank>5?0xb686dc:0xf6c967);
    if(rank>=7){for(const x of [-.48,.48])box(p,x,-.07,.45,.06,.76,.03,C.gold)}
    if(rank===8){for(let i=-1;i<=1;i++){const crown=mesh(p,geometry('gem',()=>new T.OctahedronGeometry(1)),0xffe194,i*.24,.87,0,.12,.23,.12)}box(p,0,.69,0,.7,.1,.3,C.gold)}
    return p;
  }
  function register(){const p=new T.Group();box(p,0,.16,0,2.1,.32,1.25,0xba7273);
    const wedge=geometry('register-wedge',()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([
      -.98,.28,.58,.98,.28,.58,.98,.28,-.5,-.98,.28,-.5,
      -.98,.5,.58,.98,.5,.58,.98,.9,-.5,-.98,.9,-.5],3));
      g.setIndex([0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7,4,5,6,4,6,7,3,2,1,3,1,0]);g.computeVertexNormals();return g});mesh(p,wedge,C.pink);
    for(let i=0;i<12;i++){const z=-.22+Math.floor(i/3)*.19,y=.9-.4*(z+.5)/1.08+.055;
      const key=box(p,.06+(i%3)*.23,y,z,.19,.08,.15,i<9?0xffd188:0x835954);key.rotation.x=.35;}
    const screen=box(p,.4,1.25,-.37,.96,.65,.16,0xf1b5a7);screen.rotation.x=-.16;const glass=box(p,.4,1.27,-.25,.79,.47,.025,0x4f6666);glass.rotation.x=-.16;
    const roll=cylinder(p,-.57,.89,-.31,.15,.52,0xfff1d4);roll.rotation.z=Math.PI/2;
    const paper=box(p,-.57,.77,-.02,.51,.015,.4,0xfff1d4);paper.rotation.x=.35;
    box(p,0,.18,.64,1.73,.24,.025,0xd28a85);ball(p,.1,.18,.67,.05,.05,.025,C.gold);return p}
  return {box,ball,cylinder,torus,material,food,packageModel,register,dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());glass.dispose();gradient.dispose()}};
}
