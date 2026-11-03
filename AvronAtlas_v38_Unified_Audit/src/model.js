'use strict';
/* ===== Модель данных мира (schemaVersion 2) =====
 world = {
   types:        [{id,name,color,glyph,geometry:'point'|'area',quick,fields:[{id,label,kind,options}]}],
   relationTypes:[{id,name,reverse,directed,color}],
   maps:         [{id,name,src,width,height,parentId}],
   entities:     [{id,mapId,typeId,name,summary,body,tags,fields,image,linkMapId,secret,draft, x,y | points:[[x,y]..]}],
   relations:    [{id,from,to,typeId,note}]
 }
 Точки и области — одна сущность (entity); что это, определяет geometry её типа. */

const SCHEMA = 4, LS_KEY = 'worldEditor.v3';
const LEGACY_KEYS = ['worldEditor.v2'];
const $ = id => document.getElementById(id);
const uid = () => (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hex = s => parseInt(String(s || '#999999').replace('#', ''), 16);

// S — состояние интерфейса, не попадает в JSON
const S = {
  world: null, mapId: null, selId: null,
  tool: 'select', mode: 'edit', tab: 'object',
  hiddenTypes: new Set(), q: '',
  showRel: true, showLabels: true, showGrid: false, showSecrets: false,
  pick: null, openType: null, unsaved: false,
  uploads: {}, missing: {}, rev: {}
};
// Shared state bridge for add-on editors; all screens reference this one world.
window.S = S;

function reindex() {
  const w = S.world;
  S.idx = new Map(w.entities.map(e => [e.id, e]));
  S.tix = new Map(w.types.map(t => [t.id, t]));
  S.rix = new Map(w.relationTypes.map(t => [t.id, t]));
  S.mix = new Map(w.maps.map(m => [m.id, m]));
}
const ent = id => S.idx.get(id);
const typeOf = e => S.tix.get(e.typeId);
const mapOf = id => S.mix.get(id);
const geo = e => (typeOf(e) || {}).geometry || 'point';
const label = e => e.name || (e.summary || '').replace(/\s+/g, ' ').slice(0, 30) || '(без названия)';

function matches(e) {
  if (!S.q) return true;
  const t = typeOf(e);
  return [e.name, e.summary, e.body, t && t.name, ...(e.tags || [])].join(' ').toLowerCase().includes(S.q.toLowerCase());
}
function isShown(e) {
  if (S.hiddenTypes.has(e.typeId)) return false;
  if (S.mode === 'read') {
    if (e.draft) return false;
    if (e.secret && !S.showSecrets) return false;
  }
  return matches(e);
}

/* ---- геометрия ---- */
function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const j = (i + 1) % p.length; a += p[i][0] * p[j][1] - p[j][0] * p[i][1]; } return Math.abs(a / 2); }
function inPoly(x, y, p) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
  }
  return c;
}
function centroid(p) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) {
    const j = (i + 1) % p.length, f = p[i][0] * p[j][1] - p[j][0] * p[i][1];
    a += f; cx += (p[i][0] + p[j][0]) * f; cy += (p[i][1] + p[j][1]) * f;
  }
  if (Math.abs(a) < 1e-6) return { x: p.reduce((s, q) => s + q[0], 0) / p.length, y: p.reduce((s, q) => s + q[1], 0) / p.length };
  return { x: cx / (3 * a), y: cy / (3 * a) };
}
function center(e) { return geo(e) === 'area' ? centroid(e.points) : { x: e.x, y: e.y }; }

