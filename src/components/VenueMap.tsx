import { useEffect, useMemo, useRef, useState } from 'react';

declare global { interface Window { naver?: { maps: { Map: new (element: HTMLElement, options: object) => unknown; LatLng: new (lat: number, lng: number) => unknown; Marker: new (options: object) => unknown } } } }

export function VenueMap({ name, address, latitude, longitude, placeUrl }: { name: string; address: string; latitude: number | null; longitude: number | null; placeUrl: string | null }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const key = import.meta.env.VITE_NAVER_MAP_CLIENT_ID?.trim();
  const naverUrl = useMemo(() => placeUrl || `https://map.naver.com/p/search/${encodeURIComponent(address || name)}`, [placeUrl, address, name]);

  useEffect(() => {
    if (!key || latitude == null || longitude == null || !container.current) return;
    const render = () => {
      if (!window.naver || !container.current) { setFailed(true); return; }
      const position = new window.naver.maps.LatLng(latitude, longitude);
      const map = new window.naver.maps.Map(container.current, { center: position, zoom: 16 });
      new window.naver.maps.Marker({ position, map, title: name });
    };
    if (window.naver) { render(); return; }
    const callback = `initSeongokpyoMap_${crypto.randomUUID().replaceAll('-', '')}`;
    (window as unknown as Record<string, unknown>)[callback] = render;
    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(key)}&callback=${callback}`;
    script.async = true;
    script.onerror = () => setFailed(true);
    document.head.appendChild(script);
    return () => { delete (window as unknown as Record<string, unknown>)[callback]; };
  }, [key, latitude, longitude, name]);

  return <section className="venue-map-card">
    <div className="venue-map" ref={container}>{(!key || latitude == null || longitude == null || failed) && <div className="map-fallback"><span>⌖</span><strong>{failed ? '지도를 불러올 수 없습니다.' : '좌표 정보가 준비되면 지도가 표시됩니다.'}</strong><small>{address || name}</small></div>}</div>
    <a className="button button-secondary button-full" href={naverUrl} target="_blank" rel="noreferrer">네이버 지도에서 보기 ↗</a>
  </section>;
}
