import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SetlistCard } from '../components/SetlistCard';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { normalizeText } from '../lib/format';
import { getSetlists } from '../services/catalog';

const PAGE_SIZE = 12;

export function SetlistsPage() {
  const state = useAsync(() => getSetlists(), []);
  const [artist, setArtist] = useState('');
  const [venue, setVenue] = useState('');
  const [region, setRegion] = useState('');
  const [festival, setFestival] = useState('');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState<'performance' | 'created'>('performance');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const values = [...(state.data ?? [])].filter((item) =>
      (!artist || normalizeText(item.artist_name).includes(normalizeText(artist))) &&
      (!venue || normalizeText(item.venue_name ?? '').includes(normalizeText(venue))) &&
      (!region || normalizeText(item.region ?? '').includes(normalizeText(region))) &&
      (!festival || normalizeText(item.festival_name ?? '').includes(normalizeText(festival))) &&
      (!date || item.performance_date === date)
    );
    values.sort((a, b) => sort === 'created'
      ? b.created_at.localeCompare(a.created_at)
      : b.performance_date.localeCompare(a.performance_date));
    return values;
  }, [state.data, artist, venue, region, festival, date, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const update = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(1); };
  const reset = () => { setArtist(''); setVenue(''); setRegion(''); setFestival(''); setDate(''); setPage(1); };

  return (
    <section className="section page-section">
      <PageHeader eyebrow="Setlist archive" title="선곡표" description="최근 공연의 연주 순서를 조건별로 찾아보세요." action={<Link className="button button-primary" to="/setlists/new">+ 선곡표 등록</Link>} />
      <div className="filter-panel">
        <label><span>아티스트</span><input value={artist} onChange={(event) => update(setArtist)(event.target.value)} placeholder="예: DAY6" /></label>
        <label><span>날짜</span><input type="date" value={date} onChange={(event) => update(setDate)(event.target.value)} /></label>
        <label><span>공연장</span><input value={venue} onChange={(event) => update(setVenue)(event.target.value)} placeholder="예: KSPO DOME" /></label>
        <label><span>지역</span><input value={region} onChange={(event) => update(setRegion)(event.target.value)} placeholder="예: 서울" /></label>
        <label><span>페스티벌</span><input value={festival} onChange={(event) => update(setFestival)(event.target.value)} placeholder="페스티벌명" /></label>
        <label><span>정렬</span><select value={sort} onChange={(event) => setSort(event.target.value as 'performance' | 'created')}><option value="performance">최신 공연순</option><option value="created">최근 등록순</option></select></label>
      </div>
      <div className="result-toolbar"><p><strong>{filtered.length}</strong>개의 기록</p><button className="text-button" onClick={reset}>필터 초기화</button></div>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState error={state.error} onRetry={state.reload} /> : visible.length ? (
        <>
          <div className="setlist-grid">{visible.map((item) => <SetlistCard key={item.id} item={item} />)}</div>
          {pageCount > 1 && <nav className="pagination" aria-label="선곡표 페이지"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>이전</button><span>{page} / {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>다음</button></nav>}
        </>
      ) : <EmptyState title="조건에 맞는 선곡표가 없어요" description="필터를 줄이거나 새로운 공연 기록을 등록해보세요." action={<button className="button button-secondary" onClick={reset}>필터 초기화</button>} />}
    </section>
  );
}
