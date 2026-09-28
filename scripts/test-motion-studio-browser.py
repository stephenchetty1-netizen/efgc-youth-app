#!/usr/bin/env python3
"""Real desktop Chromium encoding, mobile viewport, synthetic sessions only.

Does NOT certify physical Android Chrome, WebView downloads or real login.
All requests outside the local test server are blocked.
"""
import json
import os
from pathlib import Path
import subprocess
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('EFGC_TEST_URL', 'http://127.0.0.1:8082/index.html')
OUT = Path(os.environ.get('EFGC_SCREENSHOT_DIR', '/tmp/efgc-motion-qa'))
OUT.mkdir(parents=True, exist_ok=True)

def sign_in(page, name):
    page.evaluate("""name => {
      const id = name === 'First' ? '00000000-0000-4000-8000-000000000021' : '00000000-0000-4000-8000-000000000022';
      EFGCAuth.setSession({user:{id},access_token:'synthetic-test-token',refresh_token:'synthetic-test-refresh'});
      EFGCAuth.getMyProfile = async () => ({id, full_name:name, role:'youth', approval_status:'approved'});
      for (const key of ['events','planner','duties']) EFGCLive[key] = async () => [];
      session = {uid:id,name,role:'youth',approval_status:'approved'};
      renderShell(); EFGCV88Layout.sync();
    }""", name)

def open_studio(page):
    page.locator('#v88MobileNav [data-v88-more]').click()
    page.locator('#v88MoreLinks [data-v88-route="motionStudio"]').click()
    expect(page.locator('#motionStudio')).to_be_visible()

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':393,'height':852},
                            screen={'width':393,'height':852}, is_mobile=True,
                            has_touch=True, accept_downloads=True)
    origin = urlsplit(BASE).netloc
    page.route('**/*', lambda route: route.continue_()
               if urlsplit(route.request.url).netloc == origin else route.abort())
    page.goto(BASE, wait_until='domcontentloaded')
    page.wait_for_function('() => !!window.EFGCMotionStudio && !!window.EFGCV88Layout && !!window.EFGCAuth')
    sign_in(page, 'First')
    open_studio(page)
    assert page.locator('#v105Status').count() == 1  # Community Hub keeps its own status.
    assert page.locator('#v105MotionStatus').count() == 1
    page.locator('[data-motion-topic="0"]').click()
    page.locator('[data-motion="next"]').click()
    page.locator('[data-motion="next"]').click()
    page.locator('[data-motion-theme="0"]').click()
    page.locator('[data-motion="next"]').click()
    assert page.locator('[data-motion-copy^="poster-"]').count() == 5
    page.locator('[data-motion="next"]').click()
    assert page.locator('[data-motion-copy^="motion-"]').count() == 5
    page.wait_for_function("() => document.querySelector('.v105-motion-head img').complete && document.querySelector('.v105-motion-head img').naturalWidth > 0")
    assert page.evaluate('() => document.documentElement.scrollWidth <= innerWidth + 2')
    with page.expect_download() as captured:
        page.locator('[data-motion="poster"]').click()
    captured.value.save_as(OUT / 'motion-studio-frame.png')
    page.locator('#motionStudio').screenshot(path=str(OUT / 'motion-studio-screen.png'))
    page.locator('[data-motion="export"]').click()
    expect(page.locator('#v105MotionDownload a')).to_be_visible(timeout=40000)
    with page.expect_download() as captured:
        page.locator('#v105MotionDownload a').click()
    video_path = OUT / 'motion-studio.webm'
    captured.value.save_as(video_path)
    probe = json.loads(subprocess.check_output([
        'ffprobe','-v','error','-show_streams','-show_packets',
        '-show_entries','stream=codec_type,width,height:packet=pts_time,duration_time',
        '-of','json',str(video_path)], text=True))
    (OUT / 'motion-studio-probe.json').write_text(json.dumps(probe, indent=2))
    assert len(probe['streams']) == 1 and probe['streams'][0]['codec_type'] == 'video', probe['streams']
    assert (probe['streams'][0]['width'],probe['streams'][0]['height']) == (1080,1920)
    packets = probe['packets']
    first = float(packets[0]['pts_time'])
    end = max(float(p['pts_time']) + float(p.get('duration_time',0)) for p in packets)
    assert 29.5 <= end-first <= 31, (first,end)
    for scene in range(5):
        assert sum(scene*6 <= float(p['pts_time'])-first < (scene+1)*6 for p in packets) >= 10, scene
    subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(video_path),'-f','null','-'], check=True, timeout=60)
    print(f'MOTION REAL CHROMIUM ENCODE/DECODE PASS: {end-first:.3f}s, 1080x1920, no audio, packets in all five scene intervals')
    # A second export must not survive logout or leak a download to another session.
    page.locator('[data-motion="export"]').click()
    page.evaluate('() => window.logoutUser()')
    expect(page.locator('#motionStudio')).to_be_hidden()
    assert page.evaluate('() => !EFGCAuth.accessToken()')
    assert page.locator('#v105MotionDownload a').count() == 0
    sign_in(page, 'Second')
    open_studio(page)
    expect(page.locator('[data-motion="export"]')).to_be_enabled()
    assert page.locator('#v105MotionDownload a').count() == 0
    assert page.locator('#mainMenu #adminMenu').evaluate("e => e.classList.contains('hidden')")
    page.locator('[data-motion="export"]').click()
    page.locator('[data-motion="cancel"]').click()
    expect(page.locator('[data-motion="export"]')).to_be_enabled()
    assert page.locator('#v105MotionDownload a').count() == 0
    print('MOTION SYNTHETIC LOGOUT / ACCOUNT SWITCH / CANCEL PASS (not real authentication)')
    browser.close()
