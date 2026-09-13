import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './ToastContext';
import { createComment, deleteComment, getComments, updateComment } from '../services/catalog';
import type { CommentDetail } from '../types/database';

const PAGE_SIZE = 10;

function formatCommentTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function CommentsSection({ setlistId }: { setlistId: string }) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<CommentDetail[]>([]);
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CommentDetail | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (nextPage = 0, append = false) => {
    setLoading(true); setError('');
    try {
      const result = await getComments(setlistId, nextPage, PAGE_SIZE);
      setItems((current) => append ? [...current, ...result.items] : result.items);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '댓글을 불러오지 못했습니다.');
    } finally { setLoading(false); }
  }, [setlistId]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session || !content.trim()) return;
    setSaving(true);
    try {
      await createComment(setlistId, session.user.id, content);
      setContent('');
      await load();
      showToast('댓글이 등록되었습니다.');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : '댓글을 등록하지 못했습니다.', 'error'); }
    finally { setSaving(false); }
  };

  const saveEdit = async (comment: CommentDetail) => {
    if (!session || !editingContent.trim()) return;
    setSaving(true);
    try {
      await updateComment(comment.id, session.user.id, editingContent);
      setEditingId(null);
      await load();
      showToast('댓글이 수정되었습니다.');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : '댓글을 수정하지 못했습니다.', 'error'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!session || !deleteTarget) return;
    setSaving(true);
    try {
      await deleteComment(deleteTarget.id, session.user.id);
      setDeleteTarget(null);
      await load();
      showToast('댓글이 삭제되었습니다.');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : '댓글을 삭제하지 못했습니다.', 'error'); }
    finally { setSaving(false); }
  };

  return <section className="comments-section" aria-labelledby="comments-title">
    <div className="comments-heading"><div><p className="eyebrow">Fan notes</p><h2 id="comments-title">댓글 <span>{items.length}{hasMore ? '+' : ''}</span></h2></div></div>
    {session ? <form className="comment-form" onSubmit={submit}><label htmlFor="new-comment">공연에 대한 기억을 남겨주세요</label><textarea id="new-comment" value={content} maxLength={2000} onChange={(event) => setContent(event.target.value)} placeholder="실제 공연에서 느낀 점이나 선곡표 정보를 나눠주세요." /><div><small>{content.length} / 2000</small><button className="button button-primary button-small" disabled={saving || !content.trim()}>댓글 등록</button></div></form> : <div className="comment-login-gate"><p>로그인 후 댓글을 작성할 수 있습니다.</p><Link className="button button-secondary button-small" to={`/login?next=${encodeURIComponent(`/setlist/${setlistId}`)}`}>로그인</Link></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading && !items.length ? <p className="comment-loading">댓글을 불러오는 중…</p> : items.length ? <ol className="comment-list">
      {items.map((comment) => <li key={comment.id}>
        <div className="comment-avatar" aria-hidden="true">{(comment.display_name || '익명').slice(0, 1)}</div>
        <div className="comment-body"><header><strong>{comment.display_name || '익명'}</strong><time dateTime={comment.created_at}>{formatCommentTime(comment.created_at)}</time>{comment.updated_at !== comment.created_at && <small>수정됨</small>}</header>
          {editingId === comment.id ? <div className="comment-edit"><textarea value={editingContent} maxLength={2000} onChange={(event) => setEditingContent(event.target.value)} /><div><button className="text-button" disabled={saving} onClick={() => setEditingId(null)}>취소</button><button className="button button-primary button-small" disabled={saving || !editingContent.trim()} onClick={() => void saveEdit(comment)}>저장</button></div></div> : <p>{comment.content}</p>}
          {session?.user.id === comment.user_id && editingId !== comment.id && <div className="comment-actions"><button onClick={() => { setEditingId(comment.id); setEditingContent(comment.content); }}>수정</button><button onClick={() => setDeleteTarget(comment)}>삭제</button></div>}
        </div>
      </li>)}
    </ol> : <div className="comment-empty"><span>♬</span><p>아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</p></div>}
    {hasMore && <button className="button button-secondary comments-more" disabled={loading} onClick={() => void load(page + 1, true)}>{loading ? '불러오는 중…' : '댓글 더 보기'}</button>}
    <ConfirmDialog open={Boolean(deleteTarget)} title="댓글을 삭제하시겠습니까?" description="삭제한 댓글은 복구할 수 없습니다." loading={saving} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
  </section>;
}
