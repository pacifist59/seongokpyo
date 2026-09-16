import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { CommentsSection } from '../components/CommentsSection';
import { CorrectionSection } from '../components/CorrectionSection';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useToast } from '../components/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';
import { formatDate, formatOptionalSetlistContext, formatSetlistContext, pluralizeSongs } from '../lib/format';
import { requireSupabase } from '../lib/supabase';
import { deleteSetlist, getAttendance, getBookmark, getSetlist, setAttendance, setBookmark } from '../services/catalog';
import type { SetlistSongDetail } from '../types/database';

export function SetlistDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const state = useAsync(() => getSetlist(id), [id], `setlist:${id}`);
  const [attending, setAttendingState] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const overview = state.data?.overview;
  useDocumentMetadata(
    overview ? `${overview.artist_name} - ${overview.performance_date} ${overview.venue_name || ''} 선곡표` : '선곡표',
    overview ? `${overview.artist_name}의 ${formatDate(overview.performance_date)} 공연 선곡표를 확인하세요.` : '한국 공연 세트리스트 아카이브',
  );

  useEffect(() => {
    if (!session?.user.id || !id) { setAttendingState(false); setBookmarked(false); return; }
    Promise.all([getAttendance(id, session.user.id), getBookmark(id, session.user.id)])
      .then(([nextAttendance, nextBookmark]) => { setAttendingState(nextAttendance); setBookmarked(nextBookmark); })
      .catch(() => { setAttendingState(false); setBookmarked(false); });
  }, [id, session?.user.id]);

  if (state.loading) return <section className="section page-section"><LoadingState label="선곡표를 펼치는 중" /></section>;
  if (state.error) return <section className="section page-section"><ErrorState error={state.error} onRetry={state.reload} /></section>;
  if (!state.data) return <section className="section page-section"><EmptyState title="선곡표를 찾을 수 없어요" description="삭제되었거나 공개되지 않은 기록입니다." action={<Link className="button button-secondary" to="/setlists">목록으로</Link>} /></section>;

  const { overview: item, songs } = state.data;
  const mainSongs = songs.filter((song) => song.section === 'main');
  const encoreSongs = songs.filter((song) => song.section === 'encore');
  const canEdit = session?.user.id === item.author_id;
  const concertContext = formatSetlistContext(item.artist_name, item.concert_title, item.tour_name);
  const tourName = formatOptionalSetlistContext(item.artist_name, item.tour_name);
  const festivalName = formatOptionalSetlistContext(item.artist_name, item.festival_name);
  const ticketSearchUrl = `https://www.google.com/search?q=${encodeURIComponent([item.artist_name, item.concert_title, item.performance_date, '예매'].filter(Boolean).join(' '))}`;

  const toggleAttendance = async () => {
    if (!session) { navigate(`/login?next=${encodeURIComponent(`/setlist/${id}`)}`); return; }
    const next = !attending; setInteractionLoading(true);
    try { await setAttendance(id, session.user.id, next); setAttendingState(next); showToast(next ? '다녀온 공연에 추가했습니다.' : '관람 기록에서 제외했습니다.'); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : '관람 기록을 변경하지 못했습니다.', 'error'); }
    finally { setInteractionLoading(false); }
  };

  const toggleBookmark = async () => {
    if (!session) { navigate(`/login?next=${encodeURIComponent(`/setlist/${id}`)}`); return; }
    const next = !bookmarked; setInteractionLoading(true);
    try { await setBookmark(id, session.user.id, next); setBookmarked(next); showToast(next ? '선곡표를 저장했습니다.' : '저장한 선곡표에서 제외했습니다.'); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : '저장 상태를 변경하지 못했습니다.', 'error'); }
    finally { setInteractionLoading(false); }
  };

  const share = async () => {
    const payload = { title: document.title, text: `${item.artist_name} 공연 선곡표`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(payload);
      else { await navigator.clipboard.writeText(window.location.href); showToast('링크가 복사되었습니다.'); }
    } catch (reason) { if ((reason as DOMException)?.name !== 'AbortError') showToast('공유를 시작하지 못했습니다.', 'error'); }
  };

  const confirmDelete = async () => {
    setInteractionLoading(true);
    try { await deleteSetlist(id); showToast('선곡표가 삭제되었습니다.'); navigate('/setlists', { replace: true }); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : '선곡표를 삭제하지 못했습니다.', 'error'); setDeleteOpen(false); }
    finally { setInteractionLoading(false); }
  };

  return <section className="detail-page">
    <div className="detail-masthead">
      <div className="detail-topline"><Link to="/setlists">← 선곡표</Link><span>{item.festival_name ? 'FESTIVAL SET' : 'LIVE SET'}</span></div>
      <div className="detail-title-row"><div><p>{item.is_upcoming ? 'UPCOMING · ' : ''}{formatDate(item.performance_date)}</p><h1>{item.artist_name}</h1><h2>{concertContext}</h2></div><div className="detail-count"><strong>{String(songs.length).padStart(2, '0')}</strong><span>{item.is_upcoming ? 'PLANNED' : 'SONGS'}</span></div></div>
      <div className="detail-meta"><div><small>공연장</small>{item.venue_id ? <Link to={`/venues/${item.venue_id}`}><strong>{item.venue_name || '미정'}</strong><span>{item.region || '지역 미정'}</span></Link> : <><strong>미정</strong><span>지역 미정</span></>}</div><div><small>투어</small>{item.tour_id ? <Link to={`/tours/${item.tour_id}`}><strong>{tourName || '—'}</strong></Link> : <strong>—</strong>}</div><div><small>페스티벌</small>{item.festival_id ? <Link to={`/festivals/${item.festival_id}`}><strong>{festivalName || '—'}</strong></Link> : <strong>—</strong>}</div></div>
    </div>

    <div className="detail-content section">
      <div className="setlist-sheet"><div className="sheet-heading"><span>NO.</span><span>SONG</span><span>ACTION</span></div>{songs.length === 0 ? <EmptyState title="아직 곡이 없습니다" description="작성자가 곡 순서를 추가하면 이곳에 표시됩니다." /> : <><SongRows songs={mainSongs} artistName={item.artist_name} />{encoreSongs.length > 0 && <div className="encore-divider"><span>ENCORE</span><i /></div>}<SongRows songs={encoreSongs} artistName={item.artist_name} /></>}<div className="sheet-footer"><span>{pluralizeSongs(songs.length)}</span><span>마지막 수정 {item.updated_at.slice(0, 10).replaceAll('-', '.')}</span></div></div>
      <aside className="detail-sidebar">
        {item.ticket_url ? <a className="button button-primary button-full" href={item.ticket_url} target="_blank" rel="noreferrer">공식 예매처 열기 ↗</a> : item.is_upcoming && <a className="button button-secondary button-full" href={ticketSearchUrl} target="_blank" rel="noreferrer">예매처 검색 ↗</a>}
        <div className="attendance-card"><p>이 공연에 함께 있었나요?</p><h3>나도 갔어요</h3><button className={`attendance-button ${attending ? 'is-active' : ''}`} disabled={interactionLoading} onClick={() => void toggleAttendance()}><span>{attending ? '✓' : '+'}</span>{attending ? '다녀온 공연에 저장됨' : session ? '내 공연에 추가' : '로그인하고 저장'}</button></div>
        <div className="detail-quick-actions"><button className={bookmarked ? 'is-active' : ''} disabled={interactionLoading} onClick={() => void toggleBookmark()} aria-pressed={bookmarked}>{bookmarked ? '♥ 저장됨' : '♡ 저장'}</button><button onClick={() => void share()}>↗ 공유</button></div>
        {canEdit && <><Link className="button button-secondary button-full" to={`/setlist/${id}/edit`}>선곡표 수정</Link><button className="button button-danger button-full" onClick={() => setDeleteOpen(true)}>선곡표 삭제</button></>}
        <div className="detail-note"><strong>기록 원칙</strong><p>공연에서 실제 연주된 순서를 기준으로 합니다. 불확실한 정보는 메모에 남겨주세요.</p></div>
      </aside>
    </div>
    <div className="section detail-community"><CorrectionSection setlistId={id} /><CommentsSection setlistId={id} /></div>
    <ConfirmDialog open={deleteOpen} title="이 선곡표를 삭제하시겠습니까?" description="삭제한 선곡표는 복구할 수 없습니다. 댓글과 참석·북마크 연결도 함께 삭제됩니다." loading={interactionLoading} onCancel={() => setDeleteOpen(false)} onConfirm={() => void confirmDelete()} />
  </section>;
}

