#!/usr/bin/env python3
"""V97 browser regression: role-authorised Youth/Leader tabs, sanitised member data,
cached-role denial, search, privacy on account switch, preview and journey contrast.
All accounts are synthetic. This test never needs real member credentials.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get("EFGC_TEST_URL", "http://127.0.0.1:8081/index.html?v=97")
OUTPUT = Path(os.environ.get("EFGC_SCREENSHOT_DIR", "/tmp"))
OUTPUT.mkdir(parents=True, exist_ok=True)
UA = ("Mozilla/5.0 (Linux; Android 16; SM-F966B) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0 Mobile Safari/537.36")
ADMIN = "00000000-0000-4000-8000-000000000001"
YOUTH = "00000000-0000-4000-8000-000000000002"
LEADER = "00000000-0000-4000-8000-000000000003"

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 393, "height": 852}, screen={"width":393,"height":852},
                            is_mobile=True, has_touch=True, device_scale_factor=2,user_agent=UA)
    page.goto(BASE, wait_until="domcontentloaded", timeout=30_000)
    page.wait_for_function("() => !!window.EFGCV97Directory && !!window.EFGCV88Layout",timeout=15_000)
    page.evaluate("""([ADMIN,YOUTH,LEADER]) => {
      window.__directoryProfiles = [
        {id:ADMIN,full_name:'Layout Admin',role:'admin',approval_status:'approved',
          leader_role:'Main Youth Leader'},
        {id:LEADER,full_name:'Approved Leader',role:'leader',approval_status:'approved',
          leader_role:'Youth Leader'},
        {id:YOUTH,full_name:'Test Youth',role:'youth',approval_status:'approved',leader_role:null},
        {id:'00000000-0000-4000-8000-000000000005',full_name:'Another Youth',
          role:'youth',approval_status:'approved',leader_role:null},
        {id:'00000000-0000-4000-8000-000000000006',full_name:'Pending Candidate',
          role:'leader',approval_status:'pending',leader_role:'Main Youth Leader'}
      ];
      window.EFGCAuth.getMyProfile=async () => ({
        id:session.uid,role:window.__forceBackendRole || session.role,
        approval_status:window.__forceBackendApproval || session.approval_status,archived_at:null
      });
      window.EFGCAuth.rest=async path => {
        if(path.startsWith('profiles?select=id,full_name,role,approval_status,leader_role'))
          return window.__directoryProfiles;
        return [];
      };
      window.EFGCLive.events=async()=>[];
      window.EFGCLive.duties=async()=>[];
      window.EFGCLive.planner=async()=>[];
      window.EFGCLive.adminProfiles=async()=>[];
      session={uid:ADMIN,name:'Layout Admin',role:'admin',approval_status:'approved'};
      renderShell();
    }""",[ADMIN,YOUTH,LEADER])
    assert page.locator("#staffDirectoryMenu").count()==1
    assert "hidden" not in page.locator("#staffDirectoryMenu").get_attribute("class").split()
    page.locator("#v88MobileNav [data-v88-more]").click()
    page.locator('#v88MoreLinks [data-v88-route="staffDirectory"]').click()
    page.wait_for_function("() => document.querySelector('#v97YouthCount').textContent === '2'")
    assert page.locator("#staffDirectory").is_visible()
    assert page.locator("#v97DirectoryRows .v97-person").count()==2
    assert page.get_by_text("Pending Candidate").count()==0
    page.locator("#v97LeaderTab").click()
    assert page.locator("#v97DirectoryRows .v97-person").count()==2
    assert page.locator("#v97DirectoryRows").get_by_text("Main Youth Leader").count()==1
    page.locator("#v97DirectorySearch").fill("approved")
    assert page.locator("#v97DirectoryRows .v97-person").count()==1
    page.locator("#v97DirectorySearch").fill("")
    page.screenshot(path=str(OUTPUT/"efgc-v97-staff-directory.png"),full_page=True)
    page.evaluate("""() => {
       window.__forceBackendRole='youth';
       session={uid:'00000000-0000-4000-8000-000000000001',
                name:'Layout Admin',role:'admin',approval_status:'approved'};
       renderShell();
       showTab('staffDirectory');
    }""")
    page.wait_for_function(
      "() => document.querySelector('#staffDirectory').classList.contains('hidden') "+
      "&& document.querySelector('#staffDirectoryMenu').classList.contains('hidden')"
    )
    assert page.locator("#v97DirectoryRows .v97-person").count()==0
    page.evaluate("""([YOUTH]) => {
      window.__forceBackendRole=null;
      session={uid:YOUTH,name:'Test Youth',role:'youth',approval_status:'approved'};
      renderShell();showTab('staffDirectory');
    }""",[YOUTH])
    assert page.locator("#staffDirectory").is_hidden()
    assert page.locator("#staffDirectoryMenu").is_hidden()
    page.evaluate("""([LEADER]) => {
      session={uid:LEADER,name:'Approved Leader',role:'leader',approval_status:'approved'};
      renderShell();showTab('staffDirectory');
    }""",[LEADER])
    page.wait_for_function("() => document.querySelector('#v97YouthCount').textContent === '2'")
    assert page.locator("#staffDirectory").is_visible()
    page.evaluate("""([LEADER]) => {
      session={uid:LEADER,name:'Pending Candidate',role:'leader',approval_status:'pending'};
      renderShell();showTab('staffDirectory');
    }""",[LEADER])
    assert page.locator("#staffDirectoryMenu").is_hidden()
    assert page.locator("#staffDirectory").is_hidden()
    page.evaluate("""() => {
      session=null;renderShell();
      const preview=document.querySelector('#photoPreview');
      preview.innerHTML='<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="synthetic">';
    }""")
    height=page.locator("#photoPreview img").evaluate(
      "(img) => getComputedStyle(img).maxHeight")
    assert height=="145px",height
    page.evaluate("""([YOUTH]) => {
      session={uid:YOUTH,name:'Test Youth',role:'youth',approval_status:'approved'};
      renderShell();
      let ministry=document.querySelector('#ministry');
      if(!ministry) {
        ministry=document.createElement('section');ministry.id='ministry';
        ministry.className='tab';document.querySelector('main').appendChild(ministry);
      }
      ministry.innerHTML='<div class="v87-journey-head"><h2>My Faith Journey</h2></div>';
      showTab('ministry');
    }""",[YOUTH])
    color=page.locator("#ministry .v87-journey-head h2").evaluate(
      "(heading) => getComputedStyle(heading).color")
    assert color=="rgb(255, 255, 255)", color
    assert page.evaluate("() => document.documentElement.scrollWidth <= innerWidth+2")
    print("V97 STAFF DIRECTORY / ACCESS / LOGOUT / PHOTO / JOURNEY PASS")
    browser.close()
