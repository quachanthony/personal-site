/* Some assembly required: isometric exploded drawings that put themselves together on scroll. */
(()=>{
const section=document.querySelector('.assembly');
if(!section)return;
const pin=section.querySelector('.assembly-pin'),sheets=[...section.querySelectorAll('.assembly-sheet')],lists=[...section.querySelectorAll('.assembly-parts')],bars=[...section.querySelectorAll('.assembly-track i')],stepNo=section.querySelector('.assembly-step span'),stepName=section.querySelector('.assembly-step strong'),sheetNo=section.querySelector('.assembly-count b');

// Isometric projection: x runs down-right, y down-left, z up. The viewer looks from +x +y +z.
const NS='http://www.w3.org/2000/svg',C=Math.cos(Math.PI/6),S=.5,LIGHT=[0,.12],DROP=[0,2.8];
const INK='#1c2922',PAPER='#f1f1e7',BLUE='#254bd1',ORANGE='#f04b25';
const SILVER=['#e7e7dd','#d0d2c6','#b6baac'];
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),smooth=v=>v*v*(3-2*v);
const drop=v=>v<.78?(v/.78)**2:1-.07*Math.sin(Math.PI*(v-.78)/.22);
const add=(a,b)=>a.map((x,i)=>x+b[i]),mul=(a,k)=>a.map(x=>x*k);
const unit=a=>mul(a,1/Math.hypot(...a)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const facing=n=>n[0]+n[1]+n[2]>1e-6,ground=p=>[p[0]+LIGHT[0]*p[2]+DROP[0],p[1]+LIGHT[1]*p[2]+DROP[1],0];
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

// A pen draws in a face's own plane: (s,t) runs across edge vectors a and b from corner o.
const pen=(P,o,a,b)=>{
  const at=(s,t)=>P(add(o,add(mul(a,s),mul(b,t)))),poly=(pts,attr,close=true)=>`<path ${attr} d="${d(pts.map(q=>at(q[0],q[1])),close)}"/>`;
  const ell=(cs,ct,rs,rt,attr,a0=0,a1=360)=>{const pts=[];for(let i=0;i<=28;i++){const t=(a0+(a1-a0)*i/28)*Math.PI/180;pts.push([cs+rs*Math.cos(t),ct+rt*Math.sin(t)])}return poly(pts,attr)};
  return{poly,ell,rect:(s0,t0,s1,t1,attr)=>poly([[s0,t0],[s1,t0],[s1,t1],[s0,t1]],attr),line:(pts,attr)=>poly(pts,attr,false)};
};
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

// Primitives: boxes, cylinders, and flat sprites drawn around a projected anchor.
let seeds=1;
const box=(o,size,tone,opt={})=>({type:'box',o,u:[size[0],0,0],v:[0,size[1],0],w:[0,0,size[2]],tone,faces:{},seed:seeds++*7,...opt});
const faces=({o,u,v,w})=>[['+w',add(o,w),u,v,w],['+u',add(o,u),v,w,u],['+v',add(o,v),u,w,v],['-w',o,u,v,mul(w,-1)],['-u',o,v,w,mul(u,-1)],['-v',o,u,w,mul(v,-1)]];
const shade=(tone,n)=>{const[x,y,z]=n.map(Math.abs);return z>=x&&z>=y?tone[0]:y>=x?tone[1]:tone[2]};
const corners=({o,u,v,w})=>[0,1].flatMap(i=>[0,1].flatMap(j=>[0,1].map(k=>add(o,add(mul(u,i),add(mul(v,j),mul(w,k)))))));
const basis=a=>{const n=unit(a),e=unit(cross(n,Math.abs(n[2])<.9?[0,0,1]:[1,0,0]));return[e,cross(n,e)]};
const ring=(c,e1,e2,r,n=36)=>Array.from({length:n},(_,i)=>{const t=i/n*Math.PI*2;return add(c,add(mul(e1,r*Math.cos(t)),mul(e2,r*Math.sin(t))))});
const points=k=>{
  if(k.type==='box')return corners(k);
  if(k.type==='cyl'){const[e1,e2]=basis(k.a);return[...ring(k.c,e1,e2,k.r),...ring(add(k.c,k.a),e1,e2,k.r)]}
  if(k.type==='sprite'){const[x,y,z]=k.at,[hx,hy,h]=k.size;return corners({o:[x-hx,y-hy,z],u:[hx*2,0,0],v:[0,hy*2,0],w:[0,0,h]})}
  return k.pts;
};
const draw=(k,P)=>{
  if(k.type==='box')return faces(k).filter(f=>facing(f[4])).map(([key,o,a,b,n])=>{
    const face=typeof k.faces[key]==='function'?{deco:k.faces[key]}:k.faces[key]||{},p=pen(P,o,a,b);
    const fill=`class="o" fill="${face.fill||shade(k.tone,n)}"`;
    return(face.shape?face.shape.map(q=>p.poly(q,fill)).join(''):p.rect(0,0,1,1,fill))+(k.grain&&!face.fill?grain(p,a,b,k.grain,k.seed+key.charCodeAt(1)):'')+(face.deco?face.deco(p):'');
  }).join('');
  if(k.type==='cyl'){
    const[e1,e2]=basis(k.a),c=facing(k.a)?add(k.c,k.a):k.c;
    return`<path class="o" fill="${k.tone[1]}" d="${d(hull(points(k).map(P)))}"/><path class="o" fill="${k.tone[0]}" d="${d(ring(c,e1,e2,k.r).map(P))}"/>`+(k.cap?k.cap(pen(P,c,mul(e1,k.r),mul(e2,k.r))):'');
  }
  if(k.type==='sprite'){const[x,y]=P(k.at);return`<g transform="translate(${fx(x)} ${fx(y)}) scale(${fx(P.s)})">${k.draw(1/P.s)}</g>`}
  return k.draw(P);
};
const shadowOf=(prims,P)=>prims.filter(k=>k.shadow!==false).map(k=>k.type==='sprite'?(k.r?d(hull(ring(ground(k.at),[1,0,0],[0,1,0],k.r,20).map(P))):''):d(hull(points(k).map(p=>P(ground(p)))))).join('');
const aabb=prims=>{const b=[1/0,1/0,1/0,-1/0,-1/0,-1/0];prims.forEach(k=>points(k).forEach(p=>p.forEach((x,i)=>{b[i]=Math.min(b[i],x);b[i+3]=Math.max(b[i+3],x)})));return b};
const box2=(pts,b=[1/0,1/0,-1/0,-1/0])=>{pts.forEach(([x,y])=>{b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y)});return b};
const sbox=(prims,P)=>box2(prims.flatMap(k=>points(k).map(P)));
const shbox=(prims,P)=>box2(prims.filter(k=>k.shadow!==false&&(k.type!=='sprite'||k.r)).flatMap(k=>k.type==='sprite'?ring(ground(k.at),[1,0,0],[0,1,0],k.r,20).map(P):points(k).map(p=>P(ground(p)))));

// Sprite helpers, in sprite units (one unit is one world unit on screen).
const arc=(cx,cy,rx,ry,rot,a0,a1)=>{const R=rot*Math.PI/180,pts=[];for(let a=a0;a<=a1+.1;a+=9){const t=a*Math.PI/180,x=rx*Math.cos(t),y=ry*Math.sin(t);pts.push([cx+x*Math.cos(R)-y*Math.sin(R),cy+x*Math.sin(R)+y*Math.cos(R)])}return d(pts,false)};
const ribbon=(path,w,px,color)=>`<path d="${path}" fill="none" stroke="${INK}" stroke-width="${fx(w+3*px)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const blob=(r,sq,seed)=>{const pts=[];for(let i=0;i<40;i++){const t=i/40*Math.PI*2,k=r*(1+.13*Math.sin(3*t+seed)+.07*Math.sin(5*t+seed*2));pts.push([k*Math.cos(t),k*sq*Math.sin(t)])}return d(pts)};
const leaf=(x,y,a,l,w,px)=>`<g transform="translate(${x} ${y}) rotate(${a})"><path class="o" fill="#3f8d50" d="M0 0Q${fx(l*.4)} ${fx(-w)} ${l} 0Q${fx(l*.55)} ${fx(w*.9)} 0 0Z"/><path d="M${fx(l*.1)} 0Q${fx(l*.5)} ${fx(-w*.1)} ${fx(l*.86)} 0" fill="none" stroke="#2a6a39" stroke-width="${fx(.9*px)}"/></g>`;

function laptop(){
  const W=60,D=40,H=2.6,KZ=H+.35;
  const deck=box([0,0,0],[W,D,H],SILVER,{faces:{
    '+w':p=>p.rect(.07,.09,.93,.57,'fill="#d6d8cc"')+p.rect(.335,.615,.665,.935,'fill="#c9cbbf"'),
    '+v':p=>p.ell(.5,1,.05,.5,'class="o" fill="#bdc0b3"',180,360)}});
  const keys=[];
  for(let r=0;r<5;r++)for(let c=0;c<13;c++){const y=4.3+r*3.72;if(r===4&&c>3&&c<9){if(c===4)keys.push([5+c*3.88,y,5*3.88-.6,3.1]);continue}keys.push([5+c*3.88,y,3.28,3.1])}
  const keycaps={type:'custom',pts:corners({o:[5,4.3,H],u:[50.4,0,0],v:[0,18.1,0],w:[0,0,.35]}),draw:P=>keys.map(([x,y,w,h])=>`<path fill="#29342f" d="${d([[x,y,KZ],[x+w,y,KZ],[x+w,y+h,KZ],[x,y+h,KZ]].map(P))}"/>`).join('')};
  const pad=box([20.5,25,H],[19,12,.2],['#dcded3','#bfc2b5','#a7ab9d']);
  // The lid is already open; the screen is the workbench. The editor sits left, the app slots in on the right.
  const ca=Math.cos(1.885),sa=Math.sin(1.885),O=[0,0,KZ+.05],U=[W,0,0],V=[0,D*ca,D*sa],N=[0,sa,-ca];
  const onScreen=(s0,t0,s1,t1,lift,art)=>{const o=add(O,mul(N,lift)),at=(s,t)=>add(o,add(mul(U,s),mul(V,t)));return{type:'custom',shadow:false,pts:[at(s0,t0),at(s1,t0),at(s1,t1),at(s0,t1)],draw:P=>art(pen(P,o,U,V))}};
  const lid={type:'box',o:O,u:U,v:V,w:[0,-1.4*sa,1.4*ca],tone:SILVER,faces:{'-w':{fill:'#27312c',deco:p=>p.rect(.035,.055,.965,.945,'fill="#121a16"')+p.rect(.485,.055,.965,.945,'fill="#1a2420"')+p.rect(.5,.1,.94,.9,`fill="none" stroke="${BLUE}" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"`)}}};
  const CODE=[[[0,8,0],[9,5,2]],[[2,3,1],[6,9,0]],[[4,6,2],[11,4,1],[16,5,0]],[[4,10,0]],[[6,4,1],[11,7,2]],[[4,3,2],[8,6,0]],[[2,2,1]],[[2,6,0],[9,8,1]],[[0,1,2]]];
  const COLORS=['#4a73f2',ORANGE,'#efe8d4'],TOTAL=CODE.flat().reduce((n,t)=>n+t[1],0),CH=.0175;
  const code=local=>[onScreen(.035,.055,.485,.945,.05,p=>{
    let out='',left=clamp((local-.14)/.16)*TOTAL,head=null;
    CODE.forEach((row,i)=>row.forEach(([c,n,k])=>{const len=clamp(left,0,n);left-=n;if(len<=0)return;const t1=.875-i*.086,s0=.065+c*CH;out+=p.rect(s0,t1-.04,s0+len*CH,t1,`fill="${COLORS[k]}"`);head=[s0+len*CH+.007,t1]}));
    return head?out+p.rect(head[0],head[1]-.04,head[0]+.01,head[1],`fill="${ORANGE}"`):out;
  })];
  const card='#fffaf0',ink=`class="o"`;
  const layout=onScreen(.5,.1,.94,.9,.1,p=>p.rect(.5,.1,.94,.9,`${ink} fill="${PAPER}"`)+p.rect(.5,.8,.94,.9,`${ink} fill="${BLUE}"`)+[ORANGE,PAPER,'#cae5ce'].map((c,i)=>p.ell(.53+i*.025,.85,.009,.014,`fill="${c}"`)).join('')+p.rect(.5,.1,.58,.8,`${ink} fill="#cae5ce"`)+[.72,.65,.58].map(t=>p.rect(.515,t,.565,t+.03,'fill="#6f8f78"')).join(''));
  // Floating layers read as glass sheets the size of the app; the sheet edge fades once a layer lands.
  const sheet=(lift,end,art)=>({dyn:local=>[onScreen(.5,.1,.94,.9,lift,p=>{const o=clamp((end-local)/.04);return(o?p.rect(.5,.1,.94,.9,`fill="${BLUE}" fill-opacity="${fx(.06*o)}" stroke="${BLUE}" stroke-opacity="${fx(o)}" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"`):'')+art(p)})]});
  const parts=sheet(.15,.58,p=>p.rect(.61,.6,.915,.76,`${ink} fill="${card}"`)+p.ell(.65,.68,.022,.034,`fill="${ORANGE}"`)+p.rect(.69,.7,.88,.725,'fill="#9aa59c"')+p.rect(.69,.64,.83,.665,'fill="#c3cbc4"')+p.rect(.61,.13,.73,.21,`${ink} fill="${ORANGE}"`)+p.rect(.75,.13,.87,.21,`${ink} fill="${card}"`));
  const data=sheet(.2,.71,p=>p.rect(.61,.26,.915,.55,`${ink} fill="${card}"`)+[.1,.17,.13,.21,.16].map((h,i)=>p.rect(.64+i*.054,.3,.672+i*.054,.3+h,`fill="${i===3?ORANGE:BLUE}"`)).join('')+p.line([[.63,.3],[.9,.3]],`stroke="${INK}" stroke-width="1"`));
  const handle='M5.9 -3.6C11.4 -4.2 11.8 3.6 6.1 3.4';
  const mug=[
    {type:'sprite',at:[73,24,5.5],size:[0,0,0],shadow:false,draw:px=>`<path d="${handle}" fill="none" stroke="${INK}" stroke-width="${fx(2.4+3*px)}" stroke-linecap="round"/><path d="${handle}" fill="none" stroke="#f3f0e6" stroke-width="2.4" stroke-linecap="round"/>`},
    {type:'cyl',c:[73,24,0],a:[0,0,11],r:5.5,tone:['#f6f3e9','#ebe7da'],cap:p=>p.ell(0,0,.8,.8,'fill="#3b2a1f"')+p.ell(0,0,.97,.97,'fill="none" stroke="#22356e" stroke-width="2"')},
    {type:'sprite',at:[73,24,5.5],size:[0,0,0],shadow:false,draw:()=>[[-3.6,1],[-1,3.6],[2.2,.8],[3.8,4.6],[-4.2,6],[.6,6.8],[2.6,8.2]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".38" fill="#2b3a5c"/>`).join('')}];
  return{name:'Code',parts:[
    {id:'A',name:'Laptop',t:[.03,.14],from:[0,0,12],items:[deck,keycaps,pad,lid,{dyn:code}]},
    {id:'B',name:'Code',t:[.14,.3],items:[]},
    {id:'C',name:'Layout',t:[.3,.45],from:[25.7,9.5,37.6],glide:true,items:[layout]},
    {id:'D',name:'Components',t:[.43,.58],from:[51.7,17.1,72.4],glide:true,items:[parts]},
    {id:'E',name:'Data',t:[.56,.71],from:[77.8,24.7,107.3],glide:true,items:[data]},
    {id:'F',name:'Coffee',t:[.76,.88],from:[30,-10,14],items:[{prims:mug}]}]};
}

function kitchen(){
  const L=64,D=46,BIRCH=['#f0dcb4','#e6cb9c','#d4b483'],BLOCK=['#e9bf86','#dcab6c','#c99456'],DUSTY=['#8ea3d0','#6f86bb','#5a6fa1'],COOLER=['#f5f1e6','#ebe6d7','#d9d3c2'],STEEL=['#dfe2de','#c6cac5','#afb3ae'];
  // Plywood shows its layers on every cut edge.
  const plyV=p=>[.3,.55,.8].map(s=>p.line([[s,.004],[s,.996]],'class="g" stroke="#b08a57"')).join('');
  const plyH=p=>[.3,.55,.8].map(t=>p.line([[.004,t],[.996,t]],'class="g" stroke="#b08a57"')).join('');
  const ply=(o,s,faces={})=>box(o,s,BIRCH,{grain:'#c9a26c',faces});
  const carcass=[
    ply([1.8,0,1.8],[L-3.6,1.2,82.2]),
    ply([0,0,0],[1.8,D,84],{'+v':plyV}),
    ply([1.8,0,0],[L-3.6,D,1.8],{'+v':plyH}),
    ply([1.8,1.2,44],[L-3.6,D-1.2,1.8],{'+v':plyH}),
    ply([1.8,D-2,57.9],[L-3.6,2,1.2]),
    ply([1.8,D-2,71],[L-3.6,2,1.2]),
    ply([L-1.8,0,0],[1.8,D,84],{'+v':plyV})];
  const drawer=z=>box([2.2,2.5,z],[L-4.4,D-2.5,11.5],BIRCH,{faces:{
    '+v':{fill:DUSTY[1],deco:p=>p.ell(.5,.6,.035,.18,'class="o" fill="#1d2420"')},
    '+w':p=>p.rect(.025,.05,.975,.95,'fill="#c9a874"')}});
  const cooler=box([5,6,3.6],[54,36,34],COOLER,{faces:{
    '+v':p=>p.line([[0,.78],[1,.78]],`stroke="${INK}" stroke-width="1" vector-effect="non-scaling-stroke"`)+[.2,.8].map(s=>p.rect(s-.025,.56,s+.025,.86,`class="o" fill="#1f2522"`)+p.rect(s-.045,.86,s+.045,.92,`class="o" fill="#1f2522"`)).join(''),
    '+w':p=>p.rect(.06,.08,.94,.92,'fill="#efeadc" stroke="#c9c2ae" stroke-width="1"'),
    '+u':p=>p.rect(.35,.55,.65,.68,`class="o" fill="#1f2522"`)}});
  const scoop=[[0,0],[1,0],[1,1],...[...Array(13)].map((_,i)=>{const t=-Math.PI*i/12;return[.5+.3*Math.cos(t),1+.42*Math.sin(t)]}),[0,1]];
  const tray=[ply([2.2,2.5,2],[L-4.4,41,1.6],{'+v':plyH}),box([2.2,43.5,2],[L-4.4,2,12],BIRCH,{faces:{
    '+v':{fill:DUSTY[1],shape:[scoop]},
    '+w':{shape:[[[0,0],[.2,0],[.2,1],[0,1]],[[.8,0],[1,0],[1,1],[.8,1]]]}}})];
  // Butcher block strips run front to back; the stove drops into a cut-out.
  const S0=[4,3],SZ=[34,41];
  const counter=box([-1,-1,84],[L+2,D+2,4],BLOCK,{grain:'#b98448',faces:{
    '+w':p=>[...Array(9)].map((_,i)=>p.line([[(i+1)/10,.01],[(i+1)/10,.99]],'class="g" stroke="#a8743c"')).join('')+p.rect((S0[0]+1.5)/(L+2),(S0[1]+1.5)/(D+2),(S0[0]+SZ[0]+.5)/(L+2),(S0[1]+SZ[1]+.5)/(D+2),'fill="#2c251e"'),
    '+v':p=>[...Array(9)].map((_,i)=>p.line([[(i+1)/10,.06],[(i+1)/10,.94]],'class="g" stroke="#a8743c"')).join('')}});
  const BURNERS=[[.42,.27],[.42,.71]],burner=([s,t])=>[S0[0]+SZ[0]*s,S0[1]+SZ[1]*t,88.8];
  const stove={prims:[
    box([S0[0],S0[1],88],[SZ[0],SZ[1],.8],STEEL,{faces:{'+w':p=>p.rect(.03,.04,.97,.96,'fill="none" stroke="#9da29c" stroke-width="1"')+BURNERS.map(([s,t])=>p.ell(s,t,.17,.14,`class="o" fill="#2a2f2c"`)+p.ell(s,t,.065,.055,'fill="#5b605d"')+p.line([[s-.19,t],[s+.19,t]],`stroke="${INK}" stroke-width="1.6"`)+p.line([[s,t-.16],[s,t+.16]],`stroke="${INK}" stroke-width="1.6"`)).join('')}}),
    ...BURNERS.map(([,t])=>({type:'cyl',c:[S0[0]+SZ[0]*.84,S0[1]+SZ[1]*t,88.8],a:[0,0,1.4],r:1.5,tone:['#3b403c','#262b28'],cap:p=>p.line([[0,0],[.85,0]],'stroke="#f1f1e7" stroke-width="1"')}))]};
  const overlay=(local,P)=>{
    const r=smooth(clamp((local-.84)/.1));if(!r)return'';
    return BURNERS.map(b=>{const c=burner(b);return[...Array(12)].map((_,i)=>{
      const a=i/12*Math.PI*2,[x,y]=P(add(c,[3.8*Math.cos(a),3.8*Math.sin(a),0])),h=P.s*r*(2.6+.9*Math.sin(i*2.3)),w=P.s*.9;
      return`<path fill="#4a73f2" d="M${fx(x-w)} ${fx(y)}Q${fx(x-w*.5)} ${fx(y-h*.6)} ${fx(x)} ${fx(y-h)}Q${fx(x+w*.5)} ${fx(y-h*.6)} ${fx(x+w)} ${fx(y)}Z"/><path fill="#a9c0ff" d="M${fx(x-w*.4)} ${fx(y)}Q${fx(x)} ${fx(y-h*.55)} ${fx(x+w*.4)} ${fx(y)}Z"/>`;
    }).join('')}).join('');
  };
  return{name:'Build',overlay,parts:[
    {id:'A',name:'Cabinet',t:[.03,.14],from:[0,0,12],items:carcass},
    {id:'B',name:'Cooler',t:[.14,.26],from:[0,0,20],follow:'C',items:[cooler]},
    {id:'C',name:'Tray',t:[.27,.4],from:[0,64,0],items:tray},
    {id:'D',name:'Drawers ×3',items:[{prims:[drawer(72.4)],from:[0,36,0],t:[.49,.59]},{prims:[drawer(59.3)],from:[0,28,0],t:[.44,.54]},{prims:[drawer(46)],from:[0,20,0],t:[.39,.49]}]},
    {id:'E',name:'Countertop',t:[.58,.7],from:[0,0,30],items:[counter]},
    {id:'F',name:'Gas stove',t:[.7,.82],from:[0,0,52],items:[stove]}]};
}

function pasta(){
  const onPlate=(X,Y,z=3)=>[(X/C+Y/S)/2,(Y/S-X/C)/2,z];
  const plate={type:'cyl',c:[0,0,0],a:[0,0,3],r:31,tone:[BLUE,'#1d3cab'],cap:p=>p.ell(0,0,.75,.75,'fill="#3a60df" stroke="#1c2922" stroke-opacity=".35" stroke-width="1"')+p.ell(0,0,.89,.89,'fill="none" stroke="#f1f1e7" stroke-opacity=".6" stroke-width="1"')};
  const LOOPS=[[0,0,21,11,-4,170,500],[-6,-2.5,13,7.5,24,-20,280],[6,-3,14,7,-22,30,350],[-1,-6,17,8,6,110,440],[10,-5,7,4,-34,190,450],[-11,-5,6.5,3.6,30,-40,220],[4,-9.5,12,6,-16,-30,290],[-5,-10.5,9,5,22,60,380],[1,-13.5,7,3.8,-8,10,320]];
  const nest={type:'sprite',at:[0,0,3],size:[14,14,16],r:15,draw:px=>'<ellipse cx="1" cy="1.5" rx="20" ry="8" fill="#16308f" opacity=".55"/>'+LOOPS.map(l=>ribbon(arc(...l),4.2,px,'#f3c351')).join('')};
  const sauce={type:'sprite',at:[0,0,13.5],size:[8,8,5],r:7,draw:px=>`<path class="o" fill="#e5431f" d="M-6.4 2.6q-1.4 4.4.5 5.3q1.9.3 1.6-4.2zM5.2 3q-.5 3.9 1.2 4.1q1.7-.2.7-4.3z"/><path class="o" fill="#e5431f" d="${blob(9.4,.58,1.2)}"/><path d="M-4.4 -.7C-1.8 -3.2 3.2 -2.5 3.7 .2C4.1 2.2 .7 2.8 -1 1.7" fill="none" stroke="#b42f14" stroke-width="${fx(1.4*px)}" stroke-linecap="round"/><ellipse cx="-3.6" cy="-2.2" rx="1.8" ry=".8" fill="#ff9b72"/>`+[[1.8,-3],[-1.2,1.9],[4.8,-.7],[-5.5,1]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".45" fill="#2f6d3d"/>`).join('')};
  const tomato=(X,Y,from,t,rot)=>({prims:[{type:'sprite',at:onPlate(X,Y),size:[4,4,3],r:4.5,draw:()=>'<ellipse cx=".6" cy="1.4" rx="5.2" ry="2.6" fill="#16308f" opacity=".5"/><ellipse class="o" rx="5" ry="3.6" fill="#d8372a"/><ellipse cx="-.3" cy="-.35" rx="3.7" ry="2.5" fill="#f06a4e"/>'+[[-1.6,-.5],[1.3,-.9],[.2,.8]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx=".95" ry=".55" fill="#f6c45a"/>`).join('')}],from,t,rot});
  const meatball=(X,Y,z,from,t,rot,seed)=>({prims:[{type:'sprite',at:onPlate(X,Y,z),size:[5,5,10],r:5.5,draw:()=>`<ellipse cx=".6" cy="1" rx="5.8" ry="2.5" fill="#963621" opacity=".4"/><path class="o" fill="#7c3d25" d="${blob(5.4,.94,seed)}" transform="translate(0 -4.4)"/><path fill="#b06a3d" d="M-4.3 -5.2C-4.2 -9.1 1.5 -9.9 3.2 -6.8C1.2 -7.3 -.8 -4.1 -4.3 -5.2Z"/><path fill="#e5431f" d="M-3 -.5Q-.4 -2.6 2.7 -1.1Q4.4 -.2 2.5 .8Q.2 -.2 -2.1 1Z"/>`+[[-2.9,-6.8],[.5,-7.4],[3.1,-4.1],[-2,-3.2],[.7,-4.8],[2,-1.9]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i%2?.45:.65}" fill="${i%2?'#d69b62':'#542b1d'}"/>`).join('')+'<circle cx="-1.3" cy="-5.4" r=".4" fill="#3f6a36"/><circle cx="2.6" cy="-6" r=".35" fill="#3f6a36"/>'}],from,t,rot});
  const SHARDS=[[[-13.4,.4],[-9.6,-2.4],[-8.6,1.4]],[[8.8,-4.6],[12.8,-5],[11.4,-1.6]],[[-4.8,4.6],[-1,3.6],[-2.6,6.6]],[[10.2,2.4],[13.4,1.6],[12.4,4.8]]];
  const parm={type:'sprite',at:[0,0,15],size:[8,8,3],r:7,draw:()=>SHARDS.map(s=>`<path class="o" fill="#fdf8e8" d="${d(s)}"/>`).join('')};
  const basil={type:'sprite',at:[0,0,18.5],size:[6,6,2],r:5,draw:px=>leaf(.5,0,-28,9.5,3.6,px)+leaf(0,.4,205,8,3.1,px)+leaf(-.4,.6,118,6,2.5,px)};
  const overlay=(local,P)=>{
    const r=smooth(clamp((local-.88)/.08));if(!r)return'';
    const[x,y]=P([0,0,25]);
    return`<g transform="translate(${fx(x)} ${fx(y)}) scale(${fx(P.s)})" fill="none" stroke="${INK}" stroke-linecap="round" opacity=".7">`+[-6,0,6].map((x0,i)=>`<path pathLength="1" stroke-dasharray="1" stroke-dashoffset="${fx(1-r)}" stroke-width="${fx(1.4/P.s)}" d="M${x0} ${i===1?-2:0}c-3 -3 3 -6 0 -9s3 -6 0 -9"/>`).join('')+'</g>';
  };
  return{name:'Cook',overlay,extra:[[0,0,46]],parts:[
    {id:'A',name:'Plate',t:[.03,.14],from:[0,0,14],items:[plate]},
    {id:'B',name:'Tagliatelle',t:[.13,.29],from:[-8,-8,50],rot:-16,items:[nest]},
    {id:'C',name:'Sauce',t:[.28,.41],from:[32,-24,44],rot:28,items:[sauce]},
    {id:'D',name:'Tomatoes ×3',items:[tomato(21,4,[18,-38,24],[.4,.51],48),tomato(-22,6,[-25,25,22],[.44,.55],-56),tomato(8,13,[37,-43,18],[.48,.59],34)]},
    {id:'E',name:'Meatballs ×3',items:[meatball(-11,3,8,[-30,-15,36],[.49,.59],-38,1),meatball(12,2,10,[25,-25,47],[.54,.64],42,2),meatball(-1,-7,12,[0,0,54],[.59,.69],-22,3)]},
    {id:'F',name:'Parmesan',t:[.67,.77],from:[-30,34,36],rot:-30,items:[parm]},
    {id:'G',name:'Basil',t:[.76,.86],from:[-29,5,50],rot:70,items:[basil]}]};
}

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

const scenes=[laptop(),kitchen(),pasta()].map((def,i)=>{
  const movers=[];
  def.parts.forEach((part,pi)=>part.items.forEach(raw=>{const it=raw.type?{prims:[raw]}:raw;movers.push({part:pi,prims:it.prims,dyn:it.dyn,from:it.from||part.from||[0,0,0],t:it.t||part.t,rot:it.rot??part.rot??0,glide:it.glide??part.glide,follow:it.follow??part.follow})}));
  movers.forEach(m=>{if(m.follow)m.parent=movers.find(x=>def.parts[x.part].id===m.follow)});
  lists[i].innerHTML=def.parts.map(p=>`<li><span>${p.id}</span>${p.name}<b>✓</b></li>`).join('');
  def.parts.forEach((p,pi)=>{p.li=lists[i].children[pi]});
  return{def,sheet:sheets[i],svg:sheets[i].querySelector('svg'),movers,order:[],W:0,H:0};
});

function build(sc){
  const W=sc.sheet.clientWidth,H=sc.sheet.clientHeight;
  if(!W||!H||(W===sc.W&&H===sc.H))return;
  sc.W=W;sc.H=H;sc.last=null;
  // Fit the union of the exploded and assembled drawing into the sheet, above its title block.
  const raw=projector({s:1,x:0,y:0}),b=[1/0,1/0,-1/0,-1/0],grow=p=>{const[x,y]=raw(p);b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y)};
  sc.movers.forEach(m=>{(m.dyn?m.dyn(0):m.prims).forEach(k=>points(k).forEach(p=>{grow(p);grow(add(p,m.from));grow(ground(p))}));if(m.dyn)m.dyn(1).forEach(k=>points(k).forEach(grow))});
  const cap=sc.sheet.querySelector('figcaption'),pad=clamp(Math.min(W,H)*.08,22,56),bottom=(cap?cap.offsetHeight:0)+pad*.5;
  const s=Math.min((W-pad*2)/(b[2]-b[0]),(H-pad-bottom)/(b[3]-b[1]));
  const f={s,x:W/2-s*(b[0]+b[2])/2,y:pad+(H-pad-bottom-s*(b[3]-b[1]))/2-s*b[1]},P=projector(f);
  sc.f=f;sc.P=P;sc.frame={pad,bottom};sc.extra=sc.def.extra&&box2(sc.def.extra.map(P));
  sc.svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  sc.svg.innerHTML='<g class="a-world"><g class="a-shadows"></g><g class="a-guides"></g><g class="a-bodies"></g><g class="a-overlay"></g></g><g class="a-tags"></g>';
  const[world,tags]=sc.svg.children,[shadows,guides,bodies,overlay]=world.children;
  sc.world=world;sc.bodies=bodies;sc.overlay=overlay;
  sc.movers.forEach(m=>{
    const rest=m.dyn?m.dyn(0):m.prims;
    m.body=bodies.appendChild(document.createElementNS(NS,'g'));
    m.shadow=shadows.appendChild(document.createElementNS(NS,'path'));
    m.guide=guides.appendChild(document.createElementNS(NS,'path'));
    if(!m.dyn){m.body.innerHTML=rest.map(k=>draw(k,P)).join('');m.shadow.setAttribute('d',shadowOf(rest,P))}
    m.rest=aabb(rest);m.rscr=sbox(rest,P);m.rsh=shbox(rest,P);
    m.anchor=P([0,1,2].map(i=>(m.rest[i]+m.rest[i+3])/2));
    m.pivot=rest[0].type==='sprite'?P(rest[0].at):m.anchor;
  });
  sc.order=[...sc.movers];
  sc.def.parts.forEach((part,pi)=>{
    part.tag=null;
    if(!sc.movers.some(m=>m.part===pi))return;
    part.tag=tags.appendChild(document.createElementNS(NS,'g'));
    part.tag.innerHTML=`<circle r="2.2" fill="${BLUE}"/><path stroke="${BLUE}"/><g><circle r="10.5" fill="${PAPER}" stroke="${BLUE}" stroke-width="1.5"/><text y=".5" text-anchor="middle" dominant-baseline="central" fill="${BLUE}">${part.id}</text></g>`;
  });
}

