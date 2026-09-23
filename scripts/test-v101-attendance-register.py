#!/usr/bin/env python3
"""V101: real mobile routing, zero-event register, Youth directory, writes and role safety.
All users, meetings and attendance records are synthetic; never alter production records.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('EFGC_TEST_URL','http://127.0.0.1:8081/index.html?v=101')
OUT=Path(os.environ.get('EFGC_SCREENSHOT_DIR','/tmp'))
OUT.mkdir(parents=True,exist_ok=True)
ADMIN='00000000-0000-4000-8000-000000000101'
YOUTH='00000000-0000-4000-8000-000000000102'
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':393,'height':852},screen={'width':393,'height':852},
        is_mobile=True,has_touch=True,device_scale_factor=2,
        user_agent='Mozilla/5.0 (Linux; Android 16; SM-F966B) AppleWebKit/537.36 Chrome/139.0 Mobile Safari/537.36')
    page.goto(BASE,wait_until='domcontentloaded',timeout=45000)
    page.wait_for_function("() => !!window.EFGCV101Attendance && !!window.EFGCV97Directory",timeout=18000)
    page.evaluate("""([A,Y])=>{
      window.__v101Events=[];
      window.__v101Saved=[];
      window.__v101CreateCount=0;
      window.EFGCAuth.getMyProfile=async()=>({
        id:session.uid,role:window.__v101BackendRole||session.role,
        approval_status:session.approval_status,archived_at:null
      });
      window.EFGCAuth.rest=async(path)=>{
        if(path.startsWith('profiles?select=id,full_name,role,approval_status,leader_role'))return [
          {id:Y,full_name:'Test Youth',role:'youth',approval_status:'approved',leader_role:null},
          {id:A,full_name:'Admin Example',role:'admin',approval_status:'approved',leader_role:'Main Youth Leader'}
        ];
        return [];
      };
      window.EFGCLive.events=async()=>window.__v101Events;
      window.EFGCLive.adminYouthProfiles=async()=>[{id:Y,full_name:'Test Youth'}];
      window.EFGCLive.adminAttendance=async()=>window.__v101Saved;
      window.EFGCLive.adminCreateEvent=async row=>{
        window.__v101CreateCount++;
        const e={id:42,...row,attendance_approved:false};
        window.__v101Events=[e];return e;
      };
      window.EFGCLive.adminSaveAttendance=async(id,rows)=>{
        window.__v101Saved=rows.map(r=>({...r,event_id:Number(id)}));
        return window.__v101Saved;
      };
      window.EFGCLive.adminFinalizeAttendance=async id=>{
        const e=window.__v101Events.find(e=>e.id===Number(id));
        e.attendance_approved=true;return e;
      };
      window.EFGCLive.news=async()=>[];
      window.EFGCLive.planner=async()=>[];
      window.EFGCLive.duties=async()=>[];
      window.EFGCLive.approvedLeaders=async()=>[];
      window.EFGCLive.adminProfiles=async()=>[];
      window.EFGCLive.auditLog=async()=>[];
      session={uid:A,role:'admin',approval_status:'approved',name:'Admin Example'};
      renderShell();
    }""",[ADMIN,YOUTH])
    page.locator('#v88MobileNav [data-v88-more]').click()
    page.locator('#v88MoreLinks [data-v88-route="attendanceAdmin"]').click()
    page.wait_for_function("""()=>document.querySelector('#attendanceAdmin') &&
      !document.querySelector('#attendanceAdmin').classList.contains('hidden') &&
      !!document.querySelector('#v101CreateEvent')""",timeout=18000)
    assert page.get_by_text('No Youth meetings are in the app yet').count()==1
    assert page.locator('#attendanceAdmin .v101-youth-row').count()==1
    assert page.locator('#attendanceAdmin #attendanceNewDate').count()==1
    page.screenshot(path=str(OUT/'efgc-v101-attendance-empty-mobile.png'),full_page=True)
    # Move to Youth Register directly from the record screen, including search/list.
    page.locator('#attendanceAdmin [data-tab="staffDirectory"]').click()
    page.wait_for_function("() => document.querySelector('#v97YouthCount').textContent==='1'",timeout=18000)
    assert page.locator('#staffDirectory .v97-person').count()==1
    page.locator('#v88MobileNav [data-v88-more]').click()
    page.locator('#v88MoreLinks [data-v88-route="attendanceAdmin"]').click()
    page.wait_for_function("() => !!document.querySelector('#v101CreateEvent')",timeout=18000)
    page.locator('#attendanceNewDate').fill('2026-09-25T18:30')
    page.locator('#v101CreateEvent').click()
    page.wait_for_function("() => !!document.querySelector('#v101SaveAttendance')",timeout=18000)
    assert page.locator('#attendanceRegisterHost .attendance-page-status').count()==1
    page.locator('#attendanceRegisterHost .attendance-page-status').select_option('present')
    page.locator('#v101SaveAttendance').click()
    page.wait_for_function("() => window.__v101Saved.length===1",timeout=18000)
    page.wait_for_function("() => !document.querySelector('#v101FinalizeAttendance').disabled",timeout=18000)
    page.locator('#v101FinalizeAttendance').click()
    page.wait_for_function("() => !!document.querySelector('#attendanceRegisterHost .finalized')",timeout=18000)
    assert page.locator('#attendanceRegisterHost .attendance-page-status').is_disabled()
    assert page.evaluate('() => window.__v101CreateCount')==1
    page.screenshot(path=str(OUT/'efgc-v101-attendance-finalized-mobile.png'),full_page=True)
    page.evaluate("""([Y])=>{
      session={uid:Y,role:'youth',approval_status:'approved',name:'Test Youth'};
      renderShell();showTab('attendanceAdmin');
    }""",[YOUTH])
    assert page.locator('#attendanceAdmin').is_hidden()
    assert page.locator('#attendanceMenu').is_hidden()
    assert page.locator('#attendanceAdmin .attendance-page-status').count()==0
    page.evaluate("() => {session=null;renderShell();}")
    assert page.locator('#attendanceAdmin').is_hidden()
    assert page.locator('#attendanceAdmin .attendance-page-status').count()==0
    assert page.evaluate("() => document.documentElement.scrollWidth <= innerWidth+2")
    print('V101 ATTENDANCE PASS: mobile More route, empty state, Youth Register, create, save, finalize, role switch privacy')
    browser.close()
