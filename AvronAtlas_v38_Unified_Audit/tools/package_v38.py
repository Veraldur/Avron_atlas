#!/usr/bin/env python3
from pathlib import Path
import zipfile,json,hashlib
r=Path(__file__).resolve().parents[1]
base=Path('/mnt/data')
full=base/'AvronAtlas_v38_Unified_Audit.zip'
patch=base/'AvronAtlas_v38_Upgrade_Patch.zip'
changed=[
'index.html',
'src/default-world-current.js','src/default-world-v32.js','src/unified-material-core-v38.js','src/archive-upgrade-v38.js',
'src/ui.js','src/scene.js','src/timeline.js','src/navigation-core-v30.js','src/material-registry-v37.js',
'src/creative-studio.js','src/lore-store.js','src/showcase-builder.js','src/world-studio-v11.js',
'src/adventure-rooms-v27.js','src/unified-atelier-v13.js','pantheon/pantheon.js','pantheon/library.js',
'ARCHITECTURE_REVIEW_V38.md','QA_REPORT_V38.md','README_V38.md',
'reports/BROWSER_TEST_V38.json','reports/IMPORT_AUDIT_V38.json','reports/UNRESOLVED_FOUNDRY_LINKS_V38.json','reports/VALIDATION_V38.json',
'tools/import_foundry_v38.py','tools/unify_engines_v38.py','tools/unify_more_v38.py','tools/finish_integrations_v38.py','tools/graph_integrations_v38.py','tools/test_browser_v38.py','tools/validate_package_v38.py','tools/package_v38.py',
]
changed.extend(str(p.relative_to(r)) for p in (r/'assets/import-v38').rglob('*') if p.is_file())
paths=sorted(str(p.relative_to(r)) for p in r.rglob('*') if p.is_file() and not p.name.startswith('.'))
for title,target,names in [('full',full,paths),('patch',patch,sorted(set(changed)))]:
 with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
  for name in names:
   p=r/name
   assert p.is_file(),name
   z.write(p,name)
 with zipfile.ZipFile(target) as z:
  bad=z.testzip()
  assert bad is None, bad
  assert len(z.namelist())==len(names)
 print(json.dumps({'artifact':str(target),'type':title,'files':len(names),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()},ensure_ascii=False))
