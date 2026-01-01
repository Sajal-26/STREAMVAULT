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
        // 1. Multi Search (Movies/TV/People)
        // 2. Collections (Franchises)
        // 3. Keywords (Themes/Lists)
        // 4. Companies (Studios/Networks)
        Promise.all([
            tmdbService.search(query),
            tmdbService.searchCollections(query),
            tmdbService.searchKeywords(query),
            tmdbService.searchCompanies(query)
        ]).then(async ([multiRes, collectionRes, keywordRes, companyRes]) => {
          
          let allResults: MediaItem[] = [];

          // 1. Process Companies
          const companies: MediaItem[] = companyRes.results.map((c: any) => ({
             id: c.id,
             title: c.name,
             name: c.name,
             logo_path: c.logo_path,
             poster_path: null,
             backdrop_path: null,
             overview: 'Production Company',
             vote_average: 0,
             media_type: 'company' as const
          }));
          allResults = [...companies];

          // 2. Process Collections
          const collections: MediaItem[] = collectionRes.results.map((c: any) => ({
             ...c,
             title: c.name,
             media_type: 'collection' as const,
             vote_average: 0,
             overview: 'Collection'
          }));
          allResults = [...allResults, ...collections];

          // 3. Process Keywords (Smart List Discovery)
          if (keywordRes.results.length > 0) {
              const topKeyword = keywordRes.results[0];
              try {
                  const keywordMovies = await tmdbService.discover('movie', undefined, 1, topKeyword.id);
                  if (keywordMovies.results.length > 0) {
                      setKeywordResult(topKeyword.name);
                      const taggedItems = keywordMovies.results.map(m => ({...m, media_type: 'movie' as const}));
                      allResults = [...allResults, ...taggedItems];
                  }
              } catch (e) { console.error("Keyword fetch failed", e); }
          }

          // 4. Process Standard Multi Search (Movies/TV/People)
          allResults = [...allResults, ...multiRes.results];
          
          // Remove duplicates based on ID AND media_type (since ID collisions can occur across types)
          const uniqueMap = new Map();
          allResults.forEach(item => {
              uniqueMap.set(`${item.media_type}-${item.id}`, item);
          });
          
          setResults(Array.from(uniqueMap.values()));
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
              <MediaCard key={`${item.id}-${item.media_type}-${index}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center text-secondary mt-20">
            {query ? (
                <>
                    <p className="text-xl">No results found.</p>
                    <p className="text-sm mt-2">Try searching for movies, TV shows, people, companies or collections.</p>
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