import React, { useEffect, useState } from 'react';
import { useSearchParams } from '../services/skipService';
import Navbar from '../components/Navbar';
import MediaCard from '../components/MediaCard';
import { tmdbService } from '../services/tmdb';
import { MediaItem } from '../types';

type Tab = 'all' | 'movie_tv' | 'person' | 'company' | 'collection';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'movie_tv', label: 'Movies & TV' },
  { id: 'person', label: 'People' },
  { id: 'company', label: 'Companies' },
  { id: 'collection', label: 'Collections' },
];

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [categorizedResults, setCategorizedResults] = useState<{
    all: MediaItem[];
    movie_tv: MediaItem[];
    person: MediaItem[];
    company: MediaItem[];
    collection: MediaItem[];
  }>({ all: [], movie_tv: [], person: [], company: [], collection: [] });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query) {
      setLoading(true);
      // Reset state on new query
      setActiveTab('all');
      setCategorizedResults({ all: [], movie_tv: [], person: [], company: [], collection: [] });

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
          
          // 1. Process Multi Search into Media and People
          const multiMoviesTV = multiRes.results.filter((i: any) => i.media_type === 'movie' || i.media_type === 'tv');
          const multiPeople = multiRes.results.filter((i: any) => i.media_type === 'person');

          // 2. Process Companies
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

          // 3. Process Collections
          const collections: MediaItem[] = collectionRes.results.map((c: any) => ({
             ...c,
             title: c.name,
             media_type: 'collection' as const,
             vote_average: 0,
             overview: 'Collection'
          }));

          // 4. Process Keywords (Fetch movies associated with top keywords to augment Movies/TV)
          let keywordMovies: MediaItem[] = [];
          if (keywordRes.results.length > 0) {
              const topKeyword = keywordRes.results[0]; // Take top keyword for relevance
              try {
                  const km = await tmdbService.discover('movie', undefined, 1, topKeyword.id);
                  if (km.results.length > 0) {
                      keywordMovies = km.results.map(m => ({...m, media_type: 'movie' as const}));
                  }
              } catch (e) { console.error("Keyword fetch failed", e); }
          }

          // --- Aggregation & Deduplication ---

          // Movies & TV: Combine Multi Search + Keyword Matches
          const movieTvMap = new Map();
          [...multiMoviesTV, ...keywordMovies].forEach(item => {
              movieTvMap.set(`${item.media_type}-${item.id}`, item);
          });
          const uniqueMoviesTV = Array.from(movieTvMap.values());

          // ALL: Combine everything, prioritizing Multi Search relevance
          const allMap = new Map();
          // Add multi search first (high relevance)
          multiRes.results.forEach((i: any) => allMap.set(`${i.media_type}-${i.id}`, i));
          // Add collections
          collections.forEach(i => allMap.set(`${i.media_type}-${i.id}`, i));
          // Add companies
          companies.forEach(i => allMap.set(`${i.media_type}-${i.id}`, i));
          // Add keyword movies (if not present)
          keywordMovies.forEach(i => {
              if(!allMap.has(`${i.media_type}-${i.id}`)) {
                  allMap.set(`${i.media_type}-${i.id}`, i);
              }
          });
          const allResults = Array.from(allMap.values());

          setCategorizedResults({
              all: allResults,
              movie_tv: uniqueMoviesTV,
              person: multiPeople,
              company: companies,
              collection: collections
          });
          
          setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
      }, 500); // Debounce
      return () => clearTimeout(timer);
    } else {
        setCategorizedResults({ all: [], movie_tv: [], person: [], company: [], collection: [] });
    }
  }, [query]);

  const activeResults = categorizedResults[activeTab];

  return (
    <div className="min-h-screen bg-background pt-24">
      <Navbar />
      <div className="px-4 md:px-12">
        <h1 className="text-xl md:text-2xl font-medium text-secondary mb-6">
          Results for: <span className="text-primary font-bold">"{query}"</span>
        </h1>
        
        {/* Tabs */}
        {query && (
            <div className="flex space-x-2 overflow-x-auto hide-scrollbar pb-2 mb-8 border-b border-white/10">
                {TABS.map(tab => {
                    const count = categorizedResults[tab.id].length;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition flex-shrink-0 flex items-center gap-2 ${
                                activeTab === tab.id 
                                ? 'bg-brand-primary text-white' 
                                : 'bg-surface text-secondary hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            {tab.label}
                            {count > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                    activeTab === tab.id ? 'bg-white/20' : 'bg-white/10'
                                }`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        )}
        
        {loading ? (
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="aspect-[2/3] bg-surface rounded-md animate-pulse border border-white/5" />
                ))}
           </div>
        ) : activeResults.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 animate-in fade-in duration-500">
            {activeResults.map((item, index) => (
              <MediaCard key={`${item.id}-${item.media_type}-${index}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center text-secondary mt-20">
            {query ? (
                <>
                    <p className="text-xl font-bold text-white mb-2">No results found for "{query}"</p>
                    <p className="text-sm">Try checking your spelling or use different keywords.</p>
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