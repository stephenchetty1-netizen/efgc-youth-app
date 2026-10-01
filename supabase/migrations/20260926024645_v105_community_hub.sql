-- V105 is additive. Existing private prayers, testimonies, profiles and
-- finalised attendance retain their existing policies and data.
create table public.v105_content (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('prayer','devotional','group','resource','service','setlist')),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  body text not null check (char_length(btrim(body)) between 3 and 5000),
  url text check (url is null or (url ~ '^https://[^[:space:]]+$' and char_length(url)<=1500)),
  status text not null default 'pending' check (status in ('pending','published','archived')),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create index v105_content_author on public.v105_content(created_by);
create index v105_content_feed on public.v105_content(kind,status,created_at desc);
alter table public.v105_content enable row level security;
revoke all on public.v105_content from anon,authenticated;
grant select,delete on public.v105_content to authenticated;
grant insert(kind,title,body,url,status,created_by) on public.v105_content to authenticated;
grant update(status) on public.v105_content to authenticated;
create policy v105_content_read on public.v105_content for select to authenticated
using ((select private.current_role()) is not null and
 (status='published' or created_by=(select auth.uid()) or (select private.current_role())='admin'));
create policy v105_content_submit on public.v105_content for insert to authenticated
with check (created_by=(select auth.uid()) and (select private.current_role()) is not null and
 (((select private.current_role())='admin') or (kind='prayer' and status='pending' and url is null)));
create policy v105_content_review on public.v105_content for update to authenticated
using ((select private.current_role())='admin') with check ((select private.current_role())='admin');
create policy v105_content_withdraw on public.v105_content for delete to authenticated
using ((select private.current_role()) is not null and
 (created_by=(select auth.uid()) and kind='prayer'));

create table public.v105_signups (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.v105_content(id) on delete cascade,
  member_id uuid not null default auth.uid() references public.profiles(id),
  status text not null default 'requested' check (status in ('requested','approved','declined')),
  created_at timestamptz not null default now(),
  unique(post_id,member_id)
);
create index v105_signups_member on public.v105_signups(member_id);
alter table public.v105_signups enable row level security;
revoke all on public.v105_signups from anon,authenticated;
grant select,delete on public.v105_signups to authenticated;
grant insert(post_id,member_id) on public.v105_signups to authenticated;
grant update(status) on public.v105_signups to authenticated;
create policy v105_signups_read on public.v105_signups for select to authenticated
using ((select private.current_role()) is not null and
 (member_id=(select auth.uid()) or (select private.current_role())='admin'));
create policy v105_signups_submit on public.v105_signups for insert to authenticated
with check (member_id=(select auth.uid()) and status='requested' and
 (select private.current_role()) is not null and exists
 (select 1 from public.v105_content c where c.id=post_id and c.status='published' and c.kind in ('group','service')));
create policy v105_signups_review on public.v105_signups for update to authenticated
using ((select private.current_role())='admin') with check ((select private.current_role())='admin');
create policy v105_signups_withdraw on public.v105_signups for delete to authenticated
using (member_id=(select auth.uid()) and (select private.current_role()) is not null);

create table public.v105_mentoring (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null default auth.uid() references public.profiles(id),
  topic text not null check (char_length(btrim(topic)) between 5 and 2000),
  status text not null default 'requested' check (status in ('requested','contacted','closed')),
  created_at timestamptz not null default now()
);
create index v105_mentoring_member on public.v105_mentoring(member_id);
alter table public.v105_mentoring enable row level security;
revoke all on public.v105_mentoring from anon,authenticated;
grant select,delete on public.v105_mentoring to authenticated;
grant insert(member_id,topic) on public.v105_mentoring to authenticated;
grant update(status) on public.v105_mentoring to authenticated;
create policy v105_mentoring_read on public.v105_mentoring for select to authenticated
using ((select private.current_role()) is not null and
 (member_id=(select auth.uid()) or (select private.current_role())='admin'));
create policy v105_mentoring_submit on public.v105_mentoring for insert to authenticated
with check (member_id=(select auth.uid()) and status='requested' and (select private.current_role()) is not null);
create policy v105_mentoring_review on public.v105_mentoring for update to authenticated
using ((select private.current_role())='admin') with check ((select private.current_role())='admin');
create policy v105_mentoring_withdraw on public.v105_mentoring for delete to authenticated
using (member_id=(select auth.uid()) and (select private.current_role()) is not null);

create table public.v105_checkins (
  event_id bigint not null references public.events(id) on delete cascade,
  member_id uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key(event_id,member_id)
);
create index v105_checkins_member on public.v105_checkins(member_id);
alter table public.v105_checkins enable row level security;
revoke all on public.v105_checkins from anon,authenticated;
grant select on public.v105_checkins to authenticated;
grant insert(event_id,member_id) on public.v105_checkins to authenticated;
create policy v105_checkins_read on public.v105_checkins for select to authenticated
using ((select private.current_role()) is not null and
 (member_id=(select auth.uid()) or (select private.current_role())='admin'));
create policy v105_checkins_submit on public.v105_checkins for insert to authenticated
with check (member_id=(select auth.uid()) and (select private.current_role())='youth' and exists
 (select 1 from public.events e where e.id=event_id and not e.attendance_approved
  and now() between e.event_date-interval '2 hours' and e.event_date+interval '6 hours'));

comment on table public.v105_content is 'Moderated member Prayer Wall and Admin-published ministry content. Private prayer_requests are never copied here.';
comment on table public.v105_mentoring is 'Private support requests, visible only to the requester and approved Admins.';
comment on table public.v105_checkins is 'Youth self check-in requests. Not attendance and never automatically finalises a register.';
notify pgrst, 'reload schema';
