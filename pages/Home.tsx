import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ContentRow from '../components/ContentRow';
import Top10Row from '../components/Top10Row';
import { tmdbService } from '../services/tmdb';
import { MediaItem } from '../types';
import { useAuth } from '../context/AuthContext';

interface RowConfig {
  title: string;
  fetcher: () => Promise<{ results: MediaItem[] }>;
}

const ROW_CONFIGS: RowConfig[] = [
  { title: 'Popular Movies', fetcher: () => tmdbService.getPopular('movie') },
  { title: 'Bingeworthy TV Shows', fetcher: () => tmdbService.getPopular('tv') },
  { title: 'Top Rated Movies', fetcher: () => tmdbService.getTopRated('movie') },
  { title: 'Action Movies', fetcher: () => tmdbService.discover('movie', 28) },
  { title: 'Sci-Fi & Fantasy', fetcher: () => tmdbService.discover('movie', 878) },
  { title: 'Comedy Hits', fetcher: () => tmdbService.discover('movie', 35) },
  { title: 'Horror Night', fetcher: () => tmdbService.discover('movie', 27) },
  { title: 'Animated Adventures', fetcher: () => tmdbService.discover('movie', 16) },
  { title: 'TV Action & Adventure', fetcher: () => tmdbService.discover('tv', 10759) },
  { title: 'Sci-Fi & Fantasy TV', fetcher: () => tmdbService.discover('tv', 10765) },
  { title: 'Documentaries', fetcher: () => tmdbService.discover('movie', 99) },
  { title: 'Family Favorites', fetcher: () => tmdbService.discover('movie', 10751) },
  { title: 'Thriller Movies', fetcher: () => tmdbService.discover('movie', 53) },
  { title: 'Romance', fetcher: () => tmdbService.discover('movie', 10749) }
];

const Home: React.FC = () => {
  const [heroItems, setHeroItems] = useState<MediaItem[]>([]);
  const [trendingItems, setTrendingItems] = useState<MediaItem[]>([]);
  const [top10Items, setTop10Items] = useState<MediaItem[]>([]);
  const [loadedRows, setLoadedRows] = useState<Record<string, MediaItem[]>>({});
  const [initialLoading, setInitialLoading] = useState(true);
  
  const { continueWatching, removeFromContinueWatching } = useAuth();
  const hasFetchedRows = useRef(false);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        // 1. Fetch Trending (Week) for Hero and "Trending Now" row
        // 2. Fetch Trending (Day) for "Top 10 Today"
        const [trendingWeek, trendingDay] = await Promise.all([
             tmdbService.getTrending('all', 'week'),
             tmdbService.getTrending('all', 'day')
        ]);
        
        setTrendingItems(trendingWeek.results);
        setTop10Items(trendingDay.results);
        
        if (trendingWeek.results.length > 0) {
           // Use top 10 items for the hero carousel
           setHeroItems(trendingWeek.results.slice(0, 10));
        }
        
        setInitialLoading(false);

        // 3. Fetch other rows lazily if not already fetched
        if (!hasFetchedRows.current) {
            hasFetchedRows.current = true;
            fetchOtherRows();
        }

      } catch (error) {
        console.error("Failed to fetch initial data", error);
        setInitialLoading(false);
      }
    };

    const fetchOtherRows = async () => {
        // Fetch in batches of 3 to avoid hitting rate limits or overwhelming network
        const BATCH_SIZE = 3;
        for (let i = 0; i < ROW_CONFIGS.length; i += BATCH_SIZE) {
            const batch = ROW_CONFIGS.slice(i, i + BATCH_SIZE);
            const promises = batch.map(async (config) => {
                try {
                    const res = await config.fetcher();
                    return { title: config.title, items: res.results };
                } catch (e) {
                    console.error(`Failed to fetch ${config.title}`, e);
                    return { title: config.title, items: [] };
                }
            });

            const results = await Promise.all(promises);
            setLoadedRows(prev => {
                const next = { ...prev };
                results.forEach(r => {
                    if (r.items.length > 0) next[r.title] = r.items;
                });
                return next;
            });
        }
    };

    fetchInitial();
  }, []);

  // Convert ContinueWatchingItems to MediaItems for ContentRow
  const continueWatchingItems: MediaItem[] = continueWatching.map(item => ({
    id: item.mediaId,
    media_type: item.mediaType,
    title: item.title,
    name: item.title,
    poster_path: item.posterPath,
    backdrop_path: null, 
    overview: '',
    vote_average: item.voteAverage,
    release_date: item.releaseDate,
    first_air_date: item.releaseDate,
    progress: item.progress,
    watchedDuration: item.watchedDuration,
    totalDuration: item.totalDuration,
    season: item.season,
    episode: item.episode
  }));

  if (initialLoading) {
    return <HomeSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background text-primary">
      <Navbar />
      <Hero items={heroItems} />
      
      {/* 
        Spacing Adjustment:
        Removed significant negative margin to prevent the "Top 10" title from overlapping 
        the Hero's pagination dots (which are at bottom-16).
        -mt-4 creates a slight visual connection without overlap.
      */}
      <div className="-mt-4 md:-mt-8 relative z-10 pb-20 space-y-4 md:space-y-8">
        
        {/* Top 10 Row (New) */}
        {top10Items.length > 0 && (
            <Top10Row items={top10Items} />
        )}

        {/* Continue Watching Row */}
        {continueWatchingItems.length > 0 && (
          <ContentRow 
            title="Continue Watching" 
            items={continueWatchingItems} 
            onRemove={removeFromContinueWatching}
          />
        )}

        {/* Trending Row (Always Loaded First) */}
        {trendingItems.length > 0 && (
            <ContentRow title="Trending Now" items={trendingItems} />
        )}

        {/* Dynamic Rows */}
        {ROW_CONFIGS.map((config) => (
            loadedRows[config.title] ? (
                <ContentRow key={config.title} title={config.title} items={loadedRows[config.title]} />
            ) : (
                <RowSkeleton key={config.title} title={config.title} />
            )
        ))}
      </div>
      
      <footer className="py-8 text-center text-secondary text-sm border-t border-white/10">
        <p>&copy; {new Date().getFullYear()} StreamVault. All rights reserved.</p>
        <p className="mt-2">Data provided by TMDB.</p>
      </footer>
    </div>
  );
};