function SongRows({ songs, artistName }: { songs: SetlistSongDetail[]; artistName: string }) {
  return <>{songs.map((song) => {
    const directUrl = song.youtube_url?.trim();
    return <div className="song-row" key={song.id}><span className="song-number">{String(song.position).padStart(2, '0')}</span><div className="song-copy">{song.album_image_url && <img src={song.album_image_url} alt="" loading="lazy" />}<span><strong>{song.title}</strong>{song.is_cover && <small>원곡 {song.original_artist_name || '정보 없음'}</small>}{song.album_name && <small>{song.album_name}{song.release_date && ` · ${song.release_date.slice(0, 4)}`}</small>}</span></div><div className="song-action"><p>{[song.guest_artist && `with ${song.guest_artist}`, song.note].filter(Boolean).join(' · ')}</p><YouTubePlayButton artistName={artistName} song={song} directUrl={directUrl} /></div></div>;
  })}</>;
}

function YouTubePlayButton({ artistName, song, directUrl }: { artistName: string; song: SetlistSongDetail; directUrl?: string }) {
  const [loading, setLoading] = useState(false);
  const fallbackUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${artistName} ${song.title} 공식`)}`;
  const play = async () => {
    if (directUrl) { window.open(directUrl, '_blank', 'noopener,noreferrer'); return; }
    const cacheKey = `youtube-video:${artistName}:${song.title}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { window.open(cached, '_blank', 'noopener,noreferrer'); return; }
    setLoading(true);
    try {
      const { data, error } = await requireSupabase().functions.invoke('youtube-search', { body: { artist: artistName, title: song.title } });
      if (error || typeof data?.url !== 'string') throw error || new Error('No YouTube result.');
      sessionStorage.setItem(cacheKey, data.url);
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    } finally { setLoading(false); }
  };
  return <button type="button" onClick={() => void play()} disabled={loading} aria-label={`${artistName} ${song.title} YouTube에서 재생`}><span aria-hidden="true">▶</span>{loading ? '찾는 중' : '재생'}</button>;
}
