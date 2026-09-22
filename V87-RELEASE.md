# EFGC Youth V87 — Ministry Hub

## Implemented in GitHub
- Unified sign-in and database-driven Youth / approved Leader / Admin access (carried forward from V86).
- Role-aware dashboard with next scheduled event, Admin member counts and Leader roster duties.
- Full searchable Admin member directory with archive / restore actions and permission audit history.
- Guardian permission register (Admin-only), member birthday/photo/WhatsApp opt-in preferences (member-owned).
- Birthday Studio blocks sharing registered members without their opt-in and guardian verification for minors or unknown ages; Supabase publication trigger enforces consent when birthday_member_id is populated.
- Private prayer requests scoped to Admin or approved Leaders; not part of News Feed.
- Testimonies remain pending until Admin approval.
- Weekly private Scripture reading checklist, no leaderboards.
- Event-based WhatsApp message drafts; Admin approval precedes an explicit copy / Open WhatsApp action. This does not automatically send a message.
- Attendance options Present / Absent / Excused. Existing roster notifications and duty swaps preserved.
- Retry-connection notice and short-lived read deduplication. Auth request errors explain connection issues.
- Restored artwork references using existing EFGC logo and login-poster assets; Scripture generator now uses four present images rather than absent images.
- Existing notification and attendance modules retained.

## Supabase changes deployed
- member-auth Edge Function V8 denies archived profiles and continues Youth-only registration.
- Migrations: efgc_v87_ministry_safeguards_and_consent; efgc_v87_guard_birthday_publication; efgc_v87_attendance_excused_status; efgc_v87_exclude_archived_leaders_from_directory.
- All new public tables use row-level security. Profile access changes are guarded and audited.

## Deployment / device caveats
- GitHub source and Supabase schema are updated. That does NOT, by itself, certify the Android APK, live host, or installed WebView.
- The recurring “Failed to fetch” issue can arise from Android WebView origin, HTTPS, network access or CORS. A user-facing Retry path is added, but the underlying APK/network root cause has NOT been proven fixed.
- Android APK must be rebuilt against the current site and tested on a real device. Verify Youth registration, Admin login, cellphone link, Leader approval / revocation, member archive, Birthday Studio image export, privacy, WhatsApp drafts and offline/reconnect.
- Meta WhatsApp Cloud API is not configured at the time of this release; approved drafts open WhatsApp manually, not an automatic broadcast.
- WhatsApp OTP password recovery also requires separate Meta authentication-template configuration.
- The official high-resolution member-supplied logo and newest login artwork are not present under their previous filenames in this repo; existing v74 EFGC logo and login art are now used. Replace after the exact source assets are added by an authorised owner.

## Review before public roll-out
- Test on a phone and admin / youth / leader sample accounts.
- Recheck Supabase security advisors. Existing lints include Auth leaked-password protection and pre-existing intentionally callable SECURITY DEFINER RPCs.
- Confirm guardian permission and member opt-ins with actual authorised people before publishing photographs or direct updates.
