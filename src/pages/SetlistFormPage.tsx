import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { ErrorState, LoadingState } from '../components/States';
import { SongAutocomplete } from '../components/SongAutocomplete';
import { splitKoreanAddress, VenueFinder } from '../components/VenueFinder';
import { useAsync } from '../hooks/useAsync';
import { createSetlist, getSetlist, replaceSetlist, type SetlistDraft } from '../services/catalog';
import type { SongInput } from '../types/database';

type SongRow = SongInput & { key: string };
type FormFields = Omit<SetlistDraft, 'songs'>;

const emptyFields: FormFields = {
  artistName: '', performanceDate: '', concertTitle: '', venueName: '', province: '', district: '', addressDetail: '', roadAddress: '', festivalName: '', tourName: '', ticketUrl: '',
};

function newSong(position: number, section: SongInput['section'] = 'main'): SongRow {
  return { key: crypto.randomUUID(), title: '', position, section, is_cover: false, original_artist: '', guest_artist: '', note: '' };
}

export function SetlistFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const existing = useAsync(() => id ? getSetlist(id) : Promise.resolve(null), [id]);
  const [fields, setFields] = useState<FormFields>(emptyFields);
  const [songs, setSongs] = useState<SongRow[]>([newSong(1)]);
  const [isFestival, setIsFestival] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [changeReason, setChangeReason] = useState('');

  useEffect(() => {
    if (!existing.data) return;
    const { overview, songs: currentSongs } = existing.data;
    setFields({
      artistName: overview.artist_name,
      performanceDate: overview.performance_date,
      concertTitle: overview.concert_title ?? '',
      venueName: overview.venue_name ?? '',
      province: overview.region?.split(' ')[0] ?? '',
      district: overview.region?.split(' ').slice(1).join(' ') ?? '',
      addressDetail: '', roadAddress: '', festivalName: overview.festival_name ?? '', tourName: overview.tour_name ?? '', ticketUrl: overview.ticket_url ?? '',
    });
    setSongs(currentSongs.length ? currentSongs.map((song) => ({
      key: song.id, song_id: song.song_id, title: song.title, position: song.position, section: song.section, is_cover: song.is_cover,
      original_artist: song.original_artist_name ?? '', guest_artist: song.guest_artist ?? '', note: song.note ?? '',
    })) : [newSong(1)]);
    setIsFestival(Boolean(overview.festival_name));
  }, [existing.data]);

  const upcoming = Boolean(fields.performanceDate && fields.performanceDate > new Date().toISOString().slice(0, 10));

  const normalizedSongs = useMemo(() => songs.map((song, index) => ({ ...song, position: index + 1 })), [songs]);
  const setField = (name: keyof FormFields, value: string) => setFields((current) => ({ ...current, [name]: value }));
  const updateSong = (key: string, patch: Partial<SongRow>) => setSongs((current) => current.map((song) => song.key === key ? { ...song, ...patch } : song));

  const insertSong = (index: number, section: SongInput['section']) => {
    const key = crypto.randomUUID();
    setSongs((current) => [...current.slice(0, index + 1), { ...newSong(index + 2, section), key }, ...current.slice(index + 1)]);
    window.requestAnimationFrame(() => document.getElementById(`song-${key}`)?.focus());
  };
  const moveSong = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= songs.length) return;
    setSongs((current) => { const copy = [...current]; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy; });
  };
  const removeSong = (key: string) => setSongs((current) => current.length === 1 ? [newSong(1)] : current.filter((song) => song.key !== key));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    const cleanSongs = normalizedSongs.filter((song) => song.title.trim()).map(({ key: _key, ...song }) => ({ ...song, title: song.title.trim() }));
    if (!cleanSongs.length && !upcoming) { setError('지난 공연은 곡을 한 개 이상 입력해주세요. 예정 공연은 곡 없이 저장할 수 있습니다.'); return; }
    setSubmitting(true);
    try {
      const draft: SetlistDraft = {
        ...fields,
        artistName: fields.artistName.trim(),
        concertTitle: fields.concertTitle?.trim() || null,
        venueName: fields.venueName?.trim() || null,
        province: fields.province?.trim() || null,
        district: fields.district?.trim() || null,
      addressDetail: fields.addressDetail?.trim() || null,
        roadAddress: fields.roadAddress?.trim() || null,
        festivalName: isFestival ? fields.festivalName?.trim() || null : null,
        tourName: fields.tourName?.trim() || null,
        ticketUrl: fields.ticketUrl?.trim() || null,
        songs: cleanSongs,
        changeReason: changeReason.trim() || null,
      };
      const setlistId = editing && id ? await replaceSetlist(id, draft) : await createSetlist(draft);
      navigate(`/setlist/${setlistId}`);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : '선곡표를 저장하지 못했습니다.');
    } finally { setSubmitting(false); }
  };

  if (authLoading || (editing && existing.loading)) return <section className="section page-section"><LoadingState /></section>;
  if (existing.error) return <section className="section page-section"><ErrorState error={existing.error} onRetry={existing.reload} /></section>;
  if (!session) return <section className="auth-gate"><div><span>MEMBERS ONLY</span><h1>로그인하고<br />선곡표를 기록하세요.</h1><p>조회와 검색은 누구나 가능하지만, 기록을 남기거나 수정하려면 로그인이 필요합니다.</p><Link className="button button-primary" to={`/login?next=${encodeURIComponent(location.pathname)}`}>로그인</Link></div></section>;
  if (editing && existing.data && existing.data.overview.author_id !== session.user.id) return <section className="section page-section"><ErrorState error={new Error('작성자만 이 선곡표를 수정할 수 있습니다.')} /></section>;

  return <section className="section page-section form-page">
    <div className="form-heading"><Link className="back-link" to={editing && id ? `/setlist/${id}` : '/setlists'}>← 돌아가기</Link><p className="eyebrow">{editing ? 'Edit setlist' : 'New setlist'}</p><h1>{editing ? '선곡표 수정' : '선곡표 등록'}</h1><p>공연 정보와 실제 연주 순서를 차례로 입력해주세요.</p></div>
    <form className="setlist-form" onSubmit={submit}>
      <section className="form-section"><div className="form-section-number">01</div><div className="form-section-content"><div className="form-section-title"><h2>공연 정보</h2><p>아티스트와 날짜는 필수입니다.</p></div><div className="form-grid">
        <label className="span-2"><span>아티스트 *</span><input required value={fields.artistName} onChange={(event) => setField('artistName', event.target.value)} placeholder="예: DAY6" /></label>
        <label><span>공연 날짜 *</span><input required type="date" value={fields.performanceDate} onChange={(event) => setField('performanceDate', event.target.value)} /></label>
        <label><span>공연명</span><input value={fields.concertTitle ?? ''} onChange={(event) => setField('concertTitle', event.target.value)} placeholder="예: The Present" /></label>
        <label><span>투어</span><input value={fields.tourName ?? ''} onChange={(event) => setField('tourName', event.target.value)} placeholder="선택 입력" /></label>
        <div className="event-type" role="group" aria-label="공연 종류"><button type="button" className={!isFestival ? 'is-active' : ''} onClick={() => { setIsFestival(false); setField('festivalName', ''); }}>단독 공연</button><button type="button" className={isFestival ? 'is-active' : ''} onClick={() => setIsFestival(true)}>페스티벌 공연</button></div>
        {isFestival && <label className="span-2"><span>페스티벌명</span><input value={fields.festivalName ?? ''} onChange={(event) => setField('festivalName', event.target.value)} placeholder="예: 펜타포트 락 페스티벌" /></label>}
      </div></div></section>

      <section className="form-section"><div className="form-section-number">02</div><div className="form-section-content"><div className="form-section-title"><h2>공연장</h2><p>한국 주소 체계에 맞게 나눠 저장합니다.</p></div><div className="form-grid">
        <label className="span-2"><span>공연장 이름</span><input value={fields.venueName ?? ''} onChange={(event) => setField('venueName', event.target.value)} placeholder="예: KSPO DOME" /></label>
        <VenueFinder query={fields.venueName ?? ''} onSelect={(venue) => setFields((current) => ({ ...current, venueName: venue.name, roadAddress: venue.roadAddress, addressDetail: venue.address, ...splitKoreanAddress(venue.roadAddress || venue.address) }))} />
        {fields.roadAddress && <p className="venue-selection span-2">선택한 지도 정보: {fields.roadAddress}</p>}
        <label><span>시/도</span><input value={fields.province ?? ''} onChange={(event) => setField('province', event.target.value)} placeholder="예: 서울특별시" /></label>
        <label><span>시/군/구</span><input value={fields.district ?? ''} onChange={(event) => setField('district', event.target.value)} placeholder="예: 송파구" /></label>
        <label className="span-2"><span>상세 위치</span><input value={fields.addressDetail ?? ''} onChange={(event) => setField('addressDetail', event.target.value)} placeholder="선택 입력" /></label>
      </div></div></section>

      <section className="form-section"><div className="form-section-number">03</div><div className="form-section-content"><div className="form-section-title"><h2>{upcoming ? '예정 공연' : '예매 정보'}</h2><p>{upcoming ? '아직 선곡표가 없어도 저장할 수 있습니다.' : '공식 예매 링크가 있으면 함께 남겨주세요.'}</p></div><div className="form-grid"><label className="span-2"><span>공식 예매 링크</span><input type="url" value={fields.ticketUrl ?? ''} onChange={(event) => setField('ticketUrl', event.target.value)} placeholder="https://ticket.example.com/..." /></label>{upcoming && <p className="form-hint span-2">공연 뒤에 수정에서 실제 연주 순서를 추가하면 됩니다.</p>}</div></div></section>

      <section className="form-section song-form-section"><div className="form-section-number">04</div><div className="form-section-content"><div className="form-section-title song-title-row"><div><h2>{upcoming ? '예상 선곡표 (선택)' : '연주 순서'}</h2><p>{upcoming ? '공연 전에는 비워두고, 공연 후 실제 순서를 기록해주세요.' : '곡명 입력 후 Enter를 누르면 다음 줄이 생깁니다.'}</p></div><button type="button" className="button button-secondary button-small" onClick={() => insertSong(songs.length - 1, 'main')}>+ 곡 추가</button></div><div className="song-editor">
        {normalizedSongs.map((song, index) => <div className={`song-editor-row ${song.section === 'encore' ? 'encore-row' : ''}`} key={song.key}>
          <span className="editor-number">{String(index + 1).padStart(2, '0')}</span>
          <div className="song-input-stack"><SongAutocomplete inputId={`song-${song.key}`} label={`${index + 1}번째 곡명`} value={song.title} artistName={fields.artistName} onChange={(title) => updateSong(song.key, { title, song_id: null })} onSelect={(item) => updateSong(song.key, { title: item.title, song_id: item.id })} onEnter={() => insertSong(index, song.section)} /><div className="song-flags"><button type="button" className={song.section === 'encore' ? 'active' : ''} onClick={() => updateSong(song.key, { section: song.section === 'encore' ? 'main' : 'encore' })}>{song.section === 'encore' ? 'Encore' : '앙코르로 지정'}</button><label><input type="checkbox" checked={song.is_cover} onChange={(event) => updateSong(song.key, { is_cover: event.target.checked })} />커버곡</label></div>
            <details className="song-meta"><summary>곡 메타데이터</summary><div><input value={song.original_artist ?? ''} onChange={(event) => updateSong(song.key, { original_artist: event.target.value })} placeholder="원곡 아티스트" /><input value={song.guest_artist ?? ''} onChange={(event) => updateSong(song.key, { guest_artist: event.target.value })} placeholder="게스트 아티스트" /><input value={song.youtube_url ?? ''} onChange={(event) => updateSong(song.key, { youtube_url: event.target.value })} placeholder="YouTube 공식 음원·라이브 링크" /><input value={song.note ?? ''} onChange={(event) => updateSong(song.key, { note: event.target.value })} placeholder="메모" /></div></details>
          </div>
          <div className="song-row-actions"><button type="button" disabled={index === 0} onClick={() => moveSong(index, -1)} aria-label={`${song.title || index + 1} 위로 이동`}>↑</button><button type="button" disabled={index === songs.length - 1} onClick={() => moveSong(index, 1)} aria-label={`${song.title || index + 1} 아래로 이동`}>↓</button><button type="button" onClick={() => removeSong(song.key)} aria-label={`${song.title || index + 1} 삭제`}>×</button></div>
        </div>)}
      </div></div></section>
      {editing && <section className="form-section"><div className="form-section-number">05</div><div className="form-section-content"><div className="form-section-title"><h2>수정 사유</h2><p>변경 이력에 선택적으로 남습니다.</p></div><div className="form-grid"><label className="span-2"><span>수정 사유</span><input maxLength={300} value={changeReason} onChange={(event) => setChangeReason(event.target.value)} placeholder="예: 앙코르 순서 정정" /></label></div></div></section>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-submit"><p>등록 후에도 작성자는 언제든 수정할 수 있습니다.</p><button className="button button-primary" disabled={submitting}>{submitting ? '저장하는 중…' : editing ? '수정 완료' : '선곡표 등록'}</button></div>
    </form>
  </section>;
}
