'use strict';

/* ===== мелкие помощники ===== */
function el(tag, props, ...kids) {
  const n = document.createElement(tag); let val;
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') n.className = v;
    else if (k === 'style') n.style.cssText = v;
    else if (k === 'value') val = v;
    else if (k === 'checked') n.checked = !!v;
    else if (k === 'disabled') n.disabled = !!v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const c of kids.flat(9)) { if (c == null || c === false) continue; n.append(c.nodeType ? c : document.createTextNode(c)); }
  if (val !== undefined) n.value = val;
  return n;
}
const btn = (text, fn, cls) => el('button', { class: cls || '', onclick: fn }, text);
const row = (lab, ctl) => el('label', { class: 'field' }, el('span', { class: 'fl' }, lab), ctl);
function setStatus(t) { $('status').textContent = t; }
function renderStatus() { setStatus(S.saveError || (S.unsaved ? '● Есть изменения · сохранение в локальную базу…' : 'Состояние сохранено в браузере')); }
let saveT, previewAudio = null;
S.screen = 'map'; S.activeSectionId = 'pantheon'; S.activeEntryId = null; S.popupEntityId = null;
function scheduleSave(){clearTimeout(saveT);S.unsaved=true;saveT=setTimeout(async()=>{try{if(window.AvronPersistence){await window.AvronPersistence.save(S.world);}else{localStorage.setItem(LS_KEY,JSON.stringify(S.world));S.unsaved=false;S.saveError='';}}catch(e){S.saveError='Не удалось сохранить: '+e.message+'; экспортируйте JSON';}renderStatus();},350)}

/* ===== изменение данных ===== */
function changed(o = {}) {
  window.AvronFinder?.invalidate?.();reindex(); S.unsaved = true;
  if (o.select !== undefined) S.selId = o.select;
  if (S.selId && !ent(S.selId)) S.selId = null;
  if (SC && SC.ready) SC.refresh();
  renderMapTree(); renderFilters(); renderLib(); renderFloat();
  if (!o.keep) renderObject();
  renderStatus(); scheduleSave();
}
const edit = fn => { fn(); changed({ keep: true }); };
function syncPos(e) { if (e.id !== S.selId) return; const a = $('inX'), b = $('inY'); if (a) a.value = e.x; if (b) b.value = e.y; }

function selectEntity(id, o = {}) {
  const e = id ? ent(id) : null;
  if (e && e.mapId !== S.mapId) {
    S.selId = e.id; SC.openMap(e.mapId, { focusId: e.id });
    renderMapTree(); renderMapProps(); renderTop(); renderFilters();
  } else {
    S.selId = e ? e.id : null; SC.refresh(); if (e && o.center) SC.focus(e);
  }
  renderObject(); renderLib(); renderFloat();
  if (e) window.AvronHistory?.record?.({kind:'entity',id:e.id});
  if (e && o.tab !== false && S.tab !== 'types') setTab('object');
  if (e && S.mode === 'read' && o.autoplay !== false && window.AvronTimeline?.findEventByEntity?.(e.id)) {
    setTimeout(() => { if (S.mode === 'read' && ent(e.id) === e) window.AvronTimeline.openEventByEntity(e.id); }, 0);
  }
}
function finishPick(id) {
  const p = S.pick; S.pick = null;
  if (p && id !== p.from && !S.world.relations.some(r => r.from === p.from && r.to === id && r.typeId === p.typeId))
    (window.AvronMaterials?.relate?.(p.from,id,p.typeId)||S.world.relations.push({ id: uid(), from: p.from, to: id, typeId: p.typeId, note: '' }));
  changed({});
}
function deleteSelected() {
  const e = ent(S.selId); if (!e) return;
  if (!confirm('Удалить «' + label(e) + '» и её связи?')) return;
  if(!window.AvronMaterials?.remove?.('entity:'+e.id))removeEntity(e.id); changed({ select: null });
}

/* ===== карты ===== */
function gotoMap(id, o = {}) {
  if (!mapOf(id)) return;
  const sel = ent(S.selId); if (sel && sel.mapId !== id) S.selId = null;
  S.pick = null; SC.openMap(id, o);
  renderMapTree(); renderMapProps(); renderTop(); renderFilters(); renderObject(); renderFloat();
}
function afterMapOpen() {
  renderMapProps(); renderTop();
  const m = mapOf(S.mapId);
  if (S.missing[m.id]) setStatus('Файл карты «' + m.src + '» не найден — показан пустой холст. Положите файл по этому пути или загрузите изображение.');
}
function renderTop() {
  const c = $('crumbs'); c.textContent = '';
  const ch = mapChain(S.mapId);
  ch.forEach((m, i) => { if (i) c.append(el('span', { class: 'sep' }, '›')); c.append(el('a', { class: 'crumb' + (i === ch.length - 1 ? ' cur' : ''), onclick: () => gotoMap(m.id) }, m.name)); });
  $('modeEdit').classList.toggle('on', S.mode === 'edit'); $('modeRead').classList.toggle('on', S.mode === 'read');
  $('hintInfo').textContent = S.mode === 'edit' ? 'Колесо — масштаб · ПКМ или Space+drag — двигать карту' : 'Нажмите область или метку · колесо — масштаб';
}
function renderMapTree() {
  const box = $('mapTree'); box.textContent = '';
  const walk = (pid, d) => S.world.maps.filter(m => (m.parentId || '') === pid).forEach(m => {
    const n = S.world.entities.filter(e => e.mapId === m.id).length;
    box.append(el('div', { class: 'map-row' + (m.id === S.mapId ? ' active' : ''), style: 'padding-left:' + (8 + d * 14) + 'px', onclick: () => gotoMap(m.id) },
      el('span', { class: 'map-name' }, (d ? '└ ' : '') + m.name), el('span', { class: 'cnt' }, n)));
    walk(m.id, d + 1);
  });
  walk('', 0);
}
function renderMapProps() {
  const m = mapOf(S.mapId), box = $('mapProps'); box.textContent = ''; if (!m) return;
  const bad = descendants(m.id); bad.add(m.id);
  const file = el('input', { type: 'file', accept: 'image/*', hidden: true, onchange: ev => {
    const f = ev.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      S.uploads[m.id] = String(reader.result); m.src = String(reader.result); m.assetName = f.name;
      S.rev[m.id] = (S.rev[m.id] || 0) + 1; S.unsaved = true;
      scheduleSave(); SC.openMap(m.id, { refit: true });
      setStatus('Изображение встроено в проект: ' + f.name + '. Сохраните JSON как резервную копию.');
    };
    reader.onerror = () => setStatus('Не удалось прочитать файл изображения.');
    reader.readAsDataURL(f);
  } });
  box.append(
    row('Название', el('input', { class: 'inp', value: m.name, oninput: ev => { m.name = ev.target.value; S.unsaved = true; renderMapTree(); renderTop(); scheduleSave(); },
      onchange: () => { if (!m.src && !S.uploads[m.id]) { S.rev[m.id] = (S.rev[m.id] || 0) + 1; SC.openMap(m.id); } } })),
    row('Родительская карта', el('select', { class: 'inp', value: m.parentId || '', onchange: ev => { m.parentId = ev.target.value; changed({ keep: true }); renderTop(); } },
      el('option', { value: '' }, '— корень —'), S.world.maps.filter(x => !bad.has(x.id)).map(x => el('option', { value: x.id }, x.name)))),
    row('Ширина холста', el('input', { class: 'inp', type: 'number', min: '100', max: '50000', value: m.width, onchange: ev => { m.width = Math.max(100, Math.min(50000, Number(ev.target.value) || 2048)); changed({ keep: true }); SC.openMap(m.id, { refit: true }); } })),
    row('Высота холста', el('input', { class: 'inp', type: 'number', min: '100', max: '50000', value: m.height, onchange: ev => { m.height = Math.max(100, Math.min(50000, Number(ev.target.value) || 1536)); changed({ keep: true }); SC.openMap(m.id, { refit: true }); } })),
    el('div', { class: 'mini-info' + (S.missing[m.id] ? ' warn' : '') }, (m.assetName || m.src || 'без изображения') + ' · ' + m.width + '×' + m.height + (S.missing[m.id] ? ' · файл не найден' : '')),
    el('div', { class: 'btn-row' }, btn('Загрузить изображение', () => file.click()), file, S.world.maps.length > 1 ? btn('Удалить', deleteMap, 'danger') : null)
  );
}
function addMap() {
  const name = prompt('Название новой карты (дочерняя к «' + mapOf(S.mapId).name + '»)', 'Новая карта'); if (!name || !name.trim()) return;
  const parent = mapOf(S.mapId);
  const m = { id: uid(), name: name.trim(), src: '', width: parent?.width || 2048, height: parent?.height || 1536, parentId: S.mapId };
  S.world.maps.push(m); changed({ keep: true }); gotoMap(m.id);
}
function deleteMap() {
  const m = mapOf(S.mapId); if (!m || S.world.maps.length < 2) return;
  const n = S.world.entities.filter(e => e.mapId === m.id).length;
  if (!confirm('Удалить карту «' + m.name + '» вместе с ' + n + ' объектами?')) return;
  const next = m.parentId || S.world.maps.find(x => x.id !== m.id).id;
  S.world.entities.filter(e => e.mapId === m.id).forEach(e => removeEntity(e.id));
  S.world.entities.forEach(e => { if (e.linkMapId === m.id) e.linkMapId = ''; });
  S.world.maps.forEach(x => { if (x.parentId === m.id) x.parentId = m.parentId || ''; });
  S.world.maps = S.world.maps.filter(x => x.id !== m.id);
  reindex(); gotoMap(next); changed({});
}

/* ===== инструменты и фильтры ===== */
function renderTools() {
  const g = $('toolGrid'); g.textContent = '';
  const tb = (id, glyph, name, col, sub) => el('button', { class: 'tool' + (S.tool === id ? ' active' : ''), onclick: () => { if (SC) SC.cancelDraft(); S.pick = null; S.tool = id; renderTools(); renderFloat(); SC.refresh(); } },
    el('b', { style: 'color:' + col }, glyph), el('span', {}, name), sub ? el('i', {}, sub) : null);
  g.append(tb('select', '↖', 'Выбор', '#d6b56c'));
  S.world.types.forEach(t => g.append(tb(t.id, t.glyph, t.name, t.color, t.geometry === 'area' ? 'область' : t.quick ? 'заметка' : '')));
  const t = S.tix.get(S.tool);
  $('toolHint').textContent = !t
    ? 'Клик — выбрать, перетаскивание — двигать. Пустое место — двигать карту. У выбранной области: тянуть вершины, Shift+drag — двигать целиком, Alt+клик по вершине — удалить.'
    : t.geometry === 'area' ? 'Клик — вершина, двойной клик / Enter / клик по первой точке — завершить. Backspace — убрать точку, Esc — отмена.'
    : 'Клик по карте — поставить «' + t.name + '». Esc — вернуться к выбору.';
}
function renderFilters() {
  const box = $('typeFilters'); box.textContent = '';
  if (S.q) box.append(el('div', { class: 'qbadge' }, el('span', {}, 'Поиск: «' + S.q + '»'),
    el('button', { class: 'x', title: 'Сбросить поиск', onclick: () => { S.q = ''; $('q').value = ''; SC.refresh(); renderLib(); renderFilters(); } }, '×')));
  S.world.types.forEach(t => {
    const n = S.world.entities.filter(e => e.mapId === S.mapId && e.typeId === t.id).length, on = !S.hiddenTypes.has(t.id);
    box.append(el('label', { class: 'chip' + (on ? ' on' : '') },
      el('input', { type: 'checkbox', checked: on, onchange: ev => { ev.target.checked ? S.hiddenTypes.delete(t.id) : S.hiddenTypes.add(t.id); SC.refresh(); renderFilters(); renderLib(); } }),
      el('span', { class: 'dot', style: 'background:' + t.color }), t.name, el('span', { class: 'cnt' }, n)));
  });
}
function renderFloat() {
  const f = $('floatBar'); f.textContent = ''; let show = true;
  const e = ent(S.selId);
  if (S.pick) f.append('Выберите на карте объект для связи', btn('Отмена', () => { S.pick = null; renderFloat(); }));
  else if (SC && SC.draft) f.append('Область: ' + SC.draft.pts.length + ' верш.', btn('Завершить', () => SC.finishDraft(), 'primary'), btn('Убрать точку', () => SC.undoDraftPoint()), btn('Отмена', () => SC.cancelDraft()));
  else if (e && e.linkMapId && mapOf(e.linkMapId)) f.append(btn('Перейти на карту «' + mapOf(e.linkMapId).name + '» →', () => gotoMap(e.linkMapId), 'primary'));
  else show = false;
  f.style.display = show ? 'flex' : 'none';
}

