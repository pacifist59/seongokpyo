import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './components/ThemeContext';
import { ToastProvider } from './components/ToastContext';
import { InitialDataProvider, type InitialData } from './components/InitialDataContext';
import { supabase } from './lib/supabase';
import { getArtist, getArtists, getFestival, getFestivals, getRecentlyAdded, getSetlist, getSetlists, getStatistics, getVenue, getVenues } from './services/catalog';
import { canonicalUrl, renderMetadata, SITE_ORIGIN, staticMetadata, type Metadata } from './lib/seo';
import { formatDate } from './lib/format';

export { canonicalUrl, renderMetadata, SITE_ORIGIN };
type Page = { path: string; data: InitialData; metadata: Metadata; lastmod?: string };

export function renderPage(page: Page): string {
  return renderToString(<StaticRouter location={page.path}><InitialDataProvider data={page.data}><ThemeProvider><ToastProvider><App /></ToastProvider></ThemeProvider></InitialDataProvider></StaticRouter>);
}

async function allIds(table: 'setlist_overview' | 'artist_statistics' | 'venue_statistics' | 'festival_statistics'): Promise<string[]> {
  if (!supabase) throw new Error('Public Supabase configuration is required to build the archive.');
  const result: string[] = [];
  // Range pagination is required even when a project lowers the API max_rows setting.
  for (;;) {
    const { data, error } = await supabase.from(table).select('id').order('id').range(result.length, result.length + 499).abortSignal(AbortSignal.timeout(20000));
    if (error) throw new Error(`Could not enumerate ${table}: ${error.message}`);
    if (!data?.length) return result;
    result.push(...data.map((row) => row.id));
  }
}

export async function* collectPages(): AsyncGenerator<Page> {
  if (!supabase) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set for prerendering.');
  const [artists, venues, festivals, setlists, recent, statistics] = await Promise.all([
    getArtists(), getVenues(), getFestivals(), getSetlists(), getRecentlyAdded(6), getStatistics(),
  ]);
  const staticData: Record<string, InitialData> = {
    '/': { 'home-recent': recent, 'home-discovery': statistics, 'home-summary': { artists: artists.length, venues: venues.length, concerts: artists.reduce((sum, artist) => sum + artist.concert_count, 0) } },
    '/setlists': { setlists }, '/artists': { artists }, '/venues': { venues }, '/festivals': { festivals }, '/statistics': { statistics },
  };
  for (const [path, metadata] of Object.entries(staticMetadata)) yield { path, metadata, data: staticData[path] || {} };

  const [setlistIds, artistIds, venueIds, festivalIds] = await Promise.all([
    allIds('setlist_overview'), allIds('artist_statistics'), allIds('venue_statistics'), allIds('festival_statistics'),
  ]);
  for (const id of setlistIds) {
    const data = await getSetlist(id);
    if (!data) continue; // A record can be deleted between enumeration and fetching.
    const item = data.overview;
    yield { path: `/setlist/${id}`, data: { [`setlist:${id}`]: data }, lastmod: item.updated_at, metadata: {
      title: `${item.artist_name} - ${item.performance_date} ${item.venue_name || ''} 선곡표`,
      description: `${item.artist_name}의 ${formatDate(item.performance_date)} 공연 선곡표를 확인하세요.`,
    } };
  }
  for (const id of artistIds) {
    const data = await getArtist(id);
    if (data) yield { path: `/artists/${id}`, data: { [`artist:${id}`]: data }, metadata: {
      title: `${data.artist.name} 공연 기록 | 선곡표`, description: data.artist.bio || '아티스트의 최근 공연과 자주 연주한 곡을 확인하세요.', image: data.artist.image_url,
    } };
  }
  for (const id of venueIds) {
    const data = await getVenue(id);
    if (data) yield { path: `/venues/${id}`, data: { [`venue:${id}`]: data }, metadata: {
      title: `${data.venue.name} 공연장 | 선곡표`, description: `${data.venue.name}의 공연 기록과 지도 정보를 확인하세요.`,
    } };
  }
  for (const id of festivalIds) {
    const data = await getFestival(id);
    if (data) yield { path: `/festivals/${id}`, data: { [`festival:${id}`]: data }, metadata: {
      title: `${data.festival.name} 페스티벌 | 선곡표`, description: `${data.festival.name}의 날짜별 공연과 아티스트별 선곡표를 확인하세요.`,
    } };
  }
}
