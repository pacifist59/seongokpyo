import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase';

export function LoginPage() {
  const { session } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const redirect = new URLSearchParams(location.search).get('next') || '/';
  if (session) return <Navigate to={redirect} replace />;

  const sendMagicLink = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(''); setMessage('');
    try {
      const client = requireSupabase();
      const { error: authError } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}${redirect}` } });
      if (authError) throw authError;
      setMessage('이메일로 로그인 링크를 보냈습니다. 받은편지함을 확인해주세요.');
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : '로그인 링크를 보내지 못했습니다.');
    } finally { setLoading(false); }
  };

  const googleLogin = async () => {
    setLoading(true); setError('');
    try {
      const client = requireSupabase();
      const { error: authError } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${redirect}` } });
      if (authError) throw authError;
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Google 로그인을 시작하지 못했습니다.');
      setLoading(false);
    }
  };

  return <section className="auth-page"><div className="auth-card"><div className="auth-mark" aria-hidden="true">♬</div><p className="eyebrow">Welcome back</p><h1>공연 기록을 이어가세요</h1><p>로그인하면 선곡표를 등록하고 ‘나도 갔어요’ 기록을 모을 수 있어요.</p>{!isSupabaseConfigured && <div className="form-alert">Supabase 환경변수를 먼저 연결해주세요.</div>}<button className="button social-button" disabled={!isSupabaseConfigured || loading} onClick={() => void googleLogin()}><span>G</span>Google로 계속하기</button><div className="divider"><span>또는 이메일</span></div><form onSubmit={sendMagicLink}><label><span>이메일</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label><button className="button button-primary button-full" disabled={!isSupabaseConfigured || loading}>{loading ? '보내는 중…' : '로그인 링크 받기'}</button></form>{message && <p className="form-success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}<small>로그인 링크를 요청하면 서비스 이용에 필요한 인증 메일이 발송됩니다.</small></div></section>;
}
