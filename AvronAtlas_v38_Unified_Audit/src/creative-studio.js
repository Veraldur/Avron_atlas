/* Creative Studio + searchable universal Lore Atlas. All records share AvronLoreStore. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const uid=()=> 'node-'+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
const store=()=>window.AvronLoreStore;
const save=()=>store().persist();
function mapImage(event,target){return (S.world.maps||[]).find(m=>m.id===(event?.mapId||target.mapId))?.src||S.world.maps?.[0]?.src||'';}
function studio(target,event){
 document.querySelector('#avronStudio')?.remove();
 const root=document.createElement('section');root.id='avronStudio';root.className='avron-studio';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
 const $=q=>root.querySelector(q);
 const isChronicle=!!(target.chapters&&target.map);
 const map=isChronicle?(target.source||mapImage(event,target)):mapImage(event,target);
 const oldMap=target.map;const initialCrop=target.crop||(isChronicle&&oldMap?{x:(oldMap.x||.5)-(oldMap.w||.5)/2,y:(oldMap.y||.5)-(oldMap.h||.5)/2,w:oldMap.w||.5,h:oldMap.h||.5}:null);
 const original=structuredClone({crop:initialCrop,artCrop:target.artCrop||null,art:target.art||target.visual?.backgroundArt||'',motion:target.motion||'slow',duration:target.duration||7});
 const state={...original,tab:'map',ratio:16/9,dimensions:{map:{w:1,h:1},art:{w:1,h:1}},drag:null,cleanup:()=>{}};
 root.innerHTML=`<div class="studio-shell"><header><div><small>AVRON · РЕЖИССЁРСКИЙ ХОЛСТ</small><h2>Собери свой кадр.</h2><p>Вся карта видна целиком. Выдели рамкой конкретное место — в сцене будет показано <b>именно оно</b>, без растяжения.</p></div><button id="studioClose">✕ Закрыть</button></header>
 <div class="studio-tabs"><button data-tab="map" class="on">⌖ Карта</button><button data-tab="art">✧ Арт</button></div>
 <div class="studio-body"><div class="studio-canvas">
 <div class="studio-work-heading"><span>01 / ИСХОДНИК ЦЕЛИКОМ</span><span id="studioDimensions"></span></div>
 <div class="studio-image"><div id="studioPhoto" class="studio-photo"><img id="studioImage" draggable="false" alt="Исходное изображение"><div id="studioCrop" class="studio-crop"><span>ФИНАЛЬНЫЙ КАДР · 16:9</span><i data-handle="nw"></i><i data-handle="ne"></i><i data-handle="sw"></i><i data-handle="se"></i></div></div><div id="studioEmpty" class="studio-empty" hidden>Арт ещё не выбран. Загрузите изображение справа.</div></div>
 <div class="studio-tools"><button id="studioReset">▣ Вся карта</button><button id="studioAspect">▱ Кадр 16:9</button><button id="studioCenter">◎ Центр</button><span>Перетащи рамку или нарисуй новую на изображении · колесо — масштаб</span></div>
 <div class="studio-work-heading"><span>02 / ТОЧНЫЙ РЕЗУЛЬТАТ В КАДРЕ</span><span>Предпросмотр 16:9</span></div>
 <div class="studio-preview" id="studioPreview"></div><p class="studio-note">Предпросмотр и настоящая сцена используют один механизм кадрирования. Чёрные поля возможны только при выборе изображения целиком, если его пропорции отличаются от 16:9.</p>
 </div><aside class="studio-side"><h3>Движение камеры</h3><label>Тип перехода<select id="studioMotion"><option value="slow">Мягкий наезд: от карты к фрагменту</option><option value="glide">Кинематографическая панорама</option><option value="pullback">Отдаление к целой карте</option><option value="reveal">Проявление из тумана</option><option value="still">Спокойный неподвижный кадр</option></select></label><label>Продолжительность <output id="studioDurationText"></output><input id="studioDuration" type="range" min="2" max="16" step="1"></label><button id="studioPlay">▶ Проиграть переход</button><h3>Арт и материалы</h3><label>URL или путь изображения<input id="studioArtUrl" placeholder="Адрес арта"></label><button id="studioUpload">↑ Выбрать арт с компьютера</button><input id="studioFile" type="file" accept="image/*" hidden><div class="studio-info"><strong>Как это работает</strong><p>Сначала выбери участок на большой карте. Вкладка «Арт» даёт независимый фрагмент изображения. После сохранения кадр используется в настоящем просмотре события.</p></div><button id="studioApply" class="studio-apply">✓ Сохранить кадр и движение</button></aside></div></div>`;
 document.body.append(root);
 let source='',photo=$('#studioPhoto'),img=$('#studioImage'),box=$('#studioCrop');
 function current(){return state.tab==='map'?'crop':'artCrop';}
 function size(){return state.dimensions[state.tab];}
 function crop(){return state[current()];}
 function aspectFactor(){const d=size();return d.w/(d.h*state.ratio);}
 function fitAspect(c){if(!c)return {x:.25,y:.25,w:.5,h:Math.min(1,.5*aspectFactor())};const clean=AvronFrame.normal(c);if(clean.w>=.999&&clean.h>=.999)return clean;let w=clean.w,h=w*aspectFactor();if(h>1){h=1;w=h/aspectFactor();}return {x:clamp(clean.x+clean.w/2-w/2,0,1-w),y:clamp(clean.y+clean.h/2-h/2,0,1-h),w,h};}
 function setCrop(c){state[current()]=AvronFrame.normal(c);paint();}
 function ensureCrop(){if(!state[current()]&&state.tab==='art'){state[current()]={x:0,y:0,w:1,h:1};}if(!state[current()]){const f=target.focus||event?.focus||{x:.5,y:.5,zoom:2};const w=clamp(1/(Number(f.zoom)||2),.08,.9),h=Math.min(1,w*aspectFactor());state[current()]={x:clamp((Number(f.x)??.5)-w/2,0,1-w),y:clamp((Number(f.y)??.5)-h/2,0,1-h),w,h};}else state[current()]=fitAspect(state[current()]);}
 function src(){return state.tab==='map'?map:state.art;}
 function paint(){const c=crop();if(!c)return;Object.assign(box.style,{left:c.x*100+'%',top:c.y*100+'%',width:c.w*100+'%',height:c.h*100+'%'});$('#studioDimensions').textContent=`${size().w} × ${size().h} · ${Math.round(c.w*100)}% × ${Math.round(c.h*100)}%`;state.cleanup?.();state.cleanup=AvronFrame.mount($('#studioPreview'),src(),c,{motion:'still',autoplay:false});}
 function switchTab(t){state.tab=t;root.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));state.cleanup?.();source=src();img.style.display=source?'block':'none';$('#studioEmpty').hidden=!!source;photo.style.display=source?'inline-block':'none';if(!source){state.cleanup=AvronFrame.mount($('#studioPreview'),'',{x:0,y:0,w:1,h:1});return;}
 img.onload=()=>{const d=state.dimensions[t];d.w=img.naturalWidth||1;d.h=img.naturalHeight||1;AvronFrame.register(source,d.w,d.h);ensureCrop();paint();};img.onerror=()=>{$('#studioEmpty').hidden=false;photo.style.display='none';};img.src=source;
 if(img.complete&&img.naturalWidth){const d=state.dimensions[t];d.w=img.naturalWidth;d.h=img.naturalHeight;AvronFrame.register(source,d.w,d.h);ensureCrop();paint();}
 }
 function point(e){const r=photo.getBoundingClientRect();return {x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)};}
 function drawRect(a,b){const k=aspectFactor(),dx=b.x-a.x,dy=b.y-a.y,signX=dx>=0?1:-1,signY=dy>=0?1:-1;let w=Math.max(Math.abs(dx),Math.abs(dy)/k,.035),h=w*k;w=Math.min(w,signX>0?1-a.x:a.x,(signY>0?1-a.y:a.y)/k);w=Math.max(.015,w);h=w*k;return {x:signX>0?a.x:a.x-w,y:signY>0?a.y:a.y-h,w,h};}
 function start(e){if(e.button!==0||!source)return;e.preventDefault();const p=point(e),handle=e.target.closest('[data-handle]')?.dataset.handle||'';const inside=!!e.target.closest('#studioCrop');state.drag={id:e.pointerId,origin:p,from:{...crop()},mode:handle?'resize':inside?'move':'new',handle,moved:false};photo.setPointerCapture(e.pointerId);}
 function move(e){const d=state.drag;if(!d||d.id!==e.pointerId)return;const p=point(e),dx=p.x-d.origin.x,dy=p.y-d.origin.y;if(Math.abs(dx)+Math.abs(dy)>.002)d.moved=true;
 if(d.mode==='move'){const c=d.from;setCrop({...c,x:clamp(c.x+dx,0,1-c.w),y:clamp(c.y+dy,0,1-c.h)});return;}
 if(d.mode==='new'){setCrop(drawRect(d.origin,p));return;}
 const c=d.from,anchor={x:d.handle.includes('w')?c.x+c.w:c.x,y:d.handle.includes('n')?c.y+c.h:c.y};setCrop(drawRect(anchor,p));}
 function end(e){const d=state.drag;if(!d||d.id!==e.pointerId)return;state.drag=null;if(d.mode==='new'&&!d.moved){const c=d.from,p=point(e);setCrop({...c,x:clamp(p.x-c.w/2,0,1-c.w),y:clamp(p.y-c.h/2,0,1-c.h)});}else if(d.mode==='resize'||d.mode==='new'){setCrop(fitAspect(crop()));}}
 photo.addEventListener('pointerdown',start);photo.addEventListener('pointermove',move);photo.addEventListener('pointerup',end);photo.addEventListener('pointercancel',end);
 photo.addEventListener('wheel',e=>{if(!src())return;e.preventDefault();const c=crop(),p=point(e),scale=e.deltaY>0?1.12:.88;let w=clamp(c.w*scale,.035,1),h=w*aspectFactor();if(h>1){h=1;w=h/aspectFactor();}const rx=clamp((p.x-c.x)/c.w,0,1),ry=clamp((p.y-c.y)/c.h,0,1);setCrop({x:clamp(p.x-rx*w,0,1-w),y:clamp(p.y-ry*h,0,1-h),w,h});},{passive:false});
 $('#studioReset').onclick=()=>setCrop({x:0,y:0,w:1,h:1});
 $('#studioAspect').onclick=()=>setCrop(fitAspect(crop()));
 $('#studioCenter').onclick=()=>{const c=crop();setCrop({...c,x:(1-c.w)/2,y:(1-c.h)/2});};
 root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
 $('#studioMotion').value=state.motion;$('#studioDuration').value=state.duration;$('#studioDurationText').textContent=state.duration+' сек.';
 $('#studioMotion').onchange=e=>state.motion=e.target.value;
 $('#studioDuration').oninput=e=>{state.duration=Number(e.target.value);$('#studioDurationText').textContent=state.duration+' сек.';};
 $('#studioArtUrl').value=state.art.startsWith('data:')?'[загруженный арт]':state.art;
 $('#studioArtUrl').onchange=e=>{if(e.target.value==='[загруженный арт]')return;state.art=e.target.value.trim();if(state.tab==='art')switchTab('art');};
 $('#studioUpload').onclick=()=>$('#studioFile').click();
 $('#studioFile').onchange=e=>{const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{state.art=String(reader.result);$('#studioArtUrl').value='[загруженный арт]';switchTab('art');};reader.readAsDataURL(f);};
 $('#studioPlay').onclick=()=>{state.cleanup?.();state.cleanup=AvronFrame.mount($('#studioPreview'),src(),crop(),{motion:state.motion,duration:state.duration});};
 $('#studioApply').onclick=()=>{
   target.crop=state.crop||{x:0,y:0,w:1,h:1};target.artCrop=state.artCrop||{x:0,y:0,w:1,h:1};target.art=state.art;target.motion=state.motion;target.duration=state.duration;
   const c=target.crop;target.focus={x:c.x+c.w/2,y:c.y+c.h/2,zoom:1/c.w};
   if(isChronicle){target.map={x:target.focus.x,y:target.focus.y,w:c.w,h:c.h};target.zoom=target.focus.zoom;target.introMs=state.duration*1000;target.visual||={};target.visual.backgroundArt=state.art;}
   save();state.cleanup?.();root.remove();if(isChronicle)window.PantheonCinematics?.refreshWorld?.();else window.renderTimelineScreen?.();
 };
 $('#studioClose').onclick=()=>{state.cleanup?.();root.remove();};
 root.addEventListener('keydown',e=>{if(e.key==='Escape')$('#studioClose').click();});switchTab('map');
}
window.AvronStudio={open:studio};

/* Lore atlas: categories, search, paginated groups, one record store with Pantheon. */
let filter='',category='Все',match='all',openId='',page=0,groupSize=36;
const collapsed=new Set();
function matrix(opts={}){
 document.querySelector('#avronMatrix')?.remove();store().ensure();
 if(opts.godIds){for(const id of opts.godIds)store().selection.add('god:'+id);}if(opts.recordId)openId=String(opts.recordId);
 const root=document.createElement('section');root.id='avronMatrix';root.className='avron-matrix';document.body.append(root);
 function render(){
   const d=store().ensure(),nodes=store().nodes(),chosen=store().selection;
   const cats=d.categories,byId=new Map(cats.map(c=>[c.id,c]));
   const needle=filter.trim().toLocaleLowerCase('ru');
   const filtered=nodes.filter(n=>(category==='Все'||n.categoryId===category)&&(!needle||(n.name||'').toLocaleLowerCase('ru').includes(needle)));
   const groups=(category==='Все'?cats:[byId.get(category)]).filter(Boolean).map(c=>({category:c,nodes:filtered.filter(n=>n.categoryId===c.id).sort((a,b)=>a.name.localeCompare(b.name,'ru'))})).filter(g=>g.nodes.length);
   const flat=groups.flatMap(g=>g.nodes);
   const total=flat.length,limit=(page+1)*groupSize;
   const visibleIds=new Set(flat.slice(0,limit).map(n=>n.id));
   const records=d.records.filter(r=>store().visible(r)).filter(r=>!chosen.size||(match==='exact'?r.nodeIds.length===chosen.size&&r.nodeIds.every(id=>chosen.has(id)):[...chosen].every(id=>r.nodeIds.includes(id))));
   const active=d.records.find(r=>r.id===openId&&store().visible(r));
   root.innerHTML=`<div class="matrix-shell"><header><div><small>AVRON / АТЛАС ВСЕХ ИСТОРИЙ</small><h1>Узоры <i>мира.</i></h1><p>Боги, страны, расы, храмы, артефакты и тысячи других сущностей — единый живой архив.</p></div><button id="mxClose">✕ К карте</button></header>
   <div class="matrix-grid"><aside><h3>Коллекции</h3><div class="matrix-categories"><button data-cat="Все" class="${category==='Все'?'on':''}">✧ Все категории <small>${nodes.length}</small></button>${cats.map(c=>`<button data-cat="${esc(c.id)}" class="${category===c.id?'on':''}">${esc(c.name)} <small>${nodes.filter(n=>n.categoryId===c.id).length}</small></button>`).join('')}</div>${S.mode==='edit'?'<button id="mxNewCat">＋ Создать категорию</button><button id="mxNewNode">＋ Добавить элемент</button>':''}</aside>
   <main><div class="matrix-search"><input id="mxSearch" type="search" placeholder="⌕ Поиск по всему лору: боги, страны, существа, названия…" value="${esc(filter)}"><select id="mxMatch"><option value="all" ${match==='all'?'selected':''}>Содержит выбранное</option><option value="exact" ${match==='exact'?'selected':''}>Точное сочетание</option></select></div>
   <div class="matrix-selected">${[...chosen].map(id=>{const n=nodes.find(x=>x.id===id);return `<button data-pick="${esc(id)}">${esc(n?.name||id)} ×</button>`}).join('')||'<span>Выберите элементы из разных категорий — создайте пересечение между ними</span>'}${chosen.size?'<button id="mxClear">Очистить выбор</button>':''}</div>
   <div class="matrix-section-head"><h2>${category==='Все'?'Все коллекции':esc(byId.get(category)?.name||'Категория')}</h2><span>Найдено ${total.toLocaleString('ru')} · показано ${Math.min(total,limit).toLocaleString('ru')}</span></div>
   <div class="matrix-pool">${groups.map(g=>{const visible=g.nodes.filter(n=>visibleIds.has(n.id));if(!visible.length)return '';return `<section class="matrix-node-group"><div class="matrix-group-title"><strong>${esc(g.category.name)}</strong><small>${g.nodes.length} элементов</small></div><button class="matrix-group-toggle" data-group="${esc(g.category.id)}">${collapsed.has(g.category.id)?'▸ Развернуть':'▾ Свернуть'}</button><div class="matrix-node-grid" ${collapsed.has(g.category.id)?'hidden':''}>${visible.map(n=>`<button class="matrix-node ${chosen.has(n.id)?'on':''} ${n.source==='god'?'matrix-node-god':''}" data-pick="${esc(n.id)}">${n.art?`<img src="${esc(n.art)}" loading="lazy" alt="">`:'<span class="matrix-node-icon">✦</span>'}<b>${esc(n.name)}</b><small>${chosen.has(n.id)?'✓':'＋'}</small></button>`).join('')}</div></section>`}).join('')||'<div class="matrix-empty">Ничего не найдено. Попробуйте другой запрос или создайте новый элемент.</div>'}</div>
   ${limit<total?`<button id="mxMore" class="matrix-more">Показать ещё ${Math.min(groupSize,total-limit)} из ${total-limit} ↓</button>`:''}
   <div class="matrix-results"><div class="matrix-section-head"><h2>Пересечения · ${records.length}</h2>${S.mode==='edit'?'<button id="mxNewRecord">＋ Новое пересечение</button>':''}</div><div class="matrix-record-grid">${records.slice(0,100).map(r=>`<button data-record="${esc(r.id)}" class="matrix-record"><small>✧ ${esc(r.kind||'Связь')}</small><strong>${esc(r.title)}</strong><span>${r.nodeIds.length} элементов · ${r.articleId?'▤ Есть статья':'＋ Статья не назначена'}</span></button>`).join('')||'<p>Пока нет пересечений для выбранной комбинации.</p>'}</div></div>
   ${active?`<div class="matrix-editor"><h2>✧ ${esc(active.title)}</h2><div class="matrix-record-members">${(active.nodeIds||[]).map(id=>{const n=nodes.find(x=>x.id===id);return `<span>${esc(n?.name||id)}</span>`}).join('')}</div>${S.mode==='edit'?`<label>Название<input id="mxTitle" value="${esc(active.title)}"></label><label>Тип связи<input id="mxKind" value="${esc(active.kind||'Связь')}"></label><label>Описание<textarea id="mxNotes">${esc(active.notes||'')}</textarea></label><label class="matrix-reveal-check"><input type="checkbox" id="mxReveal" ${active.revealAfterRead?'checked':''}> Требуется предыдущая связь: открыть после прочтения указанной статьи</label><label>Предыдущее знание<select id="mxPrerequisite"><option value="">— Та же статья, что у связи —</option>${(S.world.articles||[]).map(a=>`<option value="${esc(a.id)}" ${a.id===active.prerequisiteArticleId?'selected':''}>${esc(a.title)}</option>`).join('')}</select></label><label>Статья<select id="mxArticle"><option value="">— Не назначена —</option>${(S.world.articles||[]).map(a=>`<option value="${esc(a.id)}" ${a.id===active.articleId?'selected':''}>${esc(a.title)}</option>`).join('')}</select></label>`:`<p>${esc(active.notes||'Описание ещё не заполнено.')}</p>`}<div class="matrix-actions"><button id="mxOpenArticle">▤ Открыть статью</button>${S.mode==='edit'?'<button id="mxCreateArticle">＋ Создать статью</button><button id="mxSetNodes">↺ Заменить состав выбранными</button><button id="mxSaveRecord">✓ Сохранить</button><button id="mxDeleteRecord">Удалить связь</button>':''}</div></div>`:''}
   <div class="matrix-backlink"><button id="mxPantheon">✦ Открыть Матрицу Пантеона с тем же выбором</button><span>Оба интерфейса используют одни записи пересечений.</span></div></main></div></div>`;
   const $=q=>root.querySelector(q);
   $('#mxClose').onclick=()=>root.remove();
   root.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{collapsed.has(b.dataset.group)?collapsed.delete(b.dataset.group):collapsed.add(b.dataset.group);const el=b.closest('.matrix-node-group')?.querySelector('.matrix-node-grid');if(el)el.hidden=collapsed.has(b.dataset.group);b.textContent=collapsed.has(b.dataset.group)?'▸ Развернуть':'▾ Свернуть';});
   root.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{category=b.dataset.cat;page=0;render();});
   root.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{chosen.has(b.dataset.pick)?chosen.delete(b.dataset.pick):chosen.add(b.dataset.pick);render();});
   $('#mxClear')?.addEventListener('click',()=>{chosen.clear();render();});
   $('#mxSearch').oninput=e=>{filter=e.target.value;page=0;const at=e.target.selectionStart;render();const field=$('#mxSearch');field.focus();field.setSelectionRange(at,at);};
   $('#mxMatch').onchange=e=>{match=e.target.value;render();};
   $('#mxMore')?.addEventListener('click',()=>{const scroll=root.scrollTop,pool=root.querySelector('.matrix-pool')?.scrollTop||0;page++;render();root.scrollTop=scroll;const next=root.querySelector('.matrix-pool');if(next)next.scrollTop=pool;});
   root.querySelectorAll('[data-record]').forEach(b=>b.onclick=()=>{openId=b.dataset.record;render();root.querySelector('.matrix-editor')?.scrollIntoView({block:'nearest',behavior:'smooth'});});
   $('#mxNewCat')?.addEventListener('click',()=>{const name=prompt('Название категории');if(!name?.trim())return;let c=d.categories.find(x=>x.name.toLocaleLowerCase('ru')===name.trim().toLocaleLowerCase('ru'));if(!c){c={id:uid(),name:name.trim()};d.categories.push(c);save();}category=c.id;page=0;render();});
   $('#mxNewNode')?.addEventListener('click',()=>{const name=prompt('Название элемента');if(!name?.trim())return;const catId=category==='Все'?null:category;if(!catId){alert('Сначала выберите категорию слева. Новый элемент появится именно в ней.');return;}const existing=nodes.find(n=>n.name.toLocaleLowerCase('ru')===name.trim().toLocaleLowerCase('ru')&&n.categoryId===catId);if(existing){chosen.add(existing.id);render();return;}const n={id:uid(),name:name.trim(),categoryId:catId,articleId:''};d.nodes.push(n);chosen.add(n.id);save();render();});
   root.querySelectorAll('.matrix-node[data-pick]').forEach(b=>b.addEventListener('contextmenu',e=>{if(S.mode!=='edit')return;const n=d.nodes.find(n=>n.id===b.dataset.pick);if(!n)return;e.preventDefault();const title=prompt('Переименовать элемент (пустая строка — отмена)',n.name);if(!title?.trim())return;n.name=title.trim();save();render();}));
   $('#mxNewRecord')?.addEventListener('click',()=>{if(!chosen.size){alert('Сначала выберите элементы.');return;}const r=store().createRecord([...chosen]);openId=r.id;render();});
   $('#mxPantheon').onclick=()=>{root.remove();window.PantheonOpenMatrix?.();};
   if(active){
     $('#mxOpenArticle').onclick=()=>{const a=S.world.articles?.find(x=>x.id===active.articleId);if(!a){if(S.mode==='edit'){const title=prompt('Статья не назначена. Создать связанную статью?',active.title);if(title?.trim()){const created=window.AvronMaterials?.create?.('article',{title:title.trim(),parents:['lore:'+active.id,...(active.nodeIds||[]).filter(x=>window.AvronMaterials?.has?.(x))]});if(created){active.articleId=created.id;store().updateRecord(active);root.remove();window.AvronNav?.open?.('article:'+created.id);}}}else alert('У пересечения пока нет статьи.');return;}root.remove();window.AvronNav?.open?.('article:'+a.id);};
     $('#mxCreateArticle')?.addEventListener('click',()=>{const title=prompt('Название новой статьи',active.title);if(!title?.trim())return;const a=window.AvronMaterials?.create?.('article',{title,parents:['lore:'+active.id,...(active.nodeIds||[]).filter(x=>window.AvronMaterials?.has?.(x))]});if(a){if(active.articleId&&active.articleId!==a.id)window.AvronMaterials?.detach?.('lore:'+active.id,'article:'+active.articleId);active.articleId=a.id;store().updateRecord(active);render();window.AvronNav?.open?.('article:'+a.id);}});
     $('#mxSetNodes')?.addEventListener('click',()=>{if(!chosen.size){alert('Сначала выберите новый набор элементов.');return;}if(!confirm('Заменить состав этого пересечения текущим выбором?'))return;active.nodeIds=[...chosen];active.entityIds=active.nodeIds.filter(id=>id.startsWith('entity:')).map(id=>id.slice(7));store().updateRecord(active);render();});
     $('#mxSaveRecord')?.addEventListener('click',()=>{active.title=$('#mxTitle').value;active.kind=$('#mxKind').value;active.notes=$('#mxNotes').value;const previousArticleId=active.articleId;const nextArticleId=$('#mxArticle').value;if(previousArticleId&&previousArticleId!==nextArticleId)window.AvronMaterials?.detach?.('lore:'+active.id,'article:'+previousArticleId);active.articleId=nextArticleId;if(active.articleId)window.AvronMaterials?.attach?.('lore:'+active.id,'article:'+active.articleId);active.revealAfterRead=$('#mxReveal')?.checked||false;active.prerequisiteArticleId=$('#mxPrerequisite')?.value||'';store().updateRecord(active);render();});
     $('#mxDeleteRecord')?.addEventListener('click',()=>{if(!confirm('Удалить пересечение? Статьи сохранятся.'))return;store().removeRecord(active.id);openId='';render();});
   }
 }
 render();
}
window.AvronLoreMatrix={open:matrix};
const nav=document.querySelector('#worldNav');if(nav){const b=document.createElement('button');b.textContent='✧ Атлас связей';b.id='avronLoreNav';b.onclick=()=>matrix();nav.insertBefore(b,document.querySelector('#customNav'));}
})();
