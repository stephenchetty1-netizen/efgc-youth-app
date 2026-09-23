-- V104: retain existing RLS; repair trigger checks without broadening schema grants.
create or replace function public.protect_duty_assignment_fields()
returns trigger language plpgsql security invoker set search_path=''
as $function$
begin
  -- Direct Data API writes run as authenticated. Authorized swap RPCs run as
  -- their privileged owner only after verifying caller, recipient and row locks.
  if current_user in ('authenticated','anon') and not exists (
    select 1 from public.profiles p where p.id=auth.uid()
      and p.role='admin' and p.approval_status='approved' and p.archived_at is null
  ) then
    if old.leader_id is distinct from new.leader_id
       or old.planner_id is distinct from new.planner_id
       or old.duty_type is distinct from new.duty_type
       or old.id is distinct from new.id then
      raise exception 'Leaders may only update status or replacement note on their own duty';
    end if;
  end if;
  return new;
end;
$function$;

create or replace function private.current_role()
returns public.app_role language sql stable security definer set search_path=''
as $function$
  select p.role from public.profiles p
  where p.id=(select auth.uid()) and p.archived_at is null and p.approval_status='approved'
$function$;

CREATE OR REPLACE FUNCTION private.enforce_attendance_finalization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op='INSERT' then
    if new.attendance_approved then raise exception 'Create the meeting before finalizing attendance'; end if;
    return new;
  end if;
  if old.attendance_approved then
    if tg_op='DELETE' then raise exception 'Finalized attendance is locked'; end if;
    if new.attendance_approved is distinct from old.attendance_approved
       or new.approved_by is distinct from old.approved_by
       or new.approved_at is distinct from old.approved_at
       or new.event_date is distinct from old.event_date
       or new.id is distinct from old.id then
      raise exception 'Finalized attendance is locked';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  if new.attendance_approved and not coalesce(old.attendance_approved, false) then
    if private.current_role()::text is distinct from 'admin' then
      raise exception 'Only an Admin may finalize attendance';
    end if;
    if new.approved_by is distinct from (select auth.uid()) then
      raise exception 'Attendance approval must identify the signed-in Admin';
    end if;
    if new.event_date > now() then
      raise exception 'Attendance can only be finalized after the meeting starts';
    end if;
    if new.approved_at is null then
      raise exception 'Attendance approval timestamp is required';
    end if;
    if exists (
      select 1
      from public.profiles p
      where p.role::text = 'youth'
        and p.approval_status::text = 'approved'
        and p.archived_at is null
        and not exists (
          select 1
          from public.attendance a
          where a.event_id = new.id and a.youth_id = p.id
        )
    ) then
      raise exception 'Attendance register is incomplete';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists enforce_attendance_finalization on public.events;
create trigger enforce_attendance_finalization before insert or update or delete
on public.events for each row execute function private.enforce_attendance_finalization();

create or replace function private.lock_finalized_attendance()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare locked boolean;
begin
  -- Lock both source and destination meeting; serialize writes with finalization.
  for locked in
    select e.attendance_approved from public.events e
    where e.id in (
      case when tg_op<>'INSERT' then old.event_id end,
      case when tg_op<>'DELETE' then new.event_id end
    ) order by e.id for update
  loop
    if locked then raise exception 'Finalized attendance is locked'; end if;
  end loop;
  return case when tg_op='DELETE' then old else new end;
end;
$function$;

CREATE OR REPLACE FUNCTION public.request_duty_swap(p_assignment_id bigint, p_requested_leader_id uuid)
 RETURNS duty_swap_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_assignment public.duty_assignments%rowtype;
  v_result public.duty_swap_requests%rowtype;
begin
  if v_uid is null or private.current_role() is distinct from 'leader' then
    raise exception 'Approved Leader authentication required.';
  end if;

  select * into v_assignment
  from public.duty_assignments
  where id = p_assignment_id
  for update;

  if not found or v_assignment.leader_id <> v_uid then
    raise exception 'You can only swap a duty currently assigned to you.';
  end if;

  if p_requested_leader_id is null or p_requested_leader_id = v_uid then
    raise exception 'Choose another approved Leader.';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_requested_leader_id
      and p.role = 'leader'
      and p.approval_status = 'approved'
      and p.archived_at is null
  ) then
    raise exception 'The selected replacement is not an approved Leader.';
  end if;

  if exists (
    select 1 from public.duty_swap_requests s
    where s.duty_assignment_id = p_assignment_id and s.status = 'pending'
  ) then
    raise exception 'A swap request is already awaiting acknowledgement.';
  end if;

  update public.duty_assignments
     set status = 'replacement_requested',
         replacement_note = 'Swap awaiting acknowledgement',
         updated_at = now()
   where id = p_assignment_id;

  insert into public.duty_swap_requests(
    duty_assignment_id, requester_leader_id, requested_leader_id, status
  ) values (
    p_assignment_id, v_uid, p_requested_leader_id, 'pending'
  ) returning * into v_result;

  return v_result;
end;
$function$;
