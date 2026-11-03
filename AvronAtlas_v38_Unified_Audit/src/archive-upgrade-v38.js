/* AvronAtlas v38: non-destructive upgrade of an older saved Avron. Opt-in only. */
(()=>{'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const source=()=>window.AvronDefaultWorld;
const world=()=>window.S?.world;
const packArticle=a=>String(a.sourceKind||'').startsWith('foundry-')||a.id==='av38-test-chronicle-article';
const onlyTest=x=>String(x.id||'').startsWith('av38-test-');
const key=r=>typeof r==='string'?r:r?.kind&&r?.id!=null?r.kind+':'+r.id:'';
function merge(){
 const w=world(),pkg=source();if(!w||!pkg||w.id!=='avron-demo')throw Error('Откройте Аврон, прежде чем переносить архивы 1.33');
 const result={articles:0,folders:0,media:0,books:0,scenes:0,lore:0,links:0,keptExisting:0};
 const imported=new Set();
 for(const a of pkg.articles||[])if(packArticle(a))imported.add(a.id);
 const collection=(target,arr,filter,field)=>{
   const dest=target[field]||=([]),seen=new Set(dest.map(x=>String(x.id)));
   for(const obj of arr||[]){if(!filter(obj))continue;if(seen.has(String(obj.id))){result.keptExisting++;continue;}dest.push(clone(obj));seen.add(String(obj.id));result[field==='articles'?'articles':field==='folders'?'folders':field==='chronicleBooks'?'books':'scenes']++;}
 };
 collection(w,pkg.folders,f=>String(f.id||'').startsWith('folder-v38-'),'folders');
 collection(w,pkg.articles,packArticle,'articles');
 collection(w,pkg.chronicleBooks,onlyTest,'chronicleBooks');
 collection(w,pkg.chronicles||[],onlyTest,'chronicles');
 w.loreMatrix||={categories:[],nodes:[],records:[]};w.loreMatrix.records||=[];
 const ids=new Set(w.loreMatrix.records.map(x=>String(x.id)));
 for(const rec of pkg.loreMatrix?.records||[])if(onlyTest(rec)&&!ids.has(rec.id)){w.loreMatrix.records.push(clone(rec));result.lore++;}
 const known=(type,id)=>{
   if(type==='entity')return (w.entities||[]).some(x=>String(x.id)===id);
   if(type==='article')return (w.articles||[]).some(x=>String(x.id)===id);
   if(type==='book')return (w.chronicleBooks||[]).some(x=>String(x.id)===id);
   if(type==='lore')return (w.loreMatrix?.records||[]).some(x=>String(x.id)===id);
   return window.AvronMaterials?.has?.(type+':'+id);
 };
 const exists=ref=>{const k=key(ref),p=k.indexOf(':');return p>0&&known(k.slice(0,p),k.slice(p+1))};
 w.contentLinks||={};
 for(const [from,entries]of Object.entries(pkg.contentLinks||{})){
   const sourceIsNew=from.startsWith('article:')&&imported.has(from.slice(8))||from.startsWith('av38-test-')||from==='book:av38-test-chronicle'||from==='lore:av38-test-intersection';
   if(!exists(from))continue;
   for(const entry of entries||[]){const dest=key(entry),isImported=dest.startsWith('article:')&&imported.has(dest.slice(8))||dest.includes('av38-test-');
     if(!sourceIsNew&&!isImported||!exists(dest))continue;
     const links=w.contentLinks[from]||=[];
     if(!links.some(x=>key(x)===dest)){links.push(clone(entry));result.links++;}
   }
 }
 for(const pkgEntity of pkg.entities||[]){const a=pkgEntity.articleId;
   if(!a||!imported.has(a)||!known('article',String(a)))continue;
   const entity=(w.entities||[]).find(x=>String(x.id)===String(pkgEntity.id));
   if(!entity)continue;
   const article=(w.articles||[]).find(x=>x.id===a);
   if(!entity.articleId)entity.articleId=a;
   article.parentRefs||=[];const parent='entity:'+entity.id;if(!article.parentRefs.includes(parent))article.parentRefs.push(parent);
 }
 w.archiveImport=clone(pkg.archiveImport||{version:38});
 window.AvronMaterials?.changed?.();window.renderAll?.();
 return result;
}
window.AvronArchiveUpgrade={merge};
const panel=document.getElementById('avFilesPanel');
if(panel){const b=document.createElement('button');b.type='button';b.textContent='↓ Добавить архивы Аврона 1.33 (без замены)';b.title='Перенести 885 страниц и ссылки в текущий сохранённый Аврон, сохранив существующие правки';
 b.onclick=()=>{panel.hidden=true;
   if(!confirm('Добавить архивы 1.33 в текущий Аврон? Существующие статьи и правки останутся нетронутыми. Рекомендуется сначала экспортировать резервный JSON.'))return;
   try{const r=merge();alert(`Импорт завершён: добавлено ${r.articles} статей, ${r.folders} папок и ${r.links} связей. Сохраните обновлённый JSON.`)}catch(e){alert('Ошибка импорта: '+e.message);console.error(e)}
 };panel.append(b);
}
})();
