/* Aether III interaction layer — UI state only, the map engine remains untouched. */
(()=>{'use strict';
const workspace=document.getElementById('workspace'),map=document.querySelector('.map-area');if(!workspace||!map)return;
const left=document.createElement('button'),right=document.createElement('button');
left.className='avron-rail-toggle left-toggle';right.className='avron-rail-toggle right-toggle';
left.title='Скрыть или показать карты и инструменты';right.title='Скрыть или показать библиотеку и свойства';
left.setAttribute('aria-label',left.title);right.setAttribute('aria-label',right.title);
const toggle=(side,button)=>{const key='av-'+side+'-folded';workspace.classList.toggle(key);button.textContent=workspace.classList.contains(key)?(side==='left'?'❯':'❮'):(side==='left'?'❮':'❯');button.setAttribute('aria-expanded',String(!workspace.classList.contains(key)));window.dispatchEvent(new Event('resize'));};
left.onclick=()=>toggle('left',left);right.onclick=()=>toggle('right',right);map.append(left,right);
left.textContent='❮';right.textContent='❯';
const select=document.createElement('div');select.className='avron-backdrop-select';select.hidden=true;select.innerHTML='<span>✦ За картой</span><select aria-label="Оформление пространства карты"><option value="night">Звёздная синева</option><option value="nebula">Космический туман</option><option value="parchment">Древний пергамент</option></select><button title="Закрыть настройку">✕</button>';document.body.append(select);
let bg='night';try{bg=localStorage.getItem('avron-map-background')||bg}catch{};
function applyBg(v){map.classList.remove('av-bg-night','av-bg-nebula','av-bg-parchment');map.classList.add('av-bg-'+v);document.documentElement.dataset.avMapBackground=v;select.querySelector('select').value=v;try{localStorage.setItem('avron-map-background',v)}catch{}}
applyBg(bg);select.querySelector('select').onchange=e=>applyBg(e.target.value);select.querySelector('button').onclick=()=>select.hidden=true;
const nav=document.getElementById('worldNav');const more=document.createElement('button');more.id='avronMoreNav';more.textContent='☷ Меню';more.title='Дополнительная навигация и оформление';nav?.after(more);more.hidden=true;
const popup=document.createElement('div');popup.id='avronNavPopup';popup.hidden=true;document.body.append(popup);
function buildMenu(){popup.replaceChildren();const theme=document.createElement('button');theme.textContent='✧ Фон вокруг карты';theme.onclick=()=>{select.hidden=!select.hidden;popup.hidden=true;};popup.append(theme);const both=document.createElement('button');both.textContent='⛶ Режим обзора карты';both.onclick=()=>{if(!workspace.classList.contains('av-left-folded'))left.click();if(!workspace.classList.contains('av-right-folded'))right.click();popup.hidden=true};popup.append(both);const create=document.createElement('button');create.textContent='✦ Мастерская витрин';create.onclick=()=>{window.AvronShowcase?.open();popup.hidden=true};if(!document.body.classList.contains('read'))popup.append(create)}
more.onclick=()=>{if(popup.hidden)buildMenu();popup.hidden=!popup.hidden};document.addEventListener('click',e=>{if(!popup.contains(e.target)&&e.target!==more)popup.hidden=true});
// Knowledge discovery: announce only actual transitions from unread to read.
const toast=document.createElement('div');toast.className='avron-knowledge-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');document.body.append(toast);
let readBefore=new Set();function seed(){readBefore=new Set(((typeof S!=="undefined"?S.world?.articles:[])||[]).filter(a=>a.read).map(a=>a.id))}
seed();window.addEventListener('avron-world-loaded',seed);
let toastTimer;window.addEventListener('avron-archive-changed',()=>{const articles=(typeof S!=="undefined"?S.world?.articles:[])||[];const now=new Set(articles.filter(a=>a.read).map(a=>a.id));const newly=[...now].filter(id=>!readBefore.has(id));readBefore=now;if(!newly.length)return;const unlocked=((typeof S!=="undefined"?S.world?.loreMatrix?.records:[])||[]).filter(r=>r.revealAfterRead&&newly.includes(r.prerequisiteArticleId||r.articleId));if(!unlocked.length)return;toast.innerHTML='<span>✦ НОВОЕ ЗНАНИЕ ОТКРЫТО</span><strong>'+unlocked.length+' новых связей</strong><small>Открой Атлас связей, чтобы исследовать находку</small>';toast.classList.add('shown');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('shown'),6500)});
// Start with the atlas unobstructed; clicking a rail opens the contextual tools.
if(innerWidth>=1100){right.click();}
})();
