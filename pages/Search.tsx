import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MediaCard from '../components/MediaCard';
import { tmdbService } from '../services/tmdb';
import { MediaItem } from '../types';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query) {
      setLoading(true);
      const timer = setTimeout(() => {
        tmdbService.search(query).then(res => {
          setResults(res.results.filter(i => i.media_type === 'movie' || i.media_type === 'tv')); // Filter out 'person'
          setLoading(false);
        });
      }, 500); // Debounce
      return () => clearTimeout(timer);
    } else {
        setResults([]);
    }
  }, [query]);

  return (
    <div className="min-h-screen bg-background pt-24">
      <Navbar />
      <div className="px-4 md:px-12">
        <h1 className="text-xl md:text-2xl font-medium text-secondary mb-6">
          Search results for: <span className="text-primary">"{query}"</span>
        </h1>
        
        {loading ? (
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="aspect-[2/3] bg-surface rounded-md animate-pulse border border-white/5" />
                ))}
           </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
            {results.map(item => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center text-secondary mt-20">
            {query ? (
                <>
                    <p className="text-xl">No results found.</p>
                    <p className="text-sm mt-2">Try searching for movies, TV shows, or people.</p>
                </>
            ) : (
                <p className="text-xl">Enter a search term.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;