export const SITE_ORIGIN = (import.meta.env.VITE_SITE_URL || 'https://probable-memory-98c.pages.dev').replace(/\/$/, '');
export const DEFAULT_IMAGE = `${SITE_ORIGIN}/share-card.png`;

export type Metadata = { title: string; description: string; image?: string | null; noindex?: boolean };
export const staticMetadata: Record<string, Metadata> = {
  '/': { title: '선곡표 — 공연의 순간을 곡으로 기록하다', description: '한국 공연의 선곡표를 찾고 기록하는 공연 아카이브. 아티스트, 공연장, 페스티벌의 연주 순서를 확인하세요.' },
  '/setlists': { title: '공연 선곡표 모음 | 선곡표', description: '아티스트, 날짜, 공연장, 지역별로 한국 공연의 선곡표를 찾아보세요.' },
  '/artists': { title: '아티스트 공연 기록 | 선곡표', description: '아티스트별 최근 공연과 자주 연주한 곡, 선곡표를 찾아보세요.' },
  '/venues': { title: '공연장 아카이브 | 선곡표', description: '지역별 공연장과 공연 기록, 위치 정보를 확인하세요.' },
  '/festivals': { title: '페스티벌 공연 기록 | 선곡표', description: '페스티벌의 날짜별 공연과 아티스트별 선곡표를 확인하세요.' },
  '/statistics': { title: '공연 기록 통계 | 선곡표', description: '선곡표에 등록된 아티스트와 곡, 공연장별 통계를 확인하세요.' },
  '/login': { title: '로그인 | 선곡표', description: '로그인하고 공연 기록을 이어가세요.', noindex: true },
  '/mypage': { title: '나의 공연 기록 | 선곡표', description: '나의 공연 기록과 저장한 선곡표를 확인하세요.', noindex: true },
  '/setlists/new': { title: '선곡표 등록 | 선곡표', description: '공연 정보와 실제 연주 순서를 기록하세요.', noindex: true },
  '/about/setup': { title: '연결 안내 | 선곡표', description: '서비스 연결 안내', noindex: true },
};

export function cleanPath(path: string): string {
  return path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
}

export function canonicalUrl(path: string): string {
  return `${SITE_ORIGIN}${cleanPath(path)}`;
}

export function imageUrl(image?: string | null): string {
  if (!image) return DEFAULT_IMAGE;
  try {
    const url = new URL(image, SITE_ORIGIN);
    return url.protocol === 'https:' ? url.href : DEFAULT_IMAGE;
  } catch { return DEFAULT_IMAGE; }
}

export function defaultMetadata(path: string): Metadata | undefined {
  const normalized = cleanPath(path);
  if (staticMetadata[normalized]) return staticMetadata[normalized];
  if (/^\/(setlist|artists|venues|festivals)\/[^/]+$/.test(normalized)) return undefined;
  return { title: normalized.endsWith('/edit') ? '선곡표 수정 | 선곡표' : '페이지를 찾을 수 없어요 | 선곡표', description: '선곡표에서 공연 기록을 찾아보세요.', noindex: true };
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function renderMetadata(path: string, metadata: Metadata): string {
  const url = canonicalUrl(path);
  const image = imageUrl(metadata.image);
  const tag = (key: string, value: string) => `<meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escapeHtml(value)}" />`;
  return [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    tag('description', metadata.description), tag('robots', metadata.noindex ? 'noindex, follow' : 'index, follow'),
    tag('og:title', metadata.title), tag('og:description', metadata.description), tag('og:type', 'website'),
    tag('og:url', url), tag('og:site_name', '선곡표'), tag('og:locale', 'ko_KR'),
    tag('og:image', image), tag('og:image:alt', '선곡표 — 공연의 순간을 곡으로 기록하다'),
    tag('twitter:card', 'summary_large_image'), tag('twitter:title', metadata.title),
    tag('twitter:description', metadata.description), tag('twitter:image', image),
  ].join('\n');
}
