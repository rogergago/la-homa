import os, shutil
"""UI assertions on about:blank. Injected storage, not a native persistence test."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-output';OUT.mkdir(exist_ok=True)
HTML=(ROOT/'La-Homa-web-v5.html').read_text()
results=[]; errors=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1440,'height':1000},locale='es-ES',timezone_id='Europe/Madrid',accept_downloads=True)
 p=ctx.new_page();p.on('pageerror',lambda e: errors.append(str(e)))
 p.evaluate("""()=>{for(const name of ['localStorage','sessionStorage']) {const data={};Object.defineProperty(window,name,{value:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]},configurable:true});}}""")
 p.set_content(HTML);p.wait_for_timeout(150)
 def check(name,condition=True):
  assert condition,name
  results.append(name);print('PASS',name,flush=True)
 def click(a,extra='',scope=''):
  p.locator(f'{scope} [data-action="{a}"]{extra}'.strip()).first.click();p.wait_for_timeout(80)
 def view(v):
  p.evaluate("v=>{const el=document.createElement('button');el.dataset.action='nav';el.dataset.view=v;document.body.appendChild(el);el.click();el.remove();}",v);p.wait_for_timeout(60)
 def state():return p.evaluate('FamilyPoints.getState()')
 def close():
  if p.locator('#modal').evaluate('e=>e.open'):
   click('close',scope='#modal')
   if p.locator('[data-action=web5-discard]').count():click('web5-discard')
 def submit():
  p.locator('#modal [type=submit]').click();p.wait_for_timeout(160)
  assert not p.locator('#modal').evaluate('e=>e.open'),p.locator('#modal').inner_text()[-1500:]
 check('Access page renders',p.locator('#access-form').count()==1)
 click('access-guest')
 check('Five grouped adult navigation entries',p.locator('.sidebar-nav .nav-link').count()==6)
 for v in ['home','inbox','notifications','tasks','routines','history','calendar','events','organize','recipes','shopping','pantry','family','money','rewards','settings']:
  view(v);check('Renders '+v,len(p.locator('main').inner_text())>50)
 view('home');view('shopping')
 check('Route reflects current page',p.evaluate('location.hash').startswith('#/shopping'))
 p.evaluate('history.back()');p.wait_for_timeout(200)
 check('Browser Back returns to previous page',p.evaluate('location.hash').startswith('#/home') and 'Hoy sumamos' in p.locator('main').inner_text())
 p.evaluate('history.forward()');p.wait_for_timeout(200)
 check('Browser Forward restores page',p.evaluate('location.hash').startswith('#/shopping') and p.locator('[data-change=web5-list]').count()==1)
 view('tasks');click('task-form',scope='main')
 p.locator('#modal [name=title]').fill('Regar plantas flexible')
 p.locator('#modal [name=frequency]').select_option('flexible')
 p.locator('#modal [name=quota]').fill('3')
 p.locator('#modal [name=members][value=ana]').check()
 submit()
 check('Flexible template saved',any(t['title']=='Regar plantas flexible' and t['quota']==3 for t in state()['templates']))
 view('recipes');click('recipe-form',scope='main');p.locator('#modal [name=name]').fill('Borrador no guardado')
 click('close',scope='#modal');check('Dirty form cannot close silently',p.locator('.discard-warning').count()==1)
 click('web5-keep');check('Keep editing preserves input',p.locator('#modal [name=name]').input_value()=='Borrador no guardado')
 p.keyboard.press('Escape');p.wait_for_timeout(80)
 check('Escape asks before discarding',p.locator('.discard-warning').count()==1 and p.locator('#modal').evaluate('e=>e.open'))
 click('web5-keep');current_hash=p.evaluate('location.hash');p.evaluate('history.back()');p.wait_for_timeout(180)
 check('Back protects a dirty form and restores current route',p.locator('.discard-warning').count()==1 and p.evaluate('location.hash')==current_hash)
 click('web5-keep');check('Keeping a draft cancels queued navigation',p.locator('#modal [name=name]').input_value()=='Borrador no guardado')
 close()
 view('shopping');click('web5-list-new');p.locator('#modal [name=name]').fill('Colegio');submit();check('New list saved',any(x['name']=='Colegio' for x in state()['shoppingLists']))
 click('shopping-form',scope='main');p.locator('#modal [name=name]').fill('Lapices');submit();check('Product associated with chosen list',next(x for x in state()['shopping'] if x['name']=='Lapices')['listId']!='groceries')
 view('events');click('event-form',scope='main');check('Recurring event editor present',p.locator('[name=recurrenceFrequency]').count()==1)
 p.locator('#modal [name=title]').fill('Entrenamiento semanal');p.locator('#modal [name=date]').fill('2026-10-06');p.locator('#modal [name=endDate]').fill('2026-10-06');p.locator('[name=recurrenceFrequency]').select_option('weekly');p.locator('[name=recurrenceUntil]').fill('2026-11-03')
 submit();check('Event series saved',len([x for x in state()['events'] if x['title']=='Entrenamiento semanal'])==5)
 view('recipes');click('web5-recipe-import',scope='main');p.locator('[name=source]').fill(json.dumps({'@type':'Recipe','name':'Arroz de prueba','recipeYield':'4','recipeIngredient':['400 g de arroz'],'recipeInstructions':['Cocer y servir.']}));p.locator('#modal [type=submit]').click();p.wait_for_timeout(100)
 check('Imported recipe opens reviewable draft',p.locator('#modal [name=name]').input_value()=='Arroz de prueba');close()
 for width in [320,360,390,768,1024,1440,1920]:
  p.set_viewport_size({'width':width,'height':1000})
  for v in ['home','inbox','notifications','tasks','routines','history','calendar','events','organize','recipes','shopping','pantry','family','money','rewards','settings']:
   view(v)
   assert not p.evaluate('document.documentElement.scrollWidth>innerWidth+1'),f'Overflow {v} {width}'
  check(f'16 pages fit width {width}')
  if width in [390,1440]:
   view('home');p.evaluate("document.querySelector('#toasts').replaceChildren()");p.screenshot(path=str(OUT/f'home-{width}.png'),full_page=True)
   view('events');p.screenshot(path=str(OUT/f'events-{width}.png'),full_page=True)
 check('No uncaught browser exceptions',not errors)
 (OUT/'browser-results.json').write_text(json.dumps({'passed':len(results),'checks':results,'pageErrors':errors,'storage':'simulated about:blank','nativePersistence':False,'remoteIntegrations':False},ensure_ascii=False,indent=2))
 b.close()
