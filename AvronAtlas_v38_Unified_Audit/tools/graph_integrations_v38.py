from pathlib import Path
r=Path('/mnt/data/AvronAtlas_v38_Unified_Audit')
p=r/'src/unified-material-core-v38.js';s=p.read_text('utf-8');needle='function norm(s){';assert needle in s
insert='''function relate(from,to,typeId,{note=''}={}){
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
'''
s=s.replace(needle,insert+needle)
s=s.replace("for(const a of W()?.articles||[])for(const parent of a.parentRefs||[])","for(const r of W()?.relations||[]){if(!has('entity:'+r.from)||!has('entity:'+r.to))issues.push({from:'relation:'+r.id,error:'Объект карты удалён'});}\n for(const a of W()?.articles||[])for(const parent of a.parentRefs||[])")
s=s.replace('create,adopt,attach,detach,remove,titleLookup,','create,adopt,attach,detach,remove,relate,graph,titleLookup,')
p.write_text(s,'utf-8')

p=r/'src/ui.js';s=p.read_text('utf-8')
a="S.world.relations.push({ id: uid(), from: p.from, to: id, typeId: p.typeId, note: '' });"
b="(window.AvronMaterials?.relate?.(p.from,id,p.typeId)||S.world.relations.push({ id: uid(), from: p.from, to: id, typeId: p.typeId, note: '' }));"
assert a in s;s=s.replace(a,b)
a="S.world.relations.push({ id: uid(), from: e.id, to: id, typeId, note: '' }); changed({});"
b="(window.AvronMaterials?.relate?.(e.id,id,typeId)||S.world.relations.push({ id: uid(), from: e.id, to: id, typeId, note: '' })); changed({});"
assert a in s;s=s.replace(a,b);p.write_text(s,'utf-8')

p=r/'src/navigation-core-v30.js';s=p.read_text('utf-8')
a="return [...explicit,...auto].filter((r,i,a)=>a.findIndex(x=>x.kind===r.kind&&x.id===r.id)===i);"
b="const relationships=kind==='entity'?(w()?.relations||[]).filter(r=>String(r.from)===String(id)&&valid('entity',r.to)).map(r=>({kind:'entity',id:String(r.to),label:(w()?.relationTypes||[]).find(t=>t.id===r.typeId)?.name||'Связанный объект'})):[];return [...explicit,...auto,...relationships].filter((r,i,a)=>a.findIndex(x=>x.kind===r.kind&&x.id===r.id)===i);"
assert a in s;s=s.replace(a,b);p.write_text(s,'utf-8')