function render(sc,local){
  if(!sc.P||local===sc.last)return;
  sc.last=local;
  const P=sc.P,s=sc.f.s;
  sc.movers.forEach(m=>{
    // Horizontal travel eases; vertical travel falls under gravity, lands, and bounces once.
    const v=clamp((local-m.t[0])/(m.t[1]-m.t[0])),falls=m.from[2]>0&&!m.glide,h=smooth(falls?clamp(v/.78):v),z=falls?drop(v):h;
    m.v=v;m.h=h;m.own=[m.from[0]*(1-h),m.from[1]*(1-h),m.from[2]*(1-z)];
  });
  // A part that rides on another (the cooler on its tray) adds the carrier's travel to its own.
  sc.movers.forEach(m=>{
    const v=m.v,h=m.h,base=m.parent?m.parent.own:[0,0,0],off=add(m.own,base);
    if(m.dyn){const prims=m.dyn(local);m.body.innerHTML=prims.map(k=>draw(k,P)).join('');m.shadow.setAttribute('d',shadowOf(prims,P));m.rest=aabb(prims);m.rscr=sbox(prims,P);m.rsh=shbox(prims,P)}
    const t=shift(s,off),g=shift(s,[off[0]+LIGHT[0]*off[2],off[1]+LIGHT[1]*off[2],0]),r=m.rot*(1-h);
    m.body.setAttribute('transform',`translate(${fx(t[0])} ${fx(t[1])})`+(r?` rotate(${fx(r)} ${fx(m.pivot[0])} ${fx(m.pivot[1])})`:''));
    m.shadow.setAttribute('transform',`translate(${fx(g[0])} ${fx(g[1])})`);
    m.shadow.style.opacity=fx(.1+.9*v*v);
    m.box=m.rest.map((x,i)=>x+off[i%3]);m.scr=[m.rscr[0]+t[0],m.rscr[1]+t[1],m.rscr[2]+t[0],m.rscr[3]+t[1]];m.t2=t;m.g=g;
    const b=shift(s,base),a=[m.anchor[0]+b[0],m.anchor[1]+b[1]],show=v<1&&Math.hypot(t[0]-b[0],t[1]-b[1])>6;
    m.guide.setAttribute('d',show?`M${fx(m.anchor[0]+t[0])} ${fx(m.anchor[1]+t[1])}L${fx(a[0])} ${fx(a[1])}`:'');
    m.guide.style.opacity=show?clamp((1-v)*5):0;
  });
  const order=depthSort(sc.movers);
  if(order.some((m,i)=>m!==sc.order[i])){order.forEach(m=>sc.bodies.appendChild(m.body));sc.order=order}
  sc.def.parts.forEach((part,pi)=>{
    const ms=sc.movers.filter(m=>m.part===pi),vs=ms.length?ms.map(m=>m.v):[clamp((local-part.t[0])/(part.t[1]-part.t[0]))];
    const done=Math.min(...vs)>=1,started=Math.max(...vs);
    part.li.classList.toggle('is-done',done);
    part.li.classList.toggle('is-active',!done&&started>0);
    part.op=done?0:clamp((1-started)*6);
  });
  // The camera frames whatever is on the sheet right now, so it closes in as the parts come together.
  const B=box2([]),{pad,bottom}=sc.frame,room=44*Math.max(...sc.def.parts.map(p=>p.tag?p.op:0));
  sc.movers.forEach(m=>{box2([m.scr.slice(0,2),m.scr.slice(2)],B);if(isFinite(m.rsh[0]))box2([[m.rsh[0]+m.g[0],m.rsh[1]+m.g[1]],[m.rsh[2]+m.g[0],m.rsh[3]+m.g[1]]],B)});
  if(sc.extra)box2([sc.extra.slice(0,2),sc.extra.slice(2)],B);
  const Z=Math.min(1.7,(sc.W-pad*2-room*2)/(B[2]-B[0]),(sc.H-pad-bottom)/(B[3]-B[1])),cx=sc.W/2-Z*(B[0]+B[2])/2,cy=pad+(sc.H-pad-bottom)/2-Z*(B[1]+B[3])/2;
  sc.world.setAttribute('transform',`translate(${fx(cx)} ${fx(cy)}) scale(${Z.toFixed(4)})`);
  sc.def.parts.forEach((part,pi)=>{
    if(!part.tag)return;
    const m=sc.movers.find(m=>m.part===pi),y=cy+Z*(m.anchor[1]+m.t2[1]),right=cx+Z*(m.anchor[0]+m.t2[0])>=sc.W/2,x=cx+Z*(right?m.scr[2]-6:m.scr[0]+6),k=right?1:-1,[dot,line,ball]=part.tag.children;
    dot.setAttribute('transform',`translate(${fx(x)} ${fx(y)})`);
    line.setAttribute('d',`M${fx(x)} ${fx(y)}h${k*22}`);
    ball.setAttribute('transform',`translate(${fx(x+k*32)} ${fx(y)})`);
    part.tag.style.opacity=part.op;
  });
  sc.overlay.innerHTML=sc.def.overlay?sc.def.overlay(local,P):'';
}