/* ===== правая панель ===== */
function setTab(t) {
  S.tab = t;
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $('tabObject').hidden = t !== 'object'; $('tabLib').hidden = t !== 'lib'; $('tabTypes').hidden = t !== 'types';
  if (t === 'types') renderTypes(); if (t === 'lib') renderLib();
}
function renderObject() {
  if(S.mode==='edit' && S.popupEntityId){ closeMapPopup(S.popupEntityId); }
  const box = $('tabObject'); box.textContent = '';
  if (S.mode === 'read') box.append(readCard(ent(S.selId)));
  else { const e=ent(S.selId); if(!e) box.append(editForm(null)); else { const fold=el('details',{class:'editor-fold object-editor-fold',open:true},el('summary',{},'Поля объекта · '+label(e)),editForm(e)); box.append(fold); } }
  const entity=ent(S.selId);
  if(entity){
    const linked=(S.world.chronicles||[]).filter(c=>(c.entityIds||[]).includes(entity.id));
    if(linked.length){
      const group=el('div',{class:'chronicle-object-links'},el('h3',{},'✧ Летописи объекта'));
      linked.forEach(c=>group.append(btn('▶ '+c.name,()=>window.PantheonStartCinematic?.(c),'mini')));
      box.append(group);
    }
  }
}

function bind(e, key, o = {}) {
  const h = ev => edit(() => { e[key] = ev.target.value; });
  return o.area ? el('textarea', { class: 'inp', rows: o.rows || 3, value: e[key] || '', oninput: h }) : el('input', { class: 'inp', value: e[key] || '', oninput: h });
}
function fieldCtl(e, f) {
  const v = e.fields[f.id], set = val => edit(() => { e.fields[f.id] = val; });
  if (f.kind === 'longtext') return el('textarea', { class: 'inp', rows: 3, value: v || '', oninput: ev => set(ev.target.value) });
  if (f.kind === 'number') return el('input', { class: 'inp', type: 'number', value: v ?? '', oninput: ev => set(ev.target.value === '' ? '' : Number(ev.target.value)) });
  if (f.kind === 'select') return el('select', { class: 'inp', value: v || '', onchange: ev => set(ev.target.value) }, el('option', { value: '' }, '—'), (f.options || []).map(o => el('option', { value: o }, o)));
  if (f.kind === 'checkbox') return el('span', { class: 'check' }, el('input', { type: 'checkbox', checked: !!v, onchange: ev => set(ev.target.checked) }), ' да');
  return el('input', { class: 'inp', value: v || '', oninput: ev => set(ev.target.value) });
}

function editForm(e) {
  if (!e) return el('div', { class: 'empty' }, el('div', { class: 'big' }, '⌖'), el('b', {}, 'Ничего не выбрано'), el('p', {}, 'Выберите метку или область. Новые создаются инструментами слева — типы настраиваются во вкладке «Типы».'));
  const t = typeOf(e), box = el('div', { class: 'form' });
  box.append(
    row('Тип', el('select', { class: 'inp', value: e.typeId, onchange: ev => { e.typeId = ev.target.value; changed({}); } },
      S.world.types.filter(x => x.geometry === t.geometry).map(x => el('option', { value: x.id }, x.name)))));
  if (!t.quick) box.append(row('Название', bind(e, 'name')));
  box.append(row(t.quick ? 'Текст заметки' : 'Кратко (подсказка на карте)', bind(e, 'summary', { area: true, rows: t.quick ? 3 : 2 })));
  if (!t.quick) box.append(el('div',{class:'btn-row'},btn('Статья',()=>{
    S.world.articles ||= [];
    let a=(S.world.articles||[]).find(x=>x.id===e.articleId);
    if(!a){a=window.AvronMaterials?.create?.('article',{title:e.name||'Новая статья',parents:['entity:'+e.id]});if(!a)return;e.articleId=a.id;}
    S.openArticleId=a.id; changed({keep:true}); if(window.AvronArticleStudio?.open)window.AvronArticleStudio.open(a.id);else{switchScreen('encyclopedia');renderLib();}
  },'primary'),el('span',{class:'mini-info'},'Создать или открыть статью в библиотеке')));
  if (t.fields.length) { box.append(el('div', { class: 'sub' }, 'Поля типа «' + t.name + '»')); t.fields.forEach(f => box.append(row(f.label || '(без названия)', fieldCtl(e, f)))); }
  box.append(row('Теги (через запятую)', el('input', { class: 'inp', value: e.tags.join(', '), oninput: ev => edit(() => { e.tags = ev.target.value.split(',').map(s => s.trim()).filter(Boolean); }) })));
  if (geo(e) === 'point') {
    box.append(el('div', { class: 'two' },
      row('X', el('input', { class: 'inp', id: 'inX', type: 'number', value: e.x, oninput: ev => edit(() => { e.x = Math.round(Number(ev.target.value) || 0); }) })),
      row('Y', el('input', { class: 'inp', id: 'inY', type: 'number', value: e.y, oninput: ev => edit(() => { e.y = Math.round(Number(ev.target.value) || 0); }) }))));
  } else box.append(el('div', { class: 'mini-info' }, 'Вершин: ' + e.points.length + ' · тяните вершины на карте, Shift+drag — двигать область'));
  box.append(
    row('Цвет объекта / региона', el('div', { class: 'btn-row' }, el('input', { class: 'inp color', type: 'color', value: e.color || t.color, oninput: ev => edit(() => { e.color = ev.target.value; }) }), e.color ? btn('Цвет типа', () => edit(() => { delete e.color; }), 'mini') : null)),
    row('Ведёт на карту', el('select', { class: 'inp', value: e.linkMapId || '', onchange: ev => { e.linkMapId = ev.target.value; changed({}); } },
      el('option', { value: '' }, '— нет —'), S.world.maps.filter(m => m.id !== e.mapId).map(m => el('option', { value: m.id }, m.name)))),
    row('Изображение (URL или путь)', bind(e, 'image')),
    (() => { const file = el('input', { type: 'file', accept: 'image/*', hidden: true, onchange: ev => { const f = ev.target.files[0]; ev.target.value = ''; if (!f) return; const r = new FileReader(); r.onload = () => edit(() => { e.image = String(r.result); e.imageName = f.name; }); r.readAsDataURL(f); } }); return el('div', { class: 'btn-row' }, btn('Выбрать изображение…', () => file.click()), file, e.image ? btn('Убрать изображение', () => edit(() => { e.image = ''; e.imageName = ''; }), 'mini') : null); })(),
    row('Масштаб значка', el('select', { class: 'inp', value: e.fixedScale ? 'fixed' : 'map', onchange: ev => edit(() => { e.fixedScale = ev.target.value === 'fixed'; }) }, el('option', { value: 'map' }, 'Следует масштабу карты'), el('option', { value: 'fixed' }, 'Фиксированный экранный размер'))),
    row('Форма значка', el('select', { class: 'inp', value: e.markerShape || 'circle', onchange: ev => edit(() => { e.markerShape = ev.target.value; }) }, el('option', { value: 'circle' }, 'В круге'), el('option', { value: 'plain' }, 'Без круга'))),
    row('Прозрачность', el('input', { class: 'inp', type: 'range', min: '0', max: '1', step: '0.05', value: e.opacity ?? 1, oninput: ev => edit(() => { e.opacity = Number(ev.target.value); }) })),
    el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: !!e.hideLabel, onchange: ev => edit(() => { e.hideLabel = ev.target.checked; }) }), ' Не показывать подпись на карте'),
    el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: e.secret, onchange: ev => edit(() => { e.secret = ev.target.checked; }) }), ' Секрет — скрыт в просмотре, пока не открыт'),
    el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: e.draft, onchange: ev => edit(() => { e.draft = ev.target.checked; }) }), ' Черновик — не показывать в просмотре'),
    popupEditor(e),
    relSection(e),
    el('div', { class: 'btn-row' }, btn('Дублировать', () => {
      const c = clone(e); c.id = uid(); if (c.name) c.name += ' — копия'; if (geo(e) === 'point') { c.x += 30; c.y += 30; } else c.points = c.points.map(q => [q[0] + 40, q[1] + 40]);
      if(!window.AvronMaterials?.adopt?.('entity',c))S.world.entities.push(c); changed({ select: c.id });
    }), btn('Удалить', deleteSelected, 'danger')));
  return box;
}


