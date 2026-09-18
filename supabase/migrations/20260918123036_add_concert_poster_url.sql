-- Posters stay hosted by the official publisher. We retain the display URL
-- and the page it came from rather than copying third-party artwork to Storage.
alter table public.concerts
  add column if not exists poster_url text,
  add column if not exists poster_source_url text,
  add constraint concerts_poster_url_check check (poster_url is null or poster_url ~* '^https?://'),
  add constraint concerts_poster_source_url_check check (poster_source_url is null or poster_source_url ~* '^https?://');

create or replace function public.set_setlist_poster(
  p_setlist_id uuid,
  p_poster_url text,
  p_poster_source_url text
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_concert_id uuid;
begin
  select concert_id into v_concert_id
  from public.setlists
  where id = p_setlist_id and author_id = (select auth.uid());
  if v_concert_id is null then
    raise exception '작성자만 공연 포스터를 변경할 수 있습니다.' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_poster_url, '')), '') is not null and trim(p_poster_url) !~* '^https?://' then
    raise exception '포스터 이미지는 http 또는 https 주소여야 합니다.';
  end if;
  if nullif(trim(coalesce(p_poster_source_url, '')), '') is not null and trim(p_poster_source_url) !~* '^https?://' then
    raise exception '포스터 출처는 http 또는 https 주소여야 합니다.';
  end if;
  update public.concerts
  set poster_url = nullif(trim(p_poster_url), ''),
      poster_source_url = nullif(trim(p_poster_source_url), '')
  where id = v_concert_id;
  return p_setlist_id;
end;
$$;

revoke all on function public.set_setlist_poster(uuid, text, text) from public, anon;
grant execute on function public.set_setlist_poster(uuid, text, text) to authenticated;

-- Preserve view column order; new fields are appended for compatible clients.
create or replace view public.setlist_overview with (security_invoker = true) as
select
  s.id, a.id as artist_id, a.name::text as artist_name, c.performance_date,
  c.title as concert_title, v.id as venue_id, v.name::text as venue_name,
  nullif(concat_ws(' ', v.province, v.district), '') as region,
  f.id as festival_id, f.name::text as festival_name, t.name::text as tour_name,
  count(ss.id)::integer as song_count, s.author_id, s.created_at, s.updated_at,
  c.ticket_url, (c.performance_date > current_date) as is_upcoming,
  t.id as tour_id, c.poster_url, c.poster_source_url
from public.setlists s
join public.concerts c on c.id = s.concert_id
join public.artists a on a.id = c.artist_id
left join public.venues v on v.id = c.venue_id
left join public.festivals f on f.id = c.festival_id
left join public.tours t on t.id = c.tour_id
left join public.setlist_songs ss on ss.setlist_id = s.id
group by s.id, a.id, c.id, v.id, f.id, t.id;
