import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MediaCard from '../components/MediaCard';
import { tmdbService } from '../services/tmdb';
import { MediaItem } from '../types';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { ArrowLeft } from 'lucide-react';

type PagedResponse = {
  results: MediaItem[];
  page: number;
  total_pages: number;
  name?: string;
};

const PROVIDER_MAP: Record<string, { id: number; name: string }> = {
  netflix: { id: 8, name: 'Netflix' },
  prime_video: { id: 9, name: 'Prime Video' },
  disney_hotstar: { id: 337, name: 'Disney+' },
  max: { id: 188, name: 'Max' },
  apple_tv: { id: 2, name: 'Apple TV' },
};

const ViewAll: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Explore');

  const fetchCategoryData = async (pageToFetch: number): Promise<PagedResponse> => {
    if (!categoryId) return { results: [], page: 1, total_pages: 1 };

    for (const key of Object.keys(PROVIDER_MAP)) {
      if (categoryId.startsWith(key)) {
        const provider = PROVIDER_MAP[key];
        const isMovie = categoryId.includes('movies');
        setTitle(`${isMovie ? 'Movies' : 'TV Shows'} on ${provider.name}`);
        return tmdbService.discoverByProvider(provider.id, isMovie ? 'movie' : 'tv', pageToFetch);
      }
    }

    if (categoryId.startsWith('list_')) {
      const res = await tmdbService.getList(categoryId.replace('list_', ''), pageToFetch);
      setTitle(res.name || 'Curated List');
      return res;
    }

    if (categoryId.startsWith('trending')) {
      setTitle('Trending Now');
      return tmdbService.getTrending('all', 'week', pageToFetch);
    }

    const parts = categoryId.split('_');
    const type = parts[0] === 'tv' ? 'tv' : 'movie';

    if (categoryId.includes('popular')) {
      setTitle(`Popular ${type === 'movie' ? 'Movies' : 'TV Shows'}`);
      return tmdbService.getPopular(type, pageToFetch);
    }

    if (categoryId.includes('top_rated')) {
      setTitle(`Top Rated ${type === 'movie' ? 'Movies' : 'TV Shows'}`);
      return tmdbService.getTopRated(type, pageToFetch);
    }

    if (categoryId.includes('genre')) {
      setTitle('Collection');
      return tmdbService.discover(type, Number(parts[2]), pageToFetch);
    }

    return { results: [], page: 1, total_pages: 1 };
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setItems([]);
      setPage(1);
      setHasMore(true);

      const res = await fetchCategoryData(1);
      setItems(res.results);
      setHasMore(res.page < res.total_pages);
      setLoading(false);
      window.scrollTo(0, 0);
    };

    init();
  }, [categoryId]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    const nextPage = page + 1;
    setLoading(true);

    const res = await fetchCategoryData(nextPage);

    setItems(prev => {
      const seen = new Set(prev.map(i => i.id));
      return [...prev, ...res.results.filter(i => !seen.has(i.id))];
    });

    setPage(nextPage);
    setHasMore(nextPage < res.total_pages);
    setLoading(false);
  }, [page, loading, hasMore, categoryId]);

  const lastElementRef = useInfiniteScroll(loadMore, loading);

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <Navbar />

      <div className="px-4 md:px-12">
        <div className="flex items-center mb-8">
          <button onClick={() => navigate(-1)} className="mr-4 p-2 hover:bg-white/10 rounded-full">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-2xl md:text-4xl font-bold">{title}</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item, index) => {
            const ref = index === items.length - 1 ? lastElementRef : null;
            return (
              <div ref={ref} key={`${item.id}-${index}`}>
                <MediaCard item={item} />
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-surface animate-pulse rounded-md" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAll;