function popupEditor(e) {
  e.popup ||= { enabled: false, orientation: 'landscape', width: 500, height: 500, blocks: [] };
  const p = e.popup; p.blocks ||= [];
  const details = el('details', { class: 'editor-fold', open: !!p.editorOpen },
    el('summary', {}, 'Pop-up / мини-канвас'),
    el('p', { class: 'mini-info' }, 'Соберите карточку из текстовых и графических блоков. Координаты задаются внутри холста.'),
    el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: !!p.enabled, onchange: ev => edit(() => { p.enabled = ev.target.checked; if (!p.enabled) closeMapPopup(); }) }), ' Показывать рядом с объектом при клике'),
    row('Ориентация', el('select', { class: 'inp', value: p.orientation || 'landscape', onchange: ev => edit(() => { p.orientation = ev.target.value; p.width = ev.target.value === 'portrait' ? Math.min(p.width || 500, 380) : Math.max(p.width || 500, 500); }) }, el('option', { value: 'landscape' }, 'Альбомная'), el('option', { value: 'portrait' }, 'Книжная'))),
    el('div', { class: 'two' }, row('Приоритет (меньше = раньше)', el('input',{class:'inp',type:'number',value:p.priority??0,onchange:ev=>edit(()=>{p.priority=Number(ev.target.value)||0;})})), row('Ширина', el('input', { class: 'inp', type: 'number', min: 240, max: 1400, value: p.width || 500, onchange: ev => edit(() => { p.width = clamp(Number(ev.target.value)||500,240,1400); }) })), row('Высота', el('input', { class: 'inp', type: 'number', min: 240, max: 1800, value: p.height || 500, onchange: ev => edit(() => { p.height = clamp(Number(ev.target.value)||500,240,1800); }) }))),
    el('div', { class: 'btn-row' }, btn('＋ Текст', () => { p.blocks.push({ id: uid(), type: 'text', x: 20, y: 20, w: Math.max(100,(p.width||500)-40), h: 100, text: 'Новый текст', size: 16 }); changed({ keep: true }); renderObject(); }), btn('＋ Картинка', () => { p.blocks.push({ id: uid(), type: 'image', x: 20, y: 130, w: 180, h: 140, src: '' }); changed({ keep: true }); renderObject(); })),
    el('div', { class: 'popup-block-list' }, p.blocks.map((b, i) => popupBlockEditor(e, b, i))),
    el('div',{class:'sub'},'Кнопка «Перейти» (необязательно)'),
    el('label',{class:'check'},el('input',{type:'checkbox',checked:!!p.transitionEnabled,onchange:ev=>edit(()=>{p.transitionEnabled=ev.target.checked;})}),' Показывать кнопку'),
    row('Вложенная карта',el('select',{class:'inp',value:p.transitionMapId||'',onchange:ev=>edit(()=>{p.transitionMapId=ev.target.value;})},el('option',{value:''},'— нет —'),S.world.maps.filter(m=>m.id!==e.mapId).map(m=>el('option',{value:m.id},m.name)))),
    row('Статья',el('select',{class:'inp',value:p.transitionArticleId||'',onchange:ev=>edit(()=>{p.transitionArticleId=ev.target.value;})},el('option',{value:''},'— нет —'),(S.world.articles||[]).map(a=>el('option',{value:a.id},a.title||'Без названия')))),
    el('div', { class: 'btn-row' }, btn('✦ Визуальный редактор Pop-up', () => openPopupCanvasEditor(e.id), 'primary'), btn('Предпросмотр на карте', () => {const was=S.mode;closeMapPopup(e.id); if(was==='edit') alert('Для просмотра Pop-up переключитесь в режим Просмотр. Редактор объекта при этом останется доступен.'); else showMapPopup(e.id);}, 'mini'))
  );
  details.addEventListener('toggle', () => { p.editorOpen = details.open; scheduleSave(); });
  return details;
}
function popupBlockEditor(e, b, i) {
  const p = e.popup;
  const controls = [row('Блок ' + (i+1), el('select', { class: 'inp', value: b.type, onchange: ev => edit(() => { b.type = ev.target.value; }) }, el('option',{value:'text'},'Текст'),el('option',{value:'image'},'Картинка'))),
    el('div',{class:'two'},row('X',el('input',{class:'inp',type:'number',value:b.x||0,onchange:ev=>edit(()=>{b.x=Number(ev.target.value)||0;})})),row('Y',el('input',{class:'inp',type:'number',value:b.y||0,onchange:ev=>edit(()=>{b.y=Number(ev.target.value)||0;})}))),
    el('div',{class:'two'},row('Ширина',el('input',{class:'inp',type:'number',min:20,value:b.w||180,onchange:ev=>edit(()=>{b.w=clamp(Number(ev.target.value)||180,20,1400);})})),row('Высота',el('input',{class:'inp',type:'number',min:20,value:b.h||100,onchange:ev=>edit(()=>{b.h=clamp(Number(ev.target.value)||100,20,1800);})})))];
  if (b.type === 'text') controls.push(row('Текст (Markdown)',el('textarea',{class:'inp',rows:3,value:b.text||'',oninput:ev=>edit(()=>{b.text=ev.target.value;})})),row('Размер текста',el('input',{class:'inp',type:'number',min:8,max:72,value:b.size||16,onchange:ev=>edit(()=>{b.size=clamp(Number(ev.target.value)||16,8,72);})})));
  else { for(const [key,label] of [['imageX','Смещение арта X, %'],['imageY','Смещение арта Y, %']])controls.push(row(label,el('input',{class:'inp',type:'number',min:0,max:100,value:b[key]??50,onchange:ev=>edit(()=>{b[key]=Math.max(0,Math.min(100,Number(ev.target.value)||0));})})));
      const file=el('input',{type:'file',accept:'image/*',hidden:true,onchange:ev=>{const f=ev.target.files[0];ev.target.value='';if(!f)return;const r=new FileReader();r.onload=()=>edit(()=>{b.src=String(r.result);b.fileName=f.name;});r.readAsDataURL(f);}}); controls.push(el('div',{class:'btn-row'},btn(b.fileName||'Выбрать изображение…',()=>file.click()),file)); if(b.src) controls.push(el('div',{class:'btn-row'},btn('Вписать в ширину блока',()=>edit(()=>{const im=new Image();im.onload=()=>{b.h=Math.max(20,Math.round((b.w||180)*im.naturalHeight/im.naturalWidth));changed({keep:true});renderObject();};im.src=b.src;}),'mini')),el('img',{src:b.src,class:'popup-thumb'})); }
  controls.push(btn('Удалить блок',()=>{p.blocks=p.blocks.filter(x=>x!==b);changed({keep:true});renderObject();},'danger mini'));
  return el('div',{class:'popup-block-editor'},...controls);
}
/* Unified visual popup canvas: same entity.popup.blocks as the legacy numeric editor. */
function openPopupCanvasEditor(id) {
  const entity = ent(id); if (!entity || S.mode !== 'edit') return;
  entity.popup ||= { enabled: true, orientation: 'landscape', width: 500, height: 500, blocks: [] };
  const p = entity.popup; p.kind ||= p.sceneEnabled ? 'scene' : 'article';
  const previous = document.getElementById('avPopupDesigner'); previous?.remove();
  const shell = el('div', { id: 'avPopupDesigner', class: 'av-popup-designer' });
  const workspace = el('div', { class: 'av-popup-workspace' });
  const canvas = el('div', { class: 'av-popup-artboard' });
  const inspector = el('aside', { class: 'av-popup-inspector' });
  const heading = el('header', { class: 'av-popup-designer-head' },
    el('div', {}, el('small', {}, 'AVRON ATELIER / КОНСТРУКТОР'), el('h2', {}, 'Pop-up · ' + (entity.name || 'Объект'))),
    el('div', { class: 'av-popup-actions' },
      btn('＋ Текст', () => add('text')),
      btn('＋ Заголовок', () => { add('text'); const b=p.blocks.find(x=>x.id===activeId); if(b){b.text='Заголовок';b.size=36;b.bold=true;commit();} }),
      btn('＋ Изображение', () => add('image')),
      btn('◉ Предпросмотр', () => { p.enabled = true; changed({keep:true});closeMapPopup(id);showMapPopup(id); }),
      btn('✓ Готово', () => { changed(); shell.remove(); }, 'primary')));
  shell.append(heading, el('div', { class: 'av-popup-designer-body' }, workspace, inspector));
  document.body.append(shell);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let activeId = p.blocks[0]?.id || null;
  function commit() { p.enabled = true; changed({keep:true}); draw(); }
  function add(type) { const b = {id:uid(),type,x:24,y:24,w:type==='image'?220:320,h:type==='image'?160:115};if(type==='text'){b.text='Новый текст';b.size=18}else b.src='';p.blocks.push(b);activeId=b.id;commit(); }
  function draw() {
    canvas.style.width = `${Math.max(240,Number(p.width)||500)}px`;
    canvas.style.height = `${Math.max(240,Number(p.height)||500)}px`;
    canvas.replaceChildren();
    for(const b of p.blocks){
      const piece = el('div', {class:'av-popup-piece'+(activeId===b.id?' selected':''),style:`left:${Number(b.x)||0}px;top:${Number(b.y)||0}px;width:${Number(b.w)||180}px;height:${Number(b.h)||100}px;`});
      if(b.type==='image'){ if(b.src){const image=el('img',{src:b.src,alt:''});image.style.objectPosition=(b.imageX??50)+'% '+(b.imageY??50)+'%';piece.append(image);}else piece.append(el('span',{},'✧ Изображение')); }
      else {const content=el('div',{class:'av-popup-piece-text'});content.textContent=b.text||'Текст';content.style.fontWeight=b.bold?'700':'400';content.style.textAlign=b.align||'left';content.style.color=b.color||'#f7ead2';content.style.fontSize=(b.size||16)+'px';content.style.overflowWrap='anywhere';content.style.lineHeight='1.35';piece.append(content);}
      const grip=el('span',{class:'av-popup-resize','aria-label':'Изменить размер'});
      piece.append(grip);
      piece.addEventListener('pointerdown', ev=>{
        if(ev.button!==0)return;activeId=b.id;drawInspector();
        canvas.querySelectorAll('.av-popup-piece').forEach(x=>x.classList.remove('selected'));piece.classList.add('selected');
        ev.preventDefault();const resize=ev.target===grip;const startX=ev.clientX,startY=ev.clientY;
        const sx=Number(b.x)||0,sy=Number(b.y)||0,sw=Number(b.w)||180,sh=Number(b.h)||100;
        piece.setPointerCapture(ev.pointerId);
        const move=e=>{const dx=e.clientX-startX,dy=e.clientY-startY;
          if(resize){b.w=Math.max(50,Math.round(sw+dx));b.h=Math.max(40,Math.round(sh+dy));piece.style.width=b.w+'px';piece.style.height=b.h+'px';}
          else {b.x=Math.round(sx+dx);b.y=Math.round(sy+dy);piece.style.left=b.x+'px';piece.style.top=b.y+'px';}};
        const up=()=>{piece.removeEventListener('pointermove',move);piece.removeEventListener('pointerup',up);piece.removeEventListener('pointercancel',up);commit();};
        piece.addEventListener('pointermove',move);piece.addEventListener('pointerup',up);piece.addEventListener('pointercancel',up);
      });canvas.append(piece);
    }drawInspector();
  }
  function drawInspector(){
    inspector.replaceChildren(el('h3',{},'Свойства Pop-up'));
    const kind=el('select', {onchange:ev=>{p.kind='article';p.sceneEnabled=false;commit();}},el('option',{value:'article',selected:true},'Статья')); 
    inspector.append(el('label',{class:'av-popup-field'},el('span',{},'Тип Pop-up'),kind));
    if(p.kind==='scene'){p.kind='article';p.sceneEnabled=false;} inspector.append(btn('▤ Открыть связанную летопись',()=>{const id=p.scene?.chronicleId;if(id&&window.AvronWorldStudio?.openBook)window.AvronWorldStudio.openBook(id);else if(id&&window.AvronSlots?.go)window.AvronSlots.go('chronicle:'+id);else alert('Летопись не привязана');}));
    function fieldScene(){if(p.kind!=='scene')return; const sc=p.scene ||= {duration:4,keyframes:[]};inspector.append(el('label',{class:'av-popup-field'},el('span',{},'Название сцены'),el('input',{value:sc.title||entity.name||'',onchange:e=>{sc.title=e.target.value;commit();}})));const books=S.world.chronicleBooks||[]; const chooser=el('select',{onchange:e=>{sc.chronicleId=e.target.value;sc.sceneId=(books.find(b=>b.id===e.target.value)?.scenes||[])[0]?.id||'';commit();}},...books.map(b=>el('option',{value:b.id,selected:sc.chronicleId===b.id},b.name)));inspector.append(el('label',{class:'av-popup-field'},el('span',{},'Летопись / источник сцены'),chooser));const scenes=books.find(b=>b.id===sc.chronicleId)?.scenes||[];inspector.append(el('label',{class:'av-popup-field'},el('span',{},'Сцена'),el('select',{onchange:e=>{sc.sceneId=e.target.value;commit();}},...scenes.map(f=>el('option',{value:f.id,selected:sc.sceneId===f.id},f.title||f.id)))));if(!scenes.length)inspector.append(el('p',{},'В этой летописи нет сцен. Откройте Режиссёр и добавьте кадры.')); }
    const field=(title,input)=>inspector.append(el('label',{class:'av-popup-field'},el('span',{},title),input));
    for(const [key,label] of [['width','Ширина холста'],['height','Высота холста']]){
      field(label,el('input',{type:'number',min:240,max:1400,value:p[key]||500,onchange:ev=>{p[key]=Math.max(240,Math.min(1400,Number(ev.target.value)||500));commit();}}));
    }
    const b=p.blocks.find(x=>x.id===activeId);if(!b)return;
    inspector.append(el('h3',{},'Выбранный блок'));
    for(const [key,label] of [['x','X'],['y','Y'],['w','Ширина'],['h','Высота']]){
      field(label,el('input',{type:'number',value:b[key]||0,onchange:ev=>{b[key]=Number(ev.target.value)||0;commit();}}));
    }
    if(b.type==='text'){
      field('Текст',el('textarea',{rows:6,value:b.text||'',onchange:ev=>{b.text=ev.target.value;commit();}}));
      field('Цвет текста',el('input',{type:'color',value:b.color||'#f7ead2',onchange:ev=>{b.color=ev.target.value;commit();}}));
      field('Выравнивание',el('select',{onchange:ev=>{b.align=ev.target.value;commit();}},...['left','center','right'].map(v=>el('option',{value:v,selected:(b.align||'left')===v},v))));
      field('Жирный',el('input',{type:'checkbox',checked:!!b.bold,onchange:ev=>{b.bold=ev.target.checked;commit();}}));
      field('Размер текста',el('input',{type:'number',min:8,max:72,value:b.size||16,onchange:ev=>{b.size=Math.max(8,Math.min(72,Number(ev.target.value)||16));commit();}}));
    }else{
      for(const [key,label] of [['imageX','Смещение арта X, %'],['imageY','Смещение арта Y, %']])field(label,el('input',{type:'number',min:0,max:100,value:b[key]??50,onchange:ev=>{b[key]=Math.max(0,Math.min(100,Number(ev.target.value)||0));commit();}}));
      const file=el('input',{type:'file',accept:'image/*',onchange:ev=>{const f=ev.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{b.src=String(reader.result);commit()};reader.readAsDataURL(f);}});field('Изображение',file);
    }
    inspector.append(btn('Удалить блок',()=>{p.blocks=p.blocks.filter(x=>x!==b);activeId=p.blocks[0]?.id||null;commit();},'danger'));
  }
  workspace.append(el('div',{class:'av-popup-ruler'},'ПЕРЕТАСКИВАЙТЕ БЛОКИ · МАРКЕР В УГЛУ ИЗМЕНЯЕТ РАЗМЕР'),canvas);
  shell.addEventListener('keydown',e=>{if(e.key==='Escape'){changed();shell.remove();}});
  draw();
}
// Popups live in the DOM overlay, independently of the Phaser camera zoom.
const openPopupIds = [];
let popupFront = 20;
function closeMapPopup(id) {
  const layer = $('mapPopupLayer');
  if (id == null) { openPopupIds.length = 0; if (layer) layer.replaceChildren(); }
  else { const i = openPopupIds.indexOf(id); if (i >= 0) openPopupIds.splice(i, 1); layer?.querySelectorAll('.map-popup').forEach(n => { if (n.dataset.entityId === id) n.remove(); }); }
  S.popupEntityId = openPopupIds.at(-1) || null;
}
function showMapPopup(id) {
  if(S.mode==='edit'){S.selId=id;renderObject();return;}
  const e = ent(id); if (!e?.popup?.enabled) return;
  const existing = $('mapPopupLayer')?.querySelectorAll('.map-popup') || [];
  for (const panel of existing) if (panel.dataset.entityId === id) { panel.style.zIndex = String(++popupFront); return; }
  if (openPopupIds.length >= 10) { setStatus('Можно открыть не более 10 карточек одновременно'); return; }
  openPopupIds.push(id); S.popupEntityId = id;
  renderMapPopup(id);
}
function showAreaChooser(ids) {
  const layer = $('mapPopupLayer'); if (!layer) return;
  layer.querySelector('.area-chooser')?.remove();
  const box = el('div', { class: 'area-chooser' });
  box.append(el('strong', {}, 'Выберите область'));
  ids.map(ent).filter(Boolean).forEach(e => box.append(btn(label(e) + ' · ' + (typeOf(e)?.name || 'Область'), () => {
    box.remove(); if (e.popup?.enabled) showMapPopup(e.id); else { S.selId = e.id; renderAll(); }
  }, 'wide')));
  box.append(btn('Закрыть', () => box.remove(), 'mini')); layer.append(box);
}
function showMapPopups(ids) {
  $('mapPopupLayer')?.querySelector('.area-chooser')?.remove();
  const valid = [...new Set(ids)].map(ent).filter(e => e?.popup?.enabled)
    .sort((a, b) => (Number(a.popup.priority) || 0) - (Number(b.popup.priority) || 0));
  valid.slice(0, 10).forEach((e, i) => {
    showMapPopup(e.id);
    const panel = [...$('mapPopupLayer').querySelectorAll('.map-popup')].find(n => n.dataset.entityId === e.id);
    if (panel && !panel.dataset.dragged) {
      panel.style.left = Math.max(8, Math.min($('mapPopupLayer').clientWidth - panel.offsetWidth - 8, 12 + i * 46)) + 'px';
      panel.style.top = (12 + i * 32) + 'px';
    }
  });
}
function renderMapPopup(id = S.popupEntityId) {
  const layer = $('mapPopupLayer'), e = ent(id);
  if (!layer || !e?.popup || e.mapId !== S.mapId) return;
  const old = [...layer.querySelectorAll('.map-popup')].find(n => n.dataset.entityId === id);
  if (old) return; // Preserve position, scroll state and other open cards on zoom.
  const p = e.popup, c = SC.cameras.main;
  const pt = geo(e) === 'area' ? center(e) : { x: e.x, y: e.y };
  const x = (pt.x - c.scrollX - c.width / 2) * c.zoom + c.width / 2;
  const y = (pt.y - c.scrollY - c.height / 2) * c.zoom + c.height / 2;
  const width = Math.max(240, Number(p.width) || 500), height = Math.max(160, Number(p.height) || 500);
  const canvas = el('div', { class: 'map-popup-canvas', style: `width:${width}px;min-height:${height}px;` });
  let bottom = height;
  (p.blocks || []).forEach(b => {
    const bx = Number(b.x) || 0, by = Number(b.y) || 0;
    const bw = Math.max(40, Number(b.w) || 180);
    const bh = Math.max(30, Number(b.h) || (b.type === 'image' ? 140 : 80));
    bottom = Math.max(bottom, by + bh + 12);
    if (b.type === 'image') {
      if (b.src) canvas.append(el('img', { src: b.src, style: `position:absolute;left:${bx}px;top:${by}px;width:${Math.max(1,bw)}px;height:${bh}px;object-fit:${b.fitWidth ? 'contain' : 'cover'};object-position:${Number(b.imageX ?? 50)}% ${Number(b.imageY ?? 50)}%;` }));
    } else {
      const block = el('div', { class: 'popup-text-block markdown-render', style: `left:${bx}px;top:${by}px;width:${Math.max(1,bw)}px;min-height:${bh}px;font-size:${b.size || 16}px;` });
      block.innerHTML = markdownPreview(b.text || ''); canvas.append(block);
    }
  });
  canvas.style.minHeight = bottom + 'px';
  canvas.style.overflow = 'visible';
  const content = el('div', { class: 'map-popup-content' }, canvas);
  const isScene = false;
  const head = el('div', { class: 'map-popup-head' }, el('strong', {}, isScene?(p.scene?.title||e.name||'Сцена'):(e.name||'Локация')), btn('×', () => closeMapPopup(id), 'mini'));
  const kids = [head, content];
  if (isScene) {
    const action=el('div',{class:'map-popup-actions av15-scene-link'},btn('✦ Перейти / Исследовать',()=>{
      window.AvronSceneBridge?.openFull(id);
    },'primary'));
    kids.push(action);
  }

  if (!isScene && p.transitionEnabled && (p.transitionMapId || p.transitionArticleId)) kids.push(el('div', { class: 'map-popup-actions' }, btn('Перейти', () => {
    const aid = p.transitionArticleId, mid = p.transitionMapId;
    if (aid) { S.openArticleId = aid; switchScreen('encyclopedia'); renderLib(); }
    if (mid) gotoMap(mid);
  }, 'primary')));
  const left = Math.max(8, Math.min(layer.clientWidth - Math.min(width, layer.clientWidth - 16) - 8, x + 24));
  const top = Math.max(8, Math.min(layer.clientHeight - 120, y - 60));
  const panel = el('div', { class: 'map-popup ' + (p.orientation === 'portrait' ? 'portrait' : 'landscape'),
    style: `left:${left}px;top:${top}px;width:${width}px;height:${height}px;z-index:${++popupFront};` }, ...kids);
  panel.dataset.entityId = id;
  if (isScene) queueMicrotask(() => window.AvronSceneBridge?.mount(id, panel));
  panel.addEventListener('pointerdown', () => { panel.style.zIndex = String(++popupFront); });
  head.addEventListener('pointerdown', ev => {
    if (ev.target.closest('button')) return;
    ev.preventDefault(); const sx = ev.clientX, sy = ev.clientY;
    const ox = panel.offsetLeft, oy = panel.offsetTop;
    head.setPointerCapture(ev.pointerId);
    const move = mv => {
      panel.dataset.dragged = '1';
      panel.style.left = Math.max(0, Math.min(layer.clientWidth - 50, ox + mv.clientX - sx)) + 'px';
      panel.style.top = Math.max(0, Math.min(layer.clientHeight - 40, oy + mv.clientY - sy)) + 'px';
    };
    head.addEventListener('pointermove', move);
    head.addEventListener('pointerup', () => head.removeEventListener('pointermove', move), { once: true });
    head.addEventListener('pointercancel', () => head.removeEventListener('pointermove', move), { once: true });
  });
  layer.append(panel); wireWikiLinks(panel);
}

