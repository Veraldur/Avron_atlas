/* v15 unified popup interaction; scenes share original blocks and keyframes. */
(()=>{'use strict';
const w=()=>window.S?.world;const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let armed='',lastId='';
function scene(id){return w()?.entities?.find(e=>e.id===id)?.popup;}
function teaser(id){const p=scene(id);if(!p||p.kind!=='scene')return;let panel=[...document.querySelectorAll('.map-popup')].find(el=>el.dataset.entityId===id);if(!panel)return;const stage=panel.querySelector('.map-popup-canvas');if(!stage)return;
if(panel.dataset.playing==='1')return;panel.dataset.playing='1';const frames=[...(p.scene?.keyframes||[])].sort((a,b)=>(+a.at||0)-(+b.at||0));const duration=Math.max(.3,Number(p.scene?.duration)||4);const layers=[...stage.children];
if(!frames.length){panel.dataset.playing='';return;} let started=performance.now(),raf=0; panel.classList.add('av15-scene-playing');
const tick=now=>{if(!panel.isConnected){panel.dataset.playing='';return;}const t=Math.min(duration,(now-started)/1000);const before=[...frames].reverse().find(f=>(+f.at||0)<=t)||frames[0];const after=frames.find(f=>(+f.at||0)>=t)||frames[frames.length-1];const ratio=Math.max(0,Math.min(1,(t-(+before.at||0))/Math.max(.001,(+after.at||0)-(+before.at||0))));
(p.blocks||[]).forEach((b,i)=>{const el=layers[i];if(!el)return;const a=before.layers?.[b.id]||{},c=after.layers?.[b.id]||{};const lerp=(k,def)=>{const x=Number(a[k]??def),y=Number(c[k]??a[k]??def);return x+(y-x)*ratio};el.style.left=lerp('x',Number(b.x)||0)+'px';el.style.top=lerp('y',Number(b.y)||0)+'px';el.style.opacity=String(lerp('opacity',1));el.style.transform=`scale(${lerp('scale',1)})`;});if(t<duration)raf=requestAnimationFrame(tick);else {panel.classList.remove('av15-scene-playing');panel.dataset.playing='';}};requestAnimationFrame(tick);
}
// Scene teaser is invoked only by the small scene glyph in the already opened Pop-up.
// Opening or selecting a map object never starts an animation implicitly.
window.AvronPopupUnified={teaser};
})();