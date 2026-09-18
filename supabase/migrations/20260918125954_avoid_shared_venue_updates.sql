-- Venues and songs are shared catalogue records. A setlist author may attach an
-- existing record or create a new, distinct one, but must not mutate a shared
-- record merely by saving their own setlist. This keeps the RPC SECURITY
-- INVOKER and avoids granting broad UPDATE access to authenticated users.

create or replace function public.create_setlist(
  p_artist_name text, p_performance_date date, p_concert_title text,
  p_venue_name text, p_province text, p_district text, p_address_detail text,
  p_festival_name text, p_tour_name text, p_songs jsonb, p_road_address text,
  p_ticket_url text
) returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_user_id uuid := (select auth.uid()); v_artist_id uuid; v_venue_id uuid;
  v_festival_id uuid; v_tour_id uuid; v_concert_id uuid; v_setlist_id uuid;
  v_original_artist_id uuid; v_song_id uuid; v_item record;
begin
  if v_user_id is null or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then raise exception '로그인이 필요합니다.' using errcode = '42501'; end if;
  if nullif(trim(p_artist_name), '') is null then raise exception '아티스트명은 필수입니다.'; end if;
  if jsonb_typeof(p_songs) <> 'array' then raise exception '곡 목록 형식이 올바르지 않습니다.'; end if;
  if jsonb_array_length(p_songs) = 0 and p_performance_date <= current_date then raise exception '지난 공연은 곡을 한 개 이상 입력해주세요.'; end if;
  if nullif(trim(coalesce(p_ticket_url, '')), '') is not null and trim(p_ticket_url) !~* '^https?://' then raise exception '예매 링크는 http 또는 https 주소여야 합니다.'; end if;

  select id into v_artist_id from public.artists where name = trim(p_artist_name) limit 1;
  if v_artist_id is null then insert into public.artists (name, sort_name) values (trim(p_artist_name), lower(trim(p_artist_name))) returning id into v_artist_id; end if;
  if nullif(trim(coalesce(p_venue_name, '')), '') is not null then
    select id into v_venue_id from public.venues where name = trim(p_venue_name) and (road_address is not distinct from nullif(trim(p_road_address), '') or (province is not distinct from nullif(trim(p_province), '') and district is not distinct from nullif(trim(p_district), ''))) limit 1;
    if v_venue_id is null then
      insert into public.venues (name, road_address, province, district, address_detail) values (trim(p_venue_name), nullif(trim(p_road_address), ''), nullif(trim(p_province), ''), nullif(trim(p_district), ''), nullif(trim(p_address_detail), '')) returning id into v_venue_id;
    end if;
  end if;
  if nullif(trim(coalesce(p_festival_name, '')), '') is not null then
    select id into v_festival_id from public.festivals where name = trim(p_festival_name) and edition_year = extract(year from p_performance_date)::smallint limit 1;
    if v_festival_id is null then insert into public.festivals (name, edition_year, venue_id) values (trim(p_festival_name), extract(year from p_performance_date)::smallint, v_venue_id) returning id into v_festival_id; end if;
  end if;
  if nullif(trim(coalesce(p_tour_name, '')), '') is not null then
    select id into v_tour_id from public.tours where artist_id = v_artist_id and name = trim(p_tour_name) limit 1;
    if v_tour_id is null then insert into public.tours (artist_id, name) values (v_artist_id, trim(p_tour_name)) returning id into v_tour_id; end if;
  end if;
  insert into public.concerts (artist_id, performance_date, title, venue_id, festival_id, tour_id, ticket_url, created_by) values (v_artist_id, p_performance_date, nullif(trim(p_concert_title), ''), v_venue_id, v_festival_id, v_tour_id, nullif(trim(p_ticket_url), ''), v_user_id) returning id into v_concert_id;
  insert into public.setlists (concert_id, author_id) values (v_concert_id, v_user_id) returning id into v_setlist_id;
  for v_item in select value, ordinality from jsonb_array_elements(p_songs) with ordinality loop
    if nullif(trim(v_item.value ->> 'title'), '') is null then continue; end if;
    v_original_artist_id := null;
    if nullif(trim(v_item.value ->> 'original_artist'), '') is not null then select id into v_original_artist_id from public.artists where name = trim(v_item.value ->> 'original_artist') limit 1; if v_original_artist_id is null then insert into public.artists (name, sort_name) values (trim(v_item.value ->> 'original_artist'), lower(trim(v_item.value ->> 'original_artist'))) returning id into v_original_artist_id; end if; end if;
    select id into v_song_id from public.songs where artist_id = v_artist_id and normalized_title = lower(trim(v_item.value ->> 'title')) and original_artist_id is not distinct from v_original_artist_id limit 1;
    if v_song_id is null then insert into public.songs (artist_id, title, original_artist_id, youtube_url) values (v_artist_id, trim(v_item.value ->> 'title'), v_original_artist_id, nullif(trim(v_item.value ->> 'youtube_url'), '')) returning id into v_song_id; end if;
    insert into public.setlist_songs (setlist_id, song_id, position, section, is_cover, guest_artist, note) values (v_setlist_id, v_song_id, v_item.ordinality::integer, case when v_item.value ->> 'section' = 'encore' then 'encore' else 'main' end, coalesce((v_item.value ->> 'is_cover')::boolean, false), nullif(trim(v_item.value ->> 'guest_artist'), ''), nullif(trim(v_item.value ->> 'note'), ''));
  end loop;
  return v_setlist_id;
end; $$;

