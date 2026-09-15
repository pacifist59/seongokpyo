import { useEffect, useMemo, useRef, useState } from 'react';

declare global { interface Window { naver?: { maps: { Map: new (element: HTMLElement, options: object) => unknown; LatLng: new (lat: number, lng: number) => unknown; Marker: new (options: object) => unknown } } } }

let mapsLoader: Promise<void> | null = null;

function loadNaverMaps(key: string): Promise<void> {
  if (window.naver?.maps) return Promise.resolve();
  if (mapsLoader) return mapsLoader;
  mapsLoader = new Promise((resolve, reject) => {
    const callback = `initSeongokpyoMap_${Date.now()}`;
    const callbackWindow = window as unknown as Record<string, (() => void) | undefined>;
    const timeout = window.setTimeout(() => finish(new Error('Naver Maps loading timed out.')), 12_000);
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      delete callbackWindow[callback];
      if (error) { mapsLoader = null; reject(error); } else resolve();
    };
    callbackWindow[callback] = () => window.naver?.maps ? finish() : finish(new Error('Naver Maps is unavailable.'));
    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(key)}&callback=${callback}`;
    script.async = true;
    script.onerror = () => finish(new Error('Naver Maps could not be loaded.'));
    document.head.appendChild(script);
  });
  return mapsLoader;
}

export function VenueMap({ name, address, latitude, longitude, placeUrl, geocodeStatus }: { name: string; address: string; latitude: number | null; longitude: number | null; placeUrl: string | null; geocodeStatus?: 'pending' | 'complete' | 'failed' | 'not_available' }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(() => latitude != null && longitude != null ? 'loading' : 'ready');
  const key = import.meta.env.VITE_NAVER_MAP_CLIENT_ID?.trim();
  const naverUrl = useMemo(() => placeUrl || `https://map.naver.com/p/search/${encodeURIComponent(address || name)}`, [placeUrl, address, name]);

  useEffect(() => {
    if (!key || latitude == null || longitude == null || !container.current) return;
    let active = true;
    setState('loading');
    const render = () => {
      if (!window.naver || !container.current) throw new Error('Naver Maps is unavailable.');
      const position = new window.naver.maps.LatLng(latitude, longitude);
      const map = new window.naver.maps.Map(container.current, { center: position, zoom: 16 });
      new window.naver.maps.Marker({ position, map, title: name });
      if (active) setState('ready');
    };
    loadNaverMaps(key).then(render).catch(() => { if (active) setState('failed'); });
    return () => { active = false; };
  }, [key, latitude, longitude, name]);

  const fallback = !key ? ['지도 미리보기는 준비 중입니다.', '정확한 위치는 네이버 지도에서 확인할 수 있습니다.']
    : latitude == null || longitude == null ? [geocodeStatus === 'failed' ? '좌표 확인이 필요합니다.' : '좌표를 확인하고 있습니다.', address ? '주소는 등록되어 있어요. 네이버 지도에서 바로 확인할 수 있습니다.' : '주소를 등록하면 지도 미리보기가 표시됩니다.']
      : state === 'failed' ? ['지도를 불러오지 못했습니다.', '네이버 지도에서 장소를 열어 정확한 위치를 확인해보세요.']
        : ['지도 준비 중…', address || name];
  const showFallback = !key || latitude == null || longitude == null || state !== 'ready';
  return <section className="venue-map-card">
    <div className="venue-map" ref={container} aria-label={`${name} 지도`}>
      {showFallback && <div className={`map-fallback ${state === 'loading' ? 'is-loading' : ''}`}><span aria-hidden="true">⌖</span><strong>{fallback[0]}</strong><small>{fallback[1]}</small></div>}
    </div>
    <a className="button button-secondary button-full" href={naverUrl} target="_blank" rel="noreferrer">네이버 지도에서 위치 확인 ↗</a>
  </section>;
}