let pending=false,current=-1,still=null;
function paint(){
  pending=false;
  const now=document.body.classList.contains('no-motion');
  if(now!==still){still=now;current=-1;scenes.forEach(sc=>{sc.W=0;sc.sheet.style.visibility='';sc.sheet.style.transform=''})}
  scenes.forEach(build);
  if(still){scenes.forEach(sc=>render(sc,1));return}
  const r=section.getBoundingClientRect();
  if(r.bottom<-50||r.top>innerHeight+50)return;
  const k=3*clamp(-r.top/Math.max(1,r.height-pin.offsetHeight)),cur=Math.min(2,Math.floor(k));
  // Finished sheets slide up and out as the next one slides in, like turning to the next page of a manual.
  scenes.forEach((sc,i)=>{
    const local=k-i,enter=i?smooth(clamp((local+.08)/.16)):1,leave=i<2?smooth(clamp((local-.92)/.16)):0,y=(1-enter-leave)*sc.H;
    sc.sheet.style.visibility=Math.abs(y)<sc.H?'visible':'hidden';
    sc.sheet.style.transform=y?`translateY(${fx(y)}px)`:'';
    if(Math.abs(y)<sc.H)render(sc,local);
  });
  bars.forEach((b,i)=>b.style.setProperty('--p',clamp(k-i)));
  if(cur!==current){
    current=cur;
    stepNo.textContent=`STEP 0${cur+1}`;
    stepName.textContent=scenes[cur].def.name;
    sheetNo.textContent=`0${cur+1}`;
    lists.forEach((l,i)=>l.classList.toggle('is-current',i===cur));
  }
}
function request(){if(!pending){pending=true;requestAnimationFrame(paint)}}
addEventListener('scroll',request,{passive:true});
addEventListener('resize',request);
new MutationObserver(request).observe(document.body,{attributes:true,attributeFilter:['class']});
document.fonts?.ready.then(()=>{scenes.forEach(sc=>{sc.W=0});request()});
request();
})();
