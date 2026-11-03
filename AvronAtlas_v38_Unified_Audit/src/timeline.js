(function(){
'use strict';
const st = { campaignId:'', routeId:'', eventId:'', year:null, editorOpen:true };
const $=id=>document.getElementById(id);
const el=(tag,props,...kids)=>{ const n=document.createElement(tag); let val; for(const [k,v] of Object.entries(props||{})){ if(k==='class') n.className=v; else if(k==='style') n.style.cssText=v; else if(k==='value') val=v; else if(k==='checked') n.checked=!!v; else if(k==='disabled') n.disabled=!!v; else if(k.startsWith('on')) n.addEventListener(k.slice(2), v); else if(v!==false && v!=null) n.setAttribute(k,v);} for(const c of kids.flat(9)){ if(c==null||c===false) continue; n.append(c.nodeType ? c : document.createTextNode(c)); } if(val!==undefined) n.value=val; return n; };
const btn=(text,fn,cls)=>el('button',{class:cls||'',onclick:fn},text);
const row=(lab,ctl)=>el('label',{class:'field'},el('span',{class:'fl'},lab),ctl);
const uid=()=> (crypto.randomUUID ? crypto.randomUUID().slice(0,8) : Math.random().toString(36).slice(2,10));
function timeline(){ S.world.timeline ||= {calendars:[], eras:[], campaigns:[], events:[]}; S.world.timeline.calendars ||= []; S.world.timeline.eras ||= []; S.world.timeline.campaigns ||= []; S.world.timeline.events ||= []; return S.world.timeline; }
function worldsMaps(){ return S.world.maps || []; }
function articles(){ return S.world.articles || []; }
function entities(){ return S.world.entities || []; }
function calendars(){ return timeline().calendars; }
function eras(){ return timeline().eras; }
function campaigns(){ return timeline().campaigns; }
function events(){ return timeline().events; }
function campaign(){ let c=campaigns().find(x=>x.id===st.campaignId) || campaigns()[0]; if(c && !st.campaignId) st.campaignId=c.id; return c; }
function routeList(c=campaign()){ if(!c) return []; c.routes ||= []; return c.routes; }
function route(c=campaign()){ const list=routeList(c); let r=list.find(x=>x.id===st.routeId) || list[0]; if(r && !st.routeId) st.routeId=r.id; return r; }
function campaignEvents(c=campaign()){ if(!c) return []; const ids=new Set(c.eventIds || []); return events().filter(e=> e.campaignId===c.id || ids.has(e.id)).sort((a,b)=> (Number(a.year)||0)-(Number(b.year)||0) || monthOrder(a)-monthOrder(b) || (Number(a.day)||0)-(Number(b.day)||0)); }
function eventYearForRoute(ev, routeId){const v=(ev.routeDefaults||[]).find(x=>x.routeId===routeId);return Number(v?.year ?? ev.year)||0;}
function yearForRoute(ev, routeId){return eventYearForRoute(ev,routeId)}
function monthOrder(ev){ const cal=calendarForEvent(ev); const ids=(cal?.months||[]).map(m=>m.id); const i=ids.indexOf(ev.monthId); return i<0?999:i; }
function yearsForCampaign(c=campaign()){ return [...new Set(campaignEvents(c).flatMap(e=>[Number(e.year)||0,...(e.routeDefaults||[]).filter(v=>v.year!=null).map(v=>Number(v.year)||0)]))].sort((a,b)=>a-b); }
function selectedEvent(){ const list=campaignEvents();let r=route();let ev=list.find(x=>x.id===st.eventId && (st.year==null || yearForRoute(x,r?.id)===Number(st.year))) || (st.year!=null ? list.find(x=>yearForRoute(x,r?.id)===Number(st.year)) : null) || (st.year==null?list[0]:null);if(ev){st.eventId=ev.id;if(st.year==null)st.year=yearForRoute(ev,r?.id);}return ev; }
function eraForCampaign(c=campaign()){ return eras().find(e=>e.id===c?.eraId) || eras()[0] || {short:''}; }
function calendarForCampaign(c=campaign()){ return calendars().find(x=>x.id===c?.calendarId) || calendars()[0]; }
function calendarForEvent(ev){ const c = campaigns().find(x=>x.id===ev?.campaignId) || campaign(); return calendarForCampaign(c); }
function clampDateDay(ev){const cal=calendarForEvent(ev);const month=cal?.months?.find(m=>m.id===ev.monthId);ev.day=Math.max(1,Math.min(Number(month?.days)||100,Number(ev.day)||1));return ev.day;}
function formatDate(ev,routeId){ if(!ev) return '—'; const cal=calendarForEvent(ev); const er=eraForCampaign(campaigns().find(x=>x.id===ev.campaignId) || campaign()); const month=(cal?.months||[]).find(m=>m.id===ev.monthId); return [ev.day?String(ev.day):'', month?.name || '', String(routeId?yearForRoute(ev,routeId):ev.year??''), er?.short || ''].filter(Boolean).join(' '); }
function variantForEvent(ev, routeId){ return (ev?.routeDefaults||[]).find(v=>v.routeId===routeId) || null; }
function activePayload(ev=selectedEvent(), routeObj=route()){ if(!ev) return null; const camp=campaigns().find(c=>c.id===ev.campaignId)||campaign();const r=camp.routes?.find(x=>x.id===routeObj?.id)||camp.routes?.[0];const variant=variantForEvent(ev,r?.id); const articleId=variant?.articleId || ev.articleId; return {event:ev, variant, article: articles().find(a=>a.id===articleId) || null, route:r, campaign:camp}; }
function setDirty(){ S.unsaved=true; renderStatus?.(); scheduleSave?.(); window.dispatchEvent(new Event('avron-timeline-changed')); }
function ensureStarter(){ if(campaigns().length) return; const cal={id:'cal-custom',name:'Календарь мира',months:[{id:uid(),name:'Первомесяц',days:30},{id:uid(),name:'Второмесяц',days:30}],moons:['Первая','Вторая','Третья','Четвёртая','Пятая','Шестая']}; const er={id:'era-main',name:'Основная эра',short:'Э.М.'}; const camp={id:'camp-main',name:'Новая кампания',calendarId:cal.id,eraId:er.id,description:'Редактируемая линия событий.',routes:[{id:'route-main',name:'Основная линия',kind:'prime'}],eventIds:[]}; timeline().calendars.push(cal); timeline().eras.push(er); timeline().campaigns.push(camp); setDirty(); }
function findEventByEntity(entityId){ return events().find(ev=>ev.entityId===entityId) || null; }
function openEventByEntity(entityId){ const ev=findEventByEntity(entityId); if(!ev) return; const camp=campaigns().find(c=>c.id===ev.campaignId) || campaigns()[0]; if(camp){ st.campaignId=camp.id; const years=yearsForCampaign(camp); if(years.includes(Number(ev.year)||0)) st.year=Number(ev.year)||0; } st.eventId=ev.id; st.routeId = routeList(camp)[0]?.id || ''; openStory(); }
function openStory(eventId=st.eventId, routeId=st.routeId){ const ev=(eventId && events().find(x=>x.id===eventId)) || selectedEvent(); if(!ev) return;st.campaignId=ev.campaignId;if(routeId) st.routeId=routeId; const payload=activePayload(ev, route()); if(!payload) return;renderStory(payload); }
function storyMapImage(payload){ const map = worldsMaps().find(m=>m.id===payload.event.mapId) || worldsMaps()[0]; return map?.src || './assets/avron-map.jpg'; }
function escapeHtml(s){ return String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
const storyVisualDefaults=()=>({mode:'split',dividerStyle:'ornate',splitPos:53,feather:7,artOpacity:74,artBlur:9,gradientA:'#091623',gradientB:'#6b5a89',gradientOpacity:38,brightness:84,contrast:113});
function storyVisual(payload){return {...storyVisualDefaults(),...(payload.event.visual||{}),...(payload.variant?.visual||{})};}
function renderStory(payload){
 closeStory();
 const host=document.createElement('section');host.className='timeline-story';host.tabIndex=-1;host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');
 const focus=payload.variant?.focus||payload.event.focus||{x:.5,y:.5,zoom:2.8};
 const framing=payload.variant?.crop||payload.event.crop;
 const artFraming=payload.variant?.artCrop||payload.event.artCrop;
 const motion=payload.variant?.motion||payload.event.motion||'slow';
 const duration=payload.variant?.duration||payload.event.duration||7;
 const visual=storyVisual(payload), art=payload.variant?.art||payload.event.art||'';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||a));
 const panx=((.5-(Number(focus.x)||.5))*25).toFixed(2)+'%';
 const pany=((.5-(Number(focus.y)||.5))*18).toFixed(2)+'%';
 host.dataset.composition=art?visual.mode:'map';host.dataset.divider=visual.dividerStyle;host.dataset.motion=motion;
 host.style.setProperty('--ts-motion-duration',Math.max(2,Math.min(16,Number(duration)||7))+'s');
 if(framing){const c=framing;host.style.setProperty('--ts-frame-scale',String(Math.max(1,1/Math.max(.08,Number(c.w)||.5))));host.style.setProperty('--ts-frame-x',((.5-(Number(c.x)||0)-(Number(c.w)||.5)/2)*100)+'%');host.style.setProperty('--ts-frame-y',((.5-(Number(c.y)||0)-(Number(c.h)||.5)/2)*100)+'%');}
 if(artFraming){const c=artFraming;host.style.setProperty('--ts-art-scale',String(Math.max(1,1/Math.max(.08,Number(c.w)||1))));host.style.setProperty('--ts-art-x',((.5-(Number(c.x)||0)-(Number(c.w)||1)/2)*100)+'%');host.style.setProperty('--ts-art-y',((.5-(Number(c.y)||0)-(Number(c.h)||1)/2)*100)+'%');}
 host.style.setProperty('--story-zoom',String(clamp(focus.zoom,1,14)));
 host.style.setProperty('--story-panx',panx);host.style.setProperty('--story-pany',pany);
 host.style.setProperty('--ts-focus-x',`${clamp(focus.x,0,1)*100}%`);
 host.style.setProperty('--ts-focus-y',`${clamp(focus.y,0,1)*100}%`);
 host.style.setProperty('--ts-split',`${clamp(visual.splitPos,10,90)}%`);
 host.style.setProperty('--ts-feather',`${clamp(visual.feather,0,25)}vw`);
 host.style.setProperty('--ts-art-opacity',String(clamp(visual.artOpacity,0,100)/100));
 host.style.setProperty('--ts-art-blur',`${clamp(visual.artBlur,0,30)}px`);
 host.style.setProperty('--ts-grad-a',visual.gradientA||'#091623');
 host.style.setProperty('--ts-grad-b',visual.gradientB||'#6b5a89');
 host.style.setProperty('--ts-gradient-opacity',String(clamp(visual.gradientOpacity,0,100)/100));
 host.style.setProperty('--ts-brightness',String(clamp(visual.brightness,40,160)/100));
 host.style.setProperty('--ts-contrast',String(clamp(visual.contrast,50,180)/100));
 const articleHtml=payload.article?markdownPreview(payload.article.body||''):'<p>Для этой ветви пока не назначена статья.</p>';
 const moonList=(payload.event.moons||[]).map(x=>`<button class="timeline-pill" data-moon="${escapeHtml(x)}">◐ ${escapeHtml(moonLabel(x))}</button>`).join('');
 const mapImage=escapeHtml(storyMapImage(payload));
 host.innerHTML=`<div class="ts-bg"><div class="ts-map" style="background-image:url('${mapImage}')"></div>${art?`<div class="ts-art" style="background-image:url('${escapeHtml(art)}')"></div>`:'<div class="ts-art-placeholder">АРТ ЕЩЁ НЕ ВЫБРАН</div>'}<div class="ts-divider"></div><div class="ts-colorwash"></div><div class="ts-vignette"></div></div><div class="ts-layout"><div class="ts-top"><div class="ts-brand">✦ <span>${escapeHtml(payload.campaign.name)}</span></div><button class="ts-close" data-close>✕ Закрыть</button></div><div class="ts-lead"><div class="ts-kicker">${escapeHtml(payload.event.slug||'Событие хронологии')}</div><h2>${escapeHtml(payload.variant?.name||payload.event.title)}</h2><p>${escapeHtml(payload.variant?.summary||payload.event.summary||'')}</p></div><div class="ts-article-wrap"><article class="ts-article markdown-render">${articleHtml}</article><aside class="ts-side"><div class="box"><h4>Дата</h4><div>${escapeHtml(formatDate(payload.event,payload.route?.id))}</div></div><div class="box"><h4>Луны</h4><div class="timeline-moon-list">${moonList||'<span class="mini-info">Не указаны</span>'}</div></div><div class="box"><h4>Ветви истории</h4><div class="ts-branches">${routeList(payload.campaign).map(r=>`<button data-route="${r.id}" class="${payload.route?.id===r.id?'on':''}">${escapeHtml(r.name)}</button>`).join('')}</div></div>${S.mode==='edit'?'<div class="box"><h4>Режим автора</h4><button data-story-edit>✎ Настроить эту сцену</button></div>':''}</aside></div><div class="ts-bottom"><span>${escapeHtml(payload.route?.name||'Основная линия')}</span><span>${escapeHtml(payload.article?.title||'Статья события')}</span></div></div>`;
 document.body.appendChild(host);document.body.classList.add('cinematic-open');wireWikiLinks(host);
 // Exact crop: SVG viewBox uses original image pixel coordinates, never CSS background-cover.
 const chosenMapCrop=framing||{x:clamp((focus.x||.5)-.15,0,.7),y:clamp((focus.y||.5)-.1125,0,.775),w:.3,h:.225};
 window.AvronFrame?.mount(host.querySelector('.ts-map'),storyMapImage(payload),chosenMapCrop,{motion,duration});
 if(art)window.AvronFrame?.mount(host.querySelector('.ts-art'),art,artFraming||{x:0,y:0,w:1,h:1},{motion:'still',autoplay:false});
 const timer=setTimeout(()=>host.classList.add('ready'),1050);
 host.querySelector('[data-close]').onclick=()=>{clearTimeout(timer);closeStory()};
 host.querySelectorAll('[data-moon]').forEach(b=>b.onclick=()=>openMoonArticle(b.dataset.moon));
 const linked=window.AvronChronicleLinks?.forEvent(payload.event.id,payload.route?.id)||[];
 if(linked.length){const side=host.querySelector('.ts-side');const section=document.createElement('div');section.className='box';section.innerHTML='<h4>✧ Летописи этого события</h4>';linked.forEach(c=>{const b=document.createElement('button');b.textContent='▶ '+c.name;b.onclick=()=>{closeStory();window.PantheonStartCinematic?.(c)};section.append(b)});side.append(section);}
 host.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{st.routeId=b.dataset.route;renderStory(activePayload(payload.event,routeList(payload.campaign).find(r=>r.id===st.routeId)));});
 host.querySelector('[data-story-edit]')?.addEventListener('click',()=>{closeStory();setTimelineYear(yearForRoute(payload.event,payload.route?.id),{campaignId:payload.campaign.id,routeId:payload.route?.id,source:'full'});switchScreen('timeline');st.eventId=payload.event.id;renderTimelineScreen();document.querySelector('.tl-composer')?.scrollIntoView({behavior:'smooth',block:'center'});});
 host.addEventListener('keydown',e=>{if(e.key==='Escape')closeStory();});host.focus();window.__avronStoryHost=host;
}
function closeStory(removeClass=true){ const host=window.__avronStoryHost; if(host){ host.remove(); window.__avronStoryHost=null; } if(removeClass) document.body.classList.remove('cinematic-open'); }
function findGodArt(){ return ''; }
function monthSelect(cal, value, handler){ const opts=[el('option',{value:''},'—')].concat((cal?.months||[]).map(m=>el('option',{value:m.id},m.name))); return el('select',{class:'inp',value:value||'',onchange:handler},opts); }
function entitySelect(val, handler){ return el('select',{class:'inp',value:val||'',onchange:handler}, el('option',{value:''},'—'), entities().map(e=>el('option',{value:e.id}, (e.name||e.summary||e.id) + ' · ' + (mapOf(e.mapId)?.name || 'карта')))); }
function articleSelect(val, handler){ return el('select',{class:'inp',value:val||'',onchange:handler}, el('option',{value:''},'—'), articles().map(a=>el('option',{value:a.id}, a.title))); }
function renderTimelineScreen(){
  ensureStarter();
  const root=$('sectionScreen');
  root.textContent='';
  root.className='section-screen timeline-screen';
  const camp=campaign();
  const yearList=yearsForCampaign(camp);
  if(st.year==null && yearList.length) st.year=yearList[0];
  const list=campaignEvents(camp).filter(ev=>st.year==null||yearForRoute(ev,route()?.id)===Number(st.year));
  const ev=selectedEvent();
  const pay=activePayload(ev, route());
  const head=el('header',{class:'timeline-top'},
    el('div',{},
      el('small',{},S.world.name + ' · хроники времени'),
      el('h1',{},'Хронология мира'),
      el('p',{},'Подготовленный прототип для разных календарей, ветвей кампаний и событий, которые можно открывать как сцену — с картой, артом и статьёй.')
    ),
    el('div',{class:'btn-row'},
      btn('← К карте',()=>switchScreen('map'),'mini'),
      S.mode==='edit' ? btn(st.editorOpen?'Скрыть редактор':'Показать редактор',()=>{st.editorOpen=!st.editorOpen; renderTimelineScreen();},'mini') : null
    )
  );
  root.append(head);

  const layout=el('div',{class:'timeline-layout'});
  const side=el('aside',{class:'timeline-side'});
  const main=el('section',{class:'timeline-main'});

  side.append(el('div',{class:'timeline-card'},
    el('div',{class:'section-heading'},'КАМПАНИИ', S.mode==='edit' ? btn('＋',()=>addCampaign(),'mini') : null),
    el('div',{class:'timeline-nav-list'}, campaigns().map(c=>el('button',{class:c.id===camp?.id?'on':'', onclick:()=>{st.campaignId=c.id; st.routeId=''; st.eventId=''; st.year=null; renderTimelineScreen();}}, c.name))),
    camp ? el('p',{class:'mini-info'},camp.description||'') : el('div',{class:'timeline-empty'},'Пока нет кампаний.')
  ));
  if(camp){
    side.append(el('div',{class:'timeline-card'},
      el('div',{class:'section-heading'},'ВЕТВИ', S.mode==='edit' ? btn('＋',()=>addRoute(camp),'mini') : null),
      el('div',{class:'timeline-nav-list'}, routeList(camp).map(r=>el('button',{class:r.id===route()?.id?'on':'', onclick:()=>{st.routeId=r.id; st.eventId=''; renderTimelineScreen();}}, r.name)))
    ));
  }

  main.append(renderTimelineRail(camp,ev));
  main.append(el('div',{class:'timeline-card'},
    el('div',{class:'section-heading'},'ШКАЛА', S.mode==='edit' ? btn('＋ Событие',()=>addEvent(camp),'mini') : null),
    el('div',{class:'timeline-dates'},
      el('div',{class:'timeline-date-list'},
        list.length ? list.map(item=>el('button',{class:item.id===ev?.id?'on':'', onclick:()=>{st.eventId=item.id; renderTimelineScreen();}}, el('span',{class:'time'}, formatDate(item)), el('strong',{}, item.title), item.summary ? el('div',{class:'mini-info'}, item.summary) : null))
                    : el('div',{class:'timeline-empty'},'Для выбранного года ещё нет событий.')
      ),
      pay ? renderEventPanel(pay) : el('div',{class:'timeline-empty'},'Выберите событие или добавьте новое.')
    )
  ));
  if(S.mode==='edit' && st.editorOpen) main.append(renderTimelineEditor(camp, ev));
  layout.append(side, main);
  root.append(layout);
}

