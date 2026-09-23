-- Filter before inserting so one ineligible birthday cannot abort the daily batch.
CREATE OR REPLACE FUNCTION private.publish_birthday_wishes()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  local_today date := (now() at time zone 'Africa/Johannesburg')::date;
  inserted_count integer := 0;
begin
  insert into public.news_posts (
    author_id,
    content,
    published_at,
    is_published,
    post_type,
    birthday_member_id,
    member_name,
    celebration_year
  )
  select
    null,
    'Happy Birthday, ' || p.full_name || '! May the Lord bless you and keep you, strengthen you, guide you and fill this new year of your life with joy, purpose and His presence. With love from EFGC Youth.',
    now(),
    true,
    'birthday',
    p.id,
    p.full_name,
    extract(year from local_today)::integer
  from public.profiles p
  join public.member_preferences mp on mp.member_id=p.id and mp.birthday_opt_in
  left join public.member_guardian_permissions gp on gp.member_id=p.id
  where p.archived_at is null
    and p.birthday is not null
    and (p.birthday <= (current_date - interval '18 years')::date
         or coalesce(gp.birthday_and_photo_authorized,false))
    and p.approval_status = 'approved'
    and extract(month from p.birthday) = extract(month from local_today)
    and extract(day from p.birthday) = extract(day from local_today)
  on conflict (birthday_member_id, celebration_year)
    where post_type = 'birthday' and birthday_member_id is not null and celebration_year is not null
  do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$function$;
