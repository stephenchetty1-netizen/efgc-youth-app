-- V107 Birthday greetings, installed in the connected EFGC Youth Supabase project.
-- The database scheduler uses UTC; 06:00 UTC = 08h00 South African Standard Time.
-- A card is published once per eligible member per year without an Admin click.
-- Existing member birthday opt-in / guardian authorization rules are preserved.

CREATE OR REPLACE FUNCTION private.publish_birthday_wishes()
RETURNS integer LANGUAGE plpgsql SET search_path = ''
AS $birthday$
DECLARE
  local_today date := (now() AT TIME ZONE 'Africa/Johannesburg')::date;
  inserted_count integer := 0;
BEGIN
  INSERT INTO public.news_posts
    (author_id, content, published_at, is_published, post_type,
     birthday_member_id, member_name, celebration_year)
  SELECT null,
    'Happy Birthday, ' || p.full_name ||
    '! May the Lord bless you and keep you, strengthen you, guide you and fill this new year of your life with joy, purpose and His presence. With love from EFGC Youth.',
    now(), true, 'birthday', p.id, p.full_name,
    extract(year FROM local_today)::integer
  FROM public.profiles p
  JOIN public.member_preferences mp
    ON mp.member_id = p.id AND mp.birthday_opt_in = true
  LEFT JOIN public.member_guardian_permissions gp
    ON gp.member_id = p.id
  WHERE p.archived_at IS NULL
    AND p.approval_status = 'approved'
    AND p.birthday IS NOT NULL
    AND (p.birthday <= (local_today - interval '18 years')::date
      OR coalesce(gp.birthday_and_photo_authorized, false))
    AND extract(month FROM p.birthday) = extract(month FROM local_today)
    AND extract(day FROM p.birthday) = extract(day FROM local_today)
  ON CONFLICT (birthday_member_id, celebration_year)
    WHERE post_type = 'birthday' AND birthday_member_id IS NOT NULL
      AND celebration_year IS NOT NULL
    DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$birthday$;

DO $schedule$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'efgc-birthday-wishes-0600-sast') THEN
    PERFORM cron.unschedule('efgc-birthday-wishes-0600-sast');
  END IF;
END;
$schedule$;

SELECT cron.schedule('efgc-birthday-wishes-0800-sast',
  '0 6 * * *', 'select private.publish_birthday_wishes();');
