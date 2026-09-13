import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SetlistCard } from '../components/SetlistCard';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useToast } from '../components/ToastContext';
import { useAsync } from '../hooks/useAsync';
import { formatDate } from '../lib/format';
import { deleteSetlist, getMyPageData, updateProfile } from '../services/catalog';
import type { SetlistOverview } from '../types/database';

type Tab = 'profile' | 'authored' | 'attended' | 'bookmarked' | 'comments';

const tabs: [Tab, string][] = [
  ['profile', '프로필'], ['authored', '내가 작성한 선곡표'], ['attended', '나도 갔어요'], ['bookmarked', '저장한 선곡표'], ['comments', '내 댓글'],
];

function SetlistCollection({ items, empty, editable, onDelete }: { items: SetlistOverview[]; empty: string; editable?: boolean; onDelete?: (item: SetlistOverview) => void }) {
  if (!items.length) return <EmptyState title={empty} description="공연 기록이 생기면 이곳에서 한 번에 확인할 수 있습니다." />;
  return <div className="mypage-setlists">{items.map((item) => <div className="mypage-setlist" key={item.id}><SetlistCard item={item} compact />{editable && <div className="mypage-card-actions"><Link to={`/setlist/${item.id}/edit`}>수정</Link><button onClick={() => onDelete?.(item)}>삭제</button></div>}</div>)}</div>;
}

export function MyPage() {
  const { session, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('profile');
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SetlistOverview | null>(null);
  const state = useAsync(() => session ? getMyPageData(session.user.id) : Promise.resolve(null), [session?.user.id]);

  useEffect(() => { if (state.data?.profile?.display_name) setNickname(state.data.profile.display_name); }, [state.data?.profile?.display_name]);

  if (authLoading || state.loading) return <section className="section page-section"><LoadingState label="나의 공연 기록을 모으는 중" /></section>;
  if (!session) return <section className="auth-gate"><div><span>MY ARCHIVE</span><h1>로그인하고<br />나만의 공연 기록을 모으세요.</h1><Link className="button button-primary" to="/login?next=%2Fmypage">로그인</Link></div></section>;
  if (state.error) return <section className="section page-section"><ErrorState error={state.error} onRetry={state.reload} /></section>;
  if (!state.data) return null;
  const { profile, authored, attended, bookmarked, comments } = state.data;
  const displayName = profile?.display_name || session.user.email?.split('@')[0] || '공연 팬';

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { await updateProfile(session.user.id, nickname); await state.reload(); showToast('닉네임이 변경되었습니다.'); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : '프로필을 수정하지 못했습니다.', 'error'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try { await deleteSetlist(deleteTarget.id); setDeleteTarget(null); await state.reload(); showToast('선곡표가 삭제되었습니다.'); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : '선곡표를 삭제하지 못했습니다.', 'error'); }
    finally { setSaving(false); }
  };

  return <section className="section page-section mypage">
    <header className="mypage-hero"><div className="profile-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : displayName.slice(0, 1)}</div><div><p className="eyebrow">My live archive</p><h1>{displayName}</h1><p>가입일 {formatDate(profile?.created_at || session.user.created_at)}</p></div><div className="mypage-summary"><span><strong>{authored.length}</strong>작성</span><span><strong>{attended.length}</strong>관람</span><span><strong>{bookmarked.length}</strong>저장</span></div></header>
    <nav className="profile-tabs" aria-label="마이페이지 메뉴">{tabs.map(([value, label]) => <button className={tab === value ? 'active' : ''} key={value} onClick={() => setTab(value)}>{label}</button>)}</nav>
    <div className="mypage-content">
      {tab === 'profile' && <section className="profile-panel"><div><p className="eyebrow">Profile</p><h2>프로필</h2><p>닉네임은 다른 팬에게 댓글 작성자로 표시됩니다. 중복은 허용하며 계정은 고유 사용자 ID로 구분합니다.</p></div><form onSubmit={saveProfile}><label><span>닉네임</span><input required minLength={2} maxLength={20} value={nickname} onChange={(event) => setNickname(event.target.value)} /></label><small>{nickname.trim().length} / 20자</small><button className="button button-primary" disabled={saving || nickname.trim().length < 2}>{saving ? '저장 중…' : '프로필 저장'}</button></form></section>}
      {tab === 'authored' && <SetlistCollection items={authored} empty="아직 작성한 선곡표가 없습니다." editable onDelete={setDeleteTarget} />}
      {tab === 'attended' && <SetlistCollection items={attended} empty="아직 ‘나도 갔어요’로 표시한 공연이 없습니다." />}
      {tab === 'bookmarked' && <SetlistCollection items={bookmarked} empty="아직 저장한 선곡표가 없습니다." />}
      {tab === 'comments' && (comments.length ? <ol className="my-comments">{comments.map((comment) => <li key={comment.id}><Link to={`/setlist/${comment.setlist_id}`}><p>{comment.content}</p><span>{formatDate(comment.created_at)} · 선곡표 보기 →</span></Link></li>)}</ol> : <EmptyState title="아직 작성한 댓글이 없습니다." description="공연의 기억을 댓글로 나누면 이곳에 모입니다." />)}
    </div>
    <ConfirmDialog open={Boolean(deleteTarget)} title="이 선곡표를 삭제하시겠습니까?" description="삭제한 선곡표는 복구할 수 없습니다. 댓글과 참석·북마크 연결도 함께 삭제됩니다." loading={saving} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
  </section>;
}
