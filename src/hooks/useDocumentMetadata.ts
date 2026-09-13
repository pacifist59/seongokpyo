import { useEffect } from 'react';

function setMeta(property: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"], meta[name="${property}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(property.startsWith('og:') ? 'property' : 'name', property);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function useDocumentMetadata(title: string, description: string, image?: string | null) {
  useEffect(() => {
    document.title = title;
    setMeta('description', description);
    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:type', 'website');
    setMeta('og:url', window.location.href);
    if (image) setMeta('og:image', image);
  }, [title, description, image]);
}