function relSection(e) {
  const wrap = el('div', { class: 'rels' }, el('div', { class: 'sub' }, 'Связи'));
  const rels = relsOf(e.id).filter(x=>S.mode==='edit'||!x.r.hiddenInRead&&(!x.r.revealAfterRead||S.world.articles.some(a=>a.id===x.r.articleId&&a.read)));
  if (!rels.length) wrap.append(el('div', { class: 'mini-info' }, 'Связей пока нет'));
  rels.forEach(x => wrap.append(el('div', { class: 'rel-row' },
    el('span', { class: 'rel-t' }, (!x.out && x.directed ? '← ' : '') + x.label + (x.out && x.directed ? ' →' : '')),
    el('a', { class: 'lnk', onclick: () => selectEntity(x.other.id, { center: true }) }, label(x.other)),
    el('button', { class:'mini only-edit', title:'Скрыть связь от Просмотра', onclick:()=>{x.r.hiddenInRead=!x.r.hiddenInRead;changed({});} },x.r.hiddenInRead?'◉ Скрыта':'◎ Видна'), el('button', { class: 'x', title: 'Удалить связь', onclick: () => { S.world.relations = S.world.relations.filter(r => r !== x.r); changed({}); } }, '×'))));
  if (!S.world.relationTypes.length) { wrap.append(el('div', { class: 'mini-info' }, 'Создайте тип связи во вкладке «Типы»')); return wrap; }
  const rt = el('select', { class: 'inp' }, S.world.relationTypes.map(r => el('option', { value: r.id }, r.name)));
  const dl = el('datalist', { id: 'entList' }), keys = new Map();
  S.world.entities.filter(x => x.id !== e.id).sort((a, b) => (b.mapId === e.mapId) - (a.mapId === e.mapId)).slice(0, 800).forEach(x => {
    let k = label(x) + ' · ' + typeOf(x).name; while (keys.has(k)) k += '.'; keys.set(k, x.id); dl.append(el('option', { value: k }));
  });
  const target = el('input', { class: 'inp', list: 'entList', placeholder: 'Найти объект по имени…' });
  const add = (id, typeId) => { if (!id || !ent(id)) return setStatus('Выберите объект из списка (нужно выбрать подсказку)'); if (S.world.relations.some(r => r.from === e.id && r.to === id && r.typeId === typeId)) return setStatus('Такая связь уже существует'); (window.AvronMaterials?.relate?.(e.id,id,typeId)||S.world.relations.push({ id: uid(), from: e.id, to: id, typeId, note: '' })); changed({}); setStatus('Связь сохранена'); };
  wrap.append(el('div', { class: 'rel-add' }, rt, target, dl,
    el('div', { class: 'btn-row' }, btn('＋ Связать', () => add(keys.get(target.value), rt.value)),
      btn('Указать на карте', () => { S.pick = { from: e.id, typeId: rt.value }; renderFloat(); setStatus('Нажмите на объект на карте'); }))));
  return wrap;
}

/* ---- карточка читателя ---- */
function linkify(text) {
  const out = [], re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g; let i = 0, m;
  while ((m = re.exec(text))) {
    out.push(text.slice(i, m.index)); i = re.lastIndex;
    const name = m[1].trim(), shown = (m[2] || m[1]).trim(), tg = S.world.entities.find(x => x.name && x.name.toLowerCase() === name.toLowerCase());
    const hidden = tg && S.mode === 'read' && (tg.draft || (tg.secret && !S.showSecrets));
    out.push(tg && !hidden ? el('a', { class: 'lnk', onclick: () => selectEntity(tg.id, { center: true }) }, shown) : el('span', { class: 'lnk miss', title: hidden ? '' : 'Объект не найден' }, hidden ? shown : shown));
  }
  out.push(text.slice(i)); return out;
}
function fmtField(f, v) { return f.kind === 'checkbox' ? (v ? 'да' : 'нет') : v; }

function readCard(e) {
  const box = el('div', { class: 'card' }), m = mapOf(S.mapId);
  if (!e) {
    box.append(el('h2', {}, m.name), el('p', { class: 'hint' }, 'Нажмите на метку или на любое место внутри области. Область подсветится, а здесь откроется её статья.'));
    const kids = S.world.maps.filter(x => x.parentId === m.id);
    if (kids.length) { box.append(el('div', { class: 'sub' }, 'Детальные карты')); kids.forEach(k => box.append(btn('▸ ' + k.name, () => gotoMap(k.id), 'wide'))); }
    const areas = S.world.entities.filter(a => a.mapId === m.id && geo(a) === 'area' && isShown(a));
    if (areas.length) { box.append(el('div', { class: 'sub' }, 'Области')); areas.forEach(a => box.append(btn('◩ ' + label(a), () => selectEntity(a.id, { center: true }), 'wide'))); }
    return box;
  }
  const t = typeOf(e);
  box.append(el('div', { class: 'badge', style: 'color:' + t.color + ';border-color:' + t.color }, t.glyph + ' ' + t.name));
  if (e.secret) box.append(el('span', { class: 'badge sec' }, '🔒 секрет'));
  if (t.quick) box.append(el('p', { class: 'lead pre' }, e.summary));
  else {
    box.append(el('h2', {}, label(e)));
    if (e.summary) box.append(el('p', { class: 'lead' }, e.summary));
    if (e.image) box.append(el('img', { class: 'pic', src: e.image, onerror: ev => ev.target.remove() }));
    const bodyView=el('div',{class:'markdown-render'}); bodyView.innerHTML=markdownPreview(e.body); box.append(bodyView); wireWikiLinks(bodyView);
  }
  const fl = t.fields.filter(f => e.fields[f.id] !== undefined && e.fields[f.id] !== '' && (f.kind !== 'checkbox' || e.fields[f.id]));
  if (fl.length) box.append(el('dl', { class: 'dl' }, fl.map(f => [el('dt', {}, f.label), el('dd', {}, String(fmtField(f, e.fields[f.id])))])));
  if (e.tags.length) box.append(el('div', { class: 'tags' }, e.tags.map(x => el('span', { class: 'tag', onclick: () => { S.q = x; $('q').value = x; SC.refresh(); renderLib(); } }, '#' + x))));
  const rels = relsOf(e.id).filter(x => (isShown(x.other) || S.mode !== 'read') && (S.mode!=='read'||(!x.r.hiddenInRead&&(!x.r.revealAfterRead||S.world.articles.some(a=>a.id===x.r.articleId&&a.read)))));
  if (rels.length) {
    box.append(el('div', { class: 'sub' }, 'Связи'));
    rels.forEach(x => box.append(el('div', { class: 'rel-row' }, el('span', { class: 'rel-t' }, x.label), el('a', { class: 'lnk', onclick: () => selectEntity(x.other.id, { center: true, autoplay:false }) }, label(x.other)),
      x.other.mapId !== S.mapId ? el('span', { class: 'mini-info' }, mapOf(x.other.mapId).name) : null)));
  }
  const timelineEvent = window.AvronTimeline?.findEventByEntity?.(e.id);
  if (timelineEvent) box.append(btn('Открыть момент хронологии →', () => window.AvronTimeline.openEventByEntity(e.id), 'primary wide'));
  if (e.linkMapId && mapOf(e.linkMapId)) box.append(btn('Перейти на карту «' + mapOf(e.linkMapId).name + '» →', () => gotoMap(e.linkMapId), 'primary wide'));
  return box;
}

