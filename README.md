# EFGC Youth App

A mobile-first EFGC Youth website with a unified Youth / approved Leader / Admin sign-in, an official church identity, and a safeguarded ministry experience.

## Current release: V88 design
- Blue, white, silver and gold home dashboard with the EFGC emblem, the next published event, and relevant actions for each role.
- Five-destination mobile navigation: Home, Events, Journey / Leader Hub / Ministry, News and More.
- Role-specific links in the More menu, including roster and Admin Centre where authorised.
- Birthday Studio, attendance, member directory, prayer, testimony review, consent and WhatsApp draft features from V87 remain connected.
- GitHub Pages release validator: `python3 scripts/validate-v87.py`. The historical filename is retained, but the validator now checks the V88 app.
- CSS/JS resources are versioned so a device can refresh the new layout instead of reusing an old cached script.

## Safeguarding and delivery
The Supabase backend enforces member roles, prayer-sharing scopes, guardian verification and birthday publication permission. An approved message draft is **not** a sent WhatsApp message.

This repository is a static web app, not an Android/iOS source project. Updating this website cannot rebuild an existing installed APK. Android packaging, installed-device WebView networking and Google Play release are separate steps and are **not** certified by the website validator.

Source deployment: `.github/workflows/pages.yml`. The GitHub Pages build must succeed before describing this version as live.
