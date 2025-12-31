import React, { createContext, useContext, useState, useEffect } from 'react';
import { WatchlistItem, LikedItem, ContinueWatchingItem } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  // UI State
  accentColor: string;
  setAccentColor: (color: string) => void;
  
  // Data State
  watchlist: WatchlistItem[];
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (mediaId: number) => void;
  
  likedItems: LikedItem[];
  addToLikes: (item: LikedItem) => void;
  removeFromLikes: (mediaId: number) => void;

  continueWatching: ContinueWatchingItem[];
  addToContinueWatching: (item: ContinueWatchingItem) => void;
  
  clearData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from API (localStorage) immediately to render with data if available
  const [accentColor, setAccentColorState] = useState<string>(() => localStorage.getItem('sv_accent_color') || '#E50914');
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => api.getWatchlist());
  const [likedItems, setLikedItems] = useState<LikedItem[]>(() => api.getLikes());
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>(() => api.getContinueWatching());

  // Effect only needed if we want to sync with external changes (e.g. multi-tab), 
  // but keeping it simple for now, we just rely on the internal state updates + api calls.

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    localStorage.setItem('sv_accent_color', color);
    document.documentElement.style.setProperty('--color-primary', color);
  };

  useEffect(() => {
     // Apply initial color
     const storedColor = localStorage.getItem('sv_accent_color');
     if(storedColor) document.documentElement.style.setProperty('--color-primary', storedColor);
  }, []);

  const addToWatchlist = (item: WatchlistItem) => {
      const updated = api.addToWatchlist(item);
      setWatchlist(updated);
  };

  const removeFromWatchlist = (mediaId: number) => {
      const updated = api.removeFromWatchlist(mediaId);
      setWatchlist(updated);
  };

  const addToLikes = (item: LikedItem) => {
      const updated = api.addToLikes(item);
      setLikedItems(updated);
  };

  const removeFromLikes = (mediaId: number) => {
      const updated = api.removeFromLikes(mediaId);
      setLikedItems(updated);
  };

  const addToContinueWatching = (item: ContinueWatchingItem) => {
      const updated = api.addToContinueWatching(item);
      setContinueWatching(updated);
  };

  const clearData = () => {
      api.clearAllData();
      setWatchlist([]);
      setLikedItems([]);
      setContinueWatching([]);
  };

  return (
    <AuthContext.Provider value={{ 
      accentColor, setAccentColor,
      watchlist, addToWatchlist, removeFromWatchlist,
      likedItems, addToLikes, removeFromLikes,
      continueWatching, addToContinueWatching,
      clearData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};