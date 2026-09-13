import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { formatCompactDate, formatLocation, normalizeText } from '../lib/format';
import { getArtists, getFestivals, getVenues } from '../services/catalog';

function DirectorySearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="directory-search"><span aria-hidden="true">⌕</span><input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} /></label>;
}

export function ArtistsPage() {
  const state = useAsync(getArtists, []);
  const [query, setQuery] = useState('');
  const items = useMemo(() => (state.data ?? []).filter((item) => normalizeText(item.name).includes(normalizeText(query))), [state.data, query]);
  return (
    <section className="section page-section">
      <PageHeader eyebrow="Artist index" title="아티스트" description="등록된 공연과 자주 연주한 곡을 아티스트별로 확인하세요." action={<DirectorySearch value={query} onChange={setQuery} placeholder="아티스트 검색" />} />
      {state.loading ? <LoadingState /> : state.error ? <ErrorState error={state.error} onRetry={state.reload} /> : items.length ? <div className="directory-grid">{items.map((item, index) => (
        <Link className="directory-card artist-card" to={`/artists/${item.id}`} key={item.id}><span className="directory-index">{String(index + 1).padStart(2, '0')}</span><div><h2>{item.name}</h2><p>공연 {item.concert_count}회 · 선곡표 {item.setlist_count}개</p></div><span className="directory-arrow">↗</span></Link>
      ))}</div> : <EmptyState title="등록된 아티스트가 없습니다" description="선곡표가 등록되면 아티스트 목록이 자동으로 만들어집니다." />}
    </section>
  );
}

export function VenuesPage() {
  const state = useAsync(getVenues, []);
  const [query, setQuery] = useState('');
  const items = useMemo(() => (state.data ?? []).filter((item) => normalizeText(`${item.name} ${item.province ?? ''} ${item.district ?? ''}`).includes(normalizeText(query))), [state.data, query]);
  return (
    <section className="section page-section">
      <PageHeader eyebrow="Venue index" title="공연장" description="한국의 공연장을 지역과 공연 기록으로 탐색하세요." action={<DirectorySearch value={query} onChange={setQuery} placeholder="공연장 또는 지역 검색" />} />
      {state.loading ? <LoadingState /> : state.error ? <ErrorState error={state.error} onRetry={state.reload} /> : items.length ? <div className="directory-grid">{items.map((item) => (
        <Link className="directory-card" to={`/venues/${item.id}`} key={item.id}><span className="map-pin" aria-hidden="true">●</span><div><h2>{item.name}</h2><p>{formatLocation(item.province, item.district)} · 공연 {item.concert_count}회</p></div><span className="directory-arrow">↗</span></Link>
      ))}</div> : <EmptyState title="등록된 공연장이 없습니다" description="공연 기록에 장소를 추가하면 공연장 아카이브가 채워집니다." />}
    </section>
  );
}

export function FestivalsPage() {
  const state = useAsync(getFestivals, []);
  return (
    <section className="section page-section">
      <PageHeader eyebrow="Festival archive" title="페스티벌" description="여러 날짜와 아티스트가 함께하는 페스티벌 기록을 모았습니다." />
      {state.loading ? <LoadingState /> : state.error ? <ErrorState error={state.error} onRetry={state.reload} /> : state.data?.length ? <div className="festival-grid">{state.data.map((item) => (
        <Link className="festival-card" to={`/festivals/${item.id}`} key={item.id}>
          <div className="festival-date"><span>{formatCompactDate(item.start_date).slice(0, 7)}</span>{item.end_date && item.end_date !== item.start_date && <small>— {formatCompactDate(item.end_date).slice(5)}</small>}</div>
          <h2>{item.name}</h2><p>{item.venue_name || '공연장 미정'}</p><div><span>{item.artist_count}팀</span><span>{item.concert_count}개 공연</span></div>
        </Link>
      ))}</div> : <EmptyState title="등록된 페스티벌이 없습니다" description="페스티벌 선곡표가 등록되면 날짜별 공연이 하나의 아카이브로 연결됩니다." />}
    </section>
  );
}
