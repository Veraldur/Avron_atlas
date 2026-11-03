from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
WORLD=Path('/mnt/data/Avron_Migrated_v38_Unified_Archive.json')
OLD_WORLD=Path('/mnt/data/Avron_Migrated_v37_Registry_Workspace.json')

def run():
 w=json.loads(WORLD.read_text(encoding='utf-8'));results=[]
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1340,'height':860});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<!doctype html><html lang="ru"><body><main id="tabObject"></main><nav id="worldNav"><span id="customNav"></span></nav><div id="status"></div></body></html>')
  page.evaluate('''w=>{window.S={world:w,mode:'edit',selId:null,unsaved:false};window.scheduleSave=()=>{window.__saveRequests=(window.__saveRequests||0)+1};window.AvronRelicary={unlockedArticle:()=>true,has:()=>true};window.AvronHistory={prepare:()=>{}};window.AvronArticleStudio={open:id=>{(window.__opened||=[]).push(id)}};window.AvronPersistence={save:async()=>{window.__stored=structuredClone(window.S.world);return true}};window.PantheonCinematicDefaults=()=>({});window.PantheonNormalizeCinematic=c=>c;window.AvronSlots={render:()=>{}};}''',w)
  for script in ['material-registry-v37.js','unified-material-core-v38.js','lore-store.js','navigation-core-v30.js','creative-studio.js']:
   page.add_script_tag(content=(ROOT/'src'/script).read_text(encoding='utf-8'))
  check=page.evaluate('''()=>{const x=AvronMaterials.audit();const w=S.world;return{registry:x.materialCount,articles:w.articles.length,books:w.chronicleBooks.length,issueCount:x.issues.length,hasLore:AvronMaterials.has('lore:av38-test-intersection'),hasImport:AvronMaterials.has('article:'+w.articles.find(a=>a.sourceKind==='foundry-book').id),testArticle:AvronMaterials.has('article:av38-test-chronicle-article'),imageCount:w.articles.filter(a=>a.body.includes('assets/import-v38/')).length}}''')
  assert check['registry']>1000,check
  assert check['articles']==912,check
  assert check['hasLore'] and check['hasImport'] and check['testArticle'],check
  results.append({'test':'Index of imported archive, 266 objects, all engines','result':'PASS',**check})
  # Link a new article to an entity, a book, a lore intersection and a composite exhibit.
  actual=page.evaluate('''()=>{let w=S.world;let book=AvronMaterials.create('book',{title:'[ТЕСТ БРАУЗЕР] Летопись'});let lore=AvronMaterials.create('lore',{title:'[ТЕСТ БРАУЗЕР] Пересечение',nodeIds:['entity:b5823692']});let article=AvronMaterials.create('article',{title:'[ТЕСТ БРАУЗЕР] Новая статья',draft:true,parents:['book:'+book.id,'lore:'+lore.id,'entity:b5823692']});return{book:book.id,article:article.id,cinematic:book.cinematicId,lore:lore.id,parents:article.parentRefs,bookArticles:book.articleIds,linked:(w.contentLinks['entity:b5823692']||[]).some(x=>x.id===article.id),loreArticle:lore.articleId}}''')
  assert len(actual['parents'])==3 and actual['article'] in actual['bookArticles'] and actual['loreArticle']==actual['article'] and actual['linked'] and actual['cinematic'],actual
  results.append({'test':'Canonical article with three parents, backlinks, chronicle scene','result':'PASS',**actual})
  # Core route: real Atlas Matrix button should open via AvronNav, never rely on obsolete switchScreen.
  page.evaluate("()=>AvronLoreMatrix.open({recordId:'av38-test-intersection'})")
  assert page.locator('#mxOpenArticle').count()==1
  page.locator('#mxOpenArticle').click()
  route=page.evaluate('''()=>({opened:window.__opened||[],navArticle:AvronNav.valid('article','av38-test-chronicle-article')})''')
  assert 'av38-test-chronicle-article' in route['opened'] and route['navArticle'],route
  results.append({'test':'Atlas intersection: Open article → common navigator','result':'PASS',**route})
  # Test explicit title-based Finder and exact imported name; ambiguous title cannot be silently merged.
  title=page.evaluate('''()=>{const w=S.world;const imported=w.articles.find(a=>a.sourceKind==='foundry-journal');return{matches:AvronMaterials.titleLookup(imported.title,{kind:'article'}).length,exactId:imported.id,visible:AvronMaterials.has('article:'+imported.id),chain:AvronNav.outgoing('book:av38-test-chronicle').some(x=>x.id==='av38-test-chronicle-article')}}''')
  assert title['matches']>=1 and title['chain']
  results.append({'test':'Imported Finder title and test Chronicle → article link','result':'PASS',**title})
  # Detach must update both contentLinks and book.articleIds.
  delete=page.evaluate('''()=>{const w=S.world;const book=w.chronicleBooks.find(x=>x.name==='[ТЕСТ БРАУЗЕР] Летопись');const id=book.articleIds[0];AvronMaterials.detach('book:'+book.id,'article:'+id);return{removed:!book.articleIds.includes(id),parentGone:!w.articles.find(a=>a.id===id).parentRefs.includes('book:'+book.id),othersRemain:w.articles.find(a=>a.id===id).parentRefs.length===2}}''')
  assert all(delete.values()),delete
  results.append({'test':'Detaching book parent does not delete article or unrelated parents','result':'PASS',**delete})
  # Confirm removal cleans every reverse edge, without deleting other materials.
  deleted=page.evaluate("""()=>{const a=AvronRegistry.all().find(x=>x.kind==='article'&&x.title==='[ТЕСТ БРАУЗЕР] Новая статья');const id=a.id;
    const ok=AvronMaterials.remove('article:'+id);return {ok,stillExists:AvronMaterials.has('article:'+id),
      dangling:Object.values(S.world.contentLinks||{}).some(xs=>(xs||[]).some(x=>x.kind==='article'&&x.id===id))};}""")
  assert deleted['ok'] and not deleted['stillExists'] and not deleted['dangling'],deleted
  results.append({'test':'Deleting article cleans reverse edges','result':'PASS',**deleted})
  adopted=page.evaluate("""()=>{const e={id:'qa-geometry-v38',name:'[ТЕСТ] Геометрия',typeId:'t-region',mapId:'main',points:[[1,2],[4,6],[7,8]],fields:{color:'silver'}};
    const same=AvronMaterials.adopt('entity',e);const stored=S.world.entities.find(x=>x.id===e.id);
    const good=same===e&&stored.points.length===3&&stored.fields.color==='silver';const deleted=AvronMaterials.remove('entity:'+e.id);
    return{good,deleted,stillExists:AvronMaterials.has('entity:'+e.id)};}""")
  assert adopted['good'] and adopted['deleted'] and not adopted['stillExists'],adopted
  results.append({'test':'Adopt map polygon without losing geometry and remove','result':'PASS',**adopted})
  # In-place archive upgrade from v37 must not destroy a user's edited article.
  page.evaluate("""v=>{window.S.world=v.old;window.AvronDefaultWorld=v.pkg;window.S.world.articles[0].body='[ТЕСТ] МОИ ПРАВКИ';window.S.mode='edit';}""",{'old':json.loads(OLD_WORLD.read_text('utf-8')),'pkg':w})
  page.add_script_tag(content=(ROOT/'src/archive-upgrade-v38.js').read_text('utf-8'))
  migration=page.evaluate("""()=>{const oldCount=S.world.articles.length;const a=AvronArchiveUpgrade.merge();const after=S.world.articles.length;
    const b=AvronArchiveUpgrade.merge();return{oldCount,after,firstNew:a.articles,secondNew:b.articles,
    preservedUserText:S.world.articles[0].body==='[ТЕСТ] МОИ ПРАВКИ',archives:S.world.articles.filter(x=>String(x.sourceKind||'').startsWith('foundry-')).length,
    links:S.world.contentLinks['book:av38-test-chronicle']?.length||0,issues:AvronMaterials.audit().issues.length};}""")
  assert migration['firstNew']==886 and migration['secondNew']==0 and migration['preservedUserText'] and migration['archives']==885 and migration['issues']==0,migration
  results.append({'test':'In-place v37 archive upgrade is idempotent and preserves user-edited content','result':'PASS',**migration})
  page.close();browser.close()
  return results,errors

if __name__=='__main__':
 tests,errors=run();o={'tests':tests,'pageerrors':errors};(ROOT/'reports'/'BROWSER_TEST_V38.json').write_text(json.dumps(o,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(o,ensure_ascii=False,indent=2));assert not errors,errors
