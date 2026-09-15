export function formatDate(value: string | null | undefined): string {
  if (!value) return '날짜 미정';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).format(date);
}

export function formatCompactDate(value: string | null | undefined): string {
  if (!value) return '—';
  return value.replaceAll('-', '.');
}

export function formatLocation(province?: string | null, district?: string | null): string {
  return [province, district].filter(Boolean).join(' ') || '지역 미정';
}

export function pluralizeSongs(count: number): string {
  return `${count.toLocaleString('ko-KR')}곡`;
}

export function normalizeText(value: string): string {
  return value.normalize('NFC').trim().toLocaleLowerCase('ko-KR');
}

function isDistinctFromArtist(value: string | null | undefined, artistName: string): value is string {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  return normalizeText(trimmed) !== normalizeText(artistName);
}

/** Keeps imported placeholder values from being presented as meaningful context. */
export function formatSetlistContext(
  artistName: string,
  concertTitle: string | null | undefined,
  tourName: string | null | undefined,
): string {
  return [concertTitle, tourName]
    .filter((value): value is string => isDistinctFromArtist(value, artistName))[0] ?? '공연 선곡표';
}

export function formatOptionalSetlistContext(artistName: string, value: string | null | undefined): string | null {
  return isDistinctFromArtist(value, artistName) ? value : null;
}
