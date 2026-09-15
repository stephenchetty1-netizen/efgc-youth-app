# EFGC Youth App v25 — Hosted Authentication Release

HTTPS-hosted release prepared for Supabase phone OTP authentication and server-enforced role permissions.

- Youth: own profile, approved attendance, no Year Planner/Duty Roster.
- Approved Leader: protected leader tools and read-only planner plus own duty response.
- Admin: attendance, approvals and planner control.
- Safeguarding records and member photos are protected by Supabase RLS/Storage policies.
- The browser contains only the Supabase publishable key; no service-role/secret key.

The public Admin login never self-provisions Admin privileges. The first account is promoted server-side only after OTP identity verification.