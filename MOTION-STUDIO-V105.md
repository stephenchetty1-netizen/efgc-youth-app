# EFGC Youth Motion Graphics Studio — Review candidate V105

This is a **separate, opt-in app tab**, not a replacement for Daily Scripture or any Youth, Leader, Admin, attendance, event, roster, safeguarding, or WhatsApp feature.

## Purpose
Adapt the Aiplaybook five-stage motion explainer to EFGC Youth without voice-over, music, publishing, subscriptions, or paid API calls.

1. Pick from five Scripture-linked youth topics.
2. Review five short lines of silent on-screen story; **not** a voice-over script.
3. Lock one of three EFGC-inspired palettes. Every shot specifies two *subtle background* diagonal lines.
4. Copy five independent keyframe image prompts, each specifying one primary realistic hero, no more than two vector accents, official EFGC logo, and safe-zone typography.
5. Copy five precisely timed 6-second motion prompts or preview a **stylized 2.5D storyboard** in the browser.

The optional export uses browser Canvas + MediaRecorder to make a silent **WebM**, approximately 30 seconds at 1080 × 1920. It is a **reference animation**, not photoreal 3D production, an MP4, or a guaranteed Android APK-compatible render. Browser compatibility and performance can vary. PNG reference frame export is available. No file is uploaded or posted.

## Creative brand and safeguards
- Official logo: `assets/v74-efgc-logo.webp` (preserve uncropped and unmodified).
- Default signature theme: warm bone paper, fine gray grid, EFGC blue/white/gold; dark technical and editorial cream alternatives.
- Readable vertical mobile safe zone; 1–4 high-impact words as headline.
- KJV Scripture references; visually distinguish editorial copy from exact Scripture. Avoid fabricating event times, claiming paraphrases are verbatim quotations, or depicting identifiable youth members without consent.
- No voice-over or music. Motion prompts may describe optional discrete SFX; browser export is entirely silent.
- No automatic publishing, social account integration, messaging, or rights claims on AI-generated imagery.

## Release review
Changes live only on `feature/efgc-motion-studio-v105`. Main and the existing deployed app are unchanged pending review. Check navigation/login/logout, mobile layout, prompt copying, whether MediaRecorder is supported on a real Android device, PNG download, entire 30-second WebM playback, memory usage, and no regression to Scripture export before approving a merge.

Source integration: `index.html`, `v105-motion-studio.js`, `v105-motion-studio.css`.

## V105.1 review fixes
- Merge current main's V112 welcome, birthday and Community Hub changes into the draft branch; preserve their existing behavior.
- Isolate Motion Studio IDs, CSS classes and action attributes from Community Hub's V105 names.
- PNG export captures the readable hold of the current scene, waits for the logo and cannot rewind a recording.
- Failed, early-stopped, stalled, cancelled or hidden-tab exports are discarded. Navigation/logout hides the studio and cancels its recorder. Streams, callbacks and timers are released.
- The full foreground timeline and all five scene intervals must complete before a download link appears. Users tap the link to save; the UI does not claim a successful device download or independently verified duration.
- Add a Cancel export button, a recording watchdog and a one-second maximum frame gap. Slow devices fail with a retry message instead of receiving a falsely successful partial file.
- Branch workflow runs cannot deploy to Pages. Only main may deploy.

## Reproducible automated checks
- `node --test scripts/test-motion-studio.cjs scripts/test-session-refresh.cjs`: mocked failure/lifecycle checks, all 15 wizard combinations, PNG readability and session race coverage. These do not test an encoder.
- `scripts/test-motion-studio-browser.py`: real desktop Chromium with a mobile viewport and blocked non-local network. Uses synthetic sessions, downloads PNG and a full WebM, checks video dimensions/no audio and approximately 30 seconds of packet timestamps across five scene intervals, then decodes the entire file with ffmpeg. Also checks cancellation, synthetic logout/account switch and separate Community Hub status elements.
- Existing CI continues checking the Scripture canvas export and app navigation/privacy. The static validator now checks main's actual V112.0 manifest instead of the stale V101 version.
- CI retains the WebM, probe results and PNGs with the existing 14-day QA artifact. A test added to the workflow is not a passed test until the run completes.

## Human device release gate (still required)
Record the tested commit SHA, handset, Android version, Chrome version and (if applicable) System WebView version. On the same isolated candidate, verify actual 30-second playback of all five scenes, readable text/logo, silence, repeated exports, PNG save, cancellation, app switching, screen locking, navigation/logout during recording, and recovery. Check real test-account login/logout and role switching, plus Daily Scripture generation/download after Studio use. Use designated test accounts; do not publish or change live member records.

The stock APK points to the live Pages URL and is not a preview of this branch. Chrome and APK/WebView download support are separate tests; use a preview-targeted test build before claiming APK support. Do not merge just to create a phone test environment, and do not run production database migrations for this feature.
