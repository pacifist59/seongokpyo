import { Link } from 'react-router-dom';

export function SetupPage() {
  return <section className="section page-section setup-page"><Link className="back-link" to="/">← 홈</Link><div className="setup-card"><p className="eyebrow">Database setup</p><h1>Supabase 연결 안내</h1><p>이 프로젝트는 연결 정보가 없을 때 가짜 데이터를 표시하지 않고 빈 상태로 동작합니다.</p><ol><li><span>01</span><div><h2>마이그레이션 적용</h2><p><code>supabase/migrations</code>의 SQL을 Supabase 프로젝트에 적용합니다.</p></div></li><li><span>02</span><div><h2>환경변수 설정</h2><p><code>VITE_SUPABASE_URL</code>과 <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>를 설정합니다.</p></div></li><li><span>03</span><div><h2>인증 Redirect URL 등록</h2><p>로컬 주소와 Cloudflare Pages 배포 주소를 Supabase Auth 허용 URL에 추가합니다.</p></div></li></ol><div className="setup-note"><strong>보안 메모</strong><p>브라우저에는 publishable key만 사용합니다. service role 또는 secret key는 절대 넣지 마세요.</p></div></div></section>;
}
