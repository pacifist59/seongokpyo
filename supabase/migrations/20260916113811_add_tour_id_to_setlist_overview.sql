-- Keep the existing view's column order intact and append the link target.
-- Appending avoids PostgreSQL's "cannot change name of view column" error.
create or replace view public.setlist_overview with (security_invoker = true) as
select
  s.id, a.id as artist_id, a.name::text as artist_name, c.performance_date,
  c.title as concert_title, v.id as venue_id, v.name::text as venue_name,
  nullif(concat_ws(' ', v.province, v.district), '') as region,
  f.id as festival_id, f.name::text as festival_name, t.name::text as tour_name,
  count(ss.id)::integer as song_count, s.author_id, s.created_at, s.updated_at,
  c.ticket_url, (c.performance_date > current_date) as is_upcoming,
  t.id as tour_id
from public.setlists s
join public.concerts c on c.id = s.concert_id
join public.artists a on a.id = c.artist_id
left join public.venues v on v.id = c.venue_id
left join public.festivals f on f.id = c.festival_id
left join public.tours t on t.id = c.tour_id
left join public.setlist_songs ss on ss.setlist_id = s.id
group by s.id, a.id, c.id, v.id, f.id, t.id;
