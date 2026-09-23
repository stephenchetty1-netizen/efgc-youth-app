# EFGC Youth application audit — V104

Date: 23 September 2026. Scope: deployed web application, Android wrapper source, authentication Edge Function, live Supabase schema/policies/functions/storage, scheduled jobs, and release workflows.

This is a source and configuration audit with targeted browser and database regression tests. It is not a penetration-test certification or a guarantee that every device, account, or failure mode has been tested.

## Repairs

| Area | Finding and repair | Evidence |
|---|---|---|
| Youth Register | V103 corrected both dashboard shortcuts to open the staff directory. Retained and retested. | Actual Admin Centre button browser test |
| Duty acknowledgement | The invoker trigger called a private-schema function unavailable to authenticated users, causing `Ready` to fail. The trigger now checks the caller's own approved Admin profile without granting private-schema access. | Reproduced the permission error; rollback test now confirms Ready succeeds |
| Duty swaps | The same trigger blocked an authorized swap's reassignment. Direct member writes remain restricted; the privileged RPC still validates the caller, recipient, ownership and row locks. Archived recipients are rejected. | Accepted swap and subsequent replacement Ready pass; direct Leader reassignment fails |
| Attendance | Archived Youth incorrectly counted toward register completeness. Finalized attendance could be moved out of its meeting; approval could also be cleared. | Archived member, incomplete/future finalization, row-move, reopen, approval metadata and deletion checks pass |
| Event responses | RSVP's observer reacted to its own DOM changes, repeatedly refreshing. Cards were matched to events by array position. Empty server responses could be reported as success. | Stable request count, reversed card order, rejected empty save and successful confirmed save browser checks |
| Duty loading | The same module was loaded by both backend-adapter and HTML. Removed dynamic duplicate loading and made module initialization idempotent. | Browser confirms one polling timer even if script is loaded twice |
| Account changes | Delayed event, directory, roster, duty and notification responses could affect a later account. Added account checks and cleared sensitive panels, modals, notices and request cache on identity changes. | Delayed logout tests for RSVP, duties and roster; full-app directory/attendance logout tests |
| Roster | Concurrent render paths duplicated loads; an ongoing multi-request save could continue after account change. Coalesced loads and checked account before each further write. | Concurrent browser requests share one load; stale render discarded |
| Event creation | The later adapter override accepted an empty server result. Publishing also allowed repeated concurrent clicks. | Syntax/release validation; strict response check and in-flight publishing guard |
| Birthday job | The batch selected opted-out and otherwise ineligible members, allowing one trigger rejection to abort all birthday greetings. Filter eligibility before insertion while retaining the safeguarding trigger. | Rollback test: opted-out skipped, consenting adult included, minor without guardian permission skipped |
| Android wrapper | Successful rendered-page detection never set `pageReady`. Corrected the flag so later navigation can use the existing recovery logic. | Source review and Android build workflow; physical-device testing still required |

Database function changes were applied with migration history. `private.current_role()` now requires approved, unarchived membership for every role. No RLS policies were loosened and private-schema access was not granted.

## Validation

- JavaScript release validation covers 26 loaded scripts, 27 stylesheets and six HTML assets; six Scripture photographs are downloaded and decoded during release preparation.
- Five session tests cover shared refresh, logout during refresh, account switch during refresh, delayed restore and offline startup.
- Existing Chromium suites cover handset/desktop-layout fallback, Admin/Leader/Youth navigation and access, the real Youth Register button, member search, attendance creation/save/finalization, event changes during save, WhatsApp sharing and Scripture image export.
- V104 Chromium checks cover RSVP refresh stability, event identity, save confirmation, one duty poller, roster request coalescing and delayed logout responses.
- Live database tests run inside explicit transactions ending with `ROLLBACK`. Fixture members, meetings, duties, attendance, archive changes and birthday posts were not retained. Post-test counts were unchanged: three members, zero events, zero attendance rows and zero duties.
- All 23 public tables have RLS enabled. The member-photo bucket is private; the event-image bucket is public with staff write restrictions. Server-only OTP/configuration tables intentionally have no client RLS policies.
- Authentication Edge Function source was reviewed for role assignment, archived-account handling, login rate limits, password reset authorization and secret placement. Actual passwords were not used and real password changes were not performed.

## Open findings and limits

1. **Leaked-password protection is disabled.** Enable it in the project's Auth settings if supported by the project plan. [Supabase guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
2. **Automated WhatsApp/OTP is not end-to-end verified.** Provider delivery and OTP are disabled. The dormant sender needs recipient opt-in/guardian/archival filtering, and OTP challenge consumption needs concurrency hardening before those paths are enabled. Manual, user-initiated WhatsApp sharing has browser coverage. No real messages were sent during this audit.
3. **Registration abuse protection can be stronger.** Phone ownership verification is not enabled; successful account creation is not counted by the current failed-attempt limiter. Registration, photo upload and safeguarding details are separate operations and need recovery testing for interrupted onboarding.
4. **Performance advisors remain:** nine foreign keys without covering indexes, 22 overlapping-permissive-policy warnings and 14 unused-index notices. These are tuning findings, not evidence of unauthorized access. With the small current dataset, removing indexes or combining access policies without workload measurements would add unnecessary risk. [Foreign-key guidance](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [policy guidance](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies), [index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
5. **Six SECURITY DEFINER RPC warnings remain intentionally visible.** Swap and WhatsApp-admin RPCs are authenticated endpoints with explicit authorization checks. Youth denial of the Admin status RPC and authorized swap acceptance were tested; this does not constitute exhaustive fuzzing of every RPC. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
6. **Native/device limits:** Chromium mobile emulation is not a physical Android device. Camera/gallery permissions, Android back navigation and background behavior require device testing. The native flag repair is included in a newly built test APK; existing installs receive the web fixes on reload but not native Java changes. Notifications rely on the app/browser being active; reliable closed-app push delivery is not established.
7. **Data-volume and failure limits:** no production-scale load test, complete cross-browser matrix, concurrent-transaction stress test or backup-restore drill was run. Roster saving uses several requests and can partially complete during a network failure; it reports errors and must be reloaded before retrying.

Release workflow: [GitHub Actions](https://github.com/stephenchetty1-netizen/efgc-youth-app/actions). Browser tests use synthetic accounts and mocked API data; database role tests use the actual live policies with rolled-back fixtures.
