import { requireSupabase, supabase } from '../lib/supabase';
import { formatLocation, normalizeText } from '../lib/format';
import type {
  ArtistSongStatistic,
  ArtistStatistic,
  CommentDetail,
  FestivalStatistic,
  Json,
  SearchResult,
  SetlistOverview,
  SetlistCorrection,
  SetlistSongDetail,
  SongInput,
  SongCatalogItem,
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
    song_id: song.song_id ?? null,
    title: song.title,
    section: song.section,
    position: song.position,
    is_cover: song.is_cover ?? false,
    original_artist: song.original_artist ?? null,
    guest_artist: song.guest_artist ?? null,
    note: song.note ?? null,
    youtube_url: song.youtube_url ?? null,
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
  roadAddress: string | null;
  festivalName: string | null;
  tourName: string | null;
  ticketUrl: string | null;
  songs: SongInput[];
  changeReason?: string | null;
};

async function recordActivity(setlistId: string, action: 'created' | 'edited', reason?: string | null): Promise<void> {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return;
  const { error } = await client.from('setlist_activity').insert({
    setlist_id: setlistId,
    actor_id: user.id,
    action,
    reason: reason?.trim() || null,
    snapshot: {},
  });
  if (error) console.warn('변경 이력을 기록하지 못했습니다.', error.message);
}

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
    p_road_address: draft.roadAddress,
    p_festival_name: draft.festivalName,
    p_tour_name: draft.tourName,
    p_songs: songInputsToJson(draft.songs),
    p_ticket_url: draft.ticketUrl,
  });
  assertNoError(error);
  if (!data) throw new Error('선곡표 ID를 받지 못했습니다.');
  await recordActivity(data, 'created');
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
    p_road_address: draft.roadAddress,
    p_festival_name: draft.festivalName,
    p_tour_name: draft.tourName,
    p_songs: songInputsToJson(draft.songs),
    p_ticket_url: draft.ticketUrl,
  });
  assertNoError(error);
  if (!data) throw new Error('선곡표 ID를 받지 못했습니다.');
  await recordActivity(data, 'edited', draft.changeReason);
  return data;
}

export async function deleteSetlist(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('delete_setlist', { p_setlist_id: id });
  assertNoError(error);
}

export async function searchSongs(term: string, artistName?: string): Promise<SongCatalogItem[]> {
  if (!supabase || term.trim().length < 2) return [];
  let query = supabase.from('song_catalog').select('*').ilike('title', `%${term.trim()}%`).limit(8);
  if (artistName?.trim()) query = query.ilike('artist_name', artistName.trim());
  const { data, error } = await query;
  assertNoError(error);
  return data ?? [];
}

