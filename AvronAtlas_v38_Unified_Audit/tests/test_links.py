"""Run: python tests/test_links.py. Validate IDs without claiming browser coverage."""
from pathlib import Path
import json
P=Path(__file__).resolve().parents[1]
w=json.loads((P/'examples/Avron_Migrated_v30.json').read_text())
old=json.loads((P/'examples/Avron_Migrated_v29_Explorer.json').read_text()) if (P/'examples/Avron_Migrated_v29_Explorer.json').exists() else None
alltypes={'entity':'entities','article':'articles','showcase':'showcases','book':'chronicleBooks','room':'adventureRooms','node':'explorerNodes','section':'sections','god':'pantheon','map':'maps'}
ids={k:{str(x['id']) for x in w[v]} for k,v in alltypes.items()}
issues=[]; total=0
for source,refs in w.get('contentLinks',{}).items():
 k,_,id=source.partition(':')
 if id not in ids.get(k,set()):issues.append(('source',source))
 for r in refs:
  total+=1
  if str(r['id']) not in ids.get(r['kind'],set()):issues.append(('target',source,r))
for n in w['explorerNodes']:
 for r in n.get('links',[]):
  total+=1
  k={'adventure':'room','chronicle':'book'}.get(r['type'],r['type'])
  if str(r['id']) not in ids.get(k,set()):issues.append(('explorer',n['id'],r))
for room in w['adventureRooms']:
 if room.get('entityId') and room['entityId'] not in ids['entity']:issues.append(('room',room['id']))
for sh in w['showcases']:
 if sh.get('layout')=='room' and sh.get('adventureRoomId') and sh['adventureRoomId'] not in ids['room']:issues.append(('room showcase',sh['id']))
 if sh.get('layout')=='city' and sh.get('explorerNodeId') and sh['explorerNodeId'] not in ids['node']:issues.append(('city showcase',sh['id']))
assert not issues,issues
assert len(w['entities'])==266
assert len({x['id'] for x in w['entities']})==266
assert w['interfaceSlots']['top'].count('showcase:avron-amena-city')==1
assert any(x['id']=='avron-amena-city' and x['explorerNodeId']=='city-amena' for x in w['showcases'])
assert any(x['id']=='b5823692' and x['name']=='Амена' for x in w['entities'])
assert all((P / path).exists() for path in ['src/navigation-core-v30.js','src/navigation-core-v30.css','src/default-world-v30.js','src/city-explorer-v29.js','src/showcase-builder.js'])
print('PASS: linked edges:',total,'orphan links:',len(issues),'world objects:',len(w['entities']), 'showcases:',len(w['showcases']))
