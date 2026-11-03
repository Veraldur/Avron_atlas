/* AvronAtlas v38: one creation/link/audit facade for existing editor engines.
 * Canonical records stay in their original arrays. UI engines are adapters, never copies.
 */
(()=>{'use strict';
const W=()=>window.S?.world;
const R=()=>window.AvronRegistry;
const parse=r=>{if(!r)return null;if(typeof r==='string'){const i=r.indexOf(':');return i>0?{kind:r.slice(0,i),id:r.slice(i+1)}:null}return r.id==null?null:{kind:r.kind||r.type,id:String(r.id)}};
const key=r=>{const x=parse(r);return x?x.kind+':'+x.id:null};
const entity=r=>{const k=key(r);return k?R()?.item(k):null};
const has=r=>!!entity(r);
const gen=prefix=>prefix+'-'+(window.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2));
function changed(){const s=window.S;if(s){s.unsaved=true;window.scheduleSave?.();window.AvronFinder?.invalidate?.();}window.dispatchEvent(new Event('avron-archive-changed'));window.dispatchEvent(new Event('avron-nav-updated'))}
function attach(from,to,{label=''}={}){
 const a=parse(from),b=parse(to);if(!a||!b||!has(a)||!has(b)||key(a)===key(b))return false;
 const w=W();w.contentLinks||={};const start=key(a),end=key(b),links=w.contentLinks[start]||=[];
 const prev=links.some(x=>key(x)===end);if(!prev)links.push({kind:b.kind,id:b.id,label:label||entity(b)?.title||entity(b)?.name||''});
 if(b.kind==='article'){
   const art=entity(b);art.parentRefs||=[];if(!art.parentRefs.includes(start))art.parentRefs.push(start);
   const original=entity(a);
   if(a.kind==='book'){original.articleIds||=[];if(!original.articleIds.includes(b.id))original.articleIds.push(b.id)}
   if(a.kind==='lore'&&!original.articleId)original.articleId=b.id;
   if(a.kind==='entity'&&!original.articleId)original.articleId=b.id;
   if(a.kind==='god'&&!original.articleId)original.articleId=b.id;
 }
 if(!prev)changed();return true;
}
function detach(from,to){const a=parse(from),b=parse(to);if(!a||!b||!W())return false;
 const start=key(a),end=key(b),list=W().contentLinks?.[start];if(Array.isArray(list))W().contentLinks[start]=list.filter(v=>key(v)!==end);
 if(b.kind==='article'){
  const art=entity(b);if(art)art.parentRefs=(art.parentRefs||[]).filter(k=>k!==start);
  const record=entity(a);if(record&&a.kind==='book')record.articleIds=(record.articleIds||[]).filter(id=>String(id)!==b.id);
  if(record&&a.kind==='lore'&&String(record.articleId)===b.id)record.articleId='';
  if(record&&['entity','god'].includes(a.kind)&&String(record.articleId)===b.id)record.articleId='';
 }
 changed();return true;
}
function create(kind,opts={}){
 const w=W();if(!w||window.S?.mode!=='edit')return null;
 const name=String(opts.title||opts.name||'Новый материал').trim();if(!name)return null;
 const parents=Array.isArray(opts.parents)?opts.parents:[];let obj=null,collection=null;
 if(kind==='article'){
  obj=R()?.create?.({title:name,parents:[],draft:opts.draft??true,libraryId:opts.libraryId,folderId:opts.folderId});
 }else if(kind==='book'){
  obj={id:gen('book'),name,icon:'◷',layout:'chronicle',visible:true,intro:'',eventIds:[],articleIds:[]};collection=w.chronicleBooks||=[];
 }else if(kind==='showcase'){
  obj={id:gen('showcase'),name,icon:'◈',source:opts.source||'entities',layout:opts.layout||'gallery',typeId:opts.typeId||'',ratio:'landscape',order:[],frame:'gothic',ambience:'celestial',visible:true,artOverrides:{}};collection=w.showcases||=[];
 }else if(kind==='section'){
  obj={id:gen('section'),name,icon:'✧',layout:'encyclopedia',entries:[]};collection=w.sections||=[];
 }else if(kind==='entry'){
  const section=(w.sections||[]).find(x=>String(x.id)===String(opts.sectionId));if(!section)return null;
  obj={id:gen('entry'),title:name,body:'',image:'',blocks:[]};section.entries||=[];collection=section.entries;
 }else if(kind==='room'){
  obj={id:gen('adv'),name,kind:opts.roomKind||'story',entityId:opts.entityId||'',subtitle:'',tagline:'',pitch:'',prelude:'',current:'',cover:'',features:[],dangers:[],hooks:[],roles:[],cast:[]};collection=w.adventureRooms||=[];
 }else if(kind==='node'){
  obj={id:gen('node'),title:name,name,kind:'zone',description:'',links:[],hotspots:[],entityId:opts.entityId||''};collection=w.explorerNodes||=[];
 }else if(kind==='lore'){
  const d=w.loreMatrix||=( {categories:[],nodes:[],records:[]} );
  obj={id:gen('lore'),title:name,kind:'Связь',nodeIds:opts.nodeIds||[],entityIds:[],godIds:[],articleId:'',published:true,revealAfterRead:false};collection=d.records||=[];
 }else if(kind==='loreNode'){
  const d=w.loreMatrix||=( {categories:[],nodes:[],records:[]} );
  obj={id:gen('loreNode'),name,categoryId:opts.categoryId||'',articleId:''};collection=d.nodes||=[];
 }else if(kind==='chronicle'){
  const defaults=window.PantheonCinematicDefaults?.()||{};
  const raw={...defaults,id:gen('cin'),name,category:'История',godId:0,published:true,ending:'close',introTitle:name,introText:'',chapters:[{label:'ПРОЛОГ',title:name,text:''}]};
  obj=window.PantheonNormalizeCinematic?.(raw)||raw;collection=w.chronicles||=[];
 }else if(kind==='god'){
  const id=Math.max(0,...(w.pantheon||[]).map(g=>Number(g.id)||0))+1;
  obj={id,name,color:'#cba98e',art:'',note:'',tags:[],articleId:'',entityIds:[]};collection=w.pantheon||=[];
 }else if(kind==='entity'){
  obj={id:gen('entity'),name,mapId:opts.mapId||w.maps?.[0]?.id||'',typeId:opts.typeId||w.types?.[0]?.id||'',x:opts.x||0,y:opts.y||0,summary:'',body:'',image:'',tags:[],fields:{},draft:false,secret:false};collection=w.entities||=[];
 }else return null;
 if(!obj)return null;
 if(collection)collection.push(obj);
 if(kind==='book'&&opts.cinematic!==false){const cin=create('chronicle',{name});if(cin)obj.cinematicId=cin.id;}
 for(const p of parents)attach(p,{kind,id:String(obj.id)});
 changed();return obj;
}
// Adopt an existing full engine record without discarding map geometry, chapter metadata or scene state.
function adopt(kind,record,{parents=[]}={}){
 const w=W();if(!w||window.S?.mode!=='edit'||!record||record.id==null)return null;
 const target=(kind==='timelineEvent'?(w.timeline||={}).events:(kind==='entry'?(w.sections||[]).find(s=>s.id===record.sectionId)?.entries:R()?.collection?.(kind)));
 if(!Array.isArray(target))return null;
 const old=target.find(x=>String(x.id)===String(record.id));if(old)return old;
 target.push(record);for(const parent of parents)attach(parent,kind+':'+record.id);
 changed();return record;
}
function remove(ref){
 const r=parse(ref),w=W();if(!r||!w||window.S?.mode!=='edit'||!has(r)||r.kind==='exhibit')return false;
 const loc={entity:'entities',article:'articles',showcase:'showcases',book:'chronicleBooks',room:'adventureRooms',node:'explorerNodes',section:'sections',relic:'relics',puzzle:'puzzles',map:'maps',god:'pantheon',chronicle:'chronicles'};
 const kind=r.kind,id=r.id,source=key(r),obj=entity(r);
 let arr=null;
 if(loc[kind])arr=w[loc[kind]];
 else if(kind==='lore')arr=w.loreMatrix?.records;
 else if(kind==='loreNode')arr=w.loreMatrix?.nodes;
 else if(kind==='timelineEvent')arr=w.timeline?.events;
 else if(kind==='entry')arr=(w.sections||[]).flatMap(s=>s.entries||[]).includes(obj)?(w.sections||[]).find(s=>(s.entries||[]).includes(obj))?.entries:null;
 if(!Array.isArray(arr))return false;
 const before=arr.length;const i=arr.findIndex(a=>String(a.id)===id);if(i<0)return false;arr.splice(i,1);
 // Delete the reference, not all materials that once pointed at it.
 w.contentLinks||={};delete w.contentLinks[source];
 const purged=new Set([source]);
 if(kind==='showcase'){for(const k of Object.keys(w.contentLinks))if(k.startsWith('exhibit:'+id+'~')){purged.add(k);delete w.contentLinks[k]}}
 if(kind==='section')for(const e of obj.entries||[]){const k='entry:'+e.id;purged.add(k);delete w.contentLinks[k]}
 for(const [from,targets]of Object.entries(w.contentLinks)){
  if(!Array.isArray(targets))continue;
  w.contentLinks[from]=targets.filter(t=>!purged.has(key(t)));
 }
 for(const article of w.articles||[])article.parentRefs=(article.parentRefs||[]).filter(k=>!purged.has(k));
 if(kind==='article'){
  for(const b of w.chronicleBooks||[])b.articleIds=(b.articleIds||[]).filter(a=>String(a)!==id);
  for(const c of w.chronicles||[])c.articleIds=(c.articleIds||[]).filter(a=>String(a)!==id);
  for(const e of [...(w.entities||[]),...(w.pantheon||[])])if(String(e.articleId)===id)e.articleId='';
  for(const l of w.loreMatrix?.records||[])if(String(l.articleId)===id)l.articleId='';
  if(w.authorWorkspace?.drafts)delete w.authorWorkspace.drafts[id];
 }
 if(kind==='entity'){
  w.relations=(w.relations||[]).filter(x=>String(x.from)!==id&&String(x.to)!==id);
  for(const l of w.loreMatrix?.records||[]){l.nodeIds=(l.nodeIds||[]).filter(x=>x!==source);l.entityIds=(l.entityIds||[]).filter(x=>String(x)!==id)}
 }
 if(kind==='god'){
  for(const e of w.entities||[])e.pantheonIds=(e.pantheonIds||[]).filter(x=>String(x)!==id);
  for(const l of w.loreMatrix?.records||[]){l.nodeIds=(l.nodeIds||[]).filter(x=>x!==source);l.godIds=(l.godIds||[]).filter(x=>String(x)!==id)}
 }
 if(kind==='book')for(const a of w.articles||[])a.parentRefs=(a.parentRefs||[]).filter(x=>x!==source);
 // Legacy foreign keys not represented by contentLinks must be cleaned at deletion time.
 if(['showcase','book','section','room'].includes(kind))for(const [slotType,slots]of Object.entries(w.interfaceSlots||{}))
   if(Array.isArray(slots))w.interfaceSlots[slotType]=slots.filter(v=>v!==source&&v!==id&&(typeof v!=='object'||v.target!==source));
 if(kind==='timelineEvent')for(const camp of w.timeline?.campaigns||[])camp.eventIds=(camp.eventIds||[]).filter(x=>String(x)!==id);
 if(kind==='article'){
   for(const item of w.timeline?.events||[])if(String(item.articleId)===id)item.articleId='';
   for(const item of [...(w.relics||[]),...(w.puzzles||[])]){if(String(item.articleId)===id)item.articleId='';if(String(item.unlockArticleId)===id)item.unlockArticleId='';}
 }
 if(kind==='chronicle')for(const b of w.chronicleBooks||[])if(String(b.cinematicId)===id)b.cinematicId='';
 if(kind==='room')for(const showcase of w.showcases||[])if(String(showcase.adventureRoomId)===id)showcase.adventureRoomId='';
 if(kind==='node'){
  for(const showcase of w.showcases||[])if(String(showcase.explorerNodeId)===id)showcase.explorerNodeId='';
  for(const node of w.explorerNodes||[]){node.links=(node.links||[]).filter(l=>!(l.type==='node'&&String(l.id)===id));node.hotspots=(node.hotspots||[]).filter(l=>!(l.type==='node'&&String(l.id)===id));}
 }
 changed();return before-arr.length===1;
}
function relate(from,to,typeId,{note=''}={}){
 const w=W();if(window.S?.mode!=='edit'||!has('entity:'+from)||!has('entity:'+to)||!typeId)return null;
 w.relations||=[];const old=w.relations.find(x=>String(x.from)===String(from)&&String(x.to)===String(to)&&x.typeId===typeId);
 if(old)return old;const rel={id:gen('relation'),from,to,typeId,note};w.relations.push(rel);changed();return rel;
}
function graph(){const w=W(),edges=[];if(!w)return edges;
 for(const [from,targets]of Object.entries(w.contentLinks||{}))for(const x of targets||[]){const to=key(x);if(has(from)&&has(to))edges.push({from,to,role:'content-link',label:x.label||''});}
 for(const x of w.relations||[])if(has('entity:'+x.from)&&has('entity:'+x.to))edges.push({from:'entity:'+x.from,to:'entity:'+x.to,role:'map-relation',typeId:x.typeId,id:x.id});
 for(const a of w.articles||[])for(const from of a.parentRefs||[])if(has(from))edges.push({from,to:'article:'+a.id,role:'parent'});
 for(const b of w.chronicleBooks||[])for(const id of b.articleIds||[])if(has('article:'+id))edges.push({from:'book:'+b.id,to:'article:'+id,role:'book-article'});
 for(const x of w.loreMatrix?.records||[])for(const ref of x.nodeIds||[]){const k=has(ref)?ref:has('loreNode:'+ref)?'loreNode:'+ref:null;if(k)edges.push({from:'lore:'+x.id,to:k,role:'intersection-participant'});}
 return edges;
}
function norm(s){return String(s||'').normalize('NFC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[\s\u00a0]+/g,' ').trim()}
function titleLookup(text,{kind=null}={}){
 const target=norm(text);if(!target)return[];
 return (R()?.all()||[]).filter(x=>(!kind||x.kind===kind)&&(
    norm(x.title)===target||(x.kind==='article'&&(entity(x)?.sourceAliases||[]).some(n=>norm(n)===target))
 )).filter((x,i,arr)=>arr.findIndex(a=>a.kind===x.kind&&a.id===x.id)===i);
}
function scanWiki(){const issues=[],found=[],rx=/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
 for(const a of W()?.articles||[]){let match;while((match=rx.exec(a.body||''))){const text=match[1].trim().split('#')[0];
   const hits=text.startsWith('id:')?(has('article:'+text.slice(3))?[{kind:'article',id:text.slice(3)}]:[]):titleLookup(text);
   if(hits.length===1&&key(hits[0])!=='article:'+a.id)found.push({from:'article:'+a.id,to:key(hits[0]),title:text});
   else if(hits.length!==1)issues.push({from:'article:'+a.id,text,reason:hits.length?'Неоднозначное название':'Не найдено'});
 }}return{found,issues};}
// Wiki references represent citations, not parenthood. Do not mutate article.parentRefs for these.
function indexExplicitWiki(){const scan=scanWiki(),w=W();if(!w)return{linked:0,issues:scan.issues};w.contentLinks||={};let linked=0;
 for(const l of scan.found){const [kind,id]=l.to.split(/:(.*)/s).filter(Boolean);const arr=w.contentLinks[l.from]||=[];
  if(!arr.some(x=>key(x)===l.to)){arr.push({kind,id,label:l.title});linked++;}}
 if(linked)changed();return{linked,issues:scan.issues};}
function audit(){const issues=[],counts={};for(const a of R()?.all()||[])counts[a.kind]=(counts[a.kind]||0)+1;
 for(const [src,targets]of Object.entries(W()?.contentLinks||{})){
  if(!has(src))issues.push({from:src,error:'Отсутствует источник'});
  if(!Array.isArray(targets)){issues.push({from:src,error:'Список ссылок повреждён'});continue;}
  for(const t of targets)if(!has(t))issues.push({from:src,to:key(t),error:'Отсутствует цель'});
 }
 for(const r of W()?.relations||[]){if(!has('entity:'+r.from)||!has('entity:'+r.to))issues.push({from:'relation:'+r.id,error:'Объект карты удалён'});}
 for(const a of W()?.articles||[])for(const parent of a.parentRefs||[])if(!has(parent))issues.push({from:'article:'+a.id,to:parent,error:'Отсутствует родитель'});
 for(const b of W()?.chronicleBooks||[])for(const id of b.articleIds||[])if(!has('article:'+id))issues.push({from:'book:'+b.id,to:'article:'+id,error:'Статья книги отсутствует'});
 for(const r of W()?.loreMatrix?.records||[]){if(r.articleId&&!has('article:'+r.articleId))issues.push({from:'lore:'+r.id,to:'article:'+r.articleId,error:'Статья пересечения отсутствует'});for(const id of r.nodeIds||[])if(!has(id)&&!has('loreNode:'+id))issues.push({from:'lore:'+r.id,to:id,error:'Участник отсутствует'});}
 const wiki=scanWiki();return{counts,issues,wiki,materialCount:Object.values(counts).reduce((a,b)=>a+b,0)};
}
window.AvronMaterials={parse,key,entity,has,create,adopt,attach,detach,remove,relate,graph,titleLookup,scanWiki,indexExplicitWiki,audit,changed};
})();