/* ---- фабрики ---- */
function newEntity(typeId, props) {
  const t = S.tix.get(typeId);
  const e = { id: uid(), mapId: S.mapId, typeId, name: '', summary: '', body: '', tags: [], fields: {}, image: '', linkMapId: '', secret: false, draft: false, ...props };
  if (!t.quick && !e.name) e.name = t.name;
  return e;
}
function removeEntity(id) {
  const w = S.world;
  w.entities = w.entities.filter(e => e.id !== id);
  w.relations = w.relations.filter(r => r.from !== id && r.to !== id);
}
function relsOf(id) {
  return S.world.relations.map(r => {
    if (r.from !== id && r.to !== id) return null;
    const out = r.from === id, t = S.rix.get(r.typeId) || { name: '?', directed: false };
    const other = ent(out ? r.to : r.from);
    if (!other) return null;
    return { r, other, out, directed: !!t.directed, label: (out || !t.directed) ? t.name : (t.reverse || t.name) };
  }).filter(Boolean);
}
function mapChain(id) { const out = []; let m = mapOf(id), n = 0; while (m && n++ < 20) { out.unshift(m); m = m.parentId ? mapOf(m.parentId) : null; } return out; }
function descendants(id) { const out = new Set(); const walk = p => S.world.maps.forEach(m => { if (m.parentId === p && !out.has(m.id)) { out.add(m.id); walk(m.id); } }); walk(id); return out; }

/* ---- заготовки ---- */
function emptyWorld() {
  return {
    schemaVersion: SCHEMA, id: 'new-world', name: 'Новый мир',
    types: [
      { id: 't-obj', name: 'Объект', color: '#e5bd62', glyph: '●', geometry: 'point', quick: false, fields: [] },
      { id: 't-area', name: 'Область', color: '#7fc4a0', glyph: '▧', geometry: 'area', quick: false, fields: [] }
    ],
    relationTypes: [{ id: 'r-link', name: 'Связан с', reverse: '', directed: false, color: '#d6b56c' }],
    maps: [{ id: 'main', name: 'Мир', src: '', width: 6500, height: 4500, parentId: '' }],
    entities: [], relations: [],
    libraries: [{ id: 'library-main', name: 'Основная библиотека' }],
    folders: [], articles: [],
    timeline: { calendars: [], eras: [], campaigns: [], events: [] },
    sections: [{ id: 'pantheon', name: 'Пантеон', icon: '✧', layout: 'encyclopedia', entries: [] }],
    media: { music: '', musicName: '' },
    presentation: { theme: 'frutiger-aero', iconNavigation: true },
    pantheonConfigured: true, pantheon: [], chronicles: [], beliefMatrix: [], autoWikiLinks: true
  };
}

