-- EFGC Youth: allow more than one leader per roster item.
-- Applied to production Supabase on 2026-09-18.

alter table public.duty_assignments
  drop constraint if exists duty_assignments_planner_id_duty_type_key;

alter table public.duty_assignments
  add constraint duty_assignments_planner_id_duty_type_leader_id_key
  unique (planner_id, duty_type, leader_id);

comment on constraint duty_assignments_planner_id_duty_type_leader_id_key
  on public.duty_assignments
  is 'Allows multiple leaders per roster item while preventing duplicate assignment of the same leader.';
