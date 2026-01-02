import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from '../services/skipService';
import Navbar from '../components/Navbar';
import MediaCard from '../components/MediaCard';
import { tmdbService } from '../services/tmdb';
import { MediaItem } from '../types';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { ArrowLeft } from 'lucide-react';

const PROVIDER_MAP: Record<string, { id: number, name: string }> = {
    'netflix': { id: 8, name: 'Netflix' },
    'prime_video': { id: 9, name: 'Prime Video' },
    'disney_hotstar': { id: 337, name: 'Disney+' },
    'max': { id: 188, name: 'Max' },
    'apple_tv': { id: 2, name: 'Apple TV' }
};

const ViewAll: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [title, setTitle] = useState("Explore");

  // Parse category ID to determine API call
  const fetchCategoryData = async (pageToFetch: number) => {
    if (!categoryId) return { results: [] };

    // 1. Friendly Provider Slugs (e.g., netflix-movies, netflix-shows)
    for (const key of Object.keys(PROVIDER_MAP)) {
        if (categoryId.startsWith(key)) {
            const provider = PROVIDER_MAP[key];
            const isMovie = categoryId.includes('movies');
            const type = isMovie ? 'movie' : 'tv';
            
            setTitle(`${isMovie ? 'Movies' : 'TV Shows'} on ${provider.name}`);
            return tmdbService.discoverByProvider(provider.id, type, pageToFetch);
        }
    }

    const parts = categoryId.split('_');
    
    // 2. Network (e.g., network-123)
    if (categoryId.startsWith('network-')) {
        const networkId = parseInt(categoryId.replace('network-', ''));
        setTitle('Network Series');
        // Networks usually imply TV
        return tmdbService.discover('tv', undefined, pageToFetch, undefined, undefined, networkId);
    }

    // 3. Companies (e.g., company-123)
    if (categoryId.startsWith('company-')) {
        const companyId = parseInt(categoryId.replace('company-', ''));
        setTitle('Production Company');
        return tmdbService.discover('movie', undefined, pageToFetch, undefined, companyId);
    }
    
    // 4. Keywords/Lists (e.g. keyword_123)
    if (categoryId.startsWith('keyword')) {
        const keywordId = parseInt(parts[1]);
        setTitle('Curated Collection');
        return tmdbService.discover('movie', undefined, pageToFetch, keywordId);
    }

    // 5. TMDB Lists (e.g. list_634)
    if (categoryId.startsWith('list_')) {
        const listId = categoryId.replace('list_', '');
        // Lists endpoint returns all items at once in our service, so no pagination here.
        if (pageToFetch > 1) return { results: [] };
        
        const res = await tmdbService.getList(listId);
        setTitle(res.name || 'Curated List');
        return res;
    }

    // 6. Standard Categories (legacy format)
    const type = parts[0] === 'tv' ? 'tv' : 'movie'; 
    
    if (categoryId.startsWith('trending')) {
        setTitle("Trending Now");
        return tmdbService.getTrending('all', 'week', pageToFetch);
    }
    
    if (categoryId.includes('popular')) {
        setTitle(`Popular ${type === 'movie' ? 'Movies' : 'TV Shows'}`);
        return tmdbService.getPopular(type, pageToFetch);
    }

    if (categoryId.includes('top_rated')) {
        setTitle(`Top Rated ${type === 'movie' ? 'Movies' : 'TV Shows'}`);
        return tmdbService.getTopRated(type, pageToFetch);
    }

    if (categoryId.includes('genre')) {
        const genreId = parseInt(parts[2]);
        setTitle(`${type === 'movie' ? 'Movie' : 'TV'} Collection`);
        return tmdbService.discover(type, genreId, pageToFetch);
    }
    
    // Fallback for providers if using legacy ID format
    if (categoryId.startsWith('provider')) {
        const pType = parts[1] as 'movie' | 'tv';
        const providerId = parseInt(parts[2]);
        setTitle('Streaming');
        return tmdbService.discoverByProvider(providerId, pType, pageToFetch);
    }
    
    // Fallback for company if using legacy ID format
    if (categoryId.startsWith('company_')) {
        const companyId = parseInt(parts[1]);
        setTitle('Production Company');
        return tmdbService.discover('movie', undefined, pageToFetch, undefined, companyId);
    }

    return { results: [] };
  };

  useEffect(() => {
    const init = async () => {
        setItems([]);
        setPage(1);
        setLoading(true);
        try {
            const res = await fetchCategoryData(1);
            setItems(res.results);
            if (res.results.length === 0) setHasMore(false);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    init();
    window.scrollTo(0,0);
  }, [categoryId]);

  const loadMore = useCallback(async () => {
      if (loading || !hasMore) return;
      setLoading(true);
      const nextPage = page + 1;
      try {
          const res = await fetchCategoryData(nextPage);
          if (res.results.length === 0) {
              setHasMore(false);
          } else {
              setItems(prev => [...prev, ...res.results]);
              setPage(nextPage);
          }
      } catch (e) {
          setHasMore(false);
      } finally {
          setLoading(false);
      }
  }, [page, loading, hasMore, categoryId]);

  const lastElementRef = useInfiniteScroll(loadMore, loading);

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 transition-colors duration-300">
      <Navbar />
      
      <div className="px-4 md:px-12">
        <div className="flex items-center mb-8">
            <button 
                onClick={() => navigate(-1)} 
                className="mr-4 p-2 rounded-full hover:bg-white/10 transition"
            >
                <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-2xl md:text-4xl font-bold text-primary">{title}</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
            {items.map((item, index) => {
                const ref = index === items.length - 1 ? lastElementRef : null;
                // Determine media type for card if missing from result (common in discover)
                const inferredType = item.media_type || (categoryId?.startsWith('tv') ? 'tv' : 'movie');
                
                return (
                    <div ref={ref} key={`${item.id}-${index}`}>
                        <MediaCard item={{...item, media_type: inferredType}} />
                    </div>
                );
            })}
        </div>
        
        {loading && (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 mt-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-[2/3] bg-surface rounded-md animate-pulse border border-white/5" />
                ))}
             </div>
        )}
      </div>
    </div>
  );
};

export default ViewAll;