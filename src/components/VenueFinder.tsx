import { useState } from 'react';
import { requireSupabase } from '../lib/supabase';
import { VenueMapPreview } from './VenueMap';

export type VenueResult = { name: string; roadAddress: string; address: string; latitude: number; longitude: number; placeUrl?: string };

const provinceNames: Record<string, string> = { 서울: '서울특별시', 부산: '부산광역시', 대구: '대구광역시', 인천: '인천광역시', 광주: '광주광역시', 대전: '대전광역시', 울산: '울산광역시', 세종: '세종특별자치시', 경기: '경기도', 강원: '강원특별자치도', 충북: '충청북도', 충남: '충청남도', 전북: '전북특별자치도', 전남: '전라남도', 경북: '경상북도', 경남: '경상남도', 제주: '제주특별자치도' };

export function splitKoreanAddress(address: string) {
  const parts = address.trim().split(/\s+/).filter(Boolean);
  const province = provinceNames[parts[0]] || parts[0] || '';
  const local = parts.slice(1).filter((part) => /(?:시|군|구)$/.test(part));
  const district = local.length > 1 && /시$/.test(local[0]) ? `${local[0]} ${local[1]}` : local[0] || '';
  return { province, district };
}

export function VenueFinder({ query, onSelect }: { query: string; onSelect: (venue: VenueResult) => void }) {
  const [items, setItems] = useState<VenueResult[]>([]);
  const [preview, setPreview] = useState<VenueResult | null>(null);
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
      const places = Array.isArray(data?.places) ? data.places : [];
      setItems(places); setPreview(places[0] ?? null);
      if (!data?.places?.length) setError('일치하는 장소를 찾지 못했습니다. 직접 입력해도 됩니다.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '지도 장소를 찾지 못했습니다.');
    } finally { setLoading(false); }
  };

  return <div className="venue-finder span-2">
    <div><strong>지도에서 공연장 찾기</strong><button type="button" className="button button-secondary button-small" disabled={loading} onClick={() => void search()}>{loading ? '검색 중…' : '카카오맵 검색'}</button></div>
    <p>후보를 고르면 지도와 주소를 먼저 확인할 수 있습니다. 확정하면 주소와 행정구역을 자동 입력합니다.</p>
    {error && <small role="status">{error}</small>}
    {items.length > 0 && <ul>{items.map((item) => <li key={`${item.name}-${item.roadAddress}`}><button type="button" className={preview === item ? 'is-active' : ''} onClick={() => setPreview(item)} aria-pressed={preview === item}><strong>{item.name}</strong><span>{item.roadAddress || item.address}</span></button></li>)}</ul>}
    {preview && <div className="venue-candidate"><VenueMapPreview name={preview.name} address={preview.roadAddress || preview.address} latitude={preview.latitude} longitude={preview.longitude} placeUrl={preview.placeUrl} /><div><strong>{preview.name}</strong><span>{preview.roadAddress || preview.address}</span><button type="button" className="button button-primary button-small" onClick={() => { onSelect(preview); setItems([]); setPreview(null); setError(''); }}>이 장소로 선택</button></div></div>}
  </div>;
}
