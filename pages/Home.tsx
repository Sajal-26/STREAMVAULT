import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ContentRow from '../components/ContentRow';
import { tmdbService } from '../services/tmdb';
import { MediaItem } from '../types';

interface RowData {
  title: string;
  items: MediaItem[];
}

const Home: React.FC = () => {
  const [heroItem, setHeroItem] = useState<MediaItem | null>(null);
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const requests = [
          { title: 'Trending Now', req: tmdbService.getTrending() },
          { title: 'Popular Movies', req: tmdbService.getPopular('movie') },
          { title: 'Bingeworthy TV Shows', req: tmdbService.getPopular('tv') },
          { title: 'Top Rated Movies', req: tmdbService.getTopRated('movie') },
          { title: 'Action Movies', req: tmdbService.discover('movie', 28) },
          { title: 'Sci-Fi & Fantasy', req: tmdbService.discover('movie', 878) },
          { title: 'Comedy Hits', req: tmdbService.discover('movie', 35) },
          { title: 'Horror Night', req: tmdbService.discover('movie', 27) },
          { title: 'Animated Adventures', req: tmdbService.discover('movie', 16) },
          { title: 'TV Action & Adventure', req: tmdbService.discover('tv', 10759) },
          { title: 'Sci-Fi & Fantasy TV', req: tmdbService.discover('tv', 10765) },
          { title: 'Documentaries', req: tmdbService.discover('movie', 99) },
          { title: 'Family Favorites', req: tmdbService.discover('movie', 10751) },
          { title: 'Thriller Movies', req: tmdbService.discover('movie', 53) },
          { title: 'Romance', req: tmdbService.discover('movie', 10749) }
        ];

        const responses = await Promise.all(requests.map(r => r.req));
        
        const newRows = responses.map((res, index) => ({
            title: requests[index].title,
            items: res.results
        }));

        setRows(newRows);
        
        // Pick random trending item for hero from the first row (Trending)
        if (newRows[0].items.length > 0) {
           const randomHero = newRows[0].items[Math.floor(Math.random() * Math.min(5, newRows[0].items.length))];
           setHeroItem(randomHero);
        }
      } catch (error) {
        console.error("Failed to fetch home data", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-primary mb-4">Something went wrong</h2>
        <p className="text-secondary mb-6">We couldn't load the movies. Please check your internet connection.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-brand-primary text-white rounded font-medium hover:opacity-90 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-primary">
      <Navbar />
      <Hero item={heroItem} />
      
      <div className="-mt-16 md:-mt-32 relative z-10 pb-20">
        {rows.map((row, index) => (
            <ContentRow key={index} title={row.title} items={row.items} />
        ))}
      </div>
      
      <footer className="py-8 text-center text-secondary text-sm border-t border-white/10">
        <p>&copy; {new Date().getFullYear()} StreamVault. All rights reserved.</p>
        <p className="mt-2">Data provided by TMDB.</p>
      </footer>
    </div>
  );
};

export default Home;