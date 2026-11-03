/* Avron XXX — one reference language for separate editors and presentation engines. */
(()=>{'use strict';
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const w=()=>window.S?.world;
const saved=()=>{if(window.S)S.unsaved=true;try{if(typeof scheduleSave==='function')scheduleSave()}catch(err){console.warn(err)}window.dispatchEvent(new Event('avron-nav-updated'));window.AvronSlots?.render?.()};
const makeId=prefix=>prefix+'-'+(window.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2));
const routes=()=>{const x=w();if(!x)return{};x.contentLinks||={};return x.contentLinks};
const key=(k,id)=>k+':'+id;
const entities=()=>w()?.entities||[];
const arrays={relic:'relics',puzzle:'puzzles',entity:'entities',article:'articles',showcase:'showcases',book:'chronicleBooks',room:'adventureRooms',node:'explorerNodes',section:'sections',god:'pantheon',map:'maps',chronicle:'chronicles',timelineEvent:'timeline.events',lore:'loreMatrix.records',loreNode:'loreMatrix.nodes',entry:'sections.entries',exhibit:'$virtual'};
const names={relic:'Артефакт',puzzle:'Загадка',entity:'Объект',article:'Статья',showcase:'Витрина',book:'Летопись',room:'Приключение',node:'Место',section:'Раздел',god:'Божество',map:'Карта',chronicle:'Сцена летописи',timelineEvent:'Событие хронологии',lore:'Пересечение Атласа',loreNode:'Узел Атласа',entry:'Запись раздела',exhibit:'Экспонат'};
const title=x=>x?.name||x?.title||x?.id||'';
function item(k,id){return window.AvronRegistry?.item?.(k+':'+id)||null}
function valid(k,id){return !!item(k,id)}
const visitsKey=()=>`avron.viewer.${w()?.id||'world'}.visited.v30`;
function visits(){try{return JSON.parse(localStorage.getItem(visitsKey())||'{}')}catch{return{}}}
function touched(k,id){const o=visits();o[key(k,id)]=Date.now();try{localStorage.setItem(visitsKey(),JSON.stringify(o))}catch{}}
function state(k,id){const v=visits()[key(k,id)],t=item(k,id)?.updatedAt;return !v?'unseen':t&&Number(t)>v?'updated':'visited'}
function canonical(ref){if(typeof ref==='string'){const at=ref.indexOf(':');return at>0?{kind:ref.slice(0,at),id:ref.slice(at+1)}:{kind:'entity',id:ref};}return{kind:ref?.kind||ref?.type||'entity',id:ref?.id||''}}
let view='jump',from=null,q='',lastStatus='';
const panel=document.createElement('section');panel.id='av30Navigator';panel.hidden=true;document.body.append(panel);
const launcher=document.createElement('button');launcher.id='av30Launcher';launcher.type='button';launcher.textContent='⌕ Переходы';launcher.title='Найти материал, создать связь и перейти';document.body.append(launcher);
function notify(msg){lastStatus=msg;window.AvronConsole?.log?.('warning',msg);const status=panel.querySelector('[data-status]');if(status)status.textContent=msg;}
function open(ref){const {kind,id}=canonical(ref);if(!valid(kind,id)){notify(`Цель не найдена: ${kind}:${id}`);return false}
 try{
   window.AvronHistory?.prepare?.(kind);
   if(kind==='node'){window.AvronExplorer?.open(id);}
   else if(kind==='relic'){if(!window.AvronRelicary?.openRelic(id))throw Error('Реликварий не готов');}
   else if(kind==='puzzle'){if(!window.AvronRelicary?.openPuzzle(id))throw Error('Загадка не найдена');}
   else if(kind==='room'){window.AvronAdventures?.open(id);}
   else if(kind==='showcase'){window.AvronShowcase?.open(id,false);}
   else if(kind==='book'){window.AvronWorldStudio?.openBook(id);}
   else if(kind==='article'){const a=item('article',id);if(window.S?.mode!=='edit'&&a?.draft){notify('Эта статья — черновик автора.');return false;}if(!window.AvronRelicary?.unlockedArticle(a)){notify('Эта история пока скрыта. Исследуйте её следы в Реликварии.');return false;}window.AvronArticleStudio?.open(id);}
   else if(kind==='entity'){
     window.AvronHub?.enter('map');if(typeof selectEntity==='function')selectEntity(id,{center:true,autoplay:false});else throw Error('Выбор объекта недоступен');
   }
   else if(kind==='section'){window.AvronSlots?.go('section:'+id);}
   else if(kind==='lore'){window.AvronLoreMatrix?.open?.({recordId:id});}
   else if(kind==='loreNode'){window.AvronLoreMatrix?.open?.({});}
   else if(kind==='chronicle'){window.PantheonCinematics?.openScene?.(id);}
   else if(kind==='timelineEvent'){const ev=item(kind,id);if(ev?.entityId)window.AvronNav?.open?.('entity:'+ev.entityId);else window.AvronSlots?.go?.('chronicles');}
   else if(kind==='entry'){window.AvronSlots?.go?.('encyclopedia');}
   else if(kind==='exhibit'){const ex=item(kind,id);if(!ex||!window.AvronNav?.open?.({kind:ex.sourceKind,id:ex.sourceId}))throw Error('Исходник экспоната не открывается');}
   else if(kind==='god'){const engine=window.AvronPantheonEngine;engine?.openGallery?.();if(S.mode==='edit')engine?.openEditor?.(id);}
   else if(kind==='map'){window.AvronHub?.enter('map');if(typeof gotoMap==='function')gotoMap(id);}
   else {notify('Нет обработчика: '+kind);return false}
   touched(kind,id);panel.hidden=true;return true;
 }catch(err){notify('Ошибка перехода: '+err.message);return false}
}
function autoForEntity(id){const ent=item('entity',id);if(!ent)return[];
 const a=[];
 if(ent.articleId&&valid('article',ent.articleId))a.push({kind:'article',id:ent.articleId,label:'Статья объекта'});
 for(const n of w().explorerNodes||[])if(n.entityId===id)a.push({kind:'node',id:n.id,label:'Исследовать местность'});
 for(const n of w().adventureRooms||[])if(n.entityId===id)a.push({kind:'room',id:n.id,label:'Комната приключения'});
 for(const n of w().relics||[])if(n.sourceEntityId===id)a.push({kind:'relic',id:n.id,label:'Связанный артефакт'});
 for(const n of w().showcases||[])if(n.entityId===id||n.typeId&&n.typeId===ent.typeId&&n.layout==='city')a.push({kind:'showcase',id:n.id,label:'Витрина объекта'});
 return a;
}
function outgoing(ref){const {kind,id}=canonical(ref);const explicit=routes()[key(kind,id)]||[];
 const model=item(kind,id),auto=kind==='entity'?autoForEntity(id):kind==='book'?(model?.articleIds||[]).filter(a=>valid('article',a)).map(id=>({kind:'article',id,label:'Статья Летописи'})):kind==='lore'&&model?.articleId&&valid('article',model.articleId)?[{kind:'article',id:model.articleId,label:'Статья пересечения'}]:[];const relationships=kind==='entity'?(w()?.relations||[]).filter(r=>String(r.from)===String(id)&&valid('entity',r.to)).map(r=>({kind:'entity',id:String(r.to),label:(w()?.relationTypes||[]).find(t=>t.id===r.typeId)?.name||'Связанный объект'})):[];return [...explicit,...auto,...relationships].filter((r,i,a)=>a.findIndex(x=>x.kind===r.kind&&x.id===r.id)===i);
}
function all(){return (window.AvronRegistry?.all?.()||[]).filter(x=>S.mode==='edit'||(x.kind!=='article'||!item('article',x.id)?.draft)).map(x=>({kind:x.kind,id:x.id,name:x.title}));}
function link(fromRef,toRef,label=''){if(S.mode!=='edit')throw Error('Только Редактор');const done=window.AvronMaterials?.attach?.(fromRef,toRef,{label});if(!done)throw Error('Ссылка не создана: материал отсутствует');return routes()[key(canonical(fromRef).kind,canonical(fromRef).id)]}
function unlink(f,t){window.AvronMaterials?.detach?.(f,t);}
function audit(){const failures=[];const x=w()||{};
 for(const [source,arr]of Object.entries(x.contentLinks||{}))for(const r of arr||[]){const s=canonical(source),t=canonical(r);if(!valid(s.kind,s.id))failures.push({source,target:key(t.kind,t.id),error:'Исходный узел удалён'});if(!valid(t.kind,t.id))failures.push({source,target:key(t.kind,t.id),error:'Цель отсутствует'})}
 for(const n of x.explorerNodes||[])for(const hot of n.hotspots||[])if(!valid(hot.type,hot.id))failures.push({source:key('node',n.id),target:key(hot.type,hot.id),error:'Точка на холсте'});
 for(const n of x.explorerNodes||[])for(const r of n.links||[])if(!valid(r.type,r.id))failures.push({source:key('node',n.id),target:key(r.type,r.id),error:'Ссылка путеводителя'});
 for(const room of x.adventureRooms||[])if(room.entityId&&!valid('entity',room.entityId))failures.push({source:key('room',room.id),target:key('entity',room.entityId),error:'Объект комнаты'});
 for(const s of x.showcases||[]){if(s.layout==='room'&&s.adventureRoomId&&!valid('room',s.adventureRoomId))failures.push({source:key('showcase',s.id),target:key('room',s.adventureRoomId),error:'Комната витрины'});if(s.layout==='city'&&s.explorerNodeId&&!valid('node',s.explorerNodeId))failures.push({source:key('showcase',s.id),target:key('node',s.explorerNodeId),error:'Город витрины'})}
 for(const p of x.puzzles||[]){for(const rid of p.requiredRelicIds||[])if(!valid('relic',rid))failures.push({source:key('puzzle',p.id),target:key('relic',rid),error:'Требуемая находка отсутствует'});if(p.unlockArticleId&&!valid('article',p.unlockArticleId))failures.push({source:key('puzzle',p.id),target:key('article',p.unlockArticleId),error:'Награда отсутствует'})}
 return{total:all().length,explicit:Object.values(x.contentLinks||{}).reduce((n,a)=>n+a.length,0),failures};
}
function targetRows(arr){return arr.map(a=>`<button class="av30-item" data-to="${e(key(a.kind,a.id))}" title="Открыть ${e(names[a.kind])}"><span class="av30-kind">${e(names[a.kind]||a.kind)}</span><span>${e(a.name||a.label||title(item(a.kind,a.id)))}</span><i class="av30-dot ${state(a.kind,a.id)}"></i></button>`).join('')}
function dialog(mode='jump',fromRef=null){view=mode;from=fromRef?canonical(fromRef):null;q='';panel.hidden=false;render();}
function render(){if(panel.hidden)return;const editor=S.mode==='edit';const source=from&&item(from.kind,from.id),items=all(),query=q.toLocaleLowerCase('ru');const filtered=items.filter(x=>(x.name+' '+names[x.kind]+' '+x.id).toLocaleLowerCase('ru').includes(query)).slice(0,75);
 const actual=source?outgoing(from):[];
 panel.innerHTML=`<div class="av30-window" role="dialog" aria-modal="true" aria-label="Навигация по миру"><header><div><small>AVRON ATLAS · ЕДИНАЯ НАВИГАЦИЯ</small><h2>${view==='link'?'Связать материалы':view==='audit'?'Диагностика ссылок':'Куда отправиться?'}</h2></div><button data-close>✕</button></header>${source?`<p class="av30-origin">Источник: ${e(names[from.kind])} / <strong>${e(title(source))}</strong></p>`:''}<nav><button data-view="jump" class="${view==='jump'?'on':''}">Поиск</button>${editor?'<button data-view="audit" class="'+(view==='audit'?'on':'')+'">Диагностика</button>':''}</nav>${view==='audit'?`<div class="av30-audit"><p>Материалов в реестре: <strong>${audit().total}</strong> · Авторских переходов: <strong>${audit().explicit}</strong> · Ошибок: <strong>${audit().failures.length}</strong></p>${audit().failures.slice(0,100).map(f=>`<p class="bad">${e(f.source)} → ${e(f.target)} · ${e(f.error)}</p>`).join('')||'<p>Проверенные переходы имеют существующие цели.</p>'}<p>Проверка показывает целостность ID, но не заменяет тестирование интерфейса в браузере.</p><button type="button" data-relink-wiki>↻ Обновить ссылки из заголовков [[...]]</button><p>Автоматически связываются только уникальные совпадения. Неоднозначные названия требуют ручного выбора.</p></div>`:`${actual.length?`<h3>Привязано к этому материалу</h3><div class="av30-list">${targetRows(actual)}</div>`:''}<input id="av30Search" placeholder="Найти город, статью, зал, объект, летопись…" value="${e(q)}"><div class="av30-list">${targetRows(filtered)}</div><p class="av30-help">${view==='link'?'Нажми на результат, чтобы связать с источником.':'Нажми на результат, чтобы открыть его. Голубая точка — ещё не посещён.'}</p>`}<p class="av30-status" data-status aria-live="polite">${e(lastStatus)}</p><footer>${source&&editor?'<button data-create="article">＋ Статья</button><button data-create="node">＋ Место</button><button data-create="showcase">＋ Витрина</button><button data-create="room">＋ Комната</button><button data-link>＋ Привязать</button>':''}<button data-close>Закрыть</button></footer></div>`;
 panel.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>panel.hidden=true);
 panel.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;render()});panel.querySelector('[data-relink-wiki]')?.addEventListener('click',()=>{const r=window.AvronMaterials?.indexExplicitWiki?.();lastStatus='Добавлено явных ссылок: '+(r?.linked||0)+'; неоднозначных заголовков: '+(r?.issues?.length||0);render();});
 panel.querySelectorAll('[data-to]').forEach(b=>b.onclick=()=>{const ref=canonical(b.dataset.to);try{if(view==='link'&&from){link(from,ref);lastStatus='Связь добавлена';view='jump';render();updateObjectBar();}else open(ref)}catch(err){notify(err.message)}});
 const search=panel.querySelector('#av30Search');search?.addEventListener('input',()=>{q=search.value;const pos=search.selectionStart;render();const v=panel.querySelector('#av30Search');v?.focus();v?.setSelectionRange(pos,pos)});
 panel.querySelector('[data-link]')?.addEventListener('click',()=>{view='link';render()});
 panel.querySelectorAll('[data-create]').forEach(b=>b.onclick=()=>{try{create(b.dataset.create,from);render();updateObjectBar()}catch(err){notify(err.message)}});
}
function create(kind,src){if(S.mode!=='edit')throw Error('Только Редактор');const parents=src?[key(src.kind,src.id)]:[];const obj=window.AvronMaterials?.create?.(kind,{title:({article:'Новая статья',node:'Новое место',showcase:'Новая витрина',room:'Новое приключение'})[kind]||'Новый материал',parents,entityId:src?.kind==='entity'?src.id:''});if(!obj)throw Error('Создание материала не удалось');lastStatus='Создано: '+title(obj);return obj;}
function objectActions(){const id=S.selId;const ent=item('entity',id);if(!ent)return null;
 const links=outgoing({kind:'entity',id});const box=document.createElement('section');box.className='av30-object-actions';box.id='av30ObjectActions';box.dataset.entity=id;
 box.innerHTML=`<div class="av30-actions-header"><strong>✧ Материалы и переходы</strong><span>${e(ent.name)}</span></div><div class="av30-object-links">${links.map(r=>`<button type="button" data-open="${e(key(r.kind,r.id))}">${e(names[r.kind]||r.kind)} · ${e(r.label||title(item(r.kind,r.id)))}</button>`).join('')||'<small>Нет привязанных представлений. Можно создать или подключить.</small>'}</div><div class="av30-quick"><button data-action="article">▤ Статья</button><button data-action="node">⌂ Исследование</button><button data-action="showcase">◈ Витрина</button><button data-action="room">⚔ Приключение</button><button data-action="link">＋ Связать</button></div>`;
 box.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>open(b.dataset.open));box.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{const k=b.dataset.action,src={kind:'entity',id};if(k==='link')dialog('link',src);else{const already=links.find(r=>r.kind===k);if(already)open(already);else if(S.mode==='edit'){const r=create(k,src);open({kind:k,id:r.id});}else dialog('jump',src)}});return box;
}
let busy=false;
function updateObjectBar(){if(busy)return;const target=document.getElementById('tabObject');if(!target||!w())return;const ex=target.querySelector('#av30ObjectActions'),id=S.selId;if(!id){ex?.remove();return}if(ex&&ex.dataset.entity===id)return;busy=true;try{ex?.remove();const panel=objectActions();if(panel)target.prepend(panel)}finally{busy=false}}
new MutationObserver(()=>updateObjectBar()).observe(document.querySelector('#tabObject')||document.body,{childList:true,subtree:false});
launcher.onclick=()=>dialog('jump',S.selId?{kind:'entity',id:S.selId}:null);
panel.addEventListener('click',event=>{if(event.target===panel)panel.hidden=true});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)panel.hidden=true});
window.AvronNav={open,dialog,link,unlink,outgoing,all,item,valid,audit,create,mark:touched,state};
window.addEventListener('avron-world-loaded',()=>{panel.hidden=true;updateObjectBar()});window.addEventListener('avron-mode-changed',updateObjectBar);
setTimeout(updateObjectBar,300);
})();
