/* Avron XVIII: canonical section entry and linked chronicle editor. */
(()=>{'use strict';
const W=()=>window.S?.world;const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const panel=document.createElement('div');panel.id='avChronicleBridge';panel.hidden=true;document.body.append(panel);
let state=null;
function save(){S.unsaved=true;try{window.scheduleSave?.()}catch{}window.dispatchEvent(new CustomEvent('avron-showcase-updated'));window.dispatchEvent(new CustomEvent('avron-nav-updated'));}
function close(){panel.hidden=true;state=null}
function row(obj,key,label,multiline=false){return `<label><span>${label}</span>${multiline?`<textarea data-field="${key}" rows="9">${esc(obj[key]||'')}</textarea>`:`<input data-field="${key}" value="${esc(obj[key]||'')}">`}</label>`}
function editEntry(secId,id){const sec=W()?.sections?.find(x=>x.id===secId),item=sec?.entries?.find(x=>x.id===id);if(!item)return;state={kind:'entry',sec,item};paint()}
function editEvent(id){const item=W()?.entities?.find(x=>x.id===id);if(!item)return;state={kind:'event',item};paint()}
function editArticle(id){const item=W()?.articles?.find(x=>x.id===id);if(!item)return;state={kind:'article',item};paint()}
function editBook(id){const item=W()?.chronicleBooks?.find(x=>x.id===id);if(!item)return;state={kind:'book',item};paint()}
function date(e){return e.chronology?.date||e.fields?.['f-date']||e.date||''}
function paint(){if(!state||!W())return;const {kind,item,sec}=state;const editable=S.mode==='edit';panel.hidden=false;
const body=kind==='entry'?`${row(item,'title','Название экспоната')}${row(item,'body','Markdown / текст',true)}${row(item,'image','Путь или ссылка на изображение')}`:
kind==='article'?`${row(item,'title','Название статьи')}${row(item,'body','Markdown',true)}`:
kind==='event'?`${row(item,'name','Название события')}<label><span>Дата в общей хронологии</span><input data-event-date value="${esc(date(item))}" placeholder="Например, 312 г."></label>${row(item,'summary','Описание события',true)}<label><span>Статья события</span><select data-event-article><option value="">Без статьи</option>${(W().articles||[]).map(a=>`<option value="${esc(a.id)}" ${item.articleId===a.id?'selected':''}>${esc(a.title)}</option>`).join('')}</select></label>`:
`${row(item,'name','Название летописи')}${row(item,'intro','Вступление',true)}<label><span>Представление</span><select data-book-layout><option value="chronicle" ${item.layout!=='timeline'?'selected':''}>Художественная летопись</option><option value="timeline" ${item.layout==='timeline'?'selected':''}>Хронология по датам</option></select></label><label><span>Привязать событие мира</span><select data-event-pick><option value="">Выбрать…</option>${(W().entities||[]).filter(e=>(W().types||[]).some(t=>t.id===e.typeId&&t.name==='Событие')&&!item.eventIds?.includes(e.id)).map(e=>`<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('')}</select></label><button data-add-event>＋ Событие</button><div class="avcb-events">${(item.eventIds||[]).map(id=>{const e=W().entities.find(x=>x.id===id);return e?`<div><span>${esc(date(e)||'Без даты')} · ${esc(e.name)}</span><button data-open-event="${esc(id)}">✎</button><button data-unlink-event="${esc(id)}">×</button></div>`:''}).join('')}</div>`;
panel.innerHTML=`<div class="avcb-backdrop"></div><section class="avcb-window" role="dialog" aria-modal="true" aria-label="Редактор мира"><header><div><small>✦ AVRON · ЕДИНЫЙ РЕДАКТОР</small><h2>${esc(kind==='entry'?'Экспонат · '+(sec?.name||'Раздел'):kind==='event'?'Историческое событие':kind==='book'?'Летопись':'Статья')}</h2></div><button data-close>✕</button></header><div class="avcb-body">${editable?body:`<p>Для редактирования переключитесь в режим «Редактор».</p>`}${kind==='entry'?`<p class="avcb-hint">Это исходная запись раздела. Изменение сразу отражается в витрине; копия божества не создаётся.</p>`:''}</div><footer><button data-close>Закрыть</button>${editable?'<button data-save>✓ Применить</button>':''}</footer></section>`;
panel.querySelectorAll('[data-close],.avcb-backdrop').forEach(x=>x.onclick=close);
panel.querySelector('[data-save]')?.addEventListener('click',()=>{panel.querySelectorAll('[data-field]').forEach(el=>{item[el.dataset.field]=el.value});if(kind==='event'){const d=panel.querySelector('[data-event-date]').value;item.chronology||={};item.chronology.date=d;item.fields||={};item.fields['f-date']=d;item.articleId=panel.querySelector('[data-event-article]').value;}if(kind==='book'){item.layout=panel.querySelector('[data-book-layout]').value;}save();close();});
panel.querySelector('[data-add-event]')?.addEventListener('click',()=>{const id=panel.querySelector('[data-event-pick]').value;if(!id)return;item.eventIds||=[];if(!item.eventIds.includes(id))item.eventIds.push(id);save();paint()});
panel.querySelectorAll('[data-unlink-event]').forEach(b=>b.onclick=()=>{item.eventIds=item.eventIds.filter(id=>id!==b.dataset.unlinkEvent);save();paint()});
panel.querySelectorAll('[data-open-event]').forEach(b=>b.onclick=()=>{editEvent(b.dataset.openEvent)});
}
window.AvronChronicleBridge={editEntry,editEvent,editArticle,editBook,close};
// Enhance legacy chronicle cards without replacing their navigation handlers.
function enhance(){const studio=document.querySelector('#avWorldStudio');if(!studio||studio.hidden||!W())return;studio.querySelectorAll('[data-book]').forEach(x=>{if(x.querySelector('.avcb-edit-shortcut')||S.mode!=='edit')return;const b=document.createElement('span');b.className='avcb-edit-shortcut';b.textContent=' ✎';x.append(b)});
const book=studio.querySelector('.aws-edit');if(book&&S.mode==='edit'&&!book.querySelector('[data-chronicle-bridge]')){const id=(W().chronicleBooks||[]).find(b=>b.name===studio.querySelector('.aws-head h1')?.textContent)?.id;if(id){const btn=document.createElement('button');btn.textContent='✦ Единый редактор летописи';btn.dataset.chronicleBridge=id;btn.onclick=()=>editBook(id);book.prepend(btn);}}
}
const obs=new MutationObserver(()=>{if(!panel.hidden)return;enhance()});obs.observe(document.querySelector('#avWorldStudio')||document.body,{subtree:true,childList:true});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)close()});
})();