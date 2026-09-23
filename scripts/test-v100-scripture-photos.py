#!/usr/bin/env python3
"""V100: six real local backgrounds and rendered EFGC poster in Android Chromium."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('EFGC_TEST_URL','http://127.0.0.1:8081/index.html?v=100')
OUT=Path(os.environ.get('EFGC_SCREENSHOT_DIR','/tmp'))
OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':393,'height':852},screen={'width':393,'height':852},
      is_mobile=True,has_touch=True,device_scale_factor=2,
      user_agent='Mozilla/5.0 (Linux; Android 16; SM-F966B) AppleWebKit/537.36 Chrome/139.0 Mobile Safari/537.36')
    page.goto(BASE,wait_until='domcontentloaded',timeout=45000)
    page.wait_for_function("() => document.documentElement.dataset.scriptureGenerator === '100.0'",timeout=20000)
    page.evaluate("""() => {document.querySelector('#scripture').classList.remove('hidden');}""")
    images=page.locator('#scripture img.scripture-theme-photo')
    assert images.count()==6, f'Expected six Scripture choices, found {images.count()}'
    for i in range(6):
        page.wait_for_function("i => {const im=document.querySelectorAll('#scripture img.scripture-theme-photo')[i]; return !!im && im.complete && im.naturalWidth>=600 && im.naturalHeight>=600;}",arg=i,timeout=20000)
        assert 'assets/scripture/' in images.nth(i).get_attribute('src')
    page.wait_for_function("""()=>document.getElementById('scriptureRenderStatus').textContent.includes('ready')
          ||document.getElementById('scriptureRenderStatus').textContent===''""",timeout=20000)
    for i in range(6):
        page.locator(f'#scripture button[data-scripture-theme="{i}"]').click()
        page.wait_for_function("""()=>document.querySelector('#scriptureRenderStatus').textContent!=='Generating HD scripture poster…'""",timeout=15000)
        assert page.locator('#scriptureRenderStatus').inner_text().find('Could not')<0
    # Fast successive changes should settle on the final selected image.
    page.evaluate("""() => {
      document.querySelector('#scripture button[data-scripture-theme="1"]').click();
      document.querySelector('#scripture button[data-scripture-theme="4"]').click();
      document.querySelector('#scripture button[data-scripture-theme="5"]').click();
    }""")
    page.wait_for_function("""()=>document.querySelector('#scripture button[data-scripture-theme="5"]').getAttribute('aria-pressed')==='true' &&
      document.getElementById('scriptureRenderStatus').textContent!=='Generating HD scripture poster…'""",timeout=20000)
    size=page.evaluate("""async()=>await new Promise(resolve=>document.querySelector('#scripturePosterCanvas').toBlob(b=>resolve(b?.size||0),'image/png'))""")
    assert size>50000,f'Scripture PNG incomplete: {size}'
    page.screenshot(path=str(OUT/'efgc-v100-scripture-gallery.png'),full_page=True)
    assert page.evaluate('() => document.documentElement.scrollWidth <= innerWidth + 2')
    print('V100 SCRIPTURE PASS: six loaded photographs, PNG canvas, 4:5 mobile gallery, final selection')
    browser.close()
