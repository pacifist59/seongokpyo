import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchCatalog } from '../services/catalog';
import type { SearchResult } from '../types/database';

const labels: Record<SearchResult['type'], string> = {
  artist: '아티스트', setlist: '선곡표', venue: '공연장', festival: '페스티벌',
};

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      searchCatalog(trimmed)
        .then((items) => {
          if (!controller.signal.aborted) {
            setResults(items);
            setOpen(true);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setResults([]);
            setOpen(true);
          }
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (result: SearchResult) => {
    setQuery('');
    setOpen(false);
    navigate(result.href);
  };

  return (
    <div className={`search-box ${compact ? 'search-compact' : ''}`} ref={wrapperRef}>
      <span className="search-icon" aria-hidden="true">⌕</span>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        placeholder="아티스트, 공연, 공연장, 페스티벌 검색"
        aria-label="통합 검색"
        aria-expanded={open}
        aria-controls="global-search-results"
        autoComplete="off"
      />
      {loading && <span className="mini-loader" aria-label="검색 중" />}
      {open && (
        <div className="search-results" id="global-search-results" role="listbox">
          {results.length === 0 ? (
            <p className="search-empty">일치하는 기록이 없습니다.</p>
          ) : results.map((result) => (
            <button key={`${result.type}-${result.id}`} onClick={() => choose(result)} role="option">
              <span className={`result-type type-${result.type}`}>{labels[result.type]}</span>
              <span className="result-copy"><strong>{result.title}</strong><small>{result.meta}</small></span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
