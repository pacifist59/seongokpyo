import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
const enabled = import.meta.env.VITE_ANALYTICS_ENABLED === 'true' && Boolean(measurementId);

function sendPageView(path: string) {
  if (!enabled || !window.gtag || !measurementId) return;
  window.gtag('config', measurementId, { page_path: path });
}

export function Analytics() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (!enabled || !measurementId || document.getElementById('ga4-script')) return;
    const script = document.createElement('script');
    script.id = 'ga4-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => { window.dataLayer?.push(args); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: false });
  }, []);

  useEffect(() => {
    sendPageView(`${pathname}${search}`);
  }, [pathname, search]);

  return null;
}

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}
