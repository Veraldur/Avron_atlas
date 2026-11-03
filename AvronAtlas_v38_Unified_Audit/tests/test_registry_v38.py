import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
P=Path(__file__).resolve().parents[1]/'src'
w=json.load(open(str(Path(__file__).resolve().parent/'fixtures/avron-v38.json'),encoding='utf8'))
async def run():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=await browser.new_page(); errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  await page.set_content('''<!doctype html><html><body><div id="worldNav"><span id="customNav"></span></div><div id="tabObject"></div><div id="avronArticleStudio" hidden></div></body></html>''')
  await page.evaluate('''(w)=>{window.S={world:w,mode:'edit',selId:null};window.scheduleSave=()=>{};window.AvronRelicary={unlockedArticle:()=>true,has:()=>true};window.AvronArticleStudio={open(id){window.__lastOpened=id},close(){}};window.AvronHub={enter:()=>{}};window.AvronSlots={go:()=>{},render:()=>{}};window.PantheonGetGods=()=>{};window.PantheonCinematics={openScene:()=>{}};window.prompt=()=>null;window.confirm=()=>true;}''',w)
  for name in ['lore-store.js','navigation-core-v30.js','material-registry-v37.js','unified-material-core-v38.js','creative-studio.js']:
   await page.add_script_tag(content=(P/name).read_text(encoding='utf8'))
  r=await page.evaluate('''()=>{
   const m=AvronMaterials,reg=AvronRegistry,nav=AvronNav,w=S.world;
   const test=w.integrationTestV38;
   const outputs={};
   outputs.artExists=m.has('article:'+test.articleId);
   outputs.bookExists=m.has('book:'+test.bookId);
   outputs.loreExists=m.has('lore:'+test.loreId);
   outputs.articleParents=reg.parents(reg.item('article:'+test.articleId)).length;
   outputs.finderTitleMatch=m.titleLookup('Тестовая летопись · Свет над Аменой').length;
   outputs.navArticle=nav.open('article:'+test.articleId);
   outputs.opened=window.__lastOpened;
   outputs.navLore=nav.open('lore:'+test.loreId);
   outputs.loreModal=!!document.getElementById('avronMatrix');
   outputs.matrixOpenArticle=!!document.getElementById('mxOpenArticle');
   outputs.audit=m.audit();
   return outputs;
  }''')
  await page.click('#mxOpenArticle');
  r['matrixToArticle']=await page.evaluate('window.__lastOpened');
  r['matrixClosed']=await page.evaluate('!document.getElementById("avronMatrix")');
  more=await page.evaluate('''()=>{
   const w=S.world,m=AvronMaterials;
   const a=m.create('article',{title:'Браузерный тест — статья',parents:['entity:b5823692','book:'+w.integrationTestV38.bookId,'lore:'+w.integrationTestV38.loreId]});
   const found=m.has('article:'+a.id), parents=a.parentRefs.length;
   const back=w.contentLinks['book:'+w.integrationTestV38.bookId].some(x=>x.id===a.id);
   const forward=w.chronicleBooks.find(x=>x.id===w.integrationTestV38.bookId).articleIds.includes(a.id);
   const matched=m.titleLookup(a.title,{kind:'article'}).length;
   m.detach('book:'+w.integrationTestV38.bookId,'article:'+a.id);
   const detached=!a.parentRefs.includes('book:'+w.integrationTestV38.bookId);
   return {found,parents,back,forward,matched,detached};
  }''');r['creation']=more;r['errors']=errors
  print(json.dumps(r,ensure_ascii=False,indent=2,default=str)[:13500]);await browser.close()
  assert not errors,errors
  assert all([r['artExists'],r['bookExists'],r['loreExists'],r['navArticle'],r['navLore'],r['loreModal'],r['matrixOpenArticle'],r['matrixClosed']]);assert r['matrixToArticle']==w['integrationTestV38']['articleId'];assert more=={'found':True,'parents':3,'back':True,'forward':True,'matched':1,'detached':True}
asyncio.run(run())
