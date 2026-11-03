/* Avron Adventure HUD: compact, contextual map tools. No changes to Phaser scene state. */
(()=>{'use strict';
const host=document.querySelector('.map-area');if(!host)return;
const state={tab:'time',minimized:true,year:null,campaign:null,route:null,selected:null,zoom:4};
const root=document.createElement('div');root.id='avronHud';root.className='avron-hud';host.appendChild(root);
const W=()=>window.S?.world || (typeof S!=='undefined'?S.world:null);
const tl=()=>W()?.timeline||{};const camps=()=>(tl().campaigns||[]);const evs=()=>(tl().events||[]);
const byId=(xs,id)=>xs?.find(x=>x.id===id);
const sorted=()=>evs().slice().sort((a,b)=>(Number(a.year)||0)-(Number(b.year)||0)||Number(a.day||1)-Number(b.day||1));
const camp=()=>byId(camps(),state.campaign)||camps()[0];
const route=()=>byId(camp()?.routes,state.route)||camp()?.routes?.[0];
const filtered=()=>sorted().filter(e=>e.campaignId===camp()?.id);
const showInRoute=(e,r)=>!r||r.id===camp()?.routes?.[0]?.id||(e.routeDefaults||[]).some(v=>v.routeId===r.id);
const yearOf=(e,r)=>window.AvronTimeline?.yearForRoute?.(e,r?.id) ?? (Number(e.year)||0);
function tickYears(){const ys=filtered().map(e=>yearOf(e,route()));const focus=state.year??(ys[0]??748);const d=Math.max(2,Math.min(10,state.zoom));return Array.from({length:2*d+1},(_,i)=>focus-d+i)}
function dateLabel(ev){const c=camp(),cal=byId(tl().calendars,c?.calendarId);const month=byId(cal?.months,ev.monthId);return `${ev.day||1} ${month?.name||'месяц'} · ${yearOf(ev,route())||0} ${byId(tl().eras,c?.eraId)?.short||''}`}
const artOf=e=>e?.art||'';
function openEvent(e,r){if(!e)return;state.selected=e.id;window.AvronTimeline?.openEventById(e.id,r?.id||route()?.id)}
function jumpFull(){if(typeof switchScreen==='function')switchScreen('timeline');}
function navigate(screen){if(screen==='gods')document.getElementById('pantheonNav')?.click();else if(screen==='tales')window.PantheonChronicleLibrary?.open();else if(screen==='encyclopedia'&&typeof switchScreen==='function')switchScreen('encyclopedia');else if(screen==='tools'){if(typeof setMode==='function')setMode('edit');}else if(screen==='timeline')jumpFull();}
const eEsc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function active(){return W() && typeof S!=='undefined' && S.screen==='map'}
function render(){if(!active()){root.hidden=true;return;}root.hidden=false; const c=camp(),r=route(), events=filtered();if(!c){root.innerHTML='';root.hidden=true;return;}
 if(!state.campaign)state.campaign=c.id;
 const years=tickYears(),selected=byId(events,state.selected)||events.find(e=>yearOf(e,r)===Number(state.year))||events[0];
 if(state.year===null)state.year=selected?yearOf(selected,r):748;
 const exact=events.filter(e=>yearOf(e,r)===Number(state.year)&&showInRoute(e,r));
 const tales=(window.AvronChronicleLinks?.forYear(state.year,c.id)||[]).filter(s=>S.mode==='edit'||s.published!==false).filter(s=>!s.timelineRef?.routeId||s.timelineRef.routeId===r?.id);
 root.innerHTML=`<div class="ah-dock"><button class="ah-dock-item ${state.tab==='time'?'active':''}" data-tab="time" title="Время"><span>◷</span><small>Время</small></button><button class="ah-dock-item" data-nav="gods" title="Пантеон"><span>✦</span><small>Боги</small></button><button class="ah-dock-item" data-nav="tales" title="Летописи"><span>▤</span><small>Сказания</small></button><button class="ah-dock-item" data-nav="encyclopedia" title="Энциклопедия"><span>◈</span><small>Знания</small></button><button class="ah-dock-item" data-nav="timeline" title="Большая хронология"><span>⌁</span><small>Вся шкала</small></button></div>
 <section class="ah-panel ${state.minimized?'ah-minimized':''}"><div class="ah-panel-header"><div class="ah-star">✷</div><div class="ah-heading"><small>ЖИВОЙ АТЛАС · ИСТОРИЯ</small><strong>${eEsc(c.name)}</strong></div><button class="ah-toggle" data-toggle title="Свернуть шкалу">${state.minimized?'⌃':'⌄'}</button></div>
 <div class="ah-panel-body"><div class="ah-select-row"><label>Кампания <select data-campaign>${camps().map(x=>`<option value="${eEsc(x.id)}" ${x.id===c.id?'selected':''}>${eEsc(x.name)}</option>`).join('')}</select></label><label>Линия <select data-route>${(c.routes||[]).map(x=>`<option value="${eEsc(x.id)}" ${x.id===r?.id?'selected':''}>${eEsc(x.name)}</option>`).join('')}</select></label></div>
 <div class="ah-year-head"><span>ВРЕМЯ МИРА</span><strong>${state.year} <small>${eEsc(byId(tl().eras,c.eraId)?.short||'')}</small></strong><div class="ah-year-buttons"><button data-prev title="Предыдущий год">‹</button><button data-next title="Следующий год">›</button></div></div>
 <div class="ah-track" data-track>${years.map(y=>`<div class="ah-year ${y===Number(state.year)?'chosen':''}" data-year="${y}"><span>${y}</span><i></i><b>${events.some(e=>yearOf(e,r)===y&&showInRoute(e,r))?'✦':''}</b></div>`).join('')}</div>
 <div class="ah-chapter-label">${exact.length?'СОБЫТИЯ В ЭТОМ ГОДУ':'В ЭТОМ ГОДУ ТИХО'} ${typeof S!=='undefined'&&S.mode==='edit'?'<span>✥ Перетащи событие на год</span>':''}</div>
 <div class="ah-events" data-events>${exact.length?exact.map(e=>`<button class="ah-event" data-event="${eEsc(e.id)}" ${typeof S!=='undefined'&&S.mode==='edit'?'data-draggable="true"':''}><div class="ah-event-art">${artOf(e)?`<img src="${eEsc(artOf(e))}" alt="">`:'✧'}</div><div class="ah-event-copy"><strong>${eEsc(e.title)}</strong><small>${eEsc(dateLabel(e))}</small></div><span class="ah-arrow">➜</span></button>`).join(''):'<div class="ah-silent">Здесь пока нет записей.<br>Листай время — истории ещё впереди.</div>'}</div>
 ${tales.length?`<div class="ah-tales"><small>✧ ЛЕТОПИСИ ${state.year} ГОДА</small>${tales.slice(0,5).map(s=>`<button data-tale="${eEsc(s.id)}">▶ ${eEsc(s.name)}</button>`).join('')}</div>`:''}
 <div class="ah-footer"><button data-full>✦ Открыть все эпохи</button>${typeof S!=='undefined'&&S.mode==='edit'?'<span>РЕДАКТОР · перенос включён</span>':'<span>НАЙДИ СВОЮ ИСТОРИЮ</span>'}</div></div></section>`;
 bind();}
function setYear(n){state.year=Math.round(n);state.selected=null;window.AvronTimeline?.setYear(state.year,{source:'hud',campaignId:camp()?.id,routeId:route()?.id});render();}
function bind(){root.querySelectorAll('[data-tale]').forEach(b=>b.onclick=()=>{const s=(W()?.chronicles||[]).find(c=>c.id===b.dataset.tale);if(s)window.PantheonStartCinematic?.(s);});root.querySelector('[data-toggle]')?.addEventListener('click',()=>{state.minimized=!state.minimized;render();});root.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.nav)));root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{state.minimized=false;render();}));root.querySelector('[data-campaign]')?.addEventListener('change',e=>{state.campaign=e.target.value;state.route=null;state.year=null;render()});root.querySelector('[data-route]')?.addEventListener('change',e=>{state.route=e.target.value;render()});root.querySelector('[data-prev]')?.addEventListener('click',()=>setYear(state.year-1));root.querySelector('[data-next]')?.addEventListener('click',()=>setYear(state.year+1));root.querySelector('[data-full]')?.addEventListener('click',jumpFull);root.querySelectorAll('[data-year]').forEach(b=>b.addEventListener('click',()=>setYear(Number(b.dataset.year))));root.querySelectorAll('[data-event]').forEach(b=>{
 b.addEventListener('click',e=>{if(b.dataset.dragged==='1'){b.dataset.dragged='';e.preventDefault();return;}openEvent(byId(evs(),b.dataset.event),route());});
 if(b.dataset.draggable)wireDrag(b,b.dataset.event);
 });}
