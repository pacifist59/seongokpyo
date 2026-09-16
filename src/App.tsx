import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { Layout } from './components/Layout';
import { ArtistDetailPage, FestivalDetailPage, VenueDetailPage } from './pages/DetailDirectoryPages';
import { ArtistsPage, FestivalsPage, VenuesPage } from './pages/DirectoryPages';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SetlistDetailPage } from './pages/SetlistDetailPage';
import { SetlistFormPage } from './pages/SetlistFormPage';
import { SetlistsPage } from './pages/SetlistsPage';
import { SetupPage } from './pages/SetupPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { MyPage } from './pages/MyPage';
import { ContactPage, PrivacyPage, TermsPage } from './pages/LegalPages';
import { Analytics } from './components/Analytics';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  return (
    <>
      <AuthProvider>
        <Analytics />
        <ScrollToTop />
        <Routes key={pathname}>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="setlists" element={<SetlistsPage />} />
            <Route path="setlists/new" element={<SetlistFormPage />} />
            <Route path="setlist/:id" element={<SetlistDetailPage />} />
            <Route path="setlist/:id/edit" element={<SetlistFormPage />} />
            <Route path="artists" element={<ArtistsPage />} />
            <Route path="artists/:id" element={<ArtistDetailPage />} />
            <Route path="venues" element={<VenuesPage />} />
            <Route path="venues/:id" element={<VenueDetailPage />} />
            <Route path="festivals" element={<FestivalsPage />} />
            <Route path="festivals/:id" element={<FestivalDetailPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="mypage" element={<MyPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="about/setup" element={<SetupPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </>
  );
}
