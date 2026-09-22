# EFGC Youth Android test build

This native Android shell opens the deployed **V90 EFGC Youth website** at
https://stephenchetty1-netizen.github.io/efgc-youth-app/ . It never loads a
bundled copy of the old Youth / Leader / Admin login. Supabase requests are
made by the deployed site from its allowed HTTPS origin. Website updates are
visible in the shell after refreshing/restarting the app.

GitHub Actions builds a **debug-signed test APK** and makes it available under
the “Build EFGC Youth V90 test APK” workflow's downloadable artifacts. To test:
open the successful run, download EFGC-Youth-V90-Android-APK, extract app-debug.apk
and install it. Do not upload the debug-signed APK to Google Play.

Source: android/app/src/main/java/za/org/efgc/youth/MainActivity.java
Build: .github/workflows/android-apk.yml
App ID: za.org.efgc.youth; version code 90.

IMPORTANT: A previously installed APK can be updated in place only if its
application ID AND signing certificate match. An earlier APK built separately
may show “App not installed” or a signature conflict; check its package name
and save any device-local data before uninstalling. EFGC member data is held
in Supabase and should be backed up before changing installations. The test
APK is not a Play Store signed release and not an iPhone application.

V90 uses test application ID `za.org.efgc.youth.v90` to install alongside V89. Log in again in V90; V89 remains available for comparison. Native Android device push is not implemented: the bell shows in-app alerts while the app is open.
