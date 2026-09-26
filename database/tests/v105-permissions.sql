-- Run against the EFGC schema after the migration. Everything is rolled back.
-- Uses existing role identities, but never modifies their profiles or auth data.
begin;
do $$
declare
  a uuid; y uuid; l uuid; g uuid; prayer uuid; mentoring uuid; ev bigint; future_ev bigint;
  n integer;
begin
  select id into a from public.profiles where role='admin' and approval_status='approved' and archived_at is null limit 1;
  select id into y from public.profiles where role='youth' and approval_status='approved' and archived_at is null limit 1;
  select id into l from public.profiles where role='leader' and approval_status='approved' and archived_at is null limit 1;
  if a is null or y is null or l is null then raise exception 'Test requires one active Admin, Youth and Leader'; end if;
  insert into public.events(title,event_date) values ('V105 rollback-only test',now()) returning id into ev;
  insert into public.events(title,event_date) values ('V105 rollback-only future test',now()+interval '1 day') returning id into future_ev;

  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
  set local role authenticated;
  insert into public.v105_content(kind,title,body,status,created_by)
    values ('group','V105 Test Group','Rollback-only group','published',a) returning id into g;

  reset role;
  perform set_config('request.jwt.claim.sub',y::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',y,'role','authenticated')::text,true);
  set local role authenticated;
  begin
    insert into public.v105_content(kind,title,body,status,created_by) values ('prayer','Test prayer','Not approved','published',y);
    raise exception 'TEST FAIL: Youth self-published a prayer';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.v105_content(kind,title,body,status,created_by) values ('resource','Test resource','Not authorised','pending',y);
    raise exception 'TEST FAIL: Youth published ministry content';
  exception when insufficient_privilege then null; end;
  insert into public.v105_content(kind,title,body,status,created_by)
    values ('prayer','Test prayer','Pending review only','pending',y) returning id into prayer;
  insert into public.v105_mentoring(member_id,topic) values(y,'Private rollback-only mentoring') returning id into mentoring;
  insert into public.v105_signups(post_id,member_id) values(g,y);
  begin
    insert into public.v105_signups(post_id,member_id) values(g,y);
    raise exception 'TEST FAIL: Duplicate membership request';
  exception when unique_violation then null; end;
  begin
    insert into public.v105_signups(post_id,member_id) values(prayer,y);
    raise exception 'TEST FAIL: Joining a prayer rather than a published group/service';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.v105_signups(post_id,member_id,status) values(g,y,'approved');
    raise exception 'TEST FAIL: Member supplied approved status';
  exception when insufficient_privilege then null; end;
  update public.v105_content set status='published' where id=prayer;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'TEST FAIL: Youth approved their prayer'; end if;
  begin
    insert into public.v105_mentoring(member_id,topic) values(l,'Spoofed requester');
    raise exception 'TEST FAIL: Spoofed mentoring owner';
  exception when insufficient_privilege then null; end;
  insert into public.v105_checkins(event_id,member_id) values(ev,y);
  begin
    insert into public.v105_checkins(event_id,member_id) values(ev,y);
    raise exception 'TEST FAIL: Duplicate check-in';
  exception when unique_violation then null; end;
  begin
    insert into public.v105_checkins(event_id,member_id) values(future_ev,y);
    raise exception 'TEST FAIL: Check-in outside meeting window';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.v105_checkins(event_id,member_id,created_at) values(future_ev,y,now()-interval '1 day');
    raise exception 'TEST FAIL: Spoofed server timestamp';
  exception when insufficient_privilege then null; end;

  reset role;
  perform set_config('request.jwt.claim.sub',l::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',l,'role','authenticated')::text,true);
  set local role authenticated;
  if exists(select 1 from public.v105_content where id=prayer) then raise exception 'TEST FAIL: Leader saw unapproved member prayer'; end if;
  if exists(select 1 from public.v105_mentoring where id=mentoring) then raise exception 'TEST FAIL: Leader saw private mentoring'; end if;
  if exists(select 1 from public.v105_signups where post_id=g) then raise exception 'TEST FAIL: Leader saw another member signup'; end if;
  if exists(select 1 from public.v105_checkins where event_id=ev) then raise exception 'TEST FAIL: Leader saw another member check-in'; end if;
  if not exists(select 1 from public.v105_content where id=g) then raise exception 'TEST FAIL: Published group unavailable'; end if;

  reset role;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',a,'role','authenticated')::text,true);
  set local role authenticated;
  if not exists(select 1 from public.v105_mentoring where id=mentoring) then raise exception 'TEST FAIL: Admin cannot read mentoring queue'; end if;
  update public.v105_content set status='published' where id=prayer;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'TEST FAIL: Admin cannot approve prayer'; end if;
  update public.v105_signups set status='approved' where post_id=g and member_id=y;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'TEST FAIL: Admin cannot approve signup'; end if;
  update public.v105_mentoring set status='contacted' where id=mentoring;
  if exists(select 1 from public.attendance where event_id=ev) then raise exception 'TEST FAIL: Check-in automatically wrote attendance'; end if;

  reset role;
  perform set_config('request.jwt.claim.sub',y::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',y,'role','authenticated')::text,true);
  set local role authenticated;
  delete from public.v105_content where id=prayer;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'TEST FAIL: Member cannot withdraw published prayer'; end if;
  delete from public.v105_mentoring where id=mentoring;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'TEST FAIL: Member cannot withdraw mentoring'; end if;

  reset role;
  set local role anon;
  begin
    perform count(*) from public.v105_mentoring;
    raise exception 'TEST FAIL: Anonymous table access';
  exception when insufficient_privilege then null; end;
  reset role;
end $$;
rollback;
select 'PASS: V105 role boundaries, moderation, ownership, timestamp protection, duplicate prevention, check-in window and rollback' as result;
