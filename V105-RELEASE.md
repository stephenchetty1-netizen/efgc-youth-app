# V105 Community Hub

The named `EFGC-Youth-V105-Applied.zip` was unavailable. This release rebuilds
the requested features on the existing V104 source; it is not a recovered copy
of that archive.

## Reconciliation with current main — 30 September 2026

PR #23 now includes main through `83fa526` (V112). The V112 welcome artwork,
installed-app launch version, birthday preferences and other newer changes are
preserved. Only `v105-features.js` and its stylesheet implement the Community
Hub; the competing `v105-community.js` and stylesheet have been removed.

Signup and mentoring INSERTs omit the protected `status` column and use its
database default. Registration uses the shared request/cooldown guard, and both
direct and OTP completion save the same birthday preferences and safeguarding
details. No database migration needs to be applied again.

The complete local browser suite passes, including the WhatsApp visibility check,
V101 attendance, V104 RSVP/roster/duty and V105 flows. V105 tests now reject
forbidden INSERT columns, reload the registration cooldown, and exercise successful
registration with and without OTP. The WhatsApp test waits for the welcome
controller's debounced visual transition rather than checking visibility before
that transition settles. V105 and WhatsApp tests block external API requests.

The original live SQL permission-test pass below is historical evidence; those
write tests were not rerun during this reconciliation. Read-only database checks
confirmed migration history, all four RLS-enabled tables, 14 policies, protected
INSERT grants, and an empty content table on 30 September.

Before merge, require green CI on this reconciled commit and a real-account smoke
test on Android Chrome and the installed app. Check login/logout/account switching,
registration and configured OTP, durable saves after refresh, moderation/privacy,
join/mentoring requests, attendance and WhatsApp sharing. Admins must supply real
content and assign prayer/mentoring queue owners. No content was invented or
published. Merge to main can deploy Pages; this branch is for review first.

## Features

Open **More → Community Hub** after signing in.

- **Devotional:** seven rotating KJV reflections, with a private daily completion record.
- **Prayer Wall:** member submissions remain pending until an Admin publishes them. Members can withdraw their prayers. Existing private prayer requests remain separate.
- **Check-in:** Youth can submit once per open meeting, from two hours before to six hours after its start. Admins review requests and still record/finalise attendance separately.
- **Groups / Serve:** Admins publish opportunities; members request to join or volunteer; Admins approve or decline requests.
- **Testimonies:** opens the existing moderated testimony workflow in My Journey.
- **Resources / Setlists:** Admin-published text and optional HTTPS links.
- **Mentoring:** private requests visible only to the requesting member and approved Admins. No private youth-to-leader messaging is introduced.
- **My Year:** personal counts from saved, finalised attendance, reading progress and approved group/service requests, using Johannesburg year boundaries. No generated achievement claims.

Registration now has one request guard shared by both auth scripts. Duplicate
submissions are blocked while a request runs. HTTP 429 respects the server retry
time, or uses the backend's 15-minute window when none is supplied. The timer
survives a reload in that browser tab; sign-in remains available. Passwords are
not stored by this feature. Favicon and manifest launch version are updated.

## Database

`supabase/migrations/20260926024645_v105_community_hub.sql` was applied to the
connected EFGC project on 26 September 2026. Its version matches the server's
migration history. It adds four tables with row-level security, explicit
column-level grants, member ownership and Admin moderation. It does not modify
existing profiles, attendance, prayers, testimonies or authentication settings.
Do not manually rerun this migration on the same project.

All permission-test writes were rolled back; no sample content or test events
remain in production. Admins must publish their real groups, resources,
opportunities and setlists. Empty sections are intentional until then.

## Validation

- JavaScript syntax and static release validation.
- Five session-refresh/account-switching tests.
- V101 attendance/register browser regressions.
- V104 RSVP, roster and duty browser regressions.
- V105 mobile navigation, feature submissions, moderation UI, XSS escaping,
  failed-save acknowledgements, delayed logout and duplicate registration/429 tests.
- Live database permission assertions in `database/tests/v105-permissions.sql`,
  inside a rollback-only transaction, including role boundaries, owner spoofing,
  duplicate requests, protected timestamps and check-in windows.
- Supabase security advisors: no new V105 findings. Existing findings remain
  for older security-definer functions and service-only tables.

Browser workflows use synthetic API responses; they do not create or sign in
as real members. Database tests separately exercise the actual production RLS.

## Free-plan limit

Supabase's native leaked-password protection remains disabled because it
requires Pro or above. The registration cooldown is not leaked-password
protection. No paid plan was enabled.
