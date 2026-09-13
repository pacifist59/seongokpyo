import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { formatDate, pluralizeSongs } from '../lib/format';
import { getAttendance, getSetlist, setAttendance } from '../services/catalog';
import type { SetlistSongDetail } from '../types/database';

export function SetlistDetailPage() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const state = useAsync(() => getSetlist(id), [id]);
  const [attending, setAttendingState] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    if (session?.user.id && id) getAttendance(id, session.user.id).then(setAttendingState).catch(() => setAttendingState(false));
  }, [id, session?.user.id]);

  if (state.loading) return <section className="section page-section"><LoadingState label="선곡표를 펼치는 중" /></section>;
  if (state.error) return <section className="section page-section"><ErrorState error={state.error} onRetry={state.reload} /></section>;
  if (!state.data) return <section className="section page-section"><EmptyState title="선곡표를 찾을 수 없어요" description="삭제되었거나 공개되지 않은 기록입니다." action={<Link className="button button-secondary" to="/setlists">목록으로</Link>} /></section>;

  const { overview, songs } = state.data;
  const mainSongs = songs.filter((song) => song.section === 'main');
  const encoreSongs = songs.filter((song) => song.section === 'encore');
  const canEdit = session?.user.id === overview.author_id;

  const toggleAttendance = async () => {
    if (!session) return;
    const next = !attending;
    setAttendanceLoading(true);
    try {
      await setAttendance(id, session.user.id, next);
      setAttendingState(next);
    } finally {
      setAttendanceLoading(false);
    }
  };

  return (
    <section className="detail-page">
      <div className="detail-masthead">
        <div className="detail-topline"><Link to="/setlists">← 선곡표</Link><span>{overview.festival_name ? 'FESTIVAL SET' : 'LIVE SET'}</span></div>
        <div className="detail-title-row">
          <div><p>{formatDate(overview.performance_date)}</p><h1>{overview.artist_name}</h1><h2>{overview.concert_title || overview.tour_name || '공연 선곡표'}</h2></div>
          <div className="detail-count"><strong>{String(songs.length).padStart(2, '0')}</strong><span>SONGS</span></div>
        </div>
        <div className="detail-meta">
          <div><small>공연장</small><strong>{overview.venue_name || '미정'}</strong><span>{overview.region || '지역 미정'}</span></div>
          <div><small>투어</small><strong>{overview.tour_name || '—'}</strong></div>
          <div><small>페스티벌</small><strong>{overview.festival_name || '—'}</strong></div>
        </div>
      </div>

      <div className="detail-content section">
        <div className="setlist-sheet">
          <div className="sheet-heading"><span>NO.</span><span>SONG</span><span>NOTE</span></div>
          {songs.length === 0 ? <EmptyState title="아직 곡이 없습니다" description="작성자가 곡 순서를 추가하면 이곳에 표시됩니다." /> : (
            <>
              <SongRows songs={mainSongs} />
              {encoreSongs.length > 0 && <div className="encore-divider"><span>ENCORE</span><i /></div>}
              <SongRows songs={encoreSongs} />
            </>
          )}
          <div className="sheet-footer"><span>{pluralizeSongs(songs.length)}</span><span>마지막 수정 {overview.updated_at.slice(0, 10).replaceAll('-', '.')}</span></div>
        </div>
        <aside className="detail-sidebar">
          <div className="attendance-card"><p>이 공연에 함께 있었나요?</p><h3>나도 갔어요</h3>{session ? <button className={`attendance-button ${attending ? 'is-active' : ''}`} disabled={attendanceLoading} onClick={() => void toggleAttendance()}><span>{attending ? '✓' : '+'}</span>{attending ? '다녀온 공연에 저장됨' : '내 공연에 추가'}</button> : <Link className="attendance-button" to="/login"><span>+</span>로그인하고 저장</Link>}</div>
          {canEdit && <Link className="button button-secondary button-full" to={`/setlist/${id}/edit`}>선곡표 수정</Link>}
          <div className="detail-note"><strong>기록 원칙</strong><p>공연에서 실제 연주된 순서를 기준으로 합니다. 불확실한 정보는 메모에 남겨주세요.</p></div>
        </aside>
      </div>
    </section>
  );
}

function SongRows({ songs }: { songs: SetlistSongDetail[] }) {
  return <>{songs.map((song) => (
    <div className="song-row" key={song.id}>
      <span className="song-number">{String(song.position).padStart(2, '0')}</span>
      <div><strong>{song.title}</strong>{song.is_cover && <small>원곡 {song.original_artist_name || '정보 없음'}</small>}</div>
      <p>{[song.guest_artist && `with ${song.guest_artist}`, song.note].filter(Boolean).join(' · ') || '—'}</p>
    </div>
  ))}</>;
}