function renderEventPanel(pay){
  const map=worldsMaps().find(m=>m.id===pay.event.mapId) || worldsMaps()[0];
  const focus=pay.variant?.focus || pay.event.focus || {x:.5,y:.5};
  const art=pay.variant?.art || pay.event.art || '';
  const articleBox=el('div',{class:'article-preview markdown-render', style:'background:#12181c;border-color:#39444a;'});
  articleBox.innerHTML=pay.article ? markdownPreview(pay.article.body||'') : '<p>Статья не назначена.</p>';
  wireWikiLinks(articleBox);
  const panel=el('article',{class:'timeline-event-panel'},
    el('div',{class:'timeline-breadcrumb'}, `${pay.campaign.name} / ${pay.route?.name || 'Основная линия'}`),
    el('h2',{}, pay.variant?.name || pay.event.title),
    (pay.variant?.summary || pay.event.summary) ? el('p',{class:'lead'}, pay.variant?.summary || pay.event.summary) : null,
    el('div',{class:'timeline-meta'},
      el('span',{class:'timeline-pill'}, '⟡ ' + formatDate(pay.event,pay.route?.id)),
      el('span',{class:'timeline-pill'}, '⌖ ' + ((entities().find(e=>e.id===pay.event.entityId)?.name) || 'точка события')),
      ...(pay.event.moons||[]).slice(0,6).map(m=>btn('◐ ' + moonLabel(m),()=>openMoonArticle(m),'timeline-pill'))
    ),
    el('div',{class:'timeline-route-switch'}, routeList(pay.campaign).map(r=>btn(r.name,()=>{st.routeId=r.id; renderTimelineScreen();}, r.id===pay.route?.id?'on':''))),
    el('div',{class:'timeline-chronicle-links'},
      el('strong',{},'✧ Летописи этого события'),
      ...(window.AvronChronicleLinks?.forEvent(pay.event.id,pay.route?.id)||[]).map(c=>btn('▶ '+c.name,()=>window.PantheonStartCinematic?.(c),'mini')),
      S.mode==='edit'?btn('＋ Создать летопись',()=>window.PantheonCinematics?.createForEvent?.(pay.event.id,pay.route?.id),'mini'):null
    ),
    el('div',{class:'timeline-split'},
      el('div',{},
        articleBox,
        el('div',{class:'timeline-actions'},
          btn('▶ Открыть сценой',()=>openStory(pay.event.id, pay.route?.id),'primary'),
          pay.event.entityId ? btn('Показать на карте',()=>{switchScreen('map'); selectEntity(pay.event.entityId,{center:true,autoplay:false});},'mini') : null,
          pay.article ? btn('Открыть статью',()=>{switchScreen('encyclopedia'); renderEncyclopediaArticle(pay.article);},'mini') : null
        )
      ),
      el('aside',{},
        el('div',{class:'timeline-art'}, art ? el('img',{src:art,onerror:ev=>ev.target.remove()}) : el('div',{class:'timeline-empty'},'АРТ НЕ ВЫБРАН · загрузите изображение в редакторе')),
        el('div',{class:'timeline-point-hint'},'Ту же механику можно использовать как вход в хронологию из точки на карте.'),
        el('div',{class:'timeline-inset-map'},
          map ? el('img',{src:map.src || './assets/avron-map.jpg'}) : null,
          el('div',{class:'timeline-inset-dot',style:`left:${(Number(focus.x)||.5)*100}%;top:${(Number(focus.y)||.5)*100}%;`})
        )
      )
    )
  );
  // The preview is rendered by the same exact framing engine as the full-screen scene.
  requestAnimationFrame(()=>{if(!panel.isConnected)return;const mapView=panel.querySelector('.timeline-inset-map');if(mapView){mapView.replaceChildren();AvronFrame.mount(mapView,map?.src||'./assets/avron-map.jpg',pay.variant?.crop||pay.event.crop||{x:0,y:0,w:1,h:1},{autoplay:false,motion:'still'});}const artView=panel.querySelector('.timeline-art');if(artView&&art){AvronFrame.mount(artView,art,pay.variant?.artCrop||pay.event.artCrop||{x:0,y:0,w:1,h:1},{autoplay:false,motion:'still'});}});
  return panel;
}