// Skeleton Components
const HomeSkeleton: React.FC = () => {
    return (
        <div className="min-h-screen bg-background">
            {/* Navbar Skeleton */}
            <div className="h-20 w-full bg-black/50 fixed top-0 z-50"></div>
            
            {/* Hero Skeleton */}
            <div className="relative h-[60vh] md:h-[95vh] w-full bg-surface animate-pulse overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 p-12 w-full max-w-4xl space-y-4">
                    <div className="h-10 md:h-16 w-2/3 bg-white/10 rounded"></div>
                    <div className="h-20 md:h-24 w-full bg-white/5 rounded hidden md:block"></div>
                    <div className="flex gap-4 pt-4">
                        <div className="h-10 md:h-12 w-28 md:w-32 bg-white/20 rounded"></div>
                        <div className="h-10 md:h-12 w-28 md:w-32 bg-white/10 rounded"></div>
                    </div>
                </div>
            </div>

            {/* Rows Skeleton */}
            <div className="-mt-16 md:-mt-32 relative z-10 space-y-12 pb-20">
                <div className="px-12 h-64 bg-white/5 animate-pulse rounded mb-8"></div>
                <RowSkeleton title="Trending Now" />
                <RowSkeleton title="Popular Movies" />
            </div>
        </div>
    );
};

const RowSkeleton: React.FC<{ title: string }> = ({ title }) => {
    return (
        <div className="px-4 md:px-12 mb-8">
            <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4 flex items-center opacity-50">
                <span className="w-1 h-5 md:h-6 bg-white/20 mr-3 rounded-full"></span>
                {title}
            </h2>
            {/* Matches ContentRow flex gap: space-x-3 md:space-x-4 */}
            <div className="flex space-x-3 md:space-x-4 overflow-hidden">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="min-w-[130px] w-[130px] sm:min-w-[160px] sm:w-[160px] md:min-w-[200px] md:w-[200px] aspect-[2/3] bg-surface rounded-md animate-pulse border border-white/5" />
                ))}
            </div>
        </div>
    );
};

export default Home;