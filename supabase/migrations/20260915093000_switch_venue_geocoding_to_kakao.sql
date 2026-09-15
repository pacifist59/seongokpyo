-- Kakao Local REST API replaces the former provider. Stored coordinates are
-- WGS84 latitude/longitude and remain provider-neutral.

create or replace function private.queue_enrichment_job()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_has_address boolean;
  v_has_valid_coordinates boolean;
  v_address_changed boolean;
begin
  if TG_TABLE_NAME = 'venues' then
    v_has_address := nullif(trim(concat_ws(' ', new.road_address, new.province, new.district, new.address_detail)), '') is not null;
    v_has_valid_coordinates := coalesce(new.latitude between -90 and 90 and new.longitude between -180 and 180, false);
    v_address_changed := TG_OP = 'UPDATE' and (
      new.road_address is distinct from old.road_address or new.province is distinct from old.province
      or new.district is distinct from old.district or new.address_detail is distinct from old.address_detail
    );

    if TG_OP = 'INSERT' and v_has_valid_coordinates then
      new.geocode_status := 'complete';
      new.geocode_error := null;
    elsif v_address_changed then
      -- A coordinate belongs to an address. Clear the old point before queueing
      -- so the worker cannot accidentally preserve a stale location.
      new.latitude := null;
      new.longitude := null;
      new.geocode_status := case when v_has_address then 'pending' else 'not_available' end;
      new.geocode_error := null;
    elsif TG_OP = 'INSERT' then
      new.geocode_status := case when v_has_address then 'pending' else 'not_available' end;
      new.geocode_error := null;
    end if;

    if v_has_address and not (TG_OP = 'INSERT' and v_has_valid_coordinates) and (TG_OP = 'INSERT' or v_address_changed) then
      insert into public.metadata_jobs (entity_type, entity_id, job_type)
      values ('venue', new.id, 'geocode')
      on conflict (entity_type, entity_id, job_type) do update
        set status = 'pending', last_error = null, locked_at = null, completed_at = null;
    end if;
  elsif TG_OP = 'INSERT' then
    new.metadata_status := 'pending';
    new.metadata_error := null;
    insert into public.metadata_jobs (entity_type, entity_id, job_type)
    values (case TG_TABLE_NAME when 'artists' then 'artist' when 'albums' then 'album' else 'song' end, new.id, 'metadata')
    on conflict (entity_type, entity_id, job_type) do update
      set status = 'pending', last_error = null, locked_at = null, completed_at = null;
  end if;
  return new;
end;
$$;

-- Backfill only rows that do not have a structurally valid coordinate. A venue
-- with a saved point is never re-queued by this migration.
insert into public.metadata_jobs (entity_type, entity_id, job_type)
select 'venue', id, 'geocode'
from public.venues
where nullif(trim(concat_ws(' ', road_address, province, district, address_detail)), '') is not null
  and not coalesce(latitude between -90 and 90 and longitude between -180 and 180, false)
on conflict (entity_type, entity_id, job_type) do update
  set status = 'pending', last_error = null, locked_at = null, completed_at = null;

-- CREATE OR REPLACE cannot remove an output column from a view. Recreate it
-- with the provider-neutral shape before removing the legacy field.
drop view if exists public.venue_statistics;

create view public.venue_statistics with (security_invoker = true) as
select
  v.id, v.name::text as name, v.province, v.district, v.address_detail,
  count(distinct c.id)::integer as concert_count, count(distinct c.artist_id)::integer as artist_count,
  max(c.performance_date) as latest_performance_date,
  v.road_address, v.latitude, v.longitude,
  v.geocode_status, v.geocode_source, v.geocoded_at
from public.venues v
left join public.concerts c on c.venue_id = v.id
group by v.id;

-- Replace the view before removing its former provider-specific column.
alter table public.venues drop column if exists naver_place_url;
