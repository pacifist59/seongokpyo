import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { createSetlistCorrection, getSetlistCorrections, setCorrectionVote, type CorrectionInput } from '../services/catalog';
import type { SetlistCorrection } from '../types/database';

const ISSUE_LABEL: Record<SetlistCorrection['issue_type'], string> = {
  song_order: '곡 순서', song_title: '곡명', concert_info: '공연 정보', venue: '공연장', tour: '투어', festival: '페스티벌', other: '기타',
};

export function CorrectionSection({ setlistId }: { setlistId: string }) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<SetlistCorrection[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issueType, setIssueType] = useState<SetlistCorrection['issue_type']>('concert_info');
  const [proposedValue, setProposedValue] = useState('');
  const [reason, setReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const load = useCallback(async () => {
    if (!session) { setItems([]); return; }
    setLoading(true);
    try { setItems(await getSetlistCorrections(setlistId, session.user.id)); }
    catch { showToast('오류 제안을 불러오지 못했습니다.', 'error'); }
    finally { setLoading(false); }
  }, [session, setlistId, showToast]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session || !proposedValue.trim() || reason.trim().length < 10) return;
    setSaving(true);
    try {
      const input: CorrectionInput = { issue_type: issueType, proposed_value: proposedValue, reason, evidence_url: evidenceUrl };
      await createSetlistCorrection(setlistId, session.user.id, input);
      setOpen(false); setProposedValue(''); setReason(''); setEvidenceUrl('');
      await load();
      showToast('수정 제안을 남겼습니다. 원본은 검토 전까지 바뀌지 않습니다.');
    } catch (error) { showToast(error instanceof Error ? error.message : '수정 제안을 등록하지 못했습니다.', 'error'); }
    finally { setSaving(false); }
  };

  const vote = async (item: SetlistCorrection) => {
    if (!session || item.reporter_id === session.user.id) return;
    setSaving(true);
    try { await setCorrectionVote(item.id, session.user.id, !item.voted_by_me); await load(); }
    catch (error) { showToast(error instanceof Error ? error.message : '확인 상태를 바꾸지 못했습니다.', 'error'); }
    finally { setSaving(false); }
  };

  return <section className="correction-section" aria-labelledby="correction-title">
    <header><div><p className="eyebrow">Community review</p><h2 id="correction-title">오류 제안</h2><p>원본을 바로 덮어쓰지 않습니다. 서로 다른 두 사용자의 확인이 쌓이면 ‘커뮤니티 확인’으로 표시됩니다.</p></div>{session && <button className="button button-secondary button-small" onClick={() => setOpen((value) => !value)}>{open ? '닫기' : '오류 제안하기'}</button>}</header>
    {!session && <div className="correction-login"><span>기록의 오류를 발견했나요?</span><Link className="button button-secondary button-small" to={`/login?next=${encodeURIComponent(`/setlist/${setlistId}`)}`}>로그인하고 제안</Link></div>}
    {open && <form className="correction-form" onSubmit={submit}>
      <label>수정 항목<select value={issueType} onChange={(event) => setIssueType(event.target.value as SetlistCorrection['issue_type'])}>{Object.entries(ISSUE_LABEL).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>바뀌어야 할 내용<textarea required maxLength={2000} value={proposedValue} onChange={(event) => setProposedValue(event.target.value)} placeholder="예: 2번 곡은 ‘다큐멘터리’가 아니라 ‘그녀가 말했다’입니다." /></label>
      <label>근거 또는 설명<textarea required minLength={10} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="공식 공연 영상 00:14:32에서 확인했습니다." /></label>
      <label>근거 링크 (선택)<input type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://" /></label>
      <div><small>제안은 검토 이력으로 남으며, 다른 사용자의 확인 전에는 원본에 반영되지 않습니다.</small><button className="button button-primary button-small" disabled={saving || !proposedValue.trim() || reason.trim().length < 10}>{saving ? '등록 중…' : '수정 제안 등록'}</button></div>
    </form>}
    {loading ? <p className="correction-loading">제안을 불러오는 중…</p> : items.length > 0 && <ol className="correction-list">{items.map((item) => <li key={item.id}><div className="correction-item-heading"><span className={`correction-status status-${item.status}`}>{item.status === 'community_confirmed' ? '커뮤니티 확인' : item.status === 'applied' ? '반영됨' : item.status === 'rejected' ? '반려됨' : '검토 중'}</span><small>{ISSUE_LABEL[item.issue_type]}</small></div><strong>{item.proposed_value}</strong><p>{item.reason}</p>{item.evidence_url && <a href={item.evidence_url} target="_blank" rel="noreferrer">근거 보기 ↗</a>}<footer><span>독립 확인 {item.confirmation_count} / 2</span>{session && item.reporter_id !== session.user.id && item.status === 'pending' && <button className="text-button" disabled={saving} onClick={() => void vote(item)}>{item.voted_by_me ? '확인 취소' : '이 제안 확인'}</button>}</footer></li>)}</ol>}
  </section>;
}
