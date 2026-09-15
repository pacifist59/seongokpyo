import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { canonicalUrl, defaultMetadata, imageUrl, type Metadata } from '../lib/seo';

function setMeta(property: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"], meta[name="${property}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(property.startsWith('og:') ? 'property' : 'name', property);
    document.head.appendChild(element);
  }
  element.content = content;
}

function applyMetadata(path: string, { title, description, image, noindex }: Metadata) {
  document.title = title;
  setMeta('description', description);
  setMeta('robots', noindex ? 'noindex, follow' : 'index, follow');
  setMeta('og:title', title);
  setMeta('og:description', description);
  setMeta('og:type', 'website');
  setMeta('og:url', canonicalUrl(path));
  setMeta('og:site_name', '선곡표');
  setMeta('og:locale', 'ko_KR');
  setMeta('og:image', imageUrl(image));
  setMeta('og:image:alt', '선곡표 — 공연의 순간을 곡으로 기록하다');
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:image', imageUrl(image));
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl(path);
}

export function useDefaultDocumentMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const metadata = defaultMetadata(pathname);
    if (metadata) applyMetadata(pathname, metadata);
  }, [pathname]);
}

export function useDocumentMetadata(title: string, description: string, image?: string | null, noindex = false) {
  const { pathname } = useLocation();
  useEffect(() => {
    applyMetadata(pathname, { title, description, image, noindex });
  }, [pathname, title, description, image, noindex]);
}
