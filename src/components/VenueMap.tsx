import { useEffect, useMemo, useRef, useState } from 'react';

declare global { interface Window { kakao?: { maps: { Map: new (element: HTMLElement, options: object) => unknown; LatLng: new (lat: number, lng: number) => unknown; Marker: new (options: object) => unknown } } } }

let mapsLoader: Promise<void> | null = null;

function loadKakaoMaps(key: string): Promise<void> {
  if (window.kakao?.maps) return Promise.resolve();
  if (mapsLoader) return mapsLoader;
  mapsLoader = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => finish(new Error('Kakao Maps loading timed out.')), 12_000);
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      if (error) { mapsLoader = null; reject(error); } else resolve();
    };
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}`;
    script.async = true;
    script.onload = () => window.kakao?.maps ? finish() : finish(new Error('Kakao Maps is unavailable.'));
    script.onerror = () => finish(new Error('Kakao Maps could not be loaded.'));
    document.head.appendChild(script);
  });
  return mapsLoader;
}

function kakaoMapUrl(name: string, address: string, latitude: number | null, longitude: number | null) {
  if (latitude != null && longitude != null) return `https://map.kakao.com/link/map/${encodeURIComponent(name)},${latitude},${longitude}`;
  return `https://map.kakao.com/link/search/${encodeURIComponent(address || name)}`;
}

export function VenueMap({ name, address, latitude, longitude, geocodeStatus }: { name: string; address: string; latitude: number | null; longitude: number | null; geocodeStatus?: 'pending' | 'complete' | 'failed' | 'not_available' }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(() => latitude != null && longitude != null ? 'loading' : 'ready');
  const key = import.meta.env.VITE_KAKAO_MAP_JAVASCRIPT_KEY?.trim();
  const mapUrl = useMemo(() => kakaoMapUrl(name, address, latitude, longitude), [name, address, latitude, longitude]);

  useEffect(() => {
    if (!key || latitude == null || longitude == null || !container.current) return;
    let active = true;
    setState('loading');
    const render = () => {
      if (!window.kakao?.maps || !container.current) throw new Error('Kakao Maps is unavailable.');
      const position = new window.kakao.maps.LatLng(latitude, longitude);
      const map = new window.kakao.maps.Map(container.current, { center: position, level: 3 });
      new window.kakao.maps.Marker({ position, map, title: name });
      if (active) setState('ready');
    };
    loadKakaoMaps(key).then(render).catch(() => { if (active) setState('failed'); });
    return () => { active = false; };
  }, [key, latitude, longitude, name]);

  const fallback = !key ? ['지도 미리보기는 준비 중입니다.', '정확한 위치는 카카오맵에서 확인할 수 있습니다.']
    : latitude == null || longitude == null ? [geocodeStatus === 'failed' ? '좌표 확인이 필요합니다.' : '좌표를 확인하고 있습니다.', address ? '주소는 등록되어 있어요. 카카오맵에서 바로 확인할 수 있습니다.' : '주소를 등록하면 지도 미리보기가 표시됩니다.']
      : state === 'failed' ? ['지도를 불러오지 못했습니다.', '카카오맵에서 장소를 열어 정확한 위치를 확인해보세요.']
        : ['지도 준비 중…', address || name];
  const showFallback = !key || latitude == null || longitude == null || state !== 'ready';
  return <section className="venue-map-card">
    <div className="venue-map" ref={container} aria-label={`${name} 지도`}>
      {showFallback && <div className={`map-fallback ${state === 'loading' ? 'is-loading' : ''}`}><span aria-hidden="true">⌖</span><strong>{fallback[0]}</strong><small>{fallback[1]}</small></div>}
    </div>
    <a className="button button-secondary button-full" href={mapUrl} target="_blank" rel="noreferrer">카카오맵에서 위치 확인 ↗</a>
  </section>;
}
