import React, { createContext, useContext, useState, useEffect } from 'react';
import { WatchlistItem, LikedItem, User, Profile } from '../types';
import { api } from '../services/api';
import { mockBackend } from '../services/mockBackend';
import { AVATARS } from '../constants';

interface AuthContextType {
  // User State
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, otp: string) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  logout: () => void;

  // Profile State
  profiles: Profile[];
  currentProfile: Profile | null;
  selectProfile: (profile: Profile) => void;
  addProfile: (name: string) => void;

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
  
  clearData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  const [accentColor, setAccentColorState] = useState<string>('#E50914');
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [likedItems, setLikedItems] = useState<LikedItem[]>([]);

  useEffect(() => {
    // Initial Load - Local Guest Data
    setWatchlist(api.getWatchlist());
    setLikedItems(api.getLikes());

    const storedColor = localStorage.getItem('sv_accent_color');
    if (storedColor) setAccentColor(storedColor);
  }, []);

  const login = async (email: string, pass: string) => {
    // Use mockBackend for login
    const response = await mockBackend.login(email, pass, { deviceId: 'web-1', name: 'Web Browser', type: 'desktop' });
    setUser(response.user);
    setProfiles(response.profiles);
    // Auto-select first profile if exists
    if (response.profiles.length > 0) {
        selectProfile(response.profiles[0]);
    }
  };

  const signup = async (email: string, pass: string, otp: string) => {
      await mockBackend.signup(email, pass, otp);
      await login(email, pass);
  };

  const sendOtp = async (email: string) => {
      await mockBackend.sendOtp(email);
  };

  const logout = () => {
      setUser(null);
      setProfiles([]);
      setCurrentProfile(null);
  };

  const selectProfile = (profile: Profile) => {
      setCurrentProfile(profile);
      setAccentColor(profile.accentColor);
      // In a real app, we would load user/profile specific watchlist here
  };

  const addProfile = (name: string) => {
      const newProfile: Profile = {
          id: Date.now().toString(),
          name,
          avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
          accentColor: '#E50914',
          language: 'en'
      };
      // In real app, call API to save profile
      const updated = [...profiles, newProfile];
      setProfiles(updated);
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    localStorage.setItem('sv_accent_color', color);
    document.documentElement.style.setProperty('--color-primary', color);
  };

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

  const clearData = () => {
      api.clearAllData();
      setWatchlist([]);
      setLikedItems([]);
  };

  return (
    <AuthContext.Provider value={{ 
      user, login, signup, sendOtp, logout,
      profiles, currentProfile, selectProfile, addProfile,
      accentColor, setAccentColor,
      watchlist, addToWatchlist, removeFromWatchlist,
      likedItems, addToLikes, removeFromLikes,
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