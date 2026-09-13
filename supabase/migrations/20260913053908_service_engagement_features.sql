update public.profiles
set display_name = '공연팬-' || left(id::text, 6)
where display_name is not null and char_length(trim(display_name)) not between 2 and 20;

insert into public.profiles (id, display_name, avatar_url)
select
  id,
  case
    when char_length(trim(coalesce(raw_user_meta_data ->> 'display_name', ''))) between 2 and 20
      then trim(raw_user_meta_data ->> 'display_name')
    else '공연팬-' || left(id::text, 6)
  end,
  raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

alter table public.profiles
  add constraint profiles_display_name_length_check
  check (display_name is null or char_length(trim(display_name)) between 2 and 20);

alter table public.artists
  add column image_url text,
  add column bio text,
  add column activity_type text,
  add column country_code text,
  add column spotify_url text;

alter table public.venues
  add column road_address text,
  add column latitude numeric(9, 6),
  add column longitude numeric(9, 6),
  add column naver_place_url text,
  add constraint venues_latitude_check check (latitude is null or latitude between -90 and 90),
  add constraint venues_longitude_check check (longitude is null or longitude between -180 and 180);

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  name citext not null,
  image_url text,
  release_date date,
  external_album_id text,
  spotify_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (artist_id, name, external_album_id)
);

alter table public.songs
  add column album_id uuid references public.albums(id) on delete set null,
  add column external_track_id text,
  add column spotify_url text;

alter table public.setlist_songs
  alter column song_id drop not null,
  add column custom_title text,
  add constraint setlist_songs_title_source_check
  check (song_id is not null or nullif(trim(custom_title), '') is not null);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.setlist_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, setlist_id)
);

