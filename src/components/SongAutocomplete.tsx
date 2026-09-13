import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { searchSongs } from '../services/catalog';
import type { SongCatalogItem } from '../types/database';

export function SongAutocomplete({ value, artistName, inputId, label, onChange, onSelect, onEnter }: {
  value: string;
  artistName: string;
  inputId: string;
  label: string;
  onChange: (value: string) => void;
  onSelect: (item: SongCatalogItem) => void;
  onEnter: () => void;
}) {
  const listId = useId();
  const [items, setItems] = useState<SongCatalogItem[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = value.trim();
    if (term.length < 2) { setItems([]); setOpen(false); return; }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const next = await searchSongs(term, artistName);
        setItems(next);
        setOpen(true);
        setActive(-1);
      } catch { setItems([]); setOpen(true); }
      finally { setLoading(false); }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [value, artistName]);

  const select = (item: SongCatalogItem) => { onSelect(item); setOpen(false); setActive(-1); };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && open) { event.preventDefault(); setActive((current) => Math.min(current + 1, items.length - 1)); }
    else if (event.key === 'ArrowUp' && open) { event.preventDefault(); setActive((current) => Math.max(current - 1, 0)); }
    else if (event.key === 'Escape') { setOpen(false); setActive(-1); }
    else if (event.key === 'Enter') {
      event.preventDefault();
      if (open && active >= 0 && items[active]) select(items[active]); else onEnter();
    }
  };

  return <div className="song-autocomplete">
    <input id={inputId} role="combobox" aria-label={label} aria-expanded={open} aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} onFocus={() => value.trim().length >= 2 && setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onKeyDown={onKeyDown} placeholder="곡명" />
    {loading && <span className="autocomplete-loader" aria-label="곡 검색 중" />}
    {open && <div className="autocomplete-menu" id={listId} role="listbox">
      {items.map((item, index) => <button type="button" role="option" aria-selected={index === active} id={`${listId}-${index}`} className={index === active ? 'active' : ''} key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => select(item)}>
        {item.album_image_url ? <img src={item.album_image_url} alt="" loading="lazy" /> : <span className="album-placeholder">♪</span>}
        <span><strong>{item.title}</strong><small>{item.artist_name}{item.album_name && ` · ${item.album_name}`}{item.release_date && ` · ${item.release_date.slice(0, 4)}`}</small></span>
      </button>)}
      <button type="button" className="custom-song-option" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen(false)}><span className="album-placeholder">+</span><span><strong>검색 결과에 없는 곡 직접 입력</strong><small>현재 입력한 곡명을 그대로 사용합니다.</small></span></button>
    </div>}
  </div>;
}
