#!/usr/bin/env python3
"""Idempotent import of two authored Foundry Markdown exports into an AvronAtlas world.
Source binaries preserved separately; no fuzzy-title merging or canon rewrites.
"""
import collections, hashlib, json, pathlib, re, zipfile

BASE=pathlib.Path(__file__).resolve().parents[1]
WORLD=pathlib.Path('/mnt/data/Avron_Migrated_v37_Registry_Workspace.json')
SOURCES=[('journal',pathlib.Path('/mnt/data/JournalDirectory _ Avron 1.33.zip')),('books',pathlib.Path('/mnt/data/Книги Аврон 1.33.zip'))]
OUT=pathlib.Path('/mnt/data/Avron_Migrated_v38_Unified_Archive.json')
ASSETS=BASE/'assets'/'import-v38';ASSETS.mkdir(parents=True,exist_ok=True)

def decode_path(p):
    return re.sub(r'#U([0-9a-fA-F]{4})',lambda m:chr(int(m.group(1),16)),p)
def norm(t): return ' '.join(t.replace('ё','е').lower().strip().split())
def safe_string(s): return str(s or '').replace('\\','/').strip()
def field(front,name):
    m=re.search(r'^'+re.escape(name)+r':\s*(.*)$',front,re.M)
    return m.group(1).strip().strip('"').strip("'") if m else ''
def split_md(s,path):
    front='';body=s
    if s.startswith('---\n'):
        end=s.find('\n---\n',4)
        if end>=0:front=s[4:end];body=s[end+5:]
    title=field(front,'title') or pathlib.PurePosixPath(path).stem.replace('_',' ')
    title=title.strip('"').strip() or pathlib.PurePosixPath(path).stem
    return title,front,body

def article_id(src,p,front):
    fid=field(front,'foundryId')
    return ('foundry-'+hashlib.sha256((src+'|'+(fid or p)).encode()).hexdigest()[:20],fid)

w=json.loads(WORLD.read_text(encoding='utf-8'))
existing={a.get('id') for a in w.get('articles',[])}
folders={(f.get('name'),f.get('parentId'),f.get('libraryId')):f.get('id') for f in w.get('folders',[])}
lib='library-main'
new_folder_cache={}
def folder_for(src,path):
    chunks=pathlib.PurePosixPath(path).parts[:-1]
    parent=''
    for part in (('Импорт 1.33 — Журналы' if src=='journal' else 'Импорт 1.33 — Книги'),)+chunks:
        k=(part,parent,lib)
        if k not in folders:
            f_id='folder-v38-'+hashlib.sha256((src+'|'+parent+'|'+part).encode()).hexdigest()[:18]
            w.setdefault('folders',[]).append({'id':f_id,'name':part,'libraryId':lib,'parentId':parent})
            folders[k]=f_id
        parent=folders[k]
    return parent

all_asset={};ambiguous_assets=set();asset_copied=0
for src,zpath in SOURCES:
    with zipfile.ZipFile(zpath) as z:
        for f in z.infolist():
            if f.is_dir() or f.filename.endswith('.md'):continue
            decoded=decode_path(f.filename)
            base=pathlib.PurePosixPath(decoded.split('?')[0]).name
            suffix=pathlib.Path(base).suffix.lower()
            if suffix not in {'.jpg','.jpeg','.webp','.png','.gif','.svg'}:continue
            raw=z.read(f)
            h=hashlib.sha256(raw).hexdigest()[:20]
            target=ASSETS/(h+suffix)
            if not target.exists():target.write_bytes(raw);asset_copied+=1
            path='assets/import-v38/'+target.name
            for k in (src+'|'+base,src+'|'+decoded.split('?')[0],src+'|'+decoded):
                if k in all_asset and all_asset[k]!=path:ambiguous_assets.add(k)
                else:all_asset[k]=path

count=collections.Counter();source_ids={};imported=[]
img_rx=re.compile(r'!\[\[([^\]]+)\]\]')

def render_asset(src,m):
    token=m.group(1);name=token.split('|')[0].strip();p=all_asset.get(src+'|'+name) or all_asset.get(src+'|'+pathlib.PurePosixPath(name).name)
    return '![Иллюстрация]('+p+')' if p else m.group(0)

