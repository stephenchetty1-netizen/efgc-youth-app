# EFGC Youth App

A mobile-first EFGC Youth website with a unified Youth / approved Leader / Admin sign-in, an official church identity, and a safeguarded ministry experience.

## Current privacy and layout release: V98
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

## V93 visual QA
The V93 style increases text and tap targets, arranges three Admin overview cards in one balanced row on ordinary phones, and reduces excess bottom clearance. Its Chromium smoke test exercises a 393px Android handset and a phone reporting a 980px desktop-sized viewport. The test injects synthetic Admin data only for presentation checks; it does not use real member credentials or certify a particular Android device.

## V94 More, Scripture and empty-state improvements
- More uses stable route labels rather than appending notification counts to “Planner & Roster”. The Admin-only Birthday Studio is accessible in More and retains its existing authorization.
- Scripture backgrounds have readable two-column mobile choices; controls remain reachable above the fixed app navigation even on a phone reporting a desktop-sized viewport.
- News and Events display useful, accurate empty states. Only an authenticated Admin sees the event/news publishing shortcuts; the app does not fabricate published content.
- Chromium smoke checks exercise the signed-in phone navigation, Admin More links, Birthday Studio and Scripture controls with synthetic session data.

## V95 deep-scan and privacy repair
- Every authenticated tab is hidden on logout, including dynamically injected Planner, Attendance and Ministry routes; private Admin/roster DOM hosts are cleared.
- Late Supabase live-data responses from a previous account do not render after a sign-out or account switch.
- Auth tokens and the visible UI clear **before** the remote logout response returns, including on an offline phone. A late logout response cannot clear a newly signed-in account.
- Chromium uses a deliberately stalled synthetic logout response to verify immediate token/roster clearance.
- [Full audit and remaining launch gates](AUDIT-V95.md).

## V98 Facebook-free WhatsApp sharing
- Approved Admin/Leader accounts: More → WhatsApp. Messages are loaded from the existing Supabase `whatsapp_message_drafts` review workflow; only approved text is linkable.
- Staff can draft in Ministry Centre/Leader Hub, Admin approves in the existing review queue, then staff refreshes the sharing screen and opens WhatsApp to pick the intended group/contact and press Send. A WhatsApp click is **not** a delivery confirmation.
- Messages remain visible according to Supabase RLS (Admin: all; Leader: own drafts). No Facebook or Meta developer setup is needed for this human-confirmed method.
- Inactive Meta Cloud API and OTP Admin setup cards are not loaded in direct-only mode; admin-assisted password recovery is shown instead of a non-functional WhatsApp code button. The backend's disabled API settings are untouched.
- The website release does **not** rebuild an installed Android APK. The native WebView's external-HTTPS handler can open wa.me through Android.

## V99 reusable Leaders duty reminder
- Stephen's exact WhatsApp Leaders duty reminder is a code-defined, immutable pre-authorised preset available to approved Admins and Leaders under More → WhatsApp. No fresh draft approval is needed when reusing this exact wording.
- Other draft messages still require ordinary Admin review. App has no automatic WhatsApp sending; user picks intended group/contact and presses Send in WhatsApp. Use preset only on meeting weeks.
- Monday ChatGPT reminder separately checks whether a confirmed EFGC Youth meeting is scheduled; it cannot itself send to the WhatsApp group.

## V100 Scripture photography refresh
Six photographic Scripture backgrounds (cross at sunrise, prayer over the Word, mountain cross, blue-sky cross, morning Bible devotion and sunset cross) replace the old 4-item mixed-poster gallery. Source licensing and photographer credits: [`assets/scripture/README.md`](assets/scripture/README.md). The publish workflow downloads/crops each image into a local 1080×1350 WebP file, then validates images and smoke-tests the mobile gallery before deployment. Canvas text, downloadable PNG and official EFGC logo remain local; a failed photo download fails the release rather than presenting a blank gallery. The website update does not rebuild Android APK.
