#!/usr/bin/env python3
"""Real Chromium layout smoke test with synthetic data, never member credentials."""
from __future__ import annotations

import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get("EFGC_TEST_URL", "http://127.0.0.1:8080/index.html?v=93")
OUTPUT = Path(os.environ.get("EFGC_SCREENSHOT_DIR", "/tmp"))
OUTPUT.mkdir(parents=True, exist_ok=True)

ANDROID_UA = ("Mozilla/5.0 (Linux; Android 16; SM-F966B) "
              "AppleWebKit/537.36 (KHTML, like Gecko) "
              "Chrome/139.0.0.0 Mobile Safari/537.36")
TEST_SESSION = """() => {
  window.EFGCLive.events = async () => [];
  window.EFGCLive.planner = async () => [];
  window.EFGCLive.duties = async () => [];
  window.EFGCLive.adminProfiles = async () => [{
    id:'00000000-0000-4000-8000-000000000001',
    role:'admin',approval_status:'approved',archived_at:null,full_name:'Layout Test'
  }];
  session = {
    uid:'00000000-0000-4000-8000-000000000001',
    name:'Layout Test',phone:'',role:'admin',approval_status:'approved'
  };
  renderShell();
  window.EFGCV88Layout.sync();
  window.EFGCV87Dashboard.build();
}"""


def verify(browser, width: int, screen_width: int, screenshot: str) -> None:
    context = browser.new_context(
        viewport={"width": width, "height": 852},
        screen={"width": screen_width, "height": 852},
        device_scale_factor=2, is_mobile=True, has_touch=True,
        user_agent=ANDROID_UA,
    )
    page = context.new_page()
    page.goto(BASE, wait_until="domcontentloaded", timeout=30_000)
    page.wait_for_function(
        "() => !!window.EFGCV88Layout && !!window.EFGCV87Dashboard && !!window.renderShell",
        timeout=15_000,
    )
    page.evaluate(TEST_SESSION)
    page.wait_for_function(
        "() => document.querySelector('#v87Today .v88-home-hero h2')?.textContent.includes('Shalom, Layout!')",
        timeout=10_000,
    )
    page.wait_for_timeout(400)
    checks = page.evaluate("""() => {
       const el = id => document.querySelector(id);
       const style = id => getComputedStyle(el(id));
       const stats = [...document.querySelectorAll('#v87LiveOverview .v87-mini-stat')];
       const top = stats.map(x => Math.round(x.getBoundingClientRect().top));
       return {
          handset:document.body.classList.contains('v92-phone'),
          signed:document.body.classList.contains('v88-ready'),
          oldMenu:style('#mainMenu').display,
          dock:style('#v88MobileNav').display,
          dashboard:!!el('#v87Today .v88-home-hero'),
          statCount:stats.length,
          statsOnOneRow:top.length===3 && new Set(top).size===1,
          statFont:parseFloat(style('#v87LiveOverview .v87-mini-stat strong').fontSize),
          headingFont:parseFloat(style('#v87Today .v88-home-hero h2').fontSize),
          emblemClip:style('.v91-hero-emblem').clipPath,
          navLabelFont:parseFloat(style('#v88MobileNav button span').fontSize),
          pageOverflow:document.documentElement.scrollWidth>innerWidth+2
       };
    }""")
    assert checks["handset"] and checks["signed"], checks
    assert checks["oldMenu"] == "none" and checks["dock"] == "grid", checks
    assert checks["dashboard"] and checks["statCount"] == 3, checks
    assert checks["statsOnOneRow"], checks
    assert checks["headingFont"] >= 25 and checks["statFont"] >= 25, checks
    assert checks["navLabelFont"] >= 11.5, checks
    assert checks["emblemClip"].startswith("circle("), checks
    assert not checks["pageOverflow"], checks
    page.screenshot(path=str(OUTPUT / screenshot), full_page=True)
    if width == 393:
        page.locator("#v88MobileNav [data-v88-more]").click()
        assert page.locator("#v88MoreBackdrop").is_visible()
        assert page.locator("#v88MoreLinks").get_by_text("Admin Centre").count() > 0
        assert page.locator("#v88MoreLinks").get_by_text("Planner & Roster", exact=True).count() == 1
        assert page.locator("#v88MoreLinks").get_by_text("Birthday Studio", exact=True).count() == 1
        assert page.locator("#v88MoreLinks").get_by_text("Planner & Roster0").count() == 0
        page.locator("#v88MoreClose").click()
        page.locator("#v88MobileNav [data-v88-more]").click()
        page.locator("#v88MoreLinks [data-v88-route='birthdayStudio']").click()
        assert page.locator("#admin").is_visible()
        page.locator("#birthdayStudio").wait_for(state="attached", timeout=5000)
        page.locator("#v88MobileNav [data-v88-more]").click()
        page.locator("#v88MoreLinks [data-v88-route='scripture']").click()
        assert page.locator("#scripture").is_visible()
        gallery = page.locator("#scripture .scripture-theme-grid")
        assert gallery.count() == 1
        assert gallery.evaluate("(el) => getComputedStyle(el).gridTemplateColumns.split(' ').length") == 2
        page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
        page.wait_for_timeout(220)
        download = page.locator("#scriptureDownloadButton").bounding_box()
        dock = page.locator("#v88MobileNav").bounding_box()
        assert download and dock and download["y"]+download["height"] < dock["y"], (download,dock)
        page.screenshot(path=str(OUTPUT / "efgc-v94-scripture-handset.png"), full_page=True)
        assert not page.locator("#v88MoreBackdrop").is_visible()
    print(f"V94 CHROMIUM PASS width={width} deviceScreen={screen_width} {checks}")
    context.close()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    verify(browser, width=393, screen_width=393, screenshot="efgc-v94-handset.png")
    verify(browser, width=980, screen_width=393,
           screenshot="efgc-v94-desktop-viewport-on-handset.png")
    browser.close()