for src,zpath in SOURCES:
    with zipfile.ZipFile(zpath) as z:
        for info in z.infolist():
            if info.is_dir() or not info.filename.endswith('.md'):continue
            path=decode_path(info.filename)
            raw=z.read(info).decode('utf-8-sig',errors='replace')
            title,front,body=split_md(raw,path)
            aid,fid=article_id(src,path,front)
            if aid in existing:count['skipped_existing']+=1;continue
            body=img_rx.sub(lambda m:render_asset(src,m),body)
            a={'id':aid,'title':title,'body':body,'summary':'','tags':['импорт-1.33',src],
               'libraryId':lib,'folderId':folder_for(src,path),'draft':False,'parentRefs':[],
               'sourceKind':'foundry-book' if src=='books' else 'foundry-journal',
               'sourcePath':path,'foundryId':fid,'sourceAliases':[title]}
            if field(front,'aliases') and norm(field(front,'aliases'))!=norm(title):a['sourceAliases'].append(field(front,'aliases'))
            w['articles'].append(a); existing.add(aid); imported.append(a)
            count[src]+=1
            if not body.strip():count['empty_body']+=1

# Exact ID matching only. Build aliases and title lookups, tolerate duplicate titles.
byname=collections.defaultdict(list)
for a in w['articles']:
    for name in set([a.get('title','')]+(a.get('sourceAliases') or [])):
        if norm(name) and a['id'] not in byname[norm(name)]:byname[norm(name)].append(a['id'])
entity_names=collections.defaultdict(list)
for e in w['entities']:entity_names[norm(e.get('name',''))].append(e['id'])
links=w.setdefault('contentLinks',{})
def add(src,dest):
    arr=links.setdefault(src,[])
    if not any(x.get('kind')+':'+str(x.get('id'))==dest for x in arr):
        k,id=dest.split(':',1);arr.append({'kind':k,'id':id});count['new_links']+=1

# Source wiki references: only unambiguous title and explicit exact name; no guessing by vague mention.
wiki=re.compile(r'(?<!!)\[\[([^\]]+)\]\]')
ambiguous=[];unresolved=[];linked=0
for a in imported:
    for m in wiki.finditer(a['body']):
        token=m.group(1).split('|',1)[0].split('#',1)[0].strip()
        candidates=byname.get(norm(token),[])
        if len(candidates)==1 and candidates[0]!=a['id']:
            add('article:'+a['id'],'article:'+candidates[0]);linked+=1
        elif len(candidates)>1:ambiguous.append({'source':a['title'],'path':a['sourcePath'],'target':token,'count':len(candidates)})
        else:unresolved.append({'source':a['title'],'path':a['sourcePath'],'target':token})

# Legacy map entities link to exactly one imported page only if they have no existing article or old explicit link.
for name,ids in entity_names.items():
    matches=byname.get(name,[])
    if len(ids)==1 and len(matches)==1:
        e=next(x for x in w['entities'] if x['id']==ids[0]);a=next(x for x in w['articles'] if x['id']==matches[0]);
        if not e.get('articleId'):e['articleId']=a['id'];count['entity_article_assigned']+=1
        add('entity:'+e['id'],'article:'+a['id'])
        ref='entity:'+e['id'];a.setdefault('parentRefs',[])
        if ref not in a['parentRefs']:a['parentRefs'].append(ref)

# Test chain: creates an editorial chronicle with a fresh explicit article and a lore intersection and location.
# This chain is clearly labeled TEST, not imported source canon.
test_entity=next((x for x in w['entities'] if x['name']=='Амена'),w['entities'][0]);
test_loc=next((x for x in w['entities'] if x['name']=='Цитадель Вечного Света'),w['entities'][1]);
test_article={'id':'av38-test-chronicle-article','title':'[ТЕСТ] Связи Летописи: от Амены к Цитадели',
  'body':'# Проверка сквозной навигации\n\nЭта статья — технический тест, а не канон Аврона.\n\nЦепочка: Летопись → статья → пересечение Атласа → объект Амена → Цитадель Вечного Света.\n\n[[Амена]] и [[Цитадель Вечного Света]] — ссылки для Finder.\n',
  'summary':'Тестовый материал для проверки единого реестра, можно удалить после испытаний.','libraryId':lib,'folderId':'','draft':True,
  'tags':['технический тест v38'],'parentRefs':['book:av38-test-chronicle','entity:'+test_entity['id'],'entity:'+test_loc['id'],'lore:av38-test-intersection']}