/* ---- библиотека ---- */
function renderLib() {
  const box = $('libList'); if (!box) return; box.textContent = '';
  const head = el('div', { class: 'btn-row' },
    btn('⌕ Finder', () => window.AvronFinder?.open(), 'mini'),
    btn('＋ Библиотека', () => { const name = prompt('Название библиотеки', 'Новая библиотека'); if (!name?.trim()) return; S.world.libraries.push({ id: uid(), name: name.trim() }); changed({ keep: true }); renderLib(); }, 'mini'),
    btn('＋ Папка', () => { const name = prompt('Название папки', 'Новая папка'); if (!name?.trim()) return; const lib = S.world.libraries[0]; if(!lib)return; S.world.folders.push({ id: uid(), name: name.trim(), libraryId: lib.id, parentId: '' }); changed({ keep: true }); renderLib(); }, 'mini'),
    btn('＋ Статья', () => window.AvronRegistry?.createDialog?.({}), 'primary'));
  box.append(head);
  const article = S.world.articles.find(a => a.id === S.openArticleId);
  if (article) {
    const title = el('input', { class: 'inp', value: article.title, placeholder: 'Название статьи', oninput: ev => { article.title = ev.target.value; window.AvronFinder?.invalidate(); scheduleSave(); } });
    const body = el('textarea', { class: 'inp article-editor', rows: 15, value: article.body, placeholder: '# Заголовок\n\nТекст в Markdown…', oninput: ev => { article.body = ev.target.value; S.unsaved = true; renderStatus(); scheduleSave(); preview.innerHTML = markdownPreview(article.body); wireWikiLinks(preview); } });
    const preview = el('div', { class: 'article-preview markdown-render' }); preview.innerHTML = markdownPreview(article.body); wireWikiLinks(preview);
    const librarySelect = el('select', { class: 'inp', value: article.libraryId, onchange: ev => { article.libraryId = ev.target.value; changed({ keep: true }); renderLib(); } }, S.world.libraries.map(l => el('option', { value: l.id }, l.name)));
    const folderSelect = el('select', { class: 'inp', value: article.folderId || '', onchange: ev => { article.folderId = ev.target.value; changed({ keep: true }); renderLib(); } }, el('option', { value: '' }, 'Без папки'), S.world.folders.filter(f => f.libraryId === article.libraryId).map(f => el('option', { value: f.id }, f.name)));
    box.append(el('label',{class:'read-status-label'},el('input',{type:'checkbox',checked:!!article.read,onchange:ev=>{article.read=ev.target.checked;scheduleSave();window.dispatchEvent(new Event('avron-archive-changed'));}}),' Прочитана — открывает зависящие от статьи связи в Просмотре'));
    box.append(el('label',{class:'read-status-label'},el('input',{type:'checkbox',checked:!!article.draft,onchange:ev=>{article.draft=ev.target.checked;scheduleSave();window.AvronFinder?.invalidate?.();}}),' Черновик — скрыть от Просмотра')); 
    box.append(el('div', { class: 'article-editor-head' }, title, btn('Закрыть', () => { S.openArticleId = null; renderLib(); }, 'mini')),
      row('Библиотека', librarySelect), row('Папка', folderSelect),
      el('div', { class: 'mini-info' }, 'Markdown: заголовки, списки, ссылки, цитаты, код. Внутренние ссылки: [[Название статьи]] или [[id:идентификатор]].'),
      el('div',{class:'btn-row article-finder-actions'},btn('⌕ Finder — искать выделенное',()=>{const selection=String(body.value).slice(body.selectionStart,body.selectionEnd);avronFinder.open(selection,body)},'mini'),btn('▤ Сырой Markdown',()=>{body.focus();},'mini')),
      body,
      el('div', { class: 'sub' }, 'Предпросмотр'), preview,
      el('div', { class: 'btn-row' }, btn('Удалить статью', () => { if (confirm('Удалить статью «' + article.title + '»?')) { window.AvronMaterials?.remove?.('article:'+article.id); S.openArticleId = null; changed({ keep: true }); renderLib(); } }, 'danger')));
  }
  // Дерево строится по индексам за один проход: не фильтруем 5000 статей для каждой папки.
  const q = (S.libraryQuery || '').trim().toLocaleLowerCase('ru');
  const articles = S.world.articles.filter(a => (S.mode==='edit'||(a.lockedByPuzzle?window.AvronRelicary?.unlockedArticle(a):!a.draft)) && (!q || (a.title + ' ' + (a.tags || []).join(' ') + ' ' + (a.body || '')).toLocaleLowerCase('ru').includes(q)));
  const search = el('input', {class:'inp', type:'search', placeholder:'Поиск статей и папок…', value:S.libraryQuery || '', oninput:ev=>{S.libraryQuery=ev.target.value; const pos=ev.target.selectionStart; renderLib(); const next=box.querySelector('.library-search'); if(next){next.focus();next.setSelectionRange(pos,pos);} }});
  search.classList.add('library-search');
  box.append(search, el('div', {class:'sec-head'}, 'СТАТЬИ', el('span',{class:'cnt'}, String(articles.length) + ' / ' + S.world.articles.length)));
  S.libraryExpanded ||= {};
  const folderByParent = new Map(), articlesByFolder = new Map();
  for (const f of S.world.folders) { const k=f.libraryId+'|'+(f.parentId||''); if(!folderByParent.has(k))folderByParent.set(k,[]); folderByParent.get(k).push(f); }
  for (const a of articles) { const k=a.libraryId+'|'+(a.folderId||''); if(!articlesByFolder.has(k))articlesByFolder.set(k,[]); articlesByFolder.get(k).push(a); }
  const appendArticles=(parent,libId,folderId)=>{const arr=articlesByFolder.get(libId+'|'+folderId)||[];const limit=200;for(const a of arr.slice(0,limit))parent.append(articleRow(a));if(arr.length>limit){let shown=limit;parent.append(btn('Показать ещё ('+(arr.length-limit)+')',ev=>{const more=arr.slice(shown,shown+limit);more.forEach(a=>ev.target.before(articleRow(a)));shown+=more.length;if(shown>=arr.length)ev.target.remove();else ev.target.textContent='Показать ещё ('+(arr.length-shown)+')';},'mini'));}};
  const makeFolder=(folder,libId,depth,seen)=>{
    if(seen.has(folder.id)||depth>30)return null;
    const visited=new Set(seen);visited.add(folder.id);
    const children=folderByParent.get(libId+'|'+folder.id)||[];
    const own=articlesByFolder.get(libId+'|'+folder.id)||[];
    const nested=children.map(f=>makeFolder(f,libId,depth+1,visited)).filter(Boolean);
    if(q&&!own.length&&!nested.length&&!folder.name.toLocaleLowerCase('ru').includes(q))return null;
    const d=el('details',{class:'library-folder',open:q||S.libraryExpanded[folder.id]===true},el('summary',{},'📁 '+folder.name+' ('+own.length+')'));
    d.addEventListener('toggle',()=>{if(!q)S.libraryExpanded[folder.id]=d.open;});
    const inner=el('div',{class:'library-folder-content'});
    inner.append(el('div',{class:'btn-row'},btn('＋ Статья',()=>window.AvronRegistry?.createDialog?.({libraryId:libId,folderId:folder.id}),'mini'),btn('＋ Папка',()=>{const name=prompt('Название подпапки');if(!name?.trim())return;S.world.folders.push({id:uid(),name:name.trim(),libraryId:libId,parentId:folder.id});S.libraryExpanded[folder.id]=true;changed({keep:true});},'mini'),btn('Переименовать',()=>{const name=prompt('Название папки',folder.name);if(!name?.trim())return;folder.name=name.trim();changed({keep:true});},'mini')));
    nested.forEach(n=>inner.append(n));appendArticles(inner,libId,folder.id);d.append(inner);return d;
  };
  for(const lib of S.world.libraries){
    const roots=folderByParent.get(lib.id+'|')||[];
    const rootArticles=articlesByFolder.get(lib.id+'|')||[];
    const folders=roots.map(f=>makeFolder(f,lib.id,0,new Set())).filter(Boolean);
    if(q&&!folders.length&&!rootArticles.length)continue;
    const d=el('details',{class:'library-root',open:q||S.libraryExpanded['lib:'+lib.id]!==false},el('summary',{},'▤ '+lib.name));
    d.addEventListener('toggle',()=>{if(!q)S.libraryExpanded['lib:'+lib.id]=d.open;});
    const inner=el('div',{class:'library-folder-content'});folders.forEach(f=>inner.append(f));appendArticles(inner,lib.id,'');d.append(inner);box.append(d);
  }
  box.append(el('div', { class: 'divider-line' }));
  const list = S.world.entities.filter(e => typeOf(e) && (S.mode === 'edit' || isShown(e))).sort((a, b) => label(a).localeCompare(label(b), 'ru'));
  box.append(el('div', { class: 'sec-head' }, 'ОБЪЕКТЫ КАРТ', el('span', { class: 'cnt' }, list.length + ' / ' + S.world.entities.length)));
  S.mapLibraryCollapsed ||= {};
  const groups=new Map();for(const e of list){const t=typeOf(e);if(!groups.has(t.id))groups.set(t.id,{type:t,items:[]});groups.get(t.id).items.push(e);}
  for(const g of [...groups.values()].sort((a,b)=>a.type.name.localeCompare(b.type.name,'ru'))){
    const key=g.type.id,d=el('details',{class:'library-folder avron-type-group',open:S.mapLibraryCollapsed[key]!==true},el('summary',{},(g.type.glyph||'✧')+' '+g.type.name+' ('+g.items.length+')'));
    d.addEventListener('toggle',()=>{S.mapLibraryCollapsed[key]=!d.open;});
    const inner=el('div',{class:'library-folder-content'});let shown=0;
    const append=()=>{const segment=g.items.slice(shown,shown+75);for(const e of segment)inner.append(el('div',{class:'lib-row'+(e.id===S.selId?' sel':''),onclick:()=>selectEntity(e.id,{center:true})},el('span',{class:'dot',style:'background:'+g.type.color}),el('div',{class:'lt'},el('b',{},label(e)),el('small',{},mapOf(e.mapId)?.name||'без карты'))));shown+=segment.length;if(shown<g.items.length)inner.append(btn('Ещё '+Math.min(75,g.items.length-shown)+'…',ev=>{ev.target.remove();append()},'mini'));};append();d.append(inner);box.append(d);
  }
}
function articleRow(a) { return el('div', { class: 'lib-row' + (a.id === S.openArticleId ? ' sel' : ''), onclick: () => { S.openArticleId = a.id; renderLib(); } }, el('span', { class: 'dot', style: 'background:#c8ad72' }), el('div', { class: 'lt' }, el('b', {}, a.title), el('small', {}, (a.draft ? 'Черновик' : 'Статья') + ' · ' + (a.body || '').length + ' знаков'))); }
function markdownPreview(source) {
  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  let text=String(source||''); const wiki=[];
  text=text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,(_,name,label)=>{const id=wiki.length;wiki.push({name:name.trim(),label:(label||name).trim()});return 'WIKILINKTOKEN'+id+'ENDWIKILINK';});
  let html;
  if (window.marked && typeof window.marked.parse === 'function') {
    html=window.marked.parse(text,{gfm:true,breaks:false,headerIds:false,mangle:false});
  } else {
    html='<p>'+esc(text).replace(/\n/g,'<br>')+'</p>';
  }
  html=html.replace(/WIKILINKTOKEN(\d+)ENDWIKILINK/g,(_,n)=>{const w=wiki[+n];return '<span class="wiki-link" data-wiki="'+esc(w.name)+'">'+esc(w.label)+'</span>';});
  // Sanitize the generated fragment, including raw HTML embedded in Markdown.
  const tpl=document.createElement('template'); tpl.innerHTML=html;
  tpl.content.querySelectorAll('script,style,iframe,object,embed,form,input,button,textarea,video,audio,link,meta').forEach(n=>n.remove());
  tpl.content.querySelectorAll('*').forEach(node=>Array.from(node.attributes).forEach(attr=>{
    const name=attr.name.toLowerCase(), value=attr.value.trim();
    if(name.startsWith('on') || name==='srcdoc' || name==='style' && /url\s*\(|expression\s*\(/i.test(value)) node.removeAttribute(attr.name);
    if(name==='href' || name==='src' || name==='xlink:href') {
      const safe=/^(https?:|mailto:|#|data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,)/i.test(value);
      if(!safe) node.removeAttribute(attr.name);
    }
  }));
  if(S.world?.autoWikiLinks!==false)window.AvronFinder?.enhancePreview?.(tpl.content);
  return tpl.innerHTML;
}

/* ---- редактор типов ---- */
const KINDS = { text: 'Строка', longtext: 'Текст', number: 'Число', select: 'Список', checkbox: 'Да/нет' };
function typesChanged() { changed({ keep: true }); renderTools(); }
function renderTypes() {
  const box = $('tabTypes'); box.textContent = '';
  box.append(el('div', { class: 'sec-head' }, 'ТИПЫ ОБЪЕКТОВ', btn('＋ Тип', addType, 'mini')));
  S.world.types.forEach(t => box.append(typeCard(t)));
  box.append(el('div', { class: 'sec-head', style: 'margin-top:20px' }, 'ТИПЫ СВЯЗЕЙ', btn('＋ Связь', addRelType, 'mini')));
  S.world.relationTypes.forEach(r => box.append(relTypeCard(r)));
}
function addType() {
  const t = { id: uid(), name: 'Новый тип', color: '#c9a0dc', glyph: '◆', geometry: 'point', quick: false, fields: [] };
  S.world.types.push(t); S.openType = t.id; reindex(); typesChanged(); renderTypes();
}
function typeCard(t) {
  const used = S.world.entities.filter(e => e.typeId === t.id).length, open = S.openType === t.id;
  const c = el('div', { class: 'tcard' + (open ? ' open' : '') },
    el('div', { class: 'thead', onclick: () => { S.openType = open ? null : t.id; renderTypes(); } },
      el('b', { style: 'color:' + t.color }, t.glyph), el('span', { class: 'tn' }, t.name), el('small', {}, (t.geometry === 'area' ? 'область' : t.quick ? 'заметка' : 'точка') + ' · ' + used)));
  if (!open) return c;
  const body = el('div', { class: 'tbody' });
  body.append(
    row('Название', el('input', { class: 'inp', value: t.name, oninput: ev => { t.name = ev.target.value; typesChanged(); } })),
    el('div', { class: 'two' },
      row('Значок', el('input', { class: 'inp', value: t.glyph, maxlength: 4, oninput: ev => { t.glyph = ev.target.value || '●'; typesChanged(); } })),
      row('Цвет', el('input', { class: 'inp color', type: 'color', value: t.color, oninput: ev => { t.color = ev.target.value; typesChanged(); } }))),
    row('Геометрия', el('select', { class: 'inp', value: t.geometry, disabled: used > 0, onchange: ev => { t.geometry = ev.target.value; if (t.geometry === 'area') t.quick = false; typesChanged(); renderTypes(); } },
      el('option', { value: 'point' }, 'Точка (метка)'), el('option', { value: 'area' }, 'Область (полигон)'))));
  if (used) body.append(el('div', { class: 'mini-info' }, 'Геометрию нельзя менять, пока есть объекты этого типа'));
  if (t.geometry === 'point') body.append(el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: t.quick, onchange: ev => { t.quick = ev.target.checked; typesChanged(); } }), ' Быстрая заметка — без названия и статьи, только короткий текст'));
  body.append(el('div', { class: 'sub' }, 'Поля'));
  t.fields.forEach((f, i) => {
    body.append(el('div', { class: 'frow' },
      el('input', { class: 'inp', value: f.label, placeholder: 'Название поля', oninput: ev => { f.label = ev.target.value; typesChanged(); } }),
      el('select', { class: 'inp', value: f.kind, onchange: ev => { f.kind = ev.target.value; if (f.kind === 'select' && !f.options) f.options = []; typesChanged(); renderTypes(); } }, Object.entries(KINDS).map(([k, v]) => el('option', { value: k }, v))),
      el('button', { class: 'x', title: 'Удалить поле', onclick: () => { t.fields.splice(i, 1); typesChanged(); renderTypes(); } }, '×')));
    if (f.kind === 'select') body.append(el('input', { class: 'inp sm', value: (f.options || []).join(', '), placeholder: 'варианты через запятую', oninput: ev => { f.options = ev.target.value.split(',').map(s => s.trim()).filter(Boolean); typesChanged(); } }));
  });
  body.append(el('div', { class: 'btn-row' }, btn('＋ Поле', () => { t.fields.push({ id: uid(), label: '', kind: 'text' }); typesChanged(); renderTypes(); }),
    btn('Удалить тип', () => {
      if (used) return alert('Есть объекты этого типа (' + used + '). Сначала удалите их или смените тип.');
      if (!confirm('Удалить тип «' + t.name + '»?')) return;
      S.world.types = S.world.types.filter(x => x !== t); if (S.tool === t.id) S.tool = 'select'; S.hiddenTypes.delete(t.id); reindex(); typesChanged(); renderTypes();
    }, 'danger')));
  c.append(body); return c;
}
function addRelType() {
  const r = { id: uid(), name: 'Новая связь', reverse: '', directed: true, color: '#d6b56c' };
  S.world.relationTypes.push(r); reindex(); changed({ keep: true }); renderTypes();
}
function relTypeCard(r) {
  const used = S.world.relations.filter(x => x.typeId === r.id).length;
  return el('div', { class: 'tcard open' }, el('div', { class: 'tbody' },
    el('div', { class: 'two' },
      row('Название', el('input', { class: 'inp', value: r.name, oninput: ev => { r.name = ev.target.value; changed({ keep: true }); } })),
      row('Обратное', el('input', { class: 'inp', value: r.reverse || '', disabled: !r.directed, placeholder: r.directed ? 'напр. «Содержит»' : '—', oninput: ev => { r.reverse = ev.target.value; changed({ keep: true }); } }))),
    el('div', { class: 'two' },
      el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: r.directed, onchange: ev => { r.directed = ev.target.checked; changed({ keep: true }); renderTypes(); } }), ' С направлением'),
      el('input', { class: 'inp color', type: 'color', value: r.color, oninput: ev => { r.color = ev.target.value; changed({ keep: true }); } })),
    btn('Удалить (' + used + ' связей)', () => {
      if (used && !confirm('Будет удалено связей: ' + used + '. Продолжить?')) return;
      S.world.relations = S.world.relations.filter(x => x.typeId !== r.id); S.world.relationTypes = S.world.relationTypes.filter(x => x !== r); reindex(); changed({}); renderTypes();
    }, 'danger')));
}