create or replace function public.replace_setlist(
  p_setlist_id uuid, p_artist_name text, p_performance_date date, p_concert_title text,
  p_venue_name text, p_province text, p_district text, p_address_detail text,
  p_festival_name text, p_tour_name text, p_songs jsonb, p_road_address text,
  p_ticket_url text
) returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_user_id uuid := (select auth.uid()); v_concert_id uuid; v_artist_id uuid; v_venue_id uuid;
  v_festival_id uuid; v_tour_id uuid; v_original_artist_id uuid; v_song_id uuid; v_item record;
begin
  select concert_id into v_concert_id from public.setlists where id = p_setlist_id and author_id = v_user_id;
  if v_concert_id is null then raise exception '작성자만 수정할 수 있습니다.' using errcode = '42501'; end if;
  if jsonb_typeof(p_songs) <> 'array' then raise exception '곡 목록 형식이 올바르지 않습니다.'; end if;
  if jsonb_array_length(p_songs) = 0 and p_performance_date <= current_date then raise exception '지난 공연은 곡을 한 개 이상 입력해주세요.'; end if;
  if nullif(trim(coalesce(p_ticket_url, '')), '') is not null and trim(p_ticket_url) !~* '^https?://' then raise exception '예매 링크는 http 또는 https 주소여야 합니다.'; end if;
  insert into public.setlist_revisions (setlist_id, changed_by, snapshot) select p_setlist_id, v_user_id, jsonb_build_object('setlist', to_jsonb(s), 'concert', to_jsonb(c), 'songs', coalesce((select jsonb_agg(to_jsonb(ss) order by ss.position) from public.setlist_songs ss where ss.setlist_id = s.id), '[]'::jsonb)) from public.setlists s join public.concerts c on c.id = s.concert_id where s.id = p_setlist_id;
  select id into v_artist_id from public.artists where name = trim(p_artist_name) limit 1;
  if v_artist_id is null then insert into public.artists (name, sort_name) values (trim(p_artist_name), lower(trim(p_artist_name))) returning id into v_artist_id; end if;
  if nullif(trim(coalesce(p_venue_name, '')), '') is not null then
    select id into v_venue_id from public.venues where name = trim(p_venue_name) and (road_address is not distinct from nullif(trim(p_road_address), '') or (province is not distinct from nullif(trim(p_province), '') and district is not distinct from nullif(trim(p_district), ''))) limit 1;
    if v_venue_id is null then insert into public.venues (name, road_address, province, district, address_detail) values (trim(p_venue_name), nullif(trim(p_road_address), ''), nullif(trim(p_province), ''), nullif(trim(p_district), ''), nullif(trim(p_address_detail), '')) returning id into v_venue_id; end if;
  end if;
  if nullif(trim(coalesce(p_festival_name, '')), '') is not null then select id into v_festival_id from public.festivals where name = trim(p_festival_name) and edition_year = extract(year from p_performance_date)::smallint limit 1; if v_festival_id is null then insert into public.festivals (name, edition_year, venue_id) values (trim(p_festival_name), extract(year from p_performance_date)::smallint, v_venue_id) returning id into v_festival_id; end if; end if;
  if nullif(trim(coalesce(p_tour_name, '')), '') is not null then select id into v_tour_id from public.tours where artist_id = v_artist_id and name = trim(p_tour_name) limit 1; if v_tour_id is null then insert into public.tours (artist_id, name) values (v_artist_id, trim(p_tour_name)) returning id into v_tour_id; end if; end if;
  update public.concerts set artist_id = v_artist_id, performance_date = p_performance_date, title = nullif(trim(p_concert_title), ''), venue_id = v_venue_id, festival_id = v_festival_id, tour_id = v_tour_id, ticket_url = nullif(trim(p_ticket_url), '') where id = v_concert_id;
  update public.setlists set updated_at = now() where id = p_setlist_id;
  delete from public.setlist_songs where setlist_id = p_setlist_id;
  for v_item in select value, ordinality from jsonb_array_elements(p_songs) with ordinality loop
    if nullif(trim(v_item.value ->> 'title'), '') is null then continue; end if;
    v_original_artist_id := null;
    if nullif(trim(v_item.value ->> 'original_artist'), '') is not null then select id into v_original_artist_id from public.artists where name = trim(v_item.value ->> 'original_artist') limit 1; if v_original_artist_id is null then insert into public.artists (name, sort_name) values (trim(v_item.value ->> 'original_artist'), lower(trim(v_item.value ->> 'original_artist'))) returning id into v_original_artist_id; end if; end if;
    select id into v_song_id from public.songs where artist_id = v_artist_id and normalized_title = lower(trim(v_item.value ->> 'title')) and original_artist_id is not distinct from v_original_artist_id limit 1;
    if v_song_id is null then insert into public.songs (artist_id, title, original_artist_id, youtube_url) values (v_artist_id, trim(v_item.value ->> 'title'), v_original_artist_id, nullif(trim(v_item.value ->> 'youtube_url'), '')) returning id into v_song_id; end if;
    insert into public.setlist_songs (setlist_id, song_id, position, section, is_cover, guest_artist, note) values (p_setlist_id, v_song_id, v_item.ordinality::integer, case when v_item.value ->> 'section' = 'encore' then 'encore' else 'main' end, coalesce((v_item.value ->> 'is_cover')::boolean, false), nullif(trim(v_item.value ->> 'guest_artist'), ''), nullif(trim(v_item.value ->> 'note'), ''));
  end loop;
  return p_setlist_id;
end; $$;

revoke all on function public.create_setlist(text, date, text, text, text, text, text, text, text, jsonb, text, text) from public, anon;
revoke all on function public.replace_setlist(uuid, text, date, text, text, text, text, text, text, text, jsonb, text, text) from public, anon;
grant execute on function public.create_setlist(text, date, text, text, text, text, text, text, text, jsonb, text, text) to authenticated;
grant execute on function public.replace_setlist(uuid, text, date, text, text, text, text, text, text, text, jsonb, text, text) to authenticated;
