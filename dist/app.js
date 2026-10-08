(()=>{const reduce=matchMedia('(prefers-reduced-motion: reduce)');const button=document.querySelector('#motion');let disabled=reduce.matches;const letters=[...document.querySelectorAll('.builder>span')];const assembly=document.querySelector('.assembly');const assemblyPin=assembly.querySelector('.assembly-pin');const assemblyScenes=[...assembly.querySelectorAll('.assembly-scene')];const assemblySteps=[...assembly.querySelectorAll('.assembly-step')];const star=document.querySelector('.kitchen-star');const system=document.querySelector('.system-visual');const progress=document.querySelector('.progress');let pending=false;const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));function paintAssembly(){
const r=assembly.getBoundingClientRect();
const p=clamp(-r.top/Math.max(1,r.height-assemblyPin.getBoundingClientRect().height));
const stage=Math.min(2,Math.floor(p*3));
const local=p*3-stage;
assembly.dataset.scene=['code','build','cook'][stage];
assemblyScenes.forEach((scene,i)=>{
scene.classList.toggle('is-current',i===stage);
assemblySteps[i].style.setProperty('--step-progress',clamp(p*3-i));
});
const scene=assemblyScenes[stage],object=scene.querySelector('.assembly-object');
scene.querySelectorAll('.assembly-piece').forEach(piece=>{
const d=piece.dataset;
const v=clamp((local-Number(d.start))/(Number(d.end)-Number(d.start)));
const t=v*v*(3-2*v);
const cx=Number(d.cx??.5),cy=Number(d.cy??.5);
const targetX=object.offsetLeft-object.offsetWidth/2+piece.offsetLeft+piece.offsetWidth*cx;
const targetY=object.offsetTop-object.offsetHeight/2+piece.offsetTop+piece.offsetHeight*cy;
const dx=(Number(d.x)*scene.clientWidth-targetX)*(1-t);
const dy=(Number(d.y)*scene.clientHeight-targetY)*(1-t)-Math.sin(t*Math.PI)*scene.clientHeight*.06;
piece.style.setProperty('--dx',dx+'px');
piece.style.setProperty('--dy',dy+'px');
piece.style.setProperty('--rotation',Number(d.angle)*(1-t)+'deg');
});
}function paint(){pending=false;const y=scrollY,h=innerHeight;progress.style.transform=`scaleX(${clamp(y/(document.documentElement.scrollHeight-h))})`;if(disabled)return;paintAssembly();letters.forEach((l,i)=>{const p=clamp(y/h);l.style.transform=`translateY(${p*(i%2?-32:25)}px) rotate(${p*(i-3)*1.5}deg)`});const kr=star.getBoundingClientRect();star.style.transform=`rotate(${(h-kr.top)*.06}deg)`;if(system){const sr=system.getBoundingClientRect();system.style.transform=`rotate(${clamp((sr.top/h)*6,-3,3)}deg)`}}function request(){if(!pending){pending=true;requestAnimationFrame(paint)}}function sync(){document.body.classList.toggle('no-motion',disabled);button.setAttribute('aria-pressed',String(disabled));button.textContent=disabled?'Motion off':'Motion on';document.documentElement.style.scrollBehavior=disabled?'auto':'smooth';request()}button.addEventListener('click',()=>{disabled=!disabled;sync()});reduce.addEventListener('change',e=>{disabled=e.matches;sync()});addEventListener('scroll',request,{passive:true});addEventListener('resize',request);sync()})();