if test_article['id'] not in existing:w['articles'].append(test_article);existing.add(test_article['id']);count['test_article']+=1
book={'id':'av38-test-chronicle','name':'[ТЕСТ] Летопись единого реестра','layout':'chronicle','icon':'◷','visible':False,'eventIds':[],
      'articleIds':[test_article['id']],'cinematicId':'av38-test-cinematic','intro':'Технический маршрут. Не часть канона.'}
if not any(x['id']==book['id'] for x in w.get('chronicleBooks',[])):w.setdefault('chronicleBooks',[]).append(book);count['test_book']+=1
cinematic={'id':'av38-test-cinematic','name':'[ТЕСТ] Художественная Летопись единого реестра','godId':0,'category':'Технические тесты','published':False,'ending':'close','introTitle':'Проверка связей','introText':'Не часть канона','articleIds':[test_article['id']],'entityIds':[test_entity['id'],test_loc['id']],'chapters':[{'label':'ПРОЛОГ','title':'Путь через единый реестр','text':'Техническая проверка переходов и связанных материалов.'}]}
if not any(x['id']==cinematic['id'] for x in w.get('chronicles') or []):(w.setdefault('chronicles',[]) if isinstance(w.get('chronicles'),list) else w.__setitem__('chronicles',[]));w['chronicles'].append(cinematic);count['test_cinematic']+=1
w.setdefault('loreMatrix',{'categories':[],'nodes':[],'records':[]}).setdefault('records',[])
lore={'id':'av38-test-intersection','title':'[ТЕСТ] Пересечение Амена — Цитадель','kind':'Тестовая связь',
      'nodeIds':['entity:'+test_entity['id'],'entity:'+test_loc['id']],'entityIds':[test_entity['id'],test_loc['id']],
      'godIds':[],'articleId':test_article['id'],'published':False,'notes':'Технический маршрут для проверки','revealAfterRead':False}
if not any(x['id']==lore['id'] for x in w['loreMatrix']['records']):w['loreMatrix']['records'].append(lore);count['test_lore']+=1
for source in ['book:av38-test-chronicle','entity:'+test_entity['id'],'entity:'+test_loc['id'],'lore:av38-test-intersection']:
 add(source,'article:'+test_article['id'])
for source in ['article:'+test_article['id'],'book:av38-test-chronicle']:
 add(source,'lore:av38-test-intersection')

w['archiveImport']={'version':38,'sources':{'journal':str(SOURCES[0][1].name),'books':str(SOURCES[1][1].name)},
                    'pages':dict(count),'mediaPath':'assets/import-v38/','wikiUnresolved':len(unresolved),
                    'wikiAmbiguous':len(ambiguous),'policy':'foundryId+sourcePath stable, never merge by title, explicit wiki matches only'}
OUT.write_text(json.dumps(w,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(BASE/'src'/'default-world-v32.js').write_text('window.AvronDefaultWorld = '+json.dumps(w,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
report={'counts':dict(count),'input_md':len(imported),'imported_images':asset_copied,
        'total_articles':len(w['articles']),'total_entities':len(w['entities']),'total_books':len(w['chronicleBooks']),
        'unresolved_count':len(unresolved),'ambiguous_count':len(ambiguous),
        'unresolved_sample':unresolved[:40],'ambiguous_sample':ambiguous[:40],'world_json_bytes':OUT.stat().st_size}
(BASE/'reports'/'IMPORT_AUDIT_V38.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
(BASE/'reports'/'UNRESOLVED_FOUNDRY_LINKS_V38.json').write_text(json.dumps({'unresolved':unresolved,'ambiguous':ambiguous},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if not k.endswith('sample')},ensure_ascii=False,indent=2))
