import { Link, useParams } from 'react-router-dom';
import { SetlistCard } from '../components/SetlistCard';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { formatCompactDate, formatLocation } from '../lib/format';
import { getArtist, getFestival, getVenue } from '../services/catalog';
import { VenueMap } from '../components/VenueMap';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';
import type { SetlistOverview } from '../types/database';

function DetailState({ loading, error, missing }: { loading: boolean; error: Error | null; missing: boolean }) {
  if (loading) return <section className="section page-section"><LoadingState /></section>;
  if (error) return <section className="section page-section"><ErrorState error={error} /></section>;
  if (missing) return <section className="section page-section"><EmptyState title="정보를 찾을 수 없어요" description="삭제되었거나 아직 공개되지 않은 항목입니다." /></section>;
  return null;
}

function RecordList({ items }: { items: SetlistOverview[] }) {
  return items.length ? <div className="setlist-grid">{items.map((item) => <SetlistCard key={item.id} item={item} compact />)}</div> : <EmptyState title="연결된 공연이 없습니다" description="선곡표가 등록되면 공연 기록이 표시됩니다." />;
}

export function ArtistDetailPage() {
  const { id = '' } = useParams();
  const state = useAsync(() => getArtist(id), [id], `artist:${id}`);
  useDocumentMetadata(state.data ? `${state.data.artist.name} 공연 기록 | 선곡표` : '아티스트 | 선곡표', state.data?.artist.bio || '아티스트의 최근 공연과 자주 연주한 곡을 확인하세요.', state.data?.artist.image_url);
  const stop = <DetailState loading={state.loading} error={state.error} missing={!state.loading && !state.error && !state.data} />;
  if (!state.data) return stop;
  const { artist, setlists, topSongs } = state.data;
  const venueCounts = Object.entries(setlists.reduce<Record<string, number>>((acc, item) => { const key = item.venue_name || '공연장 미정'; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const years = Object.entries(setlists.reduce<Record<string, number>>((acc, item) => { const year = item.performance_date.slice(0, 4); acc[year] = (acc[year] || 0) + 1; return acc; }, {})).sort((a, b) => b[0].localeCompare(a[0]));
  return <section className="section page-section profile-detail">
    <Link className="back-link" to="/artists">← 아티스트</Link>
    <div className="profile-hero artist-hero"><div className="artist-identity">{artist.image_url ? <img src={artist.image_url} alt={`${artist.name} 아티스트 이미지`} loading="lazy" /> : <span className="artist-placeholder" aria-hidden="true">{artist.name.slice(0, 1)}</span>}<div><p className="eyebrow">Artist archive</p><h1>{artist.name}</h1><p>{artist.bio || [artist.country_code === 'KR' ? '대한민국' : artist.country_code, artist.activity_type].filter(Boolean).join(' · ') || '아티스트 소개가 준비 중입니다.'}</p>{artist.spotify_url && <a className="underlined-link" href={artist.spotify_url} target="_blank" rel="noreferrer">Spotify에서 듣기 ↗</a>}</div></div><div className="profile-metrics"><div><strong>{artist.concert_count}</strong><span>공연</span></div><div><strong>{artist.setlist_count}</strong><span>선곡표</span></div></div></div>
    <div className="detail-dashboard">
      <div className="dashboard-main"><div className="section-heading compact-heading"><h2>최근 공연</h2></div><RecordList items={setlists.slice(0, 6)} /></div>
      <aside className="stats-rail">
        <section><h2>많이 연주한 곡</h2>{topSongs.length ? <ol className="ranking-list">{topSongs.map((song) => <li key={song.song_id}><span>{song.title}</span><strong>{song.play_count}회</strong></li>)}</ol> : <p className="muted-copy">집계할 곡이 없습니다.</p>}</section>
        <section><h2>공연장</h2>{venueCounts.length ? <ul className="bar-list">{venueCounts.map(([name, count]) => <li key={name}><span>{name}</span><i style={{ '--bar': `${Math.max(12, count / venueCounts[0][1] * 100)}%` } as React.CSSProperties} /><strong>{count}</strong></li>)}</ul> : <p className="muted-copy">데이터가 없습니다.</p>}</section>
        <section><h2>연도별 기록</h2>{years.length ? <div className="year-cloud">{years.map(([year, count]) => <span key={year}><strong>{year}</strong>{count}회</span>)}</div> : <p className="muted-copy">데이터가 없습니다.</p>}</section>
      </aside>
    </div>
  </section>;
}

export function VenueDetailPage() {
  const { id = '' } = useParams();
  const state = useAsync(() => getVenue(id), [id], `venue:${id}`);
  useDocumentMetadata(state.data ? `${state.data.venue.name} 공연장 | 선곡표` : '공연장 | 선곡표', state.data ? `${state.data.venue.name}의 공연 기록과 지도 정보를 확인하세요.` : '공연장 공연 기록');
  const stop = <DetailState loading={state.loading} error={state.error} missing={!state.loading && !state.error && !state.data} />;
  if (!state.data) return stop;
  const { venue, setlists } = state.data;
  const artists = Object.entries(setlists.reduce<Record<string, number>>((acc, item) => { acc[item.artist_name] = (acc[item.artist_name] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return <section className="section page-section profile-detail">
    <Link className="back-link" to="/venues">← 공연장</Link>
    <div className="profile-hero venue-hero"><div><p className="eyebrow">Venue archive</p><h1>{venue.name}</h1><p>{formatLocation(venue.province, venue.district)}{venue.address_detail && ` · ${venue.address_detail}`}</p></div><div className="profile-metrics"><div><strong>{venue.concert_count}</strong><span>공연</span></div><div><strong>{venue.artist_count}</strong><span>아티스트</span></div></div></div>
    <div className="detail-dashboard"><div className="dashboard-main"><VenueMap name={venue.name} address={venue.road_address || [venue.province, venue.district, venue.address_detail].filter(Boolean).join(' ')} latitude={venue.latitude} longitude={venue.longitude} placeUrl={venue.naver_place_url} /><div className="section-heading compact-heading venue-record-heading"><h2>최근 공연</h2></div><RecordList items={setlists} /></div><aside className="stats-rail"><section><h2>주요 아티스트</h2>{artists.length ? <ol className="ranking-list">{artists.map(([name, count]) => <li key={name}><span>{name}</span><strong>{count}회</strong></li>)}</ol> : <p className="muted-copy">데이터가 없습니다.</p>}</section></aside></div>
  </section>;
}

export function FestivalDetailPage() {
  const { id = '' } = useParams();
  const state = useAsync(() => getFestival(id), [id], `festival:${id}`);
  useDocumentMetadata(state.data ? `${state.data.festival.name} 페스티벌 | 선곡표` : '페스티벌 | 선곡표', state.data ? `${state.data.festival.name}의 날짜별 공연과 아티스트별 선곡표를 확인하세요.` : '페스티벌 공연 기록');
  const stop = <DetailState loading={state.loading} error={state.error} missing={!state.loading && !state.error && !state.data} />;
  if (!state.data) return stop;
  const { festival, setlists } = state.data;
  const dates = setlists.reduce<Record<string, SetlistOverview[]>>((acc, item) => { (acc[item.performance_date] ||= []).push(item); return acc; }, {});
  return <section className="section page-section profile-detail">
    <Link className="back-link" to="/festivals">← 페스티벌</Link>
    <div className="festival-detail-hero"><p className="eyebrow">Festival archive</p><h1>{festival.name}</h1><p>{formatCompactDate(festival.start_date)}{festival.end_date && festival.end_date !== festival.start_date ? ` — ${formatCompactDate(festival.end_date)}` : ''} · {festival.venue_name || '공연장 미정'}</p><div><span>{festival.artist_count}팀</span><span>{festival.concert_count}개 공연</span></div></div>
    {Object.keys(dates).length ? Object.entries(dates).map(([date, items]) => <section className="festival-day" key={date}><div className="day-heading"><h2>{formatCompactDate(date)}</h2><span>{items.length}개 공연</span></div><RecordList items={items} /></section>) : <EmptyState title="등록된 공연이 없습니다" description="이 페스티벌의 아티스트별 선곡표가 등록되면 날짜별로 표시됩니다." />}
  </section>;
}
