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
  const [keywordResult, setKeywordResult] = useState<string | null>(null);

  useEffect(() => {
    if (query) {
      setLoading(true);
      setKeywordResult(null);

      const timer = setTimeout(() => {
        // Parallel fetch for:
        // 1. Multi Search (Direct matches)
        // 2. Collections (Franchises)
        // 3. Keywords (Themes/Lists like "Oscar", "Anime", "Superhero")
        Promise.all([
            tmdbService.search(query),
            tmdbService.searchCollections(query),
            tmdbService.searchKeywords(query)
        ]).then(async ([multiRes, collectionRes, keywordRes]) => {
          
          let allResults: MediaItem[] = [];

          // 1. Process Collections
          const collections: MediaItem[] = collectionRes.results.map((c: any) => ({
             ...c,
             title: c.name,
             media_type: 'collection',
             vote_average: 0,
             overview: 'Collection'
          }));
          allResults = [...collections];

          // 2. Process Keywords (Smart List Discovery)
          // If we find a strong keyword match (e.g. "Oscar"), fetch content for that keyword
          // This simulates finding "Lists"
          if (keywordRes.results.length > 0) {
              const topKeyword = keywordRes.results[0];
              // Only fetch if the keyword is somewhat relevant or exact
              // Fetch movies with this keyword
              try {
                  const keywordMovies = await tmdbService.discover('movie', undefined, 1, topKeyword.id);
                  if (keywordMovies.results.length > 0) {
                      setKeywordResult(topKeyword.name);
                      // Add distinct items from keyword search to the top (or mixed in)
                      const taggedItems = keywordMovies.results.map(m => ({...m, media_type: 'movie' as const}));
                      allResults = [...allResults, ...taggedItems];
                  }
              } catch (e) { console.error("Keyword fetch failed", e); }
          }

          // 3. Process Standard Multi Search
          allResults = [...allResults, ...multiRes.results];
          
          // Remove duplicates based on ID
          const uniqueResults = Array.from(new Map(allResults.map(item => [item.id, item])).values());

          setResults(uniqueResults);
          setLoading(false);
        }).catch(err => {
            console.error(err);
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
        <h1 className="text-xl md:text-2xl font-medium text-secondary mb-2">
          Search results for: <span className="text-primary">"{query}"</span>
        </h1>
        {keywordResult && (
            <p className="text-sm text-brand-primary mb-6">
                Found curated list for <span className="font-bold capitalize">"{keywordResult}"</span>
            </p>
        )}
        
        {loading ? (
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 mt-6">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="aspect-[2/3] bg-surface rounded-md animate-pulse border border-white/5" />
                ))}
           </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 mt-6">
            {results.map((item, index) => (
              // Add index to key because sometimes collections and movies might have same ID but different types
              <MediaCard key={`${item.id}-${item.media_type}-${index}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center text-secondary mt-20">
            {query ? (
                <>
                    <p className="text-xl">No results found.</p>
                    <p className="text-sm mt-2">Try searching for movies, TV shows, people, or collections.</p>
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