function renderTimelineEditor(camp, ev){
  const card=el('section',{class:'timeline-editor'}, el('h3',{},'Редактор хронологии'));
  if(!camp){
    card.append(el('div',{class:'timeline-empty'},'Сначала создайте кампанию.'));
    return card;
  }
  const cal=calendarForCampaign(camp);
  card.append(
    row('Название кампании', el('input',{class:'inp',value:camp.name,oninput:e=>{camp.name=e.target.value; setDirty();}})),
    row('Описание кампании', el('textarea',{class:'inp',rows:3,value:camp.description||'',oninput:e=>{camp.description=e.target.value; setDirty();}})),
    el('div',{class:'timeline-grid-2'},
      row('Календарь', el('select',{class:'inp',value:camp.calendarId,onchange:e=>{camp.calendarId=e.target.value; setDirty(); renderTimelineScreen();}}, calendars().map(c=>el('option',{value:c.id}, c.name)))),
      row('Эра', el('select',{class:'inp',value:camp.eraId,onchange:e=>{camp.eraId=e.target.value; setDirty(); renderTimelineScreen();}}, eras().map(er=>el('option',{value:er.id}, er.name))))
    ),
    el('div',{class:'btn-row'},
      btn('＋ Месяц',()=>addMonth(cal),'mini'),
      btn('＋ Луна',()=>addMoon(cal),'mini'),
      btn('＋ Ветка',()=>addRoute(camp),'mini')
    )
  );
  card.append(calendarsEditor(camp));
  if(!ev){
    card.append(el('div',{class:'timeline-empty'},'Выберите событие из списка, чтобы редактировать его содержание и ветви.'));
    return card;
  }
  const body=el('div',{});
  body.append(
    el('h3',{},'Событие'),
    row('Название', el('input',{class:'inp',value:ev.title,oninput:e=>{ev.title=e.target.value; setDirty();}})),
    row('Подзаголовок / kicker', el('input',{class:'inp',value:ev.slug||'',oninput:e=>{ev.slug=e.target.value; setDirty();}})),
    row('Краткое описание', el('textarea',{class:'inp',rows:3,value:ev.summary||'',oninput:e=>{ev.summary=e.target.value; setDirty();}})),
    el('div',{class:'timeline-grid-2'},
      row('Год', el('input',{class:'inp',type:'number',value:ev.year,onchange:e=>{moveTimelineEvent(ev.id,Number(e.target.value)||0,route()?.id);renderTimelineScreen();}})),
      row('День', el('input',{class:'inp',type:'number',value:ev.day,onchange:e=>{ev.day=Number(e.target.value)||1;clampDateDay(ev);setDirty();renderTimelineScreen();}}))
    ),
    el('div',{class:'timeline-grid-2'},
      row('Месяц', monthSelect(cal, ev.monthId, e=>{ev.monthId=e.target.value;clampDateDay(ev);setDirty(); renderTimelineScreen();})),
      row('Статья события', createArticleControl(ev))
    ),
    el('div',{class:'timeline-grid-2'},
      row('Точка/объект', entitySelect(ev.entityId, e=>{ev.entityId=e.target.value; setDirty(); renderTimelineScreen();})),
      row('Карта', el('select',{class:'inp',value:ev.mapId,onchange:e=>{ev.mapId=e.target.value; setDirty(); renderTimelineScreen();}}, worldsMaps().map(m=>el('option',{value:m.id}, m.name))))
    ),
    el('div',{class:'timeline-grid-2'},
      row('Фокус X (0..1)', el('input',{class:'inp',type:'number',step:'0.01',value:ev.focus?.x ?? .5,oninput:e=>{ev.focus ||= {}; ev.focus.x=Number(e.target.value)||.5; setDirty();}})),
      row('Фокус Y (0..1)', el('input',{class:'inp',type:'number',step:'0.01',value:ev.focus?.y ?? .5,oninput:e=>{ev.focus ||= {}; ev.focus.y=Number(e.target.value)||.5; setDirty();}}))
    ),
    btn('▣ Открыть монтажную область · карта и арт',()=>window.AvronStudio?.open(ev,ev),'primary wide'),
    row('Масштаб сцены', el('input',{class:'inp',type:'number',step:'0.1',value:ev.focus?.zoom ?? 2.8,oninput:e=>{ev.focus ||= {}; ev.focus.zoom=Number(e.target.value)||2.8; setDirty();}})),
    row('Арт (URL или путь)', el('input',{class:'inp',value:ev.art||'',onchange:e=>{ev.art=e.target.value; setDirty(); renderTimelineScreen();}})), artUploadControl(ev),
    timelineComposer(ev,'Композиция события: карта / арт / разделитель'),
    row('Луны в небе', el('input',{class:'inp',value:(ev.moons||[]).join(', '),placeholder:'через запятую',oninput:e=>{ev.moons=e.target.value.split(',').map(x=>x.trim()).filter(Boolean); setDirty();}})),
    el('div',{class:'btn-row'},
      btn('▶ Смотреть как сцену',()=>openStory(ev.id, route()?.id),'primary'),
      btn('✧ Новая летопись события',()=>window.PantheonCinematics?.createForEvent?.(ev.id,route()?.id),'mini'),
      btn('К точке на карте',()=>{ if(ev.entityId){ switchScreen('map'); selectEntity(ev.entityId,{center:true,autoplay:false}); }},'mini'),
      btn('Удалить событие',()=>{ if(confirm('Удалить событие?')){ timeline().events = events().filter(x=>x.id!==ev.id); camp.eventIds = (camp.eventIds||[]).filter(id=>id!==ev.id); st.eventId=''; setDirty(); renderTimelineScreen(); }},'danger')
    )
  );
  routeList(camp).forEach(r=>{
    let v=variantForEvent(ev,r.id);
    const holder=el('div',{class:'timeline-route-variant'}, el('h3',{},'Ветка · '+r.name));
    if(!v){
      holder.append(btn('Создать вариант для этой ветви',()=>{ ev.routeDefaults ||= []; v={id:uid(),routeId:r.id,name:r.name,articleId:ev.articleId,summary:ev.summary,art:ev.art,focus:{...(ev.focus||{x:.5,y:.5,zoom:2.8})}}; ev.routeDefaults.push(v); setDirty(); renderTimelineScreen();},'mini'));
      body.append(holder);
      return;
    }
    holder.append(
      row('Название ветви события', el('input',{class:'inp',value:v.name||'',oninput:e=>{v.name=e.target.value; setDirty();}})),
      row('Статья ветви', createArticleControl(v)),
      row('Краткое описание', el('textarea',{class:'inp',rows:2,value:v.summary||'',oninput:e=>{v.summary=e.target.value; setDirty();}})),
      row('Арт ветви', el('input',{class:'inp',value:v.art||'',oninput:e=>{v.art=e.target.value; setDirty(); renderTimelineScreen();}})),
      timelineComposer(v,'Композиция альтернативной ветви'),
      el('div',{class:'timeline-grid-2'},
        row('Фокус X', el('input',{class:'inp',type:'number',step:'0.01',value:v.focus?.x ?? ev.focus?.x ?? .5,oninput:e=>{v.focus ||= {}; v.focus.x=Number(e.target.value)||.5; setDirty();}})),
        row('Фокус Y', el('input',{class:'inp',type:'number',step:'0.01',value:v.focus?.y ?? ev.focus?.y ?? .5,oninput:e=>{v.focus ||= {}; v.focus.y=Number(e.target.value)||.5; setDirty();}}))
      ),
      btn('▣ Монтажная область ветви',()=>window.AvronStudio?.open(v,ev),'mini'),
      row('Масштаб ветви', el('input',{class:'inp',type:'number',step:'0.1',value:v.focus?.zoom ?? ev.focus?.zoom ?? 2.8,oninput:e=>{v.focus ||= {}; v.focus.zoom=Number(e.target.value)||2.8; setDirty();}})),
      el('div',{class:'btn-row'}, btn('Удалить вариант',()=>{ if(confirm('Удалить вариант ветви?')){ ev.routeDefaults = (ev.routeDefaults||[]).filter(x=>x!==v); setDirty(); renderTimelineScreen(); }},'danger'))
    );
    body.append(holder);
  });
  card.append(body);
  return card;
}