create table public.setlist_activity (
  id bigint generated always as identity primary key,
  setlist_id uuid references public.setlists(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('created', 'edited', 'deleted')),
  reason text check (reason is null or char_length(reason) <= 300),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index comments_setlist_created_idx on public.comments (setlist_id, created_at, id);
create index comments_user_created_idx on public.comments (user_id, created_at desc);
create index setlist_bookmarks_user_created_idx on public.setlist_bookmarks (user_id, created_at desc);
create index setlist_activity_setlist_created_idx on public.setlist_activity (setlist_id, created_at desc);
create index songs_search_idx on public.songs using gin (to_tsvector('simple', title::text));

create trigger albums_set_updated_at before update on public.albums for each row execute function public.set_updated_at();
create trigger comments_set_updated_at before update on public.comments for each row execute function public.set_updated_at();

drop policy profiles_select_own on public.profiles;
create policy profiles_public_read on public.profiles for select to anon, authenticated using (true);

alter table public.albums enable row level security;
alter table public.comments enable row level security;
alter table public.setlist_bookmarks enable row level security;
alter table public.setlist_activity enable row level security;

create policy albums_public_read on public.albums for select to anon, authenticated using (true);
create policy albums_member_insert on public.albums for insert to authenticated
with check ((select auth.uid()) is not null and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy comments_public_read on public.comments for select to anon, authenticated using (true);
create policy comments_insert_own on public.comments for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy comments_update_own on public.comments for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy comments_delete_own on public.comments for delete to authenticated
using ((select auth.uid()) = user_id);

create policy bookmarks_select_own on public.setlist_bookmarks for select to authenticated
using ((select auth.uid()) = user_id);
create policy bookmarks_insert_own on public.setlist_bookmarks for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy bookmarks_delete_own on public.setlist_bookmarks for delete to authenticated
using ((select auth.uid()) = user_id);

create policy activity_select_own on public.setlist_activity for select to authenticated
using ((select auth.uid()) = actor_id);
create policy activity_insert_own on public.setlist_activity for insert to authenticated
with check ((select auth.uid()) = actor_id and action in ('created', 'edited', 'deleted'));

create or replace view public.setlist_song_details with (security_invoker = true) as
select
  ss.id,
  ss.setlist_id,
  ss.song_id,
  coalesce(song.title::text, ss.custom_title) as title,
  ss.section,
  ss.position,
  ss.is_cover,
  original.name::text as original_artist_name,
  ss.guest_artist,
  ss.note,
  ss.custom_title,
  album.name::text as album_name,
  album.image_url as album_image_url,
  album.release_date,
  song.external_track_id,
  song.spotify_url
from public.setlist_songs ss
left join public.songs song on song.id = ss.song_id
left join public.artists original on original.id = song.original_artist_id
left join public.albums album on album.id = song.album_id;

create view public.comment_details with (security_invoker = true) as
select
  c.id,
  c.setlist_id,
  c.user_id,
  p.display_name,
  p.avatar_url,
  c.content,
  c.created_at,
  c.updated_at
from public.comments c
join public.profiles p on p.id = c.user_id;

create view public.song_catalog with (security_invoker = true) as
select
  s.id,
  s.artist_id,
  a.name::text as artist_name,
  s.title::text as title,
  album.id as album_id,
  album.name::text as album_name,
  album.image_url as album_image_url,
  album.release_date,
  s.external_track_id,
  s.spotify_url
from public.songs s
join public.artists a on a.id = s.artist_id
left join public.albums album on album.id = s.album_id;

create or replace view public.artist_statistics with (security_invoker = true) as
select
  a.id,
  a.name::text as name,
  a.sort_name,
  count(distinct c.id)::integer as concert_count,
  count(distinct s.id)::integer as setlist_count,
  max(c.performance_date) as latest_performance_date,
  a.image_url,
  a.bio,
  a.activity_type,
  a.country_code,
  a.spotify_url
from public.artists a
left join public.concerts c on c.artist_id = a.id
left join public.setlists s on s.concert_id = c.id
group by a.id;

create or replace view public.venue_statistics with (security_invoker = true) as
select
  v.id,
  v.name::text as name,
  v.province,
  v.district,
  v.address_detail,
  count(distinct c.id)::integer as concert_count,
  count(distinct c.artist_id)::integer as artist_count,
  max(c.performance_date) as latest_performance_date,
  v.road_address,
  v.latitude,
  v.longitude,
  v.naver_place_url
from public.venues v
left join public.concerts c on c.venue_id = v.id
group by v.id;

create or replace function public.delete_setlist(p_setlist_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_concert_id uuid;
  v_snapshot jsonb;
begin
  select s.concert_id,
         jsonb_build_object('setlist', to_jsonb(s), 'concert', to_jsonb(c))
    into v_concert_id, v_snapshot
  from public.setlists s
  join public.concerts c on c.id = s.concert_id
  where s.id = p_setlist_id and s.author_id = v_user_id;

  if v_concert_id is null then
    raise exception '작성자만 이 선곡표를 삭제할 수 있습니다.' using errcode = '42501';
  end if;

  insert into public.setlist_activity (setlist_id, actor_id, action, snapshot)
  values (p_setlist_id, v_user_id, 'deleted', v_snapshot);

  delete from public.concerts where id = v_concert_id and created_by = v_user_id;
  return true;
end;
$$;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.artists, public.venues, public.festivals, public.tours, public.concerts,
  public.setlists, public.songs, public.setlist_songs, public.albums, public.profiles, public.comments
  to anon, authenticated;
grant select on public.setlist_overview, public.setlist_song_details, public.artist_statistics,
  public.venue_statistics, public.festival_statistics, public.song_statistics,
  public.artist_song_statistics, public.comment_details, public.song_catalog
  to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant insert on public.artists, public.venues, public.festivals, public.tours, public.songs, public.albums to authenticated;
grant insert, update, delete on public.concerts, public.setlists, public.setlist_songs to authenticated;
grant select, insert, delete on public.attendances, public.setlist_bookmarks to authenticated;
grant insert, update, delete on public.comments to authenticated;
grant select, insert on public.setlist_revisions, public.setlist_activity to authenticated;
grant usage, select on sequence public.setlist_activity_id_seq to authenticated;

revoke all on function public.delete_setlist(uuid) from public, anon;
grant execute on function public.delete_setlist(uuid) to authenticated;