/* ===== режимы, файлы, клавиши ===== */
function setMode(m) {
  window.AvronFinder?.invalidate?.();S.mode = m; S.pick = null; if (m === 'read') S.tool = 'select';
  SC.cancelDraft(true); document.body.classList.toggle('read', m === 'read');
  if (m === 'read' && S.tab === 'types') S.tab = 'object';
  renderTop(); renderTools(); renderObject(); renderFilters(); renderLib(); renderFloat(); setTab(S.tab); SC.refresh(); if(S.screen==='section')renderSection();window.dispatchEvent(new Event('avron-mode-changed'));
}
function renderWorldNav() {
  const host=$('customNav'); if(!host)return; host.textContent='';
  (S.world.sections||[]).filter(sec=>!(sec.id==='pantheon' || String(sec.name||'').toLocaleLowerCase('ru')==='пантеон')).forEach(sec=>host.append(el('button',{class:(S.screen==='section'&&S.activeSectionId===sec.id?'on':''),onclick:()=>openSection(sec.id)},(sec.icon||'▤')+' '+sec.name))); 
}
function setMapWorkspaceVisible(visible) {
  const workspace=$('workspace');
  // Не удаляем Phaser canvas из layout: Scale.RESIZE не должен получать размер 0×0,
  // иначе WebGL framebuffer может стать невалидным при возвращении на карту.
  workspace.hidden=false;
  workspace.classList.toggle('workspace-suspended',!visible);
  $('sectionScreen').hidden=visible;
  if(visible) requestAnimationFrame(()=>{ if(SC && SC.scale) { SC.scale.refresh(); SC.clampCam(); SC.onZoom(); } });
}
function switchScreen(screen) {
  S.screen=screen; closeMapPopup(); setMapWorkspaceVisible(screen==='map');
  document.querySelectorAll('[data-screen]').forEach(b=>b.classList.toggle('on',b.dataset.screen===screen));
  if(screen==='map'){renderAll();return;} if(screen==='encyclopedia') renderEncyclopedia();
  else if(screen==='timeline' && typeof renderTimelineScreen==='function') renderTimelineScreen();
  renderWorldNav();
}
function openSection(id) { S.screen='section'; S.activeSectionId=id; S.activeEntryId=null; setMapWorkspaceVisible(false); document.querySelectorAll('[data-screen]').forEach(b=>b.classList.remove('on')); renderSection(); renderWorldNav(); }
function renderEncyclopedia() {
  const root=$('sectionScreen');root.textContent='';root.className='section-screen encyclopedia-screen';
  root.append(el('header',{class:'lore-top'},
    el('div',{},el('small',{},S.world.name),el('h1',{},'Энциклопедия мира')),
    el('div',{class:'btn-row'},
      btn('⌕ Finder',()=>window.AvronFinder?.open(),'mini'),
      S.mode==='edit'?btn(S.world.autoWikiLinks===false?'Автоссылки: выкл':'Автоссылки: вкл',()=>{S.world.autoWikiLinks=S.world.autoWikiLinks===false;S.unsaved=true;scheduleSave();renderEncyclopedia()},'mini'):null,
      btn('← К карте',()=>switchScreen('map'),'mini')
    )
  ));
  const grid=el('div',{class:'lore-layout'});
  const nav=el('aside',{class:'lore-nav'},el('h3',{},'Архив / библиотеки'));
  const queryInput=el('input',{class:'inp',type:'search',placeholder:'Поиск по заголовкам, папкам, тегам…'});
  nav.append(queryInput);
  const navEntries=el('div',{class:'lore-library-tree'});nav.append(navEntries);
  const article=el('article',{class:'lore-article',id:'loreArticle'},el('h2',{},'Энциклопедия'),el('p',{},'Откройте библиотеку или воспользуйтесь Finder для поиска статей и объектов мира.'));
  const validArticles=(S.world.articles||[]).filter(a=>S.mode==='edit'||(a.lockedByPuzzle?window.AvronRelicary?.unlockedArticle(a):!a.draft));
  const byLib=new Map(), byFolder=new Map(), foldersByParent=new Map();
  for(const a of validArticles){if(!byLib.has(a.libraryId))byLib.set(a.libraryId,[]);byLib.get(a.libraryId).push(a);if(!byFolder.has(a.folderId||''))byFolder.set(a.folderId||'',[]);byFolder.get(a.folderId||'').push(a);}
  for(const f of S.world.folders||[]){const key=(f.libraryId||'')+'|'+(f.parentId||'');if(!foldersByParent.has(key))foldersByParent.set(key,[]);foldersByParent.get(key).push(f);}
  const ordered=list=>list.slice().sort((a,b)=>a.title.localeCompare(b.title,'ru'));
  function appendArticleBatch(parent,list,index){
    const chunk=ordered(list);const step=80;
    const show=(from)=>{
      const slice=chunk.slice(from,from+step);
      slice.forEach(a=>parent.append(el('button',{class:'lore-link',onclick:()=>{S.activeEntryId=a.id;renderEncyclopediaArticle(a)}},a.title)));
      if(from+step<chunk.length)parent.append(btn('Показать ещё ('+Math.min(step,chunk.length-from-step)+') →',()=>{const more=parent.lastElementChild;more?.remove();show(from+step)},'lore-load-more'));
    };
    show(0);
  }
  function renderFolder(parent,folder,query,seen=new Set(),depth=0){
    if(seen.has(folder.id)||depth>10)return;
    const visited=new Set(seen);visited.add(folder.id);
    const subfolders=foldersByParent.get((folder.libraryId||'')+'|'+folder.id)||[];
    const direct=byFolder.get(folder.id)||[];
    const list=query?direct.filter(a=>(a.title+' '+(a.tags||[]).join(' ')).toLocaleLowerCase('ru').includes(query)):direct;
    // Search traverses descendants too: a child article must not disappear because its parent name differs.
    const details=el('details',{class:'lore-library-folder'},el('summary',{},'▸ '+folder.name));
    const inner=el('div',{class:'lore-folder-inner'});
    const lazy=()=>{if(details.dataset.populated)return;details.dataset.populated='1';if(list.length)appendArticleBatch(inner,list);for(const sub of subfolders)renderFolder(inner,sub,query,visited,depth+1)};
    details.addEventListener('toggle',()=>{if(details.open)lazy()});
    if(query){details.open=true;lazy()}
    details.append(inner);parent.append(details);
  }
  function rebuild(){
    const q=(queryInput.value||'').trim().toLocaleLowerCase('ru');navEntries.textContent='';
    for(const lib of S.world.libraries||[]){
      const all=byLib.get(lib.id)||[];
      const rootArticles=all.filter(a=>!a.folderId);
      const filtered=q?rootArticles.filter(a=>(a.title+' '+(a.tags||[]).join(' ')).toLocaleLowerCase('ru').includes(q)):rootArticles;
      const children=foldersByParent.get(lib.id+'|')||[];
      if(q&&!all.some(a=>(a.title+' '+(a.tags||[]).join(' ')).toLocaleLowerCase('ru').includes(q))&&!lib.name.toLocaleLowerCase('ru').includes(q)&&!children.some(f=>f.name.toLocaleLowerCase('ru').includes(q)))continue;
      const section=el('details',{class:'lore-library-root'},el('summary',{},'▤ '+lib.name+' · '+all.length));
      const inner=el('div',{class:'lore-folder-inner'});
      const populate=()=>{if(section.dataset.populated)return;section.dataset.populated='1';for(const f of children)renderFolder(inner,f,q);if(filtered.length)appendArticleBatch(inner,filtered);};
      section.addEventListener('toggle',()=>{if(section.open)populate()});
      if(q){section.open=true;populate()}
      section.append(inner);navEntries.append(section);
    }
    if(!navEntries.childElementCount)navEntries.append(el('p',{class:'mini-info'},'Статей по запросу не найдено. Попробуйте Finder.'));
  }
  queryInput.addEventListener('input',rebuild);rebuild();
  grid.append(nav,article);root.append(grid);
  const opening=(S.world.articles||[]).find(a=>a.id===S.openArticleId);
  if(opening&&(S.mode==='edit'||!opening.draft))renderEncyclopediaArticle(opening);
}
function renderEncyclopediaArticle(a){
  const article=$('loreArticle');if(!article)return;article.textContent='';
  if(S.mode==='read'&&a.draft){article.append(el('h2',{},'Материал пока не опубликован'));return;}
  article.append(el('h1',{},a.title),S.mode==='edit'?el('div',{class:'btn-row'},btn('✎ Редактировать статью',()=>window.AvronFinder?.openArticleEditor(a.id),'mini'),btn('⌕ Найти связи',()=>window.AvronFinder?.open(a.title),'mini')):null,el('div',{class:'markdown-render'},));
  article.lastChild.innerHTML=markdownPreview(a.body);
  article.append(el('label',{class:'read-status-label'},el('input',{type:'checkbox',checked:!!a.read,onchange:ev=>{a.read=ev.target.checked;S.unsaved=true;scheduleSave();window.dispatchEvent(new Event('avron-archive-changed'));}}),' Прочитана'))
  wireWikiLinks(article);
  const linked=(S.world.chronicles||[]).filter(c=>(c.articleIds||[]).includes(a.id));
  if(linked.length){
    const links=el('div',{class:'chronicle-article-links'},el('h3',{},'✧ Связанные летописи'));
    linked.forEach(c=>links.append(btn('▶ '+c.name,()=>window.PantheonStartCinematic?.(c),'mini')));
    article.append(links);
  }
}