function addCampaign(){ const cal = calendars()[0] || (timeline().calendars.push({id:uid(),name:'Новый календарь',months:[{id:uid(),name:'Первомесяц',days:30}],moons:[]}), calendars()[0]); const er = eras()[0] || (timeline().eras.push({id:uid(),name:'Новая эра',short:'Э.'}), eras()[0]); const c={id:uid(),name:'Новая кампания',calendarId:cal.id,eraId:er.id,description:'',routes:[{id:uid(),name:'Основная линия',kind:'prime'}],eventIds:[]}; timeline().campaigns.push(c); st.campaignId=c.id; st.routeId=''; setDirty(); renderTimelineScreen(); }
function addRoute(camp){ const r={id:uid(),name:'Новая ветвь',kind:'branch'}; camp.routes ||= []; camp.routes.push(r); st.routeId=r.id; setDirty(); renderTimelineScreen(); }
function addEvent(camp){ if(!camp) return; const monthId=calendarForCampaign(camp)?.months?.[0]?.id || ''; const ev={id:uid(),campaignId:camp.id,title:'Новое событие',slug:'',summary:'',year:st.year ?? 0,monthId,day:1,entityId:'',mapId:worldsMaps()[0]?.id || 'main',articleId:'',art:'',focus:{x:.5,y:.5,zoom:2.8},moons:[],routeDefaults:[]}; if(!window.AvronMaterials?.adopt?.('timelineEvent',ev))timeline().events.push(ev); camp.eventIds ||= []; camp.eventIds.push(ev.id); st.eventId=ev.id; if(st.year==null) st.year=ev.year; setDirty(); renderTimelineScreen(); }
function addMonth(cal){ if(!cal) return; const name=prompt('Название месяца','Новый месяц'); if(!name) return; cal.months ||= []; cal.months.push({id:uid(),name,days:30}); setDirty(); renderTimelineScreen(); }
function addMoon(cal){ if(!cal) return; const name=prompt('Название луны','Новая луна'); if(!name) return; cal.moons ||= []; cal.moons.push(name); setDirty(); renderTimelineScreen(); }
// A single ruler + lane grid sharing EXACT year columns. Pointer coordinates (not hit testing)
// decide the destination, so pointer capture cannot shadow the drop target.
function moveTimelineEvent(eventId, year, routeId){
  const item=events().find(e=>e.id===eventId);
  if(!item||S.mode!=='edit'||!Number.isFinite(Number(year)))return false;
  const camp=campaigns().find(c=>c.id===item.campaignId)||campaign();
  const primary=routeList(camp)[0]?.id;
  if(routeId&&routeId!==primary){
    item.routeDefaults ||= [];
    let variant=item.routeDefaults.find(v=>v.routeId===routeId);
    if(!variant){variant={id:uid(),routeId,name:routeList(camp).find(r=>r.id===routeId)?.name||'Ветвь',articleId:item.articleId,summary:item.summary,art:item.art,focus:{...(item.focus||{x:.5,y:.5,zoom:2.8})}};item.routeDefaults.push(variant);}
    variant.year=Math.round(Number(year));
  }else item.year=Math.round(Number(year));
  st.campaignId=camp.id;st.routeId=routeId||primary||'';st.year=Math.round(Number(year));st.eventId=item.id;
  setDirty();window.dispatchEvent(new CustomEvent('avron-timeline-changed',{detail:{eventId:item.id,year:st.year,routeId:st.routeId,campaignId:camp.id}}));
  return true;
}
function setTimelineYear(year,options={}){
  if(!Number.isFinite(Number(year)))return;
  st.year=Math.round(Number(year));st.eventId='';
  if(options.campaignId)st.campaignId=options.campaignId;
  if(options.routeId)st.routeId=options.routeId;
  window.dispatchEvent(new CustomEvent('avron-timeline-selection',{detail:{year:st.year,campaignId:st.campaignId,routeId:st.routeId,source:options.source||'full'}}));
  if(S.screen==='timeline')renderTimelineScreen();
}
function renderTimelineRail(camp,active){
  const frame=el('section',{class:'tl-rail-frame'});
  if(!camp)return frame;
  const list=campaignEvents(camp);
  const allYears=yearsForCampaign(camp);
  const focus=st.year??allYears[0]??0;
  const minYear=Math.min(...allYears,focus)-2;
  const maxYear=Math.max(...allYears,focus)+2;
  const years=Array.from({length:maxYear-minYear+1},(_,i)=>minYear+i);
  frame.append(el('div',{class:'tl-rail-heading'},el('strong',{},'✦ ДОРОГИ ВРЕМЕНИ'),el('span',{},S.mode==='edit'?'Зажмите карточку и перенесите на колонку нужного года · ветви могут иметь собственную дату':'Выберите год или событие')));
  const scroller=el('div',{class:'tl-rail-track tl-rail-unified'});
  const row=(label)=>{const r=el('div',{class:'tl-unified-row'});r.append(el('div',{class:'tl-unified-label'},label));return r};
  const ruler=row('ЛИНИИ / ГОДЫ');ruler.classList.add('tl-unified-ruler');
  for(const year of years) ruler.append(btn(String(year),()=>setTimelineYear(year,{source:'full'}),'tl-year-tick'+(year===Number(st.year)?' on':'')));
  scroller.append(ruler);
  const slots=[];
  for(const laneInfo of routeList(camp)){
    const lane=row(laneInfo.name);lane.classList.add('tl-unified-lane');
    years.forEach(year=>{
      const cell=el('div',{class:'tl-year-slot','data-year':String(year),'data-route-id':laneInfo.id});
      slots.push(cell);
      const evs=list.filter(e=>yearForRoute(e,laneInfo.id)===year && (laneInfo.id===routeList(camp)[0]?.id || (e.routeDefaults||[]).some(v=>v.routeId===laneInfo.id)));
      evs.forEach(item=>{
        const visual=(item.routeDefaults||[]).find(v=>v.routeId===laneInfo.id)||item;
        const card=el('button',{class:'tl-event-chip'+(active?.id===item.id&&st.routeId===laneInfo.id?' on':''),type:'button','data-event':item.id,
          onclick:()=>{if(card.dataset.ignoreClick==='yes'){card.dataset.ignoreClick='';return;}st.eventId=item.id;st.year=year;st.routeId=laneInfo.id;renderTimelineScreen();}},
          el('span',{class:'tl-chip-art'},visual.art?el('img',{src:visual.art,alt:''}):el('span',{},'✧')),
          el('span',{class:'tl-chip-copy'},el('strong',{},visual.name||item.title),el('small',{},String(year))));
        if(S.mode==='edit')wireTimelinePointerDrag(card,item.id,scroller,slots);
        cell.append(card);
      });
      lane.append(cell);
    });
    scroller.append(lane);
  }
  frame.append(scroller);
  // Center the currently selected year once, after the layout is measurable.
  requestAnimationFrame(()=>{if(!scroller.isConnected)return;const tick=ruler.querySelector('.tl-year-tick.on');if(tick)scroller.scrollLeft=Math.max(0,tick.offsetLeft-scroller.clientWidth*.45);});
  return frame;
}
function wireTimelinePointerDrag(card,eventId,scroller,slots){
  card.style.touchAction='none';
  card.addEventListener('pointerdown',down=>{
    if(down.button!==0)return;
    const start={x:down.clientX,y:down.clientY};
    let dragging=false,ghost=null,hover=null,ended=false;
    const cellAt=(x,y)=>{
      // Geometry is computed directly from the column rectangles; pointer capture does not affect this.
      const rect=scroller.getBoundingClientRect();
      if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return null;
      const cells=slots.filter(c=>c.isConnected);
      const direct=cells.find(c=>{const r=c.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;});
      if(direct)return direct;
      return cells.reduce((best,c)=>{const r=c.getBoundingClientRect(),dx=Math.max(r.left-x,0,x-r.right),dy=Math.max(r.top-y,0,y-r.bottom);const d=dx*dx+dy*dy;return !best||d<best.d?{c,d}:best;},null)?.c||null;
    };
    function pointerMove(e){
      if(ended)return;
      if(!dragging&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>6){
        dragging=true;ghost=card.cloneNode(true);ghost.classList.add('tl-floating-card');document.body.append(ghost);card.classList.add('tl-chip-origin');
      }
      if(!dragging)return;
      e.preventDefault();
      const rect=scroller.getBoundingClientRect();
      if(e.clientX>rect.right-36)scroller.scrollLeft+=16;
      if(e.clientX<rect.left+36)scroller.scrollLeft-=16;
      ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
      const next=cellAt(e.clientX,e.clientY);
      if(hover&&hover!==next)hover.classList.remove('tl-target');hover=next;if(hover)hover.classList.add('tl-target');
    }
    function pointerEnd(e){
      if(ended)return;ended=true;
      document.removeEventListener('pointermove',pointerMove);
      document.removeEventListener('pointerup',pointerEnd);
      document.removeEventListener('pointercancel',pointerCancel);
      ghost?.remove();card.classList.remove('tl-chip-origin');hover?.classList.remove('tl-target');
      if(!dragging)return;
      card.dataset.ignoreClick='yes';
      setTimeout(()=>{if(card.isConnected)card.dataset.ignoreClick='';},180);
      if(hover){const year=Number(hover.dataset.year);const routeId=hover.dataset.routeId;if(moveTimelineEvent(eventId,year,routeId))renderTimelineScreen();}
    }
    const pointerCancel=e=>{hover=null;pointerEnd(e)};
    document.addEventListener('pointermove',pointerMove,{passive:false});
    document.addEventListener('pointerup',pointerEnd);
    document.addEventListener('pointercancel',pointerCancel);
  });
}
function moonRecords(){const t=timeline();t.moonArticles ||= [];return t.moonArticles;}
function moonRecord(value){return moonRecords().find(x=>x.id===value||x.name===value||x.sourceName===value)||null;}
function moonLabel(value){return moonRecord(value)?.name||String(value);}
function openMoonArticle(value){
  const moon=moonRecord(value);const name=moon?.name||String(value);
  const a=articles().find(a=>a.id===(moon?.articleId||value) || a.title.toLowerCase()===name.toLowerCase());
  if(a){closeStory();window.AvronNav?.open?.({kind:'article',id:a.id});return;}
  if(S.mode==='edit'){closeStory();avronOpenOrCreateWiki(name);return;}
  alert('Статья луны «'+name+'» пока не создана.');
}
function timelineComposer(target,label){
 target.visual ||= {};const v={...storyVisualDefaults(),...target.visual};
 const wrapper=el('details',{class:'tl-composer',open:false},el('summary',{},'◈ '+label));
 const choices=(key,vals)=>el('select',{class:'inp',value:v[key],onchange:e=>{target.visual[key]=e.target.value;setDirty();}},vals.map(([id,title])=>el('option',{value:id},title)));
 const num=(key,min,max,step=1)=>el('input',{class:'inp',type:'number',min,max,step,value:v[key],onchange:e=>{target.visual[key]=Math.max(min,Math.min(max,Number(e.target.value)||min));setDirty();}});
 const color=key=>el('input',{class:'inp',type:'color',value:v[key],oninput:e=>{target.visual[key]=e.target.value;setDirty();}});
 wrapper.append(el('div',{class:'tl-composer-body'},
  el('div',{class:'timeline-grid-2'},
   row('Режим композиции',choices('mode',[['split','Карта + арт · разделитель'],['overlay','Мягкое наложение'],['map','Только карта'],['art','Только арт']])),
   row('Разделитель',choices('dividerStyle',[['ornate','Световой орнамент'],['soft','Дымчатая грань'],['line','Тонкая линия']]))),
  el('div',{class:'timeline-grid-2'},row('Позиция шва, %',num('splitPos',10,90)),row('Мягкость шва, %',num('feather',0,25))),
  el('div',{class:'timeline-grid-2'},row('Непрозрачность арта, %',num('artOpacity',0,100)),row('Размытие арта, px',num('artBlur',0,30))),
  el('div',{class:'timeline-grid-2'},row('Первый цвет градиента',color('gradientA')),row('Второй цвет градиента',color('gradientB'))),
  el('div',{class:'timeline-grid-2'},row('Интенсивность градиента, %',num('gradientOpacity',0,100)),row('Яркость, %',num('brightness',40,160))),
  row('Контраст, %',num('contrast',50,180)),
  btn('▶ Посмотреть оформление',()=>openStory(st.eventId,st.routeId),'primary')
 ));
 return wrapper;
}
function artUploadControl(target,refresh=true){
  const wrap=el('div',{class:'tl-art-picker'});
  const preview=el('div',{class:'tl-art-picker-preview'},target.art?el('img',{src:target.art,onerror:ev=>ev.target.remove()}):el('span',{},'ИЗОБРАЖЕНИЕ НЕ ВЫБРАНО'));
  const file=el('input',{type:'file',accept:'image/*',hidden:true,onchange:ev=>{
    const item=ev.target.files?.[0];if(!item)return;
    const reader=new FileReader();reader.onload=()=>{target.art=String(reader.result||'');setDirty();if(refresh)renderTimelineScreen();};reader.readAsDataURL(item);
  }});
  wrap.append(preview,el('div',{class:'btn-row'},btn('↑ Загрузить арт',()=>file.click(),'mini'), target.art?btn('Удалить арт',()=>{target.art='';setDirty();renderTimelineScreen();},'mini'):null),file);
  return wrap;
}
function createArticleControl(target,key='articleId'){
  const select=articleSelect(target[key],e=>{target[key]=e.target.value;setDirty();renderTimelineScreen();});
  return el('div',{},select,el('div',{class:'btn-row'},btn('＋ Создать статью',()=>{
    const name=prompt('Название новой статьи',target.name||target.title||'Новая статья');if(!name?.trim())return;
    const parent=target.id&&window.AvronMaterials?.has?.('timelineEvent:'+target.id)?['timelineEvent:'+target.id]:[];const a=window.AvronMaterials?.create?.('article',{title:name.trim(),parents:parent,draft:false})||window.AvronRegistry?.create?.({title:name.trim(),parents:parent,draft:false});if(!a)return;target[key]=a.id;S.openArticleId=a.id;setDirty();renderTimelineScreen();
  },'mini'),target[key]?btn('↗ Открыть',()=>window.AvronNav?.open?.({kind:'article',id:target[key]}),'mini'):null));
}
function moonSelectionControl(ev,cal){
  const wrap=el('div',{class:'tl-moon-checks'});
  const names=cal?.moons||[];
  if(!names.length){wrap.append(el('span',{class:'mini-info'},'Нет лун в календаре. Добавьте их в настройках календаря.'));return wrap;}
  for(const m of names){
    const rec=moonRecord(m)||{name:m,id:m};
    const active=(ev.moons||[]).includes(m)||(ev.moons||[]).includes(rec.id);
    wrap.append(el('div',{class:'tl-moon-choice'}, el('input',{type:'checkbox',checked:active,onchange:e=>{
      const arr=new Set(ev.moons||[]); if(e.target.checked)arr.add(m);else{arr.delete(m);arr.delete(rec.id);}ev.moons=[...arr];setDirty();
    }}), '◐ '+rec.name, btn('↗ Статья',e=>openMoonArticle(m),'mini')));
  }
  return wrap;
}
function calendarsEditor(camp){
  const wrapper=el('details',{class:'tl-cal-editor',open:false},el('summary',{},'✧ КАЛЕНДАРИ, МЕСЯЦЫ И ШЕСТЬ ЛУН'));
  const cal=calendarForCampaign(camp);if(!cal)return wrapper;
  wrapper.append(row('Название календаря',el('input',{class:'inp',value:cal.name,onchange:e=>{cal.name=e.target.value;setDirty();renderTimelineScreen();}})));
  const list=el('div',{class:'tl-month-list'});
  (cal.months||[]).forEach((m,i)=>list.append(el('div',{class:'tl-month-item'},
    el('span',{class:'fl'},String(i+1).padStart(2,'0')),
    el('input',{class:'inp',value:m.name,onchange:e=>{m.name=e.target.value;setDirty();}}),
    el('input',{class:'inp',type:'number',min:1,max:100,value:m.days,title:'Число дней',onchange:e=>{m.days=Math.max(1,Number(e.target.value)||30);events().filter(x=>x.monthId===m.id).forEach(clampDateDay);setDirty();}}),
    btn('×',()=>{cal.months.splice(i,1);setDirty();renderTimelineScreen();},'mini'))));
  wrapper.append(el('h4',{},'Месяцы — свои названия и длина'),list,btn('＋ Месяц',()=>addMonth(cal),'mini'), btn('⊕ Год из 12 месяцев',()=>{if(!confirm('Добавить 12 шаблонных месяцев в текущий календарь?'))return;for(let i=0;i<12;i++)cal.months.push({id:uid(),name:'Месяц '+(i+1),days:30});setDirty();renderTimelineScreen();},'mini'));
  const moons=el('div',{class:'tl-moons-editor'});
  const records=moonRecords();
  for(const m of cal.moons||[]){ const rec=moonRecord(m)||{id:uid(),name:String(m),sourceName:String(m),articleId:''}; if(!moonRecord(m)){records.push(rec);} moons.append(el('div',{class:'tl-moon-item'},row('Название луны',el('input',{class:'inp',value:rec.name,onchange:e=>{rec.name=e.target.value;setDirty();}})),row('Статья о луне',createArticleControl(rec))));}
  wrapper.append(el('h4',{},'Луны — отдельные статьи'),moons,btn('＋ Луна',()=>addMoon(cal),'mini'));
  wrapper.append(el('div',{class:'btn-row'},btn('＋ Новый календарь',()=>{const c={id:uid(),name:'Новый календарь',months:[],moons:[]};calendars().push(c);camp.calendarId=c.id;setDirty();renderTimelineScreen();},'mini'),btn('Копировать календарь',()=>{const c=JSON.parse(JSON.stringify(cal));c.id=uid();c.name+=' — копия';c.months.forEach(m=>m.id=uid());calendars().push(c);camp.calendarId=c.id;setDirty();renderTimelineScreen();},'mini')));
  return wrapper;
}
window.renderTimelineScreen = renderTimelineScreen;
window.AvronTimeline = { render:renderTimelineScreen, openEventByEntity, openEventById:(id,routeId)=>openStory(id,routeId), findEventByEntity, closeStory, moveEvent:moveTimelineEvent, setYear:setTimelineYear, yearForRoute, formatDate, eventsFor:campaignEvents };
window.addEventListener('avron-timeline-selection',e=>{if(e.detail?.source==='full')return;const d=e.detail||{};if(d.campaignId)st.campaignId=d.campaignId;if(d.routeId)st.routeId=d.routeId;if(Number.isFinite(Number(d.year)))st.year=Number(d.year);st.eventId='';if(S.screen==='timeline')renderTimelineScreen();});
})();
