import { requireSupabase, supabase } from '../lib/supabase';
import { formatLocation, normalizeText } from '../lib/format';
import type {
  ArtistSongStatistic,
  ArtistStatistic,
  FestivalStatistic,
  Json,
  SearchResult,
  SetlistOverview,
  SetlistSongDetail,
  SongInput,
  SongStatistic,
  VenueStatistic,
} from '../types/database';

function assertNoError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function getSetlists(limit = 200): Promise<SetlistOverview[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('setlist_overview')
    .select('*')
    .order('performance_date', { ascending: false })
    .limit(limit);
  assertNoError(error);
  return data ?? [];
}

export async function getRecentlyAdded(limit = 6): Promise<SetlistOverview[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('setlist_overview')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  assertNoError(error);
  return data ?? [];
}

export async function getSetlist(id: string): Promise<{ overview: SetlistOverview; songs: SetlistSongDetail[] } | null> {
  if (!supabase) return null;
  const [{ data: overview, error: overviewError }, { data: songs, error: songsError }] = await Promise.all([
    supabase.from('setlist_overview').select('*').eq('id', id).maybeSingle(),
    supabase.from('setlist_song_details').select('*').eq('setlist_id', id).order('position'),
  ]);
  assertNoError(overviewError);
  assertNoError(songsError);
  return overview ? { overview, songs: songs ?? [] } : null;
}

export async function getArtists(): Promise<ArtistStatistic[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('artist_statistics').select('*').order('sort_name');
  assertNoError(error);
  return data ?? [];
}

export async function getArtist(id: string): Promise<{
  artist: ArtistStatistic;
  setlists: SetlistOverview[];
  topSongs: ArtistSongStatistic[];
} | null> {
  if (!supabase) return null;
  const [{ data: artist, error: artistError }, { data: setlists, error: setlistError }, { data: topSongs, error: songsError }] = await Promise.all([
    supabase.from('artist_statistics').select('*').eq('id', id).maybeSingle(),
    supabase.from('setlist_overview').select('*').eq('artist_id', id).order('performance_date', { ascending: false }).limit(20),
    supabase.from('artist_song_statistics').select('*').eq('artist_id', id).order('play_count', { ascending: false }).limit(10),
  ]);
  assertNoError(artistError);
  assertNoError(setlistError);
  assertNoError(songsError);
  return artist ? { artist, setlists: setlists ?? [], topSongs: topSongs ?? [] } : null;
}

export async function getVenues(): Promise<VenueStatistic[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('venue_statistics').select('*').order('concert_count', { ascending: false });
  assertNoError(error);
  return data ?? [];
}

export async function getVenue(id: string): Promise<{ venue: VenueStatistic; setlists: SetlistOverview[] } | null> {
  if (!supabase) return null;
  const [{ data: venue, error: venueError }, { data: setlists, error: setlistError }] = await Promise.all([
    supabase.from('venue_statistics').select('*').eq('id', id).maybeSingle(),
    supabase.from('setlist_overview').select('*').eq('venue_id', id).order('performance_date', { ascending: false }).limit(30),
  ]);
  assertNoError(venueError);
  assertNoError(setlistError);
  return venue ? { venue, setlists: setlists ?? [] } : null;
}

export async function getFestivals(): Promise<FestivalStatistic[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('festival_statistics').select('*').order('start_date', { ascending: false });
  assertNoError(error);
  return data ?? [];
}

export async function getFestival(id: string): Promise<{ festival: FestivalStatistic; setlists: SetlistOverview[] } | null> {
  if (!supabase) return null;
  const [{ data: festival, error: festivalError }, { data: setlists, error: setlistError }] = await Promise.all([
    supabase.from('festival_statistics').select('*').eq('id', id).maybeSingle(),
    supabase.from('setlist_overview').select('*').eq('festival_id', id).order('performance_date', { ascending: true }).limit(100),
  ]);
  assertNoError(festivalError);
  assertNoError(setlistError);
  return festival ? { festival, setlists: setlists ?? [] } : null;
}

export async function getStatistics(): Promise<{
  artists: ArtistStatistic[];
  songs: SongStatistic[];
  venues: VenueStatistic[];
  recent: SetlistOverview[];
}> {
  if (!supabase) return { artists: [], songs: [], venues: [], recent: [] };
  const [artists, songs, venues, recent] = await Promise.all([
    supabase.from('artist_statistics').select('*').order('setlist_count', { ascending: false }).limit(10),
    supabase.from('song_statistics').select('*').order('play_count', { ascending: false }).limit(10),
    supabase.from('venue_statistics').select('*').order('concert_count', { ascending: false }).limit(10),
    supabase.from('setlist_overview').select('*').order('created_at', { ascending: false }).limit(10),
  ]);
  [artists.error, songs.error, venues.error, recent.error].forEach(assertNoError);
  return {
    artists: artists.data ?? [], songs: songs.data ?? [], venues: venues.data ?? [], recent: recent.data ?? [],
  };
}

