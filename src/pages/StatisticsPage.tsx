import { PageHeader } from '../components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { formatCompactDate } from '../lib/format';
import { getStatistics } from '../services/catalog';

export function StatisticsPage() {
  const state = useAsync(getStatistics, []);
  if (state.loading) return <section className="section page-section"><LoadingState label="통계를 집계하는 중" /></section>;
  if (state.error) return <section className="section page-section"><ErrorState error={state.error} onRetry={state.reload} /></section>;
  const data = state.data;
  const hasData = Boolean(data && (data.artists.length || data.songs.length || data.venues.length || data.recent.length));
  return <section className="section page-section">
    <PageHeader eyebrow="Live archive data" title="통계" description="화면에 표시되는 값은 모두 현재 데이터베이스에서 집계됩니다." />
    {!hasData ? <EmptyState title="집계할 기록이 없습니다" description="선곡표가 등록되면 아티스트, 곡, 공연장 통계가 자동으로 채워집니다." /> : <div className="statistics-grid">
      <RankingPanel title="가장 많이 등록된 아티스트" label="선곡표" rows={(data?.artists ?? []).map((item) => ({ id: item.id, name: item.name, value: item.setlist_count }))} />
      <RankingPanel title="가장 많이 연주된 곡" label="연주" rows={(data?.songs ?? []).map((item) => ({ id: item.song_id, name: item.title, meta: item.artist_name, value: item.play_count }))} />
      <RankingPanel title="공연이 많은 공연장" label="공연" rows={(data?.venues ?? []).map((item) => ({ id: item.id, name: item.name, meta: [item.province, item.district].filter(Boolean).join(' '), value: item.concert_count }))} />
      <section className="stat-panel recent-stat"><div className="stat-panel-heading"><p className="eyebrow">Recently added</p><h2>최근 등록된 공연</h2></div><ol>{(data?.recent ?? []).map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.artist_name}</strong><small>{item.venue_name || '공연장 미정'}</small></div><time>{formatCompactDate(item.performance_date)}</time></li>)}</ol></section>
    </div>}
  </section>;
}

function RankingPanel({ title, label, rows }: { title: string; label: string; rows: { id: string; name: string; meta?: string; value: number }[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return <section className="stat-panel"><div className="stat-panel-heading"><h2>{title}</h2><span>{label}</span></div><ol>{rows.map((row, index) => <li key={row.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{row.name}</strong>{row.meta && <small>{row.meta}</small>}<i style={{ '--rank': `${row.value / max * 100}%` } as React.CSSProperties} /></div><b>{row.value}</b></li>)}</ol></section>;
}
