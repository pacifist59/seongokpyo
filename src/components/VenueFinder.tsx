import { useState } from 'react';
import { requireSupabase } from '../lib/supabase';

type VenueResult = { name: string; roadAddress: string; address: string };

export function VenueFinder({ query, onSelect }: { query: string; onSelect: (venue: VenueResult) => void }) {
  const [items, setItems] = useState<VenueResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    const text = query.trim();
    if (text.length < 2) { setError('공연장 이름을 두 글자 이상 입력해주세요.'); return; }
    setLoading(true); setError('');
    try {
      // This is an explicit user action, never an input-keystroke API call.
      const { data, error: invokeError } = await requireSupabase().functions.invoke('venue-search', { body: { query: text } });
      if (invokeError) throw invokeError;
      setItems(Array.isArray(data?.places) ? data.places : []);
      if (!data?.places?.length) setError('일치하는 장소를 찾지 못했습니다. 직접 입력해도 됩니다.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '지도 장소를 찾지 못했습니다.');
    } finally { setLoading(false); }
  };

  return <div className="venue-finder span-2">
    <div><strong>지도에서 공연장 찾기</strong><button type="button" className="button button-secondary button-small" disabled={loading} onClick={() => void search()}>{loading ? '검색 중…' : '카카오맵 검색'}</button></div>
    <p>정확한 장소를 한 번 선택하면 주소가 저장되고, 지도 좌표 보정 대상으로 등록됩니다.</p>
    {error && <small role="status">{error}</small>}
    {items.length > 0 && <ul>{items.map((item) => <li key={`${item.name}-${item.roadAddress}`}><button type="button" onClick={() => { onSelect(item); setItems([]); setError(''); }}><strong>{item.name}</strong><span>{item.roadAddress || item.address}</span></button></li>)}</ul>}
  </div>;
}
