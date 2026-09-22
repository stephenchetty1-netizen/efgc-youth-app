-- Fix Postgres 42P17: profiles_self_update previously queried profiles in its
-- own WITH CHECK, causing infinite RLS recursion when saving profile edits.
-- BEFORE UPDATE trigger private.protect_and_audit_profile already prevents a
-- non-admin from changing role, approval_status, leader_role, archived_at.
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