function demoWorld() {
  const w = emptyWorld();
  w.id = 'avron-demo'; w.name = 'Аврон — демо';
  w.types = [
    { id: 't-loc', name: 'Локация', color: '#e5bd62', glyph: '⌖', geometry: 'point', quick: false, fields: [
      { id: 'f-pop', label: 'Население', kind: 'number' },
      { id: 'f-kind', label: 'Вид', kind: 'select', options: ['город', 'село', 'крепость', 'руины'] }] },
    { id: 't-char', name: 'Персонаж', color: '#83b6dc', glyph: '♙', geometry: 'point', quick: false, fields: [
      { id: 'f-race', label: 'Раса', kind: 'text' }, { id: 'f-role', label: 'Роль', kind: 'text' }] },
    { id: 't-event', name: 'Событие', color: '#db8d7c', glyph: '✧', geometry: 'point', quick: false, fields: [{ id: 'f-date', label: 'Дата', kind: 'text' }] },
    { id: 't-note', name: 'Заметка', color: '#e3d9bb', glyph: '▤', geometry: 'point', quick: true, fields: [] },
    { id: 't-region', name: 'Регион', color: '#7fc4a0', glyph: '▧', geometry: 'area', quick: false, fields: [
      { id: 'f-ruler', label: 'Правитель', kind: 'text' }, { id: 'f-hostile', label: 'Опасный', kind: 'checkbox' }] }
  ];
  w.relationTypes = [
    { id: 'r-in', name: 'Находится в', reverse: 'Содержит', directed: true, color: '#9fc7a5' },
    { id: 'r-rule', name: 'Правит', reverse: 'Под властью', directed: true, color: '#e5bd62' },
    { id: 'r-ally', name: 'Союзник', reverse: '', directed: false, color: '#83b6dc' },
    { id: 'r-foe', name: 'Враг', reverse: '', directed: false, color: '#db8d7c' }
  ];
  w.maps = [
    { id: 'main', name: 'Аврон', src: 'assets/avron-map.jpg', width: 2048, height: 1536, parentId: '' },
    { id: 'anka', name: 'Долина Анки', src: '', width: 2048, height: 1536, parentId: 'main' },
    { id: 'hills', name: 'Золотые Холмы', src: '', width: 2048, height: 1536, parentId: 'main' }
  ];
  const E = (id, mapId, typeId, p) => w.entities.push({ id, mapId, typeId, name: '', summary: '', body: '', tags: [], fields: {}, image: '', linkMapId: '', secret: false, draft: false, ...p });
  E('a-anka', 'main', 't-region', { name: 'Долина Анки', linkMapId: 'anka', tags: ['восток'], summary: 'Длинный полуостров на востоке, тёплые долины и рыбацкие порты.',
    body: 'Узкая вытянутая земля, где горы подходят вплотную к морю.\nГлавный порт — [[Порт Анки]]. Здесь же ходят слухи о [[Тайник контрабандистов]].',
    fields: { 'f-ruler': 'Совет портов' }, points: [[1323, 484], [1533, 428], [1751, 347], [1929, 323], [1961, 428], [1856, 565], [1614, 621], [1420, 638], [1323, 557]] });
  E('a-hills', 'main', 't-region', { name: 'Золотые Холмы', linkMapId: 'hills', tags: ['север'], summary: 'Плодородные холмы с древней столицей.',
    body: 'Сердце старого королевства. Правит здесь [[Лорд-смотритель]] из [[Золотая Цитадель|Золотой Цитадели]].',
    fields: { 'f-ruler': 'Лорд-смотритель' }, points: [[718, 153], [904, 97], [1130, 194], [1186, 331], [1049, 395], [839, 331], [726, 234]] });
  E('a-desert', 'main', 't-region', { name: 'Плавающая Пустыня', tags: ['юг', 'опасность'], summary: 'Дюны, которые никогда не лежат на одном месте.',
    body: 'Область без детальной карты — просто статья. Нажатие на неё в режиме просмотра только выделяет её.',
    fields: { 'f-hostile': true }, points: [[331, 759], [533, 783], [726, 872], [904, 952], [1073, 1114], [1033, 1210], [839, 1162], [613, 1033], [387, 912], [323, 807]] });
  E('p-cit', 'main', 't-loc', { name: 'Золотая Цитадель', x: 880, y: 274, tags: ['столица'], summary: 'Белые стены на золотом холме.', fields: { 'f-pop': 12000, 'f-kind': 'крепость' }, body: 'Резиденция [[Лорд-смотритель|Лорда-смотрителя]].' });
  E('p-lord', 'main', 't-char', { name: 'Лорд-смотритель', x: 1010, y: 300, tags: ['правитель'], summary: 'Хранитель Золотых Холмов.', fields: { 'f-race': 'человек', 'f-role': 'правитель' } });
  E('p-port', 'main', 't-loc', { name: 'Порт Анки', x: 1500, y: 500, linkMapId: 'anka', tags: ['порт'], summary: 'Шумный порт. Нажмите «Перейти на карту».', fields: { 'f-pop': 4300, 'f-kind': 'город' } });
  E('p-smug', 'main', 't-loc', { name: 'Тайник контрабандистов', x: 1660, y: 520, secret: true, tags: ['секрет'], summary: 'Скрыт в режиме просмотра, пока не включены секреты.', fields: { 'f-kind': 'руины' } });
  E('p-battle', 'main', 't-event', { name: 'Битва у Переправы', x: 1000, y: 1120, tags: ['война'], summary: 'Событие без детальной статьи.', fields: { 'f-date': '312 г.' } });
  E('p-note', 'main', 't-note', { x: 1300, y: 960, summary: 'Тут видели дракона.\nПроверить в 3-й главе.' });
  E('p-note2', 'main', 't-note', { x: 520, y: 640, summary: 'Спросить мастера про этот перевал.' });
  E('p-pier', 'anka', 't-loc', { name: 'Причал', x: 900, y: 700, summary: 'Объект на детальной карте. Карта пока пустой холст.' });
  E('p-inn', 'anka', 't-loc', { name: 'Трактир «Сельдь»', x: 1150, y: 820, summary: 'Здесь собираются капитаны.', fields: { 'f-kind': 'село' } });
  E('p-hall', 'hills', 't-loc', { name: 'Зал совета', x: 1000, y: 760, summary: 'Детальная карта Золотых Холмов.' });
  const R = (from, to, typeId) => w.relations.push({ id: uid(), from, to, typeId, note: '' });
  R('p-lord', 'p-cit', 'r-rule'); R('p-cit', 'a-hills', 'r-in'); R('p-port', 'a-anka', 'r-in'); R('p-lord', 'p-smug', 'r-foe'); R('p-port', 'p-cit', 'r-ally');
  w.libraries=[{id:'library-main',name:'Основная библиотека'},{id:'library-history',name:'Хроники Аврона'}];
  w.folders=[{id:'folder-history',name:'История',libraryId:'library-history',parentId:''},{id:'folder-alt',name:'Альтернативные линии',libraryId:'library-history',parentId:''}];
  w.articles=[
    {id:'art-queen-base',title:'Убийцы Королев — 748 Н.Р.',libraryId:'library-history',folderId:'folder-history',draft:false,tags:['история','кризис'],body:'# Убийцы Королев\n\nВ 748 году Новой Ревизии двор северных владений содрогнулся от серии точных ударов. Две королевы-сестры были убиты в одну и ту же ночь, а их дома обвинили друг друга в заговоре.\n\n## Последствия\n\n- Золотые Холмы закрыли перевалы.\n- В Долине Анки началась охота на гонцов.\n- В столицах появились ложные манифесты, выдаваемые за королевские указы.\n\n> С этого дня говорят не о войне, а о трещине в самой идее престола.\n\n[[Золотая Цитадель]] стала местом экстренного совета.'},
    {id:'art-queen-alt',title:'Убийцы Королев — ветвь «Красный Договор»',libraryId:'library-history',folderId:'folder-alt',draft:false,tags:['альтернативная история'],body:'# Красный Договор\n\nВ альтернативной ветви покушение не разрушает союз сразу. Вместо открытой мести северные дворы идут на тайную сделку, известную как **Красный Договор**.\n\n## Отличия ветви\n\n- убийцы оказываются орудием третьей силы;\n- Анка получает право на посредничество;\n- часть крепостей Золотых Холмов остаётся открытой.\n\nИстория мира в этой ветви смещается от гражданской войны к затяжной холодной интриге.'}
  ];
  E('p-queenslayers','main','t-event',{name:'УБИЙЦЫ КОРОЛЕВ',x:1188,y:254,tags:['хронология','кризис'],summary:'748 Н.Р. · Нажмите в режиме просмотра, чтобы открыть момент истории.',fields:{'f-date':'748 Н.Р.'},timelineEventId:'ev-queen-assassins',body:'Ключевой узел истории северных владений.'});
  // Встроенная учебная запись для проверки матрицы. Это НЕ канон Аврона.
  w.articles.push({id:'art-belief-experiment',title:'Опыт веры: Буря и Призма',libraryId:'library-history',folderId:'folder-alt',draft:false,tags:['матрица','пример'],body:'# Опыт веры: Буря и Призма\n\n*Это учебная запись для тестирования матрицы, а не утверждённый лор мира.*\n\nПредставим исследователя, который сравнивает образы **Аксаара** и **Каллейдоиллюмиллона**: молния превращает ночь в мгновение ясности, а призматический свет дробит единое видение на множество.\n\n## Что может означать сочетание\n\n- Культ или философская школа, различающая откровение и иллюзию.\n- Страну, где сосуществуют разные традиции.\n- Спор двух толкований истории.\n\nМесто для примера — [[Золотая Цитадель]]. Нажмите на ссылку и проверьте Finder.\n\n**Можно изменить статью, тип пересечения и связанные объекты в редакторе Матрицы.**'});
  w.beliefMatrix=[{id:'belief-demo-prism-storm',title:'Буря и Призма · пример',kind:'Исследовательская гипотеза',notes:'Учебный пример пересечения, который можно редактировать или удалить. Не канон.',godIds:[8,19],articleId:'art-belief-experiment',entityIds:['p-cit']}];
  w.timeline={
    calendars:[{id:'cal-avron',name:'Календарь Аврона',months:[{id:'m-snow',name:'Снежник',days:27},{id:'m-thaw',name:'Талый',days:31},{id:'m-bloom',name:'Цветень',days:29},{id:'m-sun',name:'Солнцеворот',days:33},{id:'m-harvest',name:'Жатва',days:28},{id:'m-rain',name:'Ливневик',days:30}],moons:['Аурис','Вейла','Кес','Орма','Терн','Шиар']}],
    eras:[{id:'era-nr',name:'Новая Ревизия',short:'Н.Р.'}],
    campaigns:[{id:'camp-queens',name:'Северный раскол',calendarId:'cal-avron',eraId:'era-nr',description:'Прототип кампании с основной и альтернативной линией.',routes:[{id:'route-main',name:'Основная линия',kind:'prime'},{id:'route-red',name:'Красный Договор',kind:'branch'}],eventIds:['ev-queen-assassins']}],
    events:[{id:'ev-queen-assassins',campaignId:'camp-queens',title:'Убийцы Королев',slug:'Пролог кризиса',summary:'Две смерти за одну ночь меняют политическую карту севера.',year:748,monthId:'m-rain',day:12,entityId:'p-queenslayers',mapId:'main',articleId:'art-queen-base',art:'./pantheon/art/19.png',focus:{x:.58,y:.18,zoom:3.1},crop:{x:.45,y:.10,w:.28,h:.21},motion:'slow',duration:7,moons:['Аурис','Кес','Шиар'],routeDefaults:[{id:'var-red',routeId:'route-red',name:'Красный Договор',summary:'Ветка, где после убийств стороны не срываются в открытую войну.',articleId:'art-queen-alt',art:'./pantheon/art/13.png',focus:{x:.61,y:.22,zoom:3},crop:{x:.49,y:.14,w:.24,h:.18},motion:'glide',duration:8}]}]
  };
  return w;
}

