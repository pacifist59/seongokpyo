-- Metadata is collected by a trusted worker, never from the browser.
-- Public clients can create artists, venues, albums and songs as before; this
-- trigger records the follow-up work without granting them access to the queue.

alter table public.artists
  add column metadata_status text not null default 'pending' check (metadata_status in ('pending', 'complete', 'failed', 'not_available')),
  add column metadata_source text,
  add column metadata_updated_at timestamptz,
  add column metadata_error text;

alter table public.venues
  add column geocode_status text not null default 'pending' check (geocode_status in ('pending', 'complete', 'failed', 'not_available')),
  add column geocode_source text,
  add column geocoded_at timestamptz,
  add column geocode_error text;

alter table public.albums
  add column metadata_status text not null default 'pending' check (metadata_status in ('pending', 'complete', 'failed', 'not_available')),
  add column metadata_source text,
  add column metadata_updated_at timestamptz,
  add column metadata_error text;

alter table public.songs
  add column metadata_status text not null default 'pending' check (metadata_status in ('pending', 'complete', 'failed', 'not_available')),
  add column metadata_source text,
  add column metadata_updated_at timestamptz,
  add column metadata_error text;

create table public.metadata_jobs (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('artist', 'venue', 'album', 'song')),
  entity_id uuid not null,
  job_type text not null check (job_type in ('metadata', 'geocode')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'complete', 'failed', 'skipped')),
  attempts smallint not null default 0 check (attempts >= 0),
  priority smallint not null default 0,
  last_error text,
  locked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (entity_type, entity_id, job_type)
);

create index metadata_jobs_pending_idx on public.metadata_jobs (job_type, priority desc, created_at)
  where status = 'pending';
create trigger metadata_jobs_set_updated_at before update on public.metadata_jobs
  for each row execute function public.set_updated_at();

alter table public.metadata_jobs enable row level security;
revoke all on public.metadata_jobs from public, anon, authenticated;

create or replace function private.queue_enrichment_job()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_has_address boolean;
begin
  if TG_TABLE_NAME = 'venues' then
    v_has_address := nullif(trim(concat_ws(' ', new.road_address, new.province, new.district, new.address_detail)), '') is not null;
    if TG_OP = 'INSERT' or new.road_address is distinct from old.road_address
      or new.province is distinct from old.province or new.district is distinct from old.district
      or new.address_detail is distinct from old.address_detail then
      new.geocode_status := case when v_has_address then 'pending' else 'not_available' end;
      new.geocode_error := null;
      if v_has_address then
        insert into public.metadata_jobs (entity_type, entity_id, job_type)
        values ('venue', new.id, 'geocode')
        on conflict (entity_type, entity_id, job_type) do update
          set status = 'pending', last_error = null, locked_at = null, completed_at = null;
      end if;
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

revoke all on function private.queue_enrichment_job() from public, anon, authenticated;

create trigger artists_queue_metadata before insert on public.artists
  for each row execute function private.queue_enrichment_job();
create trigger albums_queue_metadata before insert on public.albums
  for each row execute function private.queue_enrichment_job();
create trigger songs_queue_metadata before insert on public.songs
  for each row execute function private.queue_enrichment_job();
create trigger venues_queue_geocode before insert or update of road_address, province, district, address_detail on public.venues
  for each row execute function private.queue_enrichment_job();

insert into public.metadata_jobs (entity_type, entity_id, job_type)
select 'artist', id, 'metadata' from public.artists
on conflict (entity_type, entity_id, job_type) do nothing;
insert into public.metadata_jobs (entity_type, entity_id, job_type)
select 'album', id, 'metadata' from public.albums
on conflict (entity_type, entity_id, job_type) do nothing;
insert into public.metadata_jobs (entity_type, entity_id, job_type)
select 'song', id, 'metadata' from public.songs
on conflict (entity_type, entity_id, job_type) do nothing;
insert into public.metadata_jobs (entity_type, entity_id, job_type)
select 'venue', id, 'geocode' from public.venues
where nullif(trim(concat_ws(' ', road_address, province, district, address_detail)), '') is not null
on conflict (entity_type, entity_id, job_type) do nothing;

-- This RPC is in the exposed schema only so the trusted Edge Function can call
-- it through the Data API. No browser role receives EXECUTE permission.
create or replace function public.claim_metadata_jobs(p_job_type text, p_limit integer default 20)
returns setof public.metadata_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.metadata_jobs%rowtype;
begin
  if p_job_type not in ('metadata', 'geocode') or p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid metadata job request.' using errcode = '22023';
  end if;
  for v_job in
    select * from public.metadata_jobs
    where job_type = p_job_type and status = 'pending'
    order by priority desc, created_at
    for update skip locked
    limit p_limit
  loop
    update public.metadata_jobs
    set status = 'processing', attempts = attempts + 1, locked_at = now(), last_error = null
    where id = v_job.id
    returning * into v_job;
    return next v_job;
  end loop;
end;
$$;

revoke all on function public.claim_metadata_jobs(text, integer) from public, anon, authenticated;

create or replace view public.artist_statistics with (security_invoker = true) as
select
  a.id, a.name::text as name, a.sort_name,
  count(distinct c.id)::integer as concert_count, count(distinct s.id)::integer as setlist_count,
  max(c.performance_date) as latest_performance_date,
  a.image_url, a.bio, a.activity_type, a.country_code, a.spotify_url,
  a.metadata_status, a.metadata_source, a.metadata_updated_at
from public.artists a
left join public.concerts c on c.artist_id = a.id
left join public.setlists s on s.concert_id = c.id
group by a.id;

create or replace view public.venue_statistics with (security_invoker = true) as
select
  v.id, v.name::text as name, v.province, v.district, v.address_detail,
  count(distinct c.id)::integer as concert_count, count(distinct c.artist_id)::integer as artist_count,
  max(c.performance_date) as latest_performance_date,
  v.road_address, v.latitude, v.longitude, v.naver_place_url,
  v.geocode_status, v.geocode_source, v.geocoded_at
from public.venues v
left join public.concerts c on c.venue_id = v.id
group by v.id;
