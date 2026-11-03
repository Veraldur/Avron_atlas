/* AvronAtlas XXXIII — Writer's Adviser. World-local graph grounding, opt-in online model. */
(()=>{'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const W=()=>window.S?.world;
const keys={article:'articles',entity:'entities',node:'explorerNodes',relic:'relics',puzzle:'puzzles',showcase:'showcases',room:'adventureRooms',book:'chronicleBooks',god:'pantheon',event:'timeline.events'};
const labels={article:'Статья',entity:'Объект',node:'Место',relic:'Артефакт',puzzle:'Тайна',showcase:'Витрина',room:'Приключение',book:'Летопись',god:'Божество',event:'Событие'};
const typeKeys=()=>new Map((W()?.types||[]).map(t=>[String(t.id),t.name]));
const ref=(kind,id)=>kind+':'+id;
const arr=(kind)=>kind==='event'?(W()?.timeline?.events||[]):(W()?.[keys[kind]]||[]);
const text=x=>String(x??'').replace(/data:[^\s"']{20,}/g,'[встроенное изображение]').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const desc=(item,kind)=>text(item?.summary||item?.description||item?.body||item?.lore||item?.intro||item?.subtitle||'').slice(0,250);
const title=(item)=>item?.title||item?.name||item?.id||'Материал';
let openedArticle=null;
function buildGraph(article){
 const w=W(),items=new Map(),adj=new Map(),notes=new Map(),addEdge=(a,b,why,cost=1)=>{
  if(!items.has(a)||!items.has(b)||a===b)return;
  if(!adj.has(a))adj.set(a,[]);if(!adj.has(b))adj.set(b,[]);
  adj.get(a).push({key:b,why,cost});adj.get(b).push({key:a,why,cost});
 };
 if(!w)return {items,adj};
 for(const kind of Object.keys(keys))for(const x of arr(kind))if(x?.id!=null){const k=ref(kind,x.id);items.set(k,{key:k,kind,id:String(x.id),title:title(x),description:desc(x,kind),item:x});}
 const idOf=(kind,id)=>ref(kind,String(id??''));
 for(const e of arr('entity')){
  const k=idOf('entity',e.id);
  if(e.articleId)addEdge(k,idOf('article',e.articleId),'Статья объекта');
  if(e.linkMapId){/* map links don't have narrative previews */}
 }
 for(const r of w.relations||[])addEdge(idOf('entity',r.from),idOf('entity',r.to),'Связь объектов');
 for(const n of arr('node')){
  const k=idOf('node',n.id);
  if(n.entityId)addEdge(k,idOf('entity',n.entityId),'Город или место на карте');
  for(const v of [...(n.links||[]),...(n.hotspots||[])])addEdge(k,idOf(v.type==='adventure'?'room':v.type,v.id),'Маршрут исследования');
 }
 for(const r of arr('relic')){
  const k=idOf('relic',r.id);
  if(r.sourceEntityId)addEdge(k,idOf('entity',r.sourceEntityId),'Место находки');
  if(r.sourceNodeId)addEdge(k,idOf('node',r.sourceNodeId),'Источник артефакта');
 }
 for(const p of arr('puzzle')){
  const k=idOf('puzzle',p.id);
  if(p.sourceNodeId)addEdge(k,idOf('node',p.sourceNodeId),'Место тайны');
  if(p.unlockArticleId)addEdge(k,idOf('article',p.unlockArticleId),'История за тайной');
  for(const id of p.requiredRelicIds||[])addEdge(k,idOf('relic',id),'Ключ к загадке');
 }
 for(const room of arr('room'))if(room.entityId)addEdge(idOf('room',room.id),idOf('entity',room.entityId),'Подземелье или место приключения');
 for(const s of arr('showcase')){
  const k=idOf('showcase',s.id);
  if(s.entityId)addEdge(k,idOf('entity',s.entityId),'Витрина объекта');
  if(s.explorerNodeId)addEdge(k,idOf('node',s.explorerNodeId),'Исследование города');
  if(s.adventureRoomId)addEdge(k,idOf('room',s.adventureRoomId),'Комната приключения');
 }
 for(const ev of arr('event')){
  const k=idOf('event',ev.id);
  if(ev.entityId)addEdge(k,idOf('entity',ev.entityId),'Место события');
  if(ev.articleId)addEdge(k,idOf('article',ev.articleId),'История события');
 }
 for(const b of arr('book'))if(b.articleId)addEdge(idOf('book',b.id),idOf('article',b.articleId),'Летопись статьи');
 for(const [k,links]of Object.entries(w.contentLinks||{}))for(const l of links||[])addEdge(k,ref(l.kind,l.id),'Авторская ссылка');
 // Wiki-links and non-accidental name mentions in the current article; bounded.
 const ak=idOf('article',article.id),whole=(article.title+' '+(article.body||'')).toLocaleLowerCase('ru');
 for(const [k,x] of items){if(k===ak)continue;const name=x.title.toLocaleLowerCase('ru');if(name.length<5)continue;
  if(whole.includes('[['+name)||whole.includes(name)&&x.kind==='entity'&&name.length>=7){addEdge(ak,k,'Упомянуто в статье',1.2);}
  if(x.kind==='entity'&&name===String(article.title||'').toLocaleLowerCase('ru'))addEdge(ak,k,'Совпадает название');
 }
 // Geographic neighbors: do not make all 266 entities an all-to-all graph.
 const ents=arr('entity'),byId=new Map(ents.map(x=>[String(x.id),x]));
 const positions=e=>Array.isArray(e?.points)&&e.points.length?{x:e.points.reduce((a,p)=>a+Number(p[0]||0),0)/e.points.length,y:e.points.reduce((a,p)=>a+Number(p[1]||0),0)/e.points.length}:Number.isFinite(+e?.x)&&Number.isFinite(+e?.y)?{x:+e.x,y:+e.y}:null;
 for(const e of ents){const p=positions(e);if(!p)continue;
  const nearby=[];for(const o of ents){if(e.id===o.id||e.mapId!==o.mapId)continue;const q=positions(o);if(!q)continue;const distance=Math.hypot(p.x-q.x,p.y-q.y);if(distance<650)nearby.push({o,distance});}
  nearby.sort((a,b)=>a.distance-b.distance);
  for(const a of nearby.slice(0,4))addEdge(idOf('entity',e.id),idOf('entity',a.o.id),'Соседствует на карте',2.4);
 }
 return {items,adj};
}
function collect(article,{radius=2,anchor=''}={}){
 const {items,adj}=buildGraph(article);const start=ref('article',article.id);
 const queue=[{key:start,cost:0,via:'Текущая статья'}],seen=new Map([[start,queue[0]]]);
 if(anchor&&items.has(anchor)){const a={key:anchor,cost:0.3,via:'Выбрана автором область'};queue.push(a);seen.set(anchor,a);}
 // Dijkstra over a small graph. Radius 1..3 maps to max weight thresholds.
 const max={1:1.5,2:3.6,3:6.5}[radius]||3.6;
 while(queue.length){queue.sort((a,b)=>a.cost-b.cost);const cur=queue.shift();if(seen.get(cur.key)!==cur)continue;
  for(const edge of adj.get(cur.key)||[]){const cost=cur.cost+edge.cost;if(cost>max)continue;const prev=seen.get(edge.key);if(!prev||cost<prev.cost){const next={key:edge.key,cost,via:edge.why};seen.set(edge.key,next);queue.push(next);}}
 }
 const results=[...seen.values()].filter(x=>x.key!==start).map(x=>({...items.get(x.key),cost:x.cost,via:x.via})).filter(x=>x.item);
 results.sort((a,b)=>a.cost-b.cost||a.title.localeCompare(b.title,'ru'));
 const maxResults=radius===3?18:radius===2?12:8;
 return results.slice(0,maxResults).map(({key,kind,id,title,description,cost,via})=>({ref:key,kind,id,title,description,via,score:Math.round(cost*10)/10}));
}
const TASKS=window.AvronIdeaEngine?.TASKS||{event:'Событие',conflict:'Конфликт',quest:'Квест',npc:'Персонаж',creature:'Противник',links:'Связи'};
const THEMES=window.AvronIdeaEngine?.THEMES||{any:'Любая атмосфера'};
const SCALES=window.AvronIdeaEngine?.SCALES||{any:'Любой масштаб'},DRIVES=window.AvronIdeaEngine?.DRIVES||{any:'Любая задача'},COMPLEXITIES=window.AvronIdeaEngine?.COMPLEXITIES||{episode:'Эпизод'},WEIRDNESS=window.AvronIdeaEngine?.WEIRDNESS||{balanced:'Умеренная магия'};
const MODE={canon:'Строго по канону',creative:'Творческий',wild:'Неожиданный'};
const taskName=(t)=>TASKS[t]||'Смешать всё';
function makeIdeas(action,whichMode,context,article,turn=0,opts={}){
 if(!window.AvronIdeaEngine)return[];
 return window.AvronIdeaEngine.generate({article,context,task:action,mode:whichMode,theme:opts.theme||'any',count:opts.count||12,focus:opts.focus||'',seen:opts.seen||[],seed:opts.seed||Date.now()+turn*907,scale:opts.scale||'any',drive:opts.drive||'any',complexity:opts.complexity||'episode',weirdness:opts.weirdness||'balanced'});
}
let activeId=null,drawer=null,open=false,anchor='',task='all',mode='creative',radius=2,turn=0,results=[],sourceText='',status='',aiStatus={enabled:false},batch=12,theme='any',focus='',pinned=new Set(),ideaSignatures=new Set(),onlyPinned=false,loadingAI=false,scale='any',drive='any',complexity='episode',weirdness='balanced',bankOpen=false,bankKey='premise',bankSearch='',bankPage=0,ideaPage=0;
const MAX_IDEAS=360,IDEAS_PER_PAGE=16;
const getArticle=()=>W()?.articles?.find(a=>a.id===activeId);
function articleText(){return document.querySelector('#avronArticleStudio [data-body]')?.value??getArticle()?.body??'';}
function md(x){return esc(x).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');}
function present(){const a=getArticle();if(!a||!drawer)return;
 const ctx=collect({...a,body:articleText()}, {radius,anchor});
 const nodes=(W()?.entities||[]).filter(e=>e.name&&e.id).sort((a,b)=>a.name.localeCompare(b.name,'ru')).map(e=>`<option value="entity:${esc(e.id)}" ${anchor==='entity:'+e.id?'selected':''}>${esc(e.name)}</option>`).join('');
 const filtered=results.map((r,i)=>({...r,index:i})).filter(r=>!onlyPinned||pinned.has(r.signature||String(r.index)));
 const maxPages=Math.max(1,Math.ceil(filtered.length/IDEAS_PER_PAGE));ideaPage=Math.min(ideaPage,maxPages-1);const visible=filtered.slice(ideaPage*IDEAS_PER_PAGE,(ideaPage+1)*IDEAS_PER_PAGE);
 const bank=window.AvronIdeaEngine,stats=bank?.STATS?.(W())||{tables:0,base:0,total:0,custom:0},list=bank?.list?.(bankKey,bankSearch,W())||[],bankPages=Math.max(1,Math.ceil(list.length/30));bankPage=Math.min(bankPage,bankPages-1);const onBankPage=list.slice(bankPage*30,(bankPage+1)*30);
 drawer.innerHTML=`<header><div><small>✧ АВРОН · МАСТЕРСКАЯ СЮЖЕТОВ</small><h3>Советник Летописца</h3></div><button type="button" data-close aria-label="Закрыть советника">✕</button></header>
 <p class="av33-lead">Сотни сюжетных заготовок: исследуйте таблицы, смешивайте мотивы, миры, чудеса и последствия. Авторские варианты можно добавлять в JSON. ИИ — по отдельному нажатию.</p>
 <div class="av33-settings">
  <label>Направление<select data-task>${Object.entries(TASKS).map(([k,v])=>`<option value="${k}" ${task===k?'selected':''}>${v}</option>`).join('')}</select></label>
  <label>Атмосфера<select data-theme>${Object.entries(THEMES).map(([k,v])=>`<option value="${k}" ${theme===k?'selected':''}>${v}</option>`).join('')}</select></label>
  <label>Свобода творчества<select data-mode>${Object.entries(MODE).map(([k,v])=>`<option value="${k}" ${mode===k?'selected':''}>${v}</option>`).join('')}</select></label>
  <label>Идей за подбор<select data-batch>${[6,12,24,48].map(v=>`<option value="${v}" ${batch===v?'selected':''}>${v} вариантов</option>`).join('')}</select></label>
  <label>Глубина связей<select data-radius>${[1,2,3].map(v=>`<option value="${v}" ${radius===v?'selected':''}>${v} ${v===1?'— ближайшие':v===2?'— вокруг':'— шире'}</option>`).join('')}</select></label>
  <label>Где происходит история<select data-anchor><option value="">По связям статьи</option>${nodes}</select></label>
  <label>Масштаб<select data-scale>${Object.entries(SCALES).map(([k,v])=>`<option value="${k}" ${scale===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label>
  <label>Ведущий интерес<select data-drive>${Object.entries(DRIVES).map(([k,v])=>`<option value="${k}" ${drive===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label>
  <label>Размер сюжетной конструкции<select data-complexity>${Object.entries(COMPLEXITIES).map(([k,v])=>`<option value="${k}" ${complexity===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label>
  <label>Доля магической странности<select data-weirdness>${Object.entries(WEIRDNESS).map(([k,v])=>`<option value="${k}" ${weirdness===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label>
  <label class="av34-wide">Что хочется исследовать?<input type="text" data-focus maxlength="180" placeholder="Например: подмена памяти, цена клятвы…" value="${esc(focus)}"></label>
 </div>
 <div class="av35-library-head"><strong>✦ Арсенал идей: ${stats.base} базовых + ${stats.custom} авторских заготовок · ${stats.tables} таблиц</strong><button type="button" data-bank-toggle>${bankOpen?'Закрыть':'Открыть библиотеку'}</button></div>
 ${bankOpen?`<section class="av35-bank"><div class="av35-bank-filters"><label>Тематическая таблица<select data-bank-key>${Object.entries(bank.LABELS).map(([k,v])=>`<option value="${k}" ${bankKey===k?'selected':''}>${esc(v)} (${bank.table(k,W()).length})</option>`).join('')}</select></label><label>Поиск по вариантам<input type="search" data-bank-search value="${esc(bankSearch)}" placeholder="Слово или сюжетный мотив"></label></div><div class="av35-bank-list">${onBankPage.map(x=>`<div class="av35-bank-line"><span>${esc(x.text)}</span>${x.custom?`<button type="button" data-bank-delete="${x.customIndex}" title="Удалить авторский вариант">✕</button>`:''}</div>`).join('')}</div><div class="av35-bank-footer"><span>Найдено: ${list.length} · ${bankPage+1}/${bankPages}</span><button type="button" data-bank-prev ${bankPage===0?'disabled':''}>←</button><button type="button" data-bank-next ${bankPage===bankPages-1?'disabled':''}>→</button></div><div class="av35-custom"><input type="text" maxlength="280" data-bank-new placeholder="Своя завязка, мотив, улика, осложнение…"><button type="button" data-bank-add>＋ В библиотеку мира</button></div><small>Авторские дополнения сохраняются в JSON мира. Базовые таблицы остаются неизменными.</small></section>`:''}
 <div class="av33-context-head"><strong>Контекст Аврона: ${ctx.length} материалов</strong><button type="button" data-toggle-context>${drawer.dataset.contextOpen==='1'?'Скрыть':'Развернуть'}</button></div>
 <div class="av33-context" ${drawer.dataset.contextOpen==='1'?'':'hidden'}>${ctx.length?ctx.map(x=>`<button type="button" data-source="${esc(x.ref)}" title="Открыть связанный материал"><span>${esc(labels[x.kind]||x.kind)} · ${esc(x.via)}</span><strong>${esc(x.title)}</strong><small>${esc(x.description.slice(0,100))}</small></button>`).join(''):'<p>Прямых связей пока нет. Выберите местоположение вручную или свяжите статью с объектом.</p>'}</div>
 <div class="av33-actions"><button type="button" data-offline>✦ Набросать ${batch} идей</button><button type="button" data-ai ${aiStatus.enabled&&!loadingAI?'':'disabled'}>${loadingAI?'⏳ Генерируется…':'✧ ИИ: создать подборку'}</button></div>
 <div class="av34-continue"><button type="button" data-more>＋ Ещё ${batch}</button><button type="button" data-pins>${onlyPinned?'Показать все':'★ Избранное'} (${pinned.size})</button><button type="button" data-clear>Очистить невыбранное</button><button type="button" data-export>↓ Подборка .md</button></div>
 <p class="av33-model-notice">${aiStatus.enabled?`ИИ подключён: ${esc(aiStatus.provider)} · ${esc(aiStatus.model)}. Текущая статья и найденный контекст будут отправлены модели только по отдельному нажатию. Запрос может быть платным.`:'Офлайн-генератор работает без сети и без модели. Для настоящего ИИ подключите OpenAI API либо локальную Ollama в Windows-оболочке.'}</p>
 <div class="av33-status" aria-live="polite">${esc(status)}</div>
 <div class="av34-count">Карточек: ${filtered.length} из ${results.length} · на экране ${visible.length} · максимум ${MAX_IDEAS}</div><div class="av35-pages"><button type="button" data-idea-prev ${ideaPage===0?'disabled':''}>← Назад</button><span>Страница ${ideaPage+1} / ${maxPages}</span><button type="button" data-idea-next ${ideaPage>=maxPages-1?'disabled':''}>Вперёд →</button></div>
 <section class="av33-ideas">${visible.length?visible.map(x=>`<article class="av34-idea ${pinned.has(x.signature||String(x.index))?'is-pinned':''}"><div class="av34-idea-top"><small>${x.origin==='ai'?'✧ ИИ · НЕ КАНОН':'✦ АВТОПОДБОР · НЕ ИИ'}</small><button type="button" data-pin="${x.index}" title="Добавить в избранное">${pinned.has(x.signature||String(x.index))?'★':'☆'}</button></div><h4>${esc(x.title)}</h4><div class="av34-idea-text">${md(x.body)}</div><div class="av33-sources">${(x.sources||[]).map(r=>{const s=ctx.find(x=>x.ref===r);return s?`<span title="${esc(s.via)}">${esc(s.title)}</span>`:''}).join('')}</div><div class="av34-idea-bottom"><button type="button" data-insert="${x.index}">＋ В рабочие черновики</button><button type="button" data-reroll="${x.index}" ${x.origin==='ai'?'disabled':''}>↻ Другой вариант</button></div></article>`).join(''):`<p class="av34-empty">${results.length?'В избранном пока нет карточек. Нажмите ☆ у понравившейся идеи.':'Выберите направление и нажмите «Набросать идеи». Новые подборки будут добавляться, а не заменять предыдущие.'}</p>`}</section>`;
 const one=s=>drawer.querySelector(s);
 one('[data-close]').onclick=closeDrawer;
 one('[data-task]').onchange=e=>{task=e.target.value;present()};
 one('[data-theme]').onchange=e=>{theme=e.target.value;present()};
 one('[data-mode]').onchange=e=>{mode=e.target.value;present()};
 one('[data-scale]').onchange=e=>{scale=e.target.value;present()};
 one('[data-drive]').onchange=e=>{drive=e.target.value;present()};
 one('[data-complexity]').onchange=e=>{complexity=e.target.value;present()};
 one('[data-weirdness]').onchange=e=>{weirdness=e.target.value;present()};
 one('[data-batch]').onchange=e=>{batch=Number(e.target.value);present()};
 one('[data-radius]').onchange=e=>{radius=Number(e.target.value);present()};
 one('[data-anchor]').value=anchor;one('[data-anchor]').onchange=e=>{anchor=e.target.value;present()};
 one('[data-focus]').onchange=e=>{focus=e.target.value;present()};
 one('[data-toggle-context]').onclick=()=>{drawer.dataset.contextOpen=drawer.dataset.contextOpen==='1'?'0':'1';present()};
 one('[data-offline]').onclick=()=>addOffline();
 one('[data-more]').onclick=()=>addOffline();
 one('[data-ai]').onclick=()=>callAI();
 one('[data-pins]').onclick=()=>{onlyPinned=!onlyPinned;present()};
 one('[data-clear]').onclick=()=>{results=results.filter((r,i)=>pinned.has(r.signature||String(i)));ideaSignatures=new Set(results.map(r=>r.signature).filter(Boolean));onlyPinned=false;ideaPage=0;status='Неизбранные карточки очищены';present()};
 one('[data-idea-prev]').onclick=()=>{ideaPage=Math.max(0,ideaPage-1);present()};one('[data-idea-next]').onclick=()=>{ideaPage++;present()};
 one('[data-export]').onclick=()=>{const selected=onlyPinned?results.filter(r=>pinned.has(r.signature)):results;const markdown=['# Мастерская сюжетов — '+(a.title||'Статья'),'','> Рабочие идеи, не утверждённый канон.','',...selected.flatMap((x,i)=>['## '+(i+1)+'. '+x.title,'',x.body,''])].join('\n');const blob=new Blob([markdown],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='Avron_Story_Forge_'+new Date().toISOString().slice(0,10)+'.md';link.click();setTimeout(()=>URL.revokeObjectURL(url),5000)};
 one('[data-bank-toggle]').onclick=()=>{bankOpen=!bankOpen;present()};
 if(bankOpen){one('[data-bank-key]').onchange=e=>{bankKey=e.target.value;bankSearch='';bankPage=0;present()};one('[data-bank-search]').onchange=e=>{bankSearch=e.target.value;bankPage=0;present()};one('[data-bank-prev]').onclick=()=>{bankPage=Math.max(0,bankPage-1);present()};one('[data-bank-next]').onclick=()=>{bankPage++;present()};
 one('[data-bank-add]').onclick=()=>{if(window.S?.mode!=='edit')return;const v=one('[data-bank-new]').value;if(!bank.addCustom(bankKey,v,W())){status='Введите уникальный вариант длиной хотя бы восемь символов';present();return;}window.scheduleSave?.();status='Авторский вариант добавлен в мир и будет экспортирован с JSON';present()};
 drawer.querySelectorAll('[data-bank-delete]').forEach(b=>b.onclick=()=>{if(window.S?.mode!=='edit')return;if(bank.removeCustom(bankKey,Number(b.dataset.bankDelete),W())){window.scheduleSave?.();status='Авторский вариант удалён';present()}});}
 
 drawer.querySelectorAll('[data-source]').forEach(b=>b.onclick=()=>{const r=b.dataset.source;if(r&&window.AvronNav?.open)window.AvronNav.open(r);else{status='Этот материал нельзя открыть здесь';present();}});
 drawer.querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.pin),k=results[n]?.signature||String(n);if(pinned.has(k))pinned.delete(k);else pinned.add(k);present()});
 drawer.querySelectorAll('[data-reroll]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.reroll),old=results[n];if(!old||old.origin==='ai')return;let fresh=makeIdeas(old.task||task,mode,ctx,a,++turn,{count:1,theme,focus,scale,drive,complexity,weirdness,seen:[...ideaSignatures],seed:Math.floor(Math.random()*4294967295)});if(!fresh.length)return;const k=old.signature||String(n);pinned.delete(k);results[n]=fresh[0];ideaSignatures.add(fresh[0].signature);status='Карточка перегенерирована — остальные сохранены';present()});
 drawer.querySelectorAll('[data-insert]').forEach(b=>b.onclick=()=>insert(results[Number(b.dataset.insert)]));
}
function addOffline(){const a=getArticle();if(!a)return;const ctx=collect({...a,body:articleText()}, {radius,anchor});const room=Math.max(0,MAX_IDEAS-results.length);if(!room){status='Достигнут предел в '+MAX_IDEAS+' карточек. Сохраните избранное и очистите остальное.';present();return;}
 const batchIdeas=makeIdeas(task,mode,ctx,a,++turn,{count:Math.min(room,batch),theme,focus,scale,drive,complexity,weirdness,seen:[...ideaSignatures],seed:Math.floor(Math.random()*4294967295)});
 batchIdeas.forEach(x=>ideaSignatures.add(x.signature));results.push(...batchIdeas);ideaPage=Math.max(0,Math.ceil(results.length/IDEAS_PER_PAGE)-1);status=`Добавлено ${batchIdeas.length} разных сюжетных гипотез. Всё создаётся локально, ИИ не вызывался.`;present();}
function mount(modal,article){if(activeId&&activeId!==article.id){open=false;anchor='';results=[];status='';focus='';pinned.clear();ideaSignatures.clear();onlyPinned=false;ideaPage=0;}activeId=article.id;drawer=document.getElementById('av33Advisor');if(!drawer){drawer=document.createElement('aside');drawer.id='av33Advisor';drawer.hidden=true;document.body.append(drawer)}if(!open)drawer.hidden=true;else{drawer.hidden=false;present();}
 modal.querySelector('[data-ai-advisor]')?.addEventListener('click',()=>{if(open)closeDrawer();else showDrawer(article.id)});
 fetchStatus();
}
async function fetchStatus(){try{const res=await fetch('/_avron/ai/status',{headers:{'Accept':'application/json'}});if(!res.ok)throw Error('Нет шлюза');const data=await res.json();if(!getArticle())return;aiStatus={enabled:!!data.enabled,provider:String(data.provider||''),model:String(data.model||'')};if(open)present()}catch{aiStatus={enabled:false};}}
function showDrawer(id){if(window.S?.mode!=='edit')return false;activeId=id;open=true;drawer.hidden=false;status='';present();return true}
function closeDrawer(){open=false;if(drawer)drawer.hidden=true;}
function insert(idea){if(!idea||!activeId)return;const lines=[`### Черновая идея — ${idea.title}`,idea.body,...(idea.sources?.length?[`Источники: ${idea.sources.join(', ')}`]:[])];window.AvronRegistry?.appendDraft?.(activeId,idea.title,lines.join('\n\n'));status='Идея сохранена отдельно от статьи. Открой «Черновики», чтобы доработать и перенести её.';present();}

async function callAI(){if(!aiStatus.enabled||loadingAI){status='ИИ-шлюз не настроен или уже выполняется запрос';present();return}
 const a=getArticle();if(!a)return;const beforeId=activeId,ctx=collect({...a,body:articleText()}, {radius,anchor});const room=Math.max(0,MAX_IDEAS-results.length);if(!room){status='Для новых идей освободите место (предел '+MAX_IDEAS+' карточек)';present();return;}
 loadingAI=true;status=`Запрос подборки из ${Math.min(12,batch,room)} оригинальных идей…`;present();
 try{const res=await fetch('/_avron/ai/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({article:{id:a.id,title:a.title,body:articleText().slice(0,4500)},task,mode,theme,focus,scale,drive,complexity,weirdness,count:Math.min(12,batch,room),context:ctx.slice(0,14),avoid:results.slice(-12).map(x=>x.title),inspiration:window.AvronIdeaEngine?.inspiration?.({task,theme,world:W(),seed:Date.now()})||[]})});
 const value=await res.json().catch(()=>({error:'Ошибка ответа шлюза'}));if(!res.ok)throw Error(value.error||'Генерация не удалась');if(beforeId!==activeId)return;
 let ideas=Array.isArray(value.ideas)?value.ideas:[];
 if(!ideas.length&&value.text){const str=String(value.text).slice(0,18000).trim();let blocks=str.split(/\n(?=(?:\d{1,2}[.)]|#{2,3}\s|Идея\s*\d+[:.]))/iu).map(x=>x.trim()).filter(Boolean);if(blocks.length<2)blocks=[str];ideas=blocks.map((body,i)=>({title:`ИИ-вариант ${i+1}`,body}));}
 const normalized=ideas.slice(0,Math.min(12,batch,room)).filter(x=>x&&((x.body||x.text||'')+'').trim()).map((x,i)=>({title:String(x.title||`ИИ-вариант ${i+1}`).slice(0,140),body:String(x.body||x.text).slice(0,4500),sources:(Array.isArray(x.sources)?x.sources:ctx.slice(0,4).map(x=>x.ref)).filter(s=>ctx.some(c=>c.ref===s)),signature:'ai-'+Date.now()+'-'+i,origin:'ai'}));
 results.push(...normalized);ideaPage=Math.max(0,Math.ceil(results.length/IDEAS_PER_PAGE)-1);status=`Модель вернула ${normalized.length} карточек. Они не меняют канон до подтверждения автором.${normalized.length<batch?' Для большей партии используйте обновлённую v34 Windows-оболочку.':''}`;
 }catch(err){status='ИИ недоступен: '+err.message+'. Локальный генератор готов к работе.';}finally{loadingAI=false;present();}}
window.AvronWriterAdvisor={mount,show:showDrawer,close:closeDrawer,collect:(id,options)=>{const a=(W()?.articles||[]).find(x=>x.id===id);return a?collect(a,options||{}):[]},ideas:(id,action='all',mode='creative',opts={})=>{const a=(W()?.articles||[]).find(x=>x.id===id);return a?makeIdeas(action,mode,collect(a,opts),a,0,opts):[]},buildGraph};
window.addEventListener('avron-world-loaded',()=>{closeDrawer();activeId=null});
window.addEventListener('avron-mode-changed',()=>{if(window.S?.mode!=='edit')closeDrawer()});
})();
