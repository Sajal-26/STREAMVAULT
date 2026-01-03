import React, { createContext, useContext, useState, useRef } from 'react';
import { MediaItem, MediaDetails, SeasonDetails } from '../types';

interface HomeCache {
  heroItems: MediaItem[];
  trendingItems: MediaItem[];
  loadedRows: Record<string, MediaItem[]>;
  lastFetched: number;
}

interface BrowseCacheItem {
  items: MediaItem[];
  page: number;
  hasMore: boolean;
  scrollY: number;
}

interface DetailsCacheItem {
  data: MediaDetails;
  seasonData: SeasonDetails | null;
  actorCredits: MediaItem[];
  logoPath: string | null;
  timestamp: number;
}

interface CacheContextType {
  homeCache: HomeCache | null;
  setHomeCache: (data: HomeCache) => void;
  
  browseCache: Record<string, BrowseCacheItem>;
  setBrowseCache: (key: string, data: BrowseCacheItem) => void;
  
  detailsCache: Record<string, DetailsCacheItem>;
  setDetailsCache: (key: string, data: DetailsCacheItem) => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const CacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [homeCache, setHomeCacheState] = useState<HomeCache | null>(null);
  // Use Refs for complex objects to avoid unnecessary re-renders when setting specific keys, 
  // though for simple React updates, state is fine. We use state here for reactivity.
  const [browseCache, setBrowseCacheState] = useState<Record<string, BrowseCacheItem>>({});
  const [detailsCache, setDetailsCacheState] = useState<Record<string, DetailsCacheItem>>({});

  const setHomeCache = (data: HomeCache) => {
    setHomeCacheState(data);
  };

  const setBrowseCache = (key: string, data: BrowseCacheItem) => {
    setBrowseCacheState(prev => ({ ...prev, [key]: data }));
  };

  const setDetailsCache = (key: string, data: DetailsCacheItem) => {
    setDetailsCacheState(prev => ({ ...prev, [key]: data }));
  };

  return (
    <CacheContext.Provider value={{ 
      homeCache, setHomeCache,
      browseCache, setBrowseCache,
      detailsCache, setDetailsCache
    }}>
      {children}
    </CacheContext.Provider>
  );
};

export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) throw new Error('useCache must be used within a CacheProvider');
  return context;
};