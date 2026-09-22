# EFGC Youth V95 — Deep Scan / Release Readiness

**Date:** 2026-09-22 (South Africa)  
**Source branch audited:** main, immediately after the V94 website deployment.  
**Scope:** deployed static site and its workflow, Android debug wrapper,
Supabase schema/RLS/advisors, the active `member-auth` Edge Function,
and browser smoke-test coverage.

This document distinguishes verified facts from untested assumptions.
Nothing in this audit certifies an actual Android device, Google Play release,
end-to-end WhatsApp delivery or a registered Youth/Leader login.

## Confirmed defect fixed in V95

**Logout privacy:** `renderShell()` originally hid an explicit, obsolete
subset of tab IDs. Dynamically added `plannerRoster`, `attendanceAdmin`,
and `ministry` could remain visible when an Admin logged out. Some private
rendered content was left in the browser DOM. V95 hides every
`main > section.tab` except `login`, clears private member/Admin/roster
hosts, and ignores stale `renderLiveData()` results from a prior account.
The Chromium test creates private roster/attendance content, logs out,
and checks that the login returns, all private tabs are hidden, and the
private content is gone.

This is a UI privacy control **in addition to**, not a replacement for,
server-side Row Level Security.

## Confirmed environment state

| Area | Observed state | Operational consequence |
|---|---|---|
| Supabase users | 1 Auth account; 1 active profile | No real Youth or Leader journey has been tested |
| Events | 0 | Upcoming Events intentionally displays an empty state |
| News posts | 0 | News has no published content |
| Year planner | 52 rows for 2026; **0 published** | Planner rows are drafts, not an events calendar |
| Duty assignments | 0 | Duty and replacement flows cannot be tested with real records |
| Attendance | 0 | Attendance cannot be verified with real event records |
| Member preferences | 0 | Consent storage has not been exercised by real users |
| WhatsApp | `enabled=false`, `otp_enabled=false`, no Phone Number ID | No real WhatsApp delivery or self-service OTP recovery |
| Android project | `za.org.efgc.youth.v90`, version code 90, debug-signed WebView wrapper | Website changes arrive online; the APK is not a Play Store release and requires connectivity |
| Device push | WebView does not implement native push in this APK | Only in-app foreground alerts while app is open |

### Supabase access check

All 23 public application tables inspected had RLS enabled. A rollback-only
simulation of an authenticated UUID with no profile could read **0**
profiles, leader-directory entries, preferences or safeguarding contacts.
That is one useful negative test, not a complete role matrix.

The previous profile-save recursion fix is installed:
`profiles_self_update` checks `id = auth.uid()` rather than recursively
selecting `profiles`. Both profile-authorization BEFORE UPDATE triggers
remain installed. The actual Save Profile UI still needs a handset retest.

### Supabase security advisors

- **WARN**: leaked-password protection disabled. This setting should be
  enabled in Supabase Auth before inviting Youth. The connector available
  for this audit does not expose an Auth configuration mutation.
  Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- **WARN**: six authenticated-callable `SECURITY DEFINER` RPC functions
  (duty swaps and WhatsApp administration). Reviewed function definitions
  contain internal approved-role/ownership checks. No bypass was proved;
  nevertheless these are privileged code paths and need an explicit
  authorization test with ordinary Youth and approved Leader JWTs.
  Reference: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- **INFO**: `phone_otp_challenges` and `whatsapp_settings` have RLS enabled
  with no end-user policies. Edge service code accesses them; this deny-by-
  default setup is deliberate and should not be replaced by broad client
  read policies.
- **PERFORMANCE**: 9 unindexed foreign keys, 22 overlapping permissive
  policy findings and 15 currently unused indexes. With one user this does
  not explain the mobile layout fault. Reassess before wider launch; do
  not remove indexes purely because they are unused in an empty database.
  Reference: https://supabase.com/docs/guides/database/database-linter

## Testing coverage

The V94 deployment passed the static checker (25 scripts, 24 styles and
6 directly referenced HTML assets), decoded restored official artwork,
and passed Chromium phone and desktop-sized-on-phone layout tests.
The Chromium tests use a **synthetic Admin session** and stubbed empty
events, planner, duties and profile list. They do not exercise real login
or real database writes.

V95 adds a private-screen logout regression check and must pass the same
GitHub Pages validation and Chromium tests before deployment.

## Still blocked / not certified

1. Actual Youth sign-up, session restore, login and logout from a device.
2. Approved Leader access, pending Leader denial, roster acknowledgement,
   duty swaps and attendance finalisation with real test users and events.
3. Admin event/news publishing, saved profile photo, member directory,
   birthday consent enforcement and prayer/testimony workflows end to end.
4. WhatsApp opt-in and OTP delivery: Meta/phone configuration is currently off.
5. Offline startup, native notification permission, APK update signing,
   iPhone packaging and Google Play signing/publication.

**Next verification gate:** invite or create authorised test accounts,
publish an actual *test* event and news item only with the Admin's consent,
exercise Youth/Leader/Admin workflows on the handset, then complete a
release-signed Android AAB separately. Do not claim 100% production readiness
from source lint, simulated UI checks or an installed debug APK.
