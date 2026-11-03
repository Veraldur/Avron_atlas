from pathlib import Path
p=Path(__file__).resolve().parents[1]
def change(f,old,new):
 path=p/f;s=path.read_text(encoding='utf-8');n=s.count(old)
 if n!=1:
  print('SKIP' if new in s else 'MISSING',f,old[:110],n)
  if new in s:return
  raise RuntimeError(f'Expected exactly 1, got {n}: {f} {old[:100]}')
 path.write_text(s.replace(old,new),encoding='utf-8')
# Place gallery and pantheon creation through the shared facade.
change('src/showcase-builder.js',
 "const v={id:uid(),name:'Пантеон · галерея божеств',source:'pantheon',typeId:'',ratio:'portrait',layout:'altar',frame:'gothic',ambience:'celestial',order:[],artOverrides:{}};list().push(v);persist();open(v.id,true)",
 "const v=window.AvronMaterials?.create?.('showcase',{title:'Пантеон · галерея божеств',source:'pantheon',layout:'altar'});if(!v)return;v.ratio='portrait';persist();open(v.id,true)")
change('src/showcase-builder.js',
 "const v={id:uid(),name,layout:String(data.get('layout')),source:source.startsWith('section:')?'section':source,sectionId:source.startsWith('section:')?source.slice(8):'',typeId:source==='entities'?String(data.get('typeId')):'',ratio:'landscape',frame:'gothic',headerStyle:'celestial',ambience:'celestial',order:[],artOverrides:{},adventureRoomId:String(data.get('room')),explorerNodeId:String(data.get('node'))};list().push(v);dlg.remove();persist();open(v.id,true)",
 "const v=window.AvronMaterials?.create?.('showcase',{title:name,layout:String(data.get('layout')),source:source.startsWith('section:')?'section':source,typeId:source==='entities'?String(data.get('typeId')):''});if(!v)return;v.sectionId=source.startsWith('section:')?source.slice(8):'';v.adventureRoomId=String(data.get('room')||'');v.explorerNodeId=String(data.get('node')||'');dlg.remove();persist();open(v.id,true)")
# Two gods creation methods; both must use one store.
old="const id=Math.max(0,...gods().map(g=>Number(g.id)||0))+1;gods().push({id,name:'Новое божество',color:'#cba98e',art:'',note:'',tags:[],articleId:'',entityIds:[]});active=id;"
new="const god=window.AvronMaterials?.create?.('god',{title:'Новое божество'});if(!god)return;active=god.id;"
pantheon='pantheon/pantheon.js';fp=p/pantheon;s=fp.read_text(encoding='utf-8');n=s.count(old)
assert n==2,n
fp.write_text(s.replace(old,new),encoding='utf-8')
# Legacy pantheon read action should use the same navigation route, not switchScreen directly.
change(pantheon,
 "hide();switchScreen('encyclopedia');renderEncyclopediaArticle(a);window.AvronFinder?.openArticleEditor?.(a.id);",
 "hide();window.AvronNav?.open?.('article:'+a.id);")
# UI section entry creation (canonical sections.entries)
change('src/ui.js',
 "const a={id:uid(),title:'Новое божество',body:'',image:'',blocks:[]};sec.entries.push(a);S.activeEntryId=a.id;renderSection();scheduleSave();",
 "const a=window.AvronMaterials?.create?.('entry',{title:'Новая запись',sectionId:sec.id});if(!a)return;S.activeEntryId=a.id;renderSection();scheduleSave();")
# Chronicle event: one entity in map; book links that entity.
change('src/world-studio-v11.js',
 "const e={id:uid(),name:title.trim(),typeId:type.id,mapId:w().maps?.[0]?.id||'',summary:'',body:'',tags:[],fields:{},image:'',secret:false,draft:false,x:0,y:0};(w().entities||=[]).push(e);b.eventIds.push(e.id);save();render()",
 "const e=window.AvronMaterials?.create?.('entity',{title:title.trim(),typeId:type.id,mapId:w().maps?.[0]?.id||'',parents:['book:'+b.id]});if(!e)return;b.eventIds.push(e.id);save();render()")
# If a title matches an existing but unrelated article, don't hijack it silently in Pantheon.
change(pantheon,
 "if(!a){let title=String(r.title||'Пересечение').trim();a=S.world.articles.find(a=>a.title.trim().toLowerCase()===title.toLowerCase());if(!a){a=window.AvronMaterials?.create?.('article',{title,parents:['lore:'+r.id],draft:false});if(!a)return;}r.articleId=a.id;window.AvronLoreStore.updateRecord(r);}",
 "if(!a){const title=String(r.title||'Пересечение').trim();a=window.AvronMaterials?.create?.('article',{title,parents:['lore:'+r.id],draft:false});if(!a)return;r.articleId=a.id;window.AvronLoreStore.updateRecord(r);}")
print('Creator adapters extended (showcase, pantheon, section entries, book events)')
