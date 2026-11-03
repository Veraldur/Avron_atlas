/* One shared, world-backed graph for Pantheon matrix and Universal Lore Atlas. */
(()=>{'use strict';
const kinds=['Боги','Страны','Храмы','Ритуалы','Артефакты','Существа','Расы','Культы','Фракции','Города','События','Персонажи','Места','Статьи'];
const uid=()=> 'lore-'+(crypto.randomUUID?.()||Math.random().toString(36).slice(2));
const selection=new Set();
let lastWorld=null;
function ensure(){
 const w=typeof S!=='undefined'?S.world:window.S?.world;if(!w)return {categories:[],nodes:[],records:[]};
 if(w!==lastWorld){selection.clear();lastWorld=w;}
 w.loreMatrix ||= {categories:[],nodes:[],records:[]};
 const d=w.loreMatrix;
 d.categories ||= [];d.nodes ||= [];d.records ||= [];
 for(const name of [...kinds,...(w.types||[]).map(t=>t.name).filter(Boolean)])if(!d.categories.some(c=>c.name.toLocaleLowerCase('ru')===name.toLocaleLowerCase('ru')))d.categories.push({id:uid(),name});
 // Import legacy belief records once. Keep their original ids and references intact.
 if(!d.migratedBeliefs)for(const old of w.beliefMatrix||[]){
   const existing=d.records.find(r=>r.id===old.id);
   if(existing)continue;
   d.records.push({...old,nodeIds:[...(old.godIds||[]).map(id=>'god:'+id),...(old.entityIds||[]).map(id=>'entity:'+id)],godIds:[...(old.godIds||[])],entityIds:[...(old.entityIds||[])]});
 }
 d.migratedBeliefs=true;
 for(const r of d.records){
   r.nodeIds=Array.isArray(r.nodeIds)?[...new Set(r.nodeIds)]:[];
   if(!r.nodeIds.length){r.nodeIds=[...(r.godIds||[]).map(id=>'god:'+id),...(r.entityIds||[]).map(id=>'entity:'+id)];}
   r.godIds=[...new Set(r.nodeIds.filter(id=>id.startsWith('god:')).map(id=>Number(id.slice(4))).filter(Number.isFinite))];
   r.entityIds=[...new Set([...(r.entityIds||[]),...r.nodeIds.filter(id=>id.startsWith('entity:')).map(id=>id.slice(7))])];
   r.published=r.published!==false;r.revealAfterRead=!!r.revealAfterRead;
 }
 return d;
}
function nodes(){const d=ensure();const cats=d.categories;const idOf=name=>cats.find(c=>c.name===name)?.id;
 const out=[...d.nodes.map(n=>({...n,source:'custom'}))];
 const w=S.world;window.PantheonGetGods?.();
 for(const g of w.pantheon||[])out.push({id:'god:'+g.id,name:g.name,categoryId:idOf('Боги'),art:g.art||'',articleId:g.articleId||'',source:'god'});
 for(const e of w.entities||[]){if(S.mode==='read'&&(e.draft||e.secret&&!S.showSecrets))continue;
 const t=(w.types||[]).find(x=>x.id===e.typeId)?.name||'';
 let cat=cats.find(c=>c.name.toLocaleLowerCase('ru')===t.toLocaleLowerCase('ru'));
 if(!cat){cat=cats.find(c=>c.name==='Места');}
 out.push({id:'entity:'+e.id,name:e.name||e.id,categoryId:cat?.id,art:e.image||'',articleId:e.articleId||'',source:'entity'});
 }
 for(const a of w.articles||[]){if(S.mode==='read'&&a.draft)continue;
 const categoryId=idOf('Статьи');if(categoryId)out.push({id:'article:'+a.id,name:a.title,categoryId,articleId:a.id,source:'article'});
 }
 return out;
}
function persist(){S.unsaved=true;window.scheduleSave?.();window.dispatchEvent(new Event('avron-archive-changed'));}
function sync(){const d=ensure();S.world.beliefMatrix=d.records.filter(r=>(r.godIds||[]).length).map(r=>({id:r.id,title:r.title,kind:r.kind,notes:r.notes,godIds:[...r.godIds],entityIds:[...(r.entityIds||[])],articleId:r.articleId,published:r.published!==false,revealAfterRead:!!r.revealAfterRead}));persist();}
function createRecord(nodeIds,title='Новое пересечение'){
 const d=ensure();const ids=[...new Set(nodeIds)];
 const r={id:uid(),title,kind:'Связь',notes:'',nodeIds:ids,godIds:ids.filter(x=>x.startsWith('god:')).map(x=>Number(x.slice(4))),entityIds:ids.filter(x=>x.startsWith('entity:')).map(x=>x.slice(7)),articleId:'',published:true,revealAfterRead:false};
 d.records.push(r);sync();return r;
}
function updateRecord(r){r.nodeIds=[...new Set(r.nodeIds||[])];r.godIds=r.nodeIds.filter(x=>x.startsWith('god:')).map(x=>Number(x.slice(4)));r.entityIds=[...new Set([...(r.entityIds||[]),...r.nodeIds.filter(x=>x.startsWith('entity:')).map(x=>x.slice(7))])];sync();}
function removeRecord(id){const d=ensure();if(window.AvronMaterials?.remove?.('lore:'+id))sync();else{d.records=d.records.filter(r=>r.id!==id);sync();}}
function visible(r){if(S.mode==='edit')return true;if(r.published===false)return false;if(r.revealAfterRead){const prerequisiteId=r.prerequisiteArticleId||r.articleId;const a=S.world.articles.find(a=>a.id===prerequisiteId);if(!a?.read)return false;}return true;}
window.AvronLoreStore={ensure,nodes,selection,persist,sync,createRecord,updateRecord,removeRecord,visible,kinds};
})();