/* ---- импорт / миграция ---- */
function migrateV1(o) {
  const w = emptyWorld();
  w.id = o.id || w.id; w.name = o.name || w.name; w.types = [];
  const names = { location: 'Локация', character: 'Персонаж', event: 'Событие', knowledge: 'Знание', quest: 'Задание', note: 'Текстовый блок', custom: 'Своя точка' };
  const glyph = { location: '⌖', character: '♙', event: '✧', knowledge: '◈', quest: '⚑', note: '▤', custom: '＋' };
  const m = o.map || {};
  w.maps[0] = { id: 'main', name: 'Мир', src: m.src || 'assets/avron-map.jpg', width: m.width || 2048, height: m.height || 1536, parentId: '' };
  (o.objects || []).forEach(ob => {
    const tid = 't-' + (ob.type || 'custom');
    if (!w.types.find(t => t.id === tid)) w.types.push({ id: tid, name: names[ob.type] || ob.type || 'Объект', color: ob.color || '#d6b56c', glyph: glyph[ob.type] || '●', geometry: 'point', quick: false, fields: [] });
    w.entities.push({ id: ob.id || uid(), mapId: 'main', typeId: tid, name: ob.name || '', summary: ob.subtitle || '', body: ob.description || '', tags: ob.tags || [], fields: {}, image: ob.image || '', linkMapId: '', secret: false, draft: ob.visible === false, x: Number(ob.x) || 0, y: Number(ob.y) || 0 });
  });
  if (!w.types.length) w.types = emptyWorld().types;
  return w;
}

