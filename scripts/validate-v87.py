#!/usr/bin/env python3
"""Validate the shipped EFGC web application instead of retired version-specific files."""
from __future__ import annotations

import json
import struct
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []


def check(condition: bool, message: str) -> None:
    if not condition:
        ERRORS.append(message)


def local_asset(reference: str, source: str) -> Path | None:
    if reference.startswith(("data:", "blob:", "#", "//")):
        return None
    address = urlsplit(reference).path
    if reference.startswith(("https://", "http://")):
        return None
    path = Path(unquote(address).lstrip("/"))
    if ".." in path.parts:
        ERRORS.append(f"Unsafe asset path from {source}: {reference}")
        return None
    return ROOT / path


class AppHTML(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.scripts: list[Path] = []
        self.styles: list[Path] = []
        self.assets: list[Path] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        ref = None
        target = None
        if tag == "script" and attrs_dict.get("src"):
            ref, target = attrs_dict["src"], self.scripts
        elif tag == "link" and attrs_dict.get("rel") == "stylesheet":
            ref, target = attrs_dict.get("href"), self.styles
        elif tag == "link" and attrs_dict.get("rel") == "manifest":
            ref, target = attrs_dict.get("href"), self.assets
        elif tag == "img" and attrs_dict.get("src"):
            ref, target = attrs_dict["src"], self.assets
        if ref and target is not None:
            file = local_asset(ref, "index.html")
            if file:
                target.append(file)


def run() -> int:
    html = (ROOT / "index.html").read_text("utf-8")
    parser = AppHTML()
    parser.feed(html)
    check(len(parser.scripts) >= 20, "App module list is unexpectedly short")
    check(len(parser.styles) >= 12, "App stylesheet list is unexpectedly short")

    checked = set()
    for file in parser.scripts + parser.styles + parser.assets:
        if file in checked:
            continue
        checked.add(file)
        check(file.is_file(), f"Referenced file missing: {file.relative_to(ROOT)}")
        if file.is_file() and file.suffix == ".js":
            result = subprocess.run(["node", "--check", str(file)], capture_output=True, text=True)
            check(result.returncode == 0, f"JavaScript syntax: {file.name}: {result.stderr.strip()}")

    manifest = json.loads((ROOT / "manifest.webmanifest").read_text("utf-8"))
    check(str(manifest.get("start_url", "")).startswith("./?v=90"), "Manifest must open the V90 app")
    for icon in manifest.get("icons", []):
        target = local_asset(icon.get("src", ""), "manifest")
        check(bool(target and target.is_file()), f"Manifest icon missing: {icon.get('src')}")
    check(bool(manifest.get("icons")), "App manifest has no icon")

    required = (
        "v87-network.js", "v87-dashboard.js", "v87-ministry.js", "v87-admin.js", "v88-layout.js",
        "v85-app-polish.js", "v66-whatsapp-otp.js", "v75-roster-multi.js",
        "v62-notifications.js", "v63-duty-ack.js"
    )
    for name in required:
        check(ROOT / name in parser.scripts, f"Required feature is not included: {name}")

    check(ROOT / "v88.css" in parser.styles, "V88 responsive layout stylesheet is not loaded")
    dashboard = (ROOT / "v87-dashboard.js").read_text("utf-8")
    notifications = (ROOT / "v62-notifications.js").read_text("utf-8")
    check("scheduleBuild(0)" in dashboard and "finally {" in dashboard, "Home must render even if other modules fail")
    check("deviceSupported()" in notifications and "In-app alerts active" in notifications,
          "Unsupported WebView notification action is not disabled")
    layout = (ROOT / "v88-layout.js").read_text("utf-8")
    style = (ROOT / "v88.css").read_text("utf-8")
    check("v88NextEvent" in dashboard and "v88-quick-actions" in dashboard,
          "The designed homepage or prominent event card was not loaded")
    check("v88MobileNav" in layout and "v88MoreBackdrop" in layout,
          "Responsive role-aware navigation is incomplete")
    check("body.v88-ready .v88-mobile-nav" in style,
          "Mobile navigation layout is missing")
    check("body.v88-ready #mockBottomNav{display:none" in style,
          "Legacy mobile dock is still visible behind V88")

    for ref in (
        "assets/v74-login-poster.webp", "assets/v74-efgc-logo.webp",
        "assets/v49-youth-fellowship.webp", "assets/v49-sunrise.webp",
        "assets/efgc-home-hero.webp"
    ):
        check((ROOT / ref).is_file(), f"Missing EFGC visual asset: {ref}")
        if (ROOT / ref).is_file():
            check((ROOT / ref).stat().st_size > 2000, f"Visual asset too small: {ref}")
            if ref in ("assets/v74-login-poster.webp", "assets/v74-efgc-logo.webp"):
                data = (ROOT / ref).read_bytes()
                expected = 8 + struct.unpack_from("<I", data, 4)[0]
                check(data[:4] == b"RIFF" and data[8:12] == b"WEBP"
                      and expected == len(data),
                      f"Corrupted or truncated EFGC asset: {ref}; actual {len(data)}, RIFF {expected}")
                min_bytes = 50000 if "login-poster" in ref else 20000
                check(len(data) >= min_bytes, f"Incomplete original EFGC artwork: {ref}")

    for old in ("v21-auth-ui.js", "v36-password-recovery.js", "v61-smoke-login.js", "v73-brand.js"):
        check(old not in html, f"Legacy or development module was loaded: {old}")
    check("sb_secret_" not in html and "service_role" not in html, "Secret material appears in app HTML")

    css = (ROOT / "v74-brand.css").read_text("utf-8")
    branded = (ROOT / "v74-brand.js").read_text("utf-8")
    birthday = (ROOT / "v85-app-polish.js").read_text("utf-8")
    check("assets/v74-login-poster.webp" in css and "assets/v74-login-poster.webp" in branded,
          "Welcome art is not linked to the committed asset")
    check("assets/v74-efgc-logo.webp" in branded and "assets/v74-efgc-logo.webp" in birthday,
          "Official EFGC logo asset references are inconsistent")
    check("birthday_member_id" in birthday and "memberSharingPermission" in birthday,
          "Birthday consent gate is missing")
    check("adminArchiveMember" in (ROOT / "v87-admin.js").read_text("utf-8"),
          "Admin archive workflow is missing")

    if ERRORS:
        print("EFGC release validation failed:")
        for message in ERRORS:
            print(" - " + message)
        return 1
    print(f"EFGC V90 static release checks PASS: {len(parser.scripts)} JS, "
          f"{len(parser.styles)} CSS, {len(parser.assets)} HTML assets checked.")
    return 0


if __name__ == "__main__":
    sys.exit(run())
