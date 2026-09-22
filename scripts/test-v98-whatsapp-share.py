#!/usr/bin/env python3
"""V98: real Chromium smoke test for Facebook-free WhatsApp sharing, using only synthetic data."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE=os.environ.get('EFGC_TEST_URL','http://127.0.0.1:8081/index.html?v=98')
OUT=Path(os.environ.get('EFGC_SCREENSHOT_DIR','/tmp'))
OUT.mkdir(parents=True,exist_ok=True)
ADMIN='00000000-0000-4000-8000-000000000001'
LEADER='00000000-0000-4000-8000-000000000002'
YOUTH='00000000-0000-4000-8000-000000000003'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':393,'height':852},
      screen={'width':393,'height':852},is_mobile=True,has_touch=True,
      user_agent='Mozilla/5.0 (Linux; Android 16; SM-F966B) AppleWebKit/537.36 Chrome/139.0 Mobile Safari/537.36')
    page.goto(BASE,wait_until='domcontentloaded',timeout=30000)
    page.wait_for_function("() => !!window.EFGCV98WhatsApp && !!window.EFGCV88Layout",timeout=15000)
    page.evaluate("""([A,L,Y])=>{
      window.__v98Drafts=[
        {id:'1',author_id:A,status:'approved',content:'Shalom, Youth! 🙏 Bring a friend.'},
        {id:'2',author_id:L,status:'approved',content:'Meeting 18h30 @ EFGC'},
        {id:'3',author_id:L,status:'pending',content:'UNAPPROVED draft'}
      ];
      window.__v98BackendRole=null;
      window.EFGCAuth.getMyProfile=async()=>({
        id:session.uid,role:window.__v98BackendRole||session.role,
        approval_status:session.approval_status,archived_at:null
      });
      window.EFGCAuth.rest=async path=>{
        if(path.includes('whatsapp_message_drafts?select=')){
          window.__v98LastQuery=path;
          return window.__v98Drafts.filter(d=>d.status==='approved' &&
            (session.role==='admin'||d.author_id===session.uid));
        }
        return [];
      };
      window.EFGCLive.events=async()=>[];
      window.EFGCLive.duties=async()=>[];
      window.EFGCLive.planner=async()=>[];
      window.EFGCLive.adminProfiles=async()=>[];
      session={uid:A,role:'admin',name:'Test Admin',approval_status:'approved'};
      renderShell();
    }""",[ADMIN,LEADER,YOUTH])
    assert page.locator('#whatsappShareMenu').is_visible() or 'hidden' not in page.locator('#whatsappShareMenu').get_attribute('class')
    page.locator('#v88MobileNav [data-v88-more]').click()
    page.locator('#v88MoreLinks [data-v88-route="whatsappShare"]').click()
    page.wait_for_function("() => document.querySelectorAll('#v98WhatsAppApproved .v98-whatsapp-message').length===2")
    assert page.locator('#whatsappShare').is_visible()
    assert page.locator('#v98WhatsAppApproved').get_by_text('UNAPPROVED draft').count()==0
    links=page.locator('#v98WhatsAppApproved a.v98-whatsapp-action')
    assert links.count()==2
    assert links.first.get_attribute('href').startswith('https://wa.me/?text=')
    assert links.first.get_attribute('target')=='_self'
    assert 'status=eq.approved' in page.evaluate('() => window.__v98LastQuery')
    assert page.locator('#efgcWhatsAppAdminCard').count()==0
    page.screenshot(path=str(OUT/'efgc-v98-whatsapp-sharing.png'),full_page=True)
    page.evaluate("""([L])=>{
      session={uid:L,role:'leader',name:'Test Leader',approval_status:'approved'};
      renderShell();showTab('whatsappShare');
    }""",[LEADER])
    page.wait_for_function("() => document.querySelectorAll('#v98WhatsAppApproved .v98-whatsapp-message').length===1")
    assert page.locator('#v98WhatsAppApproved').get_by_text('Meeting 18h30 @ EFGC').count()==1
    page.evaluate("""()=>{window.__v98BackendRole='youth';renderShell();showTab('whatsappShare');}""")
    page.wait_for_function("() => document.querySelector('#whatsappShare').classList.contains('hidden')")
    assert page.locator('#v98WhatsAppApproved .v98-whatsapp-message').count()==0
    page.evaluate("""([Y])=>{
      window.__v98BackendRole=null;
      session={uid:Y,role:'youth',name:'Test Youth',approval_status:'approved'};
      renderShell();showTab('whatsappShare');
    }""",[YOUTH])
    assert page.locator('#whatsappShareMenu').is_hidden()
    assert page.locator('#whatsappShare').is_hidden()
    page.evaluate("""()=>{session=null;renderShell();}""")
    assert page.locator('#v98WhatsAppApproved .v98-whatsapp-message').count()==0
    assert page.evaluate('() => document.documentElement.scrollWidth <= innerWidth+2')
    print('V98 WHATSAPP SHARE PASS: approved-only, staff-only, Android links, no Meta, logout privacy')
    browser.close()
