import { NavLink, Outlet } from 'react-router-dom';
import { DatabaseNotice } from './States';
import { SearchBox } from './SearchBox';
import { useAuth } from './AuthContext';

const navItems = [
  ['/setlists', '선곡표'], ['/artists', '아티스트'], ['/venues', '공연장'], ['/festivals', '페스티벌'], ['/statistics', '통계'],
] as const;

export function Layout() {
  const { session, signOut } = useAuth();
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <NavLink className="brand" to="/" aria-label="선곡표 홈">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
            <span>선곡표</span>
          </NavLink>
          <nav className="desktop-nav" aria-label="주요 메뉴">
            {navItems.map(([href, label]) => <NavLink key={href} to={href}>{label}</NavLink>)}
          </nav>
          <div className="header-actions">
            <SearchBox compact />
            <NavLink to="/setlists/new" className="button button-primary button-small">+ 등록</NavLink>
            {session ? (
              <button className="text-button" onClick={() => void signOut()}>로그아웃</button>
            ) : <NavLink className="text-button" to="/login">로그인</NavLink>}
          </div>
          <details className="mobile-menu">
            <summary aria-label="메뉴 열기"><span /><span /></summary>
            <div className="mobile-menu-panel">
              <SearchBox />
              <nav aria-label="모바일 메뉴">
                {navItems.map(([href, label]) => <NavLink key={href} to={href}>{label}<span>→</span></NavLink>)}
              </nav>
              <NavLink to="/setlists/new" className="button button-primary">선곡표 등록</NavLink>
              {session ? <button className="button button-secondary" onClick={() => void signOut()}>로그아웃</button> : <NavLink className="button button-secondary" to="/login">로그인</NavLink>}
            </div>
          </details>
        </div>
      </header>
      <DatabaseNotice />
      <main><Outlet /></main>
      <footer className="site-footer">
        <div><strong>선곡표</strong><p>공연의 순간을 곡으로 기록하는 한국형 아카이브</p></div>
        <p>© 2026 선곡표</p>
      </footer>
    </div>
  );
}