export async function searchCatalog(term: string): Promise<SearchResult[]> {
  if (!supabase || normalizeText(term).length < 2) return [];
  const query = `%${term.trim()}%`;
  const [artists, setlists, venues, festivals] = await Promise.all([
    supabase.from('artist_statistics').select('*').ilike('name', query).limit(4),
    supabase.from('setlist_overview').select('*').or(`artist_name.ilike.${query},concert_title.ilike.${query}`).limit(5),
    supabase.from('venue_statistics').select('*').ilike('name', query).limit(4),
    supabase.from('festival_statistics').select('*').ilike('name', query).limit(4),
  ]);
  [artists.error, setlists.error, venues.error, festivals.error].forEach(assertNoError);
  return [
    ...(artists.data ?? []).map((item) => ({ id: item.id, type: 'artist' as const, title: item.name, meta: `선곡표 ${item.setlist_count}개`, href: `/artists/${item.id}` })),
    ...(setlists.data ?? []).map((item) => ({ id: item.id, type: 'setlist' as const, title: item.artist_name, meta: `${item.performance_date} · ${item.venue_name ?? item.concert_title ?? '공연'}`, href: `/setlist/${item.id}` })),
    ...(venues.data ?? []).map((item) => ({ id: item.id, type: 'venue' as const, title: item.name, meta: formatLocation(item.province, item.district), href: `/venues/${item.id}` })),
    ...(festivals.data ?? []).map((item) => ({ id: item.id, type: 'festival' as const, title: item.name, meta: `${item.artist_count}팀 · ${item.concert_count}개 공연`, href: `/festivals/${item.id}` })),
  ];
}

function songInputsToJson(songs: SongInput[]): Json {
  return songs.map((song) => ({
    title: song.title,
    section: song.section,
    position: song.position,
    is_cover: song.is_cover ?? false,
    original_artist: song.original_artist ?? null,
    guest_artist: song.guest_artist ?? null,
    note: song.note ?? null,
  }));
}

export type SetlistDraft = {
  artistName: string;
  performanceDate: string;
  concertTitle: string | null;
  venueName: string | null;
  province: string | null;
  district: string | null;
  addressDetail: string | null;
  festivalName: string | null;
  tourName: string | null;
  songs: SongInput[];
};

export async function createSetlist(draft: SetlistDraft): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('create_setlist', {
    p_artist_name: draft.artistName,
    p_performance_date: draft.performanceDate,
    p_concert_title: draft.concertTitle,
    p_venue_name: draft.venueName,
    p_province: draft.province,
    p_district: draft.district,
    p_address_detail: draft.addressDetail,
    p_festival_name: draft.festivalName,
    p_tour_name: draft.tourName,
    p_songs: songInputsToJson(draft.songs),
  });
  assertNoError(error);
  if (!data) throw new Error('선곡표 ID를 받지 못했습니다.');
  return data;
}

export async function replaceSetlist(id: string, draft: SetlistDraft): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('replace_setlist', {
    p_setlist_id: id,
    p_artist_name: draft.artistName,
    p_performance_date: draft.performanceDate,
    p_concert_title: draft.concertTitle,
    p_venue_name: draft.venueName,
    p_province: draft.province,
    p_district: draft.district,
    p_address_detail: draft.addressDetail,
    p_festival_name: draft.festivalName,
    p_tour_name: draft.tourName,
    p_songs: songInputsToJson(draft.songs),
  });
  assertNoError(error);
  if (!data) throw new Error('선곡표 ID를 받지 못했습니다.');
  return data;
}

export async function getAttendance(setlistId: string, userId: string): Promise<boolean> {
  const client = requireSupabase();
  const { data, error } = await client.from('attendances').select('setlist_id').eq('setlist_id', setlistId).eq('user_id', userId).maybeSingle();
  assertNoError(error);
  return Boolean(data);
}

export async function setAttendance(setlistId: string, userId: string, attending: boolean): Promise<void> {
  const client = requireSupabase();
  const result = attending
    ? await client.from('attendances').upsert({ setlist_id: setlistId, user_id: userId }, { onConflict: 'user_id,setlist_id' })
    : await client.from('attendances').delete().eq('setlist_id', setlistId).eq('user_id', userId);
  assertNoError(result.error);
}