function renderSection() {
  const root=$('sectionScreen'), sec=(S.world.sections||[]).find(x=>x.id===S.activeSectionId); root.textContent='';root.className='section-screen pantheon-screen';if(!sec){root.append(el('p',{},'Раздел не найден'));return;}
  const head=el('header',{class:'lore-top'},el('div',{},el('small',{},S.world.name),el('h1',{},(sec.icon||'✧')+' '+sec.name)),el('div',{class:'btn-row'},S.mode==='edit'?btn('＋ Запись',()=>{const a=window.AvronMaterials?.create?.('entry',{title:'Новая запись',sectionId:sec.id});if(!a)return;S.activeEntryId=a.id;renderSection();scheduleSave();},'primary'):null,btn(S.mode==='edit'?'Просмотр':'Редактирование',()=>setMode(S.mode==='edit'?'read':'edit'),'mini'),btn('← К карте',()=>switchScreen('map'),'mini')));root.append(head);
  if(S.mode==='edit') root.append(el('div',{class:'section-config'},row('Название раздела',el('input',{class:'inp',value:sec.name,oninput:ev=>{sec.name=ev.target.value;renderWorldNav();scheduleSave();}})),row('Значок',el('input',{class:'inp',value:sec.icon||'',oninput:ev=>{sec.icon=ev.target.value;renderWorldNav();scheduleSave();}})),btn('＋ Новый раздел',()=>addWorldSection(),'mini'),btn('Удалить раздел',()=>{if(confirm('Удалить раздел и все его записи?')){if(!window.AvronMaterials?.remove?.('section:'+sec.id))S.world.sections=S.world.sections.filter(x=>x!==sec);switchScreen('map');scheduleSave();}},'danger')));
  const layout=el('div',{class:'pantheon-layout'}), side=el('aside',{class:'pantheon-index'},el('h3',{},'Содержание'));
  sec.entries.forEach(a=>side.append(el('button',{class:'lore-link'+(a.id===S.activeEntryId?' on':''),onclick:()=>{S.activeEntryId=a.id;renderSection();}},a.title)));
  const entry=sec.entries.find(a=>a.id===S.activeEntryId)||sec.entries[0]; if(entry&&!S.activeEntryId)S.activeEntryId=entry.id;
  const content=el('article',{class:'deity-article'});
  if(entry){if(S.mode==='edit'){
      content.append(row('Название',el('input',{class:'inp',value:entry.title,oninput:ev=>{entry.title=ev.target.value;scheduleSave();}})),row('Изображение',(()=>{const f=el('input',{type:'file',accept:'image/*',hidden:true,onchange:ev=>{const file=ev.target.files[0];ev.target.value='';if(!file)return;const r=new FileReader();r.onload=()=>{entry.image=String(r.result);renderSection();scheduleSave();};r.readAsDataURL(file);}});return el('div',{class:'btn-row'},btn('Выбрать изображение…',()=>f.click()),f,entry.image?btn('Убрать',()=>{entry.image='';renderSection();scheduleSave();},'mini'):null);})()),row('Статья Markdown',el('textarea',{class:'inp article-editor',rows:24,value:entry.body,oninput:ev=>{entry.body=ev.target.value;preview.innerHTML=markdownPreview(entry.body);scheduleSave();}})),btn('Удалить запись',()=>{if(confirm('Удалить запись?')){if(!window.AvronMaterials?.remove?.('entry:'+entry.id))sec.entries=sec.entries.filter(x=>x!==entry);S.activeEntryId=null;renderSection();scheduleSave();}},'danger'));
      var preview=el('div',{class:'markdown-render'});preview.innerHTML=markdownPreview(entry.body);content.append(el('h2',{},'Предпросмотр'),preview);
    }else{content.append(el('h1',{},entry.title));if(entry.image)content.append(el('img',{class:'deity-image',src:entry.image}));const body=el('div',{class:'markdown-render'});body.innerHTML=markdownPreview(entry.body);content.append(body);}
    const headings=Array.from(content.querySelectorAll('h1,h2,h3,h4')).filter(h=>h.textContent);headings.forEach((h,i)=>{h.id='section-heading-'+i;side.append(el('button',{class:'lore-link toc-link',onclick:()=>h.scrollIntoView({behavior:'smooth',block:'start'})},'↳ '+h.textContent));});wireWikiLinks(content);
  } else content.append(el('div',{class:'empty'},'В этом разделе пока нет записей.'));
  layout.append(side,content);root.append(layout);renderWorldNav();
}
function addWorldSection(){const name=prompt('Название нового раздела','Артефакты');if(!name?.trim())return;const sec=window.AvronMaterials?.create?.('section',{title:name.trim()})||{id:uid(),name:name.trim(),icon:'▤',layout:'encyclopedia',entries:[]};if(!(S.world.sections||[]).some(x=>x.id===sec.id))S.world.sections.push(sec);S.activeSectionId=sec.id;S.activeEntryId=null;openSection(sec.id);scheduleSave();}
/* ===== AVRON FINDER: searching never creates; creation is explicit and idempotent. ===== */
const avronFinder=(()=>{
  let indexWorld=null,indexData=null,indexVersion='',modal=null,sourceSelection=null;
  const canon=t=>String(t||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('ru');
  const normalized=s=>String(s||'').trim().slice(0,120);
  function makeIndex(){
    const w=S.world; const sig=[w.articles?.length,w.entities?.length,w.pantheon?.length].join(':');
    if(indexWorld===w&&indexData&&sig===indexVersion)return indexData;
    const map=new Map(),items=[];
    const add=(entry)=>{const key=canon(entry.title);if(!key||key.length<3)return;items.push(entry);const xs=map.get(key)||[];xs.push(entry);map.set(key,xs)};
    (w.articles||[]).filter(a=>S.mode!=='read'||(a.lockedByPuzzle?window.AvronRelicary?.unlockedArticle(a):!a.draft)).forEach(a=>{const row={kind:'article',id:a.id,title:a.title,record:a,body:canon(a.body||'')};add(row);for(const alias of a.sourceAliases||[]){const k=canon(alias);if(k&&k!==canon(a.title)){const xs=map.get(k)||[];if(!xs.some(x=>x.id===a.id&&x.kind==='article'))xs.push(row);map.set(k,xs);}}});
    (w.entities||[]).filter(e=>S.mode!=='read'||isShown(e)).forEach(e=>{if(e.name)add({kind:'entity',id:e.id,title:e.name,record:e})});
    (w.pantheon||[]).forEach(g=>{if(g.name)add({kind:'god',id:g.id,title:g.name,record:g})});
    for(const x of window.AvronRegistry?.all?.()||[]){if(['article','entity','god'].includes(x.kind))continue;if(x.title)add({kind:x.kind,id:x.id,title:x.title,record:window.AvronRegistry.item(x.kind+':'+x.id)})}
    indexWorld=w;indexVersion=sig;indexData={map,items};return indexData;
  }
  function invalidate(){indexData=null;}
  function matches(q){const index=makeIndex();const key=canon(q);if(!key)return[];
    const equal=index.map.get(key)||[];
    return [...equal,...index.items.filter(x=>canon(x.title).includes(key)&&!equal.includes(x)).slice(0,30),...index.items.filter(x=>x.kind==='article'&&x.body?.includes(key)&&!equal.includes(x)&&!canon(x.title).includes(key)).slice(0,20)].slice(0,50);
  }
  function articleFor(name){const key=canon(name);return(S.world.articles||[]).find(a=>canon(a.title)===key&&(S.mode!=='read'||(a.lockedByPuzzle?window.AvronRelicary?.unlockedArticle(a):!a.draft)))||null;}
  function entityFor(name){const key=canon(name);return(S.world.entities||[]).find(e=>canon(e.name)===key&&(S.mode!=='read'||isShown(e)))||null;}
  function openArticleEditor(id){const a=(S.world.articles||[]).find(a=>a.id===id);if(!a)return;
    S.openArticleId=a.id; if(window.AvronArticleStudio){window.AvronArticleStudio.open(a.id);return;}switchScreen('map');setTab('lib');renderLib();
  }
  function openResult(item){close();window.AvronTimeline?.closeStory?.();if(window.AvronNav?.open?.({kind:item.kind,id:item.id}))return;if(item.kind==='article'){switchScreen('encyclopedia');renderEncyclopediaArticle(item.record);}else if(item.kind==='entity'){switchScreen('map');selectEntity(item.id,{center:true,autoplay:false});}else if(item.kind==='god')window.PantheonOpenGod?.(item.id);}
  function createArticle(title,entityId=''){
    if(S.mode!=='edit')return null;
    title=normalized(title);if(!title)return null;
    const exactMatches=window.AvronMaterials?.titleLookup?.(title,{kind:'article'})||[];const existing=exactMatches.length===1?articleFor(title):null;
    if(existing){if(entityId){const e=ent(entityId);if(e){e.articleId=existing.id;S.unsaved=true;scheduleSave();}}return existing;}
    const a=window.AvronMaterials?.create?.('article',{title,parents:entityId?['entity:'+entityId]:[]})||window.AvronRegistry?.create?.({title,parents:entityId?['entity:'+entityId]:[],draft:false});if(!a)return null;
    if(entityId){const e=ent(entityId);if(e)e.articleId=a.id;}
    invalidate();S.unsaved=true;scheduleSave();
    window.dispatchEvent(new Event('avron-archive-changed'));
    return a;
  }
  function close(){document.querySelector('.avron-finder-overlay')?.remove();modal=null;}
  function insertLink(item){
    const info=sourceSelection;if(!info||!info.element?.isConnected)return;
    const {element,start,end,text}=info;
    const link='[['+item.title+(canon(text)===canon(item.title)?'':'|'+text)+']]';
    element.setRangeText(link,start,end,'end');
    element.dispatchEvent(new Event('input',{bubbles:true}));
    close();element.focus();
  }
  function renderModal(initial){
    if(!modal)return;
    const q=normalized(initial);const results=matches(q);const exactArticle=articleFor(q);const exactEntity=entityFor(q);
    modal.replaceChildren(
      el('div',{class:'finder-head'},el('div',{},el('small',{},'АТЛАС · НАВИГАЦИЯ ПО ЗНАНИЯМ'),el('h2',{},'Finder')),btn('✕',close,'mini')),
      el('div',{class:'finder-search-line'}, el('input',{id:'finderInput',class:'inp',type:'search',value:q,placeholder:'Название статьи, объекта или божества…',oninput:e=>renderModal(e.target.value)})),
      el('div',{class:'finder-results'}, results.length?results.map(item=>el('div',{class:'finder-item'},el('button',{class:'finder-result',onclick:()=>openResult(item)},el('span',{},item.kind==='article'?'▤':item.kind==='entity'?'⌖':'✦'),el('div',{},el('strong',{},item.title),el('small',{},item.kind==='article'?(item.body?.includes(canon(q))&&!canon(item.title).includes(canon(q))?'Найдено внутри статьи':'Статья · открыть'):item.kind==='entity'?'Объект · показать на карте':item.kind==='god'?'Божество · досье':'Материал · '+item.kind))),sourceSelection?btn('↳ Ссылка',()=>insertLink(item),'finder-attach'):null)) : el('div',{class:'finder-no-result'},'Совпадений пока нет. Поиск ничего не создаёт.')),
      el('div',{class:'finder-foot'},
        S.mode==='edit'&&q ? btn(exactArticle?'✎ Редактировать статью':'＋ Создать статью',()=>{const a=createArticle(q,exactEntity?.id||'');if(a&&sourceSelection)insertLink({title:a.title});close();if(a)openArticleEditor(a.id);},'primary'):null,
        S.mode==='edit'&&exactEntity&&!exactEntity.articleId?el('span',{class:'finder-hint'},'Статья будет привязана к объекту «'+exactEntity.name+'»'):null,
        S.mode==='edit'?btn('↻ Проверка заголовков',()=>{close();window.AvronNav?.dialog?.('audit')},'mini'):null,
        btn('Закрыть',close,'mini')
      )
    );
    const inp=modal.querySelector('#finderInput');if(inp){inp.focus();const end=inp.value.length;inp.setSelectionRange(end,end);}
  }
  function open(search='',source=null){close();sourceSelection=source&&source.selectionStart!==source.selectionEnd?{element:source,start:source.selectionStart,end:source.selectionEnd,text:String(source.value).slice(source.selectionStart,source.selectionEnd)}:null;const overlay=el('div',{class:'avron-finder-overlay',onclick:e=>{if(e.target===overlay)close();}});modal=el('section',{class:'avron-finder',role:'dialog','aria-modal':'true'});overlay.append(modal);document.body.append(overlay);modal.dataset.overlay='finder';const oldClose=close;window.__avronFinderOverlay=overlay;renderModal(search);}
  function dismiss(){document.querySelector('.avron-finder-overlay')?.remove();modal=null;}
  function navigate(name){if(String(name).startsWith('id:')){const id=String(name).slice(3);const a=(S.world.articles||[]).find(x=>x.id===id&&(S.mode!=='read'||!x.draft));if(a)return openResult({kind:'article',id:a.id,title:a.title,record:a});}const results=matches(name);const exact=results.filter(x=>canon(x.title)===canon(name));if(exact.length===1)openResult(exact[0]);else open(name);}
  // Live preview only: raw Markdown is NOT rewritten or polluted with duplicate links.
  function enhancePreview(fragment){
    const idx=makeIndex();if(!idx.items.length)return;
    const walker=document.createTreeWalker(fragment,NodeFilter.SHOW_TEXT);
    const nodes=[];let node;while((node=walker.nextNode()))nodes.push(node);
    const WORD=/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu;
    for(const textNode of nodes){
      const parent=textNode.parentElement;
      if(!parent||parent.closest('a,button,code,pre,script,style,textarea,[data-wiki],.wiki-link,h1,h2,h3,h4'))continue;
      const text=textNode.textContent;if(!text||text.length<5)continue;
      const words=[...text.matchAll(WORD)].map(m=>({v:m[0],start:m.index,end:m.index+m[0].length}));
      if(!words.length)continue;
      const segments=[];let cursor=0,found=0;
      for(let i=0;i<words.length;){let match=null,end=0;
        for(let n=Math.min(6,words.length-i);n>=1;n--){const group=words.slice(i,i+n);const value=text.slice(group[0].start,group[group.length-1].end);
          if(group.some((w,j)=>j>0 && !/^\s+$/.test(text.slice(group[j-1].end,w.start))))continue;
          const candidates=idx.map.get(canon(value));if(candidates?.length){match=candidates.find(c=>c.kind==='article')||candidates[0];end=group[group.length-1].end;break;}
        }
        if(match){if(words[i].start>cursor)segments.push(document.createTextNode(text.slice(cursor,words[i].start)));
          const link=document.createElement('span');link.className='wiki-link finder-auto-link';link.dataset.wiki=match.title;link.title='Finder: '+match.title;link.textContent=text.slice(words[i].start,end);segments.push(link);cursor=end;found++;
          while(i<words.length && words[i].start<end)i++;
        }else i++;
        if(found>=14)break;
      }
      if(found){if(cursor<text.length)segments.push(document.createTextNode(text.slice(cursor)));textNode.replaceWith(...segments);}
    }
  }
  function wireLinks(root){root.querySelectorAll('[data-wiki]').forEach(a=>{
    a.style.cursor='pointer';a.title=a.title||'Finder · найти, открыть или создать статью';
    a.onclick=e=>{e.preventDefault();e.stopPropagation();navigate(a.dataset.wiki)};
    a.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();open(a.dataset.wiki)};
  });}
  return {open,close:dismiss,createArticle,openArticleEditor,enhancePreview,wireLinks,invalidate,navigate,matches};
})();
window.AvronFinder=avronFinder;
function avronOpenOrCreateWiki(name,forceCreate=false){if(forceCreate){const a=avronFinder.createArticle(name);if(a)avronFinder.openArticleEditor(a.id);}else avronFinder.navigate(name);}
function wireWikiLinks(root){avronFinder.wireLinks(root);}
function avronWikiMenu(initial){avronFinder.open(initial||'');}
document.addEventListener('contextmenu',e=>{
  const target=e.target;
  const textarea=target.matches?.('textarea.article-editor,textarea.inp')&&target.closest?.('#tabLib,.deity-article,.timeline-editor')?target:null;
  if(!textarea&&!target.closest?.('.markdown-render,.article-preview,.lore-article,.timeline-story'))return;
  const sel=textarea?String(textarea.value||'').slice(textarea.selectionStart,textarea.selectionEnd).trim():String(window.getSelection()?.toString()||'').trim();
  if(!sel||sel.length>120)return;e.preventDefault();
  avronFinder.open(sel,textarea);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')avronFinder.close();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();avronFinder.open(String(window.getSelection()?.toString()||'').slice(0,120));}});

function renderAll() { renderWorldNav(); $('musicName').textContent = S.world.media?.music ? (S.world.media.musicName || 'Встроенная музыка') + ' · встроена в проект' : 'Музыка не выбрана'; if (previewAudio) { previewAudio.pause(); previewAudio = null; } if (S.world.media?.music) { previewAudio = new Audio(S.world.media.music); previewAudio.loop = true; } renderTop(); renderMapTree(); renderMapProps(); renderTools(); renderFilters(); renderObject(); renderLib(); renderFloat(); renderStatus(); $('worldName').value = S.world.name; $('worldId').value = S.world.id; $('q').value = S.q; setTab(S.tab); }
function loadWorld(w, msg) {
  useWorld(w); S.unsaved = false; S.uploads = {}; S.rev = {}; S.openArticleId = null;
  S.world.maps.forEach(m => { if (String(m.src || '').startsWith('data:image/')) S.uploads[m.id] = m.src; });
  if (SC) { SC.camSt = {}; SC.curMap = null; SC.openMap(S.mapId, { refit: true }); }
  renderAll();window.dispatchEvent(new Event('avron-world-loaded')); scheduleSave(); setStatus(msg || 'Мир загружен');
}
function saveFile() {
  const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(S.world, null, 2)], { type: 'application/json' })), download: (S.world.id || 'world') + '.json' });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); S.unsaved = false; renderStatus();
}
const okDiscard = () => !S.unsaved || confirm('Есть изменения, не выгруженные в JSON (в браузере они сохранены). Заменить текущий мир?');

