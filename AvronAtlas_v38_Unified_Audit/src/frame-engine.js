/* Shared exact crop renderer for Creative Studio and timeline scenes. */
(()=>{'use strict';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const dimensions=new Map();
function register(src,w,h){if(src&&w>0&&h>0)dimensions.set(src,{w,h});}
const validCrop=c=>c&&Number.isFinite(+c.x)&&Number.isFinite(+c.y)&&Number.isFinite(+c.w)&&Number.isFinite(+c.h);
function normal(c){if(!validCrop(c))return {x:0,y:0,w:1,h:1};const w=clamp(+c.w,.015,1),h=clamp(+c.h,.015,1);return {x:clamp(+c.x,0,1-w),y:clamp(+c.y,0,1-h),w,h};}
function viewBox(c,w,h){return [c.x*w,c.y*h,c.w*w,c.h*h].map(x=>+x.toFixed(3)).join(' ');}
function mount(element,src,crop,options={}){
  if(!element)return ()=>{};
  const c=normal(crop),motion=options.motion||'still',duration=Math.max(200,Number(options.duration||7)*1000);
  let raf=0,disposed=false;
  element.classList.add('avron-frame-viewport');
  const cached=dimensions.get(src);
  const old=element.querySelector('svg.avron-frame-svg');
  if(cached&&old&&element.dataset.frameSource===src&&options.autoplay===false){
    old.setAttribute('viewBox',viewBox(c,cached.w,cached.h));
    element.dataset.frameFinal=old.getAttribute('viewBox');return ()=>{};
  }
  element.replaceChildren();
  if(!src){const empty=document.createElement('div');empty.className='avron-frame-empty';empty.textContent='ИЗОБРАЖЕНИЕ НЕ ВЫБРАНО';element.append(empty);return ()=>{};}
  const image=new Image();
  image.onload=()=>{
    if(disposed||!element.isConnected)return;
    const w=image.naturalWidth||1,h=image.naturalHeight||1;register(src,w,h);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('avron-frame-svg');svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.setAttribute('aria-hidden','true');
    const node=document.createElementNS('http://www.w3.org/2000/svg','image');
    node.setAttribute('width',w);node.setAttribute('height',h);node.setAttribute('x',0);node.setAttribute('y',0);node.setAttribute('preserveAspectRatio','none');node.setAttribute('href',src);
    svg.append(node);element.replaceChildren(svg);element.dataset.frameSource=src;
    const full={x:0,y:0,w:1,h:1};
    const end=c;
    const glideStart={...c,x:clamp(c.x-c.w*.08,0,1-c.w),y:clamp(c.y-c.h*.04,0,1-c.h)};
    let start=full,finish=end;
    if(motion==='glide')start=glideStart;
    if(motion==='pullback'){start=end;finish=full;}
    if(motion==='still'||motion==='reveal')start=end;
    const apply=b=>{svg.setAttribute('viewBox',viewBox(b,w,h));element.dataset.frameFinal=viewBox(b,w,h);};
    apply(start);
    if(options.autoplay===false||motion==='still'){apply(end);return;}
    if(motion==='reveal'){
      apply(end);svg.animate([{opacity:0,filter:'blur(16px)'},{opacity:1,filter:'blur(0px)'}],{duration,easing:'ease-out',fill:'forwards'});return;
    }
    const begin=performance.now();
    function tick(now){if(disposed||!element.isConnected)return;const t=clamp((now-begin)/duration,0,1);const ease=t*t*(3-2*t);const box={};for(const key of ['x','y','w','h'])box[key]=start[key]+(finish[key]-start[key])*ease;apply(box);if(t<1)raf=requestAnimationFrame(tick);}
    raf=requestAnimationFrame(tick);
  };
  image.onerror=()=>{if(!disposed){element.textContent='Не удалось загрузить изображение';element.classList.add('avron-frame-empty');}};
  if(cached){image.onload=()=>{}; // Use cached image dimensions without decoding again.
    image.onload=null;const w=cached.w,h=cached.h;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('avron-frame-svg');svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.setAttribute('aria-hidden','true');
    const node=document.createElementNS('http://www.w3.org/2000/svg','image');node.setAttribute('width',w);node.setAttribute('height',h);node.setAttribute('href',src);svg.append(node);element.replaceChildren(svg);element.dataset.frameSource=src;
    const end=c,full={x:0,y:0,w:1,h:1};let start=full,finish=end;if(motion==='glide')start={...c,x:clamp(c.x-c.w*.08,0,1-c.w)};if(motion==='pullback'){start=end;finish=full;}if(motion==='still'||motion==='reveal')start=end;
    const apply=b=>{svg.setAttribute('viewBox',viewBox(b,w,h));element.dataset.frameFinal=svg.getAttribute('viewBox');};apply(start);
    if(options.autoplay!==false&&motion!=='still'){if(motion==='reveal'){apply(end);svg.animate([{opacity:0,filter:'blur(16px)'},{opacity:1,filter:'blur(0px)'}],{duration,easing:'ease-out',fill:'forwards'});}else{const begin=performance.now();const tick=now=>{if(disposed||!element.isConnected)return;const t=clamp((now-begin)/duration,0,1),ease=t*t*(3-2*t),b={};for(const key of ['x','y','w','h'])b[key]=start[key]+(finish[key]-start[key])*ease;apply(b);if(t<1)raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);}}else apply(end);
  }else image.src=src;
  return ()=>{disposed=true;cancelAnimationFrame(raf);image.onload=null;image.onerror=null;};
}
window.AvronFrame={mount,normal,viewBox,register};
})();
