/* Avron VIII — one data-driven navigation registry; legacy targets remain authoritative. */
(()=>{'use strict';
const top=document.createElement('nav');top.id='avSlotNav';top.setAttribute('aria-label','Разделы мира');
const bar=document.querySelector('.topbar');bar?.insertBefore(top,bar.querySelector('.toolbar'));
const fileActions=document.createElement('div');fileActions.id='avCompactFiles';fileActions.className='only-edit';fileActions.innerHTML='<button id="avFilesToggle" title="Управление миром">⚙ <span>Файлы</span></button><div id="avFilesPanel" hidden><button data-file="export">↓ Экспорт JSON мира</button><button data-file="import">↑ Импорт JSON мира</button><button data-file="new">＋ Новый мир</button></div>';bar?.append(fileActions);fileActions.querySelector('#avFilesToggle').onclick=()=>{const p=fileActions.querySelector('#avFilesPanel');p.hidden=!p.hidden};fileActions.querySelectorAll('[data-file]').forEach(b=>b.onclick=()=>{fileActions.querySelector('#avFilesPanel').hidden=true;document.getElementById(({export:'btnSave',import:'btnLoad',new:'btnNew'})[b.dataset.file])?.click()});
const map=document.querySelector('.map-area');const dock=document.createElement('nav');dock.id='avSlotDock';dock.setAttribute('aria-label','Быстрые действия');map?.append(dock);
const clean=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const W=()=>window.S?.world||(typeof S!=='undefined'?S.world:null);
const editing=()=>typeof S!=='undefined'&&S.mode==='edit';
const base=[{id:'home',icon:'⌂',name:'Главный зал'},{id:'map',icon:'⌖',name:'Атлас земель'},{id:'encyclopedia',icon:'▤',name:'Хранилище знаний'},{id:'chronicles',icon:'◷',name:'Великая хронология'},{id:'lore',icon:'✧',name:'Атлас связей'},{id:'showcases',icon:'◈',name:'Галерея витрин'},{id:'adventure',icon:'⚔',name:'Приключения'},{id:'relicary',icon:'◆',name:'Реликварий'},{id:'city-explorer',icon:'⌂',name:'Исследование городов'}];
const dockDefaults=['map','chronicles','lore'];
const mapTools=[{id:'tool:zoom-in',icon:'⊕',name:'Увеличить карту'},{id:'tool:zoom-out',icon:'⊖',name:'Уменьшить карту'},{id:'tool:fit',icon:'⛶',name:'Вписать карту'},{id:'tool:library',icon:'▤',name:'Библиотека карты'}];
let configuring='';
function registry(){let a=[...base,...mapTools];const w=W();if(!w)return a;
 for(const sec of w.sections||[])if(sec.id!=='pantheon'&&!w.showcases?.some(v=>v.source==='section'&&v.sectionId===sec.id))a.push({id:'section:'+sec.id,icon:sec.icon||'▤',name:sec.name||'Раздел'});
 for(const b of w.chronicleBooks||[])a.push({id:'book:'+b.id,icon:b.icon||'◷',name:b.name||'Летописи'});
 for(const v of w.showcases||[])a.push({id:'showcase:'+v.id,icon:v.icon||'✧',name:v.name||'Витрина'});
 return a;
}
function order(key,defaults){const w=W();if(!w)return defaults;w.interfaceSlots||={};if(!Array.isArray(w.interfaceSlots[key]))w.interfaceSlots[key]=defaults.slice();return w.interfaceSlots[key];}
function change(){if(typeof S!=='undefined')S.unsaved=true;try{window.scheduleSave?.()}catch{}window.dispatchEvent(new CustomEvent('avron-nav-updated'));render()}
function go(id){if(id.startsWith('tool:')){const selectors={'tool:zoom-in':['#zoomIn','#btnZoomIn','[data-action=zoom-in]'],'tool:zoom-out':['#zoomOut','#btnZoomOut','[data-action=zoom-out]'],'tool:fit':['#btnFit','#fitMap','[data-action=fit]'],'tool:library':['#tabLibBtn','[data-tab=lib]','#btnLib']};const el=(selectors[id]||[]).map(q=>document.querySelector(q)).find(Boolean);if(el){el.click();return;}if(id==='tool:library'){document.querySelector('#tabLib')?.removeAttribute('hidden');return;}window.alert('Этот инструмент недоступен в текущем разделе');return;}if(id==='home')return window.AvronHub?.show();
 if(id==='map')return window.AvronHub?.enter('map');if(id==='encyclopedia')return window.AvronHub?.enter('encyclopedia');
 if(id==='chronicles')return window.AvronHub?.enter('chronicles');if(id==='pantheon')return window.AvronHub?.enter('pantheon');
 if(id==='relicary')return window.AvronRelicary?.open();if(id==='city-explorer')return window.AvronNav?.open({kind:'node',id:'city-amena'}) || window.AvronExplorer?.open('city-amena');if(id==='showcases')return window.AvronHub?.enter('showcase');if(id==='adventure')return window.AvronAdventures?.open();if(id==='lore')return document.querySelector('#avronLoreNav')?.click();
 if(id.startsWith('book:'))return window.AvronNav?.open({kind:'book',id:id.slice(5)}) || window.AvronWorldStudio?.openBook(id.slice(5));
 if(id.startsWith('showcase:'))return window.AvronNav?.open({kind:'showcase',id:id.slice(9)}) || window.AvronShowcase?.open(id.slice(9))
 if(id.startsWith('section:')){window.AvronHub?.enter('map');if(typeof openSection==='function')openSection(id.slice(8));}
}
function slotButton(r){const b=document.createElement('button');b.type='button';b.className='av-slot';b.dataset.slotId=r.id;b.title=r.name;b.innerHTML='<span class="av-slot-icon">'+clean(r.icon)+'</span><span class="av-slot-caption">'+clean(r.name)+'</span>';b.onclick=()=>configuring?editSlot(r.id):go(r.id);return b}
function editSlot(id){if(!editing())return;const target=configuring;const orderArr=order(target,target==='top'?base.map(x=>x.id):dockDefaults);const position=orderArr.indexOf(id);const action=prompt('Слот «'+(registry().find(x=>x.id===id)?.name||id)+'»: укажи ↑, ↓, удалить или отмени','↑');if(!action)return;if(action==='удалить'){if(position>=0){orderArr.splice(position,1);if(target==='top'){W().interfaceSlots.hiddenTop||=[];if(!W().interfaceSlots.hiddenTop.includes(id))W().interfaceSlots.hiddenTop.push(id)}}}else{const d=action==='↑'?-1:action==='↓'?1:0;const other=position+d;if(position>=0&&other>=0&&other<orderArr.length){[orderArr[position],orderArr[other]]=[orderArr[other],orderArr[position]]}}change()}
function configButton(where){const b=document.createElement('button');b.className='av-slot-manage only-edit';b.textContent=configuring===where?'✓ Готово':'⚙';b.title='Настроить '+(where==='top'?'разделы':'нижнюю панель');b.onclick=()=>{configuring=configuring===where?'':where;render()};return b}
function chooseSlot(where){
 document.getElementById('av28Chooser')?.remove();
 const el=document.createElement('section');el.id='av28Chooser';el.innerHTML='<div class="av28-picker" role="dialog" aria-modal="true" aria-label="Добавить раздел"><header><h2>Добавить в '+(where==='top'?'верхнее меню':'нижний док')+'</h2><button data-close>✕</button></header><input type="search" placeholder="Найти раздел, витрину или инструмент…" aria-label="Поиск разделов"><div class="av28-options"></div><footer>Выбери нужный раздел. Список обновляется из JSON мира.</footer></div>';
 document.body.append(el);const search=el.querySelector('input'),items=el.querySelector('.av28-options');
 const draw=()=>{const q=search.value.toLocaleLowerCase('ru');items.replaceChildren();for(const r of registry().filter(r=>!order(where,[]).includes(r.id)&&r.name.toLocaleLowerCase('ru').includes(q))){const b=document.createElement('button');b.type='button';b.className='av28-option';b.textContent=r.icon+'  '+r.name;b.addEventListener('click',()=>{order(where,[]).push(r.id);el.remove();change()});items.append(b)}if(!items.childNodes.length)items.textContent='Подходящих элементов нет';};
 search.addEventListener('input',draw);el.querySelector('[data-close]').onclick=()=>el.remove();el.addEventListener('click',e=>{if(e.target===el)el.remove()});draw();search.focus();
}
function addButton(where){const b=document.createElement('button');b.className='av-slot av-slot-empty';b.type='button';b.innerHTML='<span class="av-slot-icon">＋</span><span class="av-slot-caption">Добавить раздел</span>';b.onclick=()=>{if(editing())chooseSlot(where)};return b}
function render(){const w=W();if(!w)return;const reg=registry(), ids=new Set(reg.map(r=>r.id));const topOrder=order('top',base.map(x=>x.id));const dockOrder=order('dock',dockDefaults);
 // Automatically register newly created showcase and author sections in the top navigation.
 for(const r of reg)if((r.id.startsWith('showcase:')||r.id.startsWith('section:')||r.id.startsWith('book:'))&&!topOrder.includes(r.id)&&!(w.interfaceSlots.hiddenTop||[]).includes(r.id))topOrder.push(r.id);
 for(const [el,arr,where] of [[top,topOrder,'top'],[dock,dockOrder,'dock']]){el.replaceChildren();el.classList.toggle('av-configuring',configuring===where);for(const id of arr){if(!ids.has(id))continue;const r=reg.find(x=>x.id===id);el.append(slotButton(r))}if(editing()){el.append(addButton(where),configButton(where))}}
 document.body.classList.toggle('av-is-editor',editing());
}
window.AvronSlots={render,go,registry,change};
addEventListener('avron-world-loaded',render);addEventListener('avron-showcase-updated',render);addEventListener('avron-mode-changed',render);addEventListener('avron-nav-updated',render);document.getElementById('addSectionNav')?.addEventListener('click',()=>setTimeout(render,20));
new MutationObserver(()=>{const now=editing();if(document.body.classList.contains('av-is-editor')!==now)render()}).observe(document.body,{attributes:true,attributeFilter:['class']});
setTimeout(render,350);
})();
