import { Link } from 'react-router-dom';
import { SearchBox } from '../components/SearchBox';
import { SetlistCard } from '../components/SetlistCard';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { getArtists, getRecentlyAdded, getStatistics, getVenues } from '../services/catalog';

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
  const discoveryState = useAsync(getStatistics, [], 'home-discovery');

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
          <div className="home-empty"><EmptyState title="첫 기록이 이 아카이브의 시작이 됩니다" description="공연명만 또렷하지 않아도 괜찮아요. 기억나는 곡, 공연장, 날짜부터 함께 남길 수 있어요." action={<Link to="/setlists/new" className="button button-primary">첫 선곡표 등록</Link>} /><div className="home-empty-points"><span>아티스트별로 모여요</span><span>공연장 기록도 함께 쌓여요</span><span>수정 이력으로 신뢰를 남겨요</span></div></div>
        )}
      </section>

      <section className="section discovery-section">
        <div className="section-heading"><div><p className="eyebrow">Explore the archive</p><h2>기록에서 발견하는 공연</h2></div><Link to="/statistics" className="underlined-link">기록 통계 보기</Link></div>
        {discoveryState.loading ? <LoadingState label="추천 기록을 고르는 중" /> : discoveryState.error ? <ErrorState error={discoveryState.error} onRetry={discoveryState.reload} /> : discoveryState.data?.artists.length || discoveryState.data?.venues.length ? <div className="discovery-grid">
          <div className="discovery-panel"><p className="eyebrow">Most recorded artist</p>{discoveryState.data?.artists[0] ? <Link to={`/artists/${discoveryState.data.artists[0].id}`}><strong>{discoveryState.data.artists[0].name}</strong><span>공연 {discoveryState.data.artists[0].concert_count}회 · 선곡표 {discoveryState.data.artists[0].setlist_count}개</span><i aria-hidden="true">↗</i></Link> : <p>기록이 쌓이면 자주 만나는 아티스트를 보여드려요.</p>}</div>
          <div className="discovery-panel"><p className="eyebrow">Most visited venue</p>{discoveryState.data?.venues[0] ? <Link to={`/venues/${discoveryState.data.venues[0].id}`}><strong>{discoveryState.data.venues[0].name}</strong><span>{[discoveryState.data.venues[0].province, discoveryState.data.venues[0].district].filter(Boolean).join(' · ') || '공연장 위치 확인'} · 공연 {discoveryState.data.venues[0].concert_count}회</span><i aria-hidden="true">↗</i></Link> : <p>공연장이 등록되면 공연별 기록을 한곳에서 볼 수 있어요.</p>}</div>
        </div> : <div className="discovery-welcome"><span aria-hidden="true">✦</span><div><strong>공연을 등록하면 아티스트·공연장·곡의 연결이 함께 만들어집니다.</strong><p>한 개의 기록도 다음 관객이 공연을 찾는 데 도움이 됩니다.</p></div><Link to="/setlists/new" className="button button-secondary">기록 시작하기</Link></div>}
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
