import React, { useEffect, useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ContentRow from '../components/ContentRow';
import ProviderRow from '../components/ProviderRow';
import { tmdbService } from '../services/tmdb';
import { MediaItem } from '../types';
import { useAuth } from '../context/AuthContext';

interface RowConfig {
  title: string;
  categoryId: string; // Identifier for "View All" routing
  fetcher: () => Promise<{ results: MediaItem[] }>;
}

const ROW_CONFIGS: RowConfig[] = [
  { title: 'Popular Movies', categoryId: 'movie_popular', fetcher: () => tmdbService.getPopular('movie') },
  { title: 'Bingeworthy TV Shows', categoryId: 'tv_popular', fetcher: () => tmdbService.getPopular('tv') },
  { title: 'Top Rated Movies', categoryId: 'movie_top_rated', fetcher: () => tmdbService.getTopRated('movie') },
  { title: 'Action Movies', categoryId: 'movie_genre_28', fetcher: () => tmdbService.discover('movie', 28) },
  { title: 'Sci-Fi & Fantasy', categoryId: 'movie_genre_878', fetcher: () => tmdbService.discover('movie', 878) },
  { title: 'Comedy Hits', categoryId: 'movie_genre_35', fetcher: () => tmdbService.discover('movie', 35) },
  { title: 'Horror Night', categoryId: 'movie_genre_27', fetcher: () => tmdbService.discover('movie', 27) },
  { title: 'Animated Adventures', categoryId: 'movie_genre_16', fetcher: () => tmdbService.discover('movie', 16) },
  { title: 'TV Action & Adventure', categoryId: 'tv_genre_10759', fetcher: () => tmdbService.discover('tv', 10759) },
  { title: 'Sci-Fi & Fantasy TV', categoryId: 'tv_genre_10765', fetcher: () => tmdbService.discover('tv', 10765) },
  { title: 'Documentaries', categoryId: 'movie_genre_99', fetcher: () => tmdbService.discover('movie', 99) },
  { title: 'Family Favorites', categoryId: 'movie_genre_10751', fetcher: () => tmdbService.discover('movie', 10751) },
  { title: 'Thriller Movies', categoryId: 'movie_genre_53', fetcher: () => tmdbService.discover('movie', 53) },
  { title: 'Romance', categoryId: 'movie_genre_10749', fetcher: () => tmdbService.discover('movie', 10749) }
];

const Home: React.FC = () => {
  const [heroItems, setHeroItems] = useState<MediaItem[]>([]);
  const [trendingItems, setTrendingItems] = useState<MediaItem[]>([]);
  const [loadedRows, setLoadedRows] = useState<Record<string, MediaItem[]>>({});
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Recommendation States
  const [likedRecommendations, setLikedRecommendations] = useState<{title: string, items: MediaItem[]} | null>(null);
  const [watchedRecommendations, setWatchedRecommendations] = useState<{title: string, items: MediaItem[]} | null>(null);
  
  const { continueWatching, removeFromContinueWatching, watchlist, likedItems, watchHistory } = useAuth();
  const hasFetchedRows = useRef(false);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        // Fetch Trending (Week) for Hero and "Trending Now" row
        const trendingWeek = await tmdbService.getTrending('all', 'week');
        
        setTrendingItems(trendingWeek.results);
        
        if (trendingWeek.results.length > 0) {
           // Use top 10 items for the hero carousel
           setHeroItems(trendingWeek.results.slice(0, 10));
        }
        
        setInitialLoading(false);

        // Fetch other rows lazily if not already fetched
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

  // Effect to fetch "Because you liked"
  useEffect(() => {
      if (likedItems.length > 0) {
          const lastLiked = likedItems[0];
          tmdbService.getRecommendations(lastLiked.mediaType, lastLiked.mediaId)
             .then(res => {
                 if (res.results.length > 0) {
                     setLikedRecommendations({
                         title: `Because you liked ${lastLiked.title}`,
                         items: res.results.map(i => ({...i, media_type: lastLiked.mediaType}))
                     });
                 }
             })
             .catch(err => console.error("Recs error", err));
      }
  }, [likedItems]);

  // Effect to fetch "Because you watched"
  useEffect(() => {
      if (watchHistory.length > 0) {
          const lastWatched = watchHistory[0];
          tmdbService.getRecommendations(lastWatched.mediaType, lastWatched.mediaId)
             .then(res => {
                 if (res.results.length > 0) {
                     setWatchedRecommendations({
                         title: `Because you watched ${lastWatched.title}`,
                         items: res.results.map(i => ({...i, media_type: lastWatched.mediaType}))
                     });
                 }
             })
             .catch(err => console.error("Recs error", err));
      }
  }, [watchHistory]);

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

  // Convert WatchlistItems to MediaItems for ContentRow
  const watchlistItems: MediaItem[] = watchlist.map(item => ({
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
  }));

  if (initialLoading) {
    return <HomeSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background text-primary">
      <Navbar />
      <Hero items={heroItems} />
      
      {/* 
        Content Rows Area
      */}
      <div className="-mt-8 md:-mt-16 relative z-10 pb-20 space-y-4 md:space-y-8">
        
        {/* 1. Continue Watching Row (Moved to Top) */}
        {continueWatchingItems.length > 0 && (
          <ContentRow 
            title="Continue Watching" 
            items={continueWatchingItems} 
            onRemove={removeFromContinueWatching}
          />
        )}

        {/* 2. Watchlist Row (Added Below Continue Watching) */}
        {watchlistItems.length > 0 && (
            <ContentRow 
                title="My List" 
                items={watchlistItems}
            />
        )}
        
        {/* 3. Because you liked... */}
        {likedRecommendations && (
            <ContentRow
                title={likedRecommendations.title}
                items={likedRecommendations.items}
            />
        )}

         {/* 4. Because you watched... */}
        {watchedRecommendations && (
            <ContentRow
                title={watchedRecommendations.title}
                items={watchedRecommendations.items}
            />
        )}

        {/* 5. Trending Row */}
        {trendingItems.length > 0 && (
            <ContentRow title="Trending Now" items={trendingItems} categoryId="trending_week" />
        )}

        {/* 6. Provider Rows (New Feature) */}
        <ProviderRow type="tv" titlePrefix="Series on" />
        <ProviderRow type="movie" titlePrefix="Movies on" />

        {/* 7. Dynamic Rows */}
        {ROW_CONFIGS.map((config) => (
            loadedRows[config.title] ? (
                <ContentRow 
                    key={config.title} 
                    title={config.title} 
                    items={loadedRows[config.title]} 
                    categoryId={config.categoryId}
                />
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