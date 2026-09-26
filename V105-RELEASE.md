# V105 Community Hub

The named `EFGC-Youth-V105-Applied.zip` was unavailable. This release rebuilds
the requested features on the existing V104 source; it is not a recovered copy
of that archive.

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
