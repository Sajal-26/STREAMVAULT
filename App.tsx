import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from './services/skipService';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CacheProvider } from './context/CacheContext';
import Home from './pages/Home';
import Browse from './pages/Browse';
import Details from './pages/Details';
import PersonDetails from './pages/PersonDetails';
import CollectionDetails from './pages/CollectionDetails';
import SearchPage from './pages/Search';
import Settings from './pages/Settings';
import Watchlist from './pages/Watchlist';
import LikedContent from './pages/LikedContent';
import Watch from './pages/Watch';
import SharedRedirect from './pages/SharedRedirect';
import ViewAll from './pages/ViewAll';
import BottomNav from './components/BottomNav';

const AppContent: React.FC = () => {
  const location = useLocation();

  // Global Orientation Cleanup Logic
  useEffect(() => {
    const handleOrientation = async () => {
      const isWatchPage = location.pathname.includes('/watch/');
      
      try {
        if (screen.orientation && typeof (screen.orientation as any).unlock === 'function') {
          if (!isWatchPage) {
            // Ensure we are unlocked when not watching
            (screen.orientation as any).unlock();
            // Also exit fullscreen if we are in it
            if (document.fullscreenElement) {
               await document.exitFullscreen();
            }
          }
        }
      } catch (error) {
         // Silently fail
      }
    };

    handleOrientation();
  }, [location.pathname]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        
        <Route path="/movies" element={<Browse type="movie" />} />
        <Route path="/tv" element={<Browse type="tv" />} />
        
        <Route path="/search" element={<SearchPage />} />
        <Route path="/category/:categoryId" element={<ViewAll />} />

        <Route path="/details/:type/:id" element={<Details />} />
        <Route path="/person/:id" element={<PersonDetails />} />
        <Route path="/collection/:id" element={<CollectionDetails />} />
        
        {/* Custom Short Link Handler */}
        <Route path="/s/:code" element={<SharedRedirect />} />
        
        <Route path="/watch/:type/:id" element={<Watch />} />
        <Route path="/watch/:type/:id/:season/:episode" element={<Watch />} />
        
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/liked" element={<LikedContent />} />
        <Route path="/settings" element={<Settings />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BottomNav />
    </>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <CacheProvider>
          <Router>
            <AppContent />
          </Router>
        </CacheProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;