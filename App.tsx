import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Home from './pages/Home';
import Browse from './pages/Browse';
import Details from './pages/Details';
import PersonDetails from './pages/PersonDetails';
import SearchPage from './pages/Search';
import Settings from './pages/Settings';
import Watchlist from './pages/Watchlist';
import LikedContent from './pages/LikedContent';
import Networks from './pages/Networks';
import Watch from './pages/Watch';

const AppContent: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        
        <Route path="/movies" element={<Browse type="movie" />} />
        <Route path="/tv" element={<Browse type="tv" />} />
        <Route path="/networks" element={<Networks />} />
        
        <Route path="/search" element={<SearchPage />} />
        <Route path="/details/:type/:id" element={<Details />} />
        <Route path="/person/:id" element={<PersonDetails />} />
        
        <Route path="/watch/:type/:id" element={<Watch />} />
        <Route path="/watch/:type/:id/:season/:episode" element={<Watch />} />
        
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/liked" element={<LikedContent />} />
        <Route path="/settings" element={<Settings />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;