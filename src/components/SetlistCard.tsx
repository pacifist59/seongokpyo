import { Link } from 'react-router-dom';
import { formatCompactDate, pluralizeSongs } from '../lib/format';
import type { SetlistOverview } from '../types/database';

export function SetlistCard({ item, compact = false }: { item: SetlistOverview; compact?: boolean }) {
  return (
    <Link to={`/setlist/${item.id}`} className={`setlist-card ${compact ? 'card-compact' : ''}`}>
      <div className="card-date" aria-label={`공연 날짜 ${item.performance_date}`}>
        <span>{formatCompactDate(item.performance_date).slice(5)}</span>
        <small>{item.performance_date.slice(0, 4)}</small>
      </div>
      <div className="card-body">
        <div className="eyebrow-row">
          <span className="pill">{item.festival_name ? '페스티벌' : '공연'}</span>
          <span>{pluralizeSongs(item.song_count)}</span>
        </div>
        <h3>{item.artist_name}</h3>
        <p>{item.concert_title || item.tour_name || '공연 선곡표'}</p>
        <div className="card-location">
          <span>{item.venue_name || '공연장 미정'}</span>
          <small>{item.region || '지역 미정'}</small>
        </div>
      </div>
      <span className="card-arrow" aria-hidden="true">↗</span>
    </Link>
  );
}
