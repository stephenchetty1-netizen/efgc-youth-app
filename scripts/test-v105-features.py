#!/usr/bin/env python3
"""V105 mobile workflows. Synthetic data only; all external requests are blocked."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('EFGC_TEST_URL','http://127.0.0.1:8081/index.html?v=105')
OUT=Path(os.environ.get('EFGC_SCREENSHOT_DIR','/tmp/efgc-v105-qa'));OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':393,'height':852},is_mobile=True,has_touch=True)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('https://**/*',lambda route:route.abort())
    page.goto(BASE,wait_until='domcontentloaded')
    page.wait_for_function('() => !!window.EFGCV105')
    page.evaluate("""()=>{
      window.__content=[];window.__signups=[];window.__mentoring=[];window.__checks=[];
      window.__readings=[];window.__writes=[];window.__emptyAck=false;
      window.EFGCAuth.getMyProfile=async()=>({id:session?.uid,role:session?.role,approval_status:'approved'});
      window.EFGCAuth.rest=async(path,options={})=>{
        const u=new URL(path,'https://test/'),table=u.pathname.slice(1),q=u.searchParams;
        const method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
        if(method!=='GET'){
          __writes.push({path,method,body});if(__emptyAck)return [];
          if(method==='POST'){
            const row={id:'00000000-0000-4000-8000-'+String(__writes.length).padStart(12,'0'),created_at:new Date().toISOString(),status:'requested',...body};
            if(table==='v105_content')__content.push(row);
            if(table==='v105_signups')__signups.push(row);
            if(table==='v105_mentoring')__mentoring.push(row);
            if(table==='v105_checkins')__checks.push(row);
            if(table==='reading_progress')__readings.push(row);
            return [row];
          }
          return [{id:q.get('id')?.slice(3),...body}];
        }
        if(table==='v105_content'){
          if(window.__delayContent)return new Promise(r=>window.__releaseContent=r);
          return __content.filter(r=>r.kind===q.get('kind')?.slice(3));
        }
        if(table==='v105_signups')return __signups;
        if(table==='v105_mentoring')return __mentoring;
        if(table==='v105_checkins')return __checks;
        if(table==='events')return [{id:42,title:'Youth evening',event_date:new Date().toISOString()}];
        if(table==='reading_progress')return __readings;
        if(table==='attendance')return [{event_id:42,status:'present'},{event_id:43,status:'absent'}];
        return [];
      };
      session={uid:'00000000-0000-4000-8000-000000000102',role:'youth',approval_status:'approved',name:'Test Youth'};
      renderShell();
    }""")
    # Real handset navigation through More.
    page.locator('#v88MobileNav [data-v88-more]').click()
    page.locator('#v88MoreLinks [data-v88-route="communityHub"]').click()
    page.get_by_role('button',name='Mark as read',exact=True).click()
    page.wait_for_function("()=>document.querySelector('#v105Status').textContent==='Saved.'")
    assert page.get_by_role('button',name='✓ Read today').is_disabled()
    assert page.evaluate('__readings.length')==1
    page.locator('[data-v105-tab="prayer"]').click()
    page.locator('#v105ContentForm [name=title]').fill('Pray for our exams')
    page.locator('#v105ContentForm [name=body]').fill('Please pray for peace and wisdom this week.')
    page.locator('#v105ContentForm button').click()
    page.wait_for_function("()=>document.querySelector('#v105Status').textContent==='Saved.'")
    assert page.evaluate('__content[0].status')=='pending'
    assert page.locator('[data-v105-action="publish"]').count()==0
    page.locator('[data-v105-tab="checkin"]').click()
    page.get_by_role('button',name='Check in',exact=True).click()
    page.wait_for_function("()=>document.querySelector('#v105Status').textContent==='Saved.'")
    assert page.get_by_role('button',name='✓ Check-in sent').is_disabled()
    assert page.evaluate('__checks.length')==1
    assert not page.evaluate("__writes.some(w=>w.path.startsWith('attendance'))")
    page.evaluate("""()=>__content.push({id:'00000000-0000-4000-8000-000000000500',kind:'group',title:'Bible study',body:'Weekly fellowship',status:'published',created_at:new Date().toISOString(),created_by:'admin'})""")
    page.locator('[data-v105-tab="group"]').click()
    page.get_by_role('button',name='Request to join',exact=True).click()
    page.wait_for_function("()=>document.querySelector('#v105Status').textContent==='Saved.'")
    assert 'Your request: requested' in page.locator('#v105Body').inner_text()
    page.locator('[data-v105-tab="mentoring"]').click()
    page.locator('#v105MentoringForm textarea').fill('I would like help with a Bible study plan.')
    page.locator('#v105MentoringForm button').click()
    page.wait_for_function("()=>document.querySelector('#v105Status').textContent==='Saved.'")
    assert page.evaluate('__mentoring.length')==1
    page.locator('[data-v105-tab="summary"]').click()
    page.wait_for_selector('#v105Year')
    assert page.locator('.v105-stats strong').all_text_contents()==['1','2','1','0']
    # Untrusted text and URL rendering: no HTML or script execution.
    page.evaluate("""()=>__content.push({id:'x',kind:'resource',title:'<img src=x onerror=alert(1)>',body:'<script>window.bad=true</script>',url:'javascript:alert(1)',status:'published',created_at:new Date().toISOString()})""")
    page.locator('[data-v105-tab="resource"]').click()
    page.wait_for_function("()=>document.querySelector('#v105Status').textContent===''")
    assert page.locator('#v105Body script,#v105Body img,#v105Body a').count()==0
    assert page.evaluate('!!window.bad') is False
    assert page.evaluate("EFGCV105.safeUrl('https://name:password@example.com')")==''
    # Admin publication, moderation and setlist form.
    page.evaluate("()=>{session={...session,uid:'00000000-0000-4000-8000-000000000101',role:'admin',name:'Admin'};renderShell();showTab('communityHub');}")
    page.locator('[data-v105-tab="prayer"]').click()
    page.locator('[data-v105-action="publish"]').click()
    page.wait_for_function("()=>document.querySelector('#v105Status').textContent==='Saved.'")
    assert page.evaluate('__writes.at(-1).body.status')=='published'
    page.locator('[data-v105-tab="setlist"]').click()
    page.locator('#v105ContentForm [name=title]').fill('Friday worship')
    page.locator('#v105ContentForm [name=body]').fill('1. Amazing Grace — G\n2. Great Is Thy Faithfulness — D')
    page.locator('#v105ContentForm button').click()
    page.wait_for_function("()=>document.querySelector('#v105Status').textContent==='Saved.'")
    assert page.evaluate('__content.at(-1).kind')=='setlist'
    page.screenshot(path=str(OUT/'v105-setlists-mobile.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2')
    # Empty server acknowledgement is an error, never a success message.
    page.evaluate('()=>{__emptyAck=true}')
    page.locator('#v105ContentForm [name=title]').fill('Another setlist')
    page.locator('#v105ContentForm [name=body]').fill('Song details')
    page.locator('#v105ContentForm button').click()
    page.wait_for_function("()=>document.querySelector('#v105Status').textContent.includes('did not confirm')")
    assert page.locator('#v105ContentForm [name=body]').input_value()=='Song details'
    # Delayed fetches cannot reinsert private information after logout.
    page.evaluate('()=>{__delayContent=true}')
    page.locator('[data-v105-tab="prayer"]').click()
    page.wait_for_function('()=>!!window.__releaseContent')
    page.evaluate("""()=>{session=null;renderShell();__releaseContent([{kind:'prayer',title:'PRIVATE',body:'SECRET',created_at:new Date().toISOString()}]);}""")
    page.wait_for_timeout(150)
    assert page.locator('#v105Body').inner_text()==''
    assert page.locator('#communityHub').is_hidden()
    assert not errors,errors
    print('V105 MOBILE PASS: routing, reading, prayer moderation, check-in, groups, mentoring, year summary, setlists, XSS, save errors and logout privacy')
    page.close()

    # Exercise both actual auth scripts, with server 429 and duplicate submits.
    page=browser.new_page()
    page.route('https://**/*',lambda route:route.abort())
    page.goto(BASE,wait_until='domcontentloaded')
    page.wait_for_function('()=>!!window.EFGCRegistrationHandler')
    page.evaluate("""()=>{
      document.querySelector('[data-auth-mode=register]').click();
      const values={loginName:'Test Youth',loginPhone:'0712345678',loginPassword:'A test password 123!',loginDob:'2000-01-01',parentName:'Guardian',parentPhone:'0712345679',emergencyName:'Emergency',emergencyPhone:'0712345679'};
      for(const [id,value] of Object.entries(values))document.getElementById(id).value=value;
      const dt=new DataTransfer();dt.items.add(new File(['test'],'photo.png',{type:'image/png'}));document.querySelector('#loginPhoto').files=dt.files;
      window.__authCalls=0;window.fetch=async()=>{__authCalls++;await new Promise(r=>window.__releaseAuth=r);return new Response(JSON.stringify({error:'Too many attempts',retry_after:900}),{status:429,headers:{'Content-Type':'application/json'}});};
      window.__firstLogin=loginUser();window.__secondLogin=loginUser();
    }""")
    assert page.evaluate('__authCalls')==1
    page.evaluate('async()=>{__releaseAuth();await Promise.all([__firstLogin,__secondLogin]);}')
    assert page.locator('#continueButton').is_disabled()
    assert '15 min' in page.locator('#continueButton').text_content()
    page.evaluate('async()=>{await loginUser()}')
    assert page.evaluate('__authCalls')==1
    page.evaluate("()=>document.querySelector('[data-auth-mode=signin]').click()")
    assert page.locator('#continueButton').is_enabled()
    print('V105 AUTH PASS: OTP adapter shares busy guard; 429 starts persistent cooldown; sign-in remains available')
    browser.close()
