import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
SRC=Path(__file__).resolve().parents[1]/'src'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=await browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.set_content('<!doctype html><div class="topbar"></div><div id="avronShowcase" hidden></div>')
  await page.evaluate('''()=>{window.S={mode:'edit'};window.AvronDefaultWorld={id:'built-in',name:'Аврон'};window.AvronPersistence={restore:async()=>({id:'idb-world-v37',name:'Восстановлен из IndexedDB'})};window.AvronHub={show:()=>{},enter:()=>{}};window.AvronSlots={go:()=>{}};window.AvronNav={open:()=>true,item:()=>null};window.AvronExplorer={open:()=>{},close:()=>{}};window.AvronAdventures={open:()=>{},close:()=>{}};window.AvronShowcase={open:()=>{}};window.AvronWorldStudio={openBook:()=>{}};window.emptyWorld=()=>({id:'new-world'});window.sanitize=x=>x;window.loadWorld=(x)=>window.__loaded=x;window.setMode=()=>{};window.restoreWorld=()=>({id:'stale-localStorage'});}''')
  await page.add_script_tag(content=(SRC/'offline-v31.js').read_text())
  await page.wait_for_timeout(150)
  visible=await page.locator('[data-resume-row]').evaluate('(el)=>!el.hidden')
  await page.locator('[data-world="resume"]').click()
  res=await page.evaluate('({visible:!document.querySelector("[data-resume-row]").hidden,loaded:window.__loaded?.id,splashHidden:document.getElementById("av31WorldChooser").hidden})')
  print(res,'errors',errors)
  assert visible and res['loaded']=='idb-world-v37' and res['splashHidden'] and not errors
  await browser.close()
asyncio.run(main())
