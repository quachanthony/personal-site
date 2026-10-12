/* The plan: an empty Sprinter drives in, its roof lifts off, and the build drops into it. Same isometric ink as assembly.js. */
(()=>{
const section=document.querySelector('.van-plan');
if(!section)return;
const sheet=section.querySelector('.assembly-sheet'),svg=sheet.querySelector('svg'),list=section.querySelector('.assembly-parts'),bars=[...section.querySelectorAll('.assembly-track i')],stepNo=section.querySelector('.assembly-step span'),stepName=section.querySelector('.assembly-step strong'),replay=section.querySelector('.van-replay');

// Isometric projection: x runs down-right, y down-left, z up. The viewer looks from +x +y +z. World units are inches.
const NS='http://www.w3.org/2000/svg',C=Math.cos(Math.PI/6),S=.5,LIGHT=[0,.12],DROP=[0,2.8];
const INK='#1c2922',PAPER='#f1f1e7',BLUE='#254bd1';
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),smooth=v=>v*v*(3-2*v),easeOut=v=>1-(1-v)**3,backOut=v=>1+2.7*(v-1)**3+1.7*(v-1)**2;
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,k)=>a.map(x=>x*k),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const unit=a=>mul(a,1/Math.hypot(...a)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const facing=n=>n[0]+n[1]+n[2]>1e-6;
const fx=n=>+n.toFixed(2),d=(pts,close=true)=>'M'+pts.map(p=>fx(p[0])+' '+fx(p[1])).join('L')+(close?'Z':'');
const rand=seed=>()=>(seed=seed*16807%2147483647)/2147483647;
const projector=f=>Object.assign(p=>[f.x+f.s*(p[0]-p[1])*C,f.y+f.s*((p[0]+p[1])*S-p[2])],{s:f.s});
const shift=(s,v)=>[s*(v[0]-v[1])*C,s*((v[0]+v[1])*S-v[2])];
const hull=pts=>{
  pts=[...pts].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const turn=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
  for(const p of pts){while(lo.length>1&&turn(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
  for(const p of pts.reverse()){while(up.length>1&&turn(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}
  return lo.slice(0,-1).concat(up.slice(0,-1));
};
// Faces turned to the light take a tone's lightest colour and blend down to its darkest, so slanted panels read as curved.
const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)),mix=(a,b,t)=>'#'+hex(a).map((v,i)=>Math.round(v+(hex(b)[i]-v)*t).toString(16).padStart(2,'0')).join('');
const SUN=unit([.2,.55,.8]),tint=(tone,n)=>{const b=dot(unit(n),SUN);return b>=.555?mix(tone[1],tone[0],clamp((b-.555)/.252)):mix(tone[2],tone[1],clamp((b-.2)/.355))};

// A pen draws in a face's own plane: (s,t) runs across edge vectors a and b from corner o.
const pen=(P,o,a,b)=>{
  const at=(s,t)=>P(add(o,add(mul(a,s),mul(b,t)))),poly=(pts,attr,close=true)=>`<path ${attr} d="${d(pts.map(q=>at(q[0],q[1])),close)}"/>`;
  const ell=(cs,ct,rs,rt,attr,a0=0,a1=360)=>{const pts=[];for(let i=0;i<=28;i++){const t=(a0+(a1-a0)*i/28)*Math.PI/180;pts.push([cs+rs*Math.cos(t),ct+rt*Math.sin(t)])}return poly(pts,attr)};
  return{poly,ell,rect:(s0,t0,s1,t1,attr)=>poly([[s0,t0],[s1,t0],[s1,t1],[s0,t1]],attr),line:(pts,attr)=>poly(pts,attr,false)};
};
// World-space paths, for details that don't sit on one box face.
const wp=(P,pts,attr,close=true)=>`<path ${attr} d="${d(pts.map(P),close)}"/>`;
const line=(c,w=1)=>`fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" vector-effect="non-scaling-stroke"`;
const grain=(p,a,b,color,seed)=>{
  const la=Math.hypot(...a),lb=Math.hypot(...b),along=la>=lb,short=Math.min(la,lb),long=Math.max(la,lb);
  if(short<3)return'';
  const r=rand(seed),n=Math.min(3,Math.round(short/8)||1);let out='';
  for(let i=0;i<n;i++){
    const base=(i+.5+(r()-.5)*.6)/n,amp=.45/short,ph=r()*6,fr=long/(9+r()*8),pts=[];
    for(let j=0;j<=14;j++){const u=.04+.92*j/14,w=base+amp*Math.sin(u*fr+ph);pts.push(along?[u,w]:[w,u])}
    out+=p.line(pts,`class="g" stroke="${color}"`);
  }
  return out;
};

// Primitives: boxes, cylinders, convex solids, and flat sprites drawn around a projected anchor.
let seeds=1,clips=0;
const box=(o,size,tone,opt={})=>({type:'box',o,u:[size[0],0,0],v:[0,size[1],0],w:[0,0,size[2]],tone,faces:{},seed:seeds++*7,...opt});
const faces=({o,u,v,w})=>[['+w',add(o,w),u,v,w],['+u',add(o,u),v,w,u],['+v',add(o,v),u,w,v],['-w',o,u,v,mul(w,-1)],['-u',o,v,w,mul(u,-1)],['-v',o,u,w,mul(v,-1)]];
const corners=({o,u,v,w})=>[0,1].flatMap(i=>[0,1].flatMap(j=>[0,1].map(k=>add(o,add(mul(u,i),add(mul(v,j),mul(w,k)))))));
const basis=a=>{const n=unit(a),e=unit(cross(n,Math.abs(n[2])<.9?[0,0,1]:[1,0,0]));return[e,cross(n,e)]};
const ring=(c,e1,e2,r,n=36)=>Array.from({length:n},(_,i)=>{const t=i/n*Math.PI*2;return add(c,add(mul(e1,r*Math.cos(t)),mul(e2,r*Math.sin(t))))});
// A convex solid is a big cube cut down by half-spaces n·p ≤ d; each face remembers the cut that made it, so it can be decorated.
const half=(n,p,id='')=>{n=unit(n);return{n,d:dot(n,p),id}};
const cut=(ax,v,below,id)=>{const n=[0,0,0],o=[0,0,0];n[ax]=below?1:-1;o[ax]=v;return half(n,o,id)};
// An extruded outline: a counter-clockwise polygon in the (a,b) axes, one half-space per edge.
const outline=(poly,[a,b],ids)=>poly.map((p,i)=>{const q=poly[(i+1)%poly.length],n=[0,0,0],o=[0,0,0];n[a]=q[1]-p[1];n[b]=p[0]-q[0];o[a]=p[0];o[b]=p[1];return half(n,o,ids[i])});
const clip=(fs,{n,d:k,id})=>{
  const v=p=>dot(n,p)-k,E=1e-7;
  if(!fs.some(f=>f.pts.some(p=>v(p)>E)))return fs;
  const cap=[],out=[];
  fs.forEach(f=>{
    const pts=[];
    f.pts.forEach((p,i)=>{
      const q=f.pts[(i+1)%f.pts.length],a=v(p),b=v(q);
      if(a<=E)pts.push(p);
      if(Math.abs(a)<=E)cap.push(p);
      if((a<-E&&b>E)||(a>E&&b<-E)){const r=add(p,mul(sub(q,p),a/(a-b)));pts.push(r);cap.push(r)}
    });
    if(pts.length>2)out.push({...f,pts});
  });
  const u=[];cap.forEach(p=>{if(!u.some(q=>Math.hypot(...sub(p,q))<1e-5))u.push(p)});
  if(u.length>2){
    const c=mul(u.reduce(add),1/u.length),[e1,e2]=basis(n),ang=p=>Math.atan2(dot(sub(p,c),e2),dot(sub(p,c),e1));
    out.push({id,n,pts:u.sort((a,b)=>ang(a)-ang(b))});
  }
  return out;
};
const cube=faces(box([-400,-400,-400],[800,800,800])).map(([,o,a,b,n])=>({id:'',n:unit(n),pts:[o,add(o,a),add(add(o,a),b),add(o,b)]}));
const solid=(planes,tone,opt={})=>({type:'solid',faces:planes.reduce(clip,cube),tone,deco:{},hide:[],...opt});
const lifted=(k,v)=>({...k,faces:k.faces.map(f=>({...f,pts:f.pts.map(p=>add(p,v))}))});
const points=k=>{
  if(k.type==='box')return corners(k);
  if(k.type==='solid')return k.faces.flatMap(f=>f.pts);
  if(k.type==='cyl'){const[e1,e2]=basis(k.a);return[...ring(k.c,e1,e2,k.r),...ring(add(k.c,k.a),e1,e2,k.r)]}
  if(k.type==='sprite'){const[x,y,z]=k.at,[hx,hy,h]=k.size;return corners({o:[x-hx,y-hy,z],u:[hx*2,0,0],v:[0,hy*2,0],w:[0,0,h]})}
  return k.pts;
};
const draw=(k,P)=>{
  if(k.type==='box')return faces(k).filter(f=>facing(f[4])).map(([key,o,a,b,n])=>{
    const face=typeof k.faces[key]==='function'?{deco:k.faces[key]}:k.faces[key]||{},p=pen(P,o,a,b);
    const fill=`class="o" fill="${face.fill||tint(k.tone,n)}"`;
    return(face.shape?face.shape.map(q=>p.poly(q,fill)).join(''):p.rect(0,0,1,1,fill))+(k.grain&&!face.fill?grain(p,a,b,k.grain,k.seed+key.charCodeAt(1)):'')+(face.deco?face.deco(p):'');
  }).join('');
  // Solid faces never overlap each other; decorations are clipped to their face, then the face is re-inked.
  if(k.type==='solid')return k.faces.filter(f=>facing(f.n)&&!k.hide.includes(f.id)).map(f=>{
    const path=d(f.pts.map(P)),deco=k.deco[f.id];
    if(k.glass)return`<path ${k.glass(f)} d="${path}"/>`;
    const col=k.fills&&k.fills[f.id]||tint(k.tone,f.n);
    if(!deco)return`<path class="o" fill="${col}" d="${path}"/>`;
    const id='van-clip-'+clips++;
    return`<path fill="${col}" d="${path}"/><clipPath id="${id}"><path d="${path}"/></clipPath><g clip-path="url(#${id})">${deco(P)}</g><path class="o" fill="none" d="${path}"/>`;
  }).join('');
  if(k.type==='cyl'){
    const[e1,e2]=basis(k.a),c=facing(k.a)?add(k.c,k.a):k.c;
    return`<path class="o" fill="${k.tone[1]}" d="${d(hull(points(k).map(P)))}"/><path class="o" fill="${k.tone[0]}" d="${d(ring(c,e1,e2,k.r).map(P))}"/>`+(k.cap?k.cap(pen(P,c,mul(e1,k.r),mul(e2,k.r))):'');
  }
  if(k.type==='sprite'){const[x,y]=P(k.at);return`<g transform="translate(${fx(x)} ${fx(y)}) scale(${fx(P.s)})">${k.draw(1/P.s)}</g>`}
  return k.draw(P);
};
const aabb=prims=>{const b=[1/0,1/0,1/0,-1/0,-1/0,-1/0];prims.forEach(k=>points(k).forEach(p=>p.forEach((x,i)=>{b[i]=Math.min(b[i],x);b[i+3]=Math.max(b[i+3],x)})));return b};
const box2=(pts,b=[1/0,1/0,-1/0,-1/0])=>{pts.forEach(([x,y])=>{b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y)});return b};
const sbox=(prims,P)=>box2(prims.flatMap(k=>points(k).map(P)));

// Back-to-front order: a piece is behind another when the two are separated along any axis.
const overlaps=(a,b)=>a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3];
const behind=(a,b)=>a[3]<=b[0]+.01||a[4]<=b[1]+.01||a[5]<=b[2]+.01;
const depthSort=ms=>{
  const n=ms.length,next=ms.map(()=>[]),deg=new Array(n).fill(0),used=new Array(n).fill(false),out=[];
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
    if(!overlaps(ms[i].scr,ms[j].scr))continue;
    const ab=behind(ms[i].box,ms[j].box),ba=behind(ms[j].box,ms[i].box);
    if(ab===ba)continue;
    const[p,q]=ab?[i,j]:[j,i];next[p].push(q);deg[q]++;
  }
  for(let k=0;k<n;k++){let pick=deg.findIndex((g,i)=>!used[i]&&g<=0);if(pick<0)pick=used.indexOf(false);used[pick]=true;out.push(ms[pick]);next[pick].forEach(q=>deg[q]--)}
  return out;
};

// The van: a low-roof Sprinter 2500. Rear doors at x=0 (far, upper left), nose at x=232 (near, lower right),
// driver side at y=0 (far), passenger side with the sliding door at y=79 (facing the viewer).
const WHITE=['#fbfaf4','#ecebe1','#d3d3c8'],TRIM=['#5d6560','#4a524d','#3c433f'],BLACK=['#3a403c','#2b302d','#222724'],STEEL=['#dfe2de','#c6cac5','#afb3ae'];
const SEAT=['#8b928d','#79807b','#676e69'],DASH=['#6b726d','#5a615c','#4a514c'],GLASS='#26343a',SHINE='#3d5059';
const FLOOR=30,BELT=58,ROOF=96,CUT=145,TOPCUT=91,LIFT=50,LID=ROOF+LIFT,AXLES=[55,200],WR=14.5;
// Three outlines carve the body: the cross-section (sides lean in above the beltline, rounded roof edges),
// the side profile (raked windshield, short hood) and the plan (tapered nose).
const CROSS=[[1,12],[78,12],[79,16],[79,58],[76.5,88],[72,94],[66,96],[13,96],[7,94],[2.5,88],[0,58],[0,16]];
const CROSS_IDS=['under','tuckN','sideN','slopeN','shoulderN','edgeN','roof','edgeF','shoulderF','slopeF','sideF','tuckF'];
const BODY=[[0,12],[190,12],[190,57],[162,87],[156,93],[149,96],[3,96],[0,93]];
const BODY_IDS=['under','noseCut','windshield','brow','brow','roof','rearTop','rear'];
const NOSE=[[190,12],[232,12],[232,28],[231,40],[228,47],[221,52],[190,57]];
const NOSE_IDS=['under','bumper','grille','lamps','bonnet','hood','back'];
const PLAN=[[0,2],[2,0],[218,0],[232,10],[232,69],[218,79],[2,79],[0,77]];
const PLAN_IDS=['rear','sideF','cornerF','front','cornerN','sideN','rear','rear'];
const SHELL=[...outline(CROSS,[1,2],CROSS_IDS),...outline(BODY,[0,2],BODY_IDS),...outline(PLAN,[0,1],PLAN_IDS)];
const NOSE_HS=[...outline(CROSS,[1,2],CROSS_IDS),...outline(NOSE,[0,2],NOSE_IDS),...outline(PLAN,[0,1],PLAN_IDS)];
const yN=z=>z<=BELT?79:79-2.5*(z-BELT)/30,yF=z=>z<=BELT?0:2.5*(z-BELT)/30;
const fill=c=>`fill="${c}"`,inked=c=>`class="o" fill="${c}"`;
const disc=(P,c,a,b,attr)=>pen(P,c,a,b).ell(0,0,1,1,attr);
const onSide=(x0,x1,z0,z1,attr)=>P=>wp(P,[[x0,79.05,z0],[x1,79.05,z0],[x1,79.05,z1],[x0,79.05,z1]],attr);
const arch=X=>P=>disc(P,[X,79.05,WR],[17,0,0],[0,0,17],fill('#262b28'));
const seam=(pts)=>P=>wp(P,pts,line(INK,.8),false);
const all=(...fs)=>P=>fs.map(f=>f(P)).join('');

const lowerSide=all(onSide(0,232,10,17,fill(TRIM[1])),onSide(0,232,25.5,31,fill(TRIM[0])),arch(AXLES[0]),arch(AXLES[1]),seam([[94,79.05,17],[94,79.05,31]]),seam([[143,79.05,17],[143,79.05,31]]));
const lower=solid([...SHELL,cut(2,FLOOR,true,'floor')],WHITE,{deco:{sideN:lowerSide,tuckN:lowerSide,
  floor:P=>[...Array(7)].map((_,i)=>wp(P,[[3,12+i*9.5,FLOOR+.05],[CUT,12+i*9.5,FLOOR+.05]],line('#b9bbb0'),false)).join('')}});
// The two far walls are seen from inside: the rear doors with their windows, and the bare driver side with its window.
const rearWall=solid([...SHELL,cut(0,3,true,'inside'),cut(2,FLOOR,false),cut(2,TOPCUT,true)],WHITE,{deco:{inside:P=>
  seam([[3.05,39.5,FLOOR],[3.05,39.5,TOPCUT]])(P)+[[7,36],[43,72]].map(([a,b])=>wp(P,[[3.05,a,62],[3.05,b,62],[3.05,b,86],[3.05,a,86]],inked(GLASS))+wp(P,[[3.05,a+4,62],[3.05,a+10,62],[3.05,a+20,86],[3.05,a+14,86]],fill(SHINE))).join('')}});
const farLow=solid([...SHELL,cut(0,3,false),cut(0,CUT,true),cut(2,FLOOR,false),cut(2,BELT,true),cut(1,3,true)],WHITE);
const fz=(x,z)=>[x,3+yF(z)+.05,z];
const farUp=solid([...SHELL,cut(0,3,false),cut(0,CUT,true),cut(2,BELT,false),cut(2,TOPCUT,true),half([0,30,-2.5],[0,3,BELT],'inside')],WHITE,{deco:{inside:P=>
  wp(P,[fz(81,61),fz(138,61),fz(138,85),fz(81,85)],inked(GLASS))+wp(P,[fz(90,61),fz(101,61),fz(116,85),fz(105,85)],fill(SHINE))}});
// The cab: door panels up to the beltline, seats, wheel and dash; above the beltline it is glass.
const cabFar=solid([...SHELL,cut(0,CUT,false),cut(2,FLOOR,false),cut(2,BELT,true),cut(1,3,true)],WHITE);
const cabNear=solid([...SHELL,cut(0,CUT,false),cut(2,FLOOR,false),cut(2,BELT,true),cut(1,76,false)],WHITE,{deco:{sideN:all(
  onSide(140,200,FLOOR,33.5,fill(TRIM[0])),arch(AXLES[1]),seam([[147,79.05,FLOOR],[147,79.05,BELT]]),seam([[188,79.05,FLOOR],[188,79.05,BELT]]),P=>wp(P,[[151,79.05,53],[157,79.05,53]],line(INK,2.4),false))}});
const seat=y=>[box([152,y+2,FLOOR],[14,18,13],BLACK),box([150,y,43],[19,22,5],SEAT),{type:'box',o:[151,y,48],u:[5,0,0],v:[0,22,0],w:[-3.5,0,29],tone:SEAT,faces:{},seed:9},box([147,y+6,77],[4.5,10,7],SEAT)];
const steering={type:'custom',pts:[[164,12,58],[178,30,74]],draw:P=>wp(P,[[171,21,66],[177,21,61]],line(INK,2),false)+disc(P,[171,21,66],[0,7.5,0],mul(unit([-.45,0,1]),7.5),`fill="none" stroke="${INK}" stroke-width="${fx(P.s*1.7)}"`)};
const dash=box([172,3,FLOOR],[14,73,30],DASH);
// The nose: black bumper, grille and badge, and headlights that wrap around the corner.
const corner=(s,z)=>[218+14*s+.05,79-10*s+.05,z],grille=(y,z)=>[232.05-(z-28)/12,y,z],lamp=(y,z)=>[231.05-3*(z-40)/7,y,z];
const noseSide=all(onSide(190,240,10,28,fill(TRIM[1])),arch(AXLES[1]),P=>wp(P,[[210,79.05,43],[219,79.05,44],[219,79.05,52],[213,79.05,51]],inked('#f3f0e6'))+wp(P,[[214,79.05,37],[217.5,79.05,37],[217.5,79.05,39],[214,79.05,39]],fill('#f2a14a')));
const nose=solid(NOSE_HS,WHITE,{deco:{sideN:noseSide,tuckN:noseSide,
  cornerN:P=>wp(P,[corner(0,10),corner(1,10),corner(1,28),corner(0,28)],fill(TRIM[1]))+wp(P,[corner(.12,41),corner(1,40),corner(1,52),corner(.12,52)],inked('#f3f0e6'))+wp(P,[corner(0,40),corner(.12,41),corner(.12,52),corner(0,52)],fill('#f2a14a'))+disc(P,corner(.55,44.2),[3.2,-2.3,0],[0,0,2.6],inked('#c9d3d8')),
  bumper:P=>wp(P,[[232.05,0,10],[232.05,79,10],[232.05,79,28],[232.05,0,28]],fill(TRIM[2]))+wp(P,[[232.05,30,15.5],[232.05,49,15.5],[232.05,49,22.5],[232.05,30,22.5]],inked('#f1f1e7')),
  grille:P=>wp(P,[grille(20,29),grille(59,29),grille(59,39.5),grille(20,39.5)],inked('#2b302d'))+[32,35.5].map(z=>wp(P,[grille(22,z),grille(57,z)],line('#8a908b'),false)).join('')+disc(P,grille(39.5,34),[0,2.6,0],[-.22,0,2.6],inked('#d5d8d1')),
  lamps:P=>wp(P,[lamp(55,40.4),lamp(69.4,40.4),lamp(69.4,46.8),lamp(57,46.8)],inked('#f3f0e6'))+wp(P,[lamp(24,40.4),lamp(9.6,40.4),lamp(9.6,46.8),lamp(22,46.8)],inked('#f3f0e6'))+
    [62.5,16.5].map(y=>disc(P,lamp(y,43.6),[0,2.6,0],[-.9,0,2.3],inked('#c9d3d8'))).join('')}});
const mirror=[box([182,79,61.5],[3,6,2],BLACK),box([180,84,62],[4,4.5,12],BLACK)];
const wheel=(X,y,spin)=>({type:'cyl',c:[X,y,WR],a:[0,9,0],r:WR,tone:['#2f3532','#232825'],cap:p=>
  p.ell(0,0,.62,.62,inked('#cfd2cb'))+p.ell(0,0,.3,.3,fill('#a7aca4'))+
  [...Array(6)].map((_,i)=>{const t=spin+i*Math.PI/3;return p.ell(.45*Math.cos(t),.45*Math.sin(t),.065,.065,fill('#7d837d'))}).join('')+p.ell(0,0,.12,.12,fill('#5d635e'))});
// Phantom glass: the passenger wall and roof of the cargo area, and the cab above the beltline.
// Only the main panels get phantom lines; the rounded roof edges are glass alone, so the outline stays readable.
const ROUNDED=['shoulderN','edgeN','brow'],glass=(a,f)=>`fill="${BLUE}" fill-opacity="${a}"`+(ROUNDED.includes(f.id)?'':` stroke="${BLUE}" stroke-width="1.2" stroke-dasharray="4 4" stroke-linecap="round" vector-effect="non-scaling-stroke"`);
const dashed=`fill="none" stroke="${BLUE}" stroke-width="1.2" stroke-dasharray="4 4" stroke-linecap="round" vector-effect="non-scaling-stroke"`;
const nz=(x,z)=>[x,yN(z)+.05,z];
const phantom=[
  solid([...SHELL,cut(0,CUT,true,'cut'),cut(2,FLOOR,false,'cut')],null,{glass:f=>glass(.045,f),hide:['cut']}),
  solid([...SHELL,cut(0,CUT,false,'cut'),cut(2,BELT,false,'cut')],null,{glass:f=>glass(f.id==='windshield'?.08:.045,f),hide:['cut']}),
  {type:'custom',shadow:false,pts:[[6,79,30],[183,79,87]],draw:P=>
    wp(P,[nz(94,FLOOR),nz(94,BELT),nz(94,87),nz(143,87),nz(143,BELT),nz(143,FLOOR)],dashed,false)+
    wp(P,[nz(150,61),nz(182,61),nz(159.6,85),nz(150,85)],dashed)+
    wp(P,[nz(6,62),nz(86,62)],`fill="none" stroke="${TRIM[1]}" stroke-width="2.4" stroke-linecap="round" vector-effect="non-scaling-stroke"`,false)}];
// Until the roof comes off, the van wears its solid passenger side and cab glass, so it arrives looking like itself.
const skinSide=all(onSide(0,232,FLOOR,33.5,fill(TRIM[0])),seam([nz(94,FLOOR),nz(94,BELT),nz(94,87),nz(143,87),nz(143,BELT),nz(143,FLOOR)]),
  P=>wp(P,[nz(6,62),nz(86,62)],line(TRIM[1],2.4),false)+wp(P,[nz(92,52),nz(98,52)],line(INK,2.4),false));
const cabWindow=P=>wp(P,[nz(150,61),nz(182,61),nz(159.6,85),nz(150,85)],inked(GLASS))+wp(P,[nz(156,61),nz(163,61),nz(158,85),nz(152,85)],fill(SHINE))+seam([nz(147,BELT),nz(147,90)])(P);
const shield=(y,z)=>[190.05-(z-57)*28/30,y,z];
const skin=[
  solid([...SHELL,cut(0,CUT,true,'cut'),cut(2,FLOOR,false,'cut'),cut(2,TOPCUT,true)],WHITE,{hide:['cut'],shadow:false,deco:{sideN:skinSide,slopeN:skinSide}}),
  solid([...SHELL,cut(0,CUT,false,'cut'),cut(2,BELT,false,'cut')],WHITE,{hide:['cut'],shadow:false,fills:{windshield:GLASS},deco:{sideN:cabWindow,slopeN:cabWindow,
    windshield:P=>wp(P,[shield(16,60),shield(25,60),shield(35,84),shield(26,84)],fill(SHINE))+wp(P,[shield(52,60),shield(56,60),shield(66,84),shield(62,84)],fill(SHINE))}})];
// Once the van parks, the cargo roof lifts off as a lid; dashed guides show where it goes back.
const lidSolid=lifted(solid([...SHELL,cut(0,CUT,true,'end'),cut(2,TOPCUT,false)],WHITE,{deco:{roof:P=>[...Array(11)].map((_,i)=>wp(P,[[12+i*12,0,LID+.05],[12+i*12,79,LID+.05]],line('#d2d3c8'),false)).join('')}}),[0,0,LIFT]);
// While seated, the lid's front edge is hidden inside the cab roof.
const lid=off=>[off[2]<1-LIFT?{...lidSolid,hide:['end']}:lidSolid,{type:'custom',shadow:false,pts:[[3,2.75,ROOF],[CUT,76.25,LID]],draw:P=>
  [[3,2.75],[3,76.25],[CUT,2.75],[CUT,76.25]].map(([x,y])=>wp(P,[[x,y,TOPCUT+LIFT],[x,y,TOPCUT-off[2]]],dashed,false)).join('')}];

// Inside, from the rear doors forward. Galley by the sliding door; sink then couch along the driver side.
const BIRCH=['#f0dcb4','#e6cb9c','#d4b483'],BLOCK=['#e9bf86','#dcab6c','#c99456'],DUSTY=['#8ea3d0','#6f86bb','#5a6fa1'],BAMBOO=['#efcf98','#e0bb80','#cda66a'];
const OAK=['#e6d3ad','#d8c196','#c7ad80'],BROWN=['#8a6c58','#755a49','#614a3c'],DUVET=['#877c74','#73685f','#615750'];
const BASE=FLOOR+1.2;
const strips=(n,c)=>p=>[...Array(n)].map((_,i)=>p.line([[(i+1)/(n+1),.02],[(i+1)/(n+1),.98]],`class="g" stroke="${c}"`)).join('');
const ply=(o,s,faces={})=>box(o,s,BIRCH,{grain:'#c9a26c',faces});
const floor=box([3,3,FLOOR],[CUT-3,73,1.2],OAK,{faces:{'+w':p=>[...Array(9)].map((_,i)=>{
  const t=(i+1)/10,j=(.21+.37*i)%1;
  return p.line([[0,t],[1,t]],`class="g" stroke="#a88a5a"`)+p.line([[j,t-.1],[j,t]],`class="g" stroke="#a88a5a"`)+p.line([[(j+.5)%1,t],[(j+.5)%1,t+.1]],`class="g" stroke="#a88a5a"`);
}).join('')}});
const wells=[ply([40,3,BASE],[30,11,13]),ply([40,65,BASE],[30,11,13])];
// The bed spans wall to wall on cleats and a front beam, no legs; the space under it stays open for now.
const bed=[
  ply([3,3,52],[65,1.5,4]),ply([3,74.5,52],[65,1.5,4]),ply([68,3,49],[2,73,9]),ply([3,3,58],[67,73,2]),
  box([4,4,60],[65,71,6],DUVET,{faces:{'+w':p=>[[.18,.12,.3,.85],[.55,.15,.7,.8]].map(([a,b,c,e])=>p.line([[a,b],[(a+c)/2+.04,(b+e)/2],[c,e]],line('#5a504a'))).join('')}}),
  box([10,58,66],[17,13,4],['#ecebe4','#dcd9cf','#c9c5ba']),
  box([30,57,66],[16,14,4.5],['#efb08c','#e39a74','#d18761'],{faces:{'+w':p=>p.line([[.1,.5],[.9,.5]],line('#c47c58'))}})];
// The galley stands against the bed on 80/20 legs, drawers facing the aisle, cutting board toward the sliding door.
const galley=[
  ...[[70,53],[108.5,53],[70,74.5],[108.5,74.5]].map(([x,y])=>box([x,y,BASE],[1.5,1.5,4],STEEL)),
  box([70,74.5,33.5],[40,1.5,1.5],STEEL),box([108.5,53,33.5],[1.5,23,1.5],STEEL),
  box([70,53,35],[40,23,33],DUSTY,{faces:{'+u':p=>p.line([[.04,.06],[.96,.06]],line('#4f6292'))}}),
  box([90,76,39],[14,1.2,25],BAMBOO,{grain:'#b98448',faces:{'+v':p=>p.ell(.5,.86,.16,.04,inked(DUSTY[1]))}}),
  box([70,52,68],[41,25,2.2],BLOCK,{grain:'#b98448',faces:{'+w':strips(6,'#a8743c')}}),
  // Two burners run front to back across the counter, knobs beside them, as on the homepage kitchen.
  box([86,55,70.2],[20,19,.6],STEEL,{faces:{'+w':p=>p.rect(.03,.04,.97,.96,line('#9da29c'))+[.27,.73].map(t=>p.ell(.4,t,.2,.17,inked('#2a2f2c'))+p.ell(.4,t,.08,.07,fill('#5b605d'))+p.line([[.17,t],[.63,t]],line(INK,1.4))+p.line([[.4,t-.2],[.4,t+.2]],line(INK,1.4))).join('')}}),
  ...[.27,.73].map(t=>({type:'cyl',c:[86+20*.86,55+19*t,70.8],a:[0,0,1.3],r:1.3,tone:['#3b403c','#262b28'],cap:p=>p.line([[0,0],[.85,0]],line('#f1f1e7'))})),
  {type:'cyl',c:[74.5,71,70.2],a:[0,0,5],r:1.5,tone:['#f2efe6','#e04a3a']},
  {type:'sprite',at:[74.5,71,75.2],size:[2,2,7],shadow:false,draw:()=>`<path d="M0 0l-1.8 -6M0 0l.4 -7.4M0 0l2.2 -5.6" ${line('#3f8d50',1.2)}/>`+[[-1.8,-6,'#f6c45a'],[.4,-7.4,'#b48ee0'],[2.2,-5.6,'#f6c45a']].map(([x,y,c])=>`<circle class="o" cx="${x}" cy="${y}" r="1" fill="${c}"/>`).join('')}];
const sink=[
  box([70,3,BASE],[22,21,33],DUSTY,{faces:{'+v':p=>p.line([[.5,.04],[.5,.96]],line('#4f6292'))+[.38,.62].map(s=>p.rect(s-.015,.66,s+.015,.84,inked(INK))).join('')}}),
  box([69,3,64.2],[24,23,2.2],BLOCK,{grain:'#b98448',faces:{'+w':p=>p.rect(.14,.18,.66,.8,inked('#1f2522'))+p.rect(.2,.26,.6,.72,fill('#2c3330'))}}),
  {type:'custom',pts:corners({o:[76,4,66],u:[11,0,0],v:[0,8,0],w:[0,0,13]}),draw:P=>wp(P,[[85,6,66.4],[85,6,76],[84,7,78.5],[81.5,9,78.5],[79.5,10.5,75]],`fill="none" stroke="${INK}" stroke-width="${fx(P.s*1.4)}" stroke-linecap="round" stroke-linejoin="round"`,false)}];
const couch=[
  box([92,6,BASE],[51,21,11.8],BROWN),
  box([92,3,43],[51,6,21],BROWN,{faces:{'+v':p=>p.line([[.5,.06],[.5,.94]],line('#4f3c31'))}}),
  box([92,9,43],[51,18,4.5],['#9a7c66','#856a57','#705848'],{faces:{'+w':p=>p.line([[.5,.03],[.5,.97]],line('#5e4a3d')),'+v':p=>p.line([[.5,.1],[.5,.9]],line('#5e4a3d'))}}),
  {type:'box',o:[95,9.5,47.5],u:[14,0,0],v:[0,4.5,0],w:[0,-3,13],tone:['#f08a5d','#e0764a','#c9653d'],faces:{'+v':p=>[[.3,.3],[.7,.3],[.3,.7],[.7,.7]].map(([s,t])=>p.ell(s,t,.03,.03,fill('#b9562f'))).join('')},seed:3}];
const table=[
  box([130,35,BASE],[1.8,1.8,24.8],BLACK),
  box([117,29,56],[26,17,1.4],BAMBOO,{grain:'#b98448',faces:{'+w':strips(5,'#b98448')}}),
  box([122,32,57.4],[13,9,.7],['#3a3f3c','#2c312e','#232825'],{faces:{'+w':p=>p.ell(.5,.5,.06,.08,fill('#59605b'))}})];

// Outside: the roof gear lands on the lifted lid, and the awning rides its passenger edge.
const solar=[
  ...[89,123].flatMap(x=>[box([x-1,9,LID],[5,4,3.5],BLACK),box([x-1,66,LID],[5,4,3.5],BLACK),box([x,10,LID+3.5],[3,59,2.5],BLACK)]),
  ...[[52,14],[82,14],[52,63],[82,63]].map(([x,y])=>box([x,y,LID],[2,2,1.6],STEEL)),
  box([50,12,LID+1.6],[35,55,1.6],STEEL,{faces:{'+w':{fill:'#22397a',deco:p=>p.rect(0,0,1,1,`fill="none" stroke="${STEEL[1]}" stroke-width="3" vector-effect="non-scaling-stroke"`)+
    [...Array(5)].map((_,i)=>p.line([[(i+1)/6,.02],[(i+1)/6,.98]],line('#7f9be0',.8))).join('')+[...Array(9)].map((_,i)=>p.line([[.02,(i+1)/10],[.98,(i+1)/10]],line('#7f9be0',.6))).join('')+
    p.poly([[.06,.06],[.3,.06],[.06,.32]],`fill="#ffffff" fill-opacity=".18"`)}}})];
const fan=[
  box([22,28,LID],[22,22,3],BLACK),
  box([23.5,29.5,LID+3],[19,19,3],['#454b47','#333935','#2a2f2c'],{faces:{'+v':p=>[.25,.5,.75].map(s=>p.line([[s-.1,.3],[s+.1,.3]],line('#7d837f'))).join(''),'+w':p=>p.rect(.1,.1,.9,.9,line('#5d635f'))}})];
const awning=[
  box([37,75.5,TOPCUT+LIFT-6.5],[3,5.5,6.5],BLACK),box([127,75.5,TOPCUT+LIFT-6.5],[3,5.5,6.5],BLACK),
  box([39,76.5,TOPCUT+LIFT-6],[88,4.5,5.5],['#e4e6e2','#cfd2ce','#b6bab5'],{faces:{'+v':p=>p.rect(0,.06,1,.3,fill('#b25a6c'))+p.line([[0,.3],[1,.3]],line(INK,.8))}})];
// Reggie: shaggy, brown and grey, sitting by the sliding door. Sprite units are inches.
const reggie={type:'sprite',at:[120,101,0],size:[8,8,28],r:9,draw:px=>{
  const fur='#8f7d6b',dark='#6b513b',light='#c2b29d',o=`class="o"`,r=rand(11),tufts=[...Array(16)].map(()=>{const x=-4+r()*13,y=-17+r()*15;return`M${fx(x)} ${fx(y)}l${fx(1.2-r()*2.4)} 1.6`}).join('');
  return`<path d="M7.5 -4C12 -5 13.5 -10 11.5 -15" fill="none" stroke="${INK}" stroke-width="${fx(3+3*px)}" stroke-linecap="round"/><path d="M7.5 -4C12 -5 13.5 -10 11.5 -15" fill="none" stroke="${fur}" stroke-width="3" stroke-linecap="round"/>`+
    `<path ${o} fill="${fur}" d="M-6 0C-7.5 -9 -5 -18 .5 -19.5C6.5 -20.5 10.5 -13 9.5 -5C9.2 -1.5 7 0 3 0Z"/>`+
    `<path ${o} fill="#806d5c" d="M1.5 -.2C-1 -2 -.5 -8.5 3.8 -9.5C8 -10.3 9.6 -5 8.5 -1.8C7.8 -.4 5.5 -.2 1.5 -.2Z"/>`+
    `<path d="${tufts}" fill="none" stroke="${dark}" stroke-width="${fx(.9*px)}" stroke-linecap="round" opacity=".55"/>`+
    `<path ${o} fill="${fur}" d="M-6.8 -11L-7.2 -.6Q-7 .4 -5.6 .4L-4 .4L-3.9 -11Z"/><path ${o} fill="${fur}" d="M-3.4 -11L-3 -.6Q-2.8 .4 -1.4 .4L.2 .4L-.3 -11Z"/>`+
    `<path ${o} fill="${light}" d="M-7.5 -20C-8.5 -15 -6.5 -10.5 -3.5 -10.5C-.5 -10.5 .5 -15 -.5 -19Z"/>`+
    `<path ${o} fill="${dark}" d="M-10.5 -29C-12 -32 -6 -34 -2.5 -31.5C.5 -29.5 .5 -24 -1.5 -21C-3.5 -18.5 -8 -19 -9.5 -21.5Z"/>`+
    `<path ${o} fill="${dark}" d="M-10.5 -26.5L-15.2 -25.6C-16.2 -25.3 -16.2 -22.6 -15 -22.3L-10 -21.5Z"/>`+
    `<path ${o} fill="${light}" d="M-15.4 -22.6C-15.8 -19.5 -13 -17.6 -10.5 -18.5C-9.5 -19.5 -9.8 -21.2 -10.5 -21.6Z"/>`+
    `<path ${o} fill="#4f3a2a" d="M-4.6 -30.6C-1.6 -31 1 -28 .4 -23.2C0 -20.6 -2.4 -20.2 -3.2 -22.4C-4 -25 -5.6 -28.2 -4.6 -30.6Z"/>`+
    `<path d="M-11.5 -31.2l-.6 -1.6M-9.6 -31.8l-.2 -1.8M-7.6 -32.2l.3 -1.7" fill="none" stroke="${light}" stroke-width="${fx(1.1*px)}" stroke-linecap="round"/>`+
    `<circle cx="-8.6" cy="-27.6" r=".85" fill="${INK}"/><circle cx="-8.3" cy="-27.9" r=".25" fill="#fff"/><ellipse cx="-15.5" cy="-24.6" rx="1.1" ry=".9" fill="${INK}"/>`;
}};

// Gear that rides along but isn't part of the build: ghosted, hovering near its mount, with a dashed leader to it.
const ghost=(w,o=.7)=>`fill="none" stroke="${BLUE}" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const BOARD=[[0,.3],[.05,.55],[.15,.8],[.3,.95],[.45,1],[.6,.96],[.75,.82],[.87,.58],[.95,.32],[1,0]],SURF=LID+30,board=(s,t)=>[56+96*s,40+11*t,SURF];
const surfboard={type:'custom',shadow:false,pts:corners({o:[56,29,LID+6],u:[96,0,0],v:[0,22,0],w:[0,0,24]}),draw:P=>
  [90.5,124.5].map(x=>wp(P,[[x,40,SURF],[x,40,LID+6]],dashed,false)).join('')+
  wp(P,[[58,40,SURF],[65,40,SURF],[59.5,40,SURF-5]],`fill="#ffffff" fill-opacity=".5" ${ghost(1.2)}`)+
  wp(P,[...BOARD.map(([s,w])=>board(s,w)),...BOARD.slice(0,-1).reverse().map(([s,w])=>board(s,-w))],`fill="#ffffff" fill-opacity=".7" ${ghost(1.5,.9)} stroke-dasharray="5 3"`)+
  wp(P,[board(.03,0),board(.97,0)],ghost(1,.45),false)};
const HOVER=44,ghostBike=(X,y0,flip)=>P=>{
  const at=(dy,dz)=>[X,y0+(flip?42-dy:dy),HOVER+dz],w=k=>ghost(fx(P.s*k));
  return[0,42].map(dy=>disc(P,at(dy,0),[0,12.5,0],[0,0,12.5],ghost(fx(P.s*2.4),.4))+disc(P,at(dy,0),[0,10.2,0],[0,0,10.2],ghost(1,.35))).join('')+
    wp(P,[at(0,0),at(18,-2.5),at(13,20.5),at(0,0)],w(1.5),false)+wp(P,[at(13,20.5),at(35,23.5),at(18,-2.5)],w(1.5),false)+wp(P,[at(35,23.5),at(36,16.5),at(42,0)],w(1.5),false)+
    wp(P,[at(13,20.5),at(12,25.5)],w(1.5),false)+wp(P,[at(8.5,26.5),at(16,27)],w(2.2),false)+wp(P,[add(at(35,27.5),[-7,0,0]),add(at(35,27.5),[7,0,0])],w(1.5),false);
};
const bikes={type:'custom',shadow:false,pts:[...corners({o:[-49,40,HOVER-16],u:[30,0,0],v:[0,74,0],w:[0,0,46]}),[0,39.5,17]],draw:P=>
  wp(P,[[-24,77,HOVER-14],[0,39.5,17]],dashed,false)+wp(P,[[-48,77,HOVER-14],[-24,77,HOVER-14]],ghost(fx(P.s*2),.55),false)+
  [-30,-42].map(X=>wp(P,[[X,42,HOVER-12.5],[X,112,HOVER-12.5]],ghost(fx(P.s*1.6),.55),false)).join('')+ghostBike(-42,56,true)(P)+ghostBike(-30,56,false)(P)};

// The plan, in build order and in seconds. The shell drives in after a short pause; the rest lands one by one.
const PHASES=['Shell','Inside','Outside'],RANGES=[[.6,4.15],[4.3,8.3],[8.45,12.3]],DRIVE=[.6,3],DIP=[3,3.5],POP=[3.35,4.15],FADE=[3.35,3.9],END=12.7,FROM=-360,FALL=210,BOUNCE=2.4;
const spin=(...xs)=>off=>xs.map(([X,y])=>wheel(X,y,off[0]/WR));
const PARTS=[
  {id:'A',name:'Empty shell',phase:0,intro:true,items:[
    {dyn:spin([AXLES[0],0],[AXLES[1],0]),ground:true},{prims:[lower]},{dyn:spin([AXLES[0],70]),ground:true},{prims:[rearWall,farLow,farUp]},
    {prims:[cabFar,...seat(8),...seat(49),steering,dash,cabNear,nose],layer:'front'},{dyn:spin([AXLES[1],70]),layer:'front',ground:true},{prims:mirror,layer:'front'},
    {prims:phantom,layer:'phantom'},{prims:skin,layer:'skin',skin:true,shadow:false},{dyn:lid,layer:'lid',lid:true,ground:true,shadow:false}]},
  {id:'B',name:'Floor',phase:1,t:[4.3,5],thud:.3,items:[floor]},
  {id:'C',name:'Wheel well boxes',phase:1,t:[4.85,5.55],thud:.5,items:wells},
  {id:'D',name:'Bed platform',phase:1,t:[5.4,6.1],thud:1,items:bed},
  {id:'E',name:'Galley',phase:1,t:[5.95,6.65],thud:1,items:galley},
  {id:'F',name:'Sink',phase:1,t:[6.5,7.2],thud:.6,items:sink},
  {id:'G',name:'Couch',phase:1,t:[7.05,7.75],thud:.8,items:couch},
  {id:'H',name:'Swing table',phase:1,t:[7.6,8.3],thud:.3,items:table},
  {id:'I',name:'Solar + rack',phase:2,t:[8.45,9.15],plane:LID,onLid:true,items:solar},
  {id:'J',name:'Roof fan',phase:2,t:[9,9.7],plane:LID,onLid:true,items:fan},
  {id:'K',name:'Awning',phase:2,t:[9.55,10.25],shadow:false,onLid:true,items:awning},
  {id:'L',name:'Surfboard',phase:2,t:[10.1,10.9],ghost:true,items:[surfboard]},
  {id:'M',name:'Bikes',phase:2,t:[10.65,11.45],ghost:true,items:[bikes]},
  {id:'N',name:'Reggie',phase:2,t:[11.3,12.3],from:[-30,36,0],hop:26,plane:0,ground:true,items:[reggie]}];
// Each part becomes one mover; the shell splits into pieces so the cab can sit in front of the interior.
const movers=PARTS.flatMap((part,pi)=>{
  const{t,from,hop,thud,ground,intro,shadow,onLid,ghost}=part,base={part:pi,t,from,hop,thud,ground,intro,shadow,onLid,ghost};
  if(intro)return part.items.map(x=>({...base,layer:'back',plane:0,...x}));
  if(ghost)return[{...base,prims:part.items,layer:'ghost',plane:0,ground:true,shadow:false,from:[0,0,30]}];
  return[{...base,prims:part.items,layer:part.phase===1?'inside':'outside',plane:part.plane??BASE}];
});
list.innerHTML=PARTS.map(p=>`<li><span>${p.id}</span>${p.name}<b>✓</b></li>`).join('');
PARTS.forEach((p,i)=>{p.li=list.children[i]});

const groundAt=z0=>p=>[p[0]+LIGHT[0]*(p[2]-z0)+DROP[0],p[1]+LIGHT[1]*(p[2]-z0)+DROP[1],z0];
const shadowOf=(prims,P,z0)=>{const g=groundAt(z0);return prims.filter(k=>k.shadow!==false).map(k=>k.type==='sprite'?(k.r?d(hull(ring(g([k.at[0],k.at[1],z0]),[1,0,0],[0,1,0],k.r,20).map(P))):''):d(hull(points(k).map(p=>P(g(p)))))).join('')};
const restPrims=m=>m.dyn?m.dyn([0,0,0]):m.prims;
let W=0,H=0,P=null,layers={},last=null;
function build(){
  const w=sheet.clientWidth,h=sheet.clientHeight;
  if(!w||!h||(w===W&&h===H))return;
  W=w;H=h;last=null;
  // The camera stays put and frames the finished van; the van drives in from beyond the top-left corner.
  const raw=projector({s:1,x:0,y:0}),b=box2(movers.flatMap(m=>restPrims(m).flatMap(k=>{const g=groundAt(m.plane);return points(k).flatMap(p=>m.shadow===false||k.shadow===false?[raw(p)]:[raw(p),raw(g(p))])})));
  const cap=sheet.querySelector('figcaption'),pad=clamp(Math.min(W,H)*.06,16,48),bottom=(cap?cap.offsetHeight:0)+pad*.4,top=pad*1.3;
  const s=Math.min((W-pad*2)/(b[2]-b[0]),(H-top-bottom)/(b[3]-b[1]));
  P=projector({s,x:W/2-s*(b[0]+b[2])/2,y:top+(H-top-bottom-s*(b[3]-b[1]))/2-s*b[1]});
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.innerHTML=['a-shadows','v-back','a-shadows','v-inside','v-front','v-phantom','v-skin','v-lid','a-shadows','a-guides','v-outside','v-ghost','a-tags'].map(c=>`<g class="${c}"></g>`).join('');
  const g=[...svg.children];layers={sh:[g[0],g[2],g[8]],back:g[1],inside:g[3],front:g[4],phantom:g[5],skin:g[6],lid:g[7],guides:g[9],outside:g[10],ghost:g[11],tags:g[12]};
  movers.forEach(m=>{
    const rest=restPrims(m);
    m.body=layers[m.layer].appendChild(document.createElementNS(NS,'g'));
    m.shadowEl=layers.sh[m.plane===BASE?1:m.plane===LID?2:0].appendChild(document.createElementNS(NS,'path'));
    m.guide=layers.guides.appendChild(document.createElementNS(NS,'path'));
    m.key=null;
    if(!m.dyn)m.body.innerHTML=rest.map(k=>draw(k,P)).join('');
    m.shadowEl.setAttribute('d',m.shadow===false?'':shadowOf(rest,P,m.plane));
    m.rest=aabb(rest);m.rscr=sbox(rest,P);
    m.anchor=P([0,1,2].map(i=>(m.rest[i]+m.rest[i+3])/2));
  });
  PARTS.forEach(part=>{
    part.tag=layers.tags.appendChild(document.createElementNS(NS,'g'));
    part.tag.innerHTML=`<circle r="2.2" fill="${BLUE}"/><path stroke="${BLUE}"/><g><circle r="10.5" fill="${PAPER}" stroke="${BLUE}" stroke-width="1.5"/><text y=".5" text-anchor="middle" dominant-baseline="central" fill="${BLUE}">${part.id}</text></g>`;
  });
}

// The body sits on its springs: it dips when the van parks and whenever something heavy lands inside.
const span=([a,b],t)=>clamp((t-a)/(b-a));
const squat=t=>{
  let z=0;const u=span(DIP,t);
  if(u>0&&u<1)z-=2*Math.sin(Math.PI*2*u)*(1-u);
  PARTS.forEach(p=>{if(!p.thud)return;const k=(t-(p.t[0]+.78*(p.t[1]-p.t[0])))/.3;if(k>0&&k<1)z-=p.thud*1.6*Math.sin(Math.PI*2*k)*(1-k)});
  return z;
};
function render(t){
  if(!P||t===last)return;
  last=t;
  const s=P.s,sq=squat(t),drive=span(DRIVE,t),carry=FROM*(1-easeOut(drive)),lift=-LIFT*(1-backOut(span(POP,t)));
  movers.forEach(m=>{
    const v=m.intro?drive:span(m.t,t),f=m.from||[0,0,FALL];let off;
    if(m.intro)off=[carry,0,m.lid?lift:0];
    else if(m.ghost)off=mul(f,1-smooth(v));
    else if(m.hop!=null)off=[f[0]*(1-v),f[1]*(1-v),m.hop*4*v*(1-v)];
    else off=[0,0,v<.78?FALL*(1-(v/.78)**2):BOUNCE*Math.sin(Math.PI*(v-.78)/.22)];
    const h=off[2],dz=!m.ground&&!m.onLid&&(m.intro||v>=1)?sq:0;off[2]+=dz;
    m.v=v;
    if(m.dyn){const key=off.join();if(key!==m.key){m.key=key;m.body.innerHTML=m.dyn(off).map(k=>draw(k,P)).join('')}}
    const tr=shift(s,off),g=shift(s,[off[0]+LIGHT[0]*h,off[1]+LIGHT[1]*h,m.plane?dz:0]),shown=m.intro||v>0;
    const fade=m.skin?1-span(FADE,t):m.ghost?smooth(v):1;
    m.body.style.display=m.shadowEl.style.display=shown&&fade>0?'':'none';
    m.body.style.opacity=fade<1?fx(fade):'';
    m.body.setAttribute('transform',`translate(${fx(tr[0])} ${fx(tr[1])})`);
    m.shadowEl.setAttribute('transform',`translate(${fx(g[0])} ${fx(g[1])})`);
    m.shadowEl.style.opacity=m.hop!=null||m.intro?1:fx(.15+.85*v*v);
    m.box=m.rest.map((x,i)=>x+off[i%3]);m.scr=[m.rscr[0]+tr[0],m.rscr[1]+tr[1],m.rscr[2]+tr[0],m.rscr[3]+tr[1]];m.t2=tr;
    const show=!m.intro&&v>0&&v<1&&Math.hypot(tr[0],tr[1])>6;
    m.guide.setAttribute('d',show?`M${fx(m.anchor[0]+tr[0])} ${fx(m.anchor[1]+tr[1])}L${fx(m.anchor[0])} ${fx(m.anchor[1])}`:'');
    m.guide.style.opacity=show?clamp((1-v)*5):0;
  });
  ['inside','outside'].forEach(l=>{
    const order=depthSort(movers.filter(m=>m.layer===l));
    if(order.some((m,i)=>layers[l].children[i]!==m.body))order.forEach(m=>layers[l].appendChild(m.body));
  });
  let cur=0;
  PARTS.forEach((part,pi)=>{
    const m=movers.find(x=>x.part===pi),v=m.v,[dot,ln,ball]=part.tag.children;
    if(v>0)cur=pi;
    part.li.classList.toggle('is-done',v>=1);
    part.li.classList.toggle('is-active',v>0&&v<1);
    const op=m.intro||v<=0||v>=1?0:clamp(v*10)*clamp((1-v)*6);
    part.tag.style.opacity=op;
    if(!op)return;
    const right=m.anchor[0]+m.t2[0]<W*.62,x=right?m.scr[2]+6:m.scr[0]-6,y=m.anchor[1]+m.t2[1],k=right?1:-1;
    dot.setAttribute('transform',`translate(${fx(x)} ${fx(y)})`);
    ln.setAttribute('d',`M${fx(x)} ${fx(y)}h${k*22}`);
    ball.setAttribute('transform',`translate(${fx(x+k*32)} ${fx(y)})`);
  });
  const ph=PARTS[cur].phase;
  stepNo.textContent=`PHASE 0${ph+1}`;stepName.textContent=PHASES[ph];
  bars.forEach((b,i)=>b.style.setProperty('--p',span(RANGES[i],t)));
}

// Plays once on arrival; Replay starts it over. With motion off, the finished van is drawn straight away.
let start=null,raf=0;
function frame(now){
  raf=0;build();
  if(document.body.classList.contains('no-motion')){render(END);return}
  if(start===null)start=now;
  const t=(now-start)/1000;
  render(t);
  if(t<END)raf=requestAnimationFrame(frame);
}
const kick=()=>{if(!raf)raf=requestAnimationFrame(frame)};
replay.addEventListener('click',()=>{start=null;kick()});
addEventListener('resize',kick);
new MutationObserver(()=>{last=null;kick()}).observe(document.body,{attributes:true,attributeFilter:['class']});
kick();
})();
