import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
base=Path(__file__).resolve().parents[1]/'src'
w=json.load(open(str(Path(__file__).resolve().parent/'fixtures/avron-v38.json')))
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=await browser.new_page(); errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  await page.set_content('<!doctype html><div id="worldNav"><span id="customNav"></span></div><div id="tabObject"></div>')
  await page.evaluate('''(w)=>{window.S={world:w,mode:'edit',selId:null};window.scheduleSave=()=>{};window.AvronRelicary={unlockedArticle:()=>true,has:()=>true};window.AvronArticleStudio={open:id=>window.__article=id,close:()=>{}};window.AvronHub={enter:()=>{}};window.AvronSlots={go:()=>{},render:()=>{}};window.AvronPantheonEngine={openGallery:()=>window.__gallery=true,openEditor:id=>window.__god=id};window.PantheonGetGods=()=>{};window.prompt=()=>null;}''',w)
  for f in ['lore-store.js','navigation-core-v30.js','material-registry-v37.js','unified-material-core-v38.js','creative-studio.js']:
   await page.add_script_tag(content=(base/f).read_text())
  finder=(base/'ui.js').read_text();start=finder.index('const avronFinder=(()=>{');end=finder.index('window.AvronFinder=avronFinder;')+len('window.AvronFinder=avronFinder;');await page.add_script_tag(content=finder[start:end])
  r=await page.evaluate('''()=>{
   const m=AvronMaterials,reg=AvronRegistry,nav=AvronNav;
   const names=['Тестовая летопись','Свет над Аменой','Тестовое пересечение','Цитадель Вечного Света'];
   const examples=names.map(q=>({search:q,results:AvronFinder.matches(q).slice(0,7).map(x=>x.kind+':'+x.id)}));
   const exhibits=reg.all().filter(x=>x.kind==='exhibit');
   const pantheon=exhibits.find(x=>x.id.startsWith('legacy-section-pantheon~god~'));
   let a=m.create('article',{title:'Тест привязки экспоната',parents:['exhibit:'+pantheon.id]});
   const source=reg.item('exhibit:'+pantheon.id);
   const before=a.parentRefs.includes('exhibit:'+pantheon.id);
   const reverse=S.world.contentLinks['exhibit:'+pantheon.id].find(x=>x.kind==='article'&&x.id===a.id);
   const navOpened=nav.open('exhibit:'+pantheon.id);
   return {examples,exhibits:exhibits.length,sourceKind:source.sourceKind,before,reverse:!!reverse,navOpened,openedGod:window.__god,attachedCanonArticle:a.id,scan:m.scanWiki().issues};
  }''')
  print(json.dumps(r,ensure_ascii=False,indent=2)[:5200]);print('js errors',errs)
  assert len(r['examples'][0]['results'])>=1 and r['exhibits']>=19 and r['before'] and r['reverse'] and r['navOpened'] and not errs
  await browser.close()
asyncio.run(main())
