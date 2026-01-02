import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from '../services/skipService';
import Navbar from '../components/Navbar';
import MediaCard from '../components/MediaCard';
import { tmdbService } from '../services/tmdb';
import { MediaItem, Genre } from '../types';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

interface BrowseProps {
  type: 'movie' | 'tv';
}

const Browse: React.FC<BrowseProps> = ({ type }) => {
  const [searchParams] = useSearchParams();
  const urlGenreId = searchParams.get('genre');

  const [items, setItems] = useState<MediaItem[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

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
      setItems([]); // Clear stale data immediately to show skeleton
      setLoading(true);
      setPage(1);
      setHasMore(true);
      try {
        const genreRes = await tmdbService.getGenres(type);
        setGenres(genreRes.genres);

        const dataRes = await tmdbService.discover(type, selectedGenre || undefined, 1);
        setItems(dataRes.results);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, [type, selectedGenre]);

  // Load More Function
  const loadMore = useCallback(async () => {
      if (loading || !hasMore) return;
      
      setLoading(true);
      try {
          const nextPage = page + 1;
          const dataRes = await tmdbService.discover(type, selectedGenre || undefined, nextPage);
          
          if (dataRes.results.length === 0) {
              setHasMore(false);
          } else {
              setItems(prev => [...prev, ...dataRes.results]);
              setPage(nextPage);
          }
      } catch (err) {
          console.error(err);
          setHasMore(false);
      } finally {
          setLoading(false);
      }
  }, [page, loading, hasMore, type, selectedGenre]);

  const lastElementRef = useInfiniteScroll(loadMore, loading);

  const handleGenreClick = (id: number | null) => {
      // If clicking inside the component, we update state directly. 
      // If we wanted to update URL, we would use setSearchParams, but local state is smoother for browsing.
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