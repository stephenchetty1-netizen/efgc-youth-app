-- Run in one database session. All fixtures and mutations are rolled back.
begin;
select set_config('audit.admin',(select id::text from public.profiles where role='admin' and approval_status='approved' and archived_at is null limit 1),true);
select set_config('audit.leader',(select id::text from public.profiles where role='leader' and approval_status='approved' and archived_at is null limit 1),true);
select set_config('audit.youth',(select id::text from public.profiles where role='youth' and approval_status='approved' and archived_at is null limit 1),true);
select set_config('audit.replacement',gen_random_uuid()::text,true);
select set_config('request.jwt.claim.sub',current_setting('audit.admin'),true);
insert into auth.users(id) values(current_setting('audit.replacement')::uuid);
insert into public.profiles(id,full_name,role,approval_status)
values(current_setting('audit.replacement')::uuid,'Rollback audit fixture','leader','approved');
insert into public.events(id,title,event_date) overriding system value
values(-104001,'Rollback audit A',now()-interval '1 day'),(-104002,'Rollback audit B',now()-interval '1 day'),(-104003,'Rollback future',now()+interval '1 day');
insert into public.duty_assignments(id,planner_id,duty_type,leader_id) overriding system value
select -104001,min(id),'welcome',current_setting('audit.leader')::uuid from public.year_planner;
set local role authenticated;
do $test$
begin
  begin
    update public.events set attendance_approved=true,approved_by=auth.uid(),approved_at=now() where id=-104001;
    raise exception 'ASSERT incomplete register accepted';
  exception when others then
    if sqlerrm<>'Attendance register is incomplete' then raise; end if;
  end;
  update public.profiles set archived_at=now() where id=current_setting('audit.youth')::uuid;
  -- No attendance row is required for an archived Youth member.
  update public.events set attendance_approved=true,approved_by=auth.uid(),approved_at=now() where id=-104002;
  update public.profiles set archived_at=null where id=current_setting('audit.youth')::uuid;
  insert into public.attendance(event_id,youth_id,status,recorded_by)
  values(-104001,current_setting('audit.youth')::uuid,'present',auth.uid());
  update public.events set attendance_approved=true,approved_by=auth.uid(),approved_at=now() where id=-104001;
  begin
    update public.attendance set event_id=-104003 where event_id=-104001;
    raise exception 'ASSERT finalized row moved';
  exception when others then if sqlerrm<>'Finalized attendance is locked' then raise; end if; end;
  begin
    update public.events set attendance_approved=false where id=-104001;
    raise exception 'ASSERT finalized register reopened';
  exception when others then if sqlerrm<>'Finalized attendance is locked' then raise; end if; end;
  begin
    update public.events set approved_by=null where id=-104001;
    raise exception 'ASSERT approval metadata changed';
  exception when others then if sqlerrm<>'Finalized attendance is locked' then raise; end if; end;
  begin
    delete from public.events where id=-104001;
    raise exception 'ASSERT finalized register deleted';
  exception when others then if sqlerrm<>'Finalized attendance is locked' then raise; end if; end;
  begin
    update public.events set attendance_approved=true,approved_by=auth.uid(),approved_at=now() where id=-104003;
    raise exception 'ASSERT future register finalized';
  exception when others then if sqlerrm<>'Attendance can only be finalized after the meeting starts' then raise; end if; end;
end $test$;
select set_config('request.jwt.claim.sub',current_setting('audit.leader'),true);
do $test$
declare swap_id bigint;
begin
  update public.duty_assignments set status='confirmed' where id=-104001;
  if not exists(select 1 from public.duty_assignments where id=-104001 and status='confirmed') then raise exception 'ASSERT Ready failed'; end if;
  begin
    update public.duty_assignments set duty_type='lesson' where id=-104001;
    raise exception 'ASSERT Leader changed allocated duty';
  exception when others then if sqlerrm<>'Leaders may only update status or replacement note on their own duty' then raise; end if; end;
  select id into swap_id from public.request_duty_swap(-104001,current_setting('audit.replacement')::uuid);
  perform set_config('audit.swap',swap_id::text,true);
end $test$;
select set_config('request.jwt.claim.sub',current_setting('audit.replacement'),true);
select public.respond_to_duty_swap(current_setting('audit.swap')::bigint,true);
do $test$
begin
  if not exists(select 1 from public.duty_assignments where id=-104001 and leader_id=auth.uid() and status='pending') then raise exception 'ASSERT swap did not transfer duty'; end if;
  update public.duty_assignments set status='confirmed' where id=-104001;
end $test$;
select set_config('request.jwt.claim.sub',current_setting('audit.youth'),true);
do $test$
begin
  if exists(select 1 from public.profiles where id<>auth.uid()) then raise exception 'ASSERT Youth sees other member profiles'; end if;
  if exists(select 1 from public.duty_assignments) then raise exception 'ASSERT Youth sees staff duties'; end if;
  begin
    perform public.get_whatsapp_admin_status();
    raise exception 'ASSERT Youth called Admin RPC';
  exception when others then if sqlerrm<>'Approved Admin access is required' then raise; end if; end;
end $test$;
select 'PASS: archived Youth, incomplete/future finalization, source lock, reopen/metadata/delete locks, Ready, direct reassignment denial, accepted swap, replacement Ready, Youth isolation, Admin RPC denial' as audit_result;
rollback;