export async function getComments(setlistId: string, page = 0, pageSize = 10): Promise<{ items: CommentDetail[]; hasMore: boolean }> {
  if (!supabase) return { items: [], hasMore: false };
  const from = page * pageSize;
  const { data, error } = await supabase.from('comment_details').select('*').eq('setlist_id', setlistId).order('created_at').order('id').range(from, from + pageSize);
  assertNoError(error);
  const rows = data ?? [];
  return { items: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export async function createComment(setlistId: string, userId: string, content: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('comments').insert({ setlist_id: setlistId, user_id: userId, content: content.trim() });
  assertNoError(error);
}

export async function updateComment(id: string, userId: string, content: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('comments').update({ content: content.trim() }).eq('id', id).eq('user_id', userId);
  assertNoError(error);
}

export async function deleteComment(id: string, userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('comments').delete().eq('id', id).eq('user_id', userId);
  assertNoError(error);
}

export async function getBookmark(setlistId: string, userId: string): Promise<boolean> {
  const client = requireSupabase();
  const { data, error } = await client.from('setlist_bookmarks').select('setlist_id').eq('setlist_id', setlistId).eq('user_id', userId).maybeSingle();
  assertNoError(error);
  return Boolean(data);
}

export async function setBookmark(setlistId: string, userId: string, bookmarked: boolean): Promise<void> {
  const client = requireSupabase();
  const result = bookmarked
    ? await client.from('setlist_bookmarks').upsert({ setlist_id: setlistId, user_id: userId }, { onConflict: 'user_id,setlist_id' })
    : await client.from('setlist_bookmarks').delete().eq('setlist_id', setlistId).eq('user_id', userId);
  assertNoError(result.error);
}

export async function getProfile(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  assertNoError(error);
  return data;
}

export async function updateProfile(userId: string, displayName: string): Promise<void> {
  const client = requireSupabase();
  const clean = displayName.trim();
  if (clean.length < 2 || clean.length > 20) throw new Error('닉네임은 2~20자로 입력해주세요.');
  const { error } = await client.from('profiles').update({ display_name: clean }).eq('id', userId);
  assertNoError(error);
}

export async function getMyPageData(userId: string) {
  const client = requireSupabase();
  const [profile, authored, attendanceIds, bookmarkIds, comments] = await Promise.all([
    client.from('profiles').select('*').eq('id', userId).maybeSingle(),
    client.from('setlist_overview').select('*').eq('author_id', userId).order('created_at', { ascending: false }),
    client.from('attendances').select('setlist_id').eq('user_id', userId).order('created_at', { ascending: false }),
    client.from('setlist_bookmarks').select('setlist_id').eq('user_id', userId).order('created_at', { ascending: false }),
    client.from('comment_details').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
  ]);
  [profile.error, authored.error, attendanceIds.error, bookmarkIds.error, comments.error].forEach(assertNoError);
  const attendedSetlistIds = (attendanceIds.data ?? []).map((item) => item.setlist_id);
  const bookmarkedSetlistIds = (bookmarkIds.data ?? []).map((item) => item.setlist_id);
  const [attended, bookmarked] = await Promise.all([
    attendedSetlistIds.length ? client.from('setlist_overview').select('*').in('id', attendedSetlistIds).order('performance_date', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    bookmarkedSetlistIds.length ? client.from('setlist_overview').select('*').in('id', bookmarkedSetlistIds).order('performance_date', { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);
  assertNoError(attended.error);
  assertNoError(bookmarked.error);
  return { profile: profile.data, authored: authored.data ?? [], attended: attended.data ?? [], bookmarked: bookmarked.data ?? [], comments: comments.data ?? [] };
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

export type CorrectionInput = Pick<SetlistCorrection, 'issue_type' | 'proposed_value' | 'reason'> & { evidence_url?: string | null };

export async function getSetlistCorrections(setlistId: string, userId: string): Promise<SetlistCorrection[]> {
  const client = requireSupabase();
  const [{ data: corrections, error: correctionsError }, { data: votes, error: votesError }] = await Promise.all([
    client.from('setlist_corrections').select('*').eq('setlist_id', setlistId).order('created_at', { ascending: false }),
    client.from('setlist_correction_votes').select('correction_id').eq('user_id', userId),
  ]);
  assertNoError(correctionsError);
  assertNoError(votesError);
  const voted = new Set(votes?.map((vote) => vote.correction_id) ?? []);
  return (corrections ?? []).map((correction) => ({ ...correction, voted_by_me: voted.has(correction.id) }));
}

export async function createSetlistCorrection(setlistId: string, userId: string, input: CorrectionInput): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('setlist_corrections').insert({
    setlist_id: setlistId,
    reporter_id: userId,
    issue_type: input.issue_type,
    proposed_value: input.proposed_value.trim(),
    reason: input.reason.trim(),
    evidence_url: input.evidence_url?.trim() || null,
  });
  assertNoError(error);
}

export async function setCorrectionVote(correctionId: string, userId: string, voted: boolean): Promise<void> {
  const client = requireSupabase();
  const result = voted
    ? await client.from('setlist_correction_votes').insert({ correction_id: correctionId, user_id: userId })
    : await client.from('setlist_correction_votes').delete().eq('correction_id', correctionId).eq('user_id', userId);
  assertNoError(result.error);
}
