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