function wireDrag(element,id){
 element.style.touchAction='none';
 element.addEventListener('pointerdown',start=>{
   if(start.button!==0)return;
   const sx=start.clientX, sy=start.clientY;let dragging=false,hover=null,ghost=null,ended=false;
   const years=()=>[...root.querySelectorAll('[data-year]')];
   function move(e){
     if(ended)return;
     if(!dragging&&Math.hypot(e.clientX-sx,e.clientY-sy)>6){dragging=true;ghost=element.cloneNode(true);ghost.classList.add('ah-drag-ghost');document.body.append(ghost);element.classList.add('ah-source-dragging');}
     if(!dragging)return;e.preventDefault();ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
     // Geometric hit test, independent of captured pointer element.
     const next=years().find(c=>{const b=c.getBoundingClientRect();return e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom;});
     if(hover&&hover!==next)hover.classList.remove('ah-drop-target');hover=next;if(hover)hover.classList.add('ah-drop-target');
   }
   function end(e){if(ended)return;ended=true;document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',cancel);ghost?.remove();element.classList.remove('ah-source-dragging');hover?.classList.remove('ah-drop-target');if(!dragging)return;
     element.dataset.dragged='1';setTimeout(()=>{if(element.isConnected)element.dataset.dragged='';},180);
     if(hover){const y=Number(hover.dataset.year);if(window.AvronTimeline?.moveEvent(id,y,route()?.id)){state.year=y;state.selected=id;render();}}
   }
   const cancel=e=>{hover=null;end(e)};
   document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',end);document.addEventListener('pointercancel',cancel);
 });
}
window.AvronMapHud={render,refresh:render,setYear,open:()=>{state.minimized=false;render();},openAdventure:()=>{if(!camps().length){window.AvronDirector?.timeline?.();return;}state.minimized=false;render();}};
window.addEventListener('avron-world-loaded',()=>{state.campaign=null;state.route=null;state.year=null;render();});window.addEventListener('avron-mode-changed',render);window.addEventListener('avron-timeline-changed',e=>{if(e.detail?.campaignId)state.campaign=e.detail.campaignId;if(e.detail?.routeId)state.route=e.detail.routeId;if(Number.isFinite(Number(e.detail?.year)))state.year=Number(e.detail.year);if(active())render();});
window.addEventListener('avron-timeline-selection',e=>{if(e.detail?.source==='hud')return;const d=e.detail||{};if(d.campaignId)state.campaign=d.campaignId;if(d.routeId)state.route=d.routeId;if(Number.isFinite(Number(d.year)))state.year=Number(d.year);if(active())render();});
const watch=new MutationObserver(()=>{if(active())render();else root.hidden=true;});watch.observe(document.querySelector('#workspace'),{attributes:true,attributeFilter:['class']});
setTimeout(render,300);
})();
