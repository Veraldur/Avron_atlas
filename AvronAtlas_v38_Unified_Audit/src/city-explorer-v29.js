/* Avron XXIX — linked place views; data live in the world, visits belong to the viewer. */
(()=>{'use strict';
const ROOT=document.createElement('section');ROOT.id='av29Explorer';ROOT.hidden=true;document.body.appendChild(ROOT);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const world=()=>window.S?.world;
const nodes=()=>world()?.explorerNodes||[];
const visitKey=()=>`avron.exploration.${world()?.id||'world'}.v1`;
let current='',history=[];
function readVisits(){try{return JSON.parse(localStorage.getItem(visitKey())||'{}')}catch{return {}}}
function visit(id){const v=readVisits();v[id]=Date.now();try{localStorage.setItem(visitKey(),JSON.stringify(v))}catch{}window.AvronNav?.mark?.('node',id);return v}
function newness(n,v){return !v[n.id]?'av29-unseen':(n.updatedAt&&v[n.id]<n.updatedAt?'av29-new':'av29-visited')}
function close(){ROOT.hidden=true;document.body.classList.remove('av29-exploring')}
function open(id){const n=nodes().find(v=>v.id===id);if(!n)return false;current=n.id;visit(id);window.AvronHistory?.record?.({kind:'node',id});ROOT.hidden=false;document.body.classList.add('av29-exploring');render();return true}
function destination(link){if(!link)return;const type=link.type,id=link.id;
 if(type==='node'){if(nodes().some(n=>n.id===id)){history.push(current);open(id)}else toast('Узел не найден: '+id);return}
 if(window.AvronNav){close();window.AvronNav.open({kind:type==='adventure'?'room':type==='chronicle'?'book':type,id});return;}
 if(type==='entity'){const ent=world()?.entities?.find(e=>e.id===id);if(!ent)return toast('Объект удалён: '+id);close();window.AvronHub?.enter('map');try{if(typeof selectEntity==='function')selectEntity(id,{center:true,autoplay:false});else toast('Выбор объекта на карте недоступен')}catch(e){toast('Ошибка открытия объекта: '+e.message)}return}
 if(type==='article'){const a=world()?.articles?.find(x=>x.id===id);if(!a)return toast('Статья не найдена');close();window.AvronHub?.enter('encyclopedia');setTimeout(()=>{const f=window.AvronArticleAtelier?.open||window.AvronUnifiedAtelier?.openArticle;if(f)f(id);else toast('Откройте статью в Хранилище знаний: '+(a.title||a.name||id))},100);return}
 if(type==='showcase'){close();window.AvronShowcase?.open(id);return}
 if(type==='adventure'){close();window.AvronAdventures?.open(id);return}
 if(type==='chronicle'){close();window.AvronWorldStudio?.openBook(id);return}
 toast('Неизвестный тип перехода: '+type);
}
function toast(s){let el=ROOT.querySelector('.av29-status');if(el)el.textContent=s;window.AvronConsole?.log?.('warning',s)}
function render(){const n=nodes().find(v=>v.id===current);if(!n){close();return}const v=readVisits();const all=nodes();const links=(n.links||[]).map((link,i)=>{let target=all.find(x=>link.type==='node'&&x.id===link.id);let state=target?newness(target,v):v[link.type+':'+link.id]?'av29-visited':'av29-unseen';return `<button class="av29-route ${state}" data-route="${i}" type="button"><span class="av29-route-icon">${esc(link.icon||'✦')}</span><span><strong>${esc(link.label||target?.title||'Переход')}</strong><small>${esc(link.description||'Исследовать')}</small></span>${state==='av29-new'||state==='av29-unseen'?'<i aria-label="Не посещено или обновлено"></i>':''}</button>`}).join('');
 ROOT.innerHTML=`<div class="av29-frame"><header class="av29-bar"><span>✧ AVRON ATLAS / ИССЛЕДОВАНИЕ</span><nav><button data-nav="back" ${history.length?'':'disabled'}>← Назад</button><button data-nav="map">⌖ Карта</button><button data-nav="close">✕ Закрыть</button></nav></header><div class="av29-hero" style="--av29-cover:url('${String(n.cover||'').replace(/[\\'()]/g,'')}')">${(n.hotspots||[]).map((hot,i)=>`<button type="button" class="av32-canvas-pin" style="left:${Math.max(3,Math.min(97,Number(hot.x)||50))}%;top:${Math.max(5,Math.min(90,Number(hot.y)||50))}%" data-hotspot="${i}"><span>✦</span>${esc(hot.label||'Открыть')}</button>`).join('')}${window.S?.mode==='edit'&&n.hotspots?.length?'<button class="av32-hotspot-edit" data-nav="hotspots">✎ Зоны изображения</button>':''}<div class="av29-hero-copy"><small>${esc(n.eyebrow||'ПУТЕВОДИТЕЛЬ ПО МИРУ')}</small><h1>${esc(n.title)}</h1><p>${esc(n.subtitle||'')}</p></div></div><div class="av29-body"><article><span class="av29-caption">${esc(n.kicker||'ЛОКАЛЬНАЯ ХРОНИКА')}</span><h2>${esc(n.heading||'За стенами истории')}</h2><p>${esc(n.description||'')}</p>${n.epigraph?`<blockquote>${esc(n.epigraph)}</blockquote>`:''}<section class="av29-side-note"><strong>✧ Новые знания</strong><p>Синий огонёк отмечает неизведанные или обновлённые места. Посещение само по себе не открывает секретные статьи.</p></section></article><aside><h2>Куда отправиться</h2><div class="av29-routes">${links||'<p>Добавьте переходы в редакторе узла.</p>'}</div><div class="av29-status" aria-live="polite"></div></aside></div>${window.S?.mode==='edit'?'<button class="av29-edit" data-nav="edit">✎ Редактировать место</button>':''}</div>`;
 ROOT.querySelectorAll('[data-hotspot]').forEach(b=>b.onclick=()=>destination(n.hotspots[Number(b.dataset.hotspot)]));
 ROOT.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>{const l=n.links[Number(b.dataset.route)];if(l.type!=='node'){const vv=readVisits();vv[l.type+':'+l.id]=Date.now();try{localStorage.setItem(visitKey(),JSON.stringify(vv))}catch{}}destination(l)}));
 ROOT.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{const a=b.dataset.nav;if(a==='close')close();if(a==='map'){close();window.AvronHub?.enter('map')}if(a==='back'&&history.length)open(history.pop());if(a==='edit')edit(n);if(a==='hotspots')window.AvronRelicary?.editHotspots(n.id)});
}
function edit(n){
 if(window.S?.mode!=='edit')return;
 document.querySelector('.av29-editor')?.remove();
 const draft=JSON.parse(JSON.stringify(n.links||[]));
 const modal=document.createElement('div');modal.className='av29-editor av31-place-editor';
 modal.innerHTML=`<div class="av29-editor-panel av31-place-panel" role="dialog" aria-modal="true" aria-label="Редактор места">
 <header class="av31-place-header"><div><small>AVRON / РЕДАКТОР МЕСТА</small><h2>✎ ${esc(n.title)}</h2></div><button type="button" data-action="cancel">✕</button></header>
 <div class="av31-place-grid"><div class="av31-place-fields">
 <label>Название<input name="title" value="${esc(n.title)}"></label>
 <label>Подзаголовок<input name="subtitle" value="${esc(n.subtitle||'')}"></label>
 <label>Обложка / путь к ассету<input name="cover" value="${esc(n.cover||'')}"></label>
 <label>Описание<textarea name="description" rows="5">${esc(n.description||'')}</textarea></label>
 <label>Эпиграф<input name="epigraph" value="${esc(n.epigraph||'')}"></label>
 <div class="av31-cover-preview"><img src="${esc(n.cover||'')}" alt="Предпросмотр обложки"></div>
 </div><div class="av31-place-routes"><h3>Маршруты и переходы</h3><p>Добавляйте ссылки на существующие материалы. Они открываются в своих движках и не копируются.</p><div data-routes></div>
 <div class="av31-add-route"><label>Найти материал<input type="search" data-search placeholder="Дом, гильдия, объект, статья…"></label><select data-target size="6" aria-label="Выберите материал"></select><label>Подпись кнопки<input data-label placeholder="Например: Войти в цитадель"></label><label>Описание маршрута<input data-description placeholder="Кратко, что ждёт внутри"></label><button type="button" data-action="add">＋ Добавить переход</button></div></div></div>
 <footer class="av29-edit-actions"><span class="av29-err" aria-live="polite"></span><button type="button" data-action="cancel">Отмена</button><button type="button" data-action="save">✓ Сохранить место</button></footer></div>`;
 document.body.append(modal);
 const rows=modal.querySelector('[data-routes]'),search=modal.querySelector('[data-search]'),select=modal.querySelector('[data-target]');
 const all=(window.AvronNav?.all?.()||[]).filter(x=>!(x.kind==='node'&&x.id===n.id));
 const names={relic:'Артефакт',puzzle:'Загадка',entity:'Объект',node:'Место',article:'Статья',showcase:'Витрина',room:'Комната',book:'Летопись',section:'Раздел',god:'Божество',map:'Карта'};
 const norm=t=>({adventure:'room',chronicle:'book'}[t]||t);
 const look=r=>all.find(x=>x.kind===norm(r.type)&&x.id===r.id);
 function paint(){rows.innerHTML=draft.map((r,i)=>`<div class="av31-route-row"><span>${esc(r.icon||'✦')}</span><div><strong>${esc(r.label||look(r)?.name||'Переход')}</strong><small>${esc(names[norm(r.type)]||r.type)} · ${esc(look(r)?.name||r.id)}${!look(r)?' · ⚠ Цель отсутствует':''}</small></div><button type="button" data-up="${i}" ${i===0?'disabled':''} title="Выше">↑</button><button type="button" data-down="${i}" ${i===draft.length-1?'disabled':''} title="Ниже">↓</button><button type="button" data-remove="${i}" title="Удалить связь">×</button></div>`).join('')||'<p>Пока нет маршрутов. Добавьте первый ниже.</p>';
 rows.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{draft.splice(Number(b.dataset.remove),1);paint()});
 for(const dir of ['up','down']) rows.querySelectorAll(`[data-${dir}]`).forEach(b=>b.onclick=()=>{const i=Number(b.dataset[dir]),j=i+(dir==='up'?-1:1);[draft[i],draft[j]]=[draft[j],draft[i]];paint()});}
 function choose(){const q=search.value.trim().toLocaleLowerCase('ru');select.replaceChildren();for(const r of all.filter(x=>(x.name+' '+names[x.kind]+' '+x.id).toLocaleLowerCase('ru').includes(q)).slice(0,120)){const o=document.createElement('option');o.value=r.kind+':'+r.id;o.textContent=(names[r.kind]||r.kind)+' · '+r.name;select.append(o)}}
 search.addEventListener('input',choose);choose();paint();
 modal.querySelector('[name="cover"]').addEventListener('change',e=>modal.querySelector('.av31-cover-preview img').src=e.target.value);
 modal.querySelectorAll('[data-action="cancel"]').forEach(b=>b.onclick=()=>modal.remove());modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
 modal.querySelector('[data-action="add"]').onclick=()=>{const v=select.value;if(!v)return;const cut=v.indexOf(':'),type=v.slice(0,cut),id=v.slice(cut+1),record=all.find(r=>r.kind===type&&r.id===id);if(!record)return;draft.push({type,id,label:modal.querySelector('[data-label]').value.trim()||record.name,description:modal.querySelector('[data-description]').value.trim(),icon:'✦'});modal.querySelector('[data-label]').value='';modal.querySelector('[data-description]').value='';paint()};
 modal.querySelector('[data-action="save"]').onclick=()=>{try{const data=Object.fromEntries([...modal.querySelectorAll('.av31-place-fields [name]')].map(x=>[x.name,x.value]));const invalid=draft.find(r=>!look(r));if(invalid)throw Error('У маршрута отсутствует цель: '+(invalid.label||invalid.id)+'. Исправьте связь перед сохранением.');Object.assign(n,data,{links:draft.map(r=>({...r,type:norm(r.type)})),updatedAt:Date.now()});if(typeof scheduleSave==='function')scheduleSave();window.dispatchEvent(new Event('avron-nav-updated'));modal.remove();render()}catch(err){modal.querySelector('.av29-err').textContent=err.message}};
}
function addCityEntry(){/* Explorer is registered in unified world navigation and entity actions. */}
window.AvronExplorer={open,close,edit,go:destination,openByEntity(id){const n=nodes().find(n=>n.entityId===id);return n?open(n.id):false},inspect:()=>({nodes:nodes().length,invalid:nodes().flatMap(n=>(n.links||[]).filter(l=>(l.type==='node'&&!nodes().some(x=>x.id===l.id))||(l.type==='entity'&&!world()?.entities?.some(x=>x.id===l.id))||(l.type==='article'&&!world()?.articles?.some(x=>x.id===l.id))||(l.type==='showcase'&&!world()?.showcases?.some(x=>x.id===l.id))||(l.type==='adventure'&&!world()?.adventureRooms?.some(x=>x.id===l.id))).map(l=>({from:n.id,link:l})))})};
addCityEntry();window.addEventListener('avron-world-loaded',()=>{if(!ROOT.hidden)close()});
})();
