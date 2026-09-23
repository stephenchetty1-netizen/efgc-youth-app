#!/usr/bin/env python3
"""V104 browser regressions using only synthetic accounts and in-memory API stubs."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    page.set_content('<div id="eventList"><article class="event-card" data-event-id="2"></article><article class="event-card" data-event-id="1"></article></div>')
    page.evaluate("""()=>{
      window.session={uid:'youth',role:'youth',approval_status:'approved'};
      window.calls=0;window.saved=[];
      window.EFGCAuth={userId:()=>session?.uid,accessToken:()=>session?'fake':null,
        getMyProfile:async()=>({id:session.uid,role:session.role,approval_status:'approved'}),
        rest:async(path,options)=>{
          if(options?.method==='POST')return window.saved;
          window.calls++;
          if(path.startsWith('events?'))return [{id:1},{id:2}];
          return [{event_id:1,response:'attending'}];
        }};
    }""")
    page.add_script_tag(path=str(ROOT/'v64-event-rsvp.js'))
    page.wait_for_selector('#event-rsvp-1')
    assert page.locator('.event-card[data-event-id="2"] #event-rsvp-2').count()==1
    assert page.locator('#event-rsvp-1 [data-response="attending"]').get_attribute('aria-pressed')=='true'
    before=page.evaluate('calls')
    page.wait_for_timeout(1100) # Exceeds four former observer refresh cycles.
    assert page.evaluate('calls')==before,'RSVP observer caused a self-refresh loop'
    page.locator('#event-rsvp-2 [data-response="attending"]').click()
    page.wait_for_function("()=>document.querySelector('#event-rsvp-2 .event-rsvp-message').textContent.includes('did not confirm')")
    assert page.locator('#event-rsvp-2 [data-response="attending"]').get_attribute('aria-pressed')=='false'
    page.evaluate("()=>{saved=[{event_id:2,youth_id:'youth',response:'attending'}];}")
    page.locator('#event-rsvp-2 [data-response="attending"]').click()
    page.wait_for_function("()=>document.querySelector('#event-rsvp-2 [data-response=attending]').getAttribute('aria-pressed')==='true'")
    # Delayed profile data must not recreate RSVP panels after logout.
    page.evaluate("""()=>{
      EFGCAuth.getMyProfile=()=>new Promise(resolve=>window.releaseProfile=()=>resolve({id:'youth',role:'youth',approval_status:'approved'}));
      window.pending=EFGCEventRSVP.refresh();
    }""")
    page.wait_for_function('()=>!!window.releaseProfile')
    page.evaluate("""async()=>{session=null;document.querySelectorAll('.event-rsvp-panel').forEach(n=>n.remove());releaseProfile();await pending;}""")
    assert page.locator('.event-rsvp-panel').count()==0
    print('V104 RSVP PASS: stable refresh, ID mapping, verified save, delayed logout')
    page.close()

    page=browser.new_page()
    page.set_content('<section id="plannerRoster" class="hidden"><div id="plannerRosterHost"></div></section>')
    page.evaluate("""()=>{
      window.session={uid:'admin',role:'admin',approval_status:'approved'};
      window.calls=0;window.releases=[];
      window.EFGCLive={planner:()=>{calls++;return new Promise(r=>releases.push(r));},
        duties:async()=>[],approvedLeaders:async()=>[]};
    }""")
    page.add_script_tag(path=str(ROOT/'v75-roster-multi.js'))
    page.evaluate("()=>{window.a=renderPlannerRoster();window.b=renderPlannerRoster();}")
    assert page.evaluate('calls')==1,'Concurrent roster renders duplicated backend loads'
    page.evaluate("""async()=>{
      session=null;document.querySelector('#plannerRosterHost').replaceChildren();
      releases[0]([{id:1,week_start:'2026-09-25',meeting_title:'PRIVATE ROSTER',published:true}]);
      await Promise.all([a,b]);
    }""")
    assert page.locator('#plannerRosterHost').inner_text()==''
    print('V104 ROSTER PASS: concurrent load coalescing and delayed logout')
    page.close()

    page=browser.new_page()
    page.set_content('<div id="leaderReminder"></div>')
    page.evaluate("""()=>{
      window.session={uid:'leader',role:'leader',approval_status:'approved'};
      window.intervals=0;const oldInterval=window.setInterval;
      window.setInterval=(...args)=>{intervals++;return oldInterval(...args);};
      window.EFGCAuth={accessToken:()=>session?'fake':null,userId:()=>session?.uid,
        getMyProfile:()=>new Promise(r=>window.release=r)};
      window.EFGCLive={planner:async()=>[],duties:async()=>[],approvedLeaders:async()=>[]};
    }""")
    page.add_script_tag(path=str(ROOT/'v63-duty-ack.js'))
    page.add_script_tag(path=str(ROOT/'v63-duty-ack.js'))
    assert page.evaluate('intervals')==1,'Duty module installed twice'
    page.evaluate('()=>{window.pending=EFGCDutyPanel.refresh();}')
    page.evaluate("""async()=>{session=null;release({id:'leader',role:'leader',approval_status:'approved'});await pending;}""")
    assert 'hidden' in page.locator('#efgcDutyAckPanel').get_attribute('class').split()
    print('V104 DUTY PASS: one poller and delayed logout')
    browser.close()
