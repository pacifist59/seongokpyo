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