function sanitize(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Файл не похож на мир');
  let w = (raw.schemaVersion >= 2 && Array.isArray(raw.entities)) ? raw : (Array.isArray(raw.objects) ? migrateV1(raw) : null);
  if (!w) throw new Error('Ожидался JSON мира (entities / objects)');
  w = clone(w); const base = emptyWorld();
  w.schemaVersion = SCHEMA; w.id = w.id || base.id; w.name = w.name || base.name;
  w.types = Array.isArray(w.types) && w.types.length ? w.types : base.types;
  w.relationTypes = Array.isArray(w.relationTypes) ? w.relationTypes : base.relationTypes;
  w.maps = Array.isArray(w.maps) && w.maps.length ? w.maps : base.maps;
  w.relations = Array.isArray(w.relations) ? w.relations : [];
  w.libraries = Array.isArray(w.libraries) && w.libraries.length ? w.libraries : [{ id: 'library-main', name: 'Основная библиотека' }];
  w.folders = Array.isArray(w.folders) ? w.folders : [];
  w.articles = Array.isArray(w.articles) ? w.articles : [];
  w.storyForgeTables = w.storyForgeTables && typeof w.storyForgeTables === 'object' && !Array.isArray(w.storyForgeTables) ? w.storyForgeTables : {};
  w.timeline = w.timeline && typeof w.timeline === 'object' ? w.timeline : { calendars: [], eras: [], campaigns: [], events: [] };
  w.autoWikiLinks = w.autoWikiLinks!==false;
  if (w.id === 'new-world') {
    w.presentation ||= base.presentation;
    w.pantheonConfigured = true;
  }
  w.pantheon = Array.isArray(w.pantheon) ? w.pantheon : [];
  w.beliefMatrix = Array.isArray(w.beliefMatrix) ? w.beliefMatrix : [];
  w.beliefMatrix.forEach(r=>{r.id ||= uid();r.title ||= 'Пересечение';r.kind ||= 'Культ';r.notes ||= '';r.godIds = [...new Set((r.godIds||[]).map(Number))];r.entityIds = Array.isArray(r.entityIds)?r.entityIds:[];r.articleId ||= '';r.published = r.published!==false;});
  w.chronicles = Array.isArray(w.chronicles) ? w.chronicles : null;
  w.media = w.media && typeof w.media === 'object' ? w.media : { music: '', musicName: '' };
  w.media.music ||= ''; w.media.musicName ||= '';
  w.timeline.calendars ||= []; w.timeline.eras ||= []; w.timeline.campaigns ||= []; w.timeline.events ||= []; w.timeline.moonArticles ||= [];
  w.timeline.calendars.forEach(c=>{ c.id ||= uid(); c.name ||= 'Календарь'; c.months = Array.isArray(c.months) ? c.months : []; c.moons = Array.isArray(c.moons) ? c.moons : []; c.months.forEach(m=>{ m.id ||= uid(); m.name ||= 'Месяц'; m.days = Math.max(1, Number(m.days)||30); }); });
  w.timeline.eras.forEach(er=>{ er.id ||= uid(); er.name ||= 'Эра'; er.short ||= er.name; });
  w.timeline.campaigns.forEach(c=>{ c.id ||= uid(); c.name ||= 'Кампания'; c.calendarId ||= w.timeline.calendars[0]?.id || ''; c.eraId ||= w.timeline.eras[0]?.id || ''; c.routes = Array.isArray(c.routes) ? c.routes : []; c.routes.forEach((r,i)=>{ r.id ||= uid(); r.name ||= i===0 ? 'Основная линия' : 'Ветвь'; r.kind ||= i===0 ? 'prime' : 'branch'; }); c.eventIds = Array.isArray(c.eventIds) ? c.eventIds : []; });
  w.timeline.events.forEach(ev=>{ ev.id ||= uid(); ev.title ||= 'Событие'; ev.summary ||= ''; ev.slug ||= ''; ev.campaignId ||= w.timeline.campaigns[0]?.id || ''; ev.entityId ||= ''; ev.mapId ||= w.maps[0]?.id || 'main'; ev.articleId ||= ''; ev.routeDefaults = Array.isArray(ev.routeDefaults) ? ev.routeDefaults : []; ev.monthId ||= ''; ev.day = Number(ev.day)||1; ev.year = Number(ev.year)||0; ev.focus = ev.focus && typeof ev.focus==='object' ? ev.focus : {x:.5,y:.5,zoom:2.2}; ev.art ||= ''; ev.moons = Array.isArray(ev.moons) ? ev.moons : []; ev.routeDefaults.forEach(v=>{ v.id ||= uid(); v.routeId ||= ''; v.name ||= ''; v.articleId ||= ''; v.summary ||= ''; v.art ||= ''; v.focus = v.focus && typeof v.focus==='object' ? v.focus : {x:ev.focus.x,y:ev.focus.y,zoom:ev.focus.zoom}; }); });
  w.timeline.events.forEach(ev=>{const cal=w.timeline.calendars.find(c=>c.id===w.timeline.campaigns.find(k=>k.id===ev.campaignId)?.calendarId);const mon=cal?.months?.find(m=>m.id===ev.monthId);ev.day=Math.max(1,Math.min(Number(mon?.days)||100,Number(ev.day)||1));});
  w.sections = Array.isArray(w.sections) ? w.sections : [];
  w.showcases=Array.isArray(w.showcases)?w.showcases:[];w.chronicleBooks=Array.isArray(w.chronicleBooks)?w.chronicleBooks:[];w.interfaceSlots=w.interfaceSlots&&typeof w.interfaceSlots==='object'?w.interfaceSlots:{};
  w.sections.forEach(sec => { sec.id ||= uid(); sec.name ||= 'Раздел'; sec.icon ||= '▤'; sec.layout ||= 'encyclopedia'; sec.entries = Array.isArray(sec.entries) ? sec.entries : []; sec.entries.forEach(a => { a.id ||= uid(); a.title ||= 'Новая запись'; a.body ||= ''; a.blocks = Array.isArray(a.blocks) ? a.blocks : []; }); });
  const libraryIds = new Set(w.libraries.map(x => x.id));
  w.folders.forEach(f => { f.id ||= uid(); f.name ||= 'Папка'; if (!libraryIds.has(f.libraryId)) f.libraryId = w.libraries[0].id; f.parentId ||= ''; });
  w.articles.forEach(a => { a.id ||= uid(); a.title ||= 'Новая статья'; a.body ||= ''; a.libraryId = libraryIds.has(a.libraryId) ? a.libraryId : w.libraries[0].id; a.folderId ||= ''; a.tags ||= []; a.draft = !!a.draft; });
  const tIds = new Set(w.types.map(t => t.id)), mIds = new Set(w.maps.map(m => m.id));
  w.types.forEach(t => { t.fields = t.fields || []; t.geometry = t.geometry === 'area' ? 'area' : 'point'; t.color = t.color || '#d6b56c'; t.glyph = t.glyph || '●'; });
  w.maps.forEach(m => { m.width = m.width || 2048; m.height = m.height || 1536; m.src = m.src || ''; if (!mIds.has(m.parentId) || m.parentId === m.id) m.parentId = ''; });
  w.entities.forEach(e => {
    e.id = e.id || uid(); if (!mIds.has(e.mapId)) e.mapId = w.maps[0].id;
    if (!tIds.has(e.typeId)) { tIds.add(e.typeId); w.types.push({ id: e.typeId, name: 'Без типа', color: '#999999', glyph: '?', geometry: Array.isArray(e.points) ? 'area' : 'point', quick: false, fields: [] }); }
    e.tags = e.tags || []; e.fields = e.fields || {}; e.popup = e.popup && typeof e.popup === 'object' ? e.popup : { enabled: false, orientation: 'landscape', width: 500, height: 500, blocks: [] }; e.popup.blocks = Array.isArray(e.popup.blocks) ? e.popup.blocks : []; e.name = e.name || ''; e.summary = e.summary || ''; e.body = e.body || '';
    if (!mIds.has(e.linkMapId)) e.linkMapId = '';
    const t = w.types.find(x => x.id === e.typeId);
    if (t.geometry === 'area') { if (!Array.isArray(e.points) || e.points.length < 3) e.points = [[0, 0], [200, 0], [200, 200]]; } else { e.x = Number(e.x) || 0; e.y = Number(e.y) || 0; }
  });
  const eIds = new Set(w.entities.map(e => e.id));
  w.relations = w.relations.filter(r => eIds.has(r.from) && eIds.has(r.to));
  return w;
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }

function restoreWorld() {
  try { const s = localStorage.getItem(LS_KEY) || LEGACY_KEYS.map(k => localStorage.getItem(k)).find(Boolean); if (s) return sanitize(JSON.parse(s)); } catch (e) { /* ignore */ }
  return null;
}
function useWorld(w) {
  S.world = w; reindex();
  S.mapId = w.maps[0].id; S.selId = null; S.tool = 'select'; S.pick = null; S.hiddenTypes = new Set(); S.q = '';
}