function wireStatic() {
  $('btnNew').onclick = () => { if (okDiscard()) loadWorld(emptyWorld(), 'Новый мир'); };
  $('btnDemo').onclick = () => { if (okDiscard()) loadWorld(demoWorld(), 'Загружен демо-мир'); };
  $('btnSave').onclick = saveFile;
  $('btnLoad').onclick = () => $('worldFile').click();
  $('worldFile').onchange = async ev => {
    const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
    try { const raw = JSON.parse(await f.text()); loadWorld(sanitize(raw), raw.schemaVersion >= 2 ? 'Мир загружен' : 'Старый формат конвертирован (аудио и слои не переносятся)'); } catch (err) { alert('Не удалось загрузить: ' + err.message); }
  };
  $('addMap').onclick = addMap;
  document.querySelectorAll('.panel-section .section-heading').forEach(h=>{h.tabIndex=0;h.title='Нажмите, чтобы свернуть или развернуть';const toggle=()=>h.parentElement.classList.toggle('collapsed');h.addEventListener('click',ev=>{if(ev.target.closest('button'))return;toggle();});h.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();toggle();}});});
  document.querySelectorAll('[data-screen]').forEach(b=>b.onclick=()=>switchScreen(b.dataset.screen));
  $('addSectionNav').onclick=addWorldSection;
  $('modeEdit').onclick = () => setMode('edit'); $('modeRead').onclick = () => setMode('read');
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  const tog = (id, key) => { $(id).onchange = ev => { S[key] = ev.target.checked; SC.refresh(); renderLib(); }; };
  tog('optRel', 'showRel'); tog('optLabels', 'showLabels'); tog('optGrid', 'showGrid'); tog('optSecrets', 'showSecrets');
  $('typesAll').onclick = () => { S.hiddenTypes.clear(); SC.refresh(); renderFilters(); renderLib(); };
  $('typesNone').onclick = () => { S.world.types.forEach(t => S.hiddenTypes.add(t.id)); SC.refresh(); renderFilters(); renderLib(); };
  $('q').oninput = ev => { S.q = ev.target.value.trim(); SC.refresh(); renderLib(); renderFilters(); };
  $('worldName').oninput = ev => { S.world.name = ev.target.value; S.unsaved = true; renderStatus(); scheduleSave(); };
  const musicFile = $('musicFile');
  $('musicChoose').onclick = () => musicFile.click();
  musicFile.onchange = ev => { const f = ev.target.files[0]; ev.target.value = ''; if (!f) return; const reader = new FileReader(); reader.onload = () => { S.world.media ||= { music: '', musicName: '' }; S.world.media.music = String(reader.result); S.world.media.musicName = f.name; if (previewAudio) previewAudio.pause(); previewAudio = new Audio(S.world.media.music); previewAudio.loop = true; $('musicName').textContent = f.name + ' · встроена в проект'; S.unsaved = true; scheduleSave(); renderStatus(); }; reader.onerror = () => setStatus('Не удалось прочитать аудиофайл'); reader.readAsDataURL(f); };
  $('musicPlay').onclick = () => { const src = S.world.media?.music; if (!src) return setStatus('Сначала выберите аудиофайл'); if (!previewAudio || previewAudio.src !== src) { previewAudio = new Audio(src); previewAudio.loop = true; } previewAudio.play().then(() => setStatus('Музыка воспроизводится')).catch(() => setStatus('Браузер не смог воспроизвести этот аудиофайл')); };
  $('musicStop').onclick = () => { if (previewAudio) { previewAudio.pause(); previewAudio.currentTime = 0; } setStatus('Музыка остановлена'); };
  $('worldId').oninput = ev => { S.world.id = ev.target.value.trim() || 'world'; S.unsaved = true; renderStatus(); scheduleSave(); };
  $('fitBtn').onclick = () => SC.fitMap();

  addEventListener('keydown', ev => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName);
    if (ev.code === 'Space' && !typing) { S.space = true; ev.preventDefault(); }
    if (typing) return;
    if (ev.key === 'Escape') {
      if (S.pick) { S.pick = null; renderFloat(); } else if (SC.draft) SC.cancelDraft(); else if (S.tool !== 'select') { S.tool = 'select'; renderTools(); SC.refresh(); } else selectEntity(null);
    } else if (ev.key === 'Enter' && SC.draft) SC.finishDraft();
    else if (ev.key === 'Backspace' && SC.draft) { SC.undoDraftPoint(); ev.preventDefault(); }
    else if (ev.key === 'Delete' && S.mode === 'edit' && S.selId) deleteSelected();
  });
  addEventListener('keyup', ev => { if (ev.code === 'Space') S.space = false; });
}
