import { Link, useParams } from 'react-router-dom';
import { SetlistCard } from '../components/SetlistCard';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';
import { getSetlists } from '../services/catalog';

export function TourDetailPage() {
  const { id = '' } = useParams();
  const state = useAsync(async () => (await getSetlists()).filter((item) => item.tour_id === id), [id], `tour:${id}`);
  const name = state.data?.[0]?.tour_name;
  useDocumentMetadata(name ? `${name} 투어 공연 기록 | 선곡표` : '투어 | 선곡표', name ? `${name} 투어의 공연별 선곡표를 확인하세요.` : '투어별 공연 기록');
  if (state.loading) return <section className="section page-section"><LoadingState label="투어 기록을 불러오는 중" /></section>;
  if (state.error) return <section className="section page-section"><ErrorState error={state.error} onRetry={state.reload} /></section>;
  if (!state.data?.length) return <section className="section page-section"><EmptyState title="투어 기록을 찾을 수 없어요" description="연결된 공연이 없거나 아직 공개되지 않은 투어입니다." action={<Link className="button button-secondary" to="/setlists">선곡표 목록</Link>} /></section>;
  return <section className="section page-section profile-detail">
    <Link className="back-link" to="/setlists">← 선곡표</Link>
    <div className="festival-detail-hero"><p className="eyebrow">Tour archive</p><h1>{name}</h1><p>{state.data[0].artist_name} · 공연별 선곡표와 예정 공연을 모아봅니다.</p><div><span>{state.data.length}개 공연</span></div></div>
    <section className="festival-day"><div className="day-heading"><h2>공연 기록</h2><span>{state.data.length}개</span></div><div className="setlist-grid">{state.data.map((item) => <SetlistCard key={item.id} item={item} compact />)}</div></section>
  </section>;
}
