from pathlib import Path
R=Path('/mnt/data/AvronAtlas_v38_Unified_Audit')
def p(file,a,b):
 path=R/file;s=path.read_text('utf-8');n=s.count(a)
 if n!=1: print('SKIP',file, n,repr(a[:80]));return
 s=s.replace(a,b);path.write_text(s,'utf-8');print('PATCH',file)
# Source world must actually be bootstrapped from current path.
(R/'src/default-world-current.js').write_bytes((R/'src/default-world-v32.js').read_bytes())
print('SYNC embedded v38 world bootstrap')
p('src/unified-material-core-v38.js','function remove(ref){', '''// Adopt an existing full engine record without discarding map geometry, chapter metadata or scene state.
function adopt(kind,record,{parents=[]}={}){
 const w=W();if(!w||window.S?.mode!=='edit'||!record||record.id==null)return null;
 const target=(kind==='timelineEvent'?(w.timeline||={}).events:(kind==='entry'?(w.sections||[]).find(s=>s.id===record.sectionId)?.entries:R()?.collection?.(kind)));
 if(!Array.isArray(target))return null;
 const old=target.find(x=>String(x.id)===String(record.id));if(old)return old;
 target.push(record);for(const parent of parents)attach(parent,kind+':'+record.id);
 changed();return record;
}
function remove(ref){''')
p('src/unified-material-core-v38.js','window.AvronMaterials={parse,key,entity,has,create,attach,detach,remove,titleLookup,scanWiki,indexExplicitWiki,audit,changed};','window.AvronMaterials={parse,key,entity,has,create,adopt,attach,detach,remove,titleLookup,scanWiki,indexExplicitWiki,audit,changed};')
p('src/unified-material-core-v38.js',"const [kind,id]=l.to.split(/:(.*)/s).filter(Boolean);const arr=w.contentLinks[l.from]||[];","const {kind,id}=parse(l.to);const arr=w.contentLinks[l.from]||[];")
# Source object editor / map engine are now adoption adapters.
p('src/ui.js','S.world.entities.push(c); changed({ select: c.id });',"if(!window.AvronMaterials?.adopt?.('entity',c))S.world.entities.push(c); changed({ select: c.id });")
p('src/ui.js','removeEntity(e.id); changed({ select: null });',"if(!window.AvronMaterials?.remove?.('entity:'+e.id))removeEntity(e.id); changed({ select: null });")
p('src/ui.js',"btn('Удалить раздел',()=>{if(confirm('Удалить раздел и все его записи?')){S.world.sections=S.world.sections.filter(x=>x!==sec);switchScreen('map');scheduleSave();}},'danger')","btn('Удалить раздел',()=>{if(confirm('Удалить раздел и все его записи?')){if(!window.AvronMaterials?.remove?.('section:'+sec.id))S.world.sections=S.world.sections.filter(x=>x!==sec);switchScreen('map');scheduleSave();}},'danger')")
p('src/ui.js',"btn('Удалить запись',()=>{if(confirm('Удалить запись?')){sec.entries=sec.entries.filter(x=>x!==entry);S.activeEntryId=null;renderSection();scheduleSave();}},'danger')","btn('Удалить запись',()=>{if(confirm('Удалить запись?')){if(!window.AvronMaterials?.remove?.('entry:'+entry.id))sec.entries=sec.entries.filter(x=>x!==entry);S.activeEntryId=null;renderSection();scheduleSave();}},'danger')")
p('src/ui.js',"function addWorldSection(){const name=prompt('Название нового раздела','Артефакты');if(!name?.trim())return;const sec={id:uid(),name:name.trim(),icon:'▤',layout:'encyclopedia',entries:[]};S.world.sections.push(sec);S.activeSectionId=sec.id;S.activeEntryId=null;openSection(sec.id);scheduleSave();}","function addWorldSection(){const name=prompt('Название нового раздела','Артефакты');if(!name?.trim())return;const sec=window.AvronMaterials?.create?.('section',{title:name.trim()})||{id:uid(),name:name.trim(),icon:'▤',layout:'encyclopedia',entries:[]};if(!(S.world.sections||[]).some(x=>x.id===sec.id))S.world.sections.push(sec);S.activeSectionId=sec.id;S.activeEntryId=null;openSection(sec.id);scheduleSave();}")
p('src/scene.js','S.world.entities.push(e); changed({ select: e.id }); return;',"if(!window.AvronMaterials?.adopt?.('entity',e))S.world.entities.push(e); changed({ select: e.id }); return;")
p('src/scene.js','this.draft = null; S.tool = \'select\'; S.world.entities.push(e);',"this.draft = null; S.tool = 'select'; if(!window.AvronMaterials?.adopt?.('entity',e))S.world.entities.push(e);")
p('src/timeline.js',"timeline().events.push(ev); camp.eventIds ||= []; camp.eventIds.push(ev.id);", "if(!window.AvronMaterials?.adopt?.('timelineEvent',ev))timeline().events.push(ev); camp.eventIds ||= []; camp.eventIds.push(ev.id);")
p('src/timeline.js',"const a={id:uid(),title:name.trim(),body:'',libraryId:S.world.libraries[0]?.id||'library-main',folderId:'',tags:[],draft:false};S.world.articles.push(a);target[key]=a.id;S.openArticleId=a.id;setDirty();renderTimelineScreen();", "const parent=target.id&&window.AvronMaterials?.has?.('timelineEvent:'+target.id)?['timelineEvent:'+target.id]:[];const a=window.AvronMaterials?.create?.('article',{title:name.trim(),parents:parent,draft:false})||window.AvronRegistry?.create?.({title:name.trim(),parents:parent,draft:false});if(!a)return;target[key]=a.id;S.openArticleId=a.id;setDirty();renderTimelineScreen();")
p('src/timeline.js',"target[key]?btn('↗ Открыть',()=>{const a=articles().find(a=>a.id===target[key]);if(a){switchScreen('encyclopedia');renderEncyclopediaArticle(a);}},'mini'):null", "target[key]?btn('↗ Открыть',()=>window.AvronNav?.open?.({kind:'article',id:target[key]}),'mini'):null")
p('src/timeline.js',"if(a){closeStory();switchScreen('encyclopedia');renderEncyclopediaArticle(a);return;}","if(a){closeStory();window.AvronNav?.open?.({kind:'article',id:a.id});return;}")
