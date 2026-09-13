import { useEffect, useRef } from 'react';

export function ConfirmDialog({ open, title, description, confirmLabel = '삭제', loading = false, onCancel, onConfirm }: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !loading) onCancel(); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open, loading, onCancel]);
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !loading) onCancel(); }}>
    <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
      <span className="dialog-mark" aria-hidden="true">!</span>
      <h2 id="confirm-title">{title}</h2>
      <p id="confirm-description">{description}</p>
      <div className="dialog-actions"><button ref={cancelRef} className="button button-secondary" disabled={loading} onClick={onCancel}>취소</button><button className="button button-danger" disabled={loading} onClick={onConfirm}>{loading ? '처리 중…' : confirmLabel}</button></div>
    </div>
  </div>;
}
