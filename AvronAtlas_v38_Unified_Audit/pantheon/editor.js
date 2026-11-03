/* Authoring tools for map/chronicle slides, local persistence and JSON exchange. */
(()=>{
'use strict';
const KEY='avron-cinematics-v1';
const el=id=>document.getElementById(id);
const deep=x=>JSON.parse(JSON.stringify(x));
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const newId=()=>`cin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
const starter=()=>{const d=window.PantheonCinematicDefaults();return {...d,id:'akssaar'}};
const normalize=scene=>{const s=window.PantheonNormalizeCinematic?window.PantheonNormalizeCinematic(scene):({...starter(),...scene});s.published=scene?.published!==false;s.category=s.category??'Сказания';s.catalogDescription=s.catalogDescription??'';s.timelineRef=s.timelineRef&&typeof s.timelineRef==='object'?s.timelineRef:{};s.sortOrder=Number.isFinite(Number(s.sortOrder))?Number(s.sortOrder):0;return s};
const names=()=>window.PantheonGetGods?.().map(g=>g.name)||(window.PantheonGodNames||[]);
const effects=()=>window.PantheonEffectNames||{};
const bgModes=()=>window.PantheonBackgroundModes||{map:'Только карта'};
const roman=n=>window.PantheonRoman?window.PantheonRoman(n):String(n);
const effectOptions=value=>Object.entries(effects()).map(([id,label])=>`<option value="${id}" ${value===id?'selected':''}>${label}</option>`).join('');
const bgModeOptions=value=>Object.entries(bgModes()).map(([id,label])=>`<option value="${id}" ${value===id?'selected':''}>${label}</option>`).join('');
function make(id,name,godId,accent,effect,secondaryEffect,introLabel,introTitle,introText,chapters,visualPatch={}){
  const a=starter();
  return normalize({...deep(a),id,name,godId,accent,effect,secondaryEffect,introLabel,introTitle,introText,brand:'АВРОН / '+name.toUpperCase(),chapters,visual:{...a.visual,...visualPatch}});
}
const samples=()=>[
 normalize(starter()),
 make('spectrum-demo','Сад расщеплённого света',19,'#d9a4ff','spectrum','bloom','XIX · КАЛЛЕЙДОИЛЛЮМИЛЛОН','Там, где свет становится множеством','Не всякий свет указывает путь. Иногда он открывает тысячи дорог разом.',[
 {label:'ПРОЛОГ · ПРИЗМА',title:'Осколки единого света',text:'Говорят, в неведомой глубине свет однажды встретил самого себя и перестал быть единым. Он разошёлся цветами, как расходятся пути во сне, и каждый оттенок стал обещанием другого мира. Где один видел пустоту, другой различал сад, а третий — лестницу в бесконечность.'},
 {label:'КНИГА I · ЦВЕТЕНИЕ',title:'Сад невозможных оттенков',text:'На камнях распускались не цветы, но подобия воспоминаний о них. Они не знали времён года и не спрашивали, где кончается подземелье. Их лепестки светились такими красками, которым никто ещё не придумал названия.'}],
 {mode:'split',gradientA:'#160c1f',gradientB:'#744c9c',gradientOpacity:52,splitPos:56,splitFeather:10,artOpacity:82,artBlur:12,effectHue:18,sceneSaturation:114}),
 make('dream-demo','Порог сна',2,'#a4a1e8','dream','celestial','II · ЭЛА','В час между явью и сном','Ночь укрывает мир, но не все дороги исчезают во тьме.',[
 {label:'ПРОЛОГ · СОН',title:'Невидимая тропа',text:'Когда огни домов угасают, мир не становится пустым. Под закрытыми веками открываются незримые двери, и за ними знакомые места принимают новые имена. Так начинается сказание о дороге, которую невозможно пройти с открытыми глазами.'},
 {label:'КНИГА I · ЗВЁЗДЫ',title:'Тихие созвездия',text:'Ни одна звезда не торопила путника. Время там текло не по часам, а по переменам света, и всякое воспоминание отбрасывало длинную синюю тень.'}],
 {mode:'overlay',gradientA:'#0c1330',gradientB:'#5d4da1',gradientOpacity:44,artOpacity:58,artBlur:18,effectHue:0}),
 make('serpent-demo','Шёпот первородной формы',12,'#8fc781','serpent','shadow','XII · ГИХРЕЗАЙ','Закон, скрытый под чешуёй','Природа повторяет свои формы — но никогда не повторяет их совершенно.',[
 {label:'ПРОЛОГ · ПРОИСХОЖДЕНИЕ',title:'След змеиной тропы',text:'Прежде чем дать существу имя, мир пробует его очертания. И снова среди тысяч путей проступает гибкая линия, чешуя, яд и способность оставлять прежнюю оболочку позади. Одни назовут это замыслом, другие — безжалостным испытанием жизни.'},
 {label:'КНИГА I · ОТБОР',title:'Кому дано пережить перемену',text:'Никакая форма не обещает вечности. Змея сбрасывает кожу, чудовище обретает новые пасти, и каждая перемена несёт одновременно спасение и угрозу. Так легенды связывают яд с самой способностью мира становиться другим.'}],
 {mode:'split',gradientA:'#08140f',gradientB:'#2b5220',gradientOpacity:40,splitPos:48,effectHue:36,artBlur:14}),
 make('war-demo','Испытание: хроника войны',8,'#e88a65','war','shadow','ХРОНИКА · БИТВА','Пепел над полем','Технический образец эффекта войны — без утверждения о культе или историческом событии.',[
 {label:'ОБРАЗЕЦ · СОБЫТИЕ',title:'Когда умолкли знамена',text:'Пепел кружился в сумерках. Железо остывало, и на поле сражения уже нельзя было различить, где закончился приказ и началась человеческая судьба. Летописец записал имена — прежде чем ночь стёрла следы.'}],
 {mode:'overlay',gradientA:'#140904',gradientB:'#7c2d16',gradientOpacity:48,artOpacity:45,artBlur:9,effectHue:0})
].concat(S?.world?.timeline?.events?.some(e=>e.id==='ev-queen-assassins')?[
 {...make('queen-event-chronicle','Летопись: Убийцы Королев',0,'#e3c38e','shadow','none','748 Н.Р.','Ночь двух королев','Летописец помнит ночь, после которой старые клятвы перестали значить прежнее.',[
 {label:'748 Н.Р. · ЛИВНЕВИК',title:'Убийцы Королев',text:'В одну ночь два двора лишились своих королев. Гонцы пересекали перевалы, и никто уже не знал, кому следует верить. Этот демонстрационный фрагмент связан с событием на временной шкале; его можно переписать в редакторе.'},
 {label:'ХРОНИКА · ПОСЛЕДСТВИЯ',title:'Когда двери закрылись',text:'Перевалы Золотых Холмов замолчали, а в долине Анки появились ложные манифесты. Всякий путник стал подозреваемым, всякая печать — поводом для сомнения.'}
 ],{mode:'split',splitPos:56,gradientA:'#17272f',gradientB:'#56412e'}),ending:'close',timelineRef:{eventId:'ev-queen-assassins',routeId:'route-main'}}
]:[]);
let collection=[],current='akssaar',slide=0,root=null,drag=null,dirty=false;
// Migration: old local-only scenes are imported once into the world document.
function ensureWorldScenes(){
  if(!S?.world)return;
  const w=S.world;
  if(!Array.isArray(w.chronicles)||!w.chronicles.length){
    let legacy=null;
    try{const old=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(old?.scenes)&&old.scenes.length)legacy=old.scenes}catch{}
    w.chronicles=(legacy||samples()).map(normalize);
  }
  collection=w.chronicles;
  if(!collection.length){collection.push(...samples())}
  if(!collection.some(x=>x.id===current))current=collection[0].id;
}
ensureWorldScenes();
function refreshWorld(){ensureWorldScenes(); if(root&&!root.hidden)render()}
window.addEventListener('avron-world-loaded',refreshWorld);
const chosen=()=>collection.find(x=>x.id===current)||collection[0];
function save(){
  if(S?.world){S.world.chronicles=collection;S.unsaved=true;if(typeof scheduleSave==='function')scheduleSave()}
  dirty=false;status('Изменения входят в JSON мира');
  window.dispatchEvent(new Event('avron-archive-changed'));
}
function status(s){const box=root?.querySelector('#ceStatus');if(box)box.textContent=s}
function getVisual(scene){scene.visual={...starter().visual,...scene.visual};return scene.visual}
function show(){if(S?.mode==='read'){window.PantheonChronicleLibrary?.open();return}ensureWorldScenes();if(!root){root=document.createElement('section');root.id='cinematicEditor';root.className='ce-screen';root.hidden=true;document.body.appendChild(root)}root.hidden=false;document.body.classList.add('cinematic-editor-open');render()}
function hide(){if(root)root.hidden=true;document.body.classList.remove('cinematic-editor-open')}
function field(label,key,type='text',extra=''){const scene=chosen();return `<label class="ce-field"><span>${label}</span><input data-field="${key}" type="${type}" value="${esc(scene[key])}" ${extra}></label>`}
function vField(label,key,min,max,step,suffix=''){const v=getVisual(chosen());return `<label class="ce-field"><span>${label}</span><input data-vnum="${key}" type="number" value="${Number(v[key]??0)}" min="${min}" max="${max}" step="${step}">${suffix?`<small>${suffix}</small>`:''}</label>`}
function timelineRefEditor(scene){
 const t=S.world.timeline||{},events=t.events||[],camp=t.campaigns||[],ref=scene.timelineRef||{};
 const selectedEvent=events.find(e=>e.id===ref.eventId);
 const c=camp.find(x=>x.id===(selectedEvent?.campaignId||ref.campaignId));
 const routes=c?.routes||[];
 const date=window.AvronChronicleLinks?.resolve(scene)?.label||'Без даты';
 return `<div class="ce-section-top"><span>ХРОНОЛОГИЯ / ПРИВЯЗКА ЛЕТОПИСИ</span><span>Дата наследуется от события</span></div>
 <div class="ce-form-grid"><label class="ce-field"><span>Связать с событием</span><select data-tref="eventId"><option value="">— Самостоятельная летопись —</option>${events.map(e=>`<option value="${esc(e.id)}" ${e.id===ref.eventId?'selected':''}>${esc(e.title)} · ${e.year}</option>`).join('')}</select></label>
 <label class="ce-field"><span>Ветка события</span><select data-tref="routeId"><option value="">Основная линия / общая</option>${routes.map(r=>`<option value="${esc(r.id)}" ${r.id===ref.routeId?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label>
 <label class="ce-field"><span>Кампания для самостоятельной даты</span><select data-tref="campaignId"><option value="">— Без кампании —</option>${camp.map(x=>`<option value="${esc(x.id)}" ${x.id===ref.campaignId?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
 <label class="ce-field"><span>Год (если нет события)</span><input data-tref="year" type="number" value="${ref.year??''}" ${selectedEvent?'disabled':''}></label>
 <label class="ce-field"><span>Месяц</span><select data-tref="monthId" ${selectedEvent?'disabled':''}><option value="">—</option>${((t.calendars||[]).find(x=>x.id===c?.calendarId)?.months||[]).map(m=>`<option value="${esc(m.id)}" ${m.id===ref.monthId?'selected':''}>${esc(m.name)}</option>`).join('')}</select></label>
 <label class="ce-field"><span>День</span><input data-tref="day" type="number" min="1" value="${ref.day??''}" ${selectedEvent?'disabled':''}></label></div>
 <div class="ce-timeline-hint"><strong>✦ ${esc(date)}</strong><span>${selectedEvent?'Дата и кампания берутся из выбранного события и обновляются вместе с ним.':'Можно задать собственную дату или выбрать событие выше.'}</span>${selectedEvent?`<button id="ceJumpTimeline">↗ К событию</button>`:''}</div>`;
}
function render(){
  const c=normalize(chosen());Object.assign(chosen(),c);const v=getVisual(c);
  slide=Math.max(0,Math.min(slide,c.chapters.length-1));const s=c.chapters[slide];
  const customArtInfo=v.backgroundArt?`<div class="ce-art-preview"><img src="${esc(v.backgroundArt)}" alt="Фон-арт"><span>Загружен собственный фон-арт</span></div>`:`<div class="ce-art-placeholder">Если свой арт не загружен, редактор использует портрет выбранного бога как второй фоновый слой.</div>`;
  root.innerHTML=`<header class="ce-header"><div><small>АВРОН / ИНСТРУМЕНТЫ АТЛАСА</small><h1>Редактор летописей <i>✦</i></h1></div><div class="ce-head-actions"><button id="cePlay" class="ce-gold">▶ Предпросмотр</button><button id="ceExport">↓ Экспорт JSON</button><button id="ceImport">↑ Импорт JSON</button><button id="ceClose">✕ Закрыть</button></div></header>
  <div class="ce-work"><aside class="ce-sidebar"><div class="ce-side-head">СЦЕНЫ <button id="ceAddScene">＋</button></div><div class="ce-scenes">${collection.map(v=>`<button class="ce-scene ${v.id===current?'on':''}" data-scene="${esc(v.id)}"><span>✦</span><span>${esc(v.name)}<small>${esc(window.PantheonGetGods().find(g=>g.id===v.godId)?.name||'')}</small></span></button>`).join('')}</div><button id="ceDuplicate" class="ce-side-button">⧉ Дублировать сцену</button><button id="ceDelete" class="ce-side-button ce-danger">Удалить сцену</button><div class="ce-tip">Изменения автоматически сохраняются в браузере. Чтобы переносить проект между устройствами — экспортируйте JSON.</div></aside>
  <main class="ce-main">
  <div class="ce-section-top"><span>01 / НАСТРОЙКА СЦЕНЫ</span><span id="ceStatus">Готово к редактированию</span></div>
  <div class="ce-form-grid">${field('Название синематика','name')}<label class="ce-field"><span>Божество / портрет</span><select data-field="godId"><option value="0" ${!c.godId?'selected':''}>— Без божества · историческая летопись —</option>${window.PantheonGetGods().map((g,i)=>`<option value="${g.id}" ${c.godId===g.id?'selected':''}>${roman(i+1)} · ${esc(g.name)}</option>`).join('')}</select></label>${field('Заголовок в углу','brand')}${field('Акцентный цвет','accent','color')}<label class="ce-field"><span>После последнего слайда</span><select data-field="ending"><option value="article" ${c.ending==='article'?'selected':''}>Открыть досье</option><option value="close" ${c.ending==='close'?'selected':''}>Просто закрыть</option></select></label></div>

  <div class="ce-section-top"><span>ВИТРИНА / ОФОРМЛЕНИЕ ЧИТАТЕЛЬСКОГО МЕНЮ</span><span>Настраивает карточку в каталоге</span></div>
  <div class="ce-form-grid"><label class="ce-check"><input data-field="published" type="checkbox" ${c.published!==false?'checked':''}> Показывать читателям</label>${field('Раздел библиотеки','category')}${field('Порядок карточки (число)','sortOrder','number','step="1"')}<label class="ce-field ce-wide"><span>Краткая аннотация каталога</span><textarea data-field="catalogDescription" rows="3">${esc(c.catalogDescription||'')}</textarea></label></div>
  ${timelineRefEditor(c)}
  <div class="ce-section-top"><span>02 / ИНТРО И БИБЛИОТЕКА ЭФФЕКТОВ</span><span>Два независимых слоя, молнии только у «Бури»</span></div>
  <div class="ce-form-grid"><label class="ce-field"><span>Основной эффект</span><select data-field="effect">${effectOptions(c.effect||'storm')}</select></label><label class="ce-field"><span>Дополнительный эффект</span><select data-field="secondaryEffect">${effectOptions(c.secondaryEffect||'none')}</select></label><label class="ce-field ce-wide"><span>Выразительность эффекта (0–100%)</span><input type="range" min="0" max="100" step="1" data-field="effectIntensity" value="${Number(c.effectIntensity??65)}"></label></div>
  <div class="ce-presets"><span>Быстро выбрать:</span>${[['storm','none','Гроза'],['spectrum','bloom','Призма + цветение'],['dream','celestial','Мир снов'],['serpent','shadow','Змеи + тень'],['war','shadow','Война'],['bloom','none','Цветение'],['celestial','none','Звёзды'],['none','none','Без эффектов']].map(([a,b,n])=>`<button data-preset="${a}:${b}" class="${c.effect===a&&c.secondaryEffect===b?'on':''}">${n}</button>`).join('')}</div>
  <div class="ce-three-grid"><label class="ce-field"><span>Сдвиг цвета эффекта, °</span><input data-vrange="effectHue" type="range" min="0" max="360" step="1" value="${Number(v.effectHue)}"></label><label class="ce-field"><span>Насыщенность эффекта, %</span><input data-vrange="effectSaturation" type="range" min="0" max="250" step="1" value="${Number(v.effectSaturation)}"></label><label class="ce-field"><span>Контраст эффекта, %</span><input data-vrange="effectContrast" type="range" min="0" max="250" step="1" value="${Number(v.effectContrast)}"></label></div>
  <div class="ce-chapter-fields ce-intro-fields"><label class="ce-field"><span>Малая надпись на вступлении (аркан, дата, подпись)</span><input data-field="introLabel" value="${esc(c.introLabel||'')}"></label><label class="ce-field"><span>Большой заголовок интро</span><input data-field="introTitle" value="${esc(c.introTitle||'')}"></label><label class="ce-field"><span>Текст интро — показывается во время приближения карты</span><textarea data-field="introText" rows="3">${esc(c.introText||'')}</textarea></label></div>

  <div class="ce-section-top"><span>03 / КОМПОЗИЦИЯ ФОНА И ГРАДИЕНТЫ</span><span>Карта, второй арт и разделитель</span></div>
  <div class="ce-form-grid"><label class="ce-field"><span>Режим фона</span><select data-vfield="mode">${bgModeOptions(v.mode)}</select></label><label class="ce-field"><span>Стиль разделителя</span><select data-vfield="dividerStyle"><option value="ornate" ${v.dividerStyle==='ornate'?'selected':''}>Световой орнамент</option><option value="soft" ${v.dividerStyle==='soft'?'selected':''}>Мягкая дымка</option><option value="line" ${v.dividerStyle==='line'?'selected':''}>Тонкая линия</option></select></label><label class="ce-field"><span>Градиент A</span><input data-vfield="gradientA" type="color" value="${esc(v.gradientA)}"></label><label class="ce-field"><span>Градиент B</span><input data-vfield="gradientB" type="color" value="${esc(v.gradientB)}"></label><label class="ce-field ce-wide"><span>Сила градиента, %</span><input data-vrange="gradientOpacity" type="range" min="0" max="100" step="1" value="${Number(v.gradientOpacity)}"></label></div>
  <div class="ce-map-row ce-art-row"><div class="ce-map-settings ce-art-tools"><label class="ce-field"><span>Путь / URL второго фонового арта</span><input data-vfield="backgroundArt" value="${esc(v.backgroundArt||'')}" placeholder="Оставьте пустым, чтобы использовать портрет бога"></label><div class="ce-inline-actions"><button id="ceArtUpload">🖼 Загрузить изображение</button><button id="ceArtClear" ${v.backgroundArt?'':'disabled'}>Сбросить свой арт</button></div>${customArtInfo}<div class="ce-tip">Можно вставить URL или путь к изображению, либо загрузить локальный файл. Он будет сохранён в сцене и экспортируется в JSON как data URL.</div></div><div class="ce-map-settings"><div class="ce-two">${vField('Позиция разделителя, %','splitPos',10,90,1)}${vField('Мягкость шва, условн. ед.','splitFeather',0,20,1)}</div><div class="ce-three-grid">${vField('Яркость сцены, %','sceneBrightness',40,180,1)}${vField('Контраст сцены, %','sceneContrast',40,220,1)}${vField('Насыщенность сцены, %','sceneSaturation',0,220,1)}</div><div class="ce-three-grid">${vField('Прозрачность карты, %','mapOpacity',0,100,1)}${vField('Прозрачность арта, %','artOpacity',0,100,1)}${vField('Размытие арта, px','artBlur',0,40,1)}</div><div class="ce-two">${vField('Масштаб арта, %','artScale',100,170,1)}${vField('Размытие эффектов, px','effectBlur',0,18,1)}</div></div></div>

  <div class="ce-section-top"><span>04 / ОБЛАСТЬ КАРТЫ</span><span>Точный холст и старый ручной выбор</span></div><button id="ceOpenStudio" class="ce-gold ce-open-studio">▣ Открыть точную монтажную область · карта / арт / 16:9</button>
  <div class="ce-map-row"><div class="ce-map-select" id="ceMapSelect" role="img" aria-label="Карта. Выбор области приближения"><img id="ceMapImage" src="${esc(c.source||'./assets/avron-map.jpg')}" alt="Карта Аврона"><div class="ce-map-rect" id="ceMapRect"></div><div class="ce-map-cross">✧</div></div><div class="ce-map-settings"><label class="ce-field"><span>Источник карты (путь или URL)</span><input data-field="source" value="${esc(c.source)}"></label><div class="ce-two">${field('Длительность приближения, мс','introMs','number','min="300" max="20000" step="100"')}${field('Масштаб финала','zoom','number','min="1" max="14" step="0.1"')}</div><div class="ce-two"><label class="ce-field"><span>Центр X, %</span><input id="ceMapX" type="number" value="${(c.map.x*100).toFixed(2)}" min="0" max="100" step="0.01"></label><label class="ce-field"><span>Центр Y, %</span><input id="ceMapY" type="number" value="${(c.map.y*100).toFixed(2)}" min="0" max="100" step="0.01"></label></div><div class="ce-two"><label class="ce-field"><span>Ширина рамки, %</span><input id="ceMapW" type="number" value="${(c.map.w*100).toFixed(2)}" min="0.1" max="100" step="0.01"></label><label class="ce-field"><span>Высота рамки, %</span><input id="ceMapH" type="number" value="${(c.map.h*100).toFixed(2)}" min="0.1" max="100" step="0.01"></label></div><p class="ce-tip">Рамка определяет цель приближения; её размер также подбирает масштаб. Портрет появится после вступления.</p></div></div>

  <div class="ce-section-top"><span>05 / СВЯЗИ С МИРОМ И СТАТЬЯМИ</span><span>Переносится вместе с JSON атласа</span></div>
  <div class="ce-form-grid"><label class="ce-field"><span>Статьи энциклопедии (несколько: Ctrl/Shift)</span><select id="ceSceneArticles" multiple size="7">${(S.world.articles||[]).map(a=>`<option value="${esc(a.id)}" ${(c.articleIds||[]).includes(a.id)?'selected':''}>${esc(a.title)}</option>`).join('')}</select></label><label class="ce-field"><span>Объекты карты (несколько: Ctrl/Shift)</span><select id="ceSceneEntities" multiple size="7">${S.world.entities.map(e=>`<option value="${esc(e.id)}" ${(c.entityIds||[]).includes(e.id)?'selected':''}>${esc(e.name||e.id)}</option>`).join('')}</select></label></div>
  <div class="ce-section-top"><span>06 / СЛАЙДЫ ЛЕТОПИСИ</span><span>${c.chapters.length} страниц</span></div>
  <div class="ce-slides" id="ceSlides">${c.chapters.map((v,i)=>`<button data-slide="${i}" class="ce-slide ${i===slide?'on':''}"><small>${String(i+1).padStart(2,'0')}</small><span>${esc(v.title||'Без названия')}</span></button>`).join('')}<button id="ceAddSlide" class="ce-add-slide">＋ Добавить</button></div>
  <div class="ce-slide-toolbar"><strong>Страница ${slide+1}</strong><div><button data-move="-1" ${slide===0?'disabled':''}>← Раньше</button><button data-move="1" ${slide===c.chapters.length-1?'disabled':''}>Позже →</button><button id="ceCopySlide">⧉ Копия</button><button id="ceRemoveSlide" ${c.chapters.length===1?'disabled':''}>✕ Удалить</button></div></div>
  <div class="ce-chapter-fields"><label class="ce-field"><span>Надпись над заголовком</span><input data-chapter="label" value="${esc(s.label)}"></label><label class="ce-field"><span>Заголовок</span><input data-chapter="title" value="${esc(s.title)}"></label><label class="ce-field"><span>Текст рассказчика</span><textarea rows="8" data-chapter="text">${esc(s.text)}</textarea></label></div>

  <div class="ce-section-top"><span>07 / ТЕМП ЧТЕНИЯ</span></div>
  <div class="ce-form-grid">${field('Миллисекунд на символ','typingMs','number','min="5" max="150" step="1"')}${field('Пауза между страницами, мс','autoDelayMs','number','min="100" max="30000" step="100"')}<label class="ce-check"><input data-field="autoAdvance" type="checkbox" ${c.autoAdvance?'checked':''}> Автоматически листать страницы</label></div>
  <div class="ce-bottom"><button id="ceSave" class="ce-gold">✓ Сохранить</button><button id="cePlayBottom">▶ Воспроизвести сцену</button><span>Пробел / Enter — продолжить во время просмотра</span></div>
  </main></div>
  <input id="ceInput" type="file" accept=".json,application/json" hidden><input id="ceArtInput" type="file" accept="image/*" hidden>`;
  bind();drawRect();
}
function drawRect(){const c=chosen(),rect=el('ceMapRect');if(!rect)return;rect.style.left=`${(c.map.x-c.map.w/2)*100}%`;rect.style.top=`${(c.map.y-c.map.h/2)*100}%`;rect.style.width=`${c.map.w*100}%`;rect.style.height=`${c.map.h*100}%`}
function update(fn,rebuild=false){fn(chosen());dirty=true;save();if(rebuild)render();else drawRect()}
function updateVisual(key,val,rebuild=false){update(c=>{const v=getVisual(c);v[key]=val},rebuild)}
function bind(){
  root.querySelector('#ceOpenStudio')?.addEventListener('click',()=>window.AvronStudio?.open(chosen(),chosen()));
  root.querySelector('#ceClose').onclick=hide;root.querySelector('#cePlay').onclick=play;root.querySelector('#cePlayBottom').onclick=play;root.querySelector('#ceSave').onclick=save;
  root.querySelector('#ceAddScene').onclick=()=>{const d=normalize(starter());d.id=newId();d.name='Новая летопись';d.effect='none';d.secondaryEffect='none';d.introLabel='ПРОЛОГ';d.introTitle='Новое сказание';d.introText='';d.brand='АВРОН / ЛЕТОПИСЬ';d.chapters=[{label:'ПРОЛОГ',title:'Новое сказание',text:'Здесь начинается новая история.'}];collection.push(d);current=d.id;slide=0;save();render()};
  root.querySelector('#ceDuplicate').onclick=()=>{const copy=deep(chosen());copy.id=newId();copy.name+=' — копия';collection.push(copy);current=copy.id;save();render()};
  root.querySelector('#ceDelete').onclick=()=>{if(collection.length===1){status('Нельзя удалить единственную сцену');return}if(!confirm('Удалить выбранную сцену?'))return;collection=collection.filter(c=>c.id!==current);current=collection[0].id;slide=0;save();render()};
  root.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{current=b.dataset.scene;slide=0;save();render()});
  root.querySelectorAll('[data-tref]').forEach(input=>input.addEventListener('change',()=>{const c=chosen();c.timelineRef||={};c.timelineRef[input.dataset.tref]=input.dataset.tref==='year'||input.dataset.tref==='day'?(input.value===''?null:Number(input.value)):input.value;if(input.dataset.tref==='eventId'){c.timelineRef.routeId='';}save();render();}));
  root.querySelector('#ceJumpTimeline')?.addEventListener('click',()=>{const ref=chosen().timelineRef||{};hide();window.AvronTimeline?.openEventById?.(ref.eventId,ref.routeId);});
  root.querySelectorAll('[data-field]').forEach(input=>{input.addEventListener(input.type==='range'?'input':'change',()=>{let val=input.type==='checkbox'?input.checked:input.type==='number'||input.type==='range'?Number(input.value):input.value;update(c=>{c[input.dataset.field]=val},['godId','name','source'].includes(input.dataset.field))})});
  root.querySelectorAll('[data-vfield]').forEach(input=>{input.addEventListener(input.type==='color'?'input':'change',()=>updateVisual(input.dataset.vfield,input.value,['mode','dividerStyle','backgroundArt'].includes(input.dataset.vfield)))});
  root.querySelectorAll('[data-vnum]').forEach(input=>input.addEventListener('change',()=>updateVisual(input.dataset.vnum,Number(input.value))));
  root.querySelectorAll('[data-vrange]').forEach(input=>input.addEventListener('input',()=>updateVisual(input.dataset.vrange,Number(input.value))));
  root.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const [effect,secondaryEffect]=b.dataset.preset.split(':');update(c=>{c.effect=effect;c.secondaryEffect=secondaryEffect},true)});
  root.querySelectorAll('[data-chapter]').forEach(input=>input.addEventListener('input',()=>{update(c=>c.chapters[slide][input.dataset.chapter]=input.value);const tab=root.querySelector(`[data-slide="${slide}"] span`);if(tab)tab.textContent=chosen().chapters[slide].title||'Без названия'}));
  root.querySelectorAll('[data-slide]').forEach(b=>b.onclick=()=>{slide=Number(b.dataset.slide);render()});
  root.querySelector('#ceAddSlide').onclick=()=>{update(c=>{c.chapters.splice(slide+1,0,{label:'НОВАЯ ГЛАВА',title:'Название главы',text:'Текст новой главы…'});slide++},true)};
  root.querySelector('#ceRemoveSlide').onclick=()=>{if(chosen().chapters.length===1)return;update(c=>{c.chapters.splice(slide,1);slide=Math.min(slide,c.chapters.length-1)},true)};
  root.querySelector('#ceCopySlide').onclick=()=>{update(c=>{c.chapters.splice(slide+1,0,deep(c.chapters[slide]));slide++},true)};
  root.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{let target=slide+Number(b.dataset.move);if(target<0||target>=chosen().chapters.length)return;update(c=>{[c.chapters[slide],c.chapters[target]]=[c.chapters[target],c.chapters[slide]];slide=target},true)});
  root.querySelector('#ceMapX').onchange=e=>update(c=>c.map.x=Math.max(0,Math.min(1,Number(e.target.value)/100)));
  root.querySelector('#ceMapY').onchange=e=>update(c=>c.map.y=Math.max(0,Math.min(1,Number(e.target.value)/100)));
  for(const [key,dim] of [['ceMapW','w'],['ceMapH','h']])root.querySelector('#'+key).onchange=e=>update(c=>c.map[dim]=Math.max(.001,Math.min(1,Number(e.target.value)/100)));
  const map=root.querySelector('#ceMapSelect');
  map.addEventListener('pointerdown',e=>{if(e.button!==0)return;const b=map.getBoundingClientRect();const p={x:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))};drag={start:p,now:p,id:e.pointerId};map.setPointerCapture(e.pointerId);mapPointer(p,false)});
  map.addEventListener('pointermove',e=>{if(!drag)return;const b=map.getBoundingClientRect();drag.now={x:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))};mapPointer(drag.now,false)});
  map.addEventListener('pointerup',e=>{if(!drag)return;mapPointer(drag.now,true);drag=null});
  root.querySelector('#ceExport').onclick=exportJSON;root.querySelector('#ceImport').onclick=()=>el('ceInput').click();root.querySelector('#ceInput').onchange=importJSON;
  for(const [key,field] of [['ceSceneArticles','articleIds'],['ceSceneEntities','entityIds']]){root.querySelector('#'+key)?.addEventListener('change',e=>update(c=>{c[field]=Array.from(e.target.selectedOptions).map(o=>o.value)}))}
  root.querySelector('#ceArtUpload').onclick=()=>el('ceArtInput').click();
  root.querySelector('#ceArtClear').onclick=()=>{updateVisual('backgroundArt','',true)};
  root.querySelector('#ceArtInput').onchange=importArt;
}
function mapPointer(p,done){if(!drag)return;const a=drag.start;let w=Math.abs(p.x-a.x),h=Math.abs(p.y-a.y);const c=chosen();c.map.x=(a.x+p.x)/2;c.map.y=(a.y+p.y)/2;if(w>.025&&h>.025){c.map.w=w;c.map.h=h;c.zoom=Math.min(14,Math.max(1.1,Math.min(1/w,1/h)*.9))}else if(done){c.map.x=p.x;c.map.y=p.y}drawRect();if(done){save();render()}else{el('ceMapX').value=(c.map.x*100).toFixed(2);el('ceMapY').value=(c.map.y*100).toFixed(2);el('ceMapW').value=(c.map.w*100).toFixed(2);el('ceMapH').value=(c.map.h*100).toFixed(2)}}
function play(){save();window.PantheonStartCinematic?.(deep(chosen()))}
function exportJSON(){save();const blob=new Blob([JSON.stringify({schemaVersion:2,kind:'avron-chronicles',current,scenes:collection},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='avron-chronicles.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)}
async function importJSON(e){const f=e.target.files?.[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!Array.isArray(data.scenes)||!data.scenes.length)throw Error('Ожидается JSON со списком scenes');const clean=data.scenes.filter(c=>c&&typeof c.name==='string'&&Number(c.godId)>=0&&Number(c.godId)>=0&&Array.isArray(c.chapters)&&c.chapters.length).map(normalize);if(!clean.length)throw Error('В файле нет корректных сцен');collection=clean;S.world.chronicles=collection;current=clean.some(c=>c.id===data.current)?data.current:clean[0].id;slide=0;save();render();status(`Загружено сцен: ${clean.length}`)}catch(err){status('Ошибка импорта: '+err.message)}e.target.value=''}
async function importArt(e){const f=e.target.files?.[0];if(!f)return;try{const dataUrl=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result||''));r.onerror=()=>rej(r.error||Error('Не удалось прочитать файл'));r.readAsDataURL(f)});updateVisual('backgroundArt',dataUrl,true);status('Фон-арт добавлен в сцену')}catch(err){status('Ошибка загрузки изображения: '+err.message)}e.target.value=''}
function createForEvent(eventId,routeId=''){ensureWorldScenes();const event=S.world.timeline?.events?.find(e=>e.id===eventId);if(!event)return null;const c=normalize({...starter(),id:newId(),name:'Летопись · '+event.title,godId:0,ending:'close',effect:'none',secondaryEffect:'none',category:'История',introLabel:String(event.year||''),introTitle:event.title,introText:event.summary||'',brand:'АВРОН / ХРОНИКА',timelineRef:{eventId:event.id,routeId},chapters:[{label:'ИСТОРИЯ · '+event.year,title:event.title,text:event.summary||'Здесь начинается рассказ об этом событии.'}],source:S.world.maps.find(m=>m.id===event.mapId)?.src||'./assets/avron-map.jpg',visual:{...starter().visual,mode:'map'}});collection.push(c);current=c.id;slide=0;save();show();return c;}
function openScene(id){ensureWorldScenes();if(collection.some(x=>x.id===id)){current=id;slide=0;}show();}
window.PantheonCinematics={open:show,openScene,close:hide,createForEvent,getActive:()=>deep(chosen()),getAll:()=>deep(collection),getScene:id=>deep(collection.find(c=>c.id===id)||chosen()),play,refreshWorld};
const nav=document.querySelector('#worldNav');const b=document.createElement('button');b.id='cinematicEditorNav';b.className='only-edit';b.textContent='✎ Редактор летописей';nav.insertBefore(b,document.querySelector('#customNav'));b.onclick=show;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root&&!root.hidden&&!document.getElementById('pantheonCinematic'))hide()});
})();
