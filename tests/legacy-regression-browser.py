import os, shutil
"""Chromium UI checks. This environment blocks file/HTTP navigation.
Storage is injected on about:blank, so these are not native persistence or OAuth tests.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
from PIL import Image
P=Path(__file__).resolve().parents[1];OUT=P/'test-output'/'regression-v3';OUT.mkdir(parents=True,exist_ok=True)
HTML=(P/'La-Homa-web-v5.html').read_text();results=[]
Image.new('RGB',(800,600),(183,203,162)).save(OUT/'test-photo.png')
def ok(n):results.append(n);print('PASS',n,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1440,'height':1050},locale='es-ES',timezone_id='Europe/Madrid',accept_downloads=True)
 pg=ctx.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.evaluate("""() => {for(const name of ['localStorage','sessionStorage']) {const data={};Object.defineProperty(window,name,{value:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]},configurable:true});}}""")
 pg.set_content(HTML);pg.wait_for_timeout(150)
 pg.evaluate("""() => {window.__uiErrors=[];new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&n.matches('.toast.error'))__uiErrors.push(n.textContent);}).observe(document,{subtree:true,childList:true});}""")
 def click(a,extra='',scope=''):pg.locator(f'{scope} [data-action="{a}"]{extra}'.strip()).first.click();pg.wait_for_timeout(40)
 def view(v):
  pg.evaluate("v=>{const el=document.createElement('button');el.dataset.action='nav';el.dataset.view=v;document.body.appendChild(el);el.click();el.remove();}",v);pg.wait_for_timeout(50)
 def st():return pg.evaluate('FamilyPoints.getState()')
 def submit():
  pg.locator('#modal [type=submit]').click();pg.wait_for_timeout(90)
  if pg.locator('#modal').evaluate('(e)=>e.open'):raise AssertionError(pg.locator('#modal').inner_text()[-900:])
 def close():
  click('close',scope='#modal')
  if pg.locator('[data-action=web5-discard]').count():click('web5-discard')
 assert pg.locator('#access-form').count()==1;assert pg.locator('[data-action=access-oauth]:disabled').count()==2;ok('Account landing distinguishes local from unavailable providers')
 click('access-tab');assert pg.locator('#access-form [name=repeat]').count();ok('Manual registration form asks for repeated password')
 click('access-target','[data-mode=cloud]');assert pg.locator('#access-form [type=submit]').is_disabled();ok('Cloud signup remains disabled without service configuration')
 click('access-guest');assert st()['schemaVersion']==3;ok('Guest mode loads v3 without cloud traffic')
 view('money');click('v3-savings-config');pg.locator('#modal [name=enabled]').check();pg.locator('#modal [name=rate]').fill('5');pg.locator('#modal [name=period]').select_option('month');submit();assert st()['finance']['savingsPlans'][0]['rate']==5;ok('Adult can enable one compounded savings rate')
 assert 'Ahorro remunerado' in pg.locator('main').inner_text();assert 'cada 30' in pg.locator('.savings-growth').inner_text();ok('Savings panel shows total savings and chosen period')
 click('v2-money-config');pg.locator('#modal [name=policy]').select_option('tiers');submit();a=next(x for x in st()['finance']['accounts'] if x['memberId']=='ana');assert a['policy']=='tiers' and len(a['tiers'])==3;ok('Allowance band form saves inclusive point ranges')
 click('v2-money-config');click('v3-tier-add',scope='#modal');rows=pg.locator('.tier-edit-row');assert rows.count()==4;click('v3-tier-remove',scope='.tier-edit-row:last-child');assert rows.count()==3;ok('Allowance ranges can be added and removed')
 pg.locator('[name=tierMin]').nth(1).fill('19');pg.locator('#modal [type=submit]').click();pg.wait_for_timeout(70);assert pg.locator('#modal').evaluate('(e)=>e.open');assert 'solapan' in pg.locator('#toasts').inner_text();close();ok('Overlapping ranges cannot be committed')
 pg.locator('#toasts').evaluate('(e)=>e.replaceChildren()');pg.screenshot(path=str(OUT/'savings-desktop.png'),full_page=True)
 view('organize');click('v3-presence-form');pg.locator('[name=pattern]').select_option('223');assert pg.locator('[name=cycleDay]').count()==14;pg.locator('[name=title]').fill('Convivencia 2 + 2 + 3');submit();assert st()['presencePlans'][0]['type']=='223';ok('Recurring 2+2+3 residence pattern saves fourteen days')
 click('v3-presence-exception');pg.locator('#modal [name=reason]').fill('Vacaciones juntos');pg.locator('#modal [name=from]').fill('2026-10-05');pg.locator('#modal [name=to]').fill('2026-10-09');pg.locator('#modal [name=present]').select_option('yes');submit();assert st()['presenceOverrides'][0]['present'];ok('Vacation stay overrides regular schedule')
 click('v3-presence-exception-edit');pg.locator('#modal [name=to]').fill('2026-10-10');submit();assert len(st()['presenceOverrides'])==1;ok('Existing vacation can be edited without duplicate exception')
 old=pg.locator('.presence-day').first.get_attribute('data-date');click('v3-presence-week','[data-offset="28"]');assert pg.locator('.presence-day').first.get_attribute('data-date')!=old;ok('Residence calendar browses future cycles')
 pg.locator('#toasts').evaluate('(e)=>e.replaceChildren()');pg.screenshot(path=str(OUT/'residence-desktop.png'),full_page=True)
 view('family');click('member-form','[data-id=ana]');photo=pg.locator('.photo-control [data-v3-photo=upload]').first;photo.set_input_files(str(OUT/'test-photo.png'));pg.wait_for_function("document.querySelector('#modal [name=photo]').value.startsWith('data:image/jpeg')");submit();assert next(x for x in st()['members'] if x['id']=='ana')['photo'].startswith('data:image/jpeg');ok('Profile photo is resized and saved')
 assert pg.locator('.person-card img').count()>=1;ok('Saved profile picture replaces avatar in family view')
 view('recipes');click('recipe-form');pg.locator('#modal [name=name]').fill('Ensalada de prueba');pg.locator('#modal [name=name]').dispatch_event('change');pg.locator('#modal [name=steps]').fill('Lava y corta los tomates.\nMezcla y sirve.');pg.locator('[name=iname]').fill('Tomates');pg.locator('[name=iname]').dispatch_event('change');pg.locator('[name=iqty]').fill('500');pg.locator('[name=iunit]').select_option('g');pg.locator('#modal [name=photo]').evaluate("e=>e.value=''")
 pg.locator('.photo-control [data-v3-photo=upload]').first.set_input_files(str(OUT/'test-photo.png'));pg.wait_for_function("document.querySelector('#modal [name=photo]').value.startsWith('data:image/jpeg')")
 pg.locator('.ingredient-editor details').evaluate('(e)=>e.open=true');pg.locator('[name=istore]').select_option('Lidl');pg.locator('[name=iproduct]').fill('Tomate habitual');pg.locator('.ingredient-editor [data-v3-photo=upload]').set_input_files(str(OUT/'test-photo.png'));pg.wait_for_function("document.querySelector('[name=iphoto]').value.startsWith('data:image/jpeg')");submit()
 r=next(r for r in st()['recipes'] if r['name']=='Ensalada de prueba');assert r['ingredients'][0]['quantity']=='500 g' and r['photo'];ok('Structured recipe stores quantities, store, product and photos')
 click('recipe-view',f'[data-id="{r["id"]}"]');assert pg.locator('#modal .ingredient-row img').count()==1;pg.locator('#recipe-servings').fill('8');pg.locator('#recipe-servings').dispatch_event('change');assert '1000 g' in pg.locator('#modal').inner_text();ok('Recipe scales servings and displays catalog ingredient photos')
 click('recipe-shopping',scope='#modal');submit();x=next(x for x in st()['shopping'] if x['name']=='Tomates');assert x['quantity']=='1000 g' and x['store']=='Lidl';ok('Recipe ingredients reach shopping with scaled quantity and store')
 click('recipe-tab','[data-tab=ingredients]');assert pg.locator('.food-record img').count()>=1;ok('Reusable ingredient catalog shares saved photos')
 view('shopping');assert pg.locator('.shopping-item img').count()>=1;pg.locator('[data-v3-shop]').select_option('Mercadona');assert st()['settings']['preferredShop']=='Mercadona';ok('Shopping shows photos and remembers supermarket preference')
 view('recipes');click('recipe-form',scope='main');click('v3-ingredient-add',scope='#modal');assert pg.locator('.ingredient-editor').count()==2;click('v3-ingredient-remove',scope='.ingredient-editor:last-child');assert pg.locator('.ingredient-editor').count()==1;close();ok('Recipe editor adds and removes ingredient rows')
 view('pantry');click('v2-pantry-form',scope='main');pg.locator('#modal [name=name]').fill('Garbanzos');pg.locator('#modal [name=quantity]').fill('2');pg.locator('#modal [name=unit]').select_option('bote');submit();assert any(x['name']=='Garbanzos' and x['unit']=='bote' for x in st()['pantry']);ok('Pantry accepts practical package units')
 view('kitchen');click('v2-kitchen-person','[data-id=ana]');assert pg.locator('#v3-kitchen-clear').count()==1;click('v3-kitchen-return');assert pg.locator('.kitchen-welcome').count()==1;ok('Selected tablet profile returns without adult login')
 click('v2-kitchen-person','[data-id=ana]');click('v2-kitchen-wallet');assert pg.locator('#v3-tablet-back').count()==1;click('v3-kitchen-return');assert pg.locator('.kitchen-welcome').count()==1;ok('Child wallet returns directly to tablet')
 click('v2-kitchen-person','[data-id=mama]');assert pg.evaluate('FamilyPoints.getActor().role')=='member';ok('Adult tablet tile does not silently grant administrator privileges')
 click('profile-adult');pg.wait_for_timeout(60);assert pg.evaluate('FamilyPoints.getActor().role')=='adult';ok('Existing parent entry remains accessible')
 for width in [390,768,1024,1440]:
  for v in ['home','money','organize','recipes','shopping','pantry','settings']:
   view(v);pg.set_viewport_size({'width':width,'height':1000});pg.wait_for_timeout(15)
   assert not pg.evaluate('document.documentElement.scrollWidth>innerWidth+1'),f'Overflow {v} {width}'
  ok(f'Seven updated pages fit at {width}px')
  view('money');pg.set_viewport_size({'width':width,'height':1000});pg.locator('#toasts').evaluate('(e)=>e.replaceChildren()');pg.screenshot(path=str(OUT/f'savings-{width}.png'),full_page=True)
 assert not errors,errors
 unexpected=pg.evaluate("__uiErrors.filter(x=>!x.includes('solapan'))");assert not unexpected,unexpected
 ok('No uncaught browser errors in tested flows')
 (OUT/'browser-results.json').write_text(json.dumps({'passed':len(results),'tests':results,'storage':'simulated on about:blank','nativePersistence':False,'realOAuth':False},indent=2))
 b.close()
print('TOTAL',len(results))
