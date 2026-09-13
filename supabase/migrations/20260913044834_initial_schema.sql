create extension if not exists citext;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  name citext not null unique,
  sort_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name citext not null,
  province text,
  district text,
  address_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (name, province, district)
);

create table public.festivals (
  id uuid primary key default gen_random_uuid(),
  name citext not null,
  edition_year smallint not null check (edition_year between 1900 and 2200),
  venue_id uuid references public.venues(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, edition_year)
);

create table public.tours (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  name citext not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_id, name)
);

create table public.concerts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete restrict,
  performance_date date not null,
  title text,
  venue_id uuid references public.venues(id) on delete set null,
  festival_id uuid references public.festivals(id) on delete set null,
  tour_id uuid references public.tours(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.setlists (
  id uuid primary key default gen_random_uuid(),
  concert_id uuid not null unique references public.concerts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  title citext not null,
  normalized_title text generated always as (lower(trim(title::text))) stored,
  original_artist_id uuid references public.artists(id) on delete set null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (artist_id, normalized_title, original_artist_id)
);

create table public.setlist_songs (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete restrict,
  position integer not null check (position > 0),
  section text not null default 'main' check (section in ('main', 'encore')),
  is_cover boolean not null default false,
  guest_artist text,
  note text,
  created_at timestamptz not null default now(),
  unique (setlist_id, position)
);

create table public.attendances (
  user_id uuid not null references auth.users(id) on delete cascade,
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, setlist_id)
);

