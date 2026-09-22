# EFGC Youth Android packaging — preparation branch

This branch prepares the existing static site for an Android **debug/test APK**. It does not publish to Google Play, change the production GitHub Pages workflow, or add signing credentials.

## What the build does

1. Runs the same two visual-asset generation scripts as the GitHub Pages pipeline.
2. Copies the current static HTML, CSS, JavaScript and distributable image assets into a generated \`www/\` folder.
3. Checks that the app's referenced local assets exist, including official EFGC artwork.
4. Generates a Capacitor 7 Android project with temporary application identifier \`org.efgc.youth\`.
5. Compiles a debug APK and exposes it as a short-lived GitHub Actions artifact if the build passes.

## Important before member distribution

- **Not verified yet:** the complete Android build and on-device sign-in/registration have not been tested.
- The current Supabase authentication uses an Edge Function. Verify that requests from the Capacitor Android origin \`https://localhost\` are accepted by that function's CORS configuration and that Supabase session persistence works on a device.
- Confirm the file chooser/camera registration flow, permission prompts, and local image saving on Android.
- Browser Notification and service-worker behaviour does not automatically give an Android native background-push feature. Test the in-app notification experience separately.
- The asset-generation scripts download artwork at build time. A network or upstream-source failure may prevent building; the exact welcome artwork also has a checksum requirement.
- **Debug APK is not the production release.** A permanent release signing key, secure key storage, final application ID, version code, privacy policy, data-safety review, account-deletion requirements if applicable, and a Google Play-compliant AAB are required before Play Store submission.
- This app gathers young people's photographs and parent/emergency contact details; review access permissions, backend row-level security, retention and safeguarding requirements before broad release.
- Play Protect may display an unknown-source warning for a directly downloaded test APK. Do not turn off Play Protect.

The production application and the \`main\` branch remain unchanged until this pull request is reviewed and merged.
