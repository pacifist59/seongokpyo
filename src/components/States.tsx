import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { isSupabaseConfigured } from '../lib/supabase';

export function LoadingState({ label = '기록을 불러오는 중' }: { label?: string }) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <span className="loader" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="state-panel state-error" role="alert">
      <span className="state-mark">!</span>
      <div>
        <h2>데이터를 불러오지 못했어요</h2>
        <p>{error.message}</p>
      </div>
      {onRetry && <button className="button button-secondary" onClick={onRetry}>다시 시도</button>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="state-panel empty-state">
      <span className="empty-glyph" aria-hidden="true">♬</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function DatabaseNotice() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="database-notice" role="status">
      <span className="notice-dot" />
      <p><strong>데이터베이스 연결 대기 중</strong> — 환경변수를 연결하면 실제 공연 기록이 이 화면에 표시됩니다.</p>
      <Link to="/about/setup">연결 안내</Link>
    </div>
  );
}
