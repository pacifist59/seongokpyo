import { Link } from 'react-router-dom';
import { SearchBox } from '../components/SearchBox';
import { SetlistCard } from '../components/SetlistCard';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { getArtists, getRecentlyAdded, getVenues } from '../services/catalog';

export function HomePage() {
  const recentState = useAsync(() => getRecentlyAdded(6), [], 'home-recent');
  const summaryState = useAsync(async () => {
    const [artists, venues] = await Promise.all([getArtists(), getVenues()]);
    return {
      artists: artists.length,
      venues: venues.length,
      concerts: artists.reduce((sum, artist) => sum + artist.concert_count, 0),
    };
  }, [], 'home-summary');

  return (
    <>
      <section className="home-hero">
        <div className="hero-grid-lines" aria-hidden="true" />
        <div className="hero-content">
          <p className="hero-kicker"><span /> Korea live archive</p>
          <h1>어젯밤의 공연을<br /><em>한 곡씩</em> 기억합니다.</h1>
          <p className="hero-copy">아티스트와 공연장, 페스티벌을 찾아보고 직접 경험한 선곡표를 기록하세요.</p>
          <SearchBox />
          <div className="hero-links">
            <Link to="/setlists">최근 선곡표 보기 <span>→</span></Link>
            <Link to="/setlists/new">공연 기록하기 <span>↗</span></Link>
          </div>
        </div>
        <div className="hero-counter" aria-label="아카이브 현황">
          <p>ARCHIVE<br />NO. 01</p>
          <div>
            <span>{summaryState.data?.concerts.toLocaleString('ko-KR') ?? '0'}</span><small>공연</small>
            <span>{summaryState.data?.artists.toLocaleString('ko-KR') ?? '0'}</span><small>아티스트</small>
            <span>{summaryState.data?.venues.toLocaleString('ko-KR') ?? '0'}</span><small>공연장</small>
          </div>
        </div>
      </section>

      <section className="section recent-section">
        <div className="section-heading">
          <div><p className="eyebrow">Latest records</p><h2>최근 등록된 선곡표</h2></div>
          <Link to="/setlists" className="underlined-link">모두 보기</Link>
        </div>
        {recentState.loading ? <LoadingState /> : recentState.error ? (
          <ErrorState error={recentState.error} onRetry={recentState.reload} />
        ) : recentState.data?.length ? (
          <div className="setlist-grid">{recentState.data.map((item) => <SetlistCard key={item.id} item={item} />)}</div>
        ) : (
          <EmptyState title="첫 선곡표를 기다리고 있어요" description="아직 공개된 공연 기록이 없습니다. 기억 속 첫 공연을 남겨보세요." action={<Link to="/setlists/new" className="button button-primary">첫 선곡표 등록</Link>} />
        )}
      </section>

      <section className="home-guide">
        <p className="eyebrow">How it works</p>
        <div className="guide-grid">
          <article><span>01</span><h3>찾기</h3><p>한글로 아티스트, 공연장, 페스티벌을 한 번에 검색해요.</p></article>
          <article><span>02</span><h3>기록하기</h3><p>곡을 한 줄씩 빠르게 입력하고 앙코르 순서까지 남겨요.</p></article>
          <article><span>03</span><h3>기억하기</h3><p>‘나도 갔어요’로 내가 본 공연을 개인 아카이브로 모아요.</p></article>
        </div>
      </section>
    </>
  );
}
