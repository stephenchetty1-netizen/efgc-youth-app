# EFGC Youth App

A mobile-first EFGC Youth website with a unified Youth / approved Leader / Admin sign-in, an official church identity, and a safeguarded ministry experience.

## Current layout release: V92 phone navigation
- The V91 home is rendered in the initial HTML: Shalom greeting after sign-in, authentic EFGC emblem, next event, role-specific overview, four quick actions, then compact Scripture and Youth news. This layout is never conditional on prior Admin/network calls.
- Five-destination mobile navigation: Home, Events, Journey / Leader Hub / Ministry, News and More.
- Role-specific links in the More menu, including roster and Admin Centre where authorised.
- Birthday Studio, attendance, member directory, prayer, testimony review, consent and WhatsApp draft features from V87 remain connected.
- GitHub Pages release validator: `python3 scripts/validate-v87.py`. The historical filename is retained, but the validator now checks the current layout release.
- CSS/JS resources are versioned so a device can refresh the new layout instead of reusing an old cached script.

## Safeguarding and delivery
The Supabase backend enforces member roles, prayer-sharing scopes, guardian verification and birthday publication permission. An approved message draft is **not** a sent WhatsApp message.

This repository contains the GitHub Pages website and a separate Android WebView test project under `android/`. Updating this website cannot rebuild an existing installed APK. Android packaging and installed-device WebView networking are separate tests; Google Play release signing is **not** certified by the website validator.

Source deployment: `.github/workflows/pages.yml`. The GitHub Pages build must succeed before describing this version as live.

## V90 handset repair
- The homepage mounts on confirmed sign-in independently of other data requests.
- Notifications correctly show in-app foreground alerts when native push is unavailable, without an unusable Enable button or JavaScript alert.
- Android V90 has a loading spinner; Retry/Open Website appear only after an actual load failure, not during ordinary startup. V90 test APK uses a distinct application ID to keep V89 installed for comparison.

## V91 layout delivery
The web shell provides the recommended visual hierarchy; the Android V90 test wrapper opens the online site, so a fresh app restart refreshes the V91 layout without rebuilding the native APK. The device push-notifications implementation is not yet available; in-app alerts remain usable while the app is open. Android device verification is still required.

## V92: reliable phone layout
- Android handset detection overrides Chrome's desktop-sized viewport; the signed-in app uses Home, Events, Ministry, News, More bottom navigation even if Chrome reports more than 760 CSS pixels.
- The old 12-button main menu and decorative footer are hidden on detected handsets, with the full Admin menu still available under More. The official emblem is cropped to a circle without replacing the EFGC artwork.
- Current Supabase data at repair time: one active member and no events; the dashboard correctly reports what is stored rather than fabricating attendance or meetings.
