#!/usr/bin/env python3
from pathlib import Path
import re,json,zipfile,collections,hashlib
root=Path(__file__).resolve().parents[1]
world=Path('/mnt/data/Avron_Migrated_v38_Unified_Archive.json')
w=json.loads(world.read_text('utf-8'))
jsfiles=list((root/'src').rglob('*.js'))+list((root/'pantheon').rglob('*.js'))
scriptrefs=re.findall(r'<(?:script|link)[^>]+(?:src|href)="(\./[^"?#]+)',(root/'index.html').read_text('utf-8'))
missing_scripts=[r for r in scriptrefs if not (root/r[2:]).is_file()]
links=w.get('contentLinks',{});refs=collections.Counter()
for a in w.get('articles',[]):refs['article']+=1
for e in w.get('entities',[]):refs['entity']+=1
for e in w.get('chronicleBooks',[]):refs['book']+=1
for e in w.get('chronicles',[]):refs['cinematic']+=1
images=[];broken=[]
for a in w['articles']:
 for path in re.findall(r'assets/import-v38/[^\s)"\']+',a.get('body','')):
  images.append(path)
  if not (root/path).is_file():broken.append((a['id'],path))
from collections import Counter
iddupes={kind:[id for id,c in Counter(str(x.get('id')) for x in xs).items() if c>1] for kind,xs in [('articles',w['articles']),('entities',w['entities']),('showcases',w['showcases']),('books',w['chronicleBooks'])]}
bootstrap=(root/'src/default-world-current.js').read_bytes();alt=(root/'src/default-world-v32.js').read_bytes()
rest=bootstrap[len('window.AvronDefaultWorld = '):].strip().rstrip(b';');vw=json.loads(rest)
assert vw==w, 'Bootstrap and exported JSON differ'
assert bootstrap==alt, 'Different source world files'
assert not missing_scripts,missing_scripts
assert not broken,broken[:12]
assert not any(iddupes.values()),iddupes
assert len(w['entities'])==266 and len(w['articles'])==912
assert len(list((root/'assets/import-v38').glob('*')))==174
for src in ['/mnt/data/JournalDirectory _ Avron 1.33.zip','/mnt/data/Книги Аврон 1.33.zip']:
 with zipfile.ZipFile(src) as z: assert z.testzip() is None
result={"source_md":885,"imported_attachments":174,"attached_image_references":len(images),"missing_image_references":len(broken),"missing_local_scripts_or_styles":missing_scripts,"unique_ids":True,"material_counts":dict(refs),"bootstrap_matches_export":True,"readable_archive_inputs":True,"script_count":len(jsfiles),"script_style_links":len(scriptrefs),"current_world_bytes":world.stat().st_size}
(root/'reports/VALIDATION_V38.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),'utf-8');print(json.dumps(result,ensure_ascii=False,indent=2))
