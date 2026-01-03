import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from '../services/skipService';
import Navbar from '../components/Navbar';
import MediaCard from '../components/MediaCard';
import { tmdbService } from '../services/tmdb';
import { MediaItem, Genre } from '../types';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { useCache } from '../context/CacheContext';

interface BrowseProps {
  type: 'movie' | 'tv';
}

const Browse: React.FC<BrowseProps> = ({ type }) => {
  const [searchParams] = useSearchParams();
  const urlGenreId = searchParams.get('genre');
  const { browseCache, setBrowseCache } = useCache();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  // Determine Cache Key based on Type + Genre
  const getCacheKey = (gId: number | null) => `${type}_${gId || 'all'}`;

  // Sync URL params with state
  useEffect(() => {
    if (urlGenreId) {
        setSelectedGenre(parseInt(urlGenreId));
    } else {
        setSelectedGenre(null);
    }
  }, [urlGenreId]);

  // Initial Data Load & Genre Change
  useEffect(() => {
    const fetchInitial = async () => {
      const cacheKey = getCacheKey(selectedGenre);
      
      // Try loading from cache
      if (browseCache[cacheKey]) {
          const cached = browseCache[cacheKey];
          setItems(cached.items);
          setPage(cached.page);
          setHasMore(cached.hasMore);
          setLoading(false);
          // Fetch genres if not present (usually fast)
          if (genres.length === 0) {
              tmdbService.getGenres(type).then(res => setGenres(res.genres));
          }
          return;
      }

      setItems([]); // Clear stale data immediately to show skeleton
      setLoading(true);
      setPage(1);
      setHasMore(true);
      try {
        const genreRes = await tmdbService.getGenres(type);
        setGenres(genreRes.genres);

        const dataRes = await tmdbService.discover(type, selectedGenre || undefined, 1);
        
        const initialItems = dataRes.results;
        setItems(initialItems);
        
        // Save initial state to cache
        setBrowseCache(cacheKey, {
            items: initialItems,
            page: 1,
            hasMore: true,
            scrollY: 0
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, [type, selectedGenre]); // Re-run when type or genre changes

  // Load More Function
  const loadMore = useCallback(async () => {
      if (loading || !hasMore) return;
      
      setLoading(true);
      try {
          const nextPage = page + 1;
          const dataRes = await tmdbService.discover(type, selectedGenre || undefined, nextPage);
          
          if (dataRes.results.length === 0) {
              setHasMore(false);
              // Update cache with no more
              const cacheKey = getCacheKey(selectedGenre);
              if (browseCache[cacheKey]) {
                  setBrowseCache(cacheKey, { ...browseCache[cacheKey], hasMore: false });
              }
          } else {
              const newItems = [...items, ...dataRes.results];
              setItems(newItems);
              setPage(nextPage);
              
              // Update cache with new page
              const cacheKey = getCacheKey(selectedGenre);
              setBrowseCache(cacheKey, {
                  items: newItems,
                  page: nextPage,
                  hasMore: true,
                  scrollY: window.scrollY
              });
          }
      } catch (err) {
          console.error(err);
          setHasMore(false);
      } finally {
          setLoading(false);
      }
  }, [page, loading, hasMore, type, selectedGenre, items, browseCache, setBrowseCache]);

  const lastElementRef = useInfiniteScroll(loadMore, loading);

  const handleGenreClick = (id: number | null) => {
      setSelectedGenre(id);
  };

  return (
    <div className="min-h-screen bg-background pt-20 transition-colors duration-300">
      <Navbar />
      
      <div className="px-4 md:px-12 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-primary animate-pulse">
                {loading && items.length === 0 ? (
                    <div className="h-8 w-32 bg-white/10 rounded"></div>
                ) : (
                    type === 'movie' ? 'Movies' : 'TV Shows'
                )}
            </h1>
            
            <div className="flex space-x-2 overflow-x-auto hide-scrollbar pb-2 md:pb-0 w-full md:w-auto">
                <button
                    onClick={() => handleGenreClick(null)}
                    className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${
                        selectedGenre === null ? 'bg-brand-primary text-white' : 'bg-surface text-secondary hover:bg-gray-700 hover:text-white'
                    }`}
                >
                    All Genres
                </button>
                {genres.map(g => (
                    <button
                        key={g.id}
                        onClick={() => handleGenreClick(g.id)}
                        className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${
                            selectedGenre === g.id ? 'bg-brand-primary text-white' : 'bg-surface text-secondary hover:bg-gray-700 hover:text-white'
                        }`}
                    >
                        {g.name}
                    </button>
                ))}
            </div>
        </div>

        {items.length === 0 && loading ? (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                {[...Array(18)].map((_, i) => (
                    <div key={i} className="aspect-[2/3] bg-surface rounded-md animate-pulse border border-white/5" />
                ))}
             </div>
        ) : (
            <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                    {items.map((item, index) => {
                        if (index === items.length - 1) {
                            return <div ref={lastElementRef} key={item.id + index}><MediaCard item={{...item, media_type: type}} /></div>;
                        }
                        return <MediaCard key={item.id} item={{...item, media_type: type}} />;
                    })}
                </div>

                {loading && (
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 mt-6">
                      {[...Array(6)].map((_, i) => (
                          <div key={i} className="aspect-[2/3] bg-surface rounded-md animate-pulse border border-white/5" />
                      ))}
                   </div>
                )}
            </>
        )}
        
        {!hasMore && items.length > 0 && !loading && (
            <div className="text-center py-10 text-secondary">
                You've reached the end of the list.
            </div>
        )}
      </div>
    </div>
  );
};

export default Browse;