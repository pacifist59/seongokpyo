-- Venue rows are created only through a concert entry flow. Remove only rows
-- that no concert references; any real venue stays untouched.
delete from public.metadata_jobs j
where j.entity_type = 'venue'
  and j.entity_id in (select v.id from public.venues v where not exists (select 1 from public.concerts c where c.venue_id = v.id));

delete from public.venues v
where not exists (select 1 from public.concerts c where c.venue_id = v.id);
