/* Avron XXXI — explicit offline worlds and one predictable route history. No server required for application data. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const empty=()=>typeof emptyWorld==='function'?emptyWorld():null;
const builtIn=()=>window.AvronDefaultWorld;
let hasIndexedSave=false;const savedExists=()=>{try{return hasIndexedSave||!!(localStorage.getItem('worldEditor.v3')||localStorage.getItem('worldEditor.v2'))}catch{return hasIndexedSave}};
const splash=document.createElement('section');splash.id='av31WorldChooser';splash.setAttribute('aria-label','Выбор мира');splash.innerHTML=`<div class="av31-start">
 <div class="av31-start-top"><span>✦ AVRON ATLAS</span><small>АТЛАС МИРОВ · OFFLINE EDITION</small></div>
 <div class="av31-start-hero"><div class="av31-rune">✧</div><small>ВЫБЕРИ, С КАКОГО МИРА НАЧАТЬ</small><h1>Открой мир</h1><p>Создай новый мир с чистого листа или войди в Аврон со всеми его картами, статьями и витринами. Сохранение доступно в JSON без аккаунта и интернета.</p></div>
 <div class="av31-world-grid">
  <button type="button" data-world="avron" class="av31-world-card av31-world-avron"><span class="av31-card-number">01 / ГОТОВЫЙ МИР</span><strong>✦ Аврон</strong><span>Авторские карты, регионы, Пантеон, залы, приключения и связи.</span><b>Открыть Аврон →</b></button>
  <button type="button" data-world="new" class="av31-world-card av31-world-new"><span class="av31-card-number">02 / С НУЛЯ</span><strong>＋ Новый мир</strong><span>Чистый атлас и редакторы, без авторских материалов и разделов.</span><b>Создать мир →</b></button>
 </div><div class="av31-resume" data-resume-row hidden><span>Обнаружено предыдущее локальное сохранение в этом браузере.</span><button type="button" data-world="resume">↶ Продолжить сохранённый мир</button></div>
 <div class="av31-start-warning" aria-live="polite" hidden></div><footer>Все изображения и скрипты находятся в проекте. Локальное сохранение не заменяет резервный JSON.</footer></div>`;
document.body.append(splash);
function showChooser(){splash.hidden=false;splash.querySelector('[data-resume-row]').hidden=!savedExists();splash.querySelector('.av31-start-warning').hidden=true;window.AvronPersistence?.restore?.().then(w=>{hasIndexedSave=!!w;if(!splash.hidden)splash.querySelector('[data-resume-row]').hidden=!savedExists();}).catch(console.warn);}
async function commitWorld(which){
 const original=which==='new'?empty():which==='avron'?builtIn():(await window.AvronPersistence?.restore?.())||(typeof restoreWorld==='function'?restoreWorld():null);
 if(!original){warn('Мир не найден. Проверьте, что проект распакован полностью.');return}
 if(typeof loadWorld!=='function'||typeof sanitize!=='function'){warn('Не удалось вызвать загрузчик мира. Проверьте скрипты в index.html.');return}
 try{loadWorld(sanitize(JSON.parse(JSON.stringify(original))),which==='avron'?'Загружен Аврон':which==='new'?'Новый мир создан':'Восстановлено локальное сохранение');
 splash.hidden=true;if(which==='new'&&typeof setMode==='function')setMode('edit');window.AvronHistory?.reset();window.AvronHub?.show();
 }catch(err){warn('Ошибка загрузки мира: '+err.message);console.error(err)}
}
function warn(message){const box=splash.querySelector('.av31-start-warning');box.hidden=false;box.replaceChildren();const t=document.createElement('span');t.textContent=message;box.append(t)}
let armed='';
splash.querySelectorAll('[data-world]').forEach(b=>b.addEventListener('click',()=>{
 const choice=b.dataset.world;
 // Loading an example over a current local save is destructive; ask in our own UI instead of browser confirm.
 if(choice!=='resume'&&savedExists()&&armed!==choice){armed=choice;const box=splash.querySelector('.av31-start-warning');box.hidden=false;box.innerHTML='<strong>В браузере уже есть локальная копия.</strong> Выгрузи её JSON перед заменой. <button type="button" data-confirm>Подтвердить замену</button> <button type="button" data-cancel>Отмена</button>';box.querySelector('[data-confirm]').onclick=()=>{armed='';commitWorld(choice)};box.querySelector('[data-cancel]').onclick=()=>{armed='';box.hidden=true};return;
 }
 armed='';commitWorld(choice);
}));
window.AvronWorldChooser={open:showChooser,newWorld:()=>commitWorld('new'),avron:()=>commitWorld('avron')};
showChooser();
// The navigation history wraps the original engines: it does not replace them.
const toolbar=document.createElement('div');toolbar.id='av31History';toolbar.innerHTML='<button type="button" data-nav="back" title="На предыдущий материал (Alt+←)" disabled>← Назад</button><button type="button" data-nav="forward" title="Вернуться вперёд (Alt+→)" disabled>Вперёд →</button><button type="button" data-nav="world" title="Выбрать мир">◈ Миры</button><span data-path>Главный зал</span>';document.body.append(toolbar);
let current={kind:'view',id:'home'},back=[],forward=[],depth=0,restoring=false;
const eq=(a,b)=>a?.kind===b?.kind&&String(a?.id)===String(b?.id);
function label(r){if(!r)return '';if(r.kind==='view')return ({home:'Главный зал',map:'Карта',encyclopedia:'Статьи',chronicles:'Хронология',showcase:'Витрины',adventure:'Приключения',pantheon:'Пантеон', 'city-explorer':'Исследование городов',relicary:'Реликварий'})[r.id]||r.id;
 const a=window.AvronNav?.item?.(r.kind,r.id);return a?.name||a?.title||r.id;}
function update(){toolbar.querySelector('[data-nav="back"]').disabled=!back.length;toolbar.querySelector('[data-nav="forward"]').disabled=!forward.length;toolbar.querySelector('[data-path]').textContent=label(current)}
function record(route){if(!route||!route.id||restoring||depth>0||!splash.hidden||eq(current,route))return;back.push(current);if(back.length>160)back.shift();current=route;forward=[];update()}
function reset(){back=[];forward=[];current={kind:'view',id:'home'};update()}
function wrap(owner,key,route){const original=owner?.[key];if(typeof original!=='function'||original.__av31Wrapped)return;
 function wrapper(...args){const nested=depth>0;depth++;let result;try{result=original.apply(this,args)}finally{depth--;}if(!nested&&result!==false){const target=route(...args);record(target)}return result}
 wrapper.__av31Wrapped=true;owner[key]=wrapper;
}
function slotRoute(id){if(!id)return null;const a=String(id),at=a.indexOf(':');if(at>0){const k=a.slice(0,at),v=a.slice(at+1);return{kind:({chronicle:'book'}[k]||k),id:v}}return{kind:'view',id:a==='showcases'?'showcase':a}}
wrap(window.AvronNav,'open',ref=>typeof ref==='string'?slotRoute(ref):ref?.kind&&ref?.id?{kind:ref.kind,id:ref.id}:null);
wrap(window.AvronSlots,'go',slotRoute);
wrap(window.AvronHub,'enter',id=>({kind:'view',id:id==='showcases'?'showcase':id}));
wrap(window.AvronHub,'show',()=>({kind:'view',id:'home'}));
wrap(window.AvronExplorer,'open',id=>id?{kind:'node',id}:null);
wrap(window.AvronAdventures,'open',id=>id?{kind:'room',id}:{kind:'view',id:'adventure'});
wrap(window.AvronShowcase,'open',id=>id?{kind:'showcase',id}:{kind:'view',id:'showcase'});
wrap(window.AvronWorldStudio,'openBook',id=>id?{kind:'book',id}:null);
function cleanViews(){
 window.AvronExplorer?.close?.();window.AvronAdventures?.close?.();
 const showcase=document.getElementById('avronShowcase');if(showcase&&!showcase.hidden)showcase.querySelector('[data-close]')?.click();
 const studio=document.getElementById('avWorldStudio');if(studio&&!studio.hidden)studio.querySelector('[data-close]')?.click();
}
function navigate(route){if(!route)return;restoring=true;depth++;try{
 cleanViews();
 if(route.kind==='view'){
  if(route.id==='home')window.AvronHub?.show();
  else if(route.id==='adventure')window.AvronAdventures?.open();
  else if(route.id==='showcase')window.AvronShowcase?.open();
  else if(route.id==='relicary')window.AvronRelicary?.open();
  else if(route.id==='city-explorer')window.AvronExplorer?.open('city-amena');
  else window.AvronHub?.enter(route.id);
 }else window.AvronNav?.open(route);
 }catch(err){console.error('History navigation failed',route,err);window.AvronConsole?.log?.('error',err.message)}finally{depth--;restoring=false;update()}}
function goBack(){if(!back.length)return;forward.push(current);current=back.pop();navigate(current)}
function goForward(){if(!forward.length)return;back.push(current);current=forward.pop();navigate(current)}
toolbar.querySelector('[data-nav="back"]').onclick=goBack;toolbar.querySelector('[data-nav="forward"]').onclick=goForward;toolbar.querySelector('[data-nav="world"]').onclick=showChooser;
window.addEventListener('keydown',ev=>{if(ev.altKey&&!ev.ctrlKey&&!ev.metaKey&&ev.key==='ArrowLeft'){ev.preventDefault();goBack()}else if(ev.altKey&&!ev.ctrlKey&&!ev.metaKey&&ev.key==='ArrowRight'){ev.preventDefault();goForward()}});
window.addEventListener('avron-world-loaded',reset);
window.AvronHistory={record,reset,back:goBack,forward:goForward,prepare(kind){if(kind!=='article')window.AvronArticleStudio?.close?.();if(kind!=='lore')document.getElementById('avronMatrix')?.remove();if(!['node','room','showcase'].includes(kind))cleanViews();},state:()=>({current,back:[...back],forward:[...forward]})};update();
})();
