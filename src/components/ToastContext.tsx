import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: string; message: string; kind: ToastKind };
type ToastValue = { showToast: (message: string, kind?: ToastKind) => void };

const ToastContext = createContext<ToastValue>({ showToast: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = crypto.randomUUID();
    setItems((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 3200);
  }, []);
  const value = useMemo(() => ({ showToast }), [showToast]);
  return <ToastContext.Provider value={value}>
    {children}
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {items.map((item) => <div className={`toast toast-${item.kind}`} key={item.id}><b>{item.kind === 'success' ? '✓' : item.kind === 'error' ? '!' : 'i'}</b><span>{item.message}</span></div>)}
    </div>
  </ToastContext.Provider>;
}

export function useToast(): ToastValue {
  return useContext(ToastContext);
}