create table public.setlist_revisions (
  id bigint generated always as identity primary key,
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  changed_by uuid not null references auth.users(id) on delete restrict,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index concerts_artist_date_idx on public.concerts (artist_id, performance_date desc);
create index concerts_venue_date_idx on public.concerts (venue_id, performance_date desc);
create index concerts_festival_date_idx on public.concerts (festival_id, performance_date);
create index setlists_created_at_idx on public.setlists (created_at desc);
create index setlist_songs_setlist_position_idx on public.setlist_songs (setlist_id, position);
create index attendances_setlist_idx on public.attendances (setlist_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger artists_set_updated_at before update on public.artists for each row execute function public.set_updated_at();
create trigger venues_set_updated_at before update on public.venues for each row execute function public.set_updated_at();
create trigger festivals_set_updated_at before update on public.festivals for each row execute function public.set_updated_at();
create trigger tours_set_updated_at before update on public.tours for each row execute function public.set_updated_at();
create trigger concerts_set_updated_at before update on public.concerts for each row execute function public.set_updated_at();
create trigger setlists_set_updated_at before update on public.setlists for each row execute function public.set_updated_at();

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create view public.setlist_overview with (security_invoker = true) as
select
  s.id,
  a.id as artist_id,
  a.name::text as artist_name,
  c.performance_date,
  c.title as concert_title,
  v.id as venue_id,
  v.name::text as venue_name,
  nullif(concat_ws(' ', v.province, v.district), '') as region,
  f.id as festival_id,
  f.name::text as festival_name,
  t.name::text as tour_name,
  count(ss.id)::integer as song_count,
  s.author_id,
  s.created_at,
  s.updated_at
from public.setlists s
join public.concerts c on c.id = s.concert_id
join public.artists a on a.id = c.artist_id
left join public.venues v on v.id = c.venue_id
left join public.festivals f on f.id = c.festival_id
left join public.tours t on t.id = c.tour_id
left join public.setlist_songs ss on ss.setlist_id = s.id
group by s.id, a.id, c.id, v.id, f.id, t.id;

create view public.setlist_song_details with (security_invoker = true) as
select
  ss.id,
  ss.setlist_id,
  ss.song_id,
  song.title::text as title,
  ss.section,
  ss.position,
  ss.is_cover,
  original.name::text as original_artist_name,
  ss.guest_artist,
  ss.note
from public.setlist_songs ss
join public.songs song on song.id = ss.song_id
left join public.artists original on original.id = song.original_artist_id;

create view public.artist_statistics with (security_invoker = true) as
select
  a.id,
  a.name::text as name,
  a.sort_name,
  count(distinct c.id)::integer as concert_count,
  count(distinct s.id)::integer as setlist_count,
  max(c.performance_date) as latest_performance_date
from public.artists a
left join public.concerts c on c.artist_id = a.id
left join public.setlists s on s.concert_id = c.id
group by a.id;

create view public.venue_statistics with (security_invoker = true) as
select
  v.id,
  v.name::text as name,
  v.province,
  v.district,
  v.address_detail,
  count(distinct c.id)::integer as concert_count,
  count(distinct c.artist_id)::integer as artist_count,
  max(c.performance_date) as latest_performance_date
from public.venues v
left join public.concerts c on c.venue_id = v.id
group by v.id;

create view public.festival_statistics with (security_invoker = true) as
select
  f.id,
  f.name::text as name,
  min(c.performance_date) as start_date,
  max(c.performance_date) as end_date,
  v.name::text as venue_name,
  count(distinct c.id)::integer as concert_count,
  count(distinct c.artist_id)::integer as artist_count
from public.festivals f
left join public.venues v on v.id = f.venue_id
left join public.concerts c on c.festival_id = f.id
group by f.id, v.id;

create view public.song_statistics with (security_invoker = true) as
select
  song.id as song_id,
  song.title::text as title,
  a.name::text as artist_name,
  count(ss.id)::integer as play_count
from public.songs song
join public.artists a on a.id = song.artist_id
left join public.setlist_songs ss on ss.song_id = song.id
group by song.id, a.id;

create view public.artist_song_statistics with (security_invoker = true) as
select
  song.artist_id,
  song.id as song_id,
  song.title::text as title,
  count(ss.id)::integer as play_count
from public.songs song
left join public.setlist_songs ss on ss.song_id = song.id
group by song.artist_id, song.id;

alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.venues enable row level security;
alter table public.festivals enable row level security;
alter table public.tours enable row level security;
alter table public.concerts enable row level security;
alter table public.setlists enable row level security;
alter table public.songs enable row level security;
alter table public.setlist_songs enable row level security;
alter table public.attendances enable row level security;
alter table public.setlist_revisions enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy artists_public_read on public.artists for select to anon, authenticated using (true);
create policy venues_public_read on public.venues for select to anon, authenticated using (true);
create policy festivals_public_read on public.festivals for select to anon, authenticated using (true);
create policy tours_public_read on public.tours for select to anon, authenticated using (true);
create policy concerts_public_read on public.concerts for select to anon, authenticated using (true);
create policy setlists_public_read on public.setlists for select to anon, authenticated using (true);
create policy songs_public_read on public.songs for select to anon, authenticated using (true);
create policy setlist_songs_public_read on public.setlist_songs for select to anon, authenticated using (true);

create policy artists_member_insert on public.artists for insert to authenticated with check ((select auth.uid()) is not null and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
create policy venues_member_insert on public.venues for insert to authenticated with check ((select auth.uid()) is not null and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
create policy festivals_member_insert on public.festivals for insert to authenticated with check ((select auth.uid()) is not null and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
create policy tours_member_insert on public.tours for insert to authenticated with check ((select auth.uid()) is not null and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
create policy songs_member_insert on public.songs for insert to authenticated with check ((select auth.uid()) is not null and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
create policy concerts_insert_own on public.concerts for insert to authenticated with check ((select auth.uid()) = created_by);
create policy concerts_update_own on public.concerts for update to authenticated using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by);
create policy concerts_delete_own on public.concerts for delete to authenticated using ((select auth.uid()) = created_by);
create policy setlists_insert_own on public.setlists for insert to authenticated with check ((select auth.uid()) = author_id);
create policy setlists_update_own on public.setlists for update to authenticated using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy setlists_delete_own on public.setlists for delete to authenticated using ((select auth.uid()) = author_id);
create policy setlist_songs_insert_own on public.setlist_songs for insert to authenticated with check (exists (select 1 from public.setlists s where s.id = setlist_id and s.author_id = (select auth.uid())));
create policy setlist_songs_update_own on public.setlist_songs for update to authenticated using (exists (select 1 from public.setlists s where s.id = setlist_id and s.author_id = (select auth.uid()))) with check (exists (select 1 from public.setlists s where s.id = setlist_id and s.author_id = (select auth.uid())));
create policy setlist_songs_delete_own on public.setlist_songs for delete to authenticated using (exists (select 1 from public.setlists s where s.id = setlist_id and s.author_id = (select auth.uid())));
create policy attendances_select_own on public.attendances for select to authenticated using ((select auth.uid()) = user_id);
create policy attendances_insert_own on public.attendances for insert to authenticated with check ((select auth.uid()) = user_id);
create policy attendances_delete_own on public.attendances for delete to authenticated using ((select auth.uid()) = user_id);
create policy revisions_select_own on public.setlist_revisions for select to authenticated using (exists (select 1 from public.setlists s where s.id = setlist_id and s.author_id = (select auth.uid())));
create policy revisions_insert_own on public.setlist_revisions for insert to authenticated with check (changed_by = (select auth.uid()) and exists (select 1 from public.setlists s where s.id = setlist_id and s.author_id = (select auth.uid())));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.artists, public.venues, public.festivals, public.tours, public.concerts, public.setlists, public.songs, public.setlist_songs to anon, authenticated;
grant select on public.setlist_overview, public.setlist_song_details, public.artist_statistics, public.venue_statistics, public.festival_statistics, public.song_statistics, public.artist_song_statistics to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant insert on public.artists, public.venues, public.festivals, public.tours, public.songs to authenticated;
grant insert, update, delete on public.concerts, public.setlists, public.setlist_songs to authenticated;
grant select, insert, delete on public.attendances to authenticated;
grant select, insert on public.setlist_revisions to authenticated;
grant usage, select on sequence public.setlist_revisions_id_seq to authenticated;

create or replace function public.create_setlist(
  p_artist_name text,
  p_performance_date date,
  p_concert_title text,
  p_venue_name text,
  p_province text,
  p_district text,
  p_address_detail text,
  p_festival_name text,
  p_tour_name text,
  p_songs jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_artist_id uuid;
  v_venue_id uuid;
  v_festival_id uuid;
  v_tour_id uuid;
  v_concert_id uuid;
  v_setlist_id uuid;
  v_original_artist_id uuid;
  v_song_id uuid;
  v_item record;
begin
  if v_user_id is null or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception '로그인이 필요합니다.' using errcode = '42501';
  end if;
  if nullif(trim(p_artist_name), '') is null then raise exception '아티스트명은 필수입니다.'; end if;
  if jsonb_typeof(p_songs) <> 'array' or jsonb_array_length(p_songs) = 0 then raise exception '곡을 한 개 이상 입력해주세요.'; end if;

  select id into v_artist_id from public.artists where name = trim(p_artist_name) limit 1;
  if v_artist_id is null then
    insert into public.artists (name, sort_name) values (trim(p_artist_name), lower(trim(p_artist_name))) returning id into v_artist_id;
  end if;

  if nullif(trim(p_venue_name), '') is not null then
    select id into v_venue_id from public.venues where name = trim(p_venue_name) and province is not distinct from nullif(trim(p_province), '') and district is not distinct from nullif(trim(p_district), '') limit 1;
    if v_venue_id is null then
      insert into public.venues (name, province, district, address_detail) values (trim(p_venue_name), nullif(trim(p_province), ''), nullif(trim(p_district), ''), nullif(trim(p_address_detail), '')) returning id into v_venue_id;
    end if;
  end if;

  if nullif(trim(p_festival_name), '') is not null then
    select id into v_festival_id from public.festivals where name = trim(p_festival_name) and edition_year = extract(year from p_performance_date)::smallint limit 1;
    if v_festival_id is null then
      insert into public.festivals (name, edition_year, venue_id) values (trim(p_festival_name), extract(year from p_performance_date)::smallint, v_venue_id) returning id into v_festival_id;
    end if;
  end if;

  if nullif(trim(p_tour_name), '') is not null then
    select id into v_tour_id from public.tours where artist_id = v_artist_id and name = trim(p_tour_name) limit 1;
    if v_tour_id is null then insert into public.tours (artist_id, name) values (v_artist_id, trim(p_tour_name)) returning id into v_tour_id; end if;
  end if;

  insert into public.concerts (artist_id, performance_date, title, venue_id, festival_id, tour_id, created_by)
  values (v_artist_id, p_performance_date, nullif(trim(p_concert_title), ''), v_venue_id, v_festival_id, v_tour_id, v_user_id)
  returning id into v_concert_id;
  insert into public.setlists (concert_id, author_id) values (v_concert_id, v_user_id) returning id into v_setlist_id;

  for v_item in select value, ordinality from jsonb_array_elements(p_songs) with ordinality loop
    v_original_artist_id := null;
    if nullif(trim(v_item.value ->> 'original_artist'), '') is not null then
      select id into v_original_artist_id from public.artists where name = trim(v_item.value ->> 'original_artist') limit 1;
      if v_original_artist_id is null then insert into public.artists (name, sort_name) values (trim(v_item.value ->> 'original_artist'), lower(trim(v_item.value ->> 'original_artist'))) returning id into v_original_artist_id; end if;
    end if;
    select id into v_song_id from public.songs where artist_id = v_artist_id and normalized_title = lower(trim(v_item.value ->> 'title')) and original_artist_id is not distinct from v_original_artist_id limit 1;
    if v_song_id is null then insert into public.songs (artist_id, title, original_artist_id) values (v_artist_id, trim(v_item.value ->> 'title'), v_original_artist_id) returning id into v_song_id; end if;
    insert into public.setlist_songs (setlist_id, song_id, position, section, is_cover, guest_artist, note)
    values (v_setlist_id, v_song_id, v_item.ordinality::integer, case when v_item.value ->> 'section' = 'encore' then 'encore' else 'main' end, coalesce((v_item.value ->> 'is_cover')::boolean, false), nullif(trim(v_item.value ->> 'guest_artist'), ''), nullif(trim(v_item.value ->> 'note'), ''));
  end loop;
  return v_setlist_id;
end;
$$;

create or replace function public.replace_setlist(
  p_setlist_id uuid,
  p_artist_name text,
  p_performance_date date,
  p_concert_title text,
  p_venue_name text,
  p_province text,
  p_district text,
  p_address_detail text,
  p_festival_name text,
  p_tour_name text,
  p_songs jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_concert_id uuid;
  v_artist_id uuid;
  v_venue_id uuid;
  v_festival_id uuid;
  v_tour_id uuid;
  v_original_artist_id uuid;
  v_song_id uuid;
  v_item record;
begin
  select concert_id into v_concert_id from public.setlists where id = p_setlist_id and author_id = v_user_id;
  if v_concert_id is null then raise exception '작성자만 수정할 수 있습니다.' using errcode = '42501'; end if;
  if jsonb_typeof(p_songs) <> 'array' or jsonb_array_length(p_songs) = 0 then raise exception '곡을 한 개 이상 입력해주세요.'; end if;

  insert into public.setlist_revisions (setlist_id, changed_by, snapshot)
  select p_setlist_id, v_user_id, jsonb_build_object('setlist', to_jsonb(s), 'concert', to_jsonb(c), 'songs', coalesce((select jsonb_agg(to_jsonb(ss) order by ss.position) from public.setlist_songs ss where ss.setlist_id = s.id), '[]'::jsonb))
  from public.setlists s join public.concerts c on c.id = s.concert_id where s.id = p_setlist_id;

  select id into v_artist_id from public.artists where name = trim(p_artist_name) limit 1;
  if v_artist_id is null then insert into public.artists (name, sort_name) values (trim(p_artist_name), lower(trim(p_artist_name))) returning id into v_artist_id; end if;

  if nullif(trim(p_venue_name), '') is not null then
    select id into v_venue_id from public.venues where name = trim(p_venue_name) and province is not distinct from nullif(trim(p_province), '') and district is not distinct from nullif(trim(p_district), '') limit 1;
    if v_venue_id is null then insert into public.venues (name, province, district, address_detail) values (trim(p_venue_name), nullif(trim(p_province), ''), nullif(trim(p_district), ''), nullif(trim(p_address_detail), '')) returning id into v_venue_id; end if;
  end if;

  if nullif(trim(p_festival_name), '') is not null then
    select id into v_festival_id from public.festivals where name = trim(p_festival_name) and edition_year = extract(year from p_performance_date)::smallint limit 1;
    if v_festival_id is null then insert into public.festivals (name, edition_year, venue_id) values (trim(p_festival_name), extract(year from p_performance_date)::smallint, v_venue_id) returning id into v_festival_id; end if;
  end if;

  if nullif(trim(p_tour_name), '') is not null then
    select id into v_tour_id from public.tours where artist_id = v_artist_id and name = trim(p_tour_name) limit 1;
    if v_tour_id is null then insert into public.tours (artist_id, name) values (v_artist_id, trim(p_tour_name)) returning id into v_tour_id; end if;
  end if;

  update public.concerts set artist_id = v_artist_id, performance_date = p_performance_date, title = nullif(trim(p_concert_title), ''), venue_id = v_venue_id, festival_id = v_festival_id, tour_id = v_tour_id where id = v_concert_id;
  update public.setlists set updated_at = now() where id = p_setlist_id;
  delete from public.setlist_songs where setlist_id = p_setlist_id;

  for v_item in select value, ordinality from jsonb_array_elements(p_songs) with ordinality loop
    v_original_artist_id := null;
    if nullif(trim(v_item.value ->> 'original_artist'), '') is not null then
      select id into v_original_artist_id from public.artists where name = trim(v_item.value ->> 'original_artist') limit 1;
      if v_original_artist_id is null then insert into public.artists (name, sort_name) values (trim(v_item.value ->> 'original_artist'), lower(trim(v_item.value ->> 'original_artist'))) returning id into v_original_artist_id; end if;
    end if;
    select id into v_song_id from public.songs where artist_id = v_artist_id and normalized_title = lower(trim(v_item.value ->> 'title')) and original_artist_id is not distinct from v_original_artist_id limit 1;
    if v_song_id is null then insert into public.songs (artist_id, title, original_artist_id) values (v_artist_id, trim(v_item.value ->> 'title'), v_original_artist_id) returning id into v_song_id; end if;
    insert into public.setlist_songs (setlist_id, song_id, position, section, is_cover, guest_artist, note)
    values (p_setlist_id, v_song_id, v_item.ordinality::integer, case when v_item.value ->> 'section' = 'encore' then 'encore' else 'main' end, coalesce((v_item.value ->> 'is_cover')::boolean, false), nullif(trim(v_item.value ->> 'guest_artist'), ''), nullif(trim(v_item.value ->> 'note'), ''));
  end loop;
  return p_setlist_id;
end;
$$;

revoke all on function public.create_setlist(text, date, text, text, text, text, text, text, text, jsonb) from public, anon;
revoke all on function public.replace_setlist(uuid, text, date, text, text, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.create_setlist(text, date, text, text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.replace_setlist(uuid, text, date, text, text, text, text, text, text, text, jsonb) to authenticated;